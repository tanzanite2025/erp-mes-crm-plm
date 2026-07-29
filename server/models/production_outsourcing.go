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
	OrderNo             string                `gorm:"size:50;uniqueIndex;not null" json:"orderNo"`
	SourceType          string                `gorm:"size:30;index;not null" json:"sourceType"`
	SourceID            string                `gorm:"size:36;index" json:"sourceId"`
	SourceNo            string                `gorm:"size:100;index" json:"sourceNo"`
	CustomerID          string                `gorm:"size:36;index" json:"customerId"`
	CustomerName        string                `gorm:"size:255" json:"customerName"`
	PartnerID           string                `gorm:"size:36;index;not null" json:"partnerId"`
	PartnerNameSnapshot string                `gorm:"size:255" json:"partnerNameSnapshot"`
	Status              string                `gorm:"size:30;index;default:'DRAFT'" json:"status"`
	PlannedSendDate     *time.Time            `json:"plannedSendDate"`
	PlannedReturnDate   *time.Time            `json:"plannedReturnDate"`
	TotalQuantity       float64               `gorm:"default:0" json:"totalQuantity"`
	UOM                 string                `gorm:"size:20" json:"uom"`
	Notes               string                `gorm:"type:text" json:"notes"`
	Operator            string                `gorm:"size:100" json:"operator"`
	Version             int64                 `gorm:"default:1" json:"version"`
	Lines               []OutsourceOrderLine  `gorm:"foreignKey:OutsourceOrderID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"lines"`
	Transfers           []OutsourceTransfer   `gorm:"foreignKey:OutsourceOrderID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"transfers,omitempty"`
	Inspections         []OutsourceInspection `gorm:"foreignKey:OutsourceOrderID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"inspections,omitempty"`
	Partner             *OutsourcePartner     `gorm:"foreignKey:PartnerID" json:"partner,omitempty"`
}

func (OutsourceOrder) TableName() string {
	return "production_outsource_orders"
}

// OutsourceOrderLine records the product/process quantity that is outsourced.
//
// Barcode-level transfers and inspections remain append-only facts in their own
// tables. The cumulative fields here are a read-optimized execution summary.
type OutsourceOrderLine struct {
	BaseModel
	OutsourceOrderID string                `gorm:"size:36;index;not null" json:"outsourceOrderId"`
	LineNo           int                   `gorm:"not null" json:"lineNo"`
	SourceLineID     string                `gorm:"size:50;index" json:"sourceLineId"`
	ProductID        string                `gorm:"size:36;index" json:"productId"`
	ProductCode      string                `gorm:"size:100" json:"productCode"`
	ProductName      string                `gorm:"size:255" json:"productName"`
	Specification    string                `gorm:"type:text" json:"specification"`
	Quantity         float64               `gorm:"not null" json:"quantity"`
	UOM              string                `gorm:"size:20" json:"uom"`
	SegmentID        string                `gorm:"size:36;index" json:"segmentId"`
	SegmentName      string                `gorm:"size:100" json:"segmentName"`
	ProcessStepID    string                `gorm:"size:36;index" json:"processStepId"`
	ProcessCode      string                `gorm:"size:50" json:"processCode"`
	ProcessName      string                `gorm:"size:100" json:"processName"`
	Status           string                `gorm:"size:30;index;default:'DRAFT'" json:"status"`
	SentQuantity     float64               `gorm:"default:0" json:"sentQuantity"`
	ReturnedQuantity float64               `gorm:"default:0" json:"returnedQuantity"`
	AcceptedQuantity float64               `gorm:"default:0" json:"acceptedQuantity"`
	RejectedQuantity float64               `gorm:"default:0" json:"rejectedQuantity"`
	ReworkQuantity   float64               `gorm:"default:0" json:"reworkQuantity"`
	ScrapQuantity    float64               `gorm:"default:0" json:"scrapQuantity"`
	Notes            string                `gorm:"type:text" json:"notes"`
	Version          int64                 `gorm:"default:1" json:"version"`
	Transfers        []OutsourceTransfer   `gorm:"foreignKey:OutsourceOrderLineID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"transfers,omitempty"`
	Inspections      []OutsourceInspection `gorm:"foreignKey:OutsourceOrderLineID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT" json:"inspections,omitempty"`
}

func (OutsourceOrderLine) TableName() string {
	return "production_outsource_order_lines"
}

// OutsourceTransfer is an append-only send/return fact for one outsourced line.
//
// The order line stores cumulative quantities for fast reads, but this table is
// the execution source of truth. Each transfer is anchored to a product barcode
// and also writes a ProductBarcodeTransferEvent in the production execution chain.
type OutsourceTransfer struct {
	BaseModel
	TransferNo           string              `gorm:"size:60;uniqueIndex;not null" json:"transferNo"`
	OutsourceOrderID     string              `gorm:"size:36;index;not null" json:"outsourceOrderId"`
	OutsourceOrderLineID string              `gorm:"size:36;index;not null;uniqueIndex:idx_outsource_transfer_line_type_barcode" json:"outsourceOrderLineId"`
	TransferType         string              `gorm:"size:20;index;not null;uniqueIndex:idx_outsource_transfer_line_type_barcode" json:"transferType"`
	ProductBarcode       string              `gorm:"size:120;index;not null;uniqueIndex:idx_outsource_transfer_line_type_barcode" json:"productBarcode"`
	Quantity             float64             `gorm:"not null" json:"quantity"`
	UOM                  string              `gorm:"size:20" json:"uom"`
	PartnerID            string              `gorm:"size:36;index" json:"partnerId"`
	RouteID              string              `gorm:"type:uuid;index" json:"routeId"`
	RouteStepID          string              `gorm:"type:uuid;index" json:"routeStepId"`
	ProcessStepID        string              `gorm:"type:uuid;index" json:"processStepId"`
	FromHolderType       string              `gorm:"size:40;index" json:"fromHolderType"`
	FromHolderID         string              `gorm:"type:uuid;index" json:"fromHolderId"`
	ToHolderType         string              `gorm:"size:40;index" json:"toHolderType"`
	ToHolderID           string              `gorm:"type:uuid;index" json:"toHolderId"`
	SourceCategory       string              `gorm:"size:50;index" json:"sourceCategory"`
	TargetCategory       string              `gorm:"size:50;index" json:"targetCategory"`
	BatchNo              string              `gorm:"size:100;index" json:"batchNo"`
	TransferEventID      string              `gorm:"type:uuid;index" json:"transferEventId"`
	OccurredAt           *time.Time          `gorm:"index" json:"occurredAt"`
	Operator             string              `gorm:"size:120" json:"operator"`
	Notes                string              `gorm:"type:text" json:"notes"`
	Order                *OutsourceOrder     `gorm:"foreignKey:OutsourceOrderID" json:"order,omitempty"`
	Line                 *OutsourceOrderLine `gorm:"foreignKey:OutsourceOrderLineID" json:"line,omitempty"`
}

func (OutsourceTransfer) TableName() string {
	return "production_outsource_transfers"
}

// OutsourceInspection is the quality decision fact after outsourced work returns.
//
// It does not replace InspectionTask. The optional InspectionTaskID keeps a
// bridge to the quality domain when a formal quality task exists, while the
// outsource lifecycle can still record the line-level disposition immediately.
type OutsourceInspection struct {
	BaseModel
	InspectionNo         string              `gorm:"size:60;uniqueIndex;not null" json:"inspectionNo"`
	OutsourceOrderID     string              `gorm:"size:36;index;not null" json:"outsourceOrderId"`
	OutsourceOrderLineID string              `gorm:"size:36;index;not null;uniqueIndex:idx_outsource_inspection_line_barcode" json:"outsourceOrderLineId"`
	ProductBarcode       string              `gorm:"size:120;index;not null;uniqueIndex:idx_outsource_inspection_line_barcode" json:"productBarcode"`
	InspectionTaskID     string              `gorm:"type:uuid;index" json:"inspectionTaskId"`
	Result               string              `gorm:"size:30;index;not null" json:"result"`
	Disposition          string              `gorm:"size:30;index;not null" json:"disposition"`
	InspectedQuantity    float64             `gorm:"not null" json:"inspectedQuantity"`
	AcceptedQuantity     float64             `gorm:"default:0" json:"acceptedQuantity"`
	RejectedQuantity     float64             `gorm:"default:0" json:"rejectedQuantity"`
	ReworkQuantity       float64             `gorm:"default:0" json:"reworkQuantity"`
	ScrapQuantity        float64             `gorm:"default:0" json:"scrapQuantity"`
	UOM                  string              `gorm:"size:20" json:"uom"`
	RouteID              string              `gorm:"type:uuid;index" json:"routeId"`
	RouteStepID          string              `gorm:"type:uuid;index" json:"routeStepId"`
	ProcessStepID        string              `gorm:"type:uuid;index" json:"processStepId"`
	OperationID          string              `gorm:"type:uuid;index" json:"operationId"`
	InspectedAt          *time.Time          `gorm:"index" json:"inspectedAt"`
	Inspector            string              `gorm:"size:120" json:"inspector"`
	Notes                string              `gorm:"type:text" json:"notes"`
	Order                *OutsourceOrder     `gorm:"foreignKey:OutsourceOrderID" json:"order,omitempty"`
	Line                 *OutsourceOrderLine `gorm:"foreignKey:OutsourceOrderLineID" json:"line,omitempty"`
}

func (OutsourceInspection) TableName() string {
	return "production_outsource_inspections"
}
