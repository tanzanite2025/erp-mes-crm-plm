package models

import (
	"time"
)

// StocktakeTask 盘点任务表
type StocktakeTask struct {
	BaseModel
	Title                 string    `gorm:"size:255;not null" json:"title"`
	WarehouseCategoryCode string    `gorm:"size:50;index;not null" json:"warehouseCategoryCode"` // 盘点范围：指定仓库分类
	Status                string    `gorm:"size:50;default:'DRAFT'" json:"status"`               // DRAFT 待启动, IN_PROGRESS 盘点中, COMPLETED 已完成, ADJUSTED 已调账
	CreatedBy             string    `gorm:"size:100" json:"createdBy"`
	StartTime             *time.Time `json:"startTime"`
	EndTime               *time.Time `json:"endTime"`
	Remarks               string    `gorm:"type:text" json:"remarks"`

	// 关联
	Items []StocktakeItem `gorm:"foreignKey:TaskID" json:"items,omitempty"`
}

func (StocktakeTask) TableName() string {
	return "stocktake_tasks"
}

// StocktakeItem 盘点明细项 (物料+批次级)
type StocktakeItem struct {
	BaseModel
	TaskID       string  `gorm:"type:uuid;index;not null" json:"taskId"`
	MaterialID   string  `gorm:"type:uuid;index;not null" json:"materialId"`
	MaterialCode string  `gorm:"size:100" json:"materialCode"`
	MaterialName string  `gorm:"size:255" json:"materialName"`
	BatchNo      string  `gorm:"size:100;index" json:"batchNo"` // 批次号（针对 DM 码扫入）
	TheoryQty    float64 `gorm:"default:0" json:"theoryQty"`    // 系统账面数量 (Snapshot)
	ActualQty    float64 `gorm:"default:0" json:"actualQty"`    // 实际盘点数量 (PDA 扫入累计)
	UOM          string  `gorm:"size:20" json:"uom"`
	Difference   float64 `gorm:"-" json:"difference"`             // 计算字段：Actual - Theory
	ScannerID    string  `gorm:"size:100" json:"scannerId"`
	ScanTime     *time.Time `json:"scanTime"`
}

func (StocktakeItem) TableName() string {
	return "stocktake_items"
}
