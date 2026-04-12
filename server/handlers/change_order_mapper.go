package handlers

import "xdfc-server/models"

func toChangeOrderOptionsApiDTO(item models.ChangeOrder) ChangeOrderOptionsApiDTO {
	return ChangeOrderOptionsApiDTO{
		ID:            item.ID,
		ChangeOrderNo: item.ChangeOrderNo,
		Title:         item.Title,
		ChangeType:    item.ChangeType,
		ProductID:     item.ProductID,
		SiteCode:      item.SiteCode,
		IsDefaultSite: item.IsDefaultSite,
		RevisionNo:    item.RevisionNo,
		EffectiveFrom: item.EffectiveFrom,
		EffectiveTo:   item.EffectiveTo,
		Status:        item.Status,
		Version:       item.Version,
	}
}

func toChangeOrderOptionsApiDTOs(items []models.ChangeOrder) []ChangeOrderOptionsApiDTO {
	result := make([]ChangeOrderOptionsApiDTO, 0, len(items))
	for _, item := range items {
		result = append(result, toChangeOrderOptionsApiDTO(item))
	}
	return result
}

func toChangeOrderApiDTO(item models.ChangeOrder) ChangeOrderApiDTO {
	var product *ProductApiDTO
	if item.Product != nil {
		mapped := toProductApiDTO(*item.Product)
		product = &mapped
	}

	return ChangeOrderApiDTO{
		ID:            item.ID,
		ChangeOrderNo: item.ChangeOrderNo,
		Title:         item.Title,
		ChangeType:    item.ChangeType,
		ProductID:     item.ProductID,
		Product:       product,
		SiteCode:      item.SiteCode,
		IsDefaultSite: item.IsDefaultSite,
		RevisionNo:    item.RevisionNo,
		EffectiveFrom: item.EffectiveFrom,
		EffectiveTo:   item.EffectiveTo,
		Status:        item.Status,
		Description:   item.Description,
		CreatedAt:     item.CreatedAt,
		UpdatedAt:     item.UpdatedAt,
		Version:       item.Version,
	}
}

func toChangeOrderApiDTOs(items []models.ChangeOrder) []ChangeOrderApiDTO {
	result := make([]ChangeOrderApiDTO, 0, len(items))
	for _, item := range items {
		result = append(result, toChangeOrderApiDTO(item))
	}
	return result
}
