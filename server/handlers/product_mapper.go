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
	if items == nil {
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
	mdc := MapMasterDataControlToDTO(product.MasterDataControl)

	return ProductApiDTO{
		ID:                       product.ID,
		SKU:                      product.SKU,
		Name:                     product.Name,
		ModelCode:                product.ModelCode,
		TypeID:                   product.TypeID,
		Depth:                    product.Depth,
		WidthInternal:            product.WidthInternal,
		WidthExternal:            product.WidthExternal,
		MaxTirePressure:          product.MaxTirePressure,
		TireType:                 product.TireType,
		BrakeType:                product.BrakeType,
		TechSeries:               product.TechSeries,
		Length:                   product.Length,
		Angle:                    product.Angle,
		Clamp:                    product.Clamp,
		Offset:                   product.Offset,
		AxleCrown:                product.AxleCrown,
		Steerer:                  product.Steerer,
		Image:                    product.Image,
		Restrictions:             decodeProductStringArray(product.Restrictions),
		MoldGroup:                product.MoldGroup,
		Description:              product.Description,
		EngineeringSpecID:        product.EngineeringSpecID,
		AttributeValues:          toProductAttributeValueApiDTOs(product.AttributeValues),
		TechSpecs:                cloneHandlerRawMessage(product.TechnicalSpecs),
		BarcodeConfig:            cloneHandlerBytes(product.BarcodeConfig),
		Attachments:              cloneHandlerBytes(product.Attachments),
		Status:                   product.Status,
		TemplateKey:              product.TemplateKey,
		ResolvedTemplateID:       product.ResolvedTemplateID,
		ResolvedTemplateKey:      product.ResolvedTemplateKey,
		TemplateResolutionSource: product.TemplateResolutionSource,
		TemplateResolutionError:  product.TemplateResolutionError,
		// 嵌套命名空间
		MasterDataControl:        mdc,
		CreatedAt:                product.CreatedAt,
		UpdatedAt:                product.UpdatedAt,
		Version:                  product.Version,
	}
}

func toProductApiDTOs(items []models.Product) []ProductApiDTO {
	result := make([]ProductApiDTO, 0, len(items))
	for _, item := range items {
		result = append(result, toProductApiDTO(item))
	}
	return result
}
