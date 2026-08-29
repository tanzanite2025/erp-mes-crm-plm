package models

import (
	"encoding/json"
	"time"
)

// AttendanceDeviceEmployeeMapping binds a device-side employee key to an ERP employee.
type AttendanceDeviceEmployeeMapping struct {
	BaseModel
	DeviceID          string     `gorm:"type:uuid;not null;index" json:"deviceId"`
	EmployeeID        string     `gorm:"type:uuid;not null;index" json:"employeeId"`
	DeviceEmployeeKey string     `gorm:"size:120;not null;index" json:"deviceEmployeeKey"`
	MatchField        string     `gorm:"size:40;not null;default:'staffId'" json:"matchField"`
	Source            string     `gorm:"size:20;not null;default:'manual'" json:"source"`
	Status            string     `gorm:"size:20;not null;default:'active';index" json:"status"`
	LastSeenAt        *time.Time `json:"lastSeenAt"`
	Notes             string     `gorm:"type:text" json:"notes"`
}

func (AttendanceDeviceEmployeeMapping) TableName() string {
	return "attendance_device_employee_mappings"
}

// AttendanceEvent is the vendor-neutral attendance fact produced by a device adapter.
type AttendanceEvent struct {
	BaseModel
	DeviceID           string          `gorm:"type:uuid;not null;index" json:"deviceId"`
	EmployeeID         string          `gorm:"type:uuid;index" json:"employeeId"`
	DeviceEmployeeKey  string          `gorm:"size:120;not null;index" json:"deviceEmployeeKey"`
	ExternalEventID    string          `gorm:"size:160;index" json:"externalEventId"`
	OccurredAt         time.Time       `gorm:"not null;index" json:"occurredAt"`
	Direction          string          `gorm:"size:20;not null;default:'unknown';index" json:"direction"`
	EventType          string          `gorm:"size:60;not null;default:'attendance'" json:"eventType"`
	VerificationMethod string          `gorm:"size:60" json:"verificationMethod"`
	Source             string          `gorm:"size:40;not null;default:'adapter'" json:"source"`
	Fingerprint        string          `gorm:"size:64;not null;uniqueIndex" json:"fingerprint"`
	MatchStatus        string          `gorm:"size:20;not null;default:'unmatched';index" json:"matchStatus"`
	MatchMessage       string          `gorm:"type:text" json:"matchMessage"`
	RawPayload         json.RawMessage `gorm:"type:jsonb" json:"rawPayload"`
}

func (AttendanceEvent) TableName() string {
	return "attendance_events"
}
