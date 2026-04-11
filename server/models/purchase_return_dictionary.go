package models

import "time"

type PurchaseReturnDictionary struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	DictType    string    `gorm:"size:50;not null;uniqueIndex:idx_purchase_return_dict_type_code" json:"dictType"`
	Code        string    `gorm:"size:50;not null;uniqueIndex:idx_purchase_return_dict_type_code" json:"code"`
	Name        string    `gorm:"size:100;not null" json:"name"`
	Description string    `gorm:"type:text" json:"description"`
	SortOrder   int       `gorm:"default:0" json:"sortOrder"`
	IsDefault   bool      `gorm:"default:false" json:"isDefault"`
	IsSystem    bool      `gorm:"default:false" json:"isSystem"`
	Status      string    `gorm:"size:20;default:'Active'" json:"status"`
	Version     int       `gorm:"default:1" json:"version"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

