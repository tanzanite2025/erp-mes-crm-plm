package models

import (
	"strings"
	"time"

	"gorm.io/gorm"
)

// User 用户模型
type User struct {
	ID          string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Username    string         `gorm:"uniqueIndex;not null;size:100" json:"username"`
	Password    string         `gorm:"not null" json:"-"` // 不在 JSON 中返回
	Email       string         `gorm:"size:255" json:"email"`
	PhoneNumber string         `gorm:"size:20" json:"phoneNumber"`
	FirstName   string         `gorm:"size:50" json:"firstName"`
	LastName    string         `gorm:"size:50" json:"lastName"`
	Status      string         `gorm:"size:20;default:'active'" json:"status"`
	IsProtected bool           `gorm:"not null;default:false;index" json:"isProtected"`
	Role        string         `gorm:"size:100;index" json:"role"`
	EmployeeID  string         `gorm:"size:100" json:"employeeId"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (user User) IsSystemProtected() bool {
	return user.IsProtected || strings.EqualFold(strings.TrimSpace(user.Username), "admin")
}
