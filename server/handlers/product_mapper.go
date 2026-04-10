package handlers

import (
	"encoding/json"
	"xdfc-server/models"
)

func decodeProductStringArray(raw []byte) []string {
	if len(raw) == 0 {
		return []string{}
	}
	items := make([]string, 0)
	if err := json.Unmarshal(raw, &items); err != nil {
		return []string{}
	}
	return items
}

func cloneHandlerRawMessage(raw json.RawMessage) json.RawMessage {
	if len(raw) == 0 {
		return nil
	}
	return append(json.RawMessage(nil), raw...)
}

func cloneHandlerBytes(raw []byte) json.RawMessage {
	if len(raw) == 0 {
		return nil
	}
	return append(json.RawMessage(nil), raw...)
}

func toProductAttributeValueApiDTO(item models.ProductAttributeValue) ProductAttributeValueApiDTO {
	return ProductAttributeValueApiDTO{
		ID:          item.ID,
		ProductID:   item.ProductID,
		CategoryKey: item.CategoryKey,
		OptionValue: item.OptionValue,
		SortOrder:   item.SortOrder,
		Version:     item.Version,
	}
}

func toProductAttributeValueApiDTOs(items []models.ProductAttributeValue) []ProductAttributeValueApiDTO {
	result := make([]ProductAttributeValueApiDTO, 0, len(items))
	for _, item := range items {
		result = append(result, toProductAttributeValueApiDTO(item))
	}
	return result
}

func toProductApiDTO(product models.Product) ProductApiDTO {
	return ProductApiDTO{
		ID:                product.ID,
		SKU:               product.SKU,
		Name:              product.Name,
		ModelCode:         product.ModelCode,
		TypeID:            product.TypeID,
		Depth:             product.Depth,
		WidthInternal:     product.WidthInternal,
		WidthExternal:     product.WidthExternal,
		TireType:          product.TireType,
		BrakeType:         product.BrakeType,
		TechSeries:        product.TechSeries,
		VersionLevel:      product.VersionLevel,
		Weight:            product.Weight,
		Length:            product.Length,
		Angle:             product.Angle,
		Clamp:             product.Clamp,
		Offset:            product.Offset,
		AxleCrown:         product.AxleCrown,
		Steerer:           product.Steerer,
		Image:             product.Image,
		Restrictions:      decodeProductStringArray(product.Restrictions),
		MoldGroup:         product.MoldGroup,
		Description:       product.Description,
		EngineeringSpecID: product.EngineeringSpecID,
		AttributeValues:   toProductAttributeValueApiDTOs(product.AttributeValues),
		TechSpecs:         cloneHandlerRawMessage(product.TechnicalSpecs),
		BarcodeConfig:     cloneHandlerBytes(product.BarcodeConfig),
		Attachments:       cloneHandlerBytes(product.Attachments),
		Status:            product.Status,
		TemplateKey:       product.TemplateKey,
		RevisionNo:        product.RevisionNo,
		EffectiveFrom:     product.EffectiveFrom,
		EffectiveTo:       product.EffectiveTo,
		ChangeType:        product.ChangeType,
		ChangeOrderNo:     product.ChangeOrderNo,
		SiteCode:          product.SiteCode,
		IsDefaultSite:     product.IsDefaultSite,
		CreatedAt:         product.CreatedAt,
		UpdatedAt:         product.UpdatedAt,
		Version:           product.Version,
	}
}

func toProductApiDTOs(items []models.Product) []ProductApiDTO {
	result := make([]ProductApiDTO, 0, len(items))
	for _, item := range items {
		result = append(result, toProductApiDTO(item))
	}
	return result
}
