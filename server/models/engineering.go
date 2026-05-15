package models

import (
	"gorm.io/datatypes"
)

// EngineeringSpec 宸ョ▼鎶€鏈鏍?宸ヨ壓鍙傛暟
// 閲囩敤 JSONB 瀛樺偍楂樺害宸紓鍖栫殑宸ヨ壓缁嗚妭 (Rim, Fork, Stem 绛?
type EngineeringSpec struct {
	BaseModel
	MasterDataControl
	Name         string         `gorm:"size:100;not null" json:"name"`
	Code         string         `gorm:"size:50;unique;not null" json:"code"`
	Type         string         `gorm:"size:50;index" json:"type"`
	Description  string         `json:"description"`
	Active       bool           `gorm:"default:true" json:"active"`
	SpecData     datatypes.JSON `json:"specData"`
	DrillingData datatypes.JSON `json:"drillingData"`
	CuttingData  datatypes.JSON `json:"cuttingData"`
	LabelingData datatypes.JSON `json:"labelingData"`
	Version      int            `gorm:"default:1" json:"version"`
}

// ProductEngineeringRelation 浜у搧涓庤鏍肩殑鍏宠仈妯″瀷 (鍙€夛紝濡傛灉涓嶅啀 Product 涓鍔犲瓧娈?
// 姝ゅ寤鸿鐩存帴鍦?Product 妯″瀷涓鍔?EngineeringSpecID
