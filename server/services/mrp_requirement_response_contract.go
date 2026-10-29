package services

type MrpRequirementSourceOrder struct {
	OrderNo          string   `json:"orderNo"`
	CustomerName     string   `json:"customerName"`
	Qty              float64  `json:"qty"` // Covered finished quantity, counted once per source line.
	ProductName      string   `json:"productName"`
	LineNo           int      `json:"lineNo"`
	TotalLines       int      `json:"totalLines"`
	SalesOrderID     string   `json:"salesOrderId"`
	SalesOrderLineID uint     `json:"salesOrderLineId"`
	OrderVersion     int      `json:"orderVersion"`
	BOMID            string   `json:"bomId"`
	BOMVersion       int      `json:"bomVersion"`
	RevisionNo       string   `json:"revisionNo"`
	VersionLevel     string   `json:"versionLevel"`
	BOMItemIDs       []string `json:"bomItemIds"`
	StandardUsage    float64  `json:"standardUsage"`
	RequiredQty      float64  `json:"requiredQty"`
}

type MrpRequirementPackaging struct {
	PackUnit  string  `json:"packUnit"`
	Factor    float64 `json:"factor"`
	PackQty   int     `json:"packQty"`
	Direction string  `json:"direction,omitempty"`
}

type MrpRequirementItem struct {
	MaterialID        string                      `json:"materialId"`
	MaterialCode      string                      `json:"materialCode"`
	MaterialName      string                      `json:"materialName"`
	MaterialSpec      string                      `json:"materialSpec"`
	Section           string                      `json:"section"`
	TotalRequired     float64                     `json:"totalRequired"`
	InventoryQty      float64                     `json:"inventoryQty"`
	LockedQty         float64                     `json:"lockedQty"`
	OnWayPurchaseQty  float64                     `json:"onWayPurchaseQty"`
	WipQty            float64                     `json:"wipQty"`
	UsableStock       float64                     `json:"usableStock"`
	AllocatedStockQty float64                     `json:"allocatedStockQty"`
	TotalSupply       float64                     `json:"totalSupply"`
	EffectiveGap      float64                     `json:"effectiveGap"`
	ShortageGap       float64                     `json:"shortageGap"`
	Unit              string                      `json:"unit"`
	SourceOrders      []MrpRequirementSourceOrder `json:"sourceOrders"`
	HasBOM            bool                        `json:"hasBOM"`
	Packaging         *MrpRequirementPackaging    `json:"packaging,omitempty"`
}

type MrpAnalyzedModel struct {
	ModelName string  `json:"modelName"`
	TotalQty  float64 `json:"totalQty"`
}

type MrpRequirementStats struct {
	TotalMaterials   int                `json:"totalMaterials"`
	MissingBOMCount  int                `json:"missingBOMCount"`
	ActiveOrderCount int                `json:"activeOrderCount"`
	AnalyzedModels   []MrpAnalyzedModel `json:"analyzedModels"`
}

type MrpRequirementsResponse struct {
	Requirements          []MrpRequirementItem                      `json:"requirements"`
	Stats                 MrpRequirementStats                       `json:"stats"`
	SourceLines           []ProductionMaterialRequirementSourceLine `json:"sourceLines"`
	IsComplete            bool                                      `json:"isComplete"`
	WarehouseCategoryCode string                                    `json:"warehouseCategoryCode"`
}

type GetMrpRequirementsParams struct {
	SelectedKeys  []string
	BOMSelections []ProductionMaterialRequirementBOMSelection
}
