package services

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrUserPermissionsUserNotFound   = errors.New("user permissions user not found")
	ErrUserPermissionsInvalidPayload = errors.New("user permissions invalid payload")
)

type UserPermissionItem struct {
	PermissionID string
	Source       string
	GrantedBy    string
	UpdatedAt    time.Time
}

type UserPermissionsView struct {
	UserID      string
	Username    string
	Status      string
	EmployeeID  string
	Permissions []UserPermissionItem
}

type ReplaceUserPermissionsInput struct {
	PermissionIDs []string
	Source        string
	Reason        string
	GrantedBy     string
}

type ReplaceUserPermissionsResult struct {
	BeforePermissions []string
	UserID            string
	Permissions       []string
	Added             int
	Removed           int
	Unchanged         int
}

func normalizeUserPermissionSource(value string, fallback string) string {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return fallback
	}
	return normalized
}

func normalizeExplicitPermissionIDs(permissionIDs []string) ([]string, error) {
	normalized := authz.DeduplicatePermissionIDs(permissionIDs)
	for _, permissionID := range normalized {
		if !authz.IsSupportedPermissionID(permissionID) {
			return nil, fmt.Errorf("%w: unsupported permission id %s", ErrUserPermissionsInvalidPayload, permissionID)
		}
	}
	return normalized, nil
}

func normalizeNullableUUIDString(value string) *string {
	normalized := strings.TrimSpace(value)
	if normalized == "" {
		return nil
	}
	return &normalized
}

func GetUserPermissions(userID string) (UserPermissionsView, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return UserPermissionsView{}, ErrUserPermissionsUserNotFound
	}
	if db.DB == nil {
		return UserPermissionsView{}, gorm.ErrInvalidDB
	}

	var user models.User
	if err := db.DB.Select("id", "username", "status", "employee_id").First(&user, "id = ?", normalizedUserID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return UserPermissionsView{}, ErrUserPermissionsUserNotFound
		}
		return UserPermissionsView{}, err
	}

	var rows []models.UserPermission
	if err := db.DB.Where("user_id = ?", normalizedUserID).
		Where("deleted_at IS NULL").
		Order("permission_id asc").
		Find(&rows).Error; err != nil {
		return UserPermissionsView{}, err
	}

	permissions := make([]UserPermissionItem, 0, len(rows))
	for _, row := range rows {
		grantedBy := ""
		if row.GrantedBy != nil {
			grantedBy = strings.TrimSpace(*row.GrantedBy)
		}
		permissions = append(permissions, UserPermissionItem{
			PermissionID: strings.TrimSpace(row.PermissionID),
			Source:       strings.TrimSpace(row.Source),
			GrantedBy:    grantedBy,
			UpdatedAt:    row.UpdatedAt,
		})
	}

	return UserPermissionsView{
		UserID:      user.ID,
		Username:    user.Username,
		Status:      user.Status,
		EmployeeID:  strings.TrimSpace(user.EmployeeID),
		Permissions: permissions,
	}, nil
}

func replaceUserPermissionsTx(tx *gorm.DB, user models.User, input ReplaceUserPermissionsInput, batchID string) (ReplaceUserPermissionsResult, error) {
	normalizedPermissionIDs, err := normalizeExplicitPermissionIDs(input.PermissionIDs)
	if err != nil {
		return ReplaceUserPermissionsResult{}, err
	}

	source := normalizeUserPermissionSource(input.Source, "manual")
	reason := strings.TrimSpace(input.Reason)
	grantedBy := strings.TrimSpace(input.GrantedBy)

	var existing []models.UserPermission
	if err := tx.Where("user_id = ?", user.ID).
		Where("deleted_at IS NULL").
		Find(&existing).Error; err != nil {
		return ReplaceUserPermissionsResult{}, err
	}

	existingByID := make(map[string]models.UserPermission, len(existing))
	for _, item := range existing {
		existingByID[authz.NormalizePermissionID(item.PermissionID)] = item
	}

	requiredSet := make(map[string]struct{}, len(normalizedPermissionIDs))
	for _, permissionID := range normalizedPermissionIDs {
		requiredSet[permissionID] = struct{}{}
	}

	result := ReplaceUserPermissionsResult{
		BeforePermissions: make([]string, 0, len(existingByID)),
		UserID:            user.ID,
		Permissions:       normalizedPermissionIDs,
	}
	for permissionID := range existingByID {
		result.BeforePermissions = append(result.BeforePermissions, permissionID)
	}

	for _, item := range existing {
		normalized := authz.NormalizePermissionID(item.PermissionID)
		if _, keep := requiredSet[normalized]; keep {
			result.Unchanged++
			continue
		}
		if err := tx.Delete(&item).Error; err != nil {
			return ReplaceUserPermissionsResult{}, err
		}
		result.Removed++
	}

	for _, permissionID := range normalizedPermissionIDs {
		if _, exists := existingByID[permissionID]; exists {
			continue
		}
		row := models.UserPermission{
			UserID:       user.ID,
			PermissionID: permissionID,
			Source:       source,
			GrantedBy:    normalizeNullableUUIDString(grantedBy),
			Reason:       reason,
			BatchID:      strings.TrimSpace(batchID),
		}
		if err := tx.Create(&row).Error; err != nil {
			return ReplaceUserPermissionsResult{}, err
		}
		result.Added++
	}

	sort.Strings(result.BeforePermissions)
	return result, nil
}

func ReplaceUserPermissions(ctx context.Context, userID string, input ReplaceUserPermissionsInput) (ReplaceUserPermissionsResult, error) {
	normalizedUserID := strings.TrimSpace(userID)
	if normalizedUserID == "" {
		return ReplaceUserPermissionsResult{}, ErrUserPermissionsUserNotFound
	}
	if db.DB == nil {
		return ReplaceUserPermissionsResult{}, gorm.ErrInvalidDB
	}

	var result ReplaceUserPermissionsResult
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Select("id", "username", "status", "employee_id").
			First(&user, "id = ?", normalizedUserID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrUserPermissionsUserNotFound
			}
			return err
		}

		replaced, err := replaceUserPermissionsTx(tx, user, input, "")
		if err != nil {
			return err
		}
		result = replaced
		return writeUserPermissionsAuditEntryWithContext(ctx, tx, user, replaced.BeforePermissions, replaced, input)
	})
	if err != nil {
		return ReplaceUserPermissionsResult{}, err
	}

	return result, nil
}
