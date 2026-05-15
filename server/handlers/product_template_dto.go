package handlers

import (
	"time"
	"xdfc-server/models"
)

// ProductTemplateAttributeBindingResponseDTO 模板属性绑定响应
type ProductTemplateAttributeBindingResponseDTO struct {
	ID          string `json:"id,omitempty"`
	TemplateID  string `json:"templateId,omitempty"`
	CategoryKey string `json:"categoryKey"`
	SortOrder   int    `json:"sortOrder"`
	Required    bool   `json:"required"`
	Active      bool   `json:"active"`
	Version     int    `json:"version"`
}

// ProductTemplateResponseDTO 产品模板响应 DTO（含嵌套 masterDataControl）
type ProductTemplateResponseDTO struct {
	ID                string                                       `json:"id"`
	Name              string                                       `json:"name"`
	Code              string                                       `json:"code"`
	ComponentKey      string                                       `json:"componentKey"`
	Description       string                                       `json:"description,omitempty"`
	Active            bool                                         `json:"active"`
	AttributeBindings []ProductTemplateAttributeBindingResponseDTO `json:"attributeBindings"`
	CreatedAt         time.Time                                    `json:"createdAt"`
	UpdatedAt         time.Time                                    `json:"updatedAt"`
	Version           int                                          `json:"version"`
	// --- MasterDataControl 嵌套命名空间（唯一输出格式） ---
	MasterDataControl *MasterDataControlDTO `json:"masterDataControl,omitempty"`
}

func mapProductTemplateAttributeBindingToDTO(binding models.ProductTemplateAttributeBinding) ProductTemplateAttributeBindingResponseDTO {
	return ProductTemplateAttributeBindingResponseDTO{
		ID:          binding.ID,
		TemplateID:  binding.TemplateID,
		CategoryKey: binding.CategoryKey,
		SortOrder:   binding.SortOrder,
		Required:    binding.Required,
		Active:      binding.Active,
		Version:     binding.Version,
	}
}

func mapProductTemplateToResponseDTO(template models.ProductTemplate) ProductTemplateResponseDTO {
	bindings := make([]ProductTemplateAttributeBindingResponseDTO, 0, len(template.AttributeBindings))
	for _, b := range template.AttributeBindings {
		bindings = append(bindings, mapProductTemplateAttributeBindingToDTO(b))
	}

	return ProductTemplateResponseDTO{
		ID:                template.ID,
		Name:              template.Name,
		Code:              template.Code,
		ComponentKey:      template.ComponentKey,
		Description:       template.Description,
		Active:            template.Active,
		AttributeBindings: bindings,
		CreatedAt:         template.CreatedAt,
		UpdatedAt:         template.UpdatedAt,
		Version:           template.Version,
		MasterDataControl: MapMasterDataControlToDTO(template.MasterDataControl),
	}
}

func mapProductTemplatesToResponseDTOs(templates []models.ProductTemplate) []ProductTemplateResponseDTO {
	result := make([]ProductTemplateResponseDTO, 0, len(templates))
	for _, t := range templates {
		result = append(result, mapProductTemplateToResponseDTO(t))
	}
	return result
}
