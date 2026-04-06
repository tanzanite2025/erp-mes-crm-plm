package services

import (
	"encoding/json"
	"errors"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrWorkflowDefinitionMissing    = errors.New("workflow definition missing")
	ErrWorkflowTaskNotFound         = errors.New("workflow task not found")
	ErrWorkflowTaskAssigneeMismatch = errors.New("workflow task assignee mismatch")
	ErrWorkflowTaskAlreadyHandled   = errors.New("workflow task already handled")
)

const (
	WorkflowModulePurchaseOrder = "PURCHASE_ORDER"
	WorkflowModuleSalesOrder    = "SALES_ORDER"
)

type workflowNodeDefinition struct {
	NodeID         string `json:"nodeId"`
	AssigneeUserID string `json:"assigneeUserId"`
	NextNodeID     string `json:"nextNodeId"`
}

type workflowDefinitionDocument struct {
	StartNodeID string                   `json:"startNodeId"`
	Nodes       []workflowNodeDefinition `json:"nodes"`
}

func ValidateWorkflowDefinitionJSON(definitionJSON string) error {
	_, _, err := parseWorkflowDefinitionDocument(definitionJSON)
	return err
}

func CreateWorkflowInstanceForDocumentTx(
	tx *gorm.DB,
	module string,
	businessType string,
	businessRefID string,
	requesterID string,
) (*models.WorkflowInstance, error) {
	if tx == nil {
		return nil, errors.New("[CRITICAL_WORKFLOW] transaction is required")
	}
	if strings.TrimSpace(businessRefID) == "" {
		return nil, errors.New("[CRITICAL_WORKFLOW] businessRefId is required")
	}

	definition, err := findActiveWorkflowDefinitionByModule(tx, module)
	if err != nil {
		return nil, err
	}

	document, nodeByID, err := parseWorkflowDefinitionDocument(definition.DefinitionJSON)
	if err != nil {
		return nil, err
	}

	startNode := nodeByID[document.StartNodeID]
	assigneeUserID := strings.TrimSpace(startNode.AssigneeUserID)
	if assigneeUserID == "" {
		assigneeUserID = strings.TrimSpace(requesterID)
	}
	if assigneeUserID == "" {
		return nil, errors.New("[CRITICAL_WORKFLOW] start node assignee is empty")
	}

	now := time.Now()
	instance := models.WorkflowInstance{
		BaseModel:     models.BaseModel{ID: uuid.NewString()},
		DefinitionID:  definition.ID,
		BusinessType:  strings.TrimSpace(businessType),
		BusinessRefID: strings.TrimSpace(businessRefID),
		CurrentNodeID: startNode.NodeID,
		Status:        models.WorkflowInstanceStatusRunning,
		RequesterID:   strings.TrimSpace(requesterID),
		StartedAt:     now,
	}
	if err := tx.Create(&instance).Error; err != nil {
		return nil, err
	}

	task := models.WorkflowTask{
		BaseModel:      models.BaseModel{ID: uuid.NewString()},
		InstanceID:     instance.ID,
		NodeID:         startNode.NodeID,
		AssigneeUserID: assigneeUserID,
		Status:         models.WorkflowTaskStatusTodo,
	}
	if err := tx.Create(&task).Error; err != nil {
		return nil, err
	}

	return &instance, nil
}

func ApproveWorkflowTask(taskID, userID, comment string) (models.WorkflowInstance, error) {
	var instance models.WorkflowInstance
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		updated, err := processWorkflowTaskDecisionTx(tx, taskID, userID, comment, true)
		if err != nil {
			return err
		}
		instance = *updated
		return nil
	})
	if err != nil {
		return models.WorkflowInstance{}, err
	}
	return instance, nil
}

func RejectWorkflowTask(taskID, userID, comment string) (models.WorkflowInstance, error) {
	var instance models.WorkflowInstance
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		updated, err := processWorkflowTaskDecisionTx(tx, taskID, userID, comment, false)
		if err != nil {
			return err
		}
		instance = *updated
		return nil
	})
	if err != nil {
		return models.WorkflowInstance{}, err
	}
	return instance, nil
}

func ListWorkflowTasks(instanceID, assigneeUserID, status string) ([]models.WorkflowTask, error) {
	query := db.DB.Model(&models.WorkflowTask{})
	if strings.TrimSpace(instanceID) != "" {
		query = query.Where("instance_id = ?", strings.TrimSpace(instanceID))
	}
	if strings.TrimSpace(assigneeUserID) != "" {
		query = query.Where("assignee_user_id = ?", strings.TrimSpace(assigneeUserID))
	}
	if strings.TrimSpace(status) != "" {
		query = query.Where("status = ?", strings.ToUpper(strings.TrimSpace(status)))
	}

	var tasks []models.WorkflowTask
	if err := query.Order("created_at asc").Find(&tasks).Error; err != nil {
		return nil, err
	}
	return tasks, nil
}

func findActiveWorkflowDefinitionByModule(tx *gorm.DB, module string) (models.WorkflowDefinition, error) {
	var definition models.WorkflowDefinition
	err := tx.Where("module = ? AND is_active = true", strings.TrimSpace(module)).
		Order("version desc, updated_at desc").
		First(&definition).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.WorkflowDefinition{}, ErrWorkflowDefinitionMissing
	}
	if err != nil {
		return models.WorkflowDefinition{}, err
	}
	return definition, nil
}

func parseWorkflowDefinitionDocument(definitionJSON string) (workflowDefinitionDocument, map[string]workflowNodeDefinition, error) {
	trimmed := strings.TrimSpace(definitionJSON)
	if trimmed == "" {
		return workflowDefinitionDocument{}, nil, errors.New("[CRITICAL_WORKFLOW_DEFINITION_INVALID] empty definitionJson")
	}

	var document workflowDefinitionDocument
	if err := json.Unmarshal([]byte(trimmed), &document); err != nil {
		return workflowDefinitionDocument{}, nil, errors.New("[CRITICAL_WORKFLOW_DEFINITION_INVALID] invalid definitionJson")
	}

	document.StartNodeID = strings.TrimSpace(document.StartNodeID)
	if document.StartNodeID == "" {
		return workflowDefinitionDocument{}, nil, errors.New("[CRITICAL_WORKFLOW_DEFINITION_INVALID] startNodeId is required")
	}

	nodeByID := make(map[string]workflowNodeDefinition, len(document.Nodes))
	for _, node := range document.Nodes {
		nodeID := strings.TrimSpace(node.NodeID)
		if nodeID == "" {
			return workflowDefinitionDocument{}, nil, errors.New("[CRITICAL_WORKFLOW_DEFINITION_INVALID] nodeId is required")
		}
		node.NodeID = nodeID
		node.AssigneeUserID = strings.TrimSpace(node.AssigneeUserID)
		node.NextNodeID = strings.TrimSpace(node.NextNodeID)
		nodeByID[nodeID] = node
	}
	if len(nodeByID) == 0 {
		return workflowDefinitionDocument{}, nil, errors.New("[CRITICAL_WORKFLOW_DEFINITION_INVALID] nodes is empty")
	}
	if _, ok := nodeByID[document.StartNodeID]; !ok {
		return workflowDefinitionDocument{}, nil, errors.New("[CRITICAL_WORKFLOW_DEFINITION_INVALID] startNodeId not found in nodes")
	}

	for _, node := range nodeByID {
		if node.NextNodeID == "" {
			continue
		}
		if _, ok := nodeByID[node.NextNodeID]; !ok {
			return workflowDefinitionDocument{}, nil, errors.New("[CRITICAL_WORKFLOW_DEFINITION_INVALID] nextNodeId not found in nodes")
		}
	}

	return document, nodeByID, nil
}

func processWorkflowTaskDecisionTx(tx *gorm.DB, taskID, userID, comment string, approved bool) (*models.WorkflowInstance, error) {
	var task models.WorkflowTask
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ?", strings.TrimSpace(taskID)).
		First(&task).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrWorkflowTaskNotFound
		}
		return nil, err
	}

	if task.Status != models.WorkflowTaskStatusTodo {
		return nil, ErrWorkflowTaskAlreadyHandled
	}
	if strings.TrimSpace(task.AssigneeUserID) != strings.TrimSpace(userID) {
		return nil, ErrWorkflowTaskAssigneeMismatch
	}

	action := "APPROVE"
	nextTaskStatus := models.WorkflowTaskStatusDone
	if !approved {
		action = "REJECT"
		nextTaskStatus = models.WorkflowTaskStatusRejected
	}
	now := time.Now()
	if err := tx.Model(&task).Updates(map[string]interface{}{
		"status":    nextTaskStatus,
		"action":    action,
		"comment":   strings.TrimSpace(comment),
		"action_at": now,
	}).Error; err != nil {
		return nil, err
	}

	var instance models.WorkflowInstance
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ?", task.InstanceID).
		First(&instance).Error; err != nil {
		return nil, err
	}

	if !approved {
		instance.Status = models.WorkflowInstanceStatusRejected
		instance.FinishedAt = &now
		if err := tx.Model(&instance).Updates(map[string]interface{}{
			"status":      instance.Status,
			"finished_at": instance.FinishedAt,
		}).Error; err != nil {
			return nil, err
		}
		if err := syncWorkflowBusinessDocumentTx(tx, &instance); err != nil {
			return nil, err
		}
		return &instance, nil
	}

	var definition models.WorkflowDefinition
	if err := tx.Where("id = ?", instance.DefinitionID).First(&definition).Error; err != nil {
		return nil, err
	}
	_, nodeByID, err := parseWorkflowDefinitionDocument(definition.DefinitionJSON)
	if err != nil {
		return nil, err
	}

	currentNodeID := strings.TrimSpace(task.NodeID)
	if currentNodeID == "" {
		currentNodeID = strings.TrimSpace(instance.CurrentNodeID)
	}
	currentNode, ok := nodeByID[currentNodeID]
	if !ok {
		return nil, errors.New("[CRITICAL_WORKFLOW_TRANSITION_INVALID] current node not found")
	}

	if currentNode.NextNodeID == "" {
		instance.Status = models.WorkflowInstanceStatusApproved
		instance.FinishedAt = &now
		if err := tx.Model(&instance).Updates(map[string]interface{}{
			"status":      instance.Status,
			"finished_at": instance.FinishedAt,
		}).Error; err != nil {
			return nil, err
		}
		if err := syncWorkflowBusinessDocumentTx(tx, &instance); err != nil {
			return nil, err
		}
		return &instance, nil
	}

	nextNode, ok := nodeByID[currentNode.NextNodeID]
	if !ok {
		return nil, errors.New("[CRITICAL_WORKFLOW_TRANSITION_INVALID] next node not found")
	}
	assigneeUserID := strings.TrimSpace(nextNode.AssigneeUserID)
	if assigneeUserID == "" {
		assigneeUserID = strings.TrimSpace(instance.RequesterID)
	}
	if assigneeUserID == "" {
		return nil, errors.New("[CRITICAL_WORKFLOW_TRANSITION_INVALID] next node assignee is empty")
	}

	nextTask := models.WorkflowTask{
		BaseModel:      models.BaseModel{ID: uuid.NewString()},
		InstanceID:     instance.ID,
		NodeID:         nextNode.NodeID,
		AssigneeUserID: assigneeUserID,
		Status:         models.WorkflowTaskStatusTodo,
	}
	if err := tx.Create(&nextTask).Error; err != nil {
		return nil, err
	}

	instance.CurrentNodeID = nextNode.NodeID
	instance.Status = models.WorkflowInstanceStatusRunning
	if err := tx.Model(&instance).Updates(map[string]interface{}{
		"current_node_id": instance.CurrentNodeID,
		"status":          instance.Status,
	}).Error; err != nil {
		return nil, err
	}

	return &instance, nil
}
