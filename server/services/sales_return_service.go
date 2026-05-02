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
		Preload("Lines").
		Order("return_date desc, created_at desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&items).Error; err != nil {
		return SalesReturnListResponse{}, err
	}

	return SalesReturnListResponse{
		Items:    MapSalesReturnsToResponse(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func GetSalesReturnByID(id string) (SalesReturnResponse, error) {
	var record models.SalesReturn
	if err := db.DB.Preload("Lines").First(&record, "id = ?", strings.TrimSpace(id)).Error; err != nil {
		return SalesReturnResponse{}, err
	}
	return MapSalesReturnToResponse(record), nil
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
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Lines").First(&record, "id = ?", salesReturnID).Error; err != nil {
			return err
		}

		status := normalizeSalesReturnStatus(record.Status)
		if status != SalesReturnStatusCreated && status != SalesReturnStatusInTransit {
			return errors.New("当前退货单状态不允许修改退货主体")
		}

		order, err := loadSalesReturnOrderForUpdate(tx, record.SalesOrderID)
		if err != nil {
			return err
		}
		if input.ReturnDate.IsZero() {
			input.ReturnDate = record.ReturnDate
		}

		returnedQuantityMap, err := loadSalesReturnReturnedQuantityMap(tx, order.Lines, record.ID)
		if err != nil {
			return err
		}
		lines, totalQty, totalAmount, err := buildSalesReturnLines(order, returnedQuantityMap, input.Lines)
		if err != nil {
			return err
		}

		if err := tx.Exec("DELETE FROM sales_return_lines WHERE sales_return_id = ?", salesReturnID).Error; err != nil {
			return err
		}
		for index := range lines {
			lines[index].SalesReturnID = salesReturnID
		}
		if len(lines) > 0 {
			if err := tx.Create(&lines).Error; err != nil {
				return err
			}
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
		if err := tx.Preload("Lines").First(&reloaded, "id = ?", record.ID).Error; err != nil {
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

		if err := tx.Where("sales_return_id = ?", record.ID).Delete(&models.SalesReturnActualAmountRecord{}).Error; err != nil {
			return err
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
	returnedQuantityMap, err := loadSalesReturnReturnedQuantityMap(tx, order.Lines, "")
	if err != nil {
		return CreateSalesReturnResult{}, err
	}
	if guard := statemachine.CanCreateSalesReturn(order, returnedQuantityMap, nil); !guard.Allowed {
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
	lines, totalQty, totalAmount, err := buildSalesReturnLines(order, returnedQuantityMap, input.Lines)
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
	if err := tx.Preload("Lines").First(&record, "id = ?", record.ID).Error; err != nil {
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

func loadSalesReturnReturnedQuantityMap(tx *gorm.DB, orderLines []models.SalesOrderLine, excludedSalesReturnID string) (map[uint]float64, error) {
	returnedQuantityMap := make(map[uint]float64)
	if len(orderLines) == 0 {
		return returnedQuantityMap, nil
	}

	lineIDs := make([]uint, 0, len(orderLines))
	for _, line := range orderLines {
		lineIDs = append(lineIDs, line.ID)
	}

	type aggregatedReturnedQuantityRow struct {
		SalesOrderLineID uint    `gorm:"column:sales_order_line_id"`
		ReturnedQuantity float64 `gorm:"column:returned_quantity"`
	}

	query := tx.Table("sales_return_lines AS srl").
		Select("srl.sales_order_line_id AS sales_order_line_id, COALESCE(SUM(srl.quantity), 0) AS returned_quantity").
		Joins("JOIN sales_returns AS sr ON sr.id = srl.sales_return_id").
		Where("srl.sales_order_line_id IN ? AND sr.deleted_at IS NULL", lineIDs)
	if strings.TrimSpace(excludedSalesReturnID) != "" {
		query = query.Where("sr.id <> ?", strings.TrimSpace(excludedSalesReturnID))
	}

	var rows []aggregatedReturnedQuantityRow
	if err := query.Group("srl.sales_order_line_id").Scan(&rows).Error; err != nil {
		return returnedQuantityMap, err
	}
	for _, row := range rows {
		returnedQuantityMap[row.SalesOrderLineID] = row.ReturnedQuantity
	}

	return returnedQuantityMap, nil
}

func buildSalesReturnLines(order models.SalesOrder, returnedQuantityMap map[uint]float64, inputLines []CreateSalesReturnLineInput) ([]models.SalesReturnLine, float64, float64, error) {
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

		guard := statemachine.CanCreateSalesReturn(order, returnedQuantityMap, map[uint]float64{
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
			SalesOrderLineID: item.SalesOrderLineID,
			LineNo:           orderLine.LineNo,
			ProductID:        orderLine.ProductID,
			ProductCode:      orderLine.ProductCode,
			ProductModel:     orderLine.ProductModel,
			Specification:    orderLine.Specification,
			Description:      orderLine.Description,
			UOM:              orderLine.UOM,
			Quantity:         item.Quantity,
			Price:            price,
			Amount:           amount,
			IssueCategory:    strings.TrimSpace(item.IssueCategory),
			Reason:           strings.TrimSpace(item.Reason),
			Evidences:        encodeOrderEvidences(item.Evidences),
		})
		totalQty += item.Quantity
		totalAmount += amount
	}

	if len(lines) == 0 {
		return nil, 0, 0, errors.New("sales return lines are required")
	}

	return lines, totalQty, totalAmount, nil
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
