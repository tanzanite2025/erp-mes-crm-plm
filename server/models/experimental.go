package models

import (
	"time"
)

// --- 实验设备与分类 (Experimental Assets) ---

// ExpCategory 实验设备分类 (树形结构)
type ExpCategory struct {
	BaseModel
	Name     string        `gorm:"size:100;not null" json:"name"`
	ParentID *string       `gorm:"type:uuid;index" json:"parentId"`
	Order    int           `gorm:"default:0" json:"order"`
	Children []ExpCategory `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

// ExpEquipment 实验设备明细
type ExpEquipment struct {
	BaseModel
	CategoryID string       `gorm:"type:uuid;index" json:"categoryId"`
	Category   *ExpCategory `gorm:"foreignKey:CategoryID" json:"category,omitempty"`
	Name       string       `gorm:"size:255;not null" json:"name"`
	Model      string       `gorm:"size:100" json:"model"`
	Status     string       `gorm:"size:20;default:'HEALTHY'" json:"status"` // HEALTHY, ALERT, CRITICAL
	CalibratedAt *time.Time `json:"calibratedAt"` // 上次校准日期
	CycleDays    int        `gorm:"default:365" json:"cycleDays"` // 校准周期 (天)
}

// --- 实验项目清单 (Experimental Tasks) ---

// ExpTask 实验任务/清单
type ExpTask struct {
	BaseModel
	Code        string     `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string     `gorm:"size:255;not null" json:"name"`
	Type        string     `gorm:"size:50" json:"type"` // PRESSURE, TEMPERATURE, DESTRUCTION
	SampleID    string     `gorm:"size:50" json:"sampleId"`
	Status      string     `gorm:"size:20;default:'PENDING'" json:"status"` // PENDING, TESTING, COMPLETED, ARCHIVED
	Executor    string     `gorm:"size:100" json:"executor"`
	ScheduledAt *time.Time `json:"scheduledAt"`
	ProjectID   string     `gorm:"type:uuid;index" json:"projectId"` // 关联的研发项目 (可选)
}

// --- 实验报告归档 (Experimental Reports) ---

// ExpReport 实验报告数据
type ExpReport struct {
	BaseModel
	TaskID      string   `gorm:"type:uuid;uniqueIndex" json:"taskId"`
	Task        *ExpTask `gorm:"foreignKey:TaskID" json:"task,omitempty"`
	Parameters  string   `gorm:"type:text" json:"parameters"` // 实验参数 (JSON String)
	Conclusion  string   `gorm:"type:text" json:"conclusion"` // 实验结论
	Result      string   `gorm:"size:20" json:"result"`       // PASS, FAIL
	ApprovedBy  string   `gorm:"size:100" json:"approvedBy"`
	Attachments string   `gorm:"type:text" json:"attachments"` // 附件 URL 列表 (JSON Array)
}
