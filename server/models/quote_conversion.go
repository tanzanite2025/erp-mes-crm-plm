package models

import "time"

type QuoteConversion struct {
	ID           string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	QuoteID      string    `gorm:"type:uuid;uniqueIndex;not null" json:"quoteId"`
	SalesOrderID string    `gorm:"type:uuid;uniqueIndex;not null" json:"salesOrderId"`
	ConvertedAt  time.Time `gorm:"not null" json:"convertedAt"`
	ConvertedBy  string    `gorm:"size:100" json:"convertedBy"`
}

func (QuoteConversion) TableName() string {
	return "quote_conversions"
}
