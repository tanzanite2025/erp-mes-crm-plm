package services

import "time"

type SaveWorkflowDefinitionRequest struct {
	Code           string `json:"code"`
	Name           string `json:"name"`
	Version        int    `json:"version"`
	Module         string `json:"module"`
	DefinitionJSON string `json:"definitionJson"`
	Description    string `json:"description"`
	IsActive       bool   `json:"isActive"`
}

type PatchWorkflowDefinitionRequest struct {
	ID             string  `json:"id"`
	Code           *string `json:"code"`
	Name           *string `json:"name"`
	Version        *int    `json:"version"`
	Module         *string `json:"module"`
	DefinitionJSON *string `json:"definitionJson"`
	Description    *string `json:"description"`
	IsActive       *bool   `json:"isActive"`
}

type CreateWorkflowInstanceRequest struct {
	Module        string `json:"module"`
	BusinessType  string `json:"businessType"`
	BusinessRefID string `json:"businessRefId"`
	RequesterID   string `json:"requesterId"`
}

type WorkflowTaskDecisionRequest struct {
	Comment string `json:"comment"`
}

type WorkflowDefinitionResponse struct {
	ID             string    `json:"id"`
	Code           string    `json:"code"`
	Name           string    `json:"name"`
	Version        int       `json:"version"`
	Module         string    `json:"module"`
	DefinitionJSON string    `json:"definitionJson"`
	Description    string    `json:"description"`
	IsActive       bool      `json:"isActive"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type WorkflowInstanceResponse struct {
	ID            string     `json:"id"`
	DefinitionID  string     `json:"definitionId"`
	BusinessType  string     `json:"businessType"`
	BusinessRefID string     `json:"businessRefId"`
	CurrentNodeID string     `json:"currentNodeId"`
	Status        string     `json:"status"`
	RequesterID   string     `json:"requesterId"`
	StartedAt     time.Time  `json:"startedAt"`
	FinishedAt    *time.Time `json:"finishedAt"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
}

type WorkflowInstanceListItemResponse struct {
	ID            string    `json:"id"`
	DefinitionID  string    `json:"definitionId"`
	BusinessType  string    `json:"businessType"`
	BusinessRefID string    `json:"businessRefId"`
	Status        string    `json:"status"`
	RequesterID   string    `json:"requesterId"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

type WorkflowInstanceListResponse struct {
	Items    []WorkflowInstanceListItemResponse `json:"items"`
	Total    int64                              `json:"total"`
	Page     int                                `json:"page"`
	PageSize int                                `json:"pageSize"`
}

type WorkflowTaskResponse struct {
	ID             string     `json:"id"`
	InstanceID     string     `json:"instanceId"`
	NodeID         string     `json:"nodeId"`
	AssigneeUserID string     `json:"assigneeUserId"`
	Status         string     `json:"status"`
	Action         string     `json:"action"`
	Comment        string     `json:"comment"`
	ActionAt       *time.Time `json:"actionAt"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
}
