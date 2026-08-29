package models

import (
	"encoding/json"
	"fmt"
	"time"
	"xdfc-server/security"

	"gorm.io/gorm"
)

// AttendanceDevice stores vendor-neutral clock-in device connection settings.
//
// Security boundary:
//   - SecretValue is encrypted at rest as att-secret:v1:<base64url(nonce+ciphertext)>
//     with ATTENDANCE_SECRET_ENCRYPTION_KEY. Do not reuse JWT_SECRET or
//     AI_SECRET_ENCRYPTION_KEY for this field.
//   - GORM queries decrypt SecretValue into process memory so ISAPI probes,
//     HCNetSDK adapters, and ISUP/EHome configuration checks still receive the
//     original device password/secret.
//   - SecretValue is intentionally omitted from JSON responses; handlers expose
//     HasSecret instead so credentials are not sent back to browsers.
//   - IngressTokenHash is one-way hashed and is not interchangeable with
//     SecretValue or the Gateway-side ISUP Key.
type AttendanceDevice struct {
	BaseModel
	DeviceCode             string          `gorm:"size:80;uniqueIndex;not null" json:"deviceCode"`
	Name                   string          `gorm:"size:120;not null" json:"name"`
	Vendor                 string          `gorm:"size:40;not null;index" json:"vendor"`
	Model                  string          `gorm:"size:120" json:"model"`
	Protocol               string          `gorm:"size:40;not null;index" json:"protocol"`
	Endpoint               string          `gorm:"size:255" json:"endpoint"`
	Port                   int             `json:"port"`
	Username               string          `gorm:"size:120" json:"username"`
	SecretValue            string          `gorm:"type:text" json:"-"`
	IngressTokenHash       string          `gorm:"type:text" json:"-"`
	Location               string          `gorm:"size:120" json:"location"`
	OrgUnitID              string          `gorm:"size:36;index" json:"orgUnitId"`
	Status                 string          `gorm:"size:20;not null;default:'active';index" json:"status"`
	CollectMode            string          `gorm:"size:30;not null;default:'pull'" json:"collectMode"`
	PollIntervalSeconds    int             `gorm:"not null;default:300" json:"pollIntervalSeconds"`
	TimeZone               string          `gorm:"size:64;not null;default:'Asia/Shanghai'" json:"timeZone"`
	EmployeeMatchField     string          `gorm:"size:40;not null;default:'staffId'" json:"employeeMatchField"`
	DeviceEmployeeKeyField string          `gorm:"size:40;not null;default:'employeeNo'" json:"deviceEmployeeKeyField"`
	EventTimeField         string          `gorm:"size:80;not null;default:'time'" json:"eventTimeField"`
	RawEventCodeField      string          `gorm:"size:80;not null;default:'eventType'" json:"rawEventCodeField"`
	ClockDirectionRule     string          `gorm:"size:80;not null;default:'auto'" json:"clockDirectionRule"`
	DeduplicateWindowSec   int             `gorm:"not null;default:60" json:"deduplicateWindowSec"`
	Config                 json.RawMessage `gorm:"type:jsonb" json:"config"`
	LastSyncAt             *time.Time      `json:"lastSyncAt"`
	LastEventAt            *time.Time      `json:"lastEventAt"`
	LastSyncFetched        int             `gorm:"not null;default:0" json:"lastSyncFetched"`
	LastSyncAccepted       int             `gorm:"not null;default:0" json:"lastSyncAccepted"`
	LastSyncStatus         string          `gorm:"size:20;not null;default:'never'" json:"lastSyncStatus"`
	LastSyncMessage        string          `gorm:"type:text" json:"lastSyncMessage"`
	LastHealthCheckAt      *time.Time      `json:"lastHealthCheckAt"`
	LastHealthStatus       string          `gorm:"size:24;not null;default:'unknown'" json:"lastHealthStatus"`
	LastHealthMessage      string          `gorm:"type:text" json:"lastHealthMessage"`
	LastHealthLatencyMs    int64           `gorm:"not null;default:0" json:"lastHealthLatencyMs"`
	Version                int             `gorm:"not null;default:1" json:"version"`
}

func (device *AttendanceDevice) AfterFind(_ *gorm.DB) error {
	plaintext, err := security.AttendanceSecretForRuntime(device.SecretValue)
	if err != nil {
		return fmt.Errorf("decrypt attendance device SecretValue for %s: %w", device.DeviceCode, err)
	}
	device.SecretValue = plaintext
	return nil
}
