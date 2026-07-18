package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrUserBulkSyncInvalidPayload = errors.New("bulk user sync payload is invalid")
	ErrUserBulkSyncUserNotFound   = errors.New("bulk user sync target not found")
)

type BulkSyncUserInput struct {
	ID          string
	Username    string
	Email       string
	PhoneNumber string
	FirstName   string
	LastName    string
	Status      string
	EmployeeID  string
}

type BulkSyncUsersResult struct {
	Updated          int
	SkippedProtected int
}

var bulkSyncAllowedUserStatuses = map[string]struct{}{
	"active":    {},
	"inactive":  {},
	"suspended": {},
}

func normalizeBulkSyncUserInput(input BulkSyncUserInput) (BulkSyncUserInput, error) {
	input.ID = strings.TrimSpace(input.ID)
	input.Username = strings.TrimSpace(input.Username)
	input.Email = strings.TrimSpace(input.Email)
	input.PhoneNumber = strings.TrimSpace(input.PhoneNumber)
	input.FirstName = strings.TrimSpace(input.FirstName)
	input.LastName = strings.TrimSpace(input.LastName)
	input.Status = strings.ToLower(strings.TrimSpace(input.Status))
	input.EmployeeID = strings.TrimSpace(input.EmployeeID)

	if input.ID == "" || input.Username == "" {
		return BulkSyncUserInput{}, ErrUserBulkSyncInvalidPayload
	}
	if _, supported := bulkSyncAllowedUserStatuses[input.Status]; !supported {
		return BulkSyncUserInput{}, fmt.Errorf("%w: invalid status for user %s", ErrUserBulkSyncInvalidPayload, input.ID)
	}
	return input, nil
}

func BulkSyncUsers(ctx context.Context, inputs []BulkSyncUserInput) (BulkSyncUsersResult, error) {
	if db.DB == nil {
		return BulkSyncUsersResult{}, gorm.ErrInvalidDB
	}

	normalizedInputs := make([]BulkSyncUserInput, 0, len(inputs))
	seenUserIDs := make(map[string]struct{}, len(inputs))
	for _, input := range inputs {
		normalized, err := normalizeBulkSyncUserInput(input)
		if err != nil {
			return BulkSyncUsersResult{}, err
		}
		if _, duplicate := seenUserIDs[normalized.ID]; duplicate {
			return BulkSyncUsersResult{}, fmt.Errorf("%w: duplicate user id %s", ErrUserBulkSyncInvalidPayload, normalized.ID)
		}
		seenUserIDs[normalized.ID] = struct{}{}
		normalizedInputs = append(normalizedInputs, normalized)
	}

	result := BulkSyncUsersResult{}
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, input := range normalizedInputs {
			var current models.User
			if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&current, "id = ?", input.ID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return fmt.Errorf("%w: %s", ErrUserBulkSyncUserNotFound, input.ID)
				}
				return err
			}

			if current.IsSystemProtected() {
				result.SkippedProtected++
				continue
			}

			updates := map[string]interface{}{
				"username":     input.Username,
				"email":        input.Email,
				"phone_number": input.PhoneNumber,
				"first_name":   input.FirstName,
				"last_name":    input.LastName,
				"status":       input.Status,
				"employee_id":  input.EmployeeID,
			}
			if err := normalizeEmployeeBindingUpdate(tx, current.ID, updates); err != nil {
				return fmt.Errorf("bulk sync user %s: %w", input.ID, err)
			}

			before := userAuditSnapshot(current)
			if err := tx.Model(&current).Updates(updates).Error; err != nil {
				return mapUserUniqueViolation(err)
			}
			var updated models.User
			if err := tx.First(&updated, "id = ?", current.ID).Error; err != nil {
				return err
			}
			if err := writeUserAuditEntryWithContext(
				ctx,
				tx,
				updated.ID,
				"BULK_SYNC",
				before,
				userAuditSnapshot(updated),
				sanitizeUserAuditUpdates(updates),
				"bulk_sync",
			); err != nil {
				return err
			}
			result.Updated++
		}
		return nil
	})
	if err != nil {
		return BulkSyncUsersResult{}, err
	}
	return result, nil
}
