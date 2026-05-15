package models

import (
	"time"
)

// PrintBatch 打印批次记录模型
type PrintBatch struct {
	BaseModel
	BatchNo        string   `gorm:"size:100;uniqueIndex;not null" json:"batchNo"`
	TemplateName   string   `gorm:"size:255;not null" json:"templateName"`
	ProductID      string   `gorm:"type:uuid;index" json:"productId"` // 关联产品 ID (物理外键)
	Product        *Product `gorm:"foreignKey:ProductID" json:"product,omitempty"`
	BOMID          string   `gorm:"type:uuid;index" json:"bomId"`     // 关联 BOM ID (可选)
	BOM            *BOM     `gorm:"foreignKey:BOMID" json:"bom,omitempty"`
	StartSN        string   `gorm:"size:10" json:"startSn"`     // 批量打印时的起始流水号
	FullCode       string   `gorm:"size:255" json:"fullCode"`   // 单枚打印时的完整条码快照
	Quantity       int      `gorm:"not null" json:"quantity"`
	ActivatedCount int      `gorm:"default:0" json:"activatedCount"`
	Status         string   `gorm:"size:50;default:'Printed'" json:"status"` // 'Printed', 'PartiallyActivated', 'Activated', 'Scrapped'
	Version        int      `gorm:"default:1" json:"version"`                  // 乐观锁版本号
}

// Sequence 序列号发号器模型 (用于支持高并发下的唯一流水号生成)
type Sequence struct {
	Key       string    `gorm:"primaryKey;size:100" json:"key"` // 键：如 "product:UUID:dm_sn"
	Value     int64     `gorm:"default:0" json:"value"`         // 当前累加值
	UpdatedAt time.Time `json:"updatedAt"`
}

// NumberingRule 自动编号规则模型
type NumberingRule struct {
	BaseModel
	RuleKey     string `gorm:"size:100;uniqueIndex;not null" json:"ruleKey"` // 如: CONTRACT_ZP6A_GS
	Prefix      string `gorm:"size:20" json:"prefix"`
	Pattern     string `gorm:"size:50" json:"pattern"`     // e.g. "{PREFIX}{YYMM}{SEQ}"
	CurrentSeq  int64  `gorm:"default:0" json:"currentSeq"`
	Padding     int    `gorm:"default:4" json:"padding"`
	ResetPeriod string `gorm:"size:20" json:"resetPeriod"` // MONTHLY, YEARLY, NEVER
	LastReset   string `gorm:"size:20" json:"lastReset"`   // 记录上一次重置标识 (如: 2403)
}

