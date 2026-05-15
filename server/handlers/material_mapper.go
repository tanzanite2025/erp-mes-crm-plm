package handlers

import "xdfc-server/models"

func toMaterialApiDTO(material models.Material) MaterialApiDTO {
	return MaterialApiDTO{
		ID:                 material.ID,
		Code:               material.Code,
		Name:               material.Name,
		Category:           material.Category,
		Spec:               material.Spec,
		InternalDimensions: material.InternalDimensions,
		ExternalDimensions: material.ExternalDimensions,
		UOM:                material.UOM,
		MinStock:           material.MinStock,
		CostPrice:          material.CostPrice,
		SupplierID:         material.SupplierID,
		Description:        material.Description,
		Images:             material.Images,
		Status:             material.Status,
		MasterDataControl:  MapMasterDataControlToDTO(material.MasterDataControl),
		CreatedAt:          material.CreatedAt,
		UpdatedAt:          material.UpdatedAt,
		Version:            material.Version,
	}
}

func toMaterialApiDTOs(materials []models.Material) []MaterialApiDTO {
	items := make([]MaterialApiDTO, 0, len(materials))
	for _, material := range materials {
		items = append(items, toMaterialApiDTO(material))
	}
	return items
}
