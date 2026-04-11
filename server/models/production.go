package models

import (
	"encoding/json"
	"time"
)

// ProcessStep defines a standard production process.
type ProcessStep struct {
	BaseModel
	Code        string `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string `gorm:"size:255;not null" json:"name"`
	Description string `gorm:"type:text" json:"description"`
	SortOrder   int    `gorm:"default:0" json:"sortOrder"`
	IsActive    bool   `gorm:"default:true" json:"isActive"`
}

// ProductionLine defines a production line and its nested topology.
type ProductionLine struct {
	BaseModel
	Code        string        `gorm:"size:50;uniqueIndex;not null" json:"code"`
	Name        string        `gorm:"size:255;not null" json:"name"`
	Description string        `gorm:"type:text" json:"description"`
	Version     int64         `gorm:"default:1" json:"version"`
	IsActive    bool          `gorm:"default:true" json:"isActive"`
	Segments    []LineSegment `gorm:"foreignKey:LineID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"segments"`
}

// LineSegment defines a segment within a production line.
type LineSegment struct {
	BaseModel
	LineID        string          `gorm:"type:uuid;index;not null" json:"lineId"`
	Name          string          `gorm:"size:255;not null" json:"name"`
	Description   string          `gorm:"type:text" json:"description"`
	SortOrder     int             `gorm:"default:0" json:"sortOrder"`
	Attributes    json.RawMessage `gorm:"type:jsonb" json:"attributes"`
	JobCategories []JobCategory   `gorm:"foreignKey:SegmentID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"jobCategories"`
}

// JobCategory is now the terminal capability node in the production topology.
type JobCategory struct {
	BaseModel
	SegmentID   string          `gorm:"type:uuid;index;not null" json:"segmentId"`
	Name        string          `gorm:"size:255;not null" json:"name"`
	Description string          `gorm:"type:text" json:"description"`
	SortOrder   int             `gorm:"default:0" json:"sortOrder"`
	Attributes  json.RawMessage `gorm:"type:jsonb" json:"attributes"`
	Processes   []ProcessStep   `gorm:"many2many:job_category_process_mappings;constraint:OnUpdate:CASCADE,OnDelete:CASCADE" json:"processes"`
}

// Organization supports a tree-based org hierarchy.
type Organization struct {
	BaseModel
	Name               string          `gorm:"size:100;not null" json:"name"`
	ParentID           *string         `gorm:"size:36" json:"parentId"`
	Manager            string          `gorm:"size:100" json:"manager"`
	Description        string          `gorm:"type:text" json:"description"`
	Type               string          `gorm:"size:50;default:'department'" json:"type"`
	LinkedArchitecture json.RawMessage `gorm:"type:jsonb" json:"linkedArchitecture"`
	Children           []*Organization `gorm:"foreignKey:ParentID" json:"children,omitempty"`
}

// Employee stores personnel information.
type Employee struct {
	BaseModel
	StaffID        string     `gorm:"size:50;uniqueIndex" json:"staffId"`
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
	Status         string     `gorm:"size:20;default:'active'" json:"status"`
	JoinedDate     *time.Time `json:"joinedDate"`
	DeptID         string     `gorm:"size:36" json:"deptId"`
	LineID         string     `gorm:"size:36" json:"lineId"`
	ProcessID      string     `gorm:"size:36" json:"processId"`
	PositionID     string     `gorm:"->" json:"positionId"`
	DeptName       string     `gorm:"->" json:"deptName"`
	LineName       string     `gorm:"->" json:"lineName"`
	ProcessName    string     `gorm:"->" json:"processName"`
	PositionName   string     `gorm:"->" json:"positionName"`
}

// Team stores team definitions.
type Team struct {
	BaseModel
	Code           string `gorm:"size:50;not null;unique" json:"code"`
	Name           string `gorm:"size:100;not null" json:"name"`
	ShortName      string `gorm:"size:50" json:"shortName"`
	Step           int    `gorm:"default:0" json:"step"`
	Section        string `gorm:"size:100" json:"section"`
	Process        string `gorm:"size:100" json:"process"`
	ProcessCommand string `gorm:"size:100" json:"processCommand"`
	Type           string `gorm:"size:50" json:"type"`
	IsMaintenance  bool   `gorm:"default:false" json:"isMaintenance"`
	Status         string `gorm:"size:20;default:'active'" json:"status"`
	Remarks        string `gorm:"type:text" json:"remarks"`
	Operator       string `gorm:"size:100" json:"operator"`
	OperateTime    string `gorm:"size:50" json:"operateTime"`
}
