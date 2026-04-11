package models

import "time"

type Currency struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Code      string    `gorm:"size:20;uniqueIndex;not null" json:"code"`
	Name      string    `gorm:"size:100;not null" json:"name"`
	Symbol    string    `gorm:"size:10" json:"symbol"`
	Rate      float64   `gorm:"default:1.0" json:"rate"`
	Precision int       `gorm:"default:2" json:"precision"`
	IsBase    bool      `gorm:"default:false" json:"isBase"`
	Status    string    `gorm:"size:20;default:'Active'" json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type PaymentTerm struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Code        string    `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	Installment string    `gorm:"type:jsonb" json:"installments"`
	IsDefault   bool      `gorm:"default:false" json:"isDefault"`
	SortOrder   int       `gorm:"default:0" json:"sortOrder"`
	IsSystem    bool      `gorm:"default:false" json:"isSystem"`
	Status      string    `gorm:"size:20;default:'Active'" json:"status"`
	Version     int       `gorm:"default:1" json:"version"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type PaymentMethod struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Code        string    `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	IsDefault   bool      `gorm:"default:false" json:"isDefault"`
	SortOrder   int       `gorm:"default:0" json:"sortOrder"`
	IsSystem    bool      `gorm:"default:false" json:"isSystem"`
	Status      string    `gorm:"size:20;default:'Active'" json:"status"`
	Version     int       `gorm:"default:1" json:"version"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type TaxRate struct {
	BaseModel
	Code        string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string `gorm:"size:100;not null" json:"name"`
	Rate        int    `gorm:"not null" json:"rate"`
	Status      string `gorm:"size:20;default:'Active'" json:"status"`
	Description string `gorm:"type:text" json:"description,omitempty"`
}
