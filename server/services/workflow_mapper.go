package services

import "xdfc-server/models"

func MapWorkflowDefinitionToResponse(def models.WorkflowDefinition) WorkflowDefinitionResponse {
	return WorkflowDefinitionResponse{
		ID:             def.ID,
		Code:           def.Code,
		Name:           def.Name,
		Version:        def.Version,
		Module:         def.Module,
		DefinitionJSON: def.DefinitionJSON,
		Description:    def.Description,
		IsActive:       def.IsActive,
		CreatedAt:      def.CreatedAt,
		UpdatedAt:      def.UpdatedAt,
	}
}

func MapWorkflowDefinitionsToResponse(definitions []models.WorkflowDefinition) []WorkflowDefinitionResponse {
	items := make([]WorkflowDefinitionResponse, 0, len(definitions))
	for _, def := range definitions {
		items = append(items, MapWorkflowDefinitionToResponse(def))
	}
	return items
}

func MapWorkflowInstanceToResponse(instance models.WorkflowInstance) WorkflowInstanceResponse {
	return WorkflowInstanceResponse{
		ID:            instance.ID,
		DefinitionID:  instance.DefinitionID,
		BusinessType:  instance.BusinessType,
		BusinessRefID: instance.BusinessRefID,
		CurrentNodeID: instance.CurrentNodeID,
		Status:        instance.Status,
		RequesterID:   instance.RequesterID,
		StartedAt:     instance.StartedAt,
		FinishedAt:    instance.FinishedAt,
		CreatedAt:     instance.CreatedAt,
		UpdatedAt:     instance.UpdatedAt,
	}
}

func MapWorkflowInstancesToListItems(instances []models.WorkflowInstance) []WorkflowInstanceListItemResponse {
	items := make([]WorkflowInstanceListItemResponse, 0, len(instances))
	for _, instance := range instances {
		items = append(items, WorkflowInstanceListItemResponse{
			ID:            instance.ID,
			DefinitionID:  instance.DefinitionID,
			BusinessType:  instance.BusinessType,
			BusinessRefID: instance.BusinessRefID,
			Status:        instance.Status,
			RequesterID:   instance.RequesterID,
			CreatedAt:     instance.CreatedAt,
			UpdatedAt:     instance.UpdatedAt,
		})
	}
	return items
}

func MapWorkflowTaskToResponse(task models.WorkflowTask) WorkflowTaskResponse {
	return WorkflowTaskResponse{
		ID:             task.ID,
		InstanceID:     task.InstanceID,
		NodeID:         task.NodeID,
		AssigneeUserID: task.AssigneeUserID,
		Status:         task.Status,
		Action:         task.Action,
		Comment:        task.Comment,
		ActionAt:       task.ActionAt,
		CreatedAt:      task.CreatedAt,
		UpdatedAt:      task.UpdatedAt,
	}
}

func MapWorkflowTasksToResponse(tasks []models.WorkflowTask) []WorkflowTaskResponse {
	items := make([]WorkflowTaskResponse, 0, len(tasks))
	for _, task := range tasks {
		items = append(items, MapWorkflowTaskToResponse(task))
	}
	return items
}
