package services

import (
	"context"
	"errors"
	"strings"
	"unicode"
	"unicode/utf8"
	"xdfc-server/audit"
	"xdfc-server/models"
	"xdfc-server/security"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
	"gorm.io/gorm/logger"
)

var (
	ErrProtectedAdministratorRecoveryTargetIneligible = errors.New("recovery requires an existing active protected administrator")
	ErrProtectedAdministratorRecoveryVersionChanged   = errors.New("account credentials changed; inspect the account again before recovery")
	ErrProtectedAdministratorRecoveryInputInvalid     = errors.New("recovery requires an exact account UUID, a safe password version, an operator and a reason without control characters")
)

type ProtectedAdministratorPasswordRecoveryTarget struct {
	UserID          string
	Username        string
	PasswordVersion int64
}

type ProtectedAdministratorPasswordRecoveryInput struct {
	UserID                  string
	ExpectedPasswordVersion int64
	Operator                string
	Reason                  string
	NewPassword             string `json:"-"`
}

type ProtectedAdministratorPasswordRecoveryResult struct {
	UserID              string
	Username            string
	PasswordVersion     int64
	RecoveryOperationID string
}

func isEligibleProtectedAdministratorPasswordRecoveryTarget(user models.User) bool {
	return user.IsSystemProtected() && !user.DeletedAt.Valid && strings.EqualFold(strings.TrimSpace(user.Status), "active") &&
		(strings.EqualFold(strings.TrimSpace(user.Username), "admin") || strings.EqualFold(strings.TrimSpace(user.PermissionPresetID), "admin"))
}

func validateProtectedAdministratorRecoveryAccountIdentity(userID string) error {
	parsed, err := uuid.Parse(userID)
	if err != nil || parsed == uuid.Nil || parsed.String() != userID {
		return ErrProtectedAdministratorRecoveryInputInvalid
	}
	return nil
}

func isValidProtectedAdministratorRecoveryAuditText(value string, maximumCharacters int) bool {
	return utf8.ValidString(value) && strings.TrimSpace(value) != "" && utf8.RuneCountInString(value) <= maximumCharacters &&
		!strings.ContainsFunc(value, unicode.IsControl)
}

func ValidateProtectedAdministratorPasswordRecoveryRequestMetadata(input ProtectedAdministratorPasswordRecoveryInput) error {
	if validateProtectedAdministratorRecoveryAccountIdentity(input.UserID) != nil || input.ExpectedPasswordVersion < 0 || input.ExpectedPasswordVersion >= 9007199254740991 ||
		!isValidProtectedAdministratorRecoveryAuditText(input.Operator, 100) || !isValidProtectedAdministratorRecoveryAuditText(input.Reason, 500) {
		return ErrProtectedAdministratorRecoveryInputInvalid
	}
	return nil
}

// InspectProtectedAdministratorPasswordRecoveryTarget performs no writes and never selects a password hash.
func InspectProtectedAdministratorPasswordRecoveryTarget(ctx context.Context, database *gorm.DB, userID string) (ProtectedAdministratorPasswordRecoveryTarget, error) {
	if database == nil {
		return ProtectedAdministratorPasswordRecoveryTarget{}, gorm.ErrInvalidDB
	}
	if err := validateProtectedAdministratorRecoveryAccountIdentity(userID); err != nil {
		return ProtectedAdministratorPasswordRecoveryTarget{}, err
	}
	var user models.User
	err := database.WithContext(ctx).Session(&gorm.Session{Logger: database.Logger.LogMode(logger.Silent)}).
		Select("id", "username", "status", "is_protected", "permission_preset_id", "password_version").First(&user, "id = ?", userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ProtectedAdministratorPasswordRecoveryTarget{}, ErrProtectedAdministratorRecoveryTargetIneligible
	}
	if err != nil {
		return ProtectedAdministratorPasswordRecoveryTarget{}, err
	}
	if !isEligibleProtectedAdministratorPasswordRecoveryTarget(user) || user.PasswordVersion < 0 || user.PasswordVersion >= 9007199254740991 {
		return ProtectedAdministratorPasswordRecoveryTarget{}, ErrProtectedAdministratorRecoveryTargetIneligible
	}
	return ProtectedAdministratorPasswordRecoveryTarget{UserID: user.ID, Username: user.Username, PasswordVersion: user.PasswordVersion}, nil
}

// RecoverProtectedAdministratorPasswordWithAtomicAudit is an offline maintenance operation.
// No HTTP route exposes it. Database/host access and human identity verification are operational prerequisites.
func RecoverProtectedAdministratorPasswordWithAtomicAudit(ctx context.Context, database *gorm.DB, input ProtectedAdministratorPasswordRecoveryInput) (ProtectedAdministratorPasswordRecoveryResult, error) {
	if database == nil {
		return ProtectedAdministratorPasswordRecoveryResult{}, gorm.ErrInvalidDB
	}
	if err := ValidateProtectedAdministratorPasswordRecoveryRequestMetadata(input); err != nil {
		return ProtectedAdministratorPasswordRecoveryResult{}, err
	}
	if err := security.ValidateNewUserPassword(input.NewPassword); err != nil {
		return ProtectedAdministratorPasswordRecoveryResult{}, err
	}
	database = database.WithContext(ctx).Session(&gorm.Session{Logger: database.Logger.LogMode(logger.Silent)})
	var snapshot models.User
	if err := database.First(&snapshot, "id = ?", input.UserID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ProtectedAdministratorPasswordRecoveryResult{}, ErrProtectedAdministratorRecoveryTargetIneligible
		}
		return ProtectedAdministratorPasswordRecoveryResult{}, err
	}
	if !isEligibleProtectedAdministratorPasswordRecoveryTarget(snapshot) {
		return ProtectedAdministratorPasswordRecoveryResult{}, ErrProtectedAdministratorRecoveryTargetIneligible
	}
	if snapshot.PasswordVersion != input.ExpectedPasswordVersion {
		return ProtectedAdministratorPasswordRecoveryResult{}, ErrProtectedAdministratorRecoveryVersionChanged
	}
	if bcrypt.CompareHashAndPassword([]byte(snapshot.Password), []byte(input.NewPassword)) == nil {
		return ProtectedAdministratorPasswordRecoveryResult{}, ErrNewUserPasswordUnchanged
	}
	hashedPassword, err := security.HashNewUserPasswordWithValidation(input.NewPassword)
	if err != nil {
		return ProtectedAdministratorPasswordRecoveryResult{}, err
	}
	operationID := uuid.NewString()
	auditContext := audit.NewContextWithActor(ctx, audit.AuditActor{Username: strings.TrimSpace(input.Operator), Source: "offline_protected_administrator_recovery"})
	err = database.Transaction(func(tx *gorm.DB) error {
		var lockedUser models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&lockedUser, "id = ?", snapshot.ID).Error; err != nil {
			return err
		}
		if !isEligibleProtectedAdministratorPasswordRecoveryTarget(lockedUser) {
			return ErrProtectedAdministratorRecoveryTargetIneligible
		}
		if lockedUser.PasswordVersion != input.ExpectedPasswordVersion || lockedUser.Password != snapshot.Password {
			return ErrProtectedAdministratorRecoveryVersionChanged
		}
		result := tx.Model(&models.User{}).Where("id = ? AND password_version = ? AND password = ?", snapshot.ID, input.ExpectedPasswordVersion, snapshot.Password).
			Updates(map[string]any{"password": hashedPassword, "password_version": gorm.Expr("password_version + 1")})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrProtectedAdministratorRecoveryVersionChanged
		}
		return writeUserAuditEntryWithContext(auditContext, tx, snapshot.ID, "PASSWORD_RECOVERY", nil, nil, map[string]any{
			"passwordChanged":         true,
			"previousPasswordVersion": input.ExpectedPasswordVersion,
			"passwordVersion":         input.ExpectedPasswordVersion + 1,
			"operator":                strings.TrimSpace(input.Operator),
			"reason":                  strings.TrimSpace(input.Reason),
			"source":                  "offline_protected_administrator_recovery",
			"recoveryOperationId":     operationID,
		}, "protected_administrator_emergency_password_recovery")
	})
	if err != nil {
		return ProtectedAdministratorPasswordRecoveryResult{}, err
	}
	return ProtectedAdministratorPasswordRecoveryResult{UserID: snapshot.ID, Username: snapshot.Username, PasswordVersion: input.ExpectedPasswordVersion + 1, RecoveryOperationID: operationID}, nil
}
