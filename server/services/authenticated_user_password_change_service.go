package services

import (
	"context"
	"errors"
	"strings"
	"xdfc-server/models"
	"xdfc-server/security"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

var (
	ErrCurrentUserPasswordIncorrect     = errors.New("current password is incorrect")
	ErrNewUserPasswordUnchanged         = errors.New("new password must differ from the current password")
	ErrPasswordChangeCredentialsExpired = errors.New("account credentials changed; please sign in again")
)

// ChangeAuthenticatedUserPassword verifies a snapshot before hashing, then rechecks it
// under a row lock. An in-flight request can never overwrite a newer password.
func ChangeAuthenticatedUserPassword(ctx context.Context, database *gorm.DB, userID string, expectedVersion int64, currentPassword, newPassword string) error {
	if database == nil {
		return gorm.ErrInvalidDB
	}
	if err := security.ValidateNewUserPassword(newPassword); err != nil {
		return err
	}
	// A database error must never write SQL parameters containing a password hash to logs.
	database = database.WithContext(ctx).Session(&gorm.Session{Logger: database.Logger.LogMode(logger.Silent)})
	var snapshot models.User
	if err := database.First(&snapshot, "id = ?", strings.TrimSpace(userID)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrPasswordChangeCredentialsExpired
		}
		return err
	}
	if snapshot.PasswordVersion != expectedVersion || !strings.EqualFold(strings.TrimSpace(snapshot.Status), "active") {
		return ErrPasswordChangeCredentialsExpired
	}
	if bcrypt.CompareHashAndPassword([]byte(snapshot.Password), []byte(currentPassword)) != nil {
		return ErrCurrentUserPasswordIncorrect
	}
	if bcrypt.CompareHashAndPassword([]byte(snapshot.Password), []byte(newPassword)) == nil {
		return ErrNewUserPasswordUnchanged
	}
	hashedPassword, err := security.HashNewUserPasswordWithValidation(newPassword)
	if err != nil {
		return err
	}
	return database.Transaction(func(tx *gorm.DB) error {
		var lockedUser models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&lockedUser, "id = ?", snapshot.ID).Error; err != nil {
			return err
		}
		if lockedUser.PasswordVersion != expectedVersion || lockedUser.Password != snapshot.Password || !strings.EqualFold(strings.TrimSpace(lockedUser.Status), "active") {
			return ErrPasswordChangeCredentialsExpired
		}
		result := tx.Model(&models.User{}).Where("id = ? AND password_version = ? AND password = ?", snapshot.ID, expectedVersion, snapshot.Password).
			Updates(map[string]any{"password": hashedPassword, "password_version": gorm.Expr("password_version + 1")})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrPasswordChangeCredentialsExpired
		}
		return writeUserAuditEntryWithContext(ctx, tx, snapshot.ID, "PASSWORD_CHANGE", nil, nil,
			map[string]any{"passwordChanged": true, "previousPasswordVersion": expectedVersion, "passwordVersion": expectedVersion + 1}, "self_service_password_change")
	})
}
