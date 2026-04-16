package models

type UserPermission struct {
	BaseModel
	UserID       string  `gorm:"type:uuid;not null;index" json:"userId"`
	PermissionID string  `gorm:"size:120;not null;index" json:"permissionId"`
	Source       string  `gorm:"size:40;not null;default:'manual'" json:"source"`
	GrantedBy    *string `gorm:"type:uuid;index" json:"grantedBy,omitempty"`
	Reason       string  `gorm:"size:200" json:"reason,omitempty"`
	BatchID      string  `gorm:"size:64;index" json:"batchId,omitempty"`
}

func (UserPermission) TableName() string {
	return "user_permissions"
}
