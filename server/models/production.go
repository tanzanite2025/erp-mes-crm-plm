package models

import (
	"encoding/json"
	"time"
)

// --- 生产工艺配置相关的模型 ---

// ProcessStep 生产工序定义
type ProcessStep struct {
	BaseModel
	Code        string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string `gorm:"size:255;not null" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	SortOrder   int    `gorm:"default:0" json:"sortOrder"`
	IsActive    bool   `gorm:"default:true" json:"isActive"`
}

// ProductionLine 生产线模型
type ProductionLine struct {
	BaseModel
	Code        string        `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string        `gorm:"size:255;not null" json:"name"`
	Description string        `gorm:"type:text" json:"description"`
	Version     int64         `gorm:"default:1" json:"version"` // 乐观锁版本号
	IsActive    bool          `gorm:"default:true" json:"isActive"`
	Segments    []LineSegment `gorm:"foreignKey:LineID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"segments"`
}

// LineSegment 生产线工段
type LineSegment struct {
	BaseModel
	LineID        string          `gorm:"type:uuid;index;not null" json:"lineId"`
	Name          string          `gorm:"size:255;not null" json:"name"`
	Description   string          `gorm:"type:text" json:"description"`
	SortOrder     int             `gorm:"default:0" json:"sortOrder"`
	Attributes    json.RawMessage `gorm:"type:jsonb" json:"attributes"`
	JobCategories []JobCategory `gorm:"foreignKey:SegmentID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"jobCategories"`
}

// JobCategory 职能岗位类别
type JobCategory struct {
	BaseModel
	SegmentID   string          `gorm:"type:uuid;index;not null" json:"segmentId"`
	Name        string          `gorm:"size:255;not null" json:"name"`
	Description string          `gorm:"type:text" json:"description"`
	SortOrder   int             `gorm:"default:0" json:"sortOrder"`
	Attributes  json.RawMessage `gorm:"type:jsonb" json:"attributes"`
	Stations    []Station       `gorm:"foreignKey:CategoryID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"stations"`
}

// Station 生产站点/工位
type Station struct {
	BaseModel
	CategoryID  string          `gorm:"type:uuid;index;not null" json:"categoryId"`
	Code        string          `gorm:"size:50;index" json:"code"`
	Name        string          `gorm:"size:255;not null" json:"name"`
	Description string          `gorm:"type:text" json:"description"`
	SortOrder   int             `gorm:"default:0" json:"sortOrder"`
	Attributes  json.RawMessage `gorm:"type:jsonb" json:"attributes"`
	Processes   []ProcessStep   `gorm:"many2many:station_process_mappings;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"processes"`
}

// Organization 组织架构模型 (支持树形层级)
type Organization struct {
	BaseModel
	Name               string          `gorm:"size:100;not null" json:"name"`
	ParentID           *string         `gorm:"size:36" json:"parentId"`
	Manager            string          `gorm:"size:100" json:"manager"`
	Description        string          `gorm:"type:text" json:"description"`
	Type               string          `gorm:"size:50;default:'department'" json:"type"` // company, department, team
	LinkedArchitecture json.RawMessage `gorm:"type:jsonb" json:"linkedArchitecture"`     // 关联生产线/工段 (JSONB)
	Children           []*Organization `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

// Employee 员工档案模型
type Employee struct {
	BaseModel
	StaffID        string     `gorm:"size:50;uniqueIndex" json:"staffId"` // 业务工号
	Name           string     `gorm:"size:100;not null" json:"name"`
	Gender         string     `gorm:"size:10" json:"gender"`
	Birthday       *time.Time `json:"birthday"`
	IDCard         string     `gorm:"size:20" json:"idCard"`
	Phone          string     `gorm:"size:20" json:"phone"`
	EmergencyPhone string     `gorm:"size:20" json:"emergencyPhone"`
	Address        string     `gorm:"type:text" json:"address"`
	BankCard       string     `gorm:"size:50" json:"bankCard"`
	BankName       string     `gorm:"size:100" json:"bankName"`
	Education      string     `gorm:"size:50" json:"education"`
	Age            int        `json:"age"`
	Station        string     `gorm:"size:100" json:"station"`
	Status         string     `gorm:"size:20;default:'active'" json:"status"`
	JoinedDate     *time.Time `json:"joinedDate"`
	DeptID         string     `gorm:"size:36" json:"deptId"`
	LineID         string     `gorm:"size:36" json:"lineId"`
	ProcessID      string     `gorm:"size:36" json:"processId"`
	// 关联显示字段 (通过 JOIN 填充)
	DeptName    string `gorm:"->" json:"deptName"`
	LineName    string `gorm:"->" json:"lineName"`
	ProcessName string `gorm:"->" json:"processName"`
}

// Team 班组模型
type Team struct {
	BaseModel
	Code           string `gorm:"size:50;not null;unique" json:"code"`
	Name           string `gorm:"size:100;not null" json:"name"`
	ShortName      string `gorm:"size:50" json:"shortName"`
	Step           int    `gorm:"default:0" json:"step"`
	Section        string `gorm:"size:100" json:"section"`
	Process        string `gorm:"size:100" json:"process"`        // 归属工序
	ProcessCommand string `gorm:"size:100" json:"processCommand"` // 对应工序指令 (报工指令)
	Type           string `gorm:"size:50" json:"type"`            // dispatch, quality, transfer, receive
	IsMaintenance  bool   `gorm:"default:false" json:"isMaintenance"`
	Status         string `gorm:"size:20;default:'active'" json:"status"`
	Remarks        string `gorm:"type:text" json:"remarks"`
	Operator       string `gorm:"size:100" json:"operator"`
	OperateTime    string `gorm:"size:50" json:"operateTime"`
}
