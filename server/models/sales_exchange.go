package models

import "time"

type SalesExchange struct {
	BaseModel
	ExchangeNo                string                   `gorm:"size:50;uniqueIndex;not null" json:"exchangeNo"`
	SalesOrderID              string                   `gorm:"type:uuid;index;not null" json:"salesOrderId"`
	SalesOrderNo              string                   `gorm:"size:50;index" json:"salesOrderNo"`
	CustomerID                string                   `gorm:"size:100;index" json:"customerId"`
	CustomerName              string                   `gorm:"size:255" json:"customerName"`
	Status                    string                   `gorm:"size:50;default:'Draft';index" json:"status"`
	ExchangeDate              time.Time                `json:"exchangeDate"`
	ExpectedReplacementDate   *time.Time               `json:"expectedReplacementDate"`
	ReceivedOldItemTrackingNo string                   `gorm:"size:100;index" json:"receivedOldItemTrackingNo"`
	ReplacementTrackingNo     string                   `gorm:"size:100;index" json:"replacementTrackingNo"`
	ExchangeReason            string                   `gorm:"type:text" json:"exchangeReason"`
	ExchangeRemarks           string                   `gorm:"type:text" json:"exchangeRemarks"`
	Operator                  string                   `gorm:"size:100" json:"operator"`
	TotalExchangeQuantity     float64                  `gorm:"default:0" json:"totalExchangeQuantity"`
	OldItemInboundConfirmedAt *time.Time               `json:"oldItemInboundConfirmedAt"`
	OldItemInboundConfirmedBy string                   `gorm:"size:100" json:"oldItemInboundConfirmedBy"`
	OldItemInboundTarget      string                   `gorm:"size:50" json:"oldItemInboundTarget"`
	OldItemInboundBatchNo     string                   `gorm:"size:100" json:"oldItemInboundBatchNo"`
	OldItemInboundRemarks     string                   `gorm:"type:text" json:"oldItemInboundRemarks"`
	Lines                     []SalesExchangeLine      `gorm:"foreignKey:SalesExchangeID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"lines"`
	LabelCodes                []SalesExchangeLabelCode `gorm:"foreignKey:SalesExchangeID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"labelCodes"`
}

func (SalesExchange) TableName() string {
	return "sales_exchanges"
}

type SalesExchangeLine struct {
	ID                      uint                     `gorm:"primaryKey" json:"id"`
	SalesExchangeID         string                   `gorm:"type:uuid;index" json:"-"`
	SalesOrderLineID        uint                     `gorm:"index;not null" json:"salesOrderLineId"`
	LineNo                  int                      `json:"lineNo"`
	ProductID               string                   `gorm:"type:uuid;index" json:"productId"`
	ProductCode             string                   `gorm:"size:100" json:"productCode"`
	ProductModel            string                   `gorm:"size:255" json:"productModel"`
	Specification           string                   `gorm:"type:text" json:"specification"`
	Description             string                   `gorm:"type:text" json:"description"`
	UOM                     string                   `gorm:"size:20" json:"uom"`
	OriginalOrderQuantity   float64                  `gorm:"default:0" json:"originalOrderQuantity"`
	DeliveredQuantity       float64                  `gorm:"default:0" json:"deliveredQuantity"`
	ExchangeQuantity        float64                  `gorm:"default:0" json:"exchangeQuantity"`
	ReplacementMode         string                   `gorm:"size:80" json:"replacementMode"`
	ReplacementProductCode  string                   `gorm:"size:100" json:"replacementProductCode"`
	ReplacementProductModel string                   `gorm:"size:255" json:"replacementProductModel"`
	IssueCategory           string                   `gorm:"size:100" json:"issueCategory"`
	IssueDescription        string                   `gorm:"type:text" json:"issueDescription"`
	LabelCodes              []SalesExchangeLabelCode `gorm:"foreignKey:SalesExchangeLineID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"labelCodes"`
}

func (SalesExchangeLine) TableName() string {
	return "sales_exchange_lines"
}

type SalesExchangeLabelCode struct {
	ID                  uint      `gorm:"primaryKey" json:"id"`
	SalesExchangeID     string    `gorm:"type:uuid;index;uniqueIndex:idx_sales_exchange_label_unique;not null" json:"salesExchangeId"`
	SalesExchangeLineID uint      `gorm:"index" json:"salesExchangeLineId"`
	SalesOrderLineID    uint      `gorm:"index" json:"salesOrderLineId"`
	RawLabelCode        string    `gorm:"size:255" json:"rawLabelCode"`
	NormalizedLabelCode string    `gorm:"size:255;index;uniqueIndex:idx_sales_exchange_label_unique" json:"normalizedLabelCode"`
	RecognitionSource   string    `gorm:"size:80" json:"recognitionSource"`
	RecognizedAt        time.Time `json:"recognizedAt"`
	Status              string    `gorm:"size:50;default:'Matched';index" json:"status"`
	UnmatchedReason     string    `gorm:"type:text" json:"unmatchedReason"`
}

func (SalesExchangeLabelCode) TableName() string {
	return "sales_exchange_label_codes"
}
