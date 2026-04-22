package models

import "encoding/json"

type SidebarCommandCategory struct {
	BaseModel
	CategoryID  string `gorm:"size:80;not null;uniqueIndex" json:"categoryId"`
	Name        string `gorm:"size:120;not null" json:"name"`
	Description string `gorm:"size:500" json:"description"`
	Enabled     bool   `gorm:"not null;default:true;index" json:"enabled"`
	Status      string `gorm:"size:40;not null;default:'active';index" json:"status"`
	SortOrder   int    `gorm:"not null;default:0;index" json:"sortOrder"`
}

func (SidebarCommandCategory) TableName() string {
	return "sidebar_command_categories"
}

type SidebarCommandDefinition struct {
	BaseModel
	CommandID    string          `gorm:"size:80;not null;uniqueIndex" json:"commandId"`
	Title        string          `gorm:"size:120;not null" json:"title"`
	Description  string          `gorm:"size:500" json:"description"`
	Route        string          `gorm:"size:255;not null" json:"route"`
	SearchParams json.RawMessage `gorm:"type:jsonb;not null;default:'{}'" json:"searchParams"`
	Icon         string          `gorm:"size:80" json:"icon"`
	Category     string          `gorm:"size:80;not null;default:'business'" json:"category"`
	Assignable   bool            `gorm:"not null;default:true;index" json:"assignable"`
	Enabled      bool            `gorm:"not null;default:true;index" json:"enabled"`
	Status       string          `gorm:"size:40;not null;default:'active';index" json:"status"`
	SortOrder    int             `gorm:"not null;default:0;index" json:"sortOrder"`
}

func (SidebarCommandDefinition) TableName() string {
	return "sidebar_command_definitions"
}

type UserSidebarCommandAssignment struct {
	BaseModel
	UserID     string  `gorm:"type:uuid;not null;index" json:"userId"`
	CommandID  string  `gorm:"size:80;not null;index" json:"commandId"`
	SortOrder  int     `gorm:"not null;default:0" json:"sortOrder"`
	Source     string  `gorm:"size:40;not null;default:'manual'" json:"source"`
	AssignedBy *string `gorm:"type:uuid;index" json:"assignedBy,omitempty"`
}

func (UserSidebarCommandAssignment) TableName() string {
	return "user_sidebar_command_assignments"
}

type UserSidebarCommandCategoryAssignment struct {
	BaseModel
	UserID     string  `gorm:"type:uuid;not null;index" json:"userId"`
	CategoryID string  `gorm:"size:80;not null;index" json:"categoryId"`
	SortOrder  int     `gorm:"not null;default:0" json:"sortOrder"`
	Source     string  `gorm:"size:40;not null;default:'manual'" json:"source"`
	AssignedBy *string `gorm:"type:uuid;index" json:"assignedBy,omitempty"`
}

func (UserSidebarCommandCategoryAssignment) TableName() string {
	return "user_sidebar_command_category_assignments"
}
