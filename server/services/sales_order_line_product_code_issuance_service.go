package services

import (
	"errors"
	"fmt"
	"math"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/numbering"
	statemachine "xdfc-server/services/state_machine"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const LinearBarcodeMaxBatchSize = 200

const defaultLinearBarcodeInventoryTTL = 30 * 24 * time.Hour

var (
	ErrLinearBarcodeSalesOrderNotFound               = errors.New("linear barcode sales order not found")
	ErrLinearBarcodeOrderNotPrintable                = errors.New("linear barcode sales order is not printable")
	ErrLinearBarcodeOrderLineNotFound                = errors.New("linear barcode sales order line not found")
	ErrLinearBarcodeIssuanceExceedsOrderLineQuantity = errors.New("linear barcode issuance exceeds order line quantity")
	linearBarcodeDigitsPattern                       = regexp.MustCompile(`^\d+$`)
	linearBarcodeSerialPattern                       = regexp.MustCompile(`^\d{4}$`)
	linearBarcodeCodePattern                         = regexp.MustCompile(`^\d{2}[1-90ND](?:0[1-9]|[12]\d|3[01])\d{3}[RD]\d{6}$`)
	linearBarcodePrintLocation                       = time.FixedZone("CST", 8*60*60)
)

type LinearBarcodeOrderLineIssuanceLimitError struct {
	OrderQuantity     float64
	IssuedQuantity    int64
	RequestedQuantity int
	RemainingQuantity float64
}

func (e *LinearBarcodeOrderLineIssuanceLimitError) Error() string {
	return fmt.Sprintf(
		"订单行数量为 %.0f，已签发且有效的编码为 %d 个，剩余可签发 %.0f 个，本次请求 %d 个",
		e.OrderQuantity,
		e.IssuedQuantity,
		e.RemainingQuantity,
		e.RequestedQuantity,
	)
}

func (e *LinearBarcodeOrderLineIssuanceLimitError) Unwrap() error {
	return ErrLinearBarcodeIssuanceExceedsOrderLineQuantity
}

type CreateLinearBarcodeBatchRequest struct {
	SalesOrderID     string `json:"salesOrderId"`
	SalesOrderLineID uint   `json:"salesOrderLineId,omitempty"`
	SalesOrderLineNo int    `json:"salesOrderLineNo"`
	Quantity         int    `json:"quantity"`
}

type CreateLinearBarcodeBatchResponse struct {
	Batch models.PrintBatch                    `json:"batch"`
	Items []LinearBarcodeInventoryItemResponse `json:"items"`
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

func countEffectiveIssuedLinearBarcodesForSalesOrderLineTx(
	tx *gorm.DB,
	salesOrderID string,
	line models.SalesOrderLine,
	now time.Time,
) (int64, error) {
	var issuedQuantity int64
	// Only records with a confirmed stable line identity contribute to this line's quantity.
	err := tx.Model(&models.LinearBarcodeInventoryItem{}).
		Where("sales_order_id = ?", salesOrderID).
		Where("sales_order_line_id = ?", line.ID).
		Where(
			effectiveIssuedLinearBarcodeInventoryStatusCondition("linear_barcode_inventory_items"),
			LinearBarcodeInventoryStatusAvailable,
			now,
			LinearBarcodeInventoryStatusBound,
		).
		Count(&issuedQuantity).Error
	return issuedQuantity, err
}

func CreateLinearBarcodeBatch(input CreateLinearBarcodeBatchRequest) (CreateLinearBarcodeBatchResponse, error) {
	input.SalesOrderID = strings.TrimSpace(input.SalesOrderID)
	if _, err := uuid.Parse(input.SalesOrderID); err != nil {
		return CreateLinearBarcodeBatchResponse{}, &LinearBarcodePrintValidationError{Message: "salesOrderId 必须是有效 UUID"}
	}
	if input.SalesOrderLineID == 0 && input.SalesOrderLineNo <= 0 {
		return CreateLinearBarcodeBatchResponse{}, &LinearBarcodePrintValidationError{Message: "salesOrderLineNo 必须大于 0"}
	}
	if input.Quantity < 1 || input.Quantity > LinearBarcodeMaxBatchSize {
		return CreateLinearBarcodeBatchResponse{}, &LinearBarcodePrintValidationError{Message: fmt.Sprintf("预打数量必须在 1 到 %d 之间", LinearBarcodeMaxBatchSize)}
	}
	response := CreateLinearBarcodeBatchResponse{}
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		now := time.Now()

		var order models.SalesOrder
		if err := applySalesOrderRecordScope(tx.Clauses(clause.Locking{Strength: "SHARE"})).Where("id = ?", input.SalesOrderID).First(&order).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrLinearBarcodeSalesOrderNotFound
			}
			return err
		}
		if order.IsDeleted || !statemachine.IsSalesOrderStatusEligibleForProduction(order.Status) {
			return ErrLinearBarcodeOrderNotPrintable
		}

		var line models.SalesOrderLine
		lineQuery := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Where("sales_order_id = ?", input.SalesOrderID)
		if input.SalesOrderLineID > 0 {
			lineQuery = lineQuery.Where("id = ?", input.SalesOrderLineID)
		} else {
			lineQuery = lineQuery.Where("line_no = ?", input.SalesOrderLineNo)
		}
		if err := lineQuery.First(&line).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrLinearBarcodeOrderLineNotFound
			}
			return err
		}
		if math.IsNaN(line.Qty) || math.IsInf(line.Qty, 0) || line.Qty <= 0 || math.Trunc(line.Qty) != line.Qty {
			return &LinearBarcodePrintValidationError{Message: "订单行数量必须是大于 0 的整数，才能签发产品编码"}
		}
		if _, err := uuid.Parse(strings.TrimSpace(line.ProductID)); err != nil {
			return &LinearBarcodePrintValidationError{Message: "订单行未绑定有效产品"}
		}
		if err := rejectUnattributedEffectiveIssuedLinearBarcodesForSalesOrderTx(tx, input.SalesOrderID, now); err != nil {
			return err
		}
		issuedQuantity, err := countEffectiveIssuedLinearBarcodesForSalesOrderLineTx(tx, input.SalesOrderID, line, now)
		if err != nil {
			return err
		}
		remainingQuantity := line.Qty - float64(issuedQuantity)
		if remainingQuantity < 0 {
			remainingQuantity = 0
		}
		if float64(issuedQuantity)+float64(input.Quantity) > line.Qty {
			return &LinearBarcodeOrderLineIssuanceLimitError{
				OrderQuantity:     line.Qty,
				IssuedQuantity:    issuedQuantity,
				RequestedQuantity: input.Quantity,
				RemainingQuantity: remainingQuantity,
			}
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
				SalesOrderLineID: line.ID,
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
			response.Items = append(response.Items, mapLinearBarcodeInventoryItem(record, now))
		}
		return nil
	})
	if err != nil {
		return CreateLinearBarcodeBatchResponse{}, err
	}
	return response, nil
}
