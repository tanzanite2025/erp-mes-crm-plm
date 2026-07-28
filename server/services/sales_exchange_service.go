// Package services - 销售换货单全生命周期管理。
//
// 换货 = "客户寄回旧货 + 工厂发出新货" 的双向物流场景。本服务聚焦:
//   - List/Get/Create/Delete 标准管理
//   - ConfirmSalesExchangeOldItemInbound 老货收货确认(扫码识别 → 入库 → 状态推进)
//
// 关键流程(createSalesExchangeTx):
//  1. 加锁查找原销售订单(loadSalesExchangeOrderForUpdate)
//  2. 校验剩余可换数量(loadSalesAfterSalesConsumedQuantityMap 防退换合计超额)
//  3. 派发换货行(buildSalesExchangeLines)
//  4. 关联标签码(buildSalesExchangeLabelCode* 系列,匹配/未匹配双轨)
//  5. 生成换货单号(generateSalesExchangeNoTx,日期 + 序号)
//
// 关键不变量:
//   - 一次换货 ≤ 销售订单线剩余数量
//   - 已识别标签码必须挂到具体的换货行;未匹配标签码挂头部留痕
package services

import (
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	statemachine "xdfc-server/services/state_machine"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	salesExchangeDateOnlyLayout = "2006-01-02"

	SalesExchangeLabelSideOldItem         = "OLD_ITEM"
	SalesExchangeLabelSideReplacementItem = "REPLACEMENT_ITEM"
)

type SalesExchangeListQuery struct {
	Page            int
	PageSize        int
	CustomerID      string
	StatusFilterRaw string
	Keyword         string
}

func parseSalesExchangeFlexibleTime(raw string, field string) (*time.Time, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return nil, nil
	}
	if parsed, err := time.Parse(time.RFC3339, trimmed); err == nil {
		return &parsed, nil
	}
	if parsed, err := time.Parse(salesExchangeDateOnlyLayout, trimmed); err == nil {
		return &parsed, nil
	}
	return nil, fmt.Errorf("%s format is invalid", field)
}

func normalizeSalesExchangeStatusFilters(raw string) []string {
	seen := make(map[string]struct{})
	statuses := make([]string, 0)
	for _, segment := range strings.Split(raw, ",") {
		status := normalizeSalesExchangeStatus(segment)
		if status == "" || strings.EqualFold(status, "all") {
			continue
		}
		if _, exists := seen[status]; exists {
			continue
		}
		seen[status] = struct{}{}
		statuses = append(statuses, status)
	}
	return statuses
}

func ListSalesExchanges(query SalesExchangeListQuery) (SalesExchangeListResponse, error) {
	page := query.Page
	if page < 1 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize < 1 {
		pageSize = 50
	}

	tx := db.DB.Model(&models.SalesExchange{})
	if customerID := strings.TrimSpace(query.CustomerID); customerID != "" {
		tx = tx.Where("customer_id = ?", customerID)
	}
	if statusRaw := strings.TrimSpace(query.StatusFilterRaw); statusRaw != "" && !strings.EqualFold(statusRaw, "all") {
		statuses := normalizeSalesExchangeStatusFilters(statusRaw)
		if len(statuses) > 0 {
			tx = tx.Where("status IN ?", statuses)
		}
	}
	if keyword := strings.TrimSpace(query.Keyword); keyword != "" {
		likeKeyword := "%" + keyword + "%"
		tx = tx.Where(
			"LOWER(exchange_no) LIKE LOWER(?) OR LOWER(sales_order_no) LIKE LOWER(?) OR LOWER(customer_name) LIKE LOWER(?) OR LOWER(received_old_item_tracking_no) LIKE LOWER(?) OR LOWER(replacement_tracking_no) LIKE LOWER(?)",
			likeKeyword,
			likeKeyword,
			likeKeyword,
			likeKeyword,
			likeKeyword,
		)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return SalesExchangeListResponse{}, err
	}

	var items []models.SalesExchange
	if err := tx.
		Preload("Lines.LabelCodes").
		Preload("LabelCodes").
		Order("exchange_date desc, created_at desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&items).Error; err != nil {
		return SalesExchangeListResponse{}, err
	}

	executionRecordsBySource, err := loadSalesExchangeExecutionRecordsBySource(items)
	if err != nil {
		return SalesExchangeListResponse{}, err
	}
	responses := MapSalesExchangesToResponse(items)
	for index := range responses {
		execution := executionRecordsBySource[items[index].ID]
		responses[index].InboundRecords = mapInventoryInboundRecordsToResponse(execution.inbound)
		responses[index].ShipmentRecords = mapShipmentRecordsToResponse(execution.shipments)
	}

	return SalesExchangeListResponse{
		Items:    responses,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func GetSalesExchangeByID(id string) (SalesExchangeResponse, error) {
	var record models.SalesExchange
	if err := db.DB.Preload("Lines.LabelCodes").Preload("LabelCodes").First(&record, "id = ?", strings.TrimSpace(id)).Error; err != nil {
		return SalesExchangeResponse{}, err
	}
	executionRecordsBySource, err := loadSalesExchangeExecutionRecordsBySource([]models.SalesExchange{record})
	if err != nil {
		return SalesExchangeResponse{}, err
	}
	response := MapSalesExchangeToResponse(record)
	execution := executionRecordsBySource[record.ID]
	response.InboundRecords = mapInventoryInboundRecordsToResponse(execution.inbound)
	response.ShipmentRecords = mapShipmentRecordsToResponse(execution.shipments)
	return response, nil
}

func CreateSalesExchange(input CreateSalesExchangeInput) (CreateSalesExchangeResponse, error) {
	normalized, err := normalizeCreateSalesExchangeInput(input)
	if err != nil {
		return CreateSalesExchangeResponse{}, err
	}

	var response CreateSalesExchangeResponse
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		result, err := createSalesExchangeTx(tx, normalized)
		if err != nil {
			return err
		}
		response = MapCreateSalesExchangeResultToResponse(result)
		return nil
	})
	if err != nil {
		return CreateSalesExchangeResponse{}, err
	}
	return response, nil
}

func DeleteSalesExchange(id string) error {
	salesExchangeID := strings.TrimSpace(id)
	if salesExchangeID == "" {
		return errors.New("sales exchange id is required")
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		var record models.SalesExchange
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&record, "id = ?", salesExchangeID).Error; err != nil {
			return err
		}
		if normalizeSalesExchangeStatus(record.Status) != SalesExchangeStatusDraft {
			return errors.New("only draft sales exchanges can be deleted")
		}
		return tx.Delete(&models.SalesExchange{}, "id = ?", record.ID).Error
	})
}

func PatchSalesExchangeOldItemLogistics(input PatchSalesExchangeOldItemLogisticsInput) (SalesExchangeResponse, error) {
	input.SalesExchangeID = strings.TrimSpace(input.SalesExchangeID)
	if input.SalesExchangeID == "" {
		return SalesExchangeResponse{}, errors.New("sales exchange id is required")
	}
	input.Operator = strings.TrimSpace(input.Operator)
	if input.Operator == "" {
		input.Operator = "unknown"
	}
	input.OldItemTrackingNo = strings.TrimSpace(input.OldItemTrackingNo)

	var response SalesExchangeResponse
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var record models.SalesExchange
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Lines.LabelCodes").
			Preload("LabelCodes").
			First(&record, "id = ?", input.SalesExchangeID).Error; err != nil {
			return err
		}
		status := normalizeSalesExchangeStatus(record.Status)
		if isTerminalSalesExchangeStatus(status) {
			return errors.New("sales exchange status does not allow old item logistics update")
		}
		if err := tx.Model(&models.SalesExchange{}).
			Where("id = ?", record.ID).
			Updates(map[string]any{
				"received_old_item_tracking_no": input.OldItemTrackingNo,
				"operator":                      input.Operator,
			}).Error; err != nil {
			return err
		}
		var reloaded models.SalesExchange
		if err := tx.Preload("Lines.LabelCodes").
			Preload("LabelCodes").
			First(&reloaded, "id = ?", record.ID).Error; err != nil {
			return err
		}
		response = MapSalesExchangeToResponse(reloaded)
		return nil
	})
	if err != nil {
		return SalesExchangeResponse{}, err
	}
	return response, nil
}

func ConfirmSalesExchangeOldItemInbound(input ConfirmSalesExchangeOldItemInboundInput) (ConfirmSalesExchangeOldItemInboundResponse, error) {
	normalized, err := normalizeConfirmSalesExchangeOldItemInboundInput(input)
	if err != nil {
		return ConfirmSalesExchangeOldItemInboundResponse{}, err
	}
	executionFingerprint, err := salesExchangeOldItemInboundExecutionFingerprint(normalized)
	if err != nil {
		return ConfirmSalesExchangeOldItemInboundResponse{}, err
	}

	var result ConfirmSalesExchangeOldItemInboundResult
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		confirmed, err := confirmSalesExchangeOldItemInboundTx(tx, normalized, executionFingerprint)
		if err != nil {
			return err
		}
		result = confirmed
		return nil
	})
	if err != nil {
		return ConfirmSalesExchangeOldItemInboundResponse{}, err
	}

	for _, inboundRecord := range result.CreatedInboundRecords {
		var latestInventory models.Inventory
		if db.DB.Where("material_id = ? AND category_code = ? AND batch_no = ?", inboundRecord.MaterialID, inboundRecord.TargetCategory, inboundRecord.BatchNo).First(&latestInventory).Error == nil {
			syncInventoryToSearch(latestInventory)
		}
	}

	return MapConfirmSalesExchangeOldItemInboundResultToResponse(result), nil
}

func ConfirmSalesExchangeReplacementShipment(input ConfirmSalesExchangeReplacementShipmentInput) (ConfirmSalesExchangeReplacementShipmentResponse, error) {
	normalized, err := normalizeConfirmSalesExchangeReplacementShipmentInput(input)
	if err != nil {
		return ConfirmSalesExchangeReplacementShipmentResponse{}, err
	}
	executionFingerprint, err := salesExchangeReplacementShipmentExecutionFingerprint(normalized)
	if err != nil {
		return ConfirmSalesExchangeReplacementShipmentResponse{}, err
	}

	var result ConfirmSalesExchangeReplacementShipmentResult
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		confirmed, err := confirmSalesExchangeReplacementShipmentTx(tx, normalized, executionFingerprint)
		if err != nil {
			return err
		}
		result = confirmed
		return nil
	})
	if err != nil {
		return ConfirmSalesExchangeReplacementShipmentResponse{}, err
	}

	for _, shipmentRecord := range result.CreatedShipmentRecords {
		var latestInventory models.Inventory
		if db.DB.Where("material_id = ? AND category_code = ? AND batch_no = ?", shipmentRecord.MaterialID, shipmentRecord.SourceCategory, shipmentRecord.BatchNo).First(&latestInventory).Error == nil {
			syncInventoryToSearch(latestInventory)
		}
	}

	return MapConfirmSalesExchangeReplacementShipmentResultToResponse(result), nil
}

func normalizeCreateSalesExchangeInput(input CreateSalesExchangeInput) (CreateSalesExchangeInput, error) {
	input.SalesOrderID = strings.TrimSpace(input.SalesOrderID)
	if input.SalesOrderID == "" {
		return CreateSalesExchangeInput{}, errors.New("sales order id is required")
	}
	if len(input.Lines) == 0 {
		return CreateSalesExchangeInput{}, errors.New("sales exchange lines are required")
	}
	exchangeDate, err := parseSalesExchangeFlexibleTime(input.ExchangeDateRaw, "exchangeDate")
	if err != nil {
		return CreateSalesExchangeInput{}, err
	}
	if exchangeDate != nil {
		input.ExchangeDate = *exchangeDate
	}
	if input.ExchangeDate.IsZero() {
		input.ExchangeDate = time.Now()
	}
	expectedDate, err := parseSalesExchangeFlexibleTime(input.ExpectedReplacementDateRaw, "expectedReplacementDate")
	if err != nil {
		return CreateSalesExchangeInput{}, err
	}
	input.ExpectedReplacementDate = expectedDate
	input.Operator = strings.TrimSpace(input.Operator)
	if input.Operator == "" {
		input.Operator = "unknown"
	}
	input.ReceivedOldItemTrackingNo = strings.TrimSpace(input.ReceivedOldItemTrackingNo)
	input.ReplacementTrackingNo = strings.TrimSpace(input.ReplacementTrackingNo)
	input.ExchangeReason = strings.TrimSpace(input.ExchangeReason)
	input.ExchangeRemarks = strings.TrimSpace(input.ExchangeRemarks)
	if input.ExchangeReason == "" {
		return CreateSalesExchangeInput{}, errors.New("exchange reason is required")
	}
	return input, nil
}

func normalizeConfirmSalesExchangeOldItemInboundInput(input ConfirmSalesExchangeOldItemInboundInput) (ConfirmSalesExchangeOldItemInboundInput, error) {
	input.SalesExchangeID = strings.TrimSpace(input.SalesExchangeID)
	if input.SalesExchangeID == "" {
		return ConfirmSalesExchangeOldItemInboundInput{}, errors.New("sales exchange id is required")
	}
	executionKey, err := normalizeAfterSalesExecutionKey(input.ExecutionKey)
	if err != nil {
		return ConfirmSalesExchangeOldItemInboundInput{}, err
	}
	input.ExecutionKey = executionKey
	if input.SalesExchangeLineID == 0 {
		return ConfirmSalesExchangeOldItemInboundInput{}, errors.New("sales exchange line id is required")
	}
	if input.Quantity <= 0 {
		return ConfirmSalesExchangeOldItemInboundInput{}, errors.New("sales exchange old item inbound quantity must be greater than zero")
	}
	input.TargetCategory = strings.TrimSpace(input.TargetCategory)
	if input.TargetCategory == "" {
		return ConfirmSalesExchangeOldItemInboundInput{}, errors.New("target category is required")
	}
	inboundDate, err := parseSalesExchangeFlexibleTime(input.InboundDateRaw, "inboundDate")
	if err != nil {
		return ConfirmSalesExchangeOldItemInboundInput{}, err
	}
	if inboundDate != nil {
		input.InboundDate = *inboundDate
	}
	if input.InboundDate.IsZero() {
		input.InboundDate = time.Now()
	}
	input.Operator = strings.TrimSpace(input.Operator)
	if input.Operator == "" {
		input.Operator = "unknown"
	}
	input.BatchNo = strings.TrimSpace(input.BatchNo)
	input.Remarks = strings.TrimSpace(input.Remarks)
	for index := range input.Barcodes {
		input.Barcodes[index] = normalizeSalesExchangeExecutionBarcodeInput(
			input.Barcodes[index],
			SalesExchangeLabelSideOldItem,
			"warehouseScan",
		)
		if input.Barcodes[index].NormalizedLabelCode == "" {
			return ConfirmSalesExchangeOldItemInboundInput{}, errors.New("sales exchange old item barcode is required")
		}
	}
	return input, nil
}

func normalizeConfirmSalesExchangeReplacementShipmentInput(input ConfirmSalesExchangeReplacementShipmentInput) (ConfirmSalesExchangeReplacementShipmentInput, error) {
	input.SalesExchangeID = strings.TrimSpace(input.SalesExchangeID)
	if input.SalesExchangeID == "" {
		return ConfirmSalesExchangeReplacementShipmentInput{}, errors.New("sales exchange id is required")
	}
	executionKey, err := normalizeAfterSalesExecutionKey(input.ExecutionKey)
	if err != nil {
		return ConfirmSalesExchangeReplacementShipmentInput{}, err
	}
	input.ExecutionKey = executionKey
	input.SourceCategory = strings.TrimSpace(input.SourceCategory)
	if input.SourceCategory == "" {
		return ConfirmSalesExchangeReplacementShipmentInput{}, errors.New("source category is required")
	}
	shipmentDate, err := parseSalesExchangeFlexibleTime(input.ShipmentDateRaw, "shipmentDate")
	if err != nil {
		return ConfirmSalesExchangeReplacementShipmentInput{}, err
	}
	if shipmentDate != nil {
		input.ShipmentDate = *shipmentDate
	}
	if input.ShipmentDate.IsZero() {
		input.ShipmentDate = time.Now()
	}
	input.Operator = strings.TrimSpace(input.Operator)
	if input.Operator == "" {
		input.Operator = "unknown"
	}
	input.BatchNo = strings.TrimSpace(input.BatchNo)
	input.ReplacementTrackingNo = strings.TrimSpace(input.ReplacementTrackingNo)
	input.Remarks = strings.TrimSpace(input.Remarks)
	if len(input.Lines) == 0 {
		return ConfirmSalesExchangeReplacementShipmentInput{}, errors.New("sales exchange replacement shipment lines are required")
	}
	seenLineIDs := make(map[uint]struct{}, len(input.Lines))
	for index := range input.Lines {
		line := input.Lines[index]
		if line.SalesExchangeLineID == 0 {
			return ConfirmSalesExchangeReplacementShipmentInput{}, errors.New("sales exchange line id is required")
		}
		if _, exists := seenLineIDs[line.SalesExchangeLineID]; exists {
			return ConfirmSalesExchangeReplacementShipmentInput{}, errors.New("duplicate sales exchange replacement shipment line")
		}
		seenLineIDs[line.SalesExchangeLineID] = struct{}{}
		if line.Quantity <= 0 {
			return ConfirmSalesExchangeReplacementShipmentInput{}, errors.New("sales exchange replacement shipment quantity must be greater than zero")
		}
		for barcodeIndex := range line.Barcodes {
			line.Barcodes[barcodeIndex] = normalizeSalesExchangeExecutionBarcodeInput(
				line.Barcodes[barcodeIndex],
				SalesExchangeLabelSideReplacementItem,
				"shipmentScan",
			)
			if line.Barcodes[barcodeIndex].NormalizedLabelCode == "" {
				return ConfirmSalesExchangeReplacementShipmentInput{}, errors.New("sales exchange replacement barcode is required")
			}
		}
		input.Lines[index] = line
	}
	return input, nil
}

func createSalesExchangeTx(tx *gorm.DB, input CreateSalesExchangeInput) (CreateSalesExchangeResult, error) {
	if tx == nil {
		return CreateSalesExchangeResult{}, errors.New("transaction is required")
	}

	order, err := loadSalesExchangeOrderForUpdate(tx, input.SalesOrderID)
	if err != nil {
		return CreateSalesExchangeResult{}, err
	}
	consumedQuantityMap, err := loadSalesAfterSalesConsumedQuantityMap(tx, order.Lines, "")
	if err != nil {
		return CreateSalesExchangeResult{}, err
	}
	if guard := statemachine.CanCreateSalesReturn(order, consumedQuantityMap, nil); !guard.Allowed {
		return CreateSalesExchangeResult{}, guard.Err()
	}

	exchangeNo, err := generateSalesExchangeNoTx(tx, input.ExchangeDate)
	if err != nil {
		return CreateSalesExchangeResult{}, err
	}
	lines, lineLabelInputsByOrderLineID, totalQuantity, err := buildSalesExchangeLines(order, consumedQuantityMap, input.Lines)
	if err != nil {
		return CreateSalesExchangeResult{}, err
	}

	record := models.SalesExchange{
		BaseModel:                 models.BaseModel{ID: uuid.NewString()},
		ExchangeNo:                exchangeNo,
		SalesOrderID:              order.ID,
		SalesOrderNo:              order.OrderNo,
		CustomerID:                order.CustomerID,
		CustomerName:              order.CustomerName,
		Status:                    SalesExchangeStatusDraft,
		ExchangeDate:              input.ExchangeDate,
		ExpectedReplacementDate:   input.ExpectedReplacementDate,
		ReceivedOldItemTrackingNo: input.ReceivedOldItemTrackingNo,
		ReplacementTrackingNo:     input.ReplacementTrackingNo,
		ExchangeReason:            input.ExchangeReason,
		ExchangeRemarks:           input.ExchangeRemarks,
		Operator:                  input.Operator,
		TotalExchangeQuantity:     math.Round(totalQuantity*100) / 100,
		Lines:                     lines,
	}
	if err := tx.Create(&record).Error; err != nil {
		return CreateSalesExchangeResult{}, err
	}

	labelCodes, err := buildSalesExchangeLabelCodeModels(record, lineLabelInputsByOrderLineID, input.UnmatchedLabelCodes)
	if err != nil {
		return CreateSalesExchangeResult{}, err
	}
	if len(labelCodes) > 0 {
		if err := tx.Create(&labelCodes).Error; err != nil {
			return CreateSalesExchangeResult{}, err
		}
	}

	if err := tx.Preload("Lines.LabelCodes").Preload("LabelCodes").First(&record, "id = ?", record.ID).Error; err != nil {
		return CreateSalesExchangeResult{}, err
	}
	return CreateSalesExchangeResult{
		SalesExchange: record,
		SalesOrder:    order,
	}, nil
}

func confirmSalesExchangeOldItemInboundTx(tx *gorm.DB, input ConfirmSalesExchangeOldItemInboundInput, executionFingerprint string) (ConfirmSalesExchangeOldItemInboundResult, error) {
	var record models.SalesExchange
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Lines.LabelCodes").
		Preload("LabelCodes").
		First(&record, "id = ?", input.SalesExchangeID).Error; err != nil {
		return ConfirmSalesExchangeOldItemInboundResult{}, err
	}
	existingRecords, err := loadInboundRecordsByExecutionKeyTx(
		tx,
		AfterSalesSourceSalesExchangeOldItem,
		record.ID,
		input.ExecutionKey,
	)
	if err != nil {
		return ConfirmSalesExchangeOldItemInboundResult{}, err
	}
	if err := validateExecutionReplayCount(len(existingRecords), 1); err != nil {
		return ConfirmSalesExchangeOldItemInboundResult{}, err
	}
	if err := validateExecutionReplayFingerprint(existingRecords, executionFingerprint); err != nil {
		return ConfirmSalesExchangeOldItemInboundResult{}, err
	}
	if len(existingRecords) > 0 {
		return ConfirmSalesExchangeOldItemInboundResult{
			SalesExchange:         record,
			CreatedInboundRecords: existingRecords,
		}, nil
	}
	status := normalizeSalesExchangeStatus(record.Status)
	if status != SalesExchangeStatusDraft &&
		status != SalesExchangeStatusOldItemPartiallyReceived {
		return ConfirmSalesExchangeOldItemInboundResult{}, errors.New("sales exchange status does not allow old item inbound")
	}
	if len(record.Lines) == 0 {
		return ConfirmSalesExchangeOldItemInboundResult{}, errors.New("sales exchange lines are required")
	}
	var line *models.SalesExchangeLine
	for index := range record.Lines {
		if record.Lines[index].ID == input.SalesExchangeLineID {
			line = &record.Lines[index]
			break
		}
	}
	if line == nil {
		return ConfirmSalesExchangeOldItemInboundResult{}, errors.New("sales exchange line not found")
	}
	remainingQuantity := line.ExchangeQuantity - line.OldItemReceivedQuantity
	if input.Quantity-remainingQuantity > salesReturnQuantityTolerance {
		return ConfirmSalesExchangeOldItemInboundResult{}, errors.New("sales exchange old item inbound quantity exceeds remaining quantity")
	}

	batchNo := input.BatchNo
	if batchNo == "" {
		batchNo = record.ExchangeNo
	}
	if err := bindSalesExchangeExecutionBarcodesTx(
		tx,
		record,
		*line,
		input.Barcodes,
		SalesExchangeLabelSideOldItem,
	); err != nil {
		return ConfirmSalesExchangeOldItemInboundResult{}, err
	}

	materialResolution, err := ResolveInventoryMaterialForProductSnapshotTx(tx, ProductInventoryMaterialResolutionSnapshot{
		ProductID:    line.ProductID,
		ProductCode:  line.ProductCode,
		ProductModel: line.ProductModel,
	})
	if err != nil {
		return ConfirmSalesExchangeOldItemInboundResult{}, err
	}
	material := materialResolution.Material
	inbound := models.InboundRecord{
		BaseModel:            models.BaseModel{ID: uuid.NewString()},
		MaterialID:           material.ID,
		MaterialName:         material.Name,
		MaterialCode:         material.Code,
		SourceType:           AfterSalesSourceSalesExchangeOldItem,
		SourceID:             record.ID,
		SourceLineID:         line.ID,
		ExecutionKey:         input.ExecutionKey,
		ExecutionFingerprint: executionFingerprint,
		Quantity:             input.Quantity,
		PurchasePrice:        0,
		TargetCategory:       input.TargetCategory,
		BatchNo:              batchNo,
		InboundDate:          input.InboundDate,
		Operator:             input.Operator,
		Remarks:              input.Remarks,
	}
	if _, err := recordInboundTx(tx, &inbound, inboundRecordOptions{
		skipZeroValueVoucher: true,
		auditAction:          AfterSalesAuditSalesExchangeOldItemInbound,
		auditOperator:        input.Operator,
	}); err != nil {
		return ConfirmSalesExchangeOldItemInboundResult{}, err
	}
	createdRecords := []models.InboundRecord{inbound}

	nextReceivedQuantity := math.Round((line.OldItemReceivedQuantity+input.Quantity)*100) / 100
	nextLineStatus := deriveSalesExchangeLineExecutionStatus(
		nextReceivedQuantity,
		line.ReplacementShippedQuantity,
		line.ExchangeQuantity,
	)
	if err := tx.Model(&models.SalesExchangeLine{}).
		Where("id = ? AND sales_exchange_id = ?", line.ID, record.ID).
		Updates(map[string]any{
			"old_item_received_quantity": nextReceivedQuantity,
			"status":                     nextLineStatus,
		}).Error; err != nil {
		return ConfirmSalesExchangeOldItemInboundResult{}, err
	}

	now := time.Now()
	var reloaded models.SalesExchange
	if err := tx.Preload("Lines.LabelCodes").Preload("LabelCodes").First(&reloaded, "id = ?", record.ID).Error; err != nil {
		return ConfirmSalesExchangeOldItemInboundResult{}, err
	}
	if err := tx.Model(&models.SalesExchange{}).Where("id = ?", record.ID).Updates(map[string]any{
		"status":                        deriveSalesExchangeExecutionStatus(reloaded),
		"old_item_inbound_confirmed_at": now,
		"old_item_inbound_confirmed_by": input.Operator,
		"old_item_inbound_target":       input.TargetCategory,
		"old_item_inbound_batch_no":     batchNo,
		"old_item_inbound_remarks":      input.Remarks,
	}).Error; err != nil {
		return ConfirmSalesExchangeOldItemInboundResult{}, err
	}
	if err := tx.Preload("Lines.LabelCodes").Preload("LabelCodes").First(&record, "id = ?", record.ID).Error; err != nil {
		return ConfirmSalesExchangeOldItemInboundResult{}, err
	}

	return ConfirmSalesExchangeOldItemInboundResult{
		SalesExchange:         record,
		CreatedInboundRecords: createdRecords,
	}, nil
}

func confirmSalesExchangeReplacementShipmentTx(tx *gorm.DB, input ConfirmSalesExchangeReplacementShipmentInput, executionFingerprint string) (ConfirmSalesExchangeReplacementShipmentResult, error) {
	var record models.SalesExchange
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Lines.LabelCodes").
		Preload("LabelCodes").
		First(&record, "id = ?", input.SalesExchangeID).Error; err != nil {
		return ConfirmSalesExchangeReplacementShipmentResult{}, err
	}
	existingRecords, err := loadShipmentRecordsByExecutionKeyTx(
		tx,
		AfterSalesSourceSalesExchangeReplacement,
		record.ID,
		input.ExecutionKey,
	)
	if err != nil {
		return ConfirmSalesExchangeReplacementShipmentResult{}, err
	}
	if err := validateExecutionReplayCount(len(existingRecords), len(input.Lines)); err != nil {
		return ConfirmSalesExchangeReplacementShipmentResult{}, err
	}
	if err := validateShipmentExecutionReplayFingerprint(existingRecords, executionFingerprint); err != nil {
		return ConfirmSalesExchangeReplacementShipmentResult{}, err
	}
	if len(existingRecords) > 0 {
		return ConfirmSalesExchangeReplacementShipmentResult{
			SalesExchange:          record,
			CreatedShipmentRecords: existingRecords,
		}, nil
	}
	status := normalizeSalesExchangeStatus(record.Status)
	if status == SalesExchangeStatusDraft {
		return ConfirmSalesExchangeReplacementShipmentResult{}, errors.New("old item must be received before replacement shipment")
	}
	if isTerminalSalesExchangeStatus(status) {
		return ConfirmSalesExchangeReplacementShipmentResult{}, errors.New("sales exchange status does not allow replacement shipment")
	}
	if len(record.Lines) == 0 {
		return ConfirmSalesExchangeReplacementShipmentResult{}, errors.New("sales exchange lines are required")
	}

	lineByID := make(map[uint]models.SalesExchangeLine, len(record.Lines))
	for _, line := range record.Lines {
		lineByID[line.ID] = line
	}

	batchNo := input.BatchNo
	if batchNo == "" {
		batchNo = record.ExchangeNo
	}

	createdRecords := make([]models.ShipmentRecord, 0, len(input.Lines))
	for _, lineInput := range input.Lines {
		line, ok := lineByID[lineInput.SalesExchangeLineID]
		if !ok {
			return ConfirmSalesExchangeReplacementShipmentResult{}, errors.New("sales exchange line not found")
		}
		if line.OldItemReceivedQuantity+salesReturnQuantityTolerance < line.ExchangeQuantity {
			return ConfirmSalesExchangeReplacementShipmentResult{}, errors.New("sales exchange old item has not been fully received")
		}
		remainingQuantity := line.ExchangeQuantity - line.ReplacementShippedQuantity
		if lineInput.Quantity-remainingQuantity > salesReturnQuantityTolerance {
			return ConfirmSalesExchangeReplacementShipmentResult{}, errors.New("sales exchange replacement shipment quantity exceeds remaining quantity")
		}
		if err := bindSalesExchangeExecutionBarcodesTx(
			tx,
			record,
			line,
			lineInput.Barcodes,
			SalesExchangeLabelSideReplacementItem,
		); err != nil {
			return ConfirmSalesExchangeReplacementShipmentResult{}, err
		}
		materialResolution, err := resolveSalesExchangeReplacementMaterialTx(tx, line)
		if err != nil {
			return ConfirmSalesExchangeReplacementShipmentResult{}, err
		}
		material := materialResolution.Material
		shipment := models.ShipmentRecord{
			BaseModel:            models.BaseModel{ID: uuid.NewString()},
			MaterialID:           material.ID,
			MaterialName:         material.Name,
			MaterialCode:         material.Code,
			SourceType:           AfterSalesSourceSalesExchangeReplacement,
			SourceID:             record.ID,
			SourceLineID:         line.ID,
			ExecutionKey:         input.ExecutionKey,
			ExecutionFingerprint: executionFingerprint,
			SalesOrderID:         record.SalesOrderID,
			SalesOrderLineID:     line.SalesOrderLineID,
			Quantity:             lineInput.Quantity,
			SourceCategory:       input.SourceCategory,
			BatchNo:              batchNo,
			OrderNo:              record.ExchangeNo,
			TrackingNo:           input.ReplacementTrackingNo,
			Status:               "COMMITTED",
			ShipmentDate:         input.ShipmentDate,
			Operator:             input.Operator,
			Remarks:              input.Remarks,
		}
		if err := commitShipmentRecordTx(nil, tx, &shipment, shipmentCommitOptions{
			auditAction:          "SALES_EXCHANGE_REPLACEMENT_SHIPMENT",
			skipZeroValueVoucher: true,
		}); err != nil {
			return ConfirmSalesExchangeReplacementShipmentResult{}, err
		}
		createdRecords = append(createdRecords, shipment)

		nextShippedQuantity := math.Round((line.ReplacementShippedQuantity+lineInput.Quantity)*100) / 100
		nextLineStatus := deriveSalesExchangeLineExecutionStatus(
			line.OldItemReceivedQuantity,
			nextShippedQuantity,
			line.ExchangeQuantity,
		)
		if err := tx.Model(&models.SalesExchangeLine{}).
			Where("id = ? AND sales_exchange_id = ?", line.ID, record.ID).
			Updates(map[string]any{
				"replacement_shipped_quantity": nextShippedQuantity,
				"status":                       nextLineStatus,
			}).Error; err != nil {
			return ConfirmSalesExchangeReplacementShipmentResult{}, err
		}
	}

	var reloaded models.SalesExchange
	if err := tx.Preload("Lines.LabelCodes").Preload("LabelCodes").First(&reloaded, "id = ?", record.ID).Error; err != nil {
		return ConfirmSalesExchangeReplacementShipmentResult{}, err
	}
	nextStatus := deriveSalesExchangeExecutionStatus(reloaded)
	updateFields := map[string]any{
		"status":                       nextStatus,
		"replacement_shipped_at":       input.ShipmentDate,
		"replacement_shipped_by":       input.Operator,
		"replacement_source_category":  input.SourceCategory,
		"replacement_batch_no":         batchNo,
		"replacement_shipment_remarks": input.Remarks,
	}
	if input.ReplacementTrackingNo != "" {
		updateFields["replacement_tracking_no"] = input.ReplacementTrackingNo
	}
	if err := tx.Model(&models.SalesExchange{}).Where("id = ?", record.ID).Updates(updateFields).Error; err != nil {
		return ConfirmSalesExchangeReplacementShipmentResult{}, err
	}
	if err := tx.Preload("Lines.LabelCodes").Preload("LabelCodes").First(&reloaded, "id = ?", record.ID).Error; err != nil {
		return ConfirmSalesExchangeReplacementShipmentResult{}, err
	}

	return ConfirmSalesExchangeReplacementShipmentResult{
		SalesExchange:          reloaded,
		CreatedShipmentRecords: createdRecords,
	}, nil
}

func resolveSalesExchangeReplacementMaterialTx(tx *gorm.DB, line models.SalesExchangeLine) (ProductInventoryMaterialResolution, error) {
	replacementProductCode := strings.TrimSpace(line.ReplacementProductCode)
	if replacementProductCode == "" {
		replacementProductCode = strings.TrimSpace(line.ProductCode)
	}
	replacementProductModel := strings.TrimSpace(line.ReplacementProductModel)
	if replacementProductModel == "" {
		replacementProductModel = strings.TrimSpace(line.ProductModel)
	}
	productID := ""
	if strings.EqualFold(replacementProductCode, strings.TrimSpace(line.ProductCode)) &&
		(strings.EqualFold(replacementProductModel, strings.TrimSpace(line.ProductModel)) || replacementProductModel == "") {
		productID = strings.TrimSpace(line.ProductID)
	}
	return ResolveInventoryMaterialForProductSnapshotTx(tx, ProductInventoryMaterialResolutionSnapshot{
		ProductID:    productID,
		ProductCode:  replacementProductCode,
		ProductModel: replacementProductModel,
	})
}

func deriveSalesExchangeLineExecutionStatus(oldItemReceivedQuantity float64, replacementShippedQuantity float64, exchangeQuantity float64) string {
	if replacementShippedQuantity+salesReturnQuantityTolerance >= exchangeQuantity {
		return SalesExchangeStatusReplacementShipped
	}
	if replacementShippedQuantity > salesReturnQuantityTolerance {
		return SalesExchangeStatusReplacementPartiallyShipped
	}
	if oldItemReceivedQuantity+salesReturnQuantityTolerance >= exchangeQuantity {
		return SalesExchangeStatusOldItemReceived
	}
	if oldItemReceivedQuantity > salesReturnQuantityTolerance {
		return SalesExchangeStatusOldItemPartiallyReceived
	}
	return SalesExchangeStatusDraft
}

func deriveSalesExchangeExecutionStatus(record models.SalesExchange) string {
	if len(record.Lines) == 0 {
		return normalizeSalesExchangeStatus(record.Status)
	}
	allOldItemsReceived := true
	anyOldItemReceived := false
	allReplacementShipped := true
	anyReplacementShipped := false
	for _, line := range record.Lines {
		if line.OldItemReceivedQuantity > salesReturnQuantityTolerance {
			anyOldItemReceived = true
		}
		if line.OldItemReceivedQuantity+salesReturnQuantityTolerance < line.ExchangeQuantity {
			allOldItemsReceived = false
		}
		if line.ReplacementShippedQuantity > salesReturnQuantityTolerance {
			anyReplacementShipped = true
		}
		if line.ReplacementShippedQuantity+salesReturnQuantityTolerance < line.ExchangeQuantity {
			allReplacementShipped = false
		}
	}
	if allOldItemsReceived && allReplacementShipped {
		return SalesExchangeStatusReplacementShipped
	}
	if anyReplacementShipped {
		return SalesExchangeStatusReplacementPartiallyShipped
	}
	if allOldItemsReceived {
		return SalesExchangeStatusOldItemReceived
	}
	if anyOldItemReceived {
		return SalesExchangeStatusOldItemPartiallyReceived
	}
	return normalizeSalesExchangeStatus(record.Status)
}

type salesExchangeExecutionRecords struct {
	inbound   []models.InboundRecord
	shipments []models.ShipmentRecord
}

func loadSalesExchangeExecutionRecordsBySource(
	items []models.SalesExchange,
) (map[string]salesExchangeExecutionRecords, error) {
	result := make(map[string]salesExchangeExecutionRecords, len(items))
	ids := make([]string, 0, len(items))
	for _, item := range items {
		if strings.TrimSpace(item.ID) == "" {
			continue
		}
		ids = append(ids, item.ID)
		result[item.ID] = salesExchangeExecutionRecords{
			inbound:   []models.InboundRecord{},
			shipments: []models.ShipmentRecord{},
		}
	}
	if len(ids) == 0 {
		return result, nil
	}

	var inboundRecords []models.InboundRecord
	if err := db.DB.
		Where(
			"source_type = ? AND source_id IN ?",
			AfterSalesSourceSalesExchangeOldItem,
			ids,
		).
		Order("inbound_date asc, created_at asc").
		Find(&inboundRecords).Error; err != nil {
		return nil, err
	}
	for _, record := range inboundRecords {
		execution := result[record.SourceID]
		execution.inbound = append(execution.inbound, record)
		result[record.SourceID] = execution
	}

	var shipmentRecords []models.ShipmentRecord
	if err := db.DB.
		Where(
			"source_type = ? AND source_id IN ?",
			AfterSalesSourceSalesExchangeReplacement,
			ids,
		).
		Order("shipment_date asc, created_at asc").
		Find(&shipmentRecords).Error; err != nil {
		return nil, err
	}
	for _, record := range shipmentRecords {
		execution := result[record.SourceID]
		execution.shipments = append(execution.shipments, record)
		result[record.SourceID] = execution
	}

	return result, nil
}

func mapShipmentRecordsToResponse(
	records []models.ShipmentRecord,
) []InventoryShipmentRecordResponse {
	result := make([]InventoryShipmentRecordResponse, 0, len(records))
	for _, record := range records {
		result = append(result, MapShipmentRecordToResponse(record))
	}
	return result
}

func loadSalesExchangeOrderForUpdate(tx *gorm.DB, salesOrderID string) (models.SalesOrder, error) {
	var order models.SalesOrder
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Lines").
		Where("id = ?", strings.TrimSpace(salesOrderID)).
		First(&order).Error; err != nil {
		return models.SalesOrder{}, err
	}
	return order, nil
}

func buildSalesExchangeLines(order models.SalesOrder, consumedQuantityMap map[uint]float64, inputLines []CreateSalesExchangeLineInput) ([]models.SalesExchangeLine, map[uint][]SalesExchangeRecognizedLabelInput, float64, error) {
	lineMap := make(map[uint]models.SalesOrderLine, len(order.Lines))
	for _, line := range order.Lines {
		lineMap[line.ID] = line
	}

	usedLineIDs := make(map[uint]struct{}, len(inputLines))
	lineLabelInputsByOrderLineID := make(map[uint][]SalesExchangeRecognizedLabelInput, len(inputLines))
	lines := make([]models.SalesExchangeLine, 0, len(inputLines))
	totalQuantity := 0.0

	for _, item := range inputLines {
		if item.SalesOrderLineID == 0 {
			return nil, nil, 0, errors.New("sales order line id is required")
		}
		if item.ExchangeQuantity <= 0 {
			return nil, nil, 0, errors.New("exchange quantity must be greater than zero")
		}
		if _, exists := usedLineIDs[item.SalesOrderLineID]; exists {
			return nil, nil, 0, errors.New("duplicate sales exchange line")
		}
		usedLineIDs[item.SalesOrderLineID] = struct{}{}

		orderLine, ok := lineMap[item.SalesOrderLineID]
		if !ok {
			return nil, nil, 0, errors.New("sales order line not found")
		}
		guard := statemachine.CanCreateSalesReturn(order, consumedQuantityMap, map[uint]float64{
			item.SalesOrderLineID: item.ExchangeQuantity,
		})
		if !guard.Allowed {
			return nil, nil, 0, guard.Err()
		}

		replacementMode := strings.TrimSpace(item.ReplacementMode)
		if replacementMode == "" {
			replacementMode = "sameSalesOrderLineItem"
		}
		lines = append(lines, models.SalesExchangeLine{
			SalesOrderLineID:                      item.SalesOrderLineID,
			LineNo:                                orderLine.LineNo,
			ProductID:                             orderLine.ProductID,
			ProductCode:                           orderLine.ProductCode,
			ProductModel:                          orderLine.ProductModel,
			Specification:                         orderLine.Specification,
			ProductDisplayTitleSnapshot:           orderLine.ProductDisplayTitleSnapshot,
			ProductDisplaySubtitleSnapshot:        orderLine.ProductDisplaySubtitleSnapshot,
			ProductDisplayCodeSnapshot:            orderLine.ProductDisplayCodeSnapshot,
			ProductDisplayFullLabelSnapshot:       orderLine.ProductDisplayFullLabelSnapshot,
			ProductDisplayStrategyVersionSnapshot: orderLine.ProductDisplayStrategyVersionSnapshot,
			Description:                           orderLine.Description,
			UOM:                                   orderLine.UOM,
			OriginalOrderQuantity:                 orderLine.Qty,
			DeliveredQuantity:                     orderLine.DeliveredQty,
			ExchangeQuantity:                      item.ExchangeQuantity,
			Status:                                SalesExchangeStatusDraft,
			ReplacementMode:                       replacementMode,
			ReplacementProductCode:                item.ReplacementProductCode,
			ReplacementProductModel:               item.ReplacementProductModel,
			IssueCategory:                         item.IssueCategory,
			IssueDescription:                      item.IssueDescription,
		})
		lineLabelInputsByOrderLineID[item.SalesOrderLineID] = item.LabelCodes
		totalQuantity += item.ExchangeQuantity
	}
	if len(lines) == 0 {
		return nil, nil, 0, errors.New("sales exchange lines are required")
	}
	return lines, lineLabelInputsByOrderLineID, totalQuantity, nil
}

func buildSalesExchangeLabelCodeModels(record models.SalesExchange, lineLabelInputsByOrderLineID map[uint][]SalesExchangeRecognizedLabelInput, unmatchedInputs []SalesExchangeUnmatchedLabelInput) ([]models.SalesExchangeLabelCode, error) {
	seenNormalizedLabelCodes := make(map[string]struct{})
	labelCodes := make([]models.SalesExchangeLabelCode, 0)
	for _, line := range record.Lines {
		inputs := lineLabelInputsByOrderLineID[line.SalesOrderLineID]
		for _, input := range inputs {
			label, err := buildSalesExchangeMatchedLabelCode(record.ID, line, input)
			if err != nil {
				return nil, err
			}
			if label.NormalizedLabelCode == "" {
				continue
			}
			if _, exists := seenNormalizedLabelCodes[label.NormalizedLabelCode]; exists {
				return nil, errors.New("duplicate sales exchange label code")
			}
			seenNormalizedLabelCodes[label.NormalizedLabelCode] = struct{}{}
			labelCodes = append(labelCodes, label)
		}
	}
	for _, input := range unmatchedInputs {
		label, err := buildSalesExchangeUnmatchedLabelCode(record.ID, input)
		if err != nil {
			return nil, err
		}
		if label.NormalizedLabelCode == "" {
			continue
		}
		if _, exists := seenNormalizedLabelCodes[label.NormalizedLabelCode]; exists {
			return nil, errors.New("duplicate sales exchange label code")
		}
		seenNormalizedLabelCodes[label.NormalizedLabelCode] = struct{}{}
		labelCodes = append(labelCodes, label)
	}
	return labelCodes, nil
}

func buildSalesExchangeMatchedLabelCode(salesExchangeID string, line models.SalesExchangeLine, input SalesExchangeRecognizedLabelInput) (models.SalesExchangeLabelCode, error) {
	recognizedAt, err := parseSalesExchangeFlexibleTime(input.RecognizedAtRaw, "recognizedAt")
	if err != nil {
		return models.SalesExchangeLabelCode{}, err
	}
	if recognizedAt == nil {
		now := time.Now()
		recognizedAt = &now
	}
	return models.SalesExchangeLabelCode{
		SalesExchangeID:     salesExchangeID,
		SalesExchangeLineID: line.ID,
		SalesOrderLineID:    line.SalesOrderLineID,
		RawLabelCode:        strings.TrimSpace(input.RawLabelCode),
		NormalizedLabelCode: canonicalAfterSalesCode(input.RawLabelCode, input.NormalizedLabelCode),
		RecognitionSource:   strings.TrimSpace(input.RecognitionSource),
		RecognizedAt:        *recognizedAt,
		Side:                normalizeSalesExchangeLabelSide(input.Side, SalesExchangeLabelSideOldItem),
		Status:              "Matched",
	}, nil
}

func normalizeSalesExchangeExecutionBarcodeInput(
	input SalesExchangeExecutionBarcodeInput,
	defaultSide string,
	defaultRecognitionSource string,
) SalesExchangeExecutionBarcodeInput {
	input.RawLabelCode = strings.TrimSpace(input.RawLabelCode)
	input.NormalizedLabelCode = canonicalAfterSalesCode(input.RawLabelCode, input.NormalizedLabelCode)
	input.RecognitionSource = strings.TrimSpace(input.RecognitionSource)
	if input.RecognitionSource == "" {
		input.RecognitionSource = defaultRecognitionSource
	}
	input.Side = normalizeSalesExchangeLabelSide(input.Side, defaultSide)
	input.RecognizedAtRaw = strings.TrimSpace(input.RecognizedAtRaw)
	return input
}

func bindSalesExchangeExecutionBarcodesTx(
	tx *gorm.DB,
	record models.SalesExchange,
	line models.SalesExchangeLine,
	inputs []SalesExchangeExecutionBarcodeInput,
	side string,
) error {
	seenNormalizedCodes := make(map[string]struct{}, len(inputs))
	for _, input := range inputs {
		normalizedCode := canonicalAfterSalesCode(input.RawLabelCode, input.NormalizedLabelCode)
		if normalizedCode == "" {
			return errors.New("sales exchange execution barcode is required")
		}
		if _, exists := seenNormalizedCodes[normalizedCode]; exists {
			return errors.New("duplicate sales exchange label code")
		}
		seenNormalizedCodes[normalizedCode] = struct{}{}

		var existing models.SalesExchangeLabelCode
		err := tx.Where(
			"sales_exchange_id = ? AND normalized_label_code = ?",
			record.ID,
			normalizedCode,
		).First(&existing).Error
		if err == nil {
			if existing.SalesExchangeLineID == 0 &&
				(strings.TrimSpace(existing.Side) == "" ||
					strings.EqualFold(existing.Side, side)) {
				recognizedAt, parseErr := parseSalesExchangeFlexibleTime(
					input.RecognizedAtRaw,
					"recognizedAt",
				)
				if parseErr != nil {
					return parseErr
				}
				updates := map[string]any{
					"sales_exchange_line_id": line.ID,
					"sales_order_line_id":    line.SalesOrderLineID,
					"side":                   side,
					"status":                 "Matched",
					"unmatched_reason":       "",
					"recognition_source":     strings.TrimSpace(input.RecognitionSource),
				}
				if recognizedAt != nil {
					updates["recognized_at"] = *recognizedAt
				}
				if err := tx.Model(&models.SalesExchangeLabelCode{}).
					Where("id = ?", existing.ID).
					Updates(updates).Error; err != nil {
					return err
				}
				continue
			}
			if existing.SalesExchangeLineID != line.ID ||
				!strings.EqualFold(existing.Side, side) {
				return errors.New("duplicate sales exchange label code")
			}
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		label, err := buildSalesExchangeMatchedLabelCode(
			record.ID,
			line,
			SalesExchangeRecognizedLabelInput{
				RawLabelCode:        input.RawLabelCode,
				NormalizedLabelCode: normalizedCode,
				RecognizedAtRaw:     input.RecognizedAtRaw,
				RecognitionSource:   input.RecognitionSource,
				Side:                side,
			},
		)
		if err != nil {
			return err
		}
		if err := tx.Create(&label).Error; err != nil {
			return err
		}
	}
	return nil
}

func buildSalesExchangeUnmatchedLabelCode(salesExchangeID string, input SalesExchangeUnmatchedLabelInput) (models.SalesExchangeLabelCode, error) {
	recognizedAt, err := parseSalesExchangeFlexibleTime(input.RecognizedAtRaw, "recognizedAt")
	if err != nil {
		return models.SalesExchangeLabelCode{}, err
	}
	if recognizedAt == nil {
		now := time.Now()
		recognizedAt = &now
	}
	return models.SalesExchangeLabelCode{
		SalesExchangeID:     salesExchangeID,
		RawLabelCode:        strings.TrimSpace(input.RawLabelCode),
		NormalizedLabelCode: canonicalAfterSalesCode(input.RawLabelCode, input.NormalizedLabelCode),
		RecognitionSource:   strings.TrimSpace(input.RecognitionSource),
		RecognizedAt:        *recognizedAt,
		Side:                normalizeSalesExchangeLabelSide(input.Side, SalesExchangeLabelSideOldItem),
		Status:              "Unmatched",
		UnmatchedReason:     strings.TrimSpace(input.UnmatchedReason),
	}, nil
}

func normalizeSalesExchangeLabelSide(raw string, defaultSide string) string {
	trimmed := strings.TrimSpace(raw)
	switch {
	case strings.EqualFold(trimmed, SalesExchangeLabelSideOldItem):
		return SalesExchangeLabelSideOldItem
	case strings.EqualFold(trimmed, SalesExchangeLabelSideReplacementItem):
		return SalesExchangeLabelSideReplacementItem
	}
	defaultSide = strings.TrimSpace(defaultSide)
	if defaultSide == "" {
		return SalesExchangeLabelSideOldItem
	}
	return defaultSide
}

func generateSalesExchangeNoTx(tx *gorm.DB, now time.Time) (string, error) {
	dayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	dayEnd := dayStart.Add(24 * time.Hour)

	var count int64
	if err := tx.Model(&models.SalesExchange{}).
		Where("exchange_date >= ? AND exchange_date < ?", dayStart, dayEnd).
		Count(&count).Error; err != nil {
		return "", err
	}
	return fmt.Sprintf("SX-%s-%03d", dayStart.Format("20060102"), count+1), nil
}
