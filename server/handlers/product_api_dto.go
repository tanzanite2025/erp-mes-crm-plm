package handlers

import "encoding/json"

type ProductAttributeValueApiDTO struct {
	ID          string `json:"id,omitempty"`
	ProductID   string `json:"productId,omitempty"`
	CategoryKey string `json:"categoryKey"`
	OptionValue string `json:"optionValue"`
	SortOrder   int    `json:"sortOrder"`
	Version     int    `json:"version"`
}

type ProductApiDTO struct {
	ID                       string                        `json:"id"`
	SKU                      string                        `json:"sku"`
	Name                     string                        `json:"name"`
	ModelCode                string                        `json:"modelCode"`
	TypeID                   string                        `json:"typeId"`
	Depth                    float64                       `json:"depth"`
	WidthInternal            float64                       `json:"widthInternal"`
	WidthExternal            float64                       `json:"widthExternal"`
	TireType                 string                        `json:"tireType,omitempty"`
	BrakeType                string                        `json:"brakeType,omitempty"`
	TechSeries               string                        `json:"techSeries,omitempty"`
	VersionLevel             string                        `json:"versionLevel,omitempty"`
	Weight                   float64                       `json:"weight"`
	Length                   float64                       `json:"length"`
	Angle                    float64                       `json:"angle"`
	Clamp                    string                        `json:"clamp,omitempty"`
	Offset                   float64                       `json:"offset"`
	AxleCrown                float64                       `json:"axleCrown"`
	Steerer                  string                        `json:"steerer,omitempty"`
	Image                    string                        `json:"image,omitempty"`
	Restrictions             []string                      `json:"restrictions"`
	MoldGroup                string                        `json:"moldGroup,omitempty"`
	Description              string                        `json:"description,omitempty"`
	EngineeringSpecID        string                        `json:"engineeringSpecId,omitempty"`
	AttributeValues          []ProductAttributeValueApiDTO `json:"attributeValues"`
	TechSpecs                json.RawMessage               `json:"techSpecs,omitempty"`
	BarcodeConfig            json.RawMessage               `json:"barcodeConfig,omitempty"`
	Attachments              json.RawMessage               `json:"attachments,omitempty"`
	Status                   string                        `json:"status"`
	TemplateKey              string                        `json:"templateKey,omitempty"`
	ResolvedTemplateID       string                        `json:"resolvedTemplateId,omitempty"`
	ResolvedTemplateKey      string                        `json:"resolvedTemplateKey,omitempty"`
	TemplateResolutionSource string                        `json:"templateResolutionSource,omitempty"`
	TemplateResolutionError  string                        `json:"templateResolutionError,omitempty"`
	RevisionNo               string                        `json:"revisionNo,omitempty"`
	EffectiveFrom            any                           `json:"effectiveFrom,omitempty"`
	EffectiveTo              any                           `json:"effectiveTo,omitempty"`
	ChangeType               string                        `json:"changeType,omitempty"`
	ChangeOrderNo            string                        `json:"changeOrderNo,omitempty"`
	SiteCode                 string                        `json:"siteCode,omitempty"`
	IsDefaultSite            bool                          `json:"isDefaultSite"`
	CreatedAt                any                           `json:"createdAt"`
	UpdatedAt                any                           `json:"updatedAt"`
	Version                  int                           `json:"_v"`
}

type ProductListPageApiDTO struct {
	Items    []ProductApiDTO `json:"items"`
	Total    int64           `json:"total"`
	Page     int             `json:"page"`
	PageSize int             `json:"pageSize"`
}
