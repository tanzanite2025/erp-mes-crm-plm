package models

import (
	"time"
	"gorm.io/gorm"
)

// Mold 模具资产模型
type Mold struct {
	ID                   string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	SN                   string         `gorm:"size:100;uniqueIndex;not null" json:"sn"`
	Name                 string         `gorm:"size:255;not null" json:"name"`
	MaxCycles            int            `gorm:"default:100000" json:"maxCycles"`
	CurrentCycles        int            `gorm:"default:0" json:"currentCycles"`
	MaintenanceThreshold int            `gorm:"default:80000" json:"maintenanceThreshold"`
	TotalLifeCycles      int            `gorm:"default:0" json:"totalLifeCycles"`
	GroupName            string         `gorm:"size:100" json:"groupName"`
	Status               string         `gorm:"size:50;default:'IDLE'" json:"status"` // 'IDLE','IN_USE','CHECKING','MAINTENANCE','RETIRED','LENT_OUT','BORROWED'
	Location             string         `gorm:"size:255" json:"location"`
	Description          string         `gorm:"type:text" json:"description"`
	IsAlerted            bool           `gorm:"default:false" json:"isAlerted"`
	LastCheckedAt        *time.Time     `json:"lastCheckedAt"`
	ImageURL             string         `json:"imageUrl"`
	CreatedBy            string         `json:"createdBy"`
	UpdatedBy            string         `json:"updatedBy"`
	CreatedAt            time.Time      `json:"createdAt"`
	UpdatedAt            time.Time      `json:"updatedAt"`
	DeletedAt            gorm.DeletedAt `gorm:"index" json:"-"`
}

// Furnace 炉台资产模型
type Furnace struct {
	ID          string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	SN          string         `gorm:"size:100;uniqueIndex;not null" json:"sn"`
	Name        string         `gorm:"size:255;not null" json:"name"`
	Type        string         `gorm:"size:100" json:"type"`
	MaxTemp     float64        `json:"maxTemp"`
	CurrentTemp float64        `json:"currentTemp"`
	Status      string         `gorm:"size:50;default:'IDLE'" json:"status"`
	Location    string         `gorm:"size:255" json:"location"`
	Description string         `gorm:"type:text" json:"description"`
	CreatedBy   string         `json:"createdBy"`
	UpdatedBy   string         `json:"updatedBy"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// MoldLoan 模具借还记录模型
type MoldLoan struct {
	ID                 string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	MoldID             string    `gorm:"type:uuid;index;not null" json:"moldId"`
	MoldSN             string    `gorm:"size:100" json:"moldSn"`
	MoldName           string    `gorm:"size:255" json:"moldName"`
	FromFactory        string    `gorm:"size:255" json:"fromFactory"`
	ToFactory          string    `gorm:"size:255" json:"toFactory"`
	ContactPerson      string    `gorm:"size:100" json:"contactPerson"`
	LoanDate           time.Time `json:"loanDate"`
	ExpectedReturnDate time.Time `json:"expectedReturnDate"`
	ActualReturnDate   *time.Time `json:"actualReturnDate"`
	Status             string    `gorm:"size:50;default:'ACTIVE'" json:"status"` // 'ACTIVE', 'RETURNED', 'OVERDUE'
	Remarks            string    `gorm:"type:text" json:"remarks"`
	PhotoURL           string    `json:"photoUrl"`
	CreatedAt          time.Time `json:"createdAt"`
}

// EquipmentPartner 合作单位/厂区模型
type EquipmentPartner struct {
	ID            string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	Name          string    `gorm:"size:255;not null" json:"name"`
	Type          string    `gorm:"size:50;default:'EXTERNAL'" json:"type"` // 'INTERNAL', 'EXTERNAL'
	ContactPerson string    `gorm:"size:100" json:"contactPerson"`
	Phone         string    `gorm:"size:50" json:"phone"`
	Address       string    `gorm:"size:255" json:"address"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// MoldDrawing 模具图纸模型
type MoldDrawing struct {
	ID         string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	MoldID     string    `gorm:"type:uuid;index" json:"moldId"`
	MoldSN     string    `gorm:"size:100" json:"moldSn"`
	Name       string    `gorm:"size:255;not null" json:"name"`
	Type       string    `gorm:"size:50;default:'2D'" json:"type"` // '2D', '3D', 'TECH_SPEC', 'OTHER'
	FileURL    string    `gorm:"size:512;not null" json:"fileUrl"`
	Version    string    `gorm:"size:50;default:'V1.0'" json:"version"`
	Status     string    `gorm:"size:50;default:'ACTIVE'" json:"status"` // 'ACTIVE', 'DRAFT', 'OBSOLETE'
	UploadedAt time.Time `json:"uploadedAt"`
	Remarks    string    `gorm:"type:text" json:"remarks"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// MoldDrawingLog 图纸操作日志模型
type MoldDrawingLog struct {
	ID        string    `gorm:"primaryKey;type:uuid;default:gen_random_uuid()" json:"id"`
	DrawingID string    `gorm:"type:uuid;index;not null" json:"drawingId"`
	Action    string    `gorm:"size:100" json:"action"` // 'CREATED', 'BIND', 'UNBIND', 'STATUS_CHANGE', 'VERSION_UPDATE'
	Details   string    `gorm:"type:text" json:"details"`
	Operator  string    `gorm:"size:100;default:'系统管理员'" json:"operator"`
	Timestamp time.Time `json:"timestamp"`
}
