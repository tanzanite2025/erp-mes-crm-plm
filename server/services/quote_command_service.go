package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrQuotePatchConflict = errors.New("quote patch conflict")
var ErrQuotePatchNotEditable = errors.New("quote status does not allow editing")

func PatchQuoteDraft(id string, req SDRTSDeltaHandlerRequest, operator string) (QuoteDetailResponse, error) {
	quoteID := strings.TrimSpace(id)
	if quoteID == "" {
		return QuoteDetailResponse{}, fmt.Errorf("invalid quote patch: quote id is required")
	}
	if !strings.EqualFold(strings.TrimSpace(req.Op), "PATCH") {
		return QuoteDetailResponse{}, fmt.Errorf("invalid quote patch: op must be PATCH")
	}
	if metadataID := strings.TrimSpace(req.Metadata.ID); metadataID != "" && metadataID != quoteID {
		return QuoteDetailResponse{}, fmt.Errorf("invalid quote patch: metadata id does not match route id")
	}
	if err := validateSupportedTopLevelDeltaKeys(req.Delta, "amount", "requirements"); err != nil {
		return QuoteDetailResponse{}, fmt.Errorf("invalid quote patch: %w", err)
	}

	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var quote models.SalesOrder
		if err := applyQuoteRecordScope(
			tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", quoteID),
		).First(&quote).Error; err != nil {
			return err
		}

		status := normalizeQuoteStatus(quote.Status)
		if status != "draft" && status != "pending" {
			return ErrQuotePatchNotEditable
		}

		updates := map[string]any{
			"updated_at": time.Now(),
			"version":    gorm.Expr("version + 1"),
		}
		if trimmedOperator := strings.TrimSpace(operator); trimmedOperator != "" {
			updates["updated_by"] = trimmedOperator
		}

		if raw, ok := req.Delta["amount"]; ok {
			oldRaw, newRaw, err := extractQuotePatchDeltaValues(raw)
			if err != nil {
				return fmt.Errorf("invalid quote patch: amount: %w", err)
			}
			var oldAmount float64
			var newAmount float64
			if err := json.Unmarshal(oldRaw, &oldAmount); err != nil {
				return fmt.Errorf("invalid quote patch: amount old value must be a number")
			}
			if err := json.Unmarshal(newRaw, &newAmount); err != nil || math.IsNaN(newAmount) || math.IsInf(newAmount, 0) {
				return fmt.Errorf("invalid quote patch: amount new value must be a finite number")
			}
			if newAmount < 0 {
				return fmt.Errorf("invalid quote patch: amount must be greater than or equal to zero")
			}
			if math.Abs(quote.Amount-oldAmount) > 1e-9 {
				return ErrQuotePatchConflict
			}
			updates["amount"] = newAmount
		}

		if raw, ok := req.Delta["requirements"]; ok {
			oldRaw, newRaw, err := extractQuotePatchDeltaValues(raw)
			if err != nil {
				return fmt.Errorf("invalid quote patch: requirements: %w", err)
			}
			var oldRequirements string
			var newRequirements string
			if err := json.Unmarshal(oldRaw, &oldRequirements); err != nil {
				return fmt.Errorf("invalid quote patch: requirements old value must be a string")
			}
			if err := json.Unmarshal(newRaw, &newRequirements); err != nil {
				return fmt.Errorf("invalid quote patch: requirements new value must be a string")
			}
			if strings.TrimSpace(quote.Requirements) != strings.TrimSpace(oldRequirements) {
				return ErrQuotePatchConflict
			}
			updates["requirements"] = strings.TrimSpace(newRequirements)
		}

		return tx.Model(&models.SalesOrder{}).Where("id = ?", quote.ID).Updates(updates).Error
	})
	if err != nil {
		return QuoteDetailResponse{}, err
	}

	return GetQuoteDetail(quoteID)
}

func extractQuotePatchDeltaValues(raw json.RawMessage) (json.RawMessage, json.RawMessage, error) {
	newValue, err := extractDeltaNewValue(raw)
	if err != nil {
		return nil, nil, err
	}
	var envelope map[string]json.RawMessage
	if err := json.Unmarshal(raw, &envelope); err != nil {
		return nil, nil, err
	}
	return envelope["o"], newValue, nil
}
