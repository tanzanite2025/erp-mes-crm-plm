package models

import "time"

// OutsourcePartner is production-domain master data for external processors.
//
// A partner may reference a purchasing Supplier for shared contact identity, but
// production-specific partner facts stay here. Barcode execution state and
// route progress belong to the production execution chain, not this master
// record.
type OutsourcePartner struct {
	BaseModel
	Code                 string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name                 string `gorm:"size:255;not null" json:"name"`
	SupplierID           string `gorm:"size:36;index" json:"supplierId"`
	SupplierNameSnapshot string `gorm:"size:255" json:"supplierNameSnapshot"`
	ContactPerson        string `gorm:"size:100" json:"contactPerson"`
	ContactPhone         string `gorm:"size:50" json:"contactPhone"`
	Email                string `gorm:"size:100" json:"email"`
	Address              string `gorm:"type:text" json:"address"`
	QualityGrade         string `gorm:"size:20;index" json:"qualityGrade"`
	Status               string `gorm:"size:20;index;default:'ACTIVE'" json:"status"`
	LeadTimeDays         int    `gorm:"default:0" json:"leadTimeDays"`
	SettlementPolicy     string `gorm:"type:text" json:"settlementPolicy"`
	Notes                string `gorm:"type:text" json:"notes"`
	Operator             string `gorm:"size:100" json:"operator"`
	Version              int64  `gorm:"default:1" json:"version"`
}

func (OutsourcePartner) TableName() string {
	return "production_outsource_partners"
}

// OutsourceOrder is the production-domain execution order for work sent to an
// external processor.
//
// Sales orders and production plans are demand/planning sources only. The
// outsource order owns the execution responsibility: partner, quantities,
// process anchors, lifecycle status, and later send/return/inspection links.
type OutsourceOrder struct {
	BaseModel
	OrderNo             string               `gorm:"size:50;uniqueIndex;not null" json:"orderNo"`
	SourceType          string               `gorm:"size:30;index;not null" json:"sourceType"`
	SourceID            string               `gorm:"size:36;index" json:"sourceId"`
	SourceNo            string               `gorm:"size:100;index" json:"sourceNo"`
	CustomerID          string               `gorm:"size:36;index" json:"customerId"`
	CustomerName        string               `gorm:"size:255" json:"customerName"`
	PartnerID           string               `gorm:"size:36;index;not null" json:"partnerId"`
	PartnerNameSnapshot string               `gorm:"size:255" json:"partnerNameSnapshot"`
	Status              string               `gorm:"size:30;index;default:'DRAFT'" json:"status"`
	PlannedSendDate     *time.Time           `json:"plannedSendDate"`
	PlannedReturnDate   *time.Time           `json:"plannedReturnDate"`
	TotalQuantity       float64              `gorm:"default:0" json:"totalQuantity"`
	UOM                 string               `gorm:"size:20" json:"uom"`
	Notes               string               `gorm:"type:text" json:"notes"`
	Operator            string               `gorm:"size:100" json:"operator"`
	Version             int64                `gorm:"default:1" json:"version"`
	Lines               []OutsourceOrderLine `gorm:"foreignKey:OutsourceOrderID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"lines"`
	Partner             *OutsourcePartner    `gorm:"foreignKey:PartnerID" json:"partner,omitempty"`
}

func (OutsourceOrder) TableName() string {
	return "production_outsource_orders"
}

// OutsourceOrderLine records the product/process quantity that is outsourced.
//
// Barcode-level transfer and inspection are intentionally not embedded here;
// they will reference this stable line when those execution modules are wired.
type OutsourceOrderLine struct {
	BaseModel
	OutsourceOrderID string  `gorm:"size:36;index;not null" json:"outsourceOrderId"`
	LineNo           int     `gorm:"not null" json:"lineNo"`
	SourceLineID     string  `gorm:"size:50;index" json:"sourceLineId"`
	ProductID        string  `gorm:"size:36;index" json:"productId"`
	ProductCode      string  `gorm:"size:100" json:"productCode"`
	ProductName      string  `gorm:"size:255" json:"productName"`
	Specification    string  `gorm:"type:text" json:"specification"`
	Quantity         float64 `gorm:"not null" json:"quantity"`
	UOM              string  `gorm:"size:20" json:"uom"`
	SegmentID        string  `gorm:"size:36;index" json:"segmentId"`
	SegmentName      string  `gorm:"size:100" json:"segmentName"`
	ProcessStepID    string  `gorm:"size:36;index" json:"processStepId"`
	ProcessCode      string  `gorm:"size:50" json:"processCode"`
	ProcessName      string  `gorm:"size:100" json:"processName"`
	Status           string  `gorm:"size:30;index;default:'DRAFT'" json:"status"`
	Notes            string  `gorm:"type:text" json:"notes"`
	Version          int64   `gorm:"default:1" json:"version"`
}

func (OutsourceOrderLine) TableName() string {
	return "production_outsource_order_lines"
}
