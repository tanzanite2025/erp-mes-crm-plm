package handlers

import "xdfc-server/services"

func toMaterialOptionApiDTO(option services.MaterialOptionQueryResult) MaterialOptionApiDTO {
	return MaterialOptionApiDTO{
		ID:        option.ID,
		Code:      option.Code,
		Name:      option.Name,
		Spec:      option.Spec,
		UOM:       option.UOM,
		Category:  option.Category,
		Status:    option.Status,
		CostPrice: option.CostPrice,
	}
}

func toMaterialOptionApiDTOs(options []services.MaterialOptionQueryResult) []MaterialOptionApiDTO {
	items := make([]MaterialOptionApiDTO, 0, len(options))
	for _, option := range options {
		items = append(items, toMaterialOptionApiDTO(option))
	}
	return items
}
