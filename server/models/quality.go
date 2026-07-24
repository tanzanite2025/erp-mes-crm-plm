package models

import (
	"encoding/json"
	"time"
)

// --- 质量标准库 (Inspection Standards) ---

// InspectionStandard 检验标准/协议模型
type InspectionStandard struct {
	BaseModel
	Code        string          `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string          `gorm:"size:255;not null" json:"name"`
	ProductID   string          `gorm:"size:36;index" json:"productId"`
	ProductName string          `gorm:"size:255" json:"productName"`
	Type        string          `gorm:"size:50" json:"type"` // IQC, IPQC, FQC, OQC
	Version     float64         `gorm:"default:1.0" json:"version"`
	Status      string          `gorm:"size:20;default:'DRAFT'" json:"status"` // DRAFT, PUBLISHED, ARCHIVED
	Items       json.RawMessage `gorm:"type:jsonb" json:"items"`               // 具体检验项列表 (JSONB)
	Auditor     string          `gorm:"size:100" json:"auditor"`
	AuditTime   *time.Time      `json:"auditTime"`
	Operator    string          `gorm:"size:100" json:"operator"` // 最后修改人
	Description string          `gorm:"type:text" json:"description"`
}

// --- 检验执行流水 (Inspection Tasks) ---

// InspectionTask 检验任务记录
type InspectionTask struct {
	BaseModel
	StandardID       string              `gorm:"type:uuid;index" json:"standardId"`
	Standard         *InspectionStandard `gorm:"foreignKey:StandardID" json:"standard,omitempty"`
	ProductionPlanID string              `gorm:"type:uuid;index" json:"productionPlanId"`
	OrderID          string              `gorm:"type:uuid;index" json:"orderId"`
	BatchNo          string              `gorm:"size:50;index;not null" json:"batchNo"`
	ProductID        string              `gorm:"type:uuid;index" json:"productId"`
	ProductName      string              `gorm:"size:255" json:"productName"`
	SampleQty        float64             `gorm:"default:0" json:"sampleQty"`
	Result           string              `gorm:"size:20;default:'PENDING'" json:"result"` // PASS, FAIL, PENDING, CONDITIONAL
	Inspector        string              `gorm:"size:100" json:"inspector"`
	InputData        json.RawMessage     `gorm:"type:jsonb" json:"inputData"` // 实际测得数据 (JSONB)
	Remarks          string              `gorm:"type:text" json:"remarks"`
	CompletedAt      *time.Time          `json:"completedAt"`
}

// --- 质量异常管理 (Quality Abnormalities) ---

// QualityAbnormality 质量异常/不合格报告
type QualityAbnormality struct {
	BaseModel
	TaskID           string          `gorm:"type:uuid;index" json:"taskId"`
	InspectionTask   *InspectionTask `gorm:"foreignKey:TaskID" json:"inspectionTask,omitempty"`
	Severity         string          `gorm:"size:20" json:"severity"` // MINOR, MAJOR, CRITICAL
	Description      string          `gorm:"type:text;not null" json:"description"`
	Analysis         string          `gorm:"type:text" json:"analysis"`     // 原因分析
	DisposalMethod   string          `gorm:"size:50" json:"disposalMethod"` // SCRAP(报废), REWORK(重工), CONCESSION(让步接收)
	ScrapQuantity    *float64        `gorm:"type:numeric" json:"scrapQuantity,omitempty"`
	ScrapUnit        string          `gorm:"size:20" json:"scrapUnit,omitempty"`
	ProductionPlanID string          `gorm:"type:uuid;index" json:"productionPlanId,omitempty"`
	OrderID          string          `gorm:"type:uuid;index" json:"orderId,omitempty"`
	ProductID        string          `gorm:"type:uuid;index" json:"productId,omitempty"`
	BatchNo          string          `gorm:"size:50;index" json:"batchNo,omitempty"`
	OccurredAt       *time.Time      `gorm:"index" json:"occurredAt,omitempty"`
	Status           string          `gorm:"size:20;default:'OPEN'" json:"status"` // OPEN, CLOSED, REJECTED
	Deadline         *time.Time      `json:"deadline"`
	Reporter         string          `gorm:"size:100" json:"reporter"` // 报告人/第一发现人
	Resolver         string          `gorm:"size:100" json:"resolver"` // 解决人/处理人
}
