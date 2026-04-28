package models

import "time"

type PrepregBindingToken struct {
	BaseModel
	Token       string               `gorm:"size:120;uniqueIndex;not null" json:"token"`
	BoundSpecID string               `gorm:"size:36;index" json:"specId"`
	BoundSpec   *PrepregMaterialSpec `gorm:"foreignKey:BoundSpecID" json:"-"`
	BoundAt     *time.Time           `json:"boundAt,omitempty"`
	ExpiresAt   *time.Time           `gorm:"index" json:"expiresAt,omitempty"`
}

func (PrepregBindingToken) TableName() string {
	return "prepreg_binding_tokens"
}
