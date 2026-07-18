package services

import (
	"context"
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrUserEmployeeBindingTargetNotFound = errors.New("employee binding target not found")
	ErrUserEmployeeAlreadyBound          = errors.New("employee is already bound to another user")
)

func resolveEmployeeRecordIDForBinding(tx *gorm.DB, employeeRef string) (string, error) {
	normalized := strings.TrimSpace(employeeRef)
	if tx == nil || normalized == "" {
		return "", ErrUserEmployeeBindingTargetNotFound
	}

	var employee models.Employee
	if _, parseErr := uuid.Parse(normalized); parseErr == nil {
		queryByID := tx.Select("id").Where("id = ?", normalized).First(&employee)
		if queryByID.Error == nil {
			return strings.TrimSpace(employee.ID), nil
		}
		if queryByID.Error != nil && !errors.Is(queryByID.Error, gorm.ErrRecordNotFound) {
			return "", queryByID.Error
		}
	}

	queryByStaffID := tx.Select("id").Where("LOWER(staff_id) = ?", strings.ToLower(normalized)).First(&employee)
	if errors.Is(queryByStaffID.Error, gorm.ErrRecordNotFound) {
		return "", ErrUserEmployeeBindingTargetNotFound
	}
	if queryByStaffID.Error != nil {
		return "", queryByStaffID.Error
	}
	return strings.TrimSpace(employee.ID), nil
}

func ensureEmployeeBindingAvailable(tx *gorm.DB, employeeID string, targetUserID string) error {
	var existing models.User
	err := tx.Select("id").
		Where("employee_id = ?", strings.TrimSpace(employeeID)).
		Where("id <> ?", strings.TrimSpace(targetUserID)).
		First(&existing).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil
	}
	if err != nil {
		return err
	}
	return ErrUserEmployeeAlreadyBound
}

func normalizeEmployeeBindingUpdate(tx *gorm.DB, targetUserID string, updates map[string]interface{}) error {
	rawEmployeeID, exists := updates["employee_id"]
	if !exists {
		return nil
	}

	employeeRef, ok := rawEmployeeID.(string)
	if !ok {
		return ErrUserEmployeeBindingTargetNotFound
	}
	employeeRef = strings.TrimSpace(employeeRef)
	if employeeRef == "" {
		updates["employee_id"] = ""
		return nil
	}

	employeeID, err := resolveEmployeeRecordIDForBinding(tx, employeeRef)
	if err != nil {
		return err
	}
	if err := ensureEmployeeBindingAvailable(tx, employeeID, targetUserID); err != nil {
		return err
	}
	updates["employee_id"] = employeeID
	return nil
}

func normalizeCreatedUserEmployeeBinding(tx *gorm.DB, user *models.User) error {
	if user == nil || strings.TrimSpace(user.EmployeeID) == "" {
		return nil
	}

	employeeID, err := resolveEmployeeRecordIDForBinding(tx, user.EmployeeID)
	if err != nil {
		return err
	}
	if err := ensureEmployeeBindingAvailable(tx, employeeID, user.ID); err != nil {
		return err
	}
	user.EmployeeID = employeeID
	return nil
}

func changeUserEmployeeBinding(ctx context.Context, userID string, employeeRef *string) (models.User, error) {
	var updated models.User
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var current models.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&current, "id = ?", strings.TrimSpace(userID)).Error; err != nil {
			return err
		}
		if current.IsSystemProtected() {
			return ErrProtectedUserMutation
		}

		updates := map[string]interface{}{"employee_id": ""}
		operation := "unbind_employee"
		action := "UNBIND_EMPLOYEE"
		if employeeRef != nil {
			updates["employee_id"] = strings.TrimSpace(*employeeRef)
			operation = "bind_employee"
			action = "BIND_EMPLOYEE"
		}
		if err := normalizeEmployeeBindingUpdate(tx, current.ID, updates); err != nil {
			return err
		}

		before := userAuditSnapshot(current)
		if err := tx.Model(&current).Updates(updates).Error; err != nil {
			return mapUserUniqueViolation(err)
		}
		if err := tx.First(&updated, "id = ?", current.ID).Error; err != nil {
			return err
		}
		return writeUserAuditEntryWithContext(
			ctx,
			tx,
			updated.ID,
			action,
			before,
			userAuditSnapshot(updated),
			sanitizeUserAuditUpdates(updates),
			operation,
		)
	})
	if err != nil {
		return models.User{}, err
	}
	return updated, nil
}

func BindUserEmployee(ctx context.Context, userID string, employeeRef string) (models.User, error) {
	normalized := strings.TrimSpace(employeeRef)
	return changeUserEmployeeBinding(ctx, userID, &normalized)
}

func UnbindUserEmployee(ctx context.Context, userID string) (models.User, error) {
	return changeUserEmployeeBinding(ctx, userID, nil)
}
