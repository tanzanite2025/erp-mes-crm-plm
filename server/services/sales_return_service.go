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

var ErrSalesReturnDeleteRequiresCreated = errors.New("only created sales returns can be deleted")
var ErrSalesReturnDeleteHasActualAmountRecords = errors.New("sales return with actual amount records cannot be deleted")

type SalesReturnListQuery struct {
	Page            int
	PageSize        int
	CustomerID      string
	StatusFilterRaw string
	Keyword         string
}

func ListSalesReturns(query SalesReturnListQuery) (SalesReturnListResponse, error) {
	page := query.Page
	if page < 1 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize < 1 {
		pageSize = 50
	}

	tx := db.DB.Model(&models.SalesReturn{})

	customerID := strings.TrimSpace(query.CustomerID)
	if customerID != "" {
		tx = tx.Where("customer_id = ?", customerID)
	}

	statusFilterRaw := strings.TrimSpace(query.StatusFilterRaw)
	statusFilter := normalizeSalesReturnStatus(statusFilterRaw)
	if statusFilterRaw != "" && !strings.EqualFold(statusFilterRaw, "all") && statusFilter != "" {
		if statusFilter == SalesReturnStatusClosed {
			tx = tx.Where("status IN ?", []string{SalesReturnStatusClosed, SalesReturnStatusCompleted})
		} else {
			tx = tx.Where("status = ?", statusFilter)
		}
	}

	keyword := strings.TrimSpace(query.Keyword)
	if keyword != "" {
		likeKeyword := "%" + keyword + "%"
		tx = tx.Where(
			"LOWER(return_no) LIKE LOWER(?) OR LOWER(sales_order_no) LIKE LOWER(?) OR LOWER(customer_name) LIKE LOWER(?) OR LOWER(tracking_no) LIKE LOWER(?) OR LOWER(carrier) LIKE LOWER(?)",
			likeKeyword,
			likeKeyword,
			likeKeyword,
			likeKeyword,
			likeKeyword,
		)
	}

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return SalesReturnListResponse{}, err
	}

	var items []models.SalesReturn
	if err := tx.
		Preload("Lines.Barcodes").
		Order("return_date desc, created_at desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&items).Error; err != nil {
		return SalesReturnListResponse{}, err
	}

	inboundRecordsBySource, err := loadSalesReturnInboundRecordsBySource(items)
	if err != nil {
		return SalesReturnListResponse{}, err
	}
	responses := MapSalesReturnsToResponse(items)
	for index := range responses {
		responses[index].InboundRecords = mapInventoryInboundRecordsToResponse(
			inboundRecordsBySource[items[index].ID],
		)
	}

	return SalesReturnListResponse{
		Items:    responses,
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func GetSalesReturnByID(id string) (SalesReturnResponse, error) {
	var record models.SalesReturn
	if err := db.DB.Preload("Lines.Barcodes").First(&record, "id = ?", strings.TrimSpace(id)).Error; err != nil {
		return SalesReturnResponse{}, err
	}
	inboundRecordsBySource, err := loadSalesReturnInboundRecordsBySource([]models.SalesReturn{record})
	if err != nil {
		return SalesReturnResponse{}, err
	}
	response := MapSalesReturnToResponse(record)
	response.InboundRecords = mapInventoryInboundRecordsToResponse(
		inboundRecordsBySource[record.ID],
	)
	return response, nil
}

func CreateSalesReturn(input CreateSalesReturnInput) (CreateSalesReturnResponse, error) {
	salesOrderID := strings.TrimSpace(input.SalesOrderID)
	if salesOrderID == "" {
		return CreateSalesReturnResponse{}, errors.New("sales order id is required")
	}
	if len(input.Lines) == 0 {
		return CreateSalesReturnResponse{}, errors.New("sales return lines are required")
	}
	if strings.TrimSpace(input.ReturnDateRaw) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(input.ReturnDateRaw))
		if err != nil {
			return CreateSalesReturnResponse{}, errors.New("returnDate 格式错误，需为 RFC3339")
		}
		input.ReturnDate = parsed
	}
	if input.ReturnDate.IsZero() {
		input.ReturnDate = time.Now()
	}
	shippedAt, err := parseOptionalSalesReturnTime(input.ShippedAtRaw, "shippedAt")
	if err != nil {
		return CreateSalesReturnResponse{}, err
	}

	input.Operator = strings.TrimSpace(input.Operator)
	input.IssueCategory = strings.TrimSpace(input.IssueCategory)
	input.Reason = strings.TrimSpace(input.Reason)
	input.Remarks = strings.TrimSpace(input.Remarks)
	input.TrackingNo, input.Carrier, input.ShippedAt, input.LogisticsNote = normalizeSalesReturnLogisticsPayload(
		input.TrackingNo,
		input.Carrier,
		shippedAt,
		input.LogisticsNote,
	)
	if input.Operator == "" {
		input.Operator = "unknown"
	}

	var response CreateSalesReturnResponse
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		result, err := createSalesReturnTx(tx, input)
		if err != nil {
			return err
		}
		response = MapCreateSalesReturnResultToResponse(result)
		return nil
	})
	if err != nil {
		return CreateSalesReturnResponse{}, err
	}

	return response, nil
}

func PatchSalesReturn(input PatchSalesReturnInput) (SalesReturnResponse, error) {
	salesReturnID := strings.TrimSpace(input.SalesReturnID)
	if salesReturnID == "" {
		return SalesReturnResponse{}, errors.New("sales return id is required")
	}
	if len(input.Lines) == 0 {
		return SalesReturnResponse{}, errors.New("sales return lines are required")
	}
	if strings.TrimSpace(input.ReturnDateRaw) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(input.ReturnDateRaw))
		if err != nil {
			return SalesReturnResponse{}, errors.New("returnDate 格式错误，需为 RFC3339")
		}
		input.ReturnDate = parsed
	}
	input.Operator = strings.TrimSpace(input.Operator)
	input.IssueCategory = strings.TrimSpace(input.IssueCategory)
	input.Reason = strings.TrimSpace(input.Reason)
	input.Remarks = strings.TrimSpace(input.Remarks)
	if input.Operator == "" {
		input.Operator = "unknown"
	}

	var response SalesReturnResponse
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var record models.SalesReturn
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Lines.Barcodes").First(&record, "id = ?", salesReturnID).Error; err != nil {
			return err
		}

		status := normalizeSalesReturnStatus(record.Status)
		if status != SalesReturnStatusCreated && status != SalesReturnStatusInTransit {
			return errors.New("当前退货单状态不允许修改退货主体")
		}
		var inboundCount int64
		if err := tx.Model(&models.InboundRecord{}).
			Where("source_type = ? AND source_id = ?", AfterSalesSourceSalesReturn, record.ID).
			Count(&inboundCount).Error; err != nil {
			return err
		}
		if inboundCount > 0 {
			return errors.New("退货单已有入库事实，不允许重建退货明细")
		}
		for _, existingLine := range record.Lines {
			if existingLine.ReceivedQuantity > salesReturnQuantityTolerance {
				return errors.New("退货单已有入库数量，不允许重建退货明细")
			}
		}

		order, err := loadSalesReturnOrderForUpdate(tx, record.SalesOrderID)
		if err != nil {
			return err
		}
		if input.ReturnDate.IsZero() {
			input.ReturnDate = record.ReturnDate
		}

		consumedQuantityMap, err := loadSalesAfterSalesConsumedQuantityMap(tx, order.Lines, record.ID)
		if err != nil {
			return err
		}
		lines, totalQty, totalAmount, err := buildSalesReturnLines(order, consumedQuantityMap, input.Lines)
		if err != nil {
			return err
		}

		existingLinesByOrderLineID := make(map[uint]models.SalesReturnLine, len(record.Lines))
		for _, existingLine := range record.Lines {
			existingLinesByOrderLineID[existingLine.SalesOrderLineID] = existingLine
		}
		desiredOrderLineIDs := make(map[uint]struct{}, len(lines))
		for index := range lines {
			line := &lines[index]
			line.SalesReturnID = salesReturnID
			desiredOrderLineIDs[line.SalesOrderLineID] = struct{}{}
			existingLine, exists := existingLinesByOrderLineID[line.SalesOrderLineID]
			if exists {
				line.ID = existingLine.ID
				line.ReceivedQuantity = existingLine.ReceivedQuantity
				line.Status = existingLine.Status
				if err := tx.Model(&models.SalesReturnLine{}).
					Where("id = ? AND sales_return_id = ?", existingLine.ID, salesReturnID).
					Updates(map[string]any{
						"sales_order_line_id":                       line.SalesOrderLineID,
						"line_no":                                   line.LineNo,
						"product_id":                                line.ProductID,
						"product_code":                              line.ProductCode,
						"product_model":                             line.ProductModel,
						"specification":                             line.Specification,
						"product_display_title_snapshot":            line.ProductDisplayTitleSnapshot,
						"product_display_subtitle_snapshot":         line.ProductDisplaySubtitleSnapshot,
						"product_display_code_snapshot":             line.ProductDisplayCodeSnapshot,
						"product_display_full_label_snapshot":       line.ProductDisplayFullLabelSnapshot,
						"product_display_strategy_version_snapshot": line.ProductDisplayStrategyVersionSnapshot,
						"description":                               line.Description,
						"uom":                                       line.UOM,
						"quantity":                                  line.Quantity,
						"status":                                    line.Status,
						"price":                                     line.Price,
						"amount":                                    line.Amount,
						"issue_category":                            line.IssueCategory,
						"reason":                                    line.Reason,
						"evidences":                                 line.Evidences,
					}).Error; err != nil {
					return err
				}
				continue
			}
			if err := tx.Create(line).Error; err != nil {
				return err
			}
		}
		removedLineIDs := make([]uint, 0)
		for _, existingLine := range record.Lines {
			if _, keep := desiredOrderLineIDs[existingLine.SalesOrderLineID]; !keep {
				removedLineIDs = append(removedLineIDs, existingLine.ID)
			}
		}
		if len(removedLineIDs) > 0 {
			if err := tx.Where("sales_return_id = ? AND id IN ?", salesReturnID, removedLineIDs).
				Delete(&models.SalesReturnLine{}).Error; err != nil {
				return err
			}
		}
		record.Lines = lines
		existingBarcodeLineByCode := make(map[string]uint)
		for _, existingLine := range record.Lines {
			originalLine, existed := existingLinesByOrderLineID[existingLine.SalesOrderLineID]
			if !existed {
				continue
			}
			for _, barcode := range originalLine.Barcodes {
				existingBarcodeLineByCode[canonicalAfterSalesCode(barcode.RawCode, barcode.NormalizedCode)] = originalLine.ID
			}
		}
		barcodeInputs := salesReturnLineBarcodeInputsFromCreateLines(lines, input.Lines)
		newBarcodeInputs := make([]SalesReturnLineBarcodeInput, 0, len(barcodeInputs))
		for _, barcodeInput := range barcodeInputs {
			code := canonicalAfterSalesCode(barcodeInput.RawCode, barcodeInput.NormalizedCode)
			if existingLineID, exists := existingBarcodeLineByCode[code]; exists {
				if existingLineID != barcodeInput.SalesReturnLineID {
					return errors.New("duplicate sales return line barcode")
				}
				continue
			}
			newBarcodeInputs = append(newBarcodeInputs, barcodeInput)
		}
		if err := createSalesReturnLineBarcodesTx(
			tx,
			record,
			newBarcodeInputs,
			input.Operator,
			time.Now(),
		); err != nil {
			return err
		}

		record.ReturnDate = input.ReturnDate
		record.IssueCategory = input.IssueCategory
		record.Reason = input.Reason
		record.Remarks = input.Remarks
		record.Evidences = encodeOrderEvidences(input.Evidences)
		record.Operator = input.Operator
		record.TotalQuantity = math.Round(totalQty*100) / 100
		record.TotalAmount = math.Round(totalAmount*100) / 100
		record.Lines = nil
		if err := tx.Model(&models.SalesReturn{}).Where("id = ?", salesReturnID).Updates(map[string]any{
			"return_date":    record.ReturnDate,
			"issue_category": record.IssueCategory,
			"reason":         record.Reason,
			"remarks":        record.Remarks,
			"evidences":      record.Evidences,
			"operator":       record.Operator,
			"total_quantity": record.TotalQuantity,
			"total_amount":   record.TotalAmount,
		}).Error; err != nil {
			return err
		}

		var reloaded models.SalesReturn
		if err := tx.Preload("Lines.Barcodes").First(&reloaded, "id = ?", record.ID).Error; err != nil {
			return err
		}
		response = MapSalesReturnToResponse(reloaded)
		return nil
	})
	if err != nil {
		return SalesReturnResponse{}, err
	}

	return response, nil
}

func DeleteSalesReturn(id string) error {
	salesReturnID := strings.TrimSpace(id)
	if salesReturnID == "" {
		return errors.New("sales return id is required")
	}

	return db.DB.Transaction(func(tx *gorm.DB) error {
		var record models.SalesReturn
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&record, "id = ?", salesReturnID).Error; err != nil {
			return err
		}

		if normalizeSalesReturnStatus(record.Status) != SalesReturnStatusCreated {
			return ErrSalesReturnDeleteRequiresCreated
		}

		var actualAmountRecordCount int64
		if err := tx.Unscoped().Model(&models.SalesReturnActualAmountRecord{}).
			Where("sales_return_id = ?", record.ID).
			Count(&actualAmountRecordCount).Error; err != nil {
			return err
		}
		if actualAmountRecordCount > 0 {
			return ErrSalesReturnDeleteHasActualAmountRecords
		}

		if err := tx.Delete(&models.SalesReturn{}, "id = ?", record.ID).Error; err != nil {
			return err
		}

		return nil
	})
}

func createSalesReturnTx(tx *gorm.DB, input CreateSalesReturnInput) (CreateSalesReturnResult, error) {
	if tx == nil {
		return CreateSalesReturnResult{}, errors.New("transaction is required")
	}

	order, err := loadSalesReturnOrderForUpdate(tx, input.SalesOrderID)
	if err != nil {
		return CreateSalesReturnResult{}, err
	}
	consumedQuantityMap, err := loadSalesAfterSalesConsumedQuantityMap(tx, order.Lines, "")
	if err != nil {
		return CreateSalesReturnResult{}, err
	}
	if guard := statemachine.CanCreateSalesReturn(order, consumedQuantityMap, nil); !guard.Allowed {
		return CreateSalesReturnResult{}, guard.Err()
	}

	returnNo, err := generateSalesReturnNoTx(tx, input.ReturnDate)
	if err != nil {
		return CreateSalesReturnResult{}, err
	}
	resolvedStatus, err := resolveSalesReturnLifecycleStatus(SalesReturnStatusCreated, "", input.TrackingNo)
	if err != nil {
		return CreateSalesReturnResult{}, err
	}
	lines, totalQty, totalAmount, err := buildSalesReturnLines(order, consumedQuantityMap, input.Lines)
	if err != nil {
		return CreateSalesReturnResult{}, err
	}

	record := models.SalesReturn{
		BaseModel:     models.BaseModel{ID: uuid.NewString()},
		ReturnNo:      returnNo,
		SalesOrderID:  order.ID,
		SalesOrderNo:  order.OrderNo,
		CustomerID:    order.CustomerID,
		CustomerName:  order.CustomerName,
		Status:        resolvedStatus,
		ReturnDate:    input.ReturnDate,
		IssueCategory: input.IssueCategory,
		Reason:        input.Reason,
		Remarks:       input.Remarks,
		Evidences:     encodeOrderEvidences(input.Evidences),
		Operator:      input.Operator,
	}
	applySalesReturnLogisticsFields(&record, input.TrackingNo, input.Carrier, input.ShippedAt, input.LogisticsNote, input.Operator, time.Now())
	record.TotalQuantity = math.Round(totalQty*100) / 100
	record.TotalAmount = math.Round(totalAmount*100) / 100
	for index := range lines {
		lines[index].SalesReturnID = record.ID
	}
	record.Lines = lines

	if err := tx.Create(&record).Error; err != nil {
		return CreateSalesReturnResult{}, err
	}
	if err := createSalesReturnLineBarcodesTx(
		tx,
		record,
		salesReturnLineBarcodeInputsFromCreateLines(record.Lines, input.Lines),
		input.Operator,
		time.Now(),
	); err != nil {
		return CreateSalesReturnResult{}, err
	}
	if err := tx.Preload("Lines.Barcodes").First(&record, "id = ?", record.ID).Error; err != nil {
		return CreateSalesReturnResult{}, err
	}

	return CreateSalesReturnResult{
		SalesReturn: record,
		SalesOrder:  order,
	}, nil
}

func loadSalesReturnOrderForUpdate(tx *gorm.DB, salesOrderID string) (models.SalesOrder, error) {
	var order models.SalesOrder
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Lines").
		Where("id = ?", strings.TrimSpace(salesOrderID)).
		First(&order).Error; err != nil {
		return models.SalesOrder{}, err
	}
	return order, nil
}

func buildSalesReturnLines(order models.SalesOrder, consumedQuantityMap map[uint]float64, inputLines []CreateSalesReturnLineInput) ([]models.SalesReturnLine, float64, float64, error) {
	lineMap := make(map[uint]models.SalesOrderLine, len(order.Lines))
	for _, line := range order.Lines {
		lineMap[line.ID] = line
	}

	usedLineIDs := make(map[uint]struct{}, len(inputLines))
	lines := make([]models.SalesReturnLine, 0, len(inputLines))
	totalQty := 0.0
	totalAmount := 0.0

	for _, item := range inputLines {
		if item.SalesOrderLineID == 0 {
			return nil, 0, 0, errors.New("sales order line id is required")
		}
		if item.Quantity <= 0 {
			return nil, 0, 0, errors.New("return quantity must be greater than zero")
		}
		if _, exists := usedLineIDs[item.SalesOrderLineID]; exists {
			return nil, 0, 0, errors.New("duplicate sales order return line")
		}
		usedLineIDs[item.SalesOrderLineID] = struct{}{}

		orderLine, ok := lineMap[item.SalesOrderLineID]
		if !ok {
			return nil, 0, 0, errors.New("sales order line not found")
		}

		guard := statemachine.CanCreateSalesReturn(order, consumedQuantityMap, map[uint]float64{
			item.SalesOrderLineID: item.Quantity,
		})
		if !guard.Allowed {
			return nil, 0, 0, guard.Err()
		}

		price := item.Price
		if price <= 0 {
			price = orderLine.Price
		}
		if price < 0 {
			return nil, 0, 0, errors.New("return price must be greater than or equal to zero")
		}

		amount := math.Round(item.Quantity*price*100) / 100
		lines = append(lines, models.SalesReturnLine{
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
			Quantity:                              item.Quantity,
			Status:                                "Requested",
			Price:                                 price,
			Amount:                                amount,
			IssueCategory:                         strings.TrimSpace(item.IssueCategory),
			Reason:                                strings.TrimSpace(item.Reason),
			Evidences:                             encodeOrderEvidences(item.Evidences),
		})
		totalQty += item.Quantity
		totalAmount += amount
	}

	if len(lines) == 0 {
		return nil, 0, 0, errors.New("sales return lines are required")
	}

	return lines, totalQty, totalAmount, nil
}

func salesReturnLineBarcodeInputsFromCreateLines(
	lines []models.SalesReturnLine,
	inputLines []CreateSalesReturnLineInput,
) []SalesReturnLineBarcodeInput {
	lineByOrderLineID := make(map[uint]models.SalesReturnLine, len(lines))
	for _, line := range lines {
		lineByOrderLineID[line.SalesOrderLineID] = line
	}

	inputs := make([]SalesReturnLineBarcodeInput, 0)
	for _, inputLine := range inputLines {
		line, ok := lineByOrderLineID[inputLine.SalesOrderLineID]
		if !ok {
			continue
		}
		for _, barcode := range inputLine.Barcodes {
			code := strings.TrimSpace(barcode)
			if code == "" {
				continue
			}
			inputs = append(inputs, SalesReturnLineBarcodeInput{
				SalesReturnLineID:  line.ID,
				RawCode:            code,
				NormalizedCode:     strings.ToUpper(code),
				BindSource:         SalesReturnBarcodeBindSourceCreateForm,
				VerificationStatus: SalesReturnBarcodeStatusPending,
			})
		}
	}
	return inputs
}

func generateSalesReturnNoTx(tx *gorm.DB, now time.Time) (string, error) {
	dayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	dayEnd := dayStart.Add(24 * time.Hour)

	var count int64
	if err := tx.Model(&models.SalesReturn{}).
		Where("return_date >= ? AND return_date < ?", dayStart, dayEnd).
		Count(&count).Error; err != nil {
		return "", err
	}

	return fmt.Sprintf("SR-%s-%03d", dayStart.Format("20060102"), count+1), nil
}

func loadSalesReturnInboundRecordsBySource(
	items []models.SalesReturn,
) (map[string][]models.InboundRecord, error) {
	result := make(map[string][]models.InboundRecord, len(items))
	ids := make([]string, 0, len(items))
	for _, item := range items {
		if strings.TrimSpace(item.ID) == "" {
			continue
		}
		ids = append(ids, item.ID)
		result[item.ID] = []models.InboundRecord{}
	}
	if len(ids) == 0 {
		return result, nil
	}

	var records []models.InboundRecord
	if err := db.DB.
		Where("source_type = ? AND source_id IN ?", AfterSalesSourceSalesReturn, ids).
		Order("inbound_date asc, created_at asc").
		Find(&records).Error; err != nil {
		return nil, err
	}
	for _, record := range records {
		result[record.SourceID] = append(result[record.SourceID], record)
	}
	return result, nil
}

func mapInventoryInboundRecordsToResponse(
	records []models.InboundRecord,
) []InventoryInboundRecordResponse {
	result := make([]InventoryInboundRecordResponse, 0, len(records))
	for _, record := range records {
		result = append(result, MapInboundRecordToResponse(record))
	}
	return result
}
