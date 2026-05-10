package models

import (
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

// SalesOrder 销售订单主单
type SalesOrder struct {
	ID                   string           `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	OrderNo              string           `gorm:"size:50;uniqueIndex;not null" json:"orderNo"`
	OrderName            string           `gorm:"size:255" json:"orderName"`
	CustomerName         string           `gorm:"size:100" json:"customerName"`
	CustomerID           string           `gorm:"size:100" json:"customerId"`
	Type                 string           `gorm:"size:50" json:"type"`
	Currency             string           `gorm:"size:20" json:"currency"`
	ExchangeRateSnapshot float64          `gorm:"default:1.0" json:"exchangeRateSnapshot"`
	PaymentMethod        string           `gorm:"size:50" json:"paymentMethod"`
	PaymentMethodName    string           `gorm:"size:100" json:"paymentMethodName"`
	PaymentTerm          string           `gorm:"size:50" json:"paymentTerm"`
	PaymentTermName      string           `gorm:"size:100" json:"paymentTermName"`
	Classification       string           `gorm:"size:50" json:"classification"`
	Status               string           `gorm:"size:50;default:'Draft'" json:"status"`
	StatusNote           string           `json:"statusNote"`
	Amount               float64          `json:"amount"`
	Quantity             float64          `json:"quantity"`
	OrderDate            string           `gorm:"index:idx_so_deleted_date" json:"orderDate"`
	DeliveryDate         string           `json:"deliveryDate"`
	PurchaseOrderNo      string           `gorm:"size:100" json:"purchaseOrderNo"`
	Barcode              string           `gorm:"size:100" json:"barcode"`
	Requirements         string           `gorm:"type:text" json:"requirements"`
	Evidences            json.RawMessage  `gorm:"type:jsonb;not null;default:'[]'" json:"evidences"`
	Lines                []SalesOrderLine `gorm:"foreignKey:SalesOrderID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"lines"`
	CreatedAt            time.Time        `json:"createdAt"`
	UpdatedAt            time.Time        `json:"updatedAt"`
	DeletedAt            gorm.DeletedAt   `gorm:"index" json:"-"`
	UpdatedBy            string           `json:"updatedBy"`
	IsDeleted            bool             `gorm:"-" json:"isDeleted"`
	Version              int              `gorm:"default:1" json:"version"` // 对应前端 BaseEntity.version
}

// SalesOrderLine 销售订单明细行
type SalesOrderLine struct {
	ID                                    uint            `gorm:"primaryKey" json:"id"`
	SalesOrderID                          string          `gorm:"type:uuid;index" json:"-"`
	LineNo                                int             `json:"lineNo"`
	ProductID                             string          `json:"productId"`
	ProductModel                          string          `json:"productModel"`
	ProductCode                           string          `json:"productCode"`
	Specification                         string          `json:"specification"`
	ProductDisplayTitleSnapshot           string          `gorm:"size:255" json:"productDisplayTitleSnapshot"`
	ProductDisplaySubtitleSnapshot        string          `gorm:"size:255" json:"productDisplaySubtitleSnapshot"`
	ProductDisplayCodeSnapshot            string          `gorm:"size:100" json:"productDisplayCodeSnapshot"`
	ProductDisplayFullLabelSnapshot       string          `gorm:"type:text" json:"productDisplayFullLabelSnapshot"`
	ProductDisplayStrategyVersionSnapshot string          `gorm:"size:50" json:"productDisplayStrategyVersionSnapshot"`
	ModelCodeSnapshot                     string          `gorm:"size:20" json:"modelCodeSnapshot"`
	HolePrefixSnapshot                    string          `gorm:"size:20" json:"holePrefixSnapshot"`
	AppearanceID                          string          `gorm:"size:100" json:"appearanceId"`
	AppearanceNameSnapshot                string          `gorm:"size:100" json:"appearanceNameSnapshot"`
	AppearanceBarcodeCodeSnapshot         string          `gorm:"size:20" json:"appearanceBarcodeCodeSnapshot"`
	AppearanceDescriptionSnapshot         string          `gorm:"type:text" json:"appearanceDescriptionSnapshot"`
	AppearanceImageURLSnapshot            string          `gorm:"type:text" json:"appearanceImageUrlSnapshot"`
	Description                           string          `json:"description"`
	Qty                                   float64         `json:"qty"`
	UOM                                   string          `json:"uom"`
	Price                                 float64         `json:"price"`
	Amount                                float64         `json:"amount"`
	DeliveredQty                          float64         `json:"deliveredQty"`
	CustomerPartNo                        string          `json:"customerPartNo"`
	JobNo                                 string          `json:"jobNo"`
	Note                                  string          `json:"note"`
	DrillingPlanID                        string          `json:"drillingPlanId"`
	LabelingPlanID                        string          `json:"labelingPlanId"`
	HoleCount                             int             `json:"holeCount"`
	Route                                 string          `json:"route"`
	OrderDate                             string          `json:"orderDate"`
	Status                                string          `json:"status"`
	ClaimedBy                             string          `json:"claimedBy"`
	ClaimedAt                             string          `json:"claimedAt"`
	SelectedPackaging                     json.RawMessage `gorm:"type:jsonb" json:"selectedPackaging"`
}

// SalesReturn 销售退货单
type SalesReturn struct {
	BaseModel
	ReturnNo                     string            `gorm:"size:50;uniqueIndex;not null" json:"returnNo"`
	SalesOrderID                 string            `gorm:"type:uuid;index;not null" json:"salesOrderId"`
	SalesOrderNo                 string            `gorm:"size:50;index" json:"salesOrderNo"`
	CustomerID                   string            `gorm:"size:100;index" json:"customerId"`
	CustomerName                 string            `gorm:"size:255" json:"customerName"`
	Status                       string            `gorm:"size:50;default:'Created'" json:"status"`
	TrackingNo                   string            `gorm:"size:100;index" json:"trackingNo"`
	Carrier                      string            `gorm:"size:100" json:"carrier"`
	ShippedAt                    *time.Time        `json:"shippedAt"`
	TrackingFilledAt             *time.Time        `json:"trackingFilledAt"`
	TrackingFilledBy             string            `gorm:"size:100" json:"trackingFilledBy"`
	LogisticsNote                string            `gorm:"type:text" json:"logisticsNote"`
	ReturnDate                   time.Time         `json:"returnDate"`
	IssueCategory                string            `gorm:"size:100" json:"issueCategory"`
	Reason                       string            `gorm:"type:text" json:"reason"`
	Remarks                      string            `gorm:"type:text" json:"remarks"`
	ActualReturnAmount           float64           `gorm:"default:0" json:"actualReturnAmount"`
	ActualReturnAmountNote       string            `gorm:"type:text" json:"actualReturnAmountNote"`
	ActualReturnAmountEvidences  json.RawMessage   `gorm:"type:jsonb;not null;default:'[]'" json:"actualReturnAmountEvidences"`
	ActualReturnAmountRecordedAt *time.Time        `json:"actualReturnAmountRecordedAt"`
	ActualReturnAmountRecordedBy string            `gorm:"size:100" json:"actualReturnAmountRecordedBy"`
	Evidences                    json.RawMessage   `gorm:"type:jsonb;not null;default:'[]'" json:"evidences"`
	Operator                     string            `gorm:"size:100" json:"operator"`
	TotalQuantity                float64           `gorm:"default:0" json:"totalQuantity"`
	TotalAmount                  float64           `gorm:"default:0" json:"totalAmount"`
	Lines                        []SalesReturnLine `gorm:"foreignKey:SalesReturnID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"lines"`
}

func (SalesReturn) TableName() string {
	return "sales_returns"
}

// SalesReturnLine 销售退货明细
type SalesReturnLine struct {
	ID                                    uint            `gorm:"primaryKey" json:"id"`
	SalesReturnID                         string          `gorm:"type:uuid;index" json:"-"`
	SalesOrderLineID                      uint            `gorm:"index;not null" json:"salesOrderLineId"`
	LineNo                                int             `json:"lineNo"`
	ProductID                             string          `gorm:"type:uuid;index" json:"productId"`
	ProductCode                           string          `gorm:"size:100" json:"productCode"`
	ProductModel                          string          `gorm:"size:255" json:"productModel"`
	Specification                         string          `gorm:"type:text" json:"specification"`
	ProductDisplayTitleSnapshot           string          `gorm:"size:255" json:"productDisplayTitleSnapshot"`
	ProductDisplaySubtitleSnapshot        string          `gorm:"size:255" json:"productDisplaySubtitleSnapshot"`
	ProductDisplayCodeSnapshot            string          `gorm:"size:100" json:"productDisplayCodeSnapshot"`
	ProductDisplayFullLabelSnapshot       string          `gorm:"type:text" json:"productDisplayFullLabelSnapshot"`
	ProductDisplayStrategyVersionSnapshot string          `gorm:"size:50" json:"productDisplayStrategyVersionSnapshot"`
	Description                           string          `gorm:"type:text" json:"description"`
	UOM                                   string          `gorm:"size:20" json:"uom"`
	Quantity                              float64         `gorm:"default:0" json:"quantity"`
	Price                                 float64         `gorm:"default:0" json:"price"`
	Amount                                float64         `gorm:"default:0" json:"amount"`
	IssueCategory                         string          `gorm:"size:100" json:"issueCategory"`
	Reason                                string          `gorm:"type:text" json:"reason"`
	Evidences                             json.RawMessage `gorm:"type:jsonb;not null;default:'[]'" json:"evidences"`
}

// Customer 客户模型
type Customer struct {
	ID            string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name          string         `gorm:"size:255;index:idx_cust_deleted_name;not null" json:"name"`
	Code          string         `gorm:"size:100;uniqueIndex;not null" json:"code"`
	ContactPerson string         `gorm:"size:100" json:"contactPerson"`
	ContactPhone  string         `gorm:"size:50" json:"contactPhone"`
	WeChat        string         `gorm:"size:100" json:"wechat"`
	WhatsApp      string         `gorm:"size:100" json:"whatsapp"`
	Facebook      string         `gorm:"size:255" json:"facebook"`
	Instagram     string         `gorm:"size:100" json:"instagram"`
	Telegram      string         `gorm:"size:100" json:"telegram"`
	Email         string         `gorm:"size:100" json:"email"`
	Address       string         `gorm:"type:text" json:"address"`
	Status        string         `gorm:"size:20;default:'Active'" json:"status"`
	CreditLimit   float64        `json:"creditLimit"`
	Balance       float64        `json:"balance"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
	IsDeleted     bool           `gorm:"-" json:"isDeleted"`
	Version       int            `gorm:"default:1" json:"version"`
}

// Supplier 供应商模型
type Supplier struct {
	ID            string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name          string         `gorm:"size:255;index:idx_supp_deleted_name;not null" json:"name"`
	Code          string         `gorm:"size:100;uniqueIndex;not null" json:"code"`
	Category      string         `gorm:"size:100" json:"category"`
	MainProducts  string         `gorm:"type:jsonb" json:"mainProducts"` // 存储产品列表 JSON
	ContactPerson string         `gorm:"size:100" json:"contactPerson"`
	ContactPhone  string         `gorm:"size:50" json:"contactPhone"`
	WeChat        string         `gorm:"size:100" json:"wechat"`
	WhatsApp      string         `gorm:"size:100" json:"whatsapp"`
	Facebook      string         `gorm:"size:255" json:"facebook"`
	Instagram     string         `gorm:"size:100" json:"instagram"`
	Telegram      string         `gorm:"size:100" json:"telegram"`
	Email         string         `gorm:"size:100" json:"email"`
	Address       string         `gorm:"type:text" json:"address"`
	Status        string         `gorm:"size:20;default:'Active'" json:"status"`
	Rating        float64        `json:"rating"`
	CreatedAt     time.Time      `json:"createdAt"`
	UpdatedAt     time.Time      `json:"updatedAt"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
	IsDeleted     bool           `gorm:"-" json:"isDeleted"`
	Version       int            `gorm:"default:1" json:"version"`
}

// PurchaseOrder 采购订单主单
type PurchaseOrder struct {
	ID                string              `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	OrderNo           string              `gorm:"size:50;uniqueIndex;not null" json:"orderNo"`
	SupplierID        string              `gorm:"size:100" json:"supplierId"`
	SupplierName      string              `gorm:"size:255" json:"supplierName"`
	OrderDate         string              `json:"orderDate"`
	ExpectedDate      string              `json:"expectedDate"`
	Status            string              `gorm:"size:50;default:'Draft'" json:"status"`
	Currency          string              `gorm:"size:20" json:"currency"`
	Amount            float64             `json:"amount"`
	ExchangeRate      float64             `gorm:"default:1.0" json:"exchangeRate"`
	Purchaser         string              `gorm:"size:100" json:"purchaser"`
	PaymentMethod     string              `gorm:"size:50" json:"paymentMethod"`
	PaymentMethodName string              `gorm:"size:100" json:"paymentMethodName"`
	PaymentTerm       string              `gorm:"size:50" json:"paymentTerm"`
	PaymentTermName   string              `gorm:"size:100" json:"paymentTermName"`
	Note              string              `gorm:"type:text" json:"note"`
	Evidences         json.RawMessage     `gorm:"type:jsonb;not null;default:'[]'" json:"evidences"`
	Lines             []PurchaseOrderLine `gorm:"foreignKey:PurchaseOrderID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"lines"`
	CreatedAt         time.Time           `json:"createdAt"`
	UpdatedAt         time.Time           `json:"updatedAt"`
	DeletedAt         gorm.DeletedAt      `gorm:"index" json:"-"`
	IsDeleted         bool                `gorm:"-" json:"isDeleted"`
	Version           int                 `gorm:"default:1" json:"version"`
}

func (order *SalesOrder) AfterFind(*gorm.DB) error {
	order.IsDeleted = order.DeletedAt.Valid
	return nil
}

func (customer *Customer) AfterFind(*gorm.DB) error {
	customer.IsDeleted = customer.DeletedAt.Valid
	return nil
}

func (supplier *Supplier) AfterFind(*gorm.DB) error {
	supplier.IsDeleted = supplier.DeletedAt.Valid
	return nil
}

func (order *PurchaseOrder) AfterFind(*gorm.DB) error {
	order.IsDeleted = order.DeletedAt.Valid
	return nil
}

// PurchaseOrderLine 采购订单明细
type PurchaseOrderLine struct {
	ID              uint    `gorm:"primaryKey" json:"id"`
	PurchaseOrderID string  `gorm:"type:uuid;index" json:"-"`
	Version         int     `gorm:"default:1" json:"version"`
	LineNo          int     `json:"lineNo"`
	MaterialID      string  `json:"materialId"`
	MaterialCode    string  `json:"materialCode"`
	MaterialName    string  `json:"materialName"`
	Specification   string  `json:"specification"`
	Qty             float64 `json:"qty"`
	UOM             string  `json:"uom"`
	Price           float64 `json:"price"`
	Amount          float64 `json:"amount"`
	ReceivedQty     float64 `json:"receivedQty"`
	ReturnedQty     float64 `gorm:"default:0" json:"returnedQty"`
	Status          string  `json:"status"`
}

// PurchaseReturn 鏈叆搴撹喘璁㈠埌璐ч€€璐ц褰?
type PurchaseReturn struct {
	BaseModel
	ReturnNo        string               `gorm:"size:50;uniqueIndex;not null" json:"returnNo"`
	PurchaseOrderID string               `gorm:"type:uuid;index;not null" json:"purchaseOrderId"`
	PurchaseOrderNo string               `gorm:"size:50;index" json:"purchaseOrderNo"`
	SupplierID      string               `gorm:"size:100" json:"supplierId"`
	SupplierName    string               `gorm:"size:255" json:"supplierName"`
	Status          string               `gorm:"size:50;default:'Completed'" json:"status"`
	ReturnDate      time.Time            `json:"returnDate"`
	IssueCategory   string               `gorm:"size:100" json:"issueCategory"`
	Reason          string               `gorm:"type:text" json:"reason"`
	Remarks         string               `gorm:"type:text" json:"remarks"`
	Evidences       json.RawMessage      `gorm:"type:jsonb;not null;default:'[]'" json:"evidences"`
	Operator        string               `gorm:"size:100" json:"operator"`
	TotalQuantity   float64              `gorm:"default:0" json:"totalQuantity"`
	TotalAmount     float64              `gorm:"default:0" json:"totalAmount"`
	Lines           []PurchaseReturnLine `gorm:"foreignKey:PurchaseReturnID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"lines"`
}

func (PurchaseReturn) TableName() string {
	return "purchase_returns"
}

// PurchaseReturnLine 閲囪喘閫€璐ф槑缁?
type PurchaseReturnLine struct {
	ID                  uint            `gorm:"primaryKey" json:"id"`
	PurchaseReturnID    string          `gorm:"type:uuid;index" json:"-"`
	PurchaseOrderLineID uint            `gorm:"index;not null" json:"purchaseOrderLineId"`
	LineNo              int             `json:"lineNo"`
	MaterialID          string          `gorm:"type:uuid;index" json:"materialId"`
	MaterialCode        string          `gorm:"size:100" json:"materialCode"`
	MaterialName        string          `gorm:"size:255" json:"materialName"`
	Specification       string          `gorm:"type:text" json:"specification"`
	UOM                 string          `gorm:"size:20" json:"uom"`
	Quantity            float64         `gorm:"default:0" json:"quantity"`
	Price               float64         `gorm:"default:0" json:"price"`
	Amount              float64         `gorm:"default:0" json:"amount"`
	IssueCategory       string          `gorm:"size:100" json:"issueCategory"`
	Reason              string          `gorm:"type:text" json:"reason"`
	Evidences           json.RawMessage `gorm:"type:jsonb;not null;default:'[]'" json:"evidences"`
}
