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

const salesExchangeDateOnlyLayout = "2006-01-02"

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
		status := normalizeSalesExchangeStatus(statusRaw)
		if status != "" {
			tx = tx.Where("status = ?", status)
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

	return SalesExchangeListResponse{
		Items:    MapSalesExchangesToResponse(items),
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
	return MapSalesExchangeToResponse(record), nil
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

func ConfirmSalesExchangeOldItemInbound(input ConfirmSalesExchangeOldItemInboundInput) (ConfirmSalesExchangeOldItemInboundResponse, error) {
	normalized, err := normalizeConfirmSalesExchangeOldItemInboundInput(input)
	if err != nil {
		return ConfirmSalesExchangeOldItemInboundResponse{}, err
	}

	var result ConfirmSalesExchangeOldItemInboundResult
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		confirmed, err := confirmSalesExchangeOldItemInboundTx(tx, normalized)
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
	exchangedQuantityMap, err := loadSalesExchangeQuantityMap(tx, order.Lines)
	if err != nil {
		return CreateSalesExchangeResult{}, err
	}
	if guard := statemachine.CanCreateSalesReturn(order, exchangedQuantityMap, nil); !guard.Allowed {
		return CreateSalesExchangeResult{}, guard.Err()
	}

	exchangeNo, err := generateSalesExchangeNoTx(tx, input.ExchangeDate)
	if err != nil {
		return CreateSalesExchangeResult{}, err
	}
	lines, lineLabelInputsByOrderLineID, totalQuantity, err := buildSalesExchangeLines(order, exchangedQuantityMap, input.Lines)
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

func confirmSalesExchangeOldItemInboundTx(tx *gorm.DB, input ConfirmSalesExchangeOldItemInboundInput) (ConfirmSalesExchangeOldItemInboundResult, error) {
	var record models.SalesExchange
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Lines.LabelCodes").
		Preload("LabelCodes").
		First(&record, "id = ?", input.SalesExchangeID).Error; err != nil {
		return ConfirmSalesExchangeOldItemInboundResult{}, err
	}
	if normalizeSalesExchangeStatus(record.Status) != SalesExchangeStatusDraft {
		return ConfirmSalesExchangeOldItemInboundResult{}, errors.New("only draft sales exchanges can confirm old item inbound")
	}
	if len(record.Lines) == 0 {
		return ConfirmSalesExchangeOldItemInboundResult{}, errors.New("sales exchange lines are required")
	}

	batchNo := input.BatchNo
	if batchNo == "" {
		batchNo = record.ExchangeNo
	}
	createdRecords := make([]models.InboundRecord, 0, len(record.Lines))
	for _, line := range record.Lines {
		if line.ExchangeQuantity <= 0 {
			return ConfirmSalesExchangeOldItemInboundResult{}, errors.New("sales exchange line quantity must be greater than zero")
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
			BaseModel:      models.BaseModel{ID: uuid.NewString()},
			MaterialID:     material.ID,
			MaterialName:   material.Name,
			MaterialCode:   material.Code,
			Quantity:       line.ExchangeQuantity,
			PurchasePrice:  0,
			TargetCategory: input.TargetCategory,
			BatchNo:        batchNo,
			InboundDate:    input.InboundDate,
			Operator:       input.Operator,
			Remarks:        input.Remarks,
		}
		if _, err := recordInboundTx(tx, &inbound); err != nil {
			return ConfirmSalesExchangeOldItemInboundResult{}, err
		}
		createdRecords = append(createdRecords, inbound)
	}

	now := time.Now()
	if err := tx.Model(&models.SalesExchange{}).Where("id = ?", record.ID).Updates(map[string]any{
		"status":                        SalesExchangeStatusOldItemReceived,
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

func loadSalesExchangeQuantityMap(tx *gorm.DB, orderLines []models.SalesOrderLine) (map[uint]float64, error) {
	exchangedQuantityMap := make(map[uint]float64)
	if len(orderLines) == 0 {
		return exchangedQuantityMap, nil
	}
	lineIDs := make([]uint, 0, len(orderLines))
	for _, line := range orderLines {
		lineIDs = append(lineIDs, line.ID)
	}

	type exchangedQuantityRow struct {
		SalesOrderLineID  uint    `gorm:"column:sales_order_line_id"`
		ExchangedQuantity float64 `gorm:"column:exchanged_quantity"`
	}
	var rows []exchangedQuantityRow
	if err := tx.Table("sales_exchange_lines AS sel").
		Select("sel.sales_order_line_id AS sales_order_line_id, COALESCE(SUM(sel.exchange_quantity), 0) AS exchanged_quantity").
		Joins("JOIN sales_exchanges AS se ON se.id = sel.sales_exchange_id").
		Where("sel.sales_order_line_id IN ? AND se.deleted_at IS NULL AND se.status <> ?", lineIDs, SalesExchangeStatusCanceled).
		Group("sel.sales_order_line_id").
		Scan(&rows).Error; err != nil {
		return exchangedQuantityMap, err
	}
	for _, row := range rows {
		exchangedQuantityMap[row.SalesOrderLineID] = row.ExchangedQuantity
	}
	return exchangedQuantityMap, nil
}

func buildSalesExchangeLines(order models.SalesOrder, exchangedQuantityMap map[uint]float64, inputLines []CreateSalesExchangeLineInput) ([]models.SalesExchangeLine, map[uint][]SalesExchangeRecognizedLabelInput, float64, error) {
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
		guard := statemachine.CanCreateSalesReturn(order, exchangedQuantityMap, map[uint]float64{
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
			SalesOrderLineID:        item.SalesOrderLineID,
			LineNo:                  orderLine.LineNo,
			ProductID:               orderLine.ProductID,
			ProductCode:             orderLine.ProductCode,
			ProductModel:            orderLine.ProductModel,
			Specification:           orderLine.Specification,
			Description:             orderLine.Description,
			UOM:                     orderLine.UOM,
			OriginalOrderQuantity:   orderLine.Qty,
			DeliveredQuantity:       orderLine.DeliveredQty,
			ExchangeQuantity:        item.ExchangeQuantity,
			ReplacementMode:         replacementMode,
			ReplacementProductCode:  item.ReplacementProductCode,
			ReplacementProductModel: item.ReplacementProductModel,
			IssueCategory:           item.IssueCategory,
			IssueDescription:        item.IssueDescription,
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
		NormalizedLabelCode: strings.TrimSpace(input.NormalizedLabelCode),
		RecognitionSource:   strings.TrimSpace(input.RecognitionSource),
		RecognizedAt:        *recognizedAt,
		Status:              "Matched",
	}, nil
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
		NormalizedLabelCode: strings.TrimSpace(input.NormalizedLabelCode),
		RecognitionSource:   strings.TrimSpace(input.RecognitionSource),
		RecognizedAt:        *recognizedAt,
		Status:              "Unmatched",
		UnmatchedReason:     strings.TrimSpace(input.UnmatchedReason),
	}, nil
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
