package services

import (
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

const (
	SalesReturnLineStatusRequested         = "Requested"
	SalesReturnLineStatusPartiallyReceived = "PartiallyReceived"
	SalesReturnLineStatusReceived          = "Received"

	SalesReturnBarcodeBindSourceCreateForm   = "CREATE_FORM"
	SalesReturnBarcodeBindSourceWarehouse    = "WAREHOUSE_SCAN"
	SalesReturnBarcodeBindSourceManualReview = "MANUAL_REVIEW"

	SalesReturnBarcodeStatusPending         = "PENDING"
	SalesReturnBarcodeStatusMatched         = "MATCHED"
	SalesReturnBarcodeStatusMismatched      = "MISMATCHED"
	SalesReturnBarcodeStatusManualConfirmed = "MANUAL_CONFIRMED"
)

const salesReturnQuantityTolerance = 1e-9

func BindSalesReturnLineBarcodes(input BindSalesReturnLineBarcodesInput) (SalesReturnResponse, error) {
	normalized, err := normalizeBindSalesReturnLineBarcodesInput(input)
	if err != nil {
		return SalesReturnResponse{}, err
	}

	var response SalesReturnResponse
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		record, err := loadSalesReturnForExecutionTx(tx, normalized.SalesReturnID)
		if err != nil {
			return err
		}
		status := normalizeSalesReturnStatus(record.Status)
		if status == SalesReturnStatusClosed || status == SalesReturnStatusCanceled {
			return errors.New("sales return status does not allow barcode binding")
		}
		if err := createSalesReturnLineBarcodesTx(tx, record, normalized.Barcodes, normalized.Operator, time.Now()); err != nil {
			return err
		}
		reloaded, err := reloadSalesReturnForResponseTx(tx, record.ID)
		if err != nil {
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

func ConfirmSalesReturnInbound(input ConfirmSalesReturnInboundInput) (ConfirmSalesReturnInboundResponse, error) {
	normalized, err := normalizeConfirmSalesReturnInboundInput(input)
	if err != nil {
		return ConfirmSalesReturnInboundResponse{}, err
	}
	executionFingerprint, err := salesReturnInboundExecutionFingerprint(normalized)
	if err != nil {
		return ConfirmSalesReturnInboundResponse{}, err
	}

	var result ConfirmSalesReturnInboundResult
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		confirmed, err := confirmSalesReturnInboundTx(tx, normalized, executionFingerprint)
		if err != nil {
			return err
		}
		result = confirmed
		return nil
	})
	if err != nil {
		return ConfirmSalesReturnInboundResponse{}, err
	}

	for _, inboundRecord := range result.CreatedInboundRecords {
		var latestInventory models.Inventory
		if db.DB.Where("material_id = ? AND category_code = ? AND batch_no = ?", inboundRecord.MaterialID, inboundRecord.TargetCategory, inboundRecord.BatchNo).First(&latestInventory).Error == nil {
			syncInventoryToSearch(latestInventory)
		}
	}

	return MapConfirmSalesReturnInboundResultToResponse(result), nil
}

func normalizeBindSalesReturnLineBarcodesInput(input BindSalesReturnLineBarcodesInput) (BindSalesReturnLineBarcodesInput, error) {
	input.SalesReturnID = strings.TrimSpace(input.SalesReturnID)
	if input.SalesReturnID == "" {
		return BindSalesReturnLineBarcodesInput{}, errors.New("sales return id is required")
	}
	input.Operator = strings.TrimSpace(input.Operator)
	if input.Operator == "" {
		input.Operator = "unknown"
	}
	if len(input.Barcodes) == 0 {
		return BindSalesReturnLineBarcodesInput{}, errors.New("sales return line barcodes are required")
	}
	for index := range input.Barcodes {
		input.Barcodes[index] = normalizeSalesReturnLineBarcodeInput(input.Barcodes[index], SalesReturnBarcodeBindSourceManualReview)
		if input.Barcodes[index].SalesReturnLineID == 0 {
			return BindSalesReturnLineBarcodesInput{}, errors.New("sales return line id is required")
		}
		if input.Barcodes[index].NormalizedCode == "" {
			return BindSalesReturnLineBarcodesInput{}, errors.New("sales return line barcode is required")
		}
	}
	return input, nil
}

func normalizeConfirmSalesReturnInboundInput(input ConfirmSalesReturnInboundInput) (ConfirmSalesReturnInboundInput, error) {
	input.SalesReturnID = strings.TrimSpace(input.SalesReturnID)
	if input.SalesReturnID == "" {
		return ConfirmSalesReturnInboundInput{}, errors.New("sales return id is required")
	}
	executionKey, err := normalizeAfterSalesExecutionKey(input.ExecutionKey)
	if err != nil {
		return ConfirmSalesReturnInboundInput{}, err
	}
	input.ExecutionKey = executionKey
	input.Operator = strings.TrimSpace(input.Operator)
	if input.Operator == "" {
		input.Operator = "unknown"
	}
	input.TargetCategory = strings.TrimSpace(input.TargetCategory)
	if input.TargetCategory == "" {
		return ConfirmSalesReturnInboundInput{}, errors.New("target category is required")
	}
	input.BatchNo = strings.TrimSpace(input.BatchNo)
	input.Remarks = strings.TrimSpace(input.Remarks)
	if len(input.Lines) == 0 {
		return ConfirmSalesReturnInboundInput{}, errors.New("sales return inbound lines are required")
	}
	inboundDate, err := parseSalesReturnFlexibleTime(input.InboundDateRaw, "inboundDate")
	if err != nil {
		return ConfirmSalesReturnInboundInput{}, err
	}
	if inboundDate != nil {
		input.InboundDate = *inboundDate
	}
	if input.InboundDate.IsZero() {
		input.InboundDate = time.Now()
	}
	seenLineIDs := make(map[uint]struct{}, len(input.Lines))
	for index := range input.Lines {
		line := input.Lines[index]
		if line.SalesReturnLineID == 0 {
			return ConfirmSalesReturnInboundInput{}, errors.New("sales return line id is required")
		}
		if _, exists := seenLineIDs[line.SalesReturnLineID]; exists {
			return ConfirmSalesReturnInboundInput{}, errors.New("duplicate sales return inbound line")
		}
		seenLineIDs[line.SalesReturnLineID] = struct{}{}
		if line.Quantity <= 0 {
			return ConfirmSalesReturnInboundInput{}, errors.New("sales return inbound quantity must be greater than zero")
		}
		for barcodeIndex := range line.Barcodes {
			line.Barcodes[barcodeIndex] = normalizeSalesReturnLineBarcodeInput(line.Barcodes[barcodeIndex], SalesReturnBarcodeBindSourceWarehouse)
			line.Barcodes[barcodeIndex].SalesReturnLineID = line.SalesReturnLineID
			if line.Barcodes[barcodeIndex].NormalizedCode == "" {
				return ConfirmSalesReturnInboundInput{}, errors.New("sales return line barcode is required")
			}
		}
		input.Lines[index] = line
	}
	return input, nil
}

func parseSalesReturnFlexibleTime(raw string, field string) (*time.Time, error) {
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

func normalizeSalesReturnLineBarcodeInput(input SalesReturnLineBarcodeInput, defaultBindSource string) SalesReturnLineBarcodeInput {
	input.RawCode = strings.TrimSpace(input.RawCode)
	input.NormalizedCode = canonicalAfterSalesCode(input.RawCode, input.NormalizedCode)
	input.BindSource = strings.TrimSpace(input.BindSource)
	if input.BindSource == "" {
		input.BindSource = defaultBindSource
	}
	input.VerificationStatus = strings.TrimSpace(input.VerificationStatus)
	if input.VerificationStatus == "" {
		input.VerificationStatus = SalesReturnBarcodeStatusPending
	}
	return input
}

func loadSalesReturnForExecutionTx(tx *gorm.DB, salesReturnID string) (models.SalesReturn, error) {
	var record models.SalesReturn
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Lines.Barcodes").
		First(&record, "id = ?", strings.TrimSpace(salesReturnID)).Error; err != nil {
		return models.SalesReturn{}, err
	}
	return record, nil
}

func reloadSalesReturnForResponseTx(tx *gorm.DB, salesReturnID string) (models.SalesReturn, error) {
	var record models.SalesReturn
	if err := tx.Preload("Lines.Barcodes").First(&record, "id = ?", strings.TrimSpace(salesReturnID)).Error; err != nil {
		return models.SalesReturn{}, err
	}
	return record, nil
}

func salesReturnLineMap(record models.SalesReturn) map[uint]models.SalesReturnLine {
	result := make(map[uint]models.SalesReturnLine, len(record.Lines))
	for _, line := range record.Lines {
		result[line.ID] = line
	}
	return result
}

func createSalesReturnLineBarcodesTx(tx *gorm.DB, record models.SalesReturn, inputs []SalesReturnLineBarcodeInput, operator string, boundAt time.Time) error {
	if len(inputs) == 0 {
		return nil
	}
	lineByID := salesReturnLineMap(record)
	seenCodes := make(map[string]struct{}, len(inputs))
	barcodes := make([]models.SalesReturnLineBarcode, 0, len(inputs))
	for _, input := range inputs {
		line, ok := lineByID[input.SalesReturnLineID]
		if !ok {
			return errors.New("sales return line not found")
		}
		normalizedCode := canonicalAfterSalesCode(input.RawCode, input.NormalizedCode)
		if normalizedCode == "" {
			return errors.New("sales return line barcode is required")
		}
		if _, exists := seenCodes[normalizedCode]; exists {
			return errors.New("duplicate sales return line barcode")
		}
		seenCodes[normalizedCode] = struct{}{}
		var existing models.SalesReturnLineBarcode
		err := tx.Where(
			"sales_return_id = ? AND normalized_code = ?",
			record.ID,
			normalizedCode,
		).First(&existing).Error
		if err == nil {
			if existing.SalesReturnLineID != line.ID {
				return errors.New("duplicate sales return line barcode")
			}
			continue
		}
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		barcodes = append(barcodes, models.SalesReturnLineBarcode{
			SalesReturnID:       record.ID,
			SalesReturnLineID:   line.ID,
			SalesOrderLineID:    line.SalesOrderLineID,
			RawCode:             strings.TrimSpace(input.RawCode),
			NormalizedCode:      normalizedCode,
			ProductCodeSnapshot: strings.TrimSpace(line.ProductCode),
			BindSource:          strings.TrimSpace(input.BindSource),
			VerificationStatus:  strings.TrimSpace(input.VerificationStatus),
			BoundAt:             boundAt,
			BoundBy:             strings.TrimSpace(operator),
		})
	}
	if len(barcodes) == 0 {
		return nil
	}
	return tx.Create(&barcodes).Error
}

func confirmSalesReturnInboundTx(tx *gorm.DB, input ConfirmSalesReturnInboundInput, executionFingerprint string) (ConfirmSalesReturnInboundResult, error) {
	record, err := loadSalesReturnForExecutionTx(tx, input.SalesReturnID)
	if err != nil {
		return ConfirmSalesReturnInboundResult{}, err
	}
	existingRecords, err := loadInboundRecordsByExecutionKeyTx(
		tx,
		AfterSalesSourceSalesReturn,
		record.ID,
		input.ExecutionKey,
	)
	if err != nil {
		return ConfirmSalesReturnInboundResult{}, err
	}
	if err := validateExecutionReplayCount(len(existingRecords), len(input.Lines)); err != nil {
		return ConfirmSalesReturnInboundResult{}, err
	}
	if err := validateExecutionReplayFingerprint(existingRecords, executionFingerprint); err != nil {
		return ConfirmSalesReturnInboundResult{}, err
	}
	if len(existingRecords) > 0 {
		reloaded, err := reloadSalesReturnForResponseTx(tx, record.ID)
		if err != nil {
			return ConfirmSalesReturnInboundResult{}, err
		}
		return ConfirmSalesReturnInboundResult{
			SalesReturn:           reloaded,
			CreatedInboundRecords: existingRecords,
		}, nil
	}
	status := normalizeSalesReturnStatus(record.Status)
	if status == SalesReturnStatusClosed || status == SalesReturnStatusCanceled {
		return ConfirmSalesReturnInboundResult{}, errors.New("sales return status does not allow inbound")
	}
	if len(record.Lines) == 0 {
		return ConfirmSalesReturnInboundResult{}, errors.New("sales return lines are required")
	}

	lineByID := salesReturnLineMap(record)
	batchNo := input.BatchNo
	if batchNo == "" {
		batchNo = record.ReturnNo
	}

	createdRecords := make([]models.InboundRecord, 0, len(input.Lines))
	allBarcodeInputs := make([]SalesReturnLineBarcodeInput, 0)
	for _, lineInput := range input.Lines {
		line, ok := lineByID[lineInput.SalesReturnLineID]
		if !ok {
			return ConfirmSalesReturnInboundResult{}, errors.New("sales return line not found")
		}
		remainingQuantity := line.Quantity - line.ReceivedQuantity
		if lineInput.Quantity-remainingQuantity > salesReturnQuantityTolerance {
			return ConfirmSalesReturnInboundResult{}, errors.New("sales return inbound quantity exceeds remaining quantity")
		}
		materialResolution, err := ResolveInventoryMaterialForProductSnapshotTx(tx, ProductInventoryMaterialResolutionSnapshot{
			ProductID:    line.ProductID,
			ProductCode:  line.ProductCode,
			ProductModel: line.ProductModel,
		})
		if err != nil {
			return ConfirmSalesReturnInboundResult{}, err
		}
		material := materialResolution.Material
		inbound := models.InboundRecord{
			BaseModel:            models.BaseModel{ID: uuid.NewString()},
			MaterialID:           material.ID,
			MaterialName:         material.Name,
			MaterialCode:         material.Code,
			SourceType:           AfterSalesSourceSalesReturn,
			SourceID:             record.ID,
			SourceLineID:         line.ID,
			ExecutionKey:         input.ExecutionKey,
			ExecutionFingerprint: executionFingerprint,
			Quantity:             lineInput.Quantity,
			PurchasePrice:        0,
			TargetCategory:       input.TargetCategory,
			BatchNo:              batchNo,
			InboundDate:          input.InboundDate,
			Operator:             input.Operator,
			Remarks:              input.Remarks,
		}
		if _, err := recordInboundTx(tx, &inbound, inboundRecordOptions{
			skipZeroValueVoucher: true,
			auditAction:          AfterSalesAuditSalesReturnInbound,
			auditOperator:        input.Operator,
		}); err != nil {
			return ConfirmSalesReturnInboundResult{}, err
		}
		createdRecords = append(createdRecords, inbound)

		nextReceivedQuantity := math.Round((line.ReceivedQuantity+lineInput.Quantity)*100) / 100
		nextLineStatus := SalesReturnLineStatusPartiallyReceived
		if nextReceivedQuantity+salesReturnQuantityTolerance >= line.Quantity {
			nextLineStatus = SalesReturnLineStatusReceived
		}
		if err := tx.Model(&models.SalesReturnLine{}).
			Where("id = ? AND sales_return_id = ?", line.ID, record.ID).
			Updates(map[string]any{
				"received_quantity": nextReceivedQuantity,
				"status":            nextLineStatus,
			}).Error; err != nil {
			return ConfirmSalesReturnInboundResult{}, err
		}

		allBarcodeInputs = append(allBarcodeInputs, lineInput.Barcodes...)
	}
	if err := createSalesReturnLineBarcodesTx(tx, record, allBarcodeInputs, input.Operator, time.Now()); err != nil {
		return ConfirmSalesReturnInboundResult{}, err
	}

	reloaded, err := reloadSalesReturnForResponseTx(tx, record.ID)
	if err != nil {
		return ConfirmSalesReturnInboundResult{}, err
	}
	totalReceived, nextStatus := deriveSalesReturnInboundStatus(reloaded)
	if err := tx.Model(&models.SalesReturn{}).Where("id = ?", record.ID).Updates(map[string]any{
		"total_received_quantity": totalReceived,
		"status":                  nextStatus,
	}).Error; err != nil {
		return ConfirmSalesReturnInboundResult{}, err
	}
	reloaded, err = reloadSalesReturnForResponseTx(tx, record.ID)
	if err != nil {
		return ConfirmSalesReturnInboundResult{}, err
	}

	return ConfirmSalesReturnInboundResult{
		SalesReturn:           reloaded,
		CreatedInboundRecords: createdRecords,
	}, nil
}

func deriveSalesReturnInboundStatus(record models.SalesReturn) (float64, string) {
	totalReceived := 0.0
	allReceived := len(record.Lines) > 0
	anyReceived := false
	for _, line := range record.Lines {
		totalReceived += line.ReceivedQuantity
		if line.ReceivedQuantity > salesReturnQuantityTolerance {
			anyReceived = true
		}
		if line.ReceivedQuantity+salesReturnQuantityTolerance < line.Quantity {
			allReceived = false
		}
	}
	totalReceived = math.Round(totalReceived*100) / 100
	if allReceived {
		return totalReceived, SalesReturnStatusReceived
	}
	if anyReceived {
		return totalReceived, SalesReturnStatusPartiallyReceived
	}
	status := normalizeSalesReturnStatus(record.Status)
	if status == "" {
		status = SalesReturnStatusCreated
	}
	return totalReceived, status
}
