package models

// CuttingIssuanceExecution stores structured cutting issuance records generated from APS.
type CuttingIssuanceExecution struct {
	BaseModel
	ProductionPlanID  string                 `gorm:"type:uuid;index;not null;uniqueIndex" json:"productionPlanId"`
	ProductionPlan    *ProductionPlan        `gorm:"foreignKey:ProductionPlanID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"productionPlan,omitempty"`
	OrderNo           string                 `gorm:"size:50;index;not null" json:"orderNo"`
	OrderID           string                 `gorm:"type:uuid;index" json:"orderId"`
	SalesOrderLineNo  int                    `gorm:"not null;index" json:"salesOrderLineNo"`
	ProductModel      string                 `gorm:"size:120;index;not null" json:"productModel"`
	ProductCode       string                 `gorm:"size:120;index" json:"productCode"`
	HoleCount         int                    `gorm:"index" json:"holeCount"`
	TemplateID        string                 `gorm:"type:uuid;index" json:"templateId"`
	TemplateName      string                 `gorm:"size:255;not null" json:"templateName"`
	TemplateVersion   string                 `gorm:"size:40" json:"templateVersion"`
	Quantity          float64                `gorm:"not null" json:"quantity"`
	TotalLineQuantity float64                `gorm:"not null" json:"totalLineQuantity"`
	Status            string                 `gorm:"size:20;default:'SCHEDULED';index" json:"status"`
	Source            string                 `gorm:"size:40;default:'APS_CUTTING_ISSUANCE';index" json:"source"`
	Batches           []CuttingIssuanceBatch `gorm:"foreignKey:ExecutionID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"batches"`
}

// CuttingIssuanceBatch stores the greedy/manual split detail for one issuance.
type CuttingIssuanceBatch struct {
	BaseModel
	ExecutionID  string  `gorm:"type:uuid;not null;index;uniqueIndex:idx_cutting_issuance_batches_execution_batch" json:"executionId"`
	BatchNo      int     `gorm:"not null;uniqueIndex:idx_cutting_issuance_batches_execution_batch" json:"batchNo"`
	RimQuantity  float64 `gorm:"not null" json:"rimQuantity"`
	LineQuantity float64 `gorm:"not null" json:"lineQuantity"`
}
