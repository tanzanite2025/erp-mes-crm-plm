package models

// Role defines one role and its permission set.
type Role struct {
	BaseModel
	RoleID      string `gorm:"uniqueIndex;not null;size:100" json:"id"`
	Label       string `gorm:"size:100" json:"label"`
	Color       string `gorm:"size:255" json:"color"`
	Permissions string `gorm:"type:text" json:"permissions"` // JSON string of permission ids.
}

func (Role) TableName() string {
	return "roles"
}

