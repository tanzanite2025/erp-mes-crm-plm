// Package services - 库存写操作(入库 / 出货 / 调拨 / 盘点同步)事务中心。
//
// 此文件管理 Inventory / InboundRecord / ShipmentRecord 的写路径,以及联动审计日志:
//   - PatchInventoryRecord / BulkSyncInventory  增量/批量改库存(乐观锁)
//   - RecordInbound + applyInboundToPurchaseOrderTx  入库并回写采购单已收数量
//   - CreateShipmentDraft + CommitShipment + applyShipmentToSalesOrderTx  发货并回写销售单已发数量
//   - VoidShipment + rollbackShipmentFromSalesOrderTx  作废发货并回退已发数量
//   - TransferInventory                                  跨仓库调拨
//   - ReconcileNegativeInventory                         负库存对账(数据修复)
//
// 关键不变量:
//   - 写操作 → 写审计 在同一 GORM 事务内,保证可追溯
//   - mergeInventoryForSync 处理批量同步时的字段优先级(导入数据 vs 现有数据)
//   - audit operator/IP 从 ctx 解析,fallback 到入参 fallbackOperator
package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func inventoryUpdateMap(inv models.Inventory) map[string]interface{} {
	return map[string]interface{}{
		"material_id":       inv.MaterialID,
		"material_name":     inv.MaterialName,
		"material_code":     inv.MaterialCode,
		"material_spec":     inv.MaterialSpec,
		"quantity":          inv.Quantity,
		"total_value":       inv.TotalValue,
		"average_unit_cost": inv.AverageUnitCost,
		"category_code":     inv.CategoryCode,
		"batch_no":          inv.BatchNo,
		"uom":               inv.UOM,
	}
}

func updateInventoryRecord(tx *gorm.DB, inv *models.Inventory) error {
	return tx.Model(inv).Updates(inventoryUpdateMap(*inv)).Error
}

func mergeInventoryForSync(existing *models.Inventory, incoming models.Inventory) {
	existing.MaterialID = incoming.MaterialID
	if strings.TrimSpace(incoming.MaterialName) != "" {
		existing.MaterialName = incoming.MaterialName
	}
	if strings.TrimSpace(incoming.MaterialCode) != "" {
		existing.MaterialCode = incoming.MaterialCode
	}
	if strings.TrimSpace(incoming.MaterialSpec) != "" {
		existing.MaterialSpec = incoming.MaterialSpec
	}
	existing.Quantity = incoming.Quantity
	existing.TotalValue = incoming.TotalValue
	existing.AverageUnitCost = incoming.AverageUnitCost
	existing.CategoryCode = incoming.CategoryCode
	existing.BatchNo = incoming.BatchNo
	if strings.TrimSpace(incoming.UOM) != "" {
		existing.UOM = incoming.UOM
	}
}

var (
	ErrShipmentNotFound              = errors.New("shipment not found")
	ErrShipmentNotDraft              = errors.New("only DRAFT shipment can be committed")
	ErrVoidInProgress                = errors.New("void shipment in progress")
	ErrInventoryPatchVersionConflict = errors.New("inventory patch version conflict")
	ErrShipmentPatchVersionConflict  = errors.New("shipment patch version conflict")
)

const inventoryValueTolerance = 1e-9

type TransferInventoryInput struct {
	MaterialID   string
	Quantity     float64
	FromCategory string
	ToCategory   string
	BatchNo      string
}

func optimisticVersionFromTimestamps(updatedAt time.Time, createdAt time.Time) int {
	versionTime := updatedAt
	if versionTime.IsZero() {
		versionTime = createdAt
	}
	if versionTime.IsZero() {
		return 1
	}
	version := versionTime.UnixMilli()
	if version < 1 {
		return 1
	}
	return int(version)
}

func auditDeltaKeys(deltaKeys []string) json.RawMessage {
	diff, _ := json.Marshal(map[string]any{
		"deltaKeys": deltaKeys,
	})
	return diff
}

func inventoryAuditSnapshot(inv models.Inventory) map[string]any {
	return map[string]any{
		"id":              strings.TrimSpace(inv.ID),
		"materialId":      strings.TrimSpace(inv.MaterialID),
		"materialName":    strings.TrimSpace(inv.MaterialName),
		"materialCode":    strings.TrimSpace(inv.MaterialCode),
		"materialSpec":    strings.TrimSpace(inv.MaterialSpec),
		"quantity":        inv.Quantity,
		"totalValue":      inv.TotalValue,
		"averageUnitCost": inv.AverageUnitCost,
		"categoryCode":    strings.TrimSpace(inv.CategoryCode),
		"batchNo":         strings.TrimSpace(inv.BatchNo),
		"uom":             strings.TrimSpace(inv.UOM),
	}
}

func inventoryAuditDiff(before map[string]any, payload map[string]any) json.RawMessage {
	body := map[string]any{
		"payload": payload,
	}
	if len(before) > 0 {
		body["before"] = before
	}
	diff, _ := json.Marshal(body)
	return diff
}

func inboundAuditSnapshot(inbound models.InboundRecord) map[string]any {
	return map[string]any{
		"id":                  strings.TrimSpace(inbound.ID),
		"materialId":          strings.TrimSpace(inbound.MaterialID),
		"materialName":        strings.TrimSpace(inbound.MaterialName),
		"materialCode":        strings.TrimSpace(inbound.MaterialCode),
		"sourceType":          strings.TrimSpace(inbound.SourceType),
		"sourceId":            strings.TrimSpace(inbound.SourceID),
		"sourceLineId":        inbound.SourceLineID,
		"purchaseOrderId":     strings.TrimSpace(inbound.PurchaseOrderID),
		"purchaseOrderLineId": inbound.PurchaseOrderLineID,
		"quantity":            inbound.Quantity,
		"purchasePrice":       inbound.PurchasePrice,
		"targetCategory":      strings.TrimSpace(inbound.TargetCategory),
		"batchNo":             strings.TrimSpace(inbound.BatchNo),
		"inboundDate":         inbound.InboundDate,
		"operator":            strings.TrimSpace(inbound.Operator),
		"remarks":             strings.TrimSpace(inbound.Remarks),
	}
}

func shipmentAuditSnapshot(shipment models.ShipmentRecord) map[string]any {
	return map[string]any{
		"id":               strings.TrimSpace(shipment.ID),
		"materialId":       strings.TrimSpace(shipment.MaterialID),
		"materialName":     strings.TrimSpace(shipment.MaterialName),
		"materialCode":     strings.TrimSpace(shipment.MaterialCode),
		"sourceType":       strings.TrimSpace(shipment.SourceType),
		"sourceId":         strings.TrimSpace(shipment.SourceID),
		"sourceLineId":     shipment.SourceLineID,
		"salesOrderId":     strings.TrimSpace(shipment.SalesOrderID),
		"salesOrderLineId": shipment.SalesOrderLineID,
		"quantity":         shipment.Quantity,
		"sourceCategory":   strings.TrimSpace(shipment.SourceCategory),
		"batchNo":          strings.TrimSpace(shipment.BatchNo),
		"orderNo":          strings.TrimSpace(shipment.OrderNo),
		"trackingNo":       strings.TrimSpace(shipment.TrackingNo),
		"status":           strings.TrimSpace(shipment.Status),
		"cogs":             shipment.COGS,
		"shipmentDate":     shipment.ShipmentDate,
		"operator":         strings.TrimSpace(shipment.Operator),
		"remarks":          strings.TrimSpace(shipment.Remarks),
	}
}

func inventoryAuditIdentityFromContext(ctx context.Context, fallbackOperator string) (string, string) {
	operator := strings.TrimSpace(fallbackOperator)
	actor, ok := audit.ActorFromContext(ctx)
	if ok {
		if strings.TrimSpace(actor.Username) != "" {
			operator = strings.TrimSpace(actor.Username)
		} else if strings.TrimSpace(actor.UserID) != "" {
			operator = strings.TrimSpace(actor.UserID)
		}
		if operator == "" {
			operator = "system"
		}
		return operator, strings.TrimSpace(actor.IP)
	}
	if operator == "" {
		operator = "system"
	}
	return operator, ""
}

func writeAuditEntry(tx *gorm.DB, module string, targetID string, action string, before map[string]any, payload map[string]any, operator string, ip string) error {
	return defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   strings.TrimSpace(module),
		TargetID: strings.TrimSpace(targetID),
		Action:   strings.TrimSpace(action),
		Diff:     inventoryAuditDiff(before, payload),
		Operator: strings.TrimSpace(operator),
		IP:       strings.TrimSpace(ip),
	})
}

func writeInventoryAuditEntry(tx *gorm.DB, targetID string, action string, before map[string]any, payload map[string]any, operator string, ip string) error {
	return writeAuditEntry(tx, AuditModuleInventory, targetID, action, before, payload, operator, ip)
}

func writeShipmentAuditEntry(tx *gorm.DB, targetID string, action string, before map[string]any, payload map[string]any, operator string, ip string) error {
	return writeAuditEntry(tx, AuditModuleShipment, targetID, action, before, payload, operator, ip)
}

func writeInventoryAuditEntryWithContext(ctx context.Context, tx *gorm.DB, targetID string, action string, before map[string]any, payload map[string]any, fallbackOperator string) error {
	operator, ip := inventoryAuditIdentityFromContext(ctx, fallbackOperator)
	return writeInventoryAuditEntry(tx, targetID, action, before, payload, operator, ip)
}

func writeShipmentAuditEntryWithContext(ctx context.Context, tx *gorm.DB, targetID string, action string, before map[string]any, payload map[string]any, fallbackOperator string) error {
	operator, ip := inventoryAuditIdentityFromContext(ctx, fallbackOperator)
	return writeShipmentAuditEntry(tx, targetID, action, before, payload, operator, ip)
}

type inventoryTransferAuditResult struct {
	fromBefore    models.Inventory
	fromAfter     models.Inventory
	toBefore      *models.Inventory
	toAfter       models.Inventory
	transferValue float64
}

func PatchInventoryRecord(ctx context.Context, id string, patch PatchInventoryRequest, deltaKeys []string) (models.Inventory, error) {
	var updated models.Inventory
	operator, ip := inventoryAuditIdentityFromContext(ctx, "")

	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var inventory models.Inventory
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&inventory, "id = ?", id).Error; err != nil {
			return err
		}

		if patch.Version != optimisticVersionFromTimestamps(inventory.UpdatedAt, inventory.CreatedAt) {
			return ErrInventoryPatchVersionConflict
		}

		ApplyPatchInventoryRequestToModel(&inventory, patch)
		if inventory.Quantity < 0 {
			return errors.New("[CRITICAL_LOGIC_ERROR] inventory quantity cannot be negative")
		}
		if inventory.TotalValue < 0 {
			return errors.New("[CRITICAL_LOGIC_ERROR] inventory total value cannot be negative")
		}
		if inventory.AverageUnitCost < 0 {
			return errors.New("[CRITICAL_LOGIC_ERROR] inventory unit cost cannot be negative")
		}
		if strings.TrimSpace(inventory.MaterialID) == "" || strings.TrimSpace(inventory.CategoryCode) == "" {
			return errors.New("[CRITICAL_DATA_INTEGRITY] inventory material and category are required")
		}

		if err := tx.Model(&inventory).Updates(inventoryUpdateMap(inventory)).Error; err != nil {
			return err
		}
		if err := tx.First(&inventory, "id = ?", id).Error; err != nil {
			return err
		}

		if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
			Module:   AuditModuleInventory,
			TargetID: inventory.ID,
			Action:   "INVENTORY_SAVE",
			Diff:     auditDeltaKeys(deltaKeys),
			Operator: strings.TrimSpace(operator),
			IP:       strings.TrimSpace(ip),
		}); err != nil {
			return err
		}

		updated = inventory
		return nil
	})
	if err != nil {
		return models.Inventory{}, err
	}

	return updated, nil
}

func PatchShipmentDraftRecord(ctx context.Context, id string, patch PatchShipmentRequest, deltaKeys []string) (models.ShipmentRecord, error) {
	var updated models.ShipmentRecord
	operator, ip := inventoryAuditIdentityFromContext(ctx, "")

	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var shipment models.ShipmentRecord
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&shipment, "id = ?", id).Error; err != nil {
			return err
		}
		if isAfterSalesExecutionSourceType(shipment.SourceType) {
			return ErrAfterSalesExecutionDedicatedPath
		}
		if shipment.Status != "DRAFT" {
			return ErrShipmentNotDraft
		}
		if patch.Version != optimisticVersionFromTimestamps(shipment.UpdatedAt, shipment.CreatedAt) {
			return ErrShipmentPatchVersionConflict
		}

		ApplyPatchShipmentRequestToModel(&shipment, patch)
		if shipment.Quantity <= 0 {
			return errors.New("[CRITICAL_LOGIC_ERROR] shipment quantity must be greater than zero")
		}
		if strings.TrimSpace(shipment.MaterialID) == "" || strings.TrimSpace(shipment.SourceCategory) == "" {
			return errors.New("[CRITICAL_DATA_INTEGRITY] shipment material and source category are required")
		}

		if err := tx.Model(&shipment).Updates(map[string]any{
			"material_id":         shipment.MaterialID,
			"material_name":       shipment.MaterialName,
			"material_code":       shipment.MaterialCode,
			"sales_order_id":      shipment.SalesOrderID,
			"sales_order_line_id": shipment.SalesOrderLineID,
			"quantity":            shipment.Quantity,
			"source_category":     shipment.SourceCategory,
			"batch_no":            shipment.BatchNo,
			"order_no":            shipment.OrderNo,
			"shipment_date":       shipment.ShipmentDate,
			"operator":            shipment.Operator,
			"remarks":             shipment.Remarks,
		}).Error; err != nil {
			return err
		}
		if err := tx.First(&shipment, "id = ?", id).Error; err != nil {
			return err
		}

		if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
			Module:   AuditModuleShipment,
			TargetID: shipment.ID,
			Action:   "SHIPMENT_SAVE",
			Diff:     auditDeltaKeys(deltaKeys),
			Operator: strings.TrimSpace(operator),
			IP:       strings.TrimSpace(ip),
		}); err != nil {
			return err
		}

		updated = shipment
		return nil
	})
	if err != nil {
		return models.ShipmentRecord{}, err
	}

	return updated, nil
}

func CreateShipmentDraft(shipment *models.ShipmentRecord) error {
	if shipment == nil {
		return errors.New("shipment is required")
	}
	if isAfterSalesExecutionSourceType(shipment.SourceType) {
		return ErrAfterSalesExecutionDedicatedPath
	}
	if strings.TrimSpace(shipment.Status) == "" {
		shipment.Status = "DRAFT"
	}
	return db.DB.Create(shipment).Error
}

type inboundInventoryAuditResult struct {
	inventoryBefore *models.Inventory
	inventoryAfter  models.Inventory
}

type inboundRecordOptions struct {
	skipZeroValueVoucher bool
	auditAction          string
	auditOperator        string
	auditIP              string
}

func recordInboundTx(
	tx *gorm.DB,
	inbound *models.InboundRecord,
	options inboundRecordOptions,
) (inboundInventoryAuditResult, error) {
	if tx == nil || inbound == nil {
		return inboundInventoryAuditResult{}, errors.New("transaction and inbound are required")
	}
	auditResult := inboundInventoryAuditResult{}
	var material models.Material
	if err := tx.Where("id = ?", inbound.MaterialID).First(&material).Error; err != nil {
		return inboundInventoryAuditResult{}, errors.New("[CRITICAL_DATA_INTEGRITY] inbound failed: material not found: " + inbound.MaterialID)
	}

	if err := tx.Create(inbound).Error; err != nil {
		return inboundInventoryAuditResult{}, err
	}

	var inv models.Inventory
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("material_id = ? AND category_code = ? AND batch_no = ?", inbound.MaterialID, inbound.TargetCategory, inbound.BatchNo).
		First(&inv).Error
	inboundValue := inbound.Quantity * inbound.PurchasePrice
	if errors.Is(err, gorm.ErrRecordNotFound) {
		if inbound.Quantity == 0 {
			return inboundInventoryAuditResult{}, errors.New("[CRITICAL_LOGIC_ERROR] denominator equals zero")
		}
		inv = models.Inventory{
			MaterialID:      inbound.MaterialID,
			Quantity:        inbound.Quantity,
			TotalValue:      inboundValue,
			AverageUnitCost: inboundValue / inbound.Quantity,
			CategoryCode:    inbound.TargetCategory,
			BatchNo:         inbound.BatchNo,
		}
		if err := tx.Create(&inv).Error; err != nil {
			return inboundInventoryAuditResult{}, err
		}
		auditResult.inventoryAfter = inv
	} else {
		if err != nil {
			return inboundInventoryAuditResult{}, err
		}

		beforeInventory := inv
		auditResult.inventoryBefore = &beforeInventory
		oldQuantity := inv.Quantity
		oldTotalValue := oldQuantity * inv.AverageUnitCost
		newQuantity := oldQuantity + inbound.Quantity
		if newQuantity == 0 {
			return inboundInventoryAuditResult{}, errors.New("[CRITICAL_LOGIC_ERROR] denominator equals zero")
		}
		if newQuantity < 0 {
			return inboundInventoryAuditResult{}, errors.New("[CRITICAL_LOGIC_ERROR] negative inventory quantity")
		}
		newTotalValue := oldTotalValue + inboundValue

		inv.Quantity = newQuantity
		inv.TotalValue = newTotalValue
		inv.AverageUnitCost = newTotalValue / newQuantity
		if err := updateInventoryRecord(tx, &inv); err != nil {
			return inboundInventoryAuditResult{}, err
		}
		auditResult.inventoryAfter = inv
	}

	if err := applyInboundToPurchaseOrderTx(tx, inbound); err != nil {
		return inboundInventoryAuditResult{}, err
	}

	if !options.skipZeroValueVoucher || inbound.Quantity*inbound.PurchasePrice > inventoryValueTolerance {
		_, err = CreateInboundVoucherTx(tx, *inbound)
		if err != nil {
			return inboundInventoryAuditResult{}, err
		}
	}
	if action := strings.TrimSpace(options.auditAction); action != "" {
		var before map[string]any
		if auditResult.inventoryBefore != nil {
			before = map[string]any{
				"inventory": inventoryAuditSnapshot(*auditResult.inventoryBefore),
			}
		}
		payload := inboundAuditSnapshot(*inbound)
		payload["inventoryId"] = strings.TrimSpace(auditResult.inventoryAfter.ID)
		payload["inventory"] = inventoryAuditSnapshot(auditResult.inventoryAfter)
		if err := writeInventoryAuditEntry(
			tx,
			inbound.ID,
			action,
			before,
			payload,
			strings.TrimSpace(options.auditOperator),
			strings.TrimSpace(options.auditIP),
		); err != nil {
			return inboundInventoryAuditResult{}, err
		}
	}
	return auditResult, nil
}

func RecordInbound(ctx context.Context, inbound *models.InboundRecord) error {
	if inbound == nil {
		return errors.New("inbound is required")
	}
	if isAfterSalesExecutionSourceType(inbound.SourceType) {
		return ErrAfterSalesExecutionDedicatedPath
	}
	if inbound.Quantity <= 0 {
		return errors.New("[CRITICAL_LOGIC_ERROR] invalid inbound quantity")
	}
	if inbound.PurchasePrice < 0 {
		return errors.New("[CRITICAL_LOGIC_ERROR] invalid inbound purchase price")
	}
	if strings.TrimSpace(inbound.ID) == "" {
		inbound.ID = uuid.NewString()
	}
	if strings.TrimSpace(inbound.Operator) == "" {
		operator, _ := inventoryAuditIdentityFromContext(ctx, "")
		if operator != "system" {
			inbound.Operator = operator
		}
	}

	var auditResult inboundInventoryAuditResult
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var txErr error
		auditResult, txErr = recordInboundTx(tx, inbound, inboundRecordOptions{})
		if txErr != nil {
			return txErr
		}

		var before map[string]any
		if auditResult.inventoryBefore != nil {
			before = map[string]any{
				"inventory": inventoryAuditSnapshot(*auditResult.inventoryBefore),
			}
		}
		payload := inboundAuditSnapshot(*inbound)
		payload["inventoryId"] = strings.TrimSpace(auditResult.inventoryAfter.ID)
		payload["inventory"] = inventoryAuditSnapshot(auditResult.inventoryAfter)
		return writeInventoryAuditEntryWithContext(ctx, tx, inbound.ID, "INVENTORY_INBOUND", before, payload, strings.TrimSpace(inbound.Operator))
	})
	if err == nil {
		var latestInv models.Inventory
		if db.DB.Where("material_id = ? AND category_code = ? AND batch_no = ?", inbound.MaterialID, inbound.TargetCategory, inbound.BatchNo).First(&latestInv).Error == nil {
			syncInventoryToSearch(latestInv)
		}
	}
	return err
}

func applyInboundToPurchaseOrderTx(tx *gorm.DB, inbound *models.InboundRecord) error {
	if tx == nil || inbound == nil {
		return nil
	}
	purchaseOrderID := strings.TrimSpace(inbound.PurchaseOrderID)
	if purchaseOrderID == "" || inbound.PurchaseOrderLineID == 0 {
		return nil
	}

	result := tx.Model(&models.PurchaseOrderLine{}).
		Where("id = ? AND purchase_order_id = ?", inbound.PurchaseOrderLineID, purchaseOrderID).
		Updates(map[string]any{
			"received_qty": gorm.Expr("received_qty + ?", inbound.Quantity),
			"version":      gorm.Expr("version + 1"),
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("[CRITICAL_DATA_INTEGRITY] inbound failed: purchase order line not found")
	}

	_, err := recalculatePurchaseOrderStatusTx(tx, purchaseOrderID)
	return err
}

func applyShipmentToSalesOrderTx(tx *gorm.DB, shipment *models.ShipmentRecord) error {
	if tx == nil || shipment == nil {
		return nil
	}
	salesOrderID := strings.TrimSpace(shipment.SalesOrderID)
	if salesOrderID == "" || shipment.SalesOrderLineID == 0 {
		return nil
	}

	result := tx.Model(&models.SalesOrderLine{}).
		Where("id = ? AND sales_order_id = ?", shipment.SalesOrderLineID, salesOrderID).
		Update("delivered_qty", gorm.Expr("delivered_qty + ?", shipment.Quantity))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("[CRITICAL_DATA_INTEGRITY] shipment commit failed: sales order line not found")
	}

	_, err := RecalculateSalesOrderStatusTx(tx, salesOrderID)
	return err
}

func rollbackShipmentFromSalesOrderTx(tx *gorm.DB, shipment *models.ShipmentRecord) error {
	if tx == nil || shipment == nil {
		return nil
	}
	salesOrderID := strings.TrimSpace(shipment.SalesOrderID)
	if salesOrderID == "" || shipment.SalesOrderLineID == 0 {
		return nil
	}

	result := tx.Model(&models.SalesOrderLine{}).
		Where("id = ? AND sales_order_id = ?", shipment.SalesOrderLineID, salesOrderID).
		Update("delivered_qty", gorm.Expr("CASE WHEN delivered_qty >= ? THEN delivered_qty - ? ELSE 0 END", shipment.Quantity, shipment.Quantity))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("[CRITICAL_DATA_INTEGRITY] shipment rollback failed: sales order line not found")
	}

	_, err := RecalculateSalesOrderStatusTx(tx, salesOrderID)
	return err
}

type shipmentCommitOptions struct {
	updateSalesOrder     bool
	auditAction          string
	skipZeroValueVoucher bool
}

func commitShipmentRecordTx(
	ctx context.Context,
	tx *gorm.DB,
	shipment *models.ShipmentRecord,
	options shipmentCommitOptions,
) error {
	if tx == nil || shipment == nil {
		return errors.New("transaction and shipment are required")
	}
	if shipment.Quantity <= 0 {
		return errors.New("[CRITICAL_LOGIC_ERROR] invalid shipment quantity")
	}
	if strings.TrimSpace(shipment.MaterialID) == "" || strings.TrimSpace(shipment.SourceCategory) == "" {
		return errors.New("[CRITICAL_DATA_INTEGRITY] shipment material and source category are required")
	}
	if strings.TrimSpace(shipment.ID) == "" {
		shipment.ID = uuid.NewString()
	}

	var existingShipment models.ShipmentRecord
	existingErr := tx.First(&existingShipment, "id = ?", shipment.ID).Error
	if existingErr != nil && !errors.Is(existingErr, gorm.ErrRecordNotFound) {
		return existingErr
	}
	hasExistingShipment := existingErr == nil
	if hasExistingShipment && strings.ToUpper(strings.TrimSpace(existingShipment.Status)) != "DRAFT" {
		return ErrShipmentNotDraft
	}

	var inv models.Inventory
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("material_id = ? AND category_code = ? AND batch_no = ?", shipment.MaterialID, shipment.SourceCategory, shipment.BatchNo).
		First(&inv).Error; err != nil {
		return errors.New("inventory record not found for shipment commit")
	}
	if inv.Quantity+inventoryValueTolerance < shipment.Quantity {
		return fmt.Errorf("[CRITICAL_STOCK_SHORTAGE] insufficient inventory (current: %g)", inv.Quantity)
	}

	beforeInventory := inv
	cogs := shipment.Quantity * inv.AverageUnitCost
	newTotalValue := inv.TotalValue - cogs
	if newTotalValue < -inventoryValueTolerance {
		return errors.New("[CRITICAL_LOGIC_ERROR] negative inventory value")
	}
	if math.Abs(newTotalValue) <= inventoryValueTolerance {
		newTotalValue = 0
	}

	inv.Quantity -= shipment.Quantity
	if math.Abs(inv.Quantity) <= inventoryValueTolerance {
		inv.Quantity = 0
	}
	inv.TotalValue = newTotalValue
	if inv.Quantity > 0 {
		inv.AverageUnitCost = inv.TotalValue / inv.Quantity
	} else {
		inv.AverageUnitCost = 0
	}
	if err := updateInventoryRecord(tx, &inv); err != nil {
		return err
	}

	shipment.COGS = cogs
	shipment.Status = "COMMITTED"
	if hasExistingShipment {
		if err := tx.Model(&models.ShipmentRecord{}).Where("id = ?", shipment.ID).Updates(map[string]any{
			"status": "COMMITTED",
			"cogs":   shipment.COGS,
		}).Error; err != nil {
			return err
		}
	} else if err := tx.Create(shipment).Error; err != nil {
		return err
	}

	if options.updateSalesOrder {
		if err := applyShipmentToSalesOrderTx(tx, shipment); err != nil {
			return err
		}
	}

	if !options.skipZeroValueVoucher || shipment.COGS > inventoryValueTolerance {
		if _, err := CreateShipmentVoucherTx(tx, *shipment); err != nil {
			return err
		}
	}

	before := map[string]any{
		"inventory": inventoryAuditSnapshot(beforeInventory),
	}
	if hasExistingShipment {
		before["shipment"] = shipmentAuditSnapshot(existingShipment)
	}
	payload := map[string]any{
		"shipment":  shipmentAuditSnapshot(*shipment),
		"inventory": inventoryAuditSnapshot(inv),
	}
	action := strings.TrimSpace(options.auditAction)
	if action == "" {
		action = "SHIPMENT_COMMIT"
	}
	if ctx != nil {
		return writeShipmentAuditEntryWithContext(ctx, tx, shipment.ID, action, before, payload, strings.TrimSpace(shipment.Operator))
	}
	return writeShipmentAuditEntry(tx, shipment.ID, action, before, payload, strings.TrimSpace(shipment.Operator), "")
}

func CommitShipment(ctx context.Context, id string) (InventoryShipmentRecordResponse, error) {
	var shipment models.ShipmentRecord
	if err := db.DB.WithContext(ctx).First(&shipment, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return InventoryShipmentRecordResponse{}, ErrShipmentNotFound
		}
		return InventoryShipmentRecordResponse{}, err
	}

	if isAfterSalesExecutionSourceType(shipment.SourceType) {
		return InventoryShipmentRecordResponse{}, ErrAfterSalesExecutionDedicatedPath
	}
	if shipment.Status != "DRAFT" {
		return InventoryShipmentRecordResponse{}, ErrShipmentNotDraft
	}
	if shipment.Quantity <= 0 {
		return InventoryShipmentRecordResponse{}, errors.New("[CRITICAL_LOGIC_ERROR] invalid shipment quantity")
	}

	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		return commitShipmentRecordTx(ctx, tx, &shipment, shipmentCommitOptions{
			updateSalesOrder: true,
			auditAction:      "SHIPMENT_COMMIT",
		})
	})
	if err == nil {
		var latestInv models.Inventory
		if db.DB.Where("material_id = ? AND category_code = ? AND batch_no = ?", shipment.MaterialID, shipment.SourceCategory, shipment.BatchNo).First(&latestInv).Error == nil {
			syncInventoryToSearch(latestInv)
		}
		if err := db.DB.First(&shipment, "id = ?", id).Error; err != nil {
			return InventoryShipmentRecordResponse{}, err
		}
		return MapShipmentRecordToResponse(shipment), nil
	}
	return InventoryShipmentRecordResponse{}, err
}

func transferInventoryTx(tx *gorm.DB, input TransferInventoryInput) (inventoryTransferAuditResult, error) {
	var from models.Inventory
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("material_id = ? AND category_code = ? AND batch_no = ?", input.MaterialID, input.FromCategory, input.BatchNo).
		First(&from).Error; err != nil {
		return inventoryTransferAuditResult{}, errors.New("source inventory record not found")
	}
	if input.Quantity <= 0 {
		return inventoryTransferAuditResult{}, errors.New("[CRITICAL_LOGIC_ERROR] transfer quantity must be greater than zero")
	}
	if from.Quantity < input.Quantity {
		return inventoryTransferAuditResult{}, errors.New("source inventory shortage")
	}
	result := inventoryTransferAuditResult{fromBefore: from}
	transferValue := input.Quantity * from.AverageUnitCost
	from.Quantity -= input.Quantity
	from.TotalValue -= transferValue
	if from.TotalValue < 0 && math.Abs(from.TotalValue) <= inventoryValueTolerance {
		from.TotalValue = 0
	}
	if from.Quantity > 0 {
		from.AverageUnitCost = from.TotalValue / from.Quantity
	} else {
		from.AverageUnitCost = 0
	}
	if err := updateInventoryRecord(tx, &from); err != nil {
		return inventoryTransferAuditResult{}, err
	}
	result.fromAfter = from

	var to models.Inventory
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("material_id = ? AND category_code = ? AND batch_no = ?", input.MaterialID, input.ToCategory, input.BatchNo).
		First(&to).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		toUnitCost := 0.0
		if input.Quantity > 0 {
			toUnitCost = transferValue / input.Quantity
		}
		to.ID = uuid.NewString()
		to = models.Inventory{
			BaseModel:       models.BaseModel{ID: to.ID},
			MaterialID:      input.MaterialID,
			MaterialName:    from.MaterialName,
			MaterialCode:    from.MaterialCode,
			MaterialSpec:    from.MaterialSpec,
			Quantity:        input.Quantity,
			TotalValue:      transferValue,
			AverageUnitCost: toUnitCost,
			CategoryCode:    input.ToCategory,
			BatchNo:         input.BatchNo,
			UOM:             from.UOM,
		}
		if err := tx.Create(&to).Error; err != nil {
			return inventoryTransferAuditResult{}, err
		}
		result.toAfter = to
		result.transferValue = transferValue
		return result, nil
	}
	if err != nil {
		return inventoryTransferAuditResult{}, err
	}
	toBefore := to
	result.toBefore = &toBefore

	previousToQuantity := to.Quantity
	to.MaterialName = from.MaterialName
	to.MaterialCode = from.MaterialCode
	to.MaterialSpec = from.MaterialSpec
	to.UOM = from.UOM
	to.Quantity += input.Quantity
	to.TotalValue += transferValue
	if to.Quantity > 0 {
		to.AverageUnitCost = to.TotalValue / to.Quantity
	} else if previousToQuantity == 0 {
		to.AverageUnitCost = 0
	}
	if err := updateInventoryRecord(tx, &to); err != nil {
		return inventoryTransferAuditResult{}, err
	}
	result.toAfter = to
	result.transferValue = transferValue
	return result, nil
}

func TransferInventory(ctx context.Context, input TransferInventoryInput) error {
	var transferResult inventoryTransferAuditResult
	err := db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var err error
		transferResult, err = transferInventoryTx(tx, input)
		if err != nil {
			return err
		}

		before := map[string]any{
			"from": inventoryAuditSnapshot(transferResult.fromBefore),
		}
		if transferResult.toBefore != nil {
			before["to"] = inventoryAuditSnapshot(*transferResult.toBefore)
		}
		payload := map[string]any{
			"materialId":      strings.TrimSpace(input.MaterialID),
			"fromCategory":    strings.TrimSpace(input.FromCategory),
			"toCategory":      strings.TrimSpace(input.ToCategory),
			"batchNo":         strings.TrimSpace(input.BatchNo),
			"quantity":        input.Quantity,
			"transferValue":   transferResult.transferValue,
			"fromInventoryId": strings.TrimSpace(transferResult.fromAfter.ID),
			"toInventoryId":   strings.TrimSpace(transferResult.toAfter.ID),
			"from":            inventoryAuditSnapshot(transferResult.fromAfter),
			"to":              inventoryAuditSnapshot(transferResult.toAfter),
		}

		return writeInventoryAuditEntryWithContext(ctx, tx, strings.TrimSpace(input.MaterialID), "INVENTORY_TRANSFER", before, payload, "")
	})

	if err == nil {
		var fromInv, toInv models.Inventory
		if db.DB.Where("material_id = ? AND category_code = ? AND batch_no = ?", input.MaterialID, input.FromCategory, input.BatchNo).First(&fromInv).Error == nil {
			syncInventoryToSearch(fromInv)
		}
		if db.DB.Where("material_id = ? AND category_code = ? AND batch_no = ?", input.MaterialID, input.ToCategory, input.BatchNo).First(&toInv).Error == nil {
			syncInventoryToSearch(toInv)
		}
	}
	return err
}

func ReconcileNegativeInventory(ctx context.Context) error {
	return db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var records []models.Inventory
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("quantity < 0").
			Find(&records).Error; err != nil {
			return err
		}

		for _, record := range records {
			before := inventoryAuditSnapshot(record)
			record.Quantity = 0
			record.TotalValue = 0
			record.AverageUnitCost = 0
			if err := updateInventoryRecord(tx, &record); err != nil {
				return err
			}
			payload := inventoryAuditSnapshot(record)
			payload["operation"] = "reconcile_negative_inventory"
			if err := writeInventoryAuditEntryWithContext(ctx, tx, record.ID, "INVENTORY_RECONCILE", before, payload, ""); err != nil {
				return err
			}
		}

		return nil
	})
}

func BulkSyncInventory(ctx context.Context, items []BulkSyncInventoryItemRequest) error {
	modelsItems := MapBulkSyncInventoryRequestsToModels(items)
	return db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, inv := range modelsItems {
			var existing models.Inventory
			var lookupErr error
			if strings.TrimSpace(inv.ID) != "" {
				lookupErr = tx.Where("id = ?", inv.ID).First(&existing).Error
			} else {
				lookupErr = tx.Where("material_id = ? AND category_code = ? AND batch_no = ?", inv.MaterialID, inv.CategoryCode, inv.BatchNo).
					Order("updated_at desc").
					First(&existing).Error
			}

			if errors.Is(lookupErr, gorm.ErrRecordNotFound) {
				if strings.TrimSpace(inv.ID) == "" {
					inv.ID = uuid.NewString()
				}
				if err := tx.Create(&inv).Error; err != nil {
					return err
				}
				payload := inventoryAuditSnapshot(inv)
				payload["operation"] = "create"
				if err := writeInventoryAuditEntryWithContext(ctx, tx, inv.ID, "INVENTORY_BULK_SYNC", nil, payload, ""); err != nil {
					return err
				}
				continue
			}
			if lookupErr != nil {
				return lookupErr
			}

			before := inventoryAuditSnapshot(existing)
			mergeInventoryForSync(&existing, inv)
			if err := updateInventoryRecord(tx, &existing); err != nil {
				return err
			}
			payload := inventoryAuditSnapshot(existing)
			payload["operation"] = "update"
			if err := writeInventoryAuditEntryWithContext(ctx, tx, existing.ID, "INVENTORY_BULK_SYNC", before, payload, ""); err != nil {
				return err
			}
		}
		return nil
	})
}

func VoidShipment(ctx context.Context, id string) error {
	return db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var shipment models.ShipmentRecord
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Where("id = ?", id).
			First(&shipment).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errors.New("shipment not found")
			}
			return err
		}

		if isAfterSalesExecutionSourceType(shipment.SourceType) {
			return ErrAfterSalesExecutionDedicatedPath
		}
		if shipment.Status == "VOID" {
			return errors.New("shipment already voided")
		}
		beforeShipment := shipment

		if shipment.Status == "COMMITTED" {
			transition := tx.Model(&models.ShipmentRecord{}).
				Where("id = ? AND status = ?", shipment.ID, "COMMITTED").
				Update("status", "VOID")
			if transition.Error != nil {
				return transition.Error
			}
			if transition.RowsAffected == 0 {
				return ErrVoidInProgress
			}

			var inv models.Inventory
			err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
				Where("material_id = ? AND category_code = ? AND batch_no = ?", shipment.MaterialID, shipment.SourceCategory, shipment.BatchNo).
				First(&inv).Error
			if err != nil {
				return errors.New("[CRITICAL] void failed: missing inventory record for rollback")
			}
			beforeInventory := inv

			inv.Quantity += shipment.Quantity
			inv.TotalValue += shipment.COGS
			if inv.Quantity > 0 {
				inv.AverageUnitCost = inv.TotalValue / inv.Quantity
			}
			if err := updateInventoryRecord(tx, &inv); err != nil {
				return err
			}
			if err := rollbackShipmentFromSalesOrderTx(tx, &shipment); err != nil {
				return err
			}
			shipment.Status = "VOID"
			before := map[string]any{
				"shipment":  shipmentAuditSnapshot(beforeShipment),
				"inventory": inventoryAuditSnapshot(beforeInventory),
			}
			payload := map[string]any{
				"shipment":        shipmentAuditSnapshot(shipment),
				"inventory":       inventoryAuditSnapshot(inv),
				"rollbackApplied": true,
			}
			return writeShipmentAuditEntryWithContext(ctx, tx, shipment.ID, "SHIPMENT_VOID", before, payload, strings.TrimSpace(shipment.Operator))
		}

		result := tx.Model(&models.ShipmentRecord{}).
			Where("id = ? AND status = ?", shipment.ID, shipment.Status).
			Update("status", "VOID")
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return ErrVoidInProgress
		}
		shipment.Status = "VOID"
		before := map[string]any{
			"shipment": shipmentAuditSnapshot(beforeShipment),
		}
		payload := map[string]any{
			"shipment": shipmentAuditSnapshot(shipment),
		}
		return writeShipmentAuditEntryWithContext(ctx, tx, shipment.ID, "SHIPMENT_VOID", before, payload, shipment.Operator)
	})
}
