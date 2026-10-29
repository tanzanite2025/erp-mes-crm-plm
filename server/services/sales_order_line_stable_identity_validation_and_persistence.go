package services

import (
	"fmt"
	"xdfc-server/models"

	"gorm.io/gorm"
)

// validateAndAssignSalesOrderLineOwnershipForSave treats ID as identity and LineNo
// as presentation only. A removed (detached) ID cannot be reclaimed by a later save.
func validateAndAssignSalesOrderLineOwnershipForSave(orderID string, previousLines, nextLines []models.SalesOrderLine) error {
	previousByID := make(map[uint]models.SalesOrderLine, len(previousLines))
	for _, line := range previousLines {
		if line.ID == 0 || line.SalesOrderID != orderID {
			return fmt.Errorf("%w: invalid persisted sales order line identity", ErrSalesTransactionInvalidPayload)
		}
		previousByID[line.ID] = line
	}
	seenIDs := make(map[uint]bool, len(nextLines))
	seenLineNos := make(map[int]bool, len(nextLines))
	for _, line := range nextLines {
		if line.LineNo <= 0 || seenLineNos[line.LineNo] {
			return fmt.Errorf("%w: 明细行号必须是互不重复的正整数", ErrSalesTransactionInvalidPayload)
		}
		seenLineNos[line.LineNo] = true
		if line.SalesOrderID != "" && line.SalesOrderID != orderID {
			return fmt.Errorf("%w: 明细行不能转移到其他订单", ErrSalesTransactionInvalidPayload)
		}
		if line.ID == 0 {
			continue
		}
		if seenIDs[line.ID] {
			return fmt.Errorf("%w: 明细 ID %d 重复，请刷新后重新核对", ErrSalesTransactionInvalidPayload, line.ID)
		}
		if _, exists := previousByID[line.ID]; !exists {
			return fmt.Errorf("%w: 明细 ID %d 不属于当前订单的有效明细，请刷新后重新核对", ErrSalesTransactionInvalidPayload, line.ID)
		}
		seenIDs[line.ID] = true
	}
	for index := range nextLines {
		nextLines[index].SalesOrderID = orderID
	}
	return nil
}

func mapSalesOrderLineRequestsWithValidatedStableIdentities(current *models.SalesOrder, requests []SalesOrderLineRequest) ([]models.SalesOrderLine, error) {
	lines := make([]models.SalesOrderLine, 0, len(requests))
	for _, request := range requests {
		lines = append(lines, mapSalesOrderLineRequestToModel(request))
	}
	if err := validateAndAssignSalesOrderLineOwnershipForSave(current.ID, current.Lines, lines); err != nil {
		return nil, err
	}
	preserveSalesOrderLineExecutionFactsByStableIdentity(current.Lines, lines)
	return lines, nil
}

// Ordinary order editing cannot replace shipment and claim facts. Their domain
// commands update these fields directly, independently of client form snapshots.
func preserveSalesOrderLineExecutionFactsByStableIdentity(previousLines, nextLines []models.SalesOrderLine) {
	previousByID := make(map[uint]models.SalesOrderLine, len(previousLines))
	for _, line := range previousLines {
		previousByID[line.ID] = line
	}
	for index := range nextLines {
		previous := previousByID[nextLines[index].ID]
		nextLines[index].DeliveredQty = previous.DeliveredQty
		nextLines[index].ClaimedBy = previous.ClaimedBy
		nextLines[index].ClaimedAt = previous.ClaimedAt
		nextLines[index].Status = previous.Status
	}
}

// persistSalesOrderLinesByStableIdentityTx runs under the caller's order lock and
// transaction. Explicit updates persist zero values too; GORM's default association
// upsert only updates the foreign key of an existing line.
func persistSalesOrderLinesByStableIdentityTx(tx *gorm.DB, orderID string, lines []models.SalesOrderLine) error {
	var previousLines []models.SalesOrderLine
	if err := tx.Where("sales_order_id = ?", orderID).Find(&previousLines).Error; err != nil {
		return err
	}
	if err := validateAndAssignSalesOrderLineOwnershipForSave(orderID, previousLines, lines); err != nil {
		return err
	}
	var nextOrder models.SalesOrder
	if err := tx.First(&nextOrder, "id = ?", orderID).Error; err != nil {
		return err
	}
	nextOrder.Lines = lines
	if err := validateSalesOrderMutationAgainstActiveProductionMaterialCoverageTx(tx, &nextOrder); err != nil {
		return err
	}
	retainedIDs := make([]uint, 0, len(lines))
	for index := range lines {
		line := &lines[index]
		if line.ID == 0 {
			if err := tx.Create(line).Error; err != nil {
				return err
			}
		} else {
			result := tx.Model(&models.SalesOrderLine{}).
				Where("id = ? AND sales_order_id = ?", line.ID, orderID).
				Select("*").Omit("id", "delivered_qty", "claimed_by", "claimed_at", "status").Updates(line)
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected != 1 {
				return fmt.Errorf("%w: sales order line %d changed during save", ErrSalesTransactionVersionConflict, line.ID)
			}
		}
		retainedIDs = append(retainedIDs, line.ID)
	}
	// Preserve removed records, as the previous Association.Replace did, without
	// allowing their identities to be attached to a new line or another order.
	detached := tx.Model(&models.SalesOrderLine{}).Where("sales_order_id = ?", orderID)
	if len(retainedIDs) > 0 {
		detached = detached.Where("id NOT IN ?", retainedIDs)
	}
	return detached.Update("sales_order_id", nil).Error
}

func persistSalesOrderLineClaimFactsByStableIdentityTx(tx *gorm.DB, orderID string, lines []models.SalesOrderLine) error {
	for _, line := range lines {
		result := tx.Model(&models.SalesOrderLine{}).Where("id = ? AND sales_order_id = ?", line.ID, orderID).
			Updates(map[string]any{"claimed_by": line.ClaimedBy, "claimed_at": line.ClaimedAt})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return fmt.Errorf("%w: sales order line %d changed during claim", ErrSalesTransactionVersionConflict, line.ID)
		}
	}
	return nil
}
