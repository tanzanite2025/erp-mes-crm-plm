package services

import (
	"encoding/json"
	"time"
	"xdfc-server/models"
)

type ProductAttributeValueAPIRequest struct {
	ID          string `json:"id"`
	ProductID   string `json:"productId"`
	CategoryKey string `json:"categoryKey"`
	OptionValue string `json:"optionValue"`
	SortOrder   int    `json:"sortOrder"`
	Version     int    `json:"version"`
}

type SaveProductAPIRequest struct {
	ID                string                            `json:"id"`
	SKU               string                            `json:"sku"`
	Name              string                            `json:"name"`
	ModelCode         string                            `json:"modelCode"`
	TypeID            string                            `json:"typeId"`
	Depth             float64                           `json:"depth"`
	WidthInternal     float64                           `json:"widthInternal"`
	WidthExternal     float64                           `json:"widthExternal"`
	TireType          string                            `json:"tireType"`
	BrakeType         string                            `json:"brakeType"`
	TechSeries        string                            `json:"techSeries"`
	VersionLevel      string                            `json:"versionLevel"`
	Weight            float64                           `json:"weight"`
	Length            float64                           `json:"length"`
	Angle             float64                           `json:"angle"`
	Clamp             string                            `json:"clamp"`
	Offset            float64                           `json:"offset"`
	AxleCrown         float64                           `json:"axleCrown"`
	Steerer           string                            `json:"steerer"`
	Image             string                            `json:"image"`
	Restrictions      []string                          `json:"restrictions"`
	MoldGroup         string                            `json:"moldGroup"`
	Description       string                            `json:"description"`
	EngineeringSpecID string                            `json:"engineeringSpecId"`
	AttributeValues   []ProductAttributeValueAPIRequest `json:"attributeValues"`
	TechSpecs         json.RawMessage                   `json:"techSpecs"`
	BarcodeConfig     json.RawMessage                   `json:"barcodeConfig"`
	Attachments       json.RawMessage                   `json:"attachments"`
	Status            string                            `json:"status"`
	RevisionNo        string                            `json:"revisionNo"`
	EffectiveFrom     *time.Time                        `json:"effectiveFrom"`
	EffectiveTo       *time.Time                        `json:"effectiveTo"`
	ChangeType        string                            `json:"changeType"`
	ChangeOrderNo     string                            `json:"changeOrderNo"`
	SiteCode          string                            `json:"siteCode"`
	IsDefaultSite     bool                              `json:"isDefaultSite"`
	Version           int                               `json:"version"`
}

type BulkSyncProductsAPIPayload struct {
	Products      []SaveProductAPIRequest `json:"products"`
	GlobalVersion int                     `json:"globalVersion,omitempty"`
}

func cloneProductRawMessage(raw json.RawMessage) json.RawMessage {
	if len(raw) == 0 {
		return nil
	}
	return append(json.RawMessage(nil), raw...)
}

func encodeProductJSONBytes(value any) []byte {
	if value == nil {
		return nil
	}
	encoded, err := json.Marshal(value)
	if err != nil {
		return nil
	}
	return encoded
}

func toProductAttributeValueModels(items []ProductAttributeValueAPIRequest) []models.ProductAttributeValue {
	result := make([]models.ProductAttributeValue, 0, len(items))
	for _, item := range items {
		result = append(result, models.ProductAttributeValue{
			BaseModel: models.BaseModel{
				ID: item.ID,
			},
			ProductID:   item.ProductID,
			CategoryKey: item.CategoryKey,
			OptionValue: item.OptionValue,
			SortOrder:   item.SortOrder,
			Version:     item.Version,
		})
	}
	return result
}

func toProductAttributeValueAPIRequests(items []models.ProductAttributeValue) []ProductAttributeValueAPIRequest {
	result := make([]ProductAttributeValueAPIRequest, 0, len(items))
	for _, item := range items {
		result = append(result, ProductAttributeValueAPIRequest{
			ID:          item.ID,
			ProductID:   item.ProductID,
			CategoryKey: item.CategoryKey,
			OptionValue: item.OptionValue,
			SortOrder:   item.SortOrder,
			Version:     item.Version,
		})
	}
	return result
}

func toProductModel(input SaveProductAPIRequest) models.Product {
	return models.Product{
		BaseModel: models.BaseModel{
			ID: input.ID,
		},
		MasterDataControl: models.MasterDataControl{
			RevisionNo:    input.RevisionNo,
			EffectiveFrom: input.EffectiveFrom,
			EffectiveTo:   input.EffectiveTo,
			ChangeType:    input.ChangeType,
			ChangeOrderNo: input.ChangeOrderNo,
			SiteCode:      input.SiteCode,
			IsDefaultSite: input.IsDefaultSite,
		},
		SKU:               input.SKU,
		Name:              input.Name,
		ModelCode:         input.ModelCode,
		TypeID:            input.TypeID,
		Depth:             input.Depth,
		WidthInternal:     input.WidthInternal,
		WidthExternal:     input.WidthExternal,
		TireType:          input.TireType,
		BrakeType:         input.BrakeType,
		TechSeries:        input.TechSeries,
		VersionLevel:      input.VersionLevel,
		Weight:            input.Weight,
		Length:            input.Length,
		Angle:             input.Angle,
		Clamp:             input.Clamp,
		Offset:            input.Offset,
		AxleCrown:         input.AxleCrown,
		Steerer:           input.Steerer,
		Image:             input.Image,
		Restrictions:      encodeProductJSONBytes(input.Restrictions),
		MoldGroup:         input.MoldGroup,
		Description:       input.Description,
		EngineeringSpecID: input.EngineeringSpecID,
		AttributeValues:   toProductAttributeValueModels(input.AttributeValues),
		TechnicalSpecs:    cloneProductRawMessage(input.TechSpecs),
		BarcodeConfig:     cloneProductRawMessage(input.BarcodeConfig),
		Attachments:       cloneProductRawMessage(input.Attachments),
		Status:            input.Status,
		Version:           input.Version,
	}
}

func toProductAPIRequest(model models.Product) SaveProductAPIRequest {
	restrictions := make([]string, 0)
	if len(model.Restrictions) > 0 {
		_ = json.Unmarshal(model.Restrictions, &restrictions)
	}

	return SaveProductAPIRequest{
		ID:                model.ID,
		SKU:               model.SKU,
		Name:              model.Name,
		ModelCode:         model.ModelCode,
		TypeID:            model.TypeID,
		Depth:             model.Depth,
		WidthInternal:     model.WidthInternal,
		WidthExternal:     model.WidthExternal,
		TireType:          model.TireType,
		BrakeType:         model.BrakeType,
		TechSeries:        model.TechSeries,
		VersionLevel:      model.VersionLevel,
		Weight:            model.Weight,
		Length:            model.Length,
		Angle:             model.Angle,
		Clamp:             model.Clamp,
		Offset:            model.Offset,
		AxleCrown:         model.AxleCrown,
		Steerer:           model.Steerer,
		Image:             model.Image,
		Restrictions:      restrictions,
		MoldGroup:         model.MoldGroup,
		Description:       model.Description,
		EngineeringSpecID: model.EngineeringSpecID,
		AttributeValues:   toProductAttributeValueAPIRequests(model.AttributeValues),
		TechSpecs:         cloneProductRawMessage(model.TechnicalSpecs),
		BarcodeConfig:     cloneProductRawMessage(model.BarcodeConfig),
		Attachments:       cloneProductRawMessage(model.Attachments),
		Status:            model.Status,
		RevisionNo:        model.RevisionNo,
		EffectiveFrom:     model.EffectiveFrom,
		EffectiveTo:       model.EffectiveTo,
		ChangeType:        model.ChangeType,
		ChangeOrderNo:     model.ChangeOrderNo,
		SiteCode:          model.SiteCode,
		IsDefaultSite:     model.IsDefaultSite,
		Version:           model.Version,
	}
}
