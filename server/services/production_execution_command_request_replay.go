package services

import (
	"crypto/sha256"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrProductionExecutionRequestKeyConflict = errors.New("production execution request key conflict")
var ErrProductionExecutionRoundConflict = errors.New("production execution round conflict")

func ValidateProductionExecutionCommandIdempotencyKey(key string) error {
	key = strings.TrimSpace(key)
	if key == "" || len(key) > 128 {
		return fmt.Errorf("%w: idempotencyKey must contain between 1 and 128 bytes", ErrInvalidProductionOperationExecution)
	}
	return nil
}

func executeProductionCommandWithRequestReplayTx[T any](
	tx *gorm.DB, commandType string, key string, request any, execute func() (T, error),
) (T, error) {
	var result T
	// Internal legacy callers are protected by completion-round uniqueness.
	// HTTP callers must provide a key so implicit route resolution can be replayed.
	if key == "" {
		return execute()
	}
	if err := ValidateProductionExecutionCommandIdempotencyKey(key); err != nil {
		return result, err
	}
	requestJSON, err := json.Marshal(request)
	if err != nil {
		return result, err
	}
	fingerprint := sha256.Sum256(requestJSON)
	receipt := models.ProductionExecutionCommandRequestReceipt{
		CommandType: commandType, IdempotencyKey: key,
		RequestFingerprint: hex.EncodeToString(fingerprint[:]), CreatedAt: time.Now().UTC(),
	}
	claim := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&receipt)
	if claim.Error != nil {
		return result, claim.Error
	}
	if claim.RowsAffected == 0 {
		var existing models.ProductionExecutionCommandRequestReceipt
		if err := tx.Where("command_type = ? AND idempotency_key = ?", commandType, key).First(&existing).Error; err != nil {
			return result, err
		}
		if existing.RequestFingerprint != receipt.RequestFingerprint {
			return result, fmt.Errorf("%w: idempotencyKey was already used for a different command", ErrProductionExecutionRequestKeyConflict)
		}
		if err := json.Unmarshal([]byte(existing.ResponseSnapshot), &result); err != nil {
			return result, fmt.Errorf("failed to restore production command response: %w", err)
		}
		return result, nil
	}
	result, err = execute()
	if err != nil {
		return result, err
	}
	responseJSON, err := json.Marshal(result)
	if err != nil {
		return result, err
	}
	err = tx.Model(&models.ProductionExecutionCommandRequestReceipt{}).
		Where("command_type = ? AND idempotency_key = ?", commandType, key).
		Update("response_snapshot", string(responseJSON)).Error
	return result, err
}

func lockProductionBarcodeExecutionTransaction(tx *gorm.DB, barcode string) error {
	if tx.Dialector.Name() != "postgres" {
		return nil
	}
	lockHash := sha256.Sum256([]byte("production-barcode-execution:" + barcode))
	return tx.Exec("SELECT pg_advisory_xact_lock(?)", int64(binary.BigEndian.Uint64(lockHash[:8]))).Error
}

func resolveProductionBarcodeExecutionRoundTx(tx *gorm.DB, request RecordProductionOperationExecutionRequest) (int64, *time.Time, error) {
	var reworkCount int64
	query := tx.Unscoped().Model(&models.ProductionOperationExecution{}).
		Where("product_barcode = ? AND action = ?", request.ProductBarcode, ProductionOperationActionRework)
	if err := query.Count(&reworkCount).Error; err != nil {
		return 0, nil, err
	}
	round := reworkCount + 1
	if request.ExecutionRound > 0 && request.ExecutionRound != round {
		return 0, nil, fmt.Errorf("%w: expected execution round %d, current round is %d", ErrProductionExecutionRoundConflict, request.ExecutionRound, round)
	}
	if request.Action == ProductionOperationActionRework {
		return round + 1, nil, nil
	}
	if reworkCount == 0 {
		return round, nil, nil
	}
	var lastRework models.ProductionOperationExecution
	if err := query.Order("created_at DESC, id DESC").First(&lastRework).Error; err != nil {
		return 0, nil, err
	}
	return round, &lastRework.CreatedAt, nil
}

func productionOperationWorkIdentityKey(request RecordProductionOperationExecutionRequest) string {
	identity, _ := json.Marshal([]string{request.ProductBarcode,
		normalizeProductionExecutionUUIDIdentity(request.RouteStepID), normalizeProductionExecutionUUIDIdentity(request.ProcessStepID)})
	hash := sha256.Sum256(identity)
	return hex.EncodeToString(hash[:])
}

func normalizeProductionExecutionUUIDIdentity(value string) string {
	return normalizeUUIDIdentity(value)
}

func findCompletedProductionWorkInExecutionRoundTx(
	tx *gorm.DB, request RecordProductionOperationExecutionRequest, round int64, lastReworkAt *time.Time,
) (productionOperationExecutionRecordResult, bool, error) {
	var operation models.ProductionOperationExecution
	legacyQuery := tx.Unscoped().Model(&models.ProductionOperationExecution{}).
		Where("work_identity_key = '' AND product_barcode = ? AND process_step_id = ?", request.ProductBarcode, request.ProcessStepID).
		Where("COALESCE(CAST(route_step_id AS TEXT), '') = ?", request.RouteStepID)
	if lastReworkAt != nil {
		legacyQuery = legacyQuery.Where("created_at > ?", *lastReworkAt)
	}
	query := tx.Unscoped().Where("action = ?", ProductionOperationActionComplete).
		Where(tx.Where("work_identity_key = ? AND execution_round = ?", productionOperationWorkIdentityKey(request), round).
			Or("id IN (?)", legacyQuery.Select("id")))
	err := query.Order("created_at DESC, id DESC").First(&operation).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return productionOperationExecutionRecordResult{}, false, nil
	}
	if err != nil {
		return productionOperationExecutionRecordResult{}, false, err
	}
	state, _, err := findProductBarcodeStateTx(tx, request.ProductBarcode)
	if err != nil {
		return productionOperationExecutionRecordResult{}, false, err
	}
	return productionOperationExecutionRecordResult{Operation: operation, State: state, Replayed: true}, true, nil
}
