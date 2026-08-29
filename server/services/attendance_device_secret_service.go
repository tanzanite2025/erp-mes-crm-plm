package services

import (
	"fmt"
	"log"
	"strings"
	"xdfc-server/models"
	"xdfc-server/security"

	"gorm.io/gorm"
)

type attendanceDeviceSecretMigrationRow struct {
	ID          string `gorm:"column:id"`
	DeviceCode  string `gorm:"column:device_code"`
	SecretValue string `gorm:"column:secret_value"`
}

// AttendanceDevice is the one credential-bearing model whose Create/Save path
// must go through these helpers. Partial health/sync Updates intentionally
// update named non-secret columns and do not pass through this boundary.
func createAttendanceDeviceWithEncryptedSecret(database *gorm.DB, device models.AttendanceDevice) error {
	stored, err := encryptedAttendanceDeviceStorageCopy(device)
	if err != nil {
		return err
	}
	return database.Create(&stored).Error
}

func saveAttendanceDeviceWithEncryptedSecret(database *gorm.DB, device models.AttendanceDevice) error {
	stored, err := encryptedAttendanceDeviceStorageCopy(device)
	if err != nil {
		return err
	}
	return database.Save(&stored).Error
}

func encryptedAttendanceDeviceStorageCopy(device models.AttendanceDevice) (models.AttendanceDevice, error) {
	stored := device
	secret := strings.TrimSpace(stored.SecretValue)
	if secret == "" {
		stored.SecretValue = ""
		return stored, nil
	}

	if security.LooksLikeAttendanceSecretCiphertext(secret) {
		if _, err := security.DecryptAttendanceSecret(secret); err != nil {
			return stored, fmt.Errorf("validate encrypted attendance device SecretValue for %s: %w", stored.DeviceCode, err)
		}
		stored.SecretValue = secret
		return stored, nil
	}

	encrypted, err := security.EncryptAttendanceSecret(secret)
	if err != nil {
		return stored, fmt.Errorf("encrypt attendance device SecretValue for %s: %w", stored.DeviceCode, err)
	}
	stored.SecretValue = encrypted
	return stored, nil
}

func MigrateAttendanceDeviceSecretsAtRest(database *gorm.DB) (int64, error) {
	if database == nil {
		return 0, gorm.ErrInvalidDB
	}
	if !database.Migrator().HasTable(&models.AttendanceDevice{}) {
		return 0, nil
	}

	var rows []attendanceDeviceSecretMigrationRow
	if err := database.Table("attendance_devices").
		Select("id, device_code, secret_value").
		Where("COALESCE(secret_value, '') <> ''").
		Scan(&rows).Error; err != nil {
		return 0, err
	}

	var migrated int64
	for _, row := range rows {
		secret := strings.TrimSpace(row.SecretValue)
		if secret == "" {
			if row.SecretValue != "" {
				if err := database.Table("attendance_devices").
					Where("id = ?", row.ID).
					Update("secret_value", "").Error; err != nil {
					return migrated, err
				}
			}
			continue
		}
		if security.LooksLikeAttendanceSecretCiphertext(secret) {
			if _, err := security.DecryptAttendanceSecret(secret); err != nil {
				return migrated, fmt.Errorf("verify encrypted attendance device SecretValue for %s: %w", row.DeviceCode, err)
			}
			continue
		}

		encrypted, err := security.EncryptAttendanceSecret(row.SecretValue)
		if err != nil {
			return migrated, fmt.Errorf("migrate attendance device SecretValue for %s: %w", row.DeviceCode, err)
		}
		if err := database.Table("attendance_devices").
			Where("id = ?", row.ID).
			Update("secret_value", encrypted).Error; err != nil {
			return migrated, err
		}
		migrated++
	}

	if migrated > 0 {
		log.Printf("[READY] Migrated %d attendance device SecretValue rows to encrypted storage.", migrated)
	}
	return migrated, nil
}
