package services

import (
	"errors"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/numbering"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	LinearBarcodeInventoryStatusAvailable = "AVAILABLE"
	LinearBarcodeInventoryStatusBound     = "BOUND"
	LinearBarcodeInventoryStatusExpired   = "EXPIRED"
	LinearBarcodeInventoryStatusScrapped  = "SCRAPPED"
	LinearBarcodeMaxBatchSize             = 200
)

const defaultLinearBarcodeInventoryTTL = 30 * 24 * time.Hour

var (
	ErrLinearBarcodeSalesOrderNotFound   = errors.New("linear barcode sales order not found")
	ErrLinearBarcodeOrderNotPrintable    = errors.New("linear barcode sales order is not printable")
	ErrLinearBarcodeOrderLineNotFound    = errors.New("linear barcode sales order line not found")
	ErrLinearBarcodeInventoryNotFound    = errors.New("linear barcode inventory item not found")
	ErrLinearBarcodeInventoryExpired     = errors.New("linear barcode inventory item expired")
	ErrLinearBarcodeInventoryUnavailable = errors.New("linear barcode inventory item unavailable")
	linearBarcodeDigitsPattern           = regexp.MustCompile(`^\d+$`)
	linearBarcodeSerialPattern           = regexp.MustCompile(`^\d{4}$`)
	linearBarcodeCodePattern             = regexp.MustCompile(`^\d{2}[1-90ND](?:0[1-9]|[12]\d|3[01])\d{3}[RD]\d{6}$`)
	linearBarcodePrintLocation           = time.FixedZone("CST", 8*60*60)
)

type LinearBarcodePrintValidationError struct {
	Message string
}

func (e *LinearBarcodePrintValidationError) Error() string {
	return e.Message
}

type CreateLinearBarcodeBatchRequest struct {
	SalesOrderID     string `json:"salesOrderId"`
	SalesOrderLineNo int    `json:"salesOrderLineNo"`
	Quantity         int    `json:"quantity"`
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

type CreateLinearBarcodeBatchResponse struct {
	Batch models.PrintBatch                    `json:"batch"`
	Items []LinearBarcodeInventoryItemResponse `json:"items"`
}

type ListLinearBarcodeInventoryRequest struct {
	SalesOrderID string
	BatchID      string
	Status       string
	Limit        int
}

type ListLinearBarcodeInventoryResponse struct {
	Items []LinearBarcodeInventoryItemResponse `json:"items"`
	Total int64                                `json:"total"`
}

func linearBarcodeInventoryTTL() time.Duration {
	rawHours := strings.TrimSpace(os.Getenv("LINEAR_BARCODE_INVENTORY_TTL_HOURS"))
	if rawHours == "" {
		return defaultLinearBarcodeInventoryTTL
	}
	hours, err := strconv.Atoi(rawHours)
	if err != nil || hours < 1 || hours > 24*365 {
		return defaultLinearBarcodeInventoryTTL
	}
	return time.Duration(hours) * time.Hour
}

func linearBarcodeMonthValue(now time.Time) string {
	month := int(now.Month())
	switch {
	case month <= 9:
		return strconv.Itoa(month)
	case month == 10:
		return "0"
	case month == 11:
		return "N"
	default:
		return "D"
	}
}

func buildCanonicalLinearBarcodeCode(now time.Time, line models.SalesOrderLine, serialNumber string) (string, error) {
	printTime := now.In(linearBarcodePrintLocation)
	modelCode := strings.ToUpper(strings.TrimSpace(line.ModelCodeSnapshot))
	appearanceCode := strings.ToUpper(strings.TrimSpace(line.AppearanceBarcodeCodeSnapshot))
	holePrefix := strings.ToUpper(strings.TrimSpace(line.HolePrefixSnapshot))
	holeCount := fmt.Sprintf("%02d", line.HoleCount)

	if len(modelCode) != 2 || !linearBarcodeDigitsPattern.MatchString(modelCode) {
		return "", &LinearBarcodePrintValidationError{Message: "订单行型号编码必须是两位数字"}
	}
	if len(appearanceCode) != 1 || !linearBarcodeDigitsPattern.MatchString(appearanceCode) {
		return "", &LinearBarcodePrintValidationError{Message: "订单行外观编码必须是一位数字"}
	}
	if holePrefix != "R" && holePrefix != "D" {
		return "", &LinearBarcodePrintValidationError{Message: "订单行孔型前缀必须是 R 或 D"}
	}
	if line.HoleCount < 0 || line.HoleCount > 99 {
		return "", &LinearBarcodePrintValidationError{Message: "订单行孔数必须在 0 到 99 之间"}
	}
	if !linearBarcodeSerialPattern.MatchString(serialNumber) {
		return "", &LinearBarcodePrintValidationError{Message: "发号规则必须生成四位数字流水号"}
	}

	code := fmt.Sprintf(
		"%s%s%s%s%s%s%s%s",
		printTime.Format("06"),
		linearBarcodeMonthValue(printTime),
		printTime.Format("02"),
		modelCode,
		appearanceCode,
		holePrefix,
		holeCount,
		serialNumber,
	)
	if !linearBarcodeCodePattern.MatchString(code) {
		return "", &LinearBarcodePrintValidationError{Message: "生成的一维码不符合当前 15 位协议"}
	}
	return code, nil
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

func ScrapLinearBarcodeInventoryForBatchTx(tx *gorm.DB, batchID string) error {
	return tx.Model(&models.LinearBarcodeInventoryItem{}).
		Where("batch_id = ? AND status = ?", strings.TrimSpace(batchID), LinearBarcodeInventoryStatusAvailable).
		Updates(map[string]interface{}{
			"status":  LinearBarcodeInventoryStatusScrapped,
			"version": gorm.Expr("version + 1"),
		}).Error
}

func mapLinearBarcodeInventoryItem(record models.LinearBarcodeInventoryItem) LinearBarcodeInventoryItemResponse {
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
		Status:           record.Status,
		ExpiresAt:        record.ExpiresAt,
		BoundAt:          record.BoundAt,
		CreatedAt:        record.CreatedAt,
		Version:          record.Version,
	}
}

func CreateLinearBarcodeBatch(input CreateLinearBarcodeBatchRequest) (CreateLinearBarcodeBatchResponse, error) {
	input.SalesOrderID = strings.TrimSpace(input.SalesOrderID)
	if _, err := uuid.Parse(input.SalesOrderID); err != nil {
		return CreateLinearBarcodeBatchResponse{}, &LinearBarcodePrintValidationError{Message: "salesOrderId 必须是有效 UUID"}
	}
	if input.SalesOrderLineNo <= 0 {
		return CreateLinearBarcodeBatchResponse{}, &LinearBarcodePrintValidationError{Message: "salesOrderLineNo 必须大于 0"}
	}
	if input.Quantity < 1 || input.Quantity > LinearBarcodeMaxBatchSize {
		return CreateLinearBarcodeBatchResponse{}, &LinearBarcodePrintValidationError{Message: fmt.Sprintf("预打数量必须在 1 到 %d 之间", LinearBarcodeMaxBatchSize)}
	}
	response := CreateLinearBarcodeBatchResponse{}
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		now := time.Now()

		var order models.SalesOrder
		if err := tx.Clauses(clause.Locking{Strength: "SHARE"}).Where("id = ?", input.SalesOrderID).First(&order).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrLinearBarcodeSalesOrderNotFound
			}
			return err
		}
		if order.Status != "Scheduling" {
			return ErrLinearBarcodeOrderNotPrintable
		}

		var line models.SalesOrderLine
		if err := tx.Where("sales_order_id = ? AND line_no = ?", input.SalesOrderID, input.SalesOrderLineNo).First(&line).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrLinearBarcodeOrderLineNotFound
			}
			return err
		}
		if _, err := uuid.Parse(strings.TrimSpace(line.ProductID)); err != nil {
			return &LinearBarcodePrintValidationError{Message: "订单行未绑定有效产品"}
		}

		protocolConfig, err := LoadLinearBarcodeProtocolConfig(tx)
		if err != nil {
			return err
		}
		sequenceRuleKey := strings.TrimSpace(protocolConfig.SequenceRuleKey)
		if sequenceRuleKey == "" {
			return &LinearBarcodePrintValidationError{Message: "一维码协议未配置发号规则键"}
		}
		serialNumbers, err := numbering.GenerateNumberBatchTx(tx, sequenceRuleKey, input.Quantity)
		if err != nil {
			return &LinearBarcodePrintValidationError{Message: err.Error()}
		}

		codes := make([]string, 0, len(serialNumbers))
		seenCodes := make(map[string]struct{}, len(serialNumbers))
		for _, serialNumber := range serialNumbers {
			code, err := buildCanonicalLinearBarcodeCode(now, line, serialNumber)
			if err != nil {
				return err
			}
			if _, exists := seenCodes[code]; exists {
				return &LinearBarcodePrintValidationError{Message: "发号结果包含重复一维码"}
			}
			seenCodes[code] = struct{}{}
			codes = append(codes, code)
		}

		batchNo, err := GeneratePrintBatchNoTx(tx, now)
		if err != nil {
			return err
		}
		expiresAt := now.Add(linearBarcodeInventoryTTL())
		batch := models.PrintBatch{
			BaseModel:        models.BaseModel{ID: uuid.NewString()},
			BatchNo:          batchNo,
			TemplateName:     fmt.Sprintf("SO-LINEAR-%s-L%d", strings.TrimSpace(order.OrderNo), line.LineNo),
			ProductID:        strings.TrimSpace(line.ProductID),
			StartSN:          serialNumbers[0],
			EndSN:            serialNumbers[len(serialNumbers)-1],
			SalesOrderID:     input.SalesOrderID,
			SalesOrderLineNo: line.LineNo,
			Quantity:         input.Quantity,
			Status:           "Printed",
			ExpiresAt:        &expiresAt,
			Version:          1,
		}
		if err := tx.Omit("Product", "BOM").Create(&batch).Error; err != nil {
			return err
		}

		records := make([]models.LinearBarcodeInventoryItem, 0, len(codes))
		for index, code := range codes {
			records = append(records, models.LinearBarcodeInventoryItem{
				BaseModel:        models.BaseModel{ID: uuid.NewString()},
				BatchID:          batch.ID,
				ProductID:        batch.ProductID,
				SalesOrderID:     input.SalesOrderID,
				SalesOrderLineNo: line.LineNo,
				Code:             code,
				SerialNumber:     serialNumbers[index],
				Status:           LinearBarcodeInventoryStatusAvailable,
				ExpiresAt:        expiresAt,
				Version:          1,
			})
		}
		if err := tx.Omit("Batch").Create(&records).Error; err != nil {
			return err
		}

		response.Batch = batch
		response.Items = make([]LinearBarcodeInventoryItemResponse, 0, len(records))
		for _, record := range records {
			record.Batch = &batch
			response.Items = append(response.Items, mapLinearBarcodeInventoryItem(record))
		}
		return nil
	})
	if err != nil {
		return CreateLinearBarcodeBatchResponse{}, err
	}
	return response, nil
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
	if input.Status != "" {
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
	for _, record := range records {
		response.Items = append(response.Items, mapLinearBarcodeInventoryItem(record))
	}
	return response, nil
}
