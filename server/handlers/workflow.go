package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"xdfc-server/db"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// GetWorkflowDefinitionsHandler returns workflow definitions.
func GetWorkflowDefinitionsHandler(c *gin.Context) {
	module := strings.TrimSpace(c.Query("module"))
	query := db.DB.Model(&models.WorkflowDefinition{})
	if module != "" {
		query = query.Where("module = ?", module)
	}

	var definitions []models.WorkflowDefinition
	if err := query.Order("module asc, code asc, version desc").Find(&definitions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取流程定义失败"})
		return
	}
	c.JSON(http.StatusOK, services.MapWorkflowDefinitionsToResponse(definitions))
}

func buildWorkflowDefinitionUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "code", "name", "module", "definitionJson", "description":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "version":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "isActive":
			var value bool
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["is_active"] = value
		case "id", "createdAt", "updatedAt":
			// Skip metadata
		default:
			// IGNORED
		}
	}
	return updates, nil
}

func buildPatchWorkflowDefinitionRequest(payload map[string]json.RawMessage) (services.PatchWorkflowDefinitionRequest, error) {
	request := services.PatchWorkflowDefinitionRequest{}
	for key, raw := range payload {
		switch key {
		case "id":
			if err := json.Unmarshal(raw, &request.ID); err != nil {
				return services.PatchWorkflowDefinitionRequest{}, err
			}
		case "code":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return services.PatchWorkflowDefinitionRequest{}, err
			}
			request.Code = &value
		case "name":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return services.PatchWorkflowDefinitionRequest{}, err
			}
			request.Name = &value
		case "module":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return services.PatchWorkflowDefinitionRequest{}, err
			}
			request.Module = &value
		case "definitionJson":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return services.PatchWorkflowDefinitionRequest{}, err
			}
			request.DefinitionJSON = &value
		case "description":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return services.PatchWorkflowDefinitionRequest{}, err
			}
			request.Description = &value
		case "version":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return services.PatchWorkflowDefinitionRequest{}, err
			}
			request.Version = &value
		case "isActive":
			var value bool
			if err := json.Unmarshal(raw, &value); err != nil {
				return services.PatchWorkflowDefinitionRequest{}, err
			}
			request.IsActive = &value
		}
	}
	return request, nil
}

func patchWorkflowDefinitionRecord(id string, updates map[string]interface{}) error {
	var existing models.WorkflowDefinition
	if err := db.DB.First(&existing, "id = ?", id).Error; err != nil {
		return err
	}
	return db.DB.Model(&existing).Updates(updates).Error
}

// SaveWorkflowDefinitionHandler creates or updates one workflow definition.
func SaveWorkflowDefinitionHandler(c *gin.Context) {
	payload, body, err := decodeJSONBodyMap(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的 JSON 映射"})
		return
	}

	patchRequest, err := buildPatchWorkflowDefinitionRequest(payload)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if strings.TrimSpace(patchRequest.ID) != "" {
		id := strings.TrimSpace(patchRequest.ID)
		if id == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的 ID 格式"})
			return
		}

		// Validation before patch
		if patchRequest.DefinitionJSON != nil {
			if err := services.ValidateWorkflowDefinitionJSON(*patchRequest.DefinitionJSON); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
		}

		updates, err := buildWorkflowDefinitionUpdates(payload)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if err := patchWorkflowDefinitionRecord(id, updates); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "差分保存流程定义失败: " + err.Error()})
			return
		}
		var def models.WorkflowDefinition
		db.DB.First(&def, "id = ?", id)
		c.JSON(http.StatusOK, services.MapWorkflowDefinitionToResponse(def))
		return
	}

	var input services.SaveWorkflowDefinitionRequest
	if err := json.Unmarshal(body, &input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的参数格式"})
		return
	}

	input.Code = strings.TrimSpace(input.Code)
	input.Name = strings.TrimSpace(input.Name)
	input.Module = strings.TrimSpace(input.Module)
	if input.Version <= 0 {
		input.Version = 1
	}

	if input.Code == "" || input.Name == "" || input.Module == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code/name/module 不能为空"})
		return
	}

	if err := services.ValidateWorkflowDefinitionJSON(input.DefinitionJSON); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	definition := models.WorkflowDefinition{
		Code:           input.Code,
		Name:           input.Name,
		Version:        input.Version,
		Module:         input.Module,
		DefinitionJSON: input.DefinitionJSON,
		Description:    input.Description,
		IsActive:       input.IsActive,
	}

	if err := db.DB.Create(&definition).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建流程定义失败: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, services.MapWorkflowDefinitionToResponse(definition))
}

// GetWorkflowInstancesHandler returns workflow instances with pagination.
func GetWorkflowInstancesHandler(c *gin.Context) {
	page, pageSize := parsePageAndSize(c, 1, 50)
	businessType := strings.TrimSpace(c.Query("businessType"))
	businessRefID := strings.TrimSpace(c.Query("businessRefId"))
	status := strings.TrimSpace(c.Query("status"))

	query := db.DB.Model(&models.WorkflowInstance{})
	if businessType != "" {
		query = query.Where("business_type = ?", businessType)
	}
	if businessRefID != "" {
		query = query.Where("business_ref_id = ?", businessRefID)
	}
	if status != "" {
		query = query.Where("status = ?", strings.ToUpper(status))
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取流程实例总数失败"})
		return
	}

	var instances []models.WorkflowInstance
	if err := query.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&instances).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取流程实例失败"})
		return
	}

	c.JSON(http.StatusOK, services.WorkflowInstanceListResponse{
		Items:    services.MapWorkflowInstancesToListItems(instances),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	})
}

// CreateWorkflowInstanceHandler starts one workflow instance for business document.
func CreateWorkflowInstanceHandler(c *gin.Context) {
	var input services.CreateWorkflowInstanceRequest
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的参数格式"})
		return
	}

	input.Module = strings.TrimSpace(input.Module)
	input.BusinessType = strings.TrimSpace(input.BusinessType)
	input.BusinessRefID = strings.TrimSpace(input.BusinessRefID)
	input.RequesterID = strings.TrimSpace(input.RequesterID)
	if input.RequesterID == "" {
		input.RequesterID = middleware.GetSafeUserID(c)
	}

	if input.Module == "" || input.BusinessType == "" || input.BusinessRefID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "module/businessType/businessRefId 不能为空"})
		return
	}

	var created *models.WorkflowInstance
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		instance, err := services.CreateWorkflowInstanceForDocumentTx(tx, input.Module, input.BusinessType, input.BusinessRefID, input.RequesterID)
		if err != nil {
			return err
		}
		created = instance
		return nil
	})
	if err != nil {
		if errors.Is(err, services.ErrWorkflowDefinitionMissing) {
			c.JSON(http.StatusNotFound, gin.H{"error": "未找到可用流程定义"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "创建流程实例失败: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, services.MapWorkflowInstanceToResponse(*created))
}

// GetWorkflowTasksHandler returns workflow tasks.
func GetWorkflowTasksHandler(c *gin.Context) {
	instanceID := strings.TrimSpace(c.Query("instanceId"))
	assigneeUserID := strings.TrimSpace(c.Query("assigneeUserId"))
	status := strings.TrimSpace(c.Query("status"))
	if assigneeUserID == "" {
		assigneeUserID = middleware.GetSafeUserID(c)
	}

	tasks, err := services.ListWorkflowTasks(instanceID, assigneeUserID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取流程任务失败"})
		return
	}
	c.JSON(http.StatusOK, tasks)
}

// ApproveWorkflowTaskHandler approves one workflow task.
func ApproveWorkflowTaskHandler(c *gin.Context) {
	handleWorkflowTaskDecision(c, true)
}

// RejectWorkflowTaskHandler rejects one workflow task.
func RejectWorkflowTaskHandler(c *gin.Context) {
	handleWorkflowTaskDecision(c, false)
}

func handleWorkflowTaskDecision(c *gin.Context, approved bool) {
	taskID := strings.TrimSpace(c.Param("id"))
	if taskID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "任务 ID 不能为空"})
		return
	}

	userID := middleware.GetSafeUserID(c)
	if strings.TrimSpace(userID) == "" {
		c.JSON(http.StatusForbidden, gin.H{"error": "无法识别审批人身份"})
		return
	}

	var input services.WorkflowTaskDecisionRequest
	_ = c.ShouldBindJSON(&input)

	var (
		instance services.WorkflowInstanceResponse
		err      error
	)
	if approved {
		instance, err = services.ApproveWorkflowTask(taskID, userID, input.Comment)
	} else {
		instance, err = services.RejectWorkflowTask(taskID, userID, input.Comment)
	}
	if err != nil {
		switch {
		case errors.Is(err, services.ErrWorkflowTaskNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "流程任务不存在"})
			return
		case errors.Is(err, services.ErrWorkflowTaskAssigneeMismatch):
			c.JSON(http.StatusForbidden, gin.H{"error": "当前用户不是该任务审批人"})
			return
		case errors.Is(err, services.ErrWorkflowTaskAlreadyHandled):
			c.JSON(http.StatusConflict, gin.H{"error": "该任务已处理，请勿重复提交"})
			return
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "审批处理失败: " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusOK, instance)
}
