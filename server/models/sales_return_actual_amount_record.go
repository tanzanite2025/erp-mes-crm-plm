package models

import (
	"encoding/json"
	"time"
)

type SalesReturnActualAmountRecord struct {
	BaseModel
	SalesReturnID                 string          `gorm:"type:uuid;index;not null" json:"salesReturnId"`
	SalesOrderID                  string          `gorm:"type:uuid;index;not null" json:"salesOrderId"`
	SalesOrderNo                  string          `gorm:"size:50;index" json:"salesOrderNo"`
	ReturnNo                      string          `gorm:"size:50;index" json:"returnNo"`
	CustomerID                    string          `gorm:"size:100;index" json:"customerId"`
	CustomerName                  string          `gorm:"size:255" json:"customerName"`
	Amount                        float64         `gorm:"default:0" json:"amount"`
	Note                          string          `gorm:"type:text" json:"note"`
	Evidences                     json.RawMessage `gorm:"type:jsonb;not null;default:'[]'" json:"evidences"`
	EstimatedReturnAmountSnapshot float64         `gorm:"default:0" json:"estimatedReturnAmountSnapshot"`
	RecordedAt                    time.Time       `gorm:"index" json:"recordedAt"`
	RecordedBy                    string          `gorm:"size:100" json:"recordedBy"`
}

func (SalesReturnActualAmountRecord) TableName() string {
	return "sales_return_actual_amount_records"
}
