package models

import "time"

const (
	WorkflowInstanceStatusRunning  = "RUNNING"
	WorkflowInstanceStatusApproved = "APPROVED"
	WorkflowInstanceStatusRejected = "REJECTED"
	WorkflowInstanceStatusCanceled = "CANCELED"
)

const (
	WorkflowTaskStatusTodo     = "TODO"
	WorkflowTaskStatusDone     = "DONE"
	WorkflowTaskStatusRejected = "REJECTED"
	WorkflowTaskStatusSkipped  = "SKIPPED"
)

// WorkflowDefinition stores lightweight workflow templates.
type WorkflowDefinition struct {
	BaseModel
	Code           string `gorm:"size:100;uniqueIndex;not null" json:"code"`
	Name           string `gorm:"size:255;not null" json:"name"`
	Version        int    `gorm:"default:1" json:"version"`
	Module         string `gorm:"size:100;index;not null" json:"module"`
	DefinitionJSON string `gorm:"type:jsonb;not null" json:"definitionJson"`
	Description    string `gorm:"type:text" json:"description"`
	IsActive       bool   `gorm:"default:true;index" json:"isActive"`
}

func (WorkflowDefinition) TableName() string {
	return "workflow_definitions"
}

// WorkflowInstance represents a runtime workflow bound to one business document.
type WorkflowInstance struct {
	BaseModel
	DefinitionID  string              `gorm:"type:uuid;index;not null" json:"definitionId"`
	Definition    *WorkflowDefinition `gorm:"foreignKey:DefinitionID" json:"definition,omitempty"`
	BusinessType  string              `gorm:"size:80;index;not null" json:"businessType"`
	BusinessRefID string              `gorm:"size:100;index;not null" json:"businessRefId"`
	CurrentNodeID string              `gorm:"size:100" json:"currentNodeId"`
	Status        string              `gorm:"size:30;default:'RUNNING';index" json:"status"`
	RequesterID   string              `gorm:"type:uuid;index" json:"requesterId"`
	StartedAt     time.Time           `json:"startedAt"`
	FinishedAt    *time.Time          `json:"finishedAt"`
}

func (WorkflowInstance) TableName() string {
	return "workflow_instances"
}

// WorkflowTask represents actionable workflow tasks assigned to users.
type WorkflowTask struct {
	BaseModel
	InstanceID     string            `gorm:"type:uuid;index;not null" json:"instanceId"`
	Instance       *WorkflowInstance `gorm:"foreignKey:InstanceID" json:"instance,omitempty"`
	NodeID         string            `gorm:"size:100;index" json:"nodeId"`
	AssigneeUserID string            `gorm:"type:uuid;index;not null" json:"assigneeUserId"`
	Status         string            `gorm:"size:30;default:'TODO';index" json:"status"`
	Action         string            `gorm:"size:30" json:"action"`
	Comment        string            `gorm:"type:text" json:"comment"`
	ActionAt       *time.Time        `json:"actionAt"`
}

func (WorkflowTask) TableName() string {
	return "workflow_tasks"
}
