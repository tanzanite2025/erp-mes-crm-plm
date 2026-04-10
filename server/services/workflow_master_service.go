package services

import (
	"encoding/json"
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var ErrWorkflowDefinitionPayloadInvalid = errors.New("invalid workflow definition payload")

type WorkflowInstanceListQuery struct {
	Page         int
	PageSize     int
	BusinessType string
	BusinessRef  string
	Status       string
}

func ListWorkflowDefinitions(module string) ([]WorkflowDefinitionResponse, error) {
	module = strings.TrimSpace(module)
	query := db.DB.Model(&models.WorkflowDefinition{})
	if module != "" {
		query = query.Where("module = ?", module)
	}

	var definitions []models.WorkflowDefinition
	if err := query.Order("module asc, code asc, version desc").Find(&definitions).Error; err != nil {
		return nil, err
	}
	return MapWorkflowDefinitionsToResponse(definitions), nil
}

func SaveWorkflowDefinitionFromJSON(payload map[string]json.RawMessage, body []byte) (WorkflowDefinitionResponse, error) {
	patchRequest, err := buildPatchWorkflowDefinitionRequest(payload)
	if err != nil {
		return WorkflowDefinitionResponse{}, wrapWorkflowDefinitionPayloadError(err)
	}

	if strings.TrimSpace(patchRequest.ID) != "" {
		id := strings.TrimSpace(patchRequest.ID)
		if id == "" {
			return WorkflowDefinitionResponse{}, wrapWorkflowDefinitionPayloadError(errors.New("invalid id"))
		}

		if patchRequest.DefinitionJSON != nil {
			if err := ValidateWorkflowDefinitionJSON(*patchRequest.DefinitionJSON); err != nil {
				return WorkflowDefinitionResponse{}, wrapWorkflowDefinitionPayloadError(err)
			}
		}

		updates, err := buildWorkflowDefinitionUpdates(payload)
		if err != nil {
			return WorkflowDefinitionResponse{}, wrapWorkflowDefinitionPayloadError(err)
		}

		if err := patchWorkflowDefinitionRecord(id, updates); err != nil {
			return WorkflowDefinitionResponse{}, err
		}

		var def models.WorkflowDefinition
		if err := db.DB.First(&def, "id = ?", id).Error; err != nil {
			return WorkflowDefinitionResponse{}, err
		}
		return MapWorkflowDefinitionToResponse(def), nil
	}

	var input SaveWorkflowDefinitionRequest
	if err := json.Unmarshal(body, &input); err != nil {
		return WorkflowDefinitionResponse{}, wrapWorkflowDefinitionPayloadError(err)
	}

	input.Code = strings.TrimSpace(input.Code)
	input.Name = strings.TrimSpace(input.Name)
	input.Module = strings.TrimSpace(input.Module)
	if input.Version <= 0 {
		input.Version = 1
	}

	if input.Code == "" || input.Name == "" || input.Module == "" {
		return WorkflowDefinitionResponse{}, wrapWorkflowDefinitionPayloadError(errors.New("code/name/module is required"))
	}

	if err := ValidateWorkflowDefinitionJSON(input.DefinitionJSON); err != nil {
		return WorkflowDefinitionResponse{}, wrapWorkflowDefinitionPayloadError(err)
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
		return WorkflowDefinitionResponse{}, err
	}
	return MapWorkflowDefinitionToResponse(definition), nil
}

func ListWorkflowInstances(query WorkflowInstanceListQuery) (WorkflowInstanceListResponse, error) {
	page := query.Page
	if page < 1 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize < 1 {
		pageSize = 50
	}

	businessType := strings.TrimSpace(query.BusinessType)
	businessRefID := strings.TrimSpace(query.BusinessRef)
	status := strings.ToUpper(strings.TrimSpace(query.Status))

	tx := db.DB.Model(&models.WorkflowInstance{})
	if businessType != "" {
		tx = tx.Where("business_type = ?", businessType)
	}
	if businessRefID != "" {
		tx = tx.Where("business_ref_id = ?", businessRefID)
	}
	if status != "" {
		tx = tx.Where("status = ?", status)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return WorkflowInstanceListResponse{}, err
	}

	var instances []models.WorkflowInstance
	if err := tx.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&instances).Error; err != nil {
		return WorkflowInstanceListResponse{}, err
	}

	return WorkflowInstanceListResponse{
		Items:    MapWorkflowInstancesToListItems(instances),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func CreateWorkflowInstance(input CreateWorkflowInstanceRequest) (WorkflowInstanceResponse, error) {
	input.Module = strings.TrimSpace(input.Module)
	input.BusinessType = strings.TrimSpace(input.BusinessType)
	input.BusinessRefID = strings.TrimSpace(input.BusinessRefID)
	input.RequesterID = strings.TrimSpace(input.RequesterID)

	var created *models.WorkflowInstance
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		instance, err := CreateWorkflowInstanceForDocumentTx(tx, input.Module, input.BusinessType, input.BusinessRefID, input.RequesterID)
		if err != nil {
			return err
		}
		created = instance
		return nil
	})
	if err != nil {
		return WorkflowInstanceResponse{}, err
	}
	return MapWorkflowInstanceToResponse(*created), nil
}

func buildWorkflowDefinitionUpdates(payload map[string]json.RawMessage) (map[string]interface{}, error) {
	updates := make(map[string]interface{})
	for key, raw := range payload {
		switch key {
		case "code", "name", "module", "description":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates[key] = value
		case "definitionJson":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return nil, err
			}
			updates["definition_json"] = value
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
			// Ignore unknown fields to preserve historical behavior
		}
	}
	return updates, nil
}

func buildPatchWorkflowDefinitionRequest(payload map[string]json.RawMessage) (PatchWorkflowDefinitionRequest, error) {
	request := PatchWorkflowDefinitionRequest{}
	for key, raw := range payload {
		switch key {
		case "id":
			if err := json.Unmarshal(raw, &request.ID); err != nil {
				return PatchWorkflowDefinitionRequest{}, err
			}
		case "code":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return PatchWorkflowDefinitionRequest{}, err
			}
			request.Code = &value
		case "name":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return PatchWorkflowDefinitionRequest{}, err
			}
			request.Name = &value
		case "module":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return PatchWorkflowDefinitionRequest{}, err
			}
			request.Module = &value
		case "definitionJson":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return PatchWorkflowDefinitionRequest{}, err
			}
			request.DefinitionJSON = &value
		case "description":
			var value string
			if err := json.Unmarshal(raw, &value); err != nil {
				return PatchWorkflowDefinitionRequest{}, err
			}
			request.Description = &value
		case "version":
			var value int
			if err := json.Unmarshal(raw, &value); err != nil {
				return PatchWorkflowDefinitionRequest{}, err
			}
			request.Version = &value
		case "isActive":
			var value bool
			if err := json.Unmarshal(raw, &value); err != nil {
				return PatchWorkflowDefinitionRequest{}, err
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

func wrapWorkflowDefinitionPayloadError(err error) error {
	if err == nil {
		return nil
	}
	return errors.Join(ErrWorkflowDefinitionPayloadInvalid, err)
}
