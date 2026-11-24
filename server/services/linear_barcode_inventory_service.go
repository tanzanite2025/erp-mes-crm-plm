package services

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	LinearBarcodeInventoryStatusAvailable = "AVAILABLE"
	LinearBarcodeInventoryStatusBound     = "BOUND"
	LinearBarcodeInventoryStatusExpired   = "EXPIRED"
	LinearBarcodeInventoryStatusScrapped  = "SCRAPPED"
)

var (
	ErrLinearBarcodeInventoryNotFound                   = errors.New("linear barcode inventory item not found")
	ErrLinearBarcodeInventoryExpired                    = errors.New("linear barcode inventory item expired")
	ErrLinearBarcodeInventoryUnavailable                = errors.New("linear barcode inventory item unavailable")
	ErrLinearBarcodeOrderHasUnattributedLegacyInventory = errors.New("sales order has active issued codes with unresolved order-line identity")
)

type LinearBarcodePrintValidationError struct {
	Message string
}

func (e *LinearBarcodePrintValidationError) Error() string {
	return e.Message
}

type LinearBarcodeInventoryItemResponse struct {
	ID               string     `json:"id"`
	BatchID          string     `json:"batchId"`
	BatchNo          string     `json:"batchNo"`
	ProductID        string     `json:"productId"`
	SalesOrderID     string     `json:"salesOrderId"`
	SalesOrderLineNo int        `json:"salesOrderLineNo"`
	Code             string     `json:"code"`
	SerialNumber     string     `json:"serialNumber"`
	Status           string     `json:"status"`
	ExpiresAt        time.Time  `json:"expiresAt"`
	BoundAt          *time.Time `json:"boundAt,omitempty"`
	CreatedAt        time.Time  `json:"createdAt"`
	Version          int        `json:"version"`
}

type ListLinearBarcodeInventoryRequest struct {
	SalesOrderID string
	BatchID      string
	Status       string
	Limit        int
}

type ListLinearBarcodeInventoryResponse struct {
	Items                      []LinearBarcodeInventoryItemResponse    `json:"items"`
	Total                      int64                                   `json:"total"`
	OrderLineIssuanceSummaries []LinearBarcodeOrderLineIssuanceSummary `json:"orderLineIssuanceSummaries"`
	UnattributedIssuedQuantity int64                                   `json:"unattributedIssuedQuantity,omitempty"`
}

type LinearBarcodeOrderLineIssuanceSummary struct {
	SalesOrderLineID  uint    `json:"salesOrderLineId"`
	SalesOrderLineNo  int     `json:"salesOrderLineNo"`
	OrderQuantity     float64 `json:"orderQuantity"`
	IssuedQuantity    int64   `json:"issuedQuantity"`
	RemainingQuantity float64 `json:"remainingQuantity"`
}

type linearBarcodeOrderLineIssuanceSummaryRow struct {
	SalesOrderLineID uint    `gorm:"column:sales_order_line_id"`
	SalesOrderLineNo int     `gorm:"column:sales_order_line_no"`
	OrderQuantity    float64 `gorm:"column:order_quantity"`
	IssuedQuantity   int64   `gorm:"column:issued_quantity"`
}

func effectiveIssuedLinearBarcodeInventoryStatusCondition(inventoryAlias string) string {
	return "((" + inventoryAlias + ".status = ? AND " + inventoryAlias + ".expires_at > ?) OR " + inventoryAlias + ".status = ?)"
}

func effectiveLinearBarcodeInventoryItemStatus(record models.LinearBarcodeInventoryItem, now time.Time) string {
	if record.Status == LinearBarcodeInventoryStatusAvailable && !record.ExpiresAt.After(now) {
		return LinearBarcodeInventoryStatusExpired
	}
	return record.Status
}

func countUnattributedEffectiveIssuedLinearBarcodesForSalesOrder(database *gorm.DB, salesOrderID string, now time.Time) (int64, error) {
	var quantity int64
	err := database.Model(&models.LinearBarcodeInventoryItem{}).
		Where("linear_barcode_inventory_items.sales_order_id = ?", salesOrderID).
		Where(
			"(linear_barcode_inventory_items.sales_order_line_id = 0 OR NOT EXISTS (SELECT 1 FROM sales_order_lines AS current_line WHERE current_line.id = linear_barcode_inventory_items.sales_order_line_id AND current_line.sales_order_id = linear_barcode_inventory_items.sales_order_id))",
		).
		Where(
			effectiveIssuedLinearBarcodeInventoryStatusCondition("linear_barcode_inventory_items"),
			LinearBarcodeInventoryStatusAvailable,
			now,
			LinearBarcodeInventoryStatusBound,
		).
		Count(&quantity).Error
	return quantity, err
}

func rejectUnattributedEffectiveIssuedLinearBarcodesForSalesOrderTx(tx *gorm.DB, salesOrderID string, now time.Time) error {
	quantity, err := countUnattributedEffectiveIssuedLinearBarcodesForSalesOrder(tx, salesOrderID, now)
	if err != nil {
		return err
	}
	if quantity == 0 {
		return nil
	}
	return fmt.Errorf("%w: 订单存在 %d 个无法确认订单行归属的有效历史编码，请先核对库存", ErrLinearBarcodeOrderHasUnattributedLegacyInventory, quantity)
}

func refreshLinearBarcodeInventoryCodeExpiry(code string, now time.Time) (bool, error) {
	if db.DB == nil {
		return false, errors.New("database not initialized")
	}

	result := db.DB.Model(&models.LinearBarcodeInventoryItem{}).
		Where(
			"code = ? AND status = ? AND expires_at <= ?",
			strings.ToUpper(strings.TrimSpace(code)),
			LinearBarcodeInventoryStatusAvailable,
			now,
		).
		Updates(map[string]interface{}{
			"status":  LinearBarcodeInventoryStatusExpired,
			"version": gorm.Expr("version + 1"),
		})
	return result.RowsAffected == 1, result.Error
}

func bindLinearBarcodeInventoryTx(tx *gorm.DB, code string, boundAt time.Time) error {
	var inventory models.LinearBarcodeInventoryItem
	normalizedCode := strings.ToUpper(strings.TrimSpace(code))
	err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("code = ?", normalizedCode).
		First(&inventory).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrLinearBarcodeInventoryNotFound
	}
	if err != nil {
		return err
	}

	if inventory.Status == LinearBarcodeInventoryStatusExpired || !boundAt.Before(inventory.ExpiresAt) {
		return ErrLinearBarcodeInventoryExpired
	}
	if inventory.Status != LinearBarcodeInventoryStatusAvailable {
		return ErrLinearBarcodeInventoryUnavailable
	}

	result := tx.Model(&models.LinearBarcodeInventoryItem{}).
		Where("id = ? AND status = ? AND version = ?", inventory.ID, LinearBarcodeInventoryStatusAvailable, inventory.Version).
		Updates(map[string]interface{}{
			"status":   LinearBarcodeInventoryStatusBound,
			"bound_at": boundAt.UTC(),
			"version":  gorm.Expr("version + 1"),
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return ErrLinearBarcodeInventoryUnavailable
	}

	batchResult := tx.Model(&models.PrintBatch{}).
		Where("id = ?", inventory.BatchID).
		Updates(map[string]interface{}{
			"activated_count": gorm.Expr("activated_count + 1"),
			"status": gorm.Expr(
				"CASE WHEN activated_count + 1 >= quantity THEN ? ELSE ? END",
				"Activated",
				"PartiallyActivated",
			),
			"version": gorm.Expr("version + 1"),
		})
	if batchResult.Error != nil {
		return batchResult.Error
	}
	if batchResult.RowsAffected != 1 {
		return errors.New("linear barcode print batch not found")
	}
	return nil
}

func ScrapLinearBarcodePrintBatchTx(tx *gorm.DB, batchID string) error {
	batchID = strings.TrimSpace(batchID)
	now := time.Now()
	var batch models.PrintBatch
	if err := tx.First(&batch, "id = ?", batchID).Error; err != nil {
		return err
	}

	var availableItems []models.LinearBarcodeInventoryItem
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("batch_id = ? AND status = ? AND expires_at > ?", batchID, LinearBarcodeInventoryStatusAvailable, now).
		Order("id ASC").
		Find(&availableItems).Error; err != nil {
		return err
	}
	if len(availableItems) > 0 {
		itemIDs := make([]string, 0, len(availableItems))
		for _, item := range availableItems {
			itemIDs = append(itemIDs, item.ID)
		}
		result := tx.Model(&models.LinearBarcodeInventoryItem{}).
			Where("id IN ? AND status = ? AND expires_at > ?", itemIDs, LinearBarcodeInventoryStatusAvailable, now).
			Updates(map[string]interface{}{
				"status":  LinearBarcodeInventoryStatusScrapped,
				"version": gorm.Expr("version + 1"),
			})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != int64(len(availableItems)) {
			return ErrLinearBarcodeInventoryUnavailable
		}
	}

	result := tx.Model(&models.PrintBatch{}).
		Where("id = ?", batchID).
		Updates(map[string]interface{}{
			"status":  "Scrapped",
			"version": gorm.Expr("version + 1"),
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected != 1 {
		return errors.New("linear barcode print batch not found")
	}
	return nil
}

func mapLinearBarcodeInventoryItem(record models.LinearBarcodeInventoryItem, now time.Time) LinearBarcodeInventoryItemResponse {
	batchNo := ""
	if record.Batch != nil {
		batchNo = record.Batch.BatchNo
	}
	return LinearBarcodeInventoryItemResponse{
		ID:               record.ID,
		BatchID:          record.BatchID,
		BatchNo:          batchNo,
		ProductID:        record.ProductID,
		SalesOrderID:     record.SalesOrderID,
		SalesOrderLineNo: record.SalesOrderLineNo,
		Code:             record.Code,
		SerialNumber:     record.SerialNumber,
		Status:           effectiveLinearBarcodeInventoryItemStatus(record, now),
		ExpiresAt:        record.ExpiresAt,
		BoundAt:          record.BoundAt,
		CreatedAt:        record.CreatedAt,
		Version:          record.Version,
	}
}

func listLinearBarcodeOrderLineIssuanceSummaries(salesOrderID string, now time.Time) ([]LinearBarcodeOrderLineIssuanceSummary, error) {
	var rows []linearBarcodeOrderLineIssuanceSummaryRow
	statusCondition := effectiveIssuedLinearBarcodeInventoryStatusCondition("inventory")
	err := db.DB.Table("sales_order_lines AS sales_order_line").
		Select("sales_order_line.id AS sales_order_line_id, sales_order_line.line_no AS sales_order_line_no, sales_order_line.qty AS order_quantity, COUNT(inventory.id) AS issued_quantity").
		Joins(
			"LEFT JOIN linear_barcode_inventory_items AS inventory ON inventory.sales_order_id = sales_order_line.sales_order_id AND inventory.sales_order_line_id = sales_order_line.id AND inventory.deleted_at IS NULL AND "+statusCondition,
			LinearBarcodeInventoryStatusAvailable,
			now,
			LinearBarcodeInventoryStatusBound,
		).
		Where("sales_order_line.sales_order_id = ?", salesOrderID).
		Group("sales_order_line.id, sales_order_line.line_no, sales_order_line.qty").
		Order("sales_order_line.line_no ASC").
		Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	summaries := make([]LinearBarcodeOrderLineIssuanceSummary, 0, len(rows))
	for _, row := range rows {
		remainingQuantity := row.OrderQuantity - float64(row.IssuedQuantity)
		if remainingQuantity < 0 {
			remainingQuantity = 0
		}
		summaries = append(summaries, LinearBarcodeOrderLineIssuanceSummary{
			SalesOrderLineID:  row.SalesOrderLineID,
			SalesOrderLineNo:  row.SalesOrderLineNo,
			OrderQuantity:     row.OrderQuantity,
			IssuedQuantity:    row.IssuedQuantity,
			RemainingQuantity: remainingQuantity,
		})
	}
	return summaries, nil
}

func ListLinearBarcodeInventory(input ListLinearBarcodeInventoryRequest) (ListLinearBarcodeInventoryResponse, error) {
	input.SalesOrderID = strings.TrimSpace(input.SalesOrderID)
	input.BatchID = strings.TrimSpace(input.BatchID)
	input.Status = strings.ToUpper(strings.TrimSpace(input.Status))
	if input.SalesOrderID != "" {
		if _, err := uuid.Parse(input.SalesOrderID); err != nil {
			return ListLinearBarcodeInventoryResponse{}, &LinearBarcodePrintValidationError{Message: "salesOrderId 必须是有效 UUID"}
		}
	}
	if input.BatchID != "" {
		if _, err := uuid.Parse(input.BatchID); err != nil {
			return ListLinearBarcodeInventoryResponse{}, &LinearBarcodePrintValidationError{Message: "batchId 必须是有效 UUID"}
		}
	}
	if input.Status != "" && input.Status != LinearBarcodeInventoryStatusAvailable && input.Status != LinearBarcodeInventoryStatusBound && input.Status != LinearBarcodeInventoryStatusExpired && input.Status != LinearBarcodeInventoryStatusScrapped {
		return ListLinearBarcodeInventoryResponse{}, &LinearBarcodePrintValidationError{Message: "库存状态筛选值无效"}
	}
	if input.Limit <= 0 {
		input.Limit = 200
	}
	if input.Limit > 1000 {
		input.Limit = 1000
	}

	query := db.DB.Model(&models.LinearBarcodeInventoryItem{})
	if input.SalesOrderID != "" {
		query = query.Where("sales_order_id = ?", input.SalesOrderID)
	}
	if input.BatchID != "" {
		query = query.Where("batch_id = ?", input.BatchID)
	}
	now := time.Now()
	switch input.Status {
	case LinearBarcodeInventoryStatusAvailable:
		query = query.Where("status = ? AND expires_at > ?", LinearBarcodeInventoryStatusAvailable, now)
	case LinearBarcodeInventoryStatusExpired:
		query = query.Where("(status = ? OR (status = ? AND expires_at <= ?))", LinearBarcodeInventoryStatusExpired, LinearBarcodeInventoryStatusAvailable, now)
	case "":
	default:
		query = query.Where("status = ?", input.Status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return ListLinearBarcodeInventoryResponse{}, err
	}
	var records []models.LinearBarcodeInventoryItem
	if err := query.Preload("Batch").Order("created_at desc, code asc").Limit(input.Limit).Find(&records).Error; err != nil {
		return ListLinearBarcodeInventoryResponse{}, err
	}

	response := ListLinearBarcodeInventoryResponse{
		Items: make([]LinearBarcodeInventoryItemResponse, 0, len(records)),
		Total: total,
	}
	if input.SalesOrderID != "" {
		summaries, err := listLinearBarcodeOrderLineIssuanceSummaries(input.SalesOrderID, now)
		if err != nil {
			return ListLinearBarcodeInventoryResponse{}, err
		}
		response.OrderLineIssuanceSummaries = summaries
		unattributedQuantity, err := countUnattributedEffectiveIssuedLinearBarcodesForSalesOrder(db.DB, input.SalesOrderID, now)
		if err != nil {
			return ListLinearBarcodeInventoryResponse{}, err
		}
		response.UnattributedIssuedQuantity = unattributedQuantity
	}
	for _, record := range records {
		response.Items = append(response.Items, mapLinearBarcodeInventoryItem(record, now))
	}
	return response, nil
}
