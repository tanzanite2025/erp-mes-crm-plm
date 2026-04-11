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

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type PurchaseReturnListQuery struct {
	Page     int
	PageSize int
}

func ListPurchaseReturns(query PurchaseReturnListQuery) (PurchaseReturnListResponse, error) {
	page := query.Page
	if page < 1 {
		page = 1
	}
	pageSize := query.PageSize
	if pageSize < 1 {
		pageSize = 50
	}

	tx := db.DB.Model(&models.PurchaseReturn{})

	var total int64
	if err := tx.Count(&total).Error; err != nil {
		return PurchaseReturnListResponse{}, err
	}

	var items []models.PurchaseReturn
	if err := tx.
		Preload("Lines").
		Order("return_date desc, created_at desc").
		Limit(pageSize).
		Offset((page - 1) * pageSize).
		Find(&items).Error; err != nil {
		return PurchaseReturnListResponse{}, err
	}

	return PurchaseReturnListResponse{
		Items:    MapPurchaseReturnsToResponse(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func CreatePurchaseReturn(input CreatePurchaseReturnInput) (CreatePurchaseReturnResponse, error) {
	purchaseOrderID := strings.TrimSpace(input.PurchaseOrderID)
	if purchaseOrderID == "" {
		return CreatePurchaseReturnResponse{}, errors.New("purchase order id is required")
	}
	if len(input.Lines) == 0 {
		return CreatePurchaseReturnResponse{}, errors.New("purchase return lines are required")
	}
	if strings.TrimSpace(input.ReturnDateRaw) != "" {
		parsed, err := time.Parse(time.RFC3339, strings.TrimSpace(input.ReturnDateRaw))
		if err != nil {
			return CreatePurchaseReturnResponse{}, errors.New("returnDate 格式错误，需为 RFC3339")
		}
		input.ReturnDate = parsed
	}
	if input.ReturnDate.IsZero() {
		input.ReturnDate = time.Now()
	}

	input.Operator = strings.TrimSpace(input.Operator)
	input.IssueCategory = strings.TrimSpace(input.IssueCategory)
	input.Reason = strings.TrimSpace(input.Reason)
	input.Remarks = strings.TrimSpace(input.Remarks)
	if input.Operator == "" {
		input.Operator = "unknown"
	}

	var response CreatePurchaseReturnResponse
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		result, err := createPurchaseReturnTx(tx, input)
		if err != nil {
			return err
		}
		response = MapCreatePurchaseReturnResultToResponse(result)
		return nil
	})
	if err != nil {
		return CreatePurchaseReturnResponse{}, err
	}

	return response, nil
}

func createPurchaseReturnTx(tx *gorm.DB, input CreatePurchaseReturnInput) (CreatePurchaseReturnResult, error) {
	if tx == nil {
		return CreatePurchaseReturnResult{}, errors.New("transaction is required")
	}

	var order models.PurchaseOrder
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Lines").
		Where("id = ? AND is_deleted = ?", strings.TrimSpace(input.PurchaseOrderID), false).
		First(&order).Error; err != nil {
		return CreatePurchaseReturnResult{}, err
	}

	if order.Status == "Draft" || order.Status == "Canceled" || order.Status == "Received" {
		return CreatePurchaseReturnResult{}, errors.New("purchase order status does not allow pre-inbound return")
	}

	lineMap := make(map[uint]models.PurchaseOrderLine, len(order.Lines))
	for _, line := range order.Lines {
		lineMap[line.ID] = line
	}

	returnNo, err := generatePurchaseReturnNoTx(tx, input.ReturnDate)
	if err != nil {
		return CreatePurchaseReturnResult{}, err
	}

	record := models.PurchaseReturn{
		BaseModel:       models.BaseModel{ID: uuid.NewString()},
		ReturnNo:        returnNo,
		PurchaseOrderID: order.ID,
		PurchaseOrderNo: order.OrderNo,
		SupplierID:      order.SupplierID,
		SupplierName:    order.SupplierName,
		Status:          "Completed",
		ReturnDate:      input.ReturnDate,
		IssueCategory:   input.IssueCategory,
		Reason:          input.Reason,
		Remarks:         input.Remarks,
		Evidences:       encodeOrderEvidences(input.Evidences),
		Operator:        input.Operator,
	}

	usedLineIDs := make(map[uint]struct{}, len(input.Lines))
	lines := make([]models.PurchaseReturnLine, 0, len(input.Lines))
	totalQty := 0.0
	totalAmount := 0.0

	for _, item := range input.Lines {
		if item.PurchaseOrderLineID == 0 {
			return CreatePurchaseReturnResult{}, errors.New("purchase order line id is required")
		}
		if item.Quantity <= 0 {
			return CreatePurchaseReturnResult{}, errors.New("return quantity must be greater than zero")
		}

		if _, exists := usedLineIDs[item.PurchaseOrderLineID]; exists {
			return CreatePurchaseReturnResult{}, errors.New("duplicate purchase order return line")
		}
		usedLineIDs[item.PurchaseOrderLineID] = struct{}{}

		orderLine, ok := lineMap[item.PurchaseOrderLineID]
		if !ok {
			return CreatePurchaseReturnResult{}, errors.New("purchase order line not found")
		}

		remaining := orderLine.Qty - orderLine.ReceivedQty - orderLine.ReturnedQty
		if item.Quantity > remaining+purchaseReceiptTolerance {
			return CreatePurchaseReturnResult{}, errors.New("return quantity exceeds remaining receivable quantity")
		}

		price := item.Price
		if price <= 0 {
			price = orderLine.Price
		}
		if price < 0 {
			return CreatePurchaseReturnResult{}, errors.New("return price must be greater than or equal to zero")
		}

		amount := math.Round(item.Quantity*price*100) / 100
		lines = append(lines, models.PurchaseReturnLine{
			PurchaseOrderLineID: item.PurchaseOrderLineID,
			LineNo:              orderLine.LineNo,
			MaterialID:          orderLine.MaterialID,
			MaterialCode:        orderLine.MaterialCode,
			MaterialName:        orderLine.MaterialName,
			Specification:       orderLine.Specification,
			UOM:                 orderLine.UOM,
			Quantity:            item.Quantity,
			Price:               price,
			Amount:              amount,
			IssueCategory:       strings.TrimSpace(item.IssueCategory),
			Reason:              strings.TrimSpace(item.Reason),
			Evidences:           encodeOrderEvidences(item.Evidences),
		})
		totalQty += item.Quantity
		totalAmount += amount

		if err := tx.Model(&models.PurchaseOrderLine{}).
			Where("id = ? AND purchase_order_id = ?", item.PurchaseOrderLineID, order.ID).
			Update("returned_qty", gorm.Expr("returned_qty + ?", item.Quantity)).Error; err != nil {
			return CreatePurchaseReturnResult{}, err
		}
	}

	if len(lines) == 0 {
		return CreatePurchaseReturnResult{}, errors.New("purchase return lines are required")
	}

	record.TotalQuantity = math.Round(totalQty*100) / 100
	record.TotalAmount = math.Round(totalAmount*100) / 100
	record.Lines = lines

	if err := tx.Create(&record).Error; err != nil {
		return CreatePurchaseReturnResult{}, err
	}

	updatedOrder, err := recalculatePurchaseOrderStatusTx(tx, order.ID)
	if err != nil {
		return CreatePurchaseReturnResult{}, err
	}

	auditDiff, _ := json.Marshal(map[string]any{
		"returnNo":      record.ReturnNo,
		"purchaseOrder": order.OrderNo,
		"lineCount":     len(lines),
		"totalQuantity": record.TotalQuantity,
		"totalAmount":   record.TotalAmount,
		"issueCategory": record.IssueCategory,
		"reason":        record.Reason,
		"evidenceCount": len(input.Evidences),
	})
	if err := defaultServiceRuntime().auditLogger.Write(tx, AuditEntry{
		Module:   "PurchaseOrder",
		TargetID: order.ID,
		Action:   "PURCHASE_PRE_INBOUND_RETURN",
		Diff:     auditDiff,
		Operator: record.Operator,
	}); err != nil {
		return CreatePurchaseReturnResult{}, err
	}

	if err := tx.Preload("Lines").First(&record, "id = ?", record.ID).Error; err != nil {
		return CreatePurchaseReturnResult{}, err
	}

	return CreatePurchaseReturnResult{
		PurchaseReturn: record,
		PurchaseOrder:  updatedOrder,
	}, nil
}

func generatePurchaseReturnNoTx(tx *gorm.DB, now time.Time) (string, error) {
	dayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	dayEnd := dayStart.Add(24 * time.Hour)

	var count int64
	if err := tx.Model(&models.PurchaseReturn{}).
		Where("return_date >= ? AND return_date < ?", dayStart, dayEnd).
		Count(&count).Error; err != nil {
		return "", err
	}

	return fmt.Sprintf("PR-%s-%03d", dayStart.Format("20060102"), count+1), nil
}
