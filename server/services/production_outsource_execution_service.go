package services

import (
	"context"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	OutsourceTransferTypeSend   = "SEND"
	OutsourceTransferTypeReturn = "RETURN"
)

const (
	OutsourceInspectionResultPass        = "PASS"
	OutsourceInspectionResultFail        = "FAIL"
	OutsourceInspectionResultConditional = "CONDITIONAL"
)

const (
	OutsourceInspectionDispositionAccept     = "ACCEPT"
	OutsourceInspectionDispositionRework     = "REWORK"
	OutsourceInspectionDispositionConcession = "CONCESSION"
	OutsourceInspectionDispositionScrap      = "SCRAP"
)

const (
	outsourceHolderFactory   = "FACTORY"
	outsourceHolderPartner   = "OUTSOURCE_PARTNER"
	outsourceQuantityEpsilon = 0.000001
)

type OutsourceTransferListQuery struct {
	OutsourceOrderID     string
	OutsourceOrderLineID string
	TransferType         string
	ProductBarcode       string
	Limit                int
}

type OutsourceInspectionListQuery struct {
	OutsourceOrderID     string
	OutsourceOrderLineID string
	ProductBarcode       string
	Result               string
	Limit                int
}

type OutsourceTransferRequest struct {
	OutsourceOrderLineID string  `json:"-"`
	ProductBarcode       string  `json:"productBarcode"`
	Quantity             float64 `json:"quantity"`
	UOM                  string  `json:"uom"`
	OccurredAt           string  `json:"occurredAt"`
	FromHolderType       string  `json:"fromHolderType"`
	FromHolderID         string  `json:"fromHolderId"`
	ToHolderType         string  `json:"toHolderType"`
	ToHolderID           string  `json:"toHolderId"`
	SourceCategory       string  `json:"sourceCategory"`
	TargetCategory       string  `json:"targetCategory"`
	BatchNo              string  `json:"batchNo"`
	Notes                string  `json:"notes"`
	ActorID              string  `json:"-"`
	Operator             string  `json:"-"`
	IP                   string  `json:"-"`
}

type OutsourceInspectionRequest struct {
	OutsourceOrderLineID string  `json:"-"`
	ProductBarcode       string  `json:"productBarcode"`
	Result               string  `json:"result"`
	Disposition          string  `json:"disposition"`
	InspectedQuantity    float64 `json:"inspectedQuantity"`
	UOM                  string  `json:"uom"`
	InspectionTaskID     string  `json:"inspectionTaskId"`
	InspectedAt          string  `json:"inspectedAt"`
	Notes                string  `json:"notes"`
	ActorID              string  `json:"-"`
	Operator             string  `json:"-"`
	IP                   string  `json:"-"`
}

type OutsourceTransferDTO struct {
	ID                   string  `json:"id"`
	CreatedAt            string  `json:"createdAt"`
	UpdatedAt            string  `json:"updatedAt"`
	TransferNo           string  `json:"transferNo"`
	OutsourceOrderID     string  `json:"outsourceOrderId"`
	OutsourceOrderLineID string  `json:"outsourceOrderLineId"`
	TransferType         string  `json:"transferType"`
	ProductBarcode       string  `json:"productBarcode"`
	Quantity             float64 `json:"quantity"`
	UOM                  string  `json:"uom"`
	PartnerID            string  `json:"partnerId"`
	RouteID              string  `json:"routeId"`
	RouteStepID          string  `json:"routeStepId"`
	ProcessStepID        string  `json:"processStepId"`
	FromHolderType       string  `json:"fromHolderType"`
	FromHolderID         string  `json:"fromHolderId"`
	ToHolderType         string  `json:"toHolderType"`
	ToHolderID           string  `json:"toHolderId"`
	SourceCategory       string  `json:"sourceCategory"`
	TargetCategory       string  `json:"targetCategory"`
	BatchNo              string  `json:"batchNo"`
	TransferEventID      string  `json:"transferEventId"`
	OccurredAt           string  `json:"occurredAt"`
	Operator             string  `json:"operator"`
	Notes                string  `json:"notes"`
}

type OutsourceInspectionDTO struct {
	ID                   string  `json:"id"`
	CreatedAt            string  `json:"createdAt"`
	UpdatedAt            string  `json:"updatedAt"`
	InspectionNo         string  `json:"inspectionNo"`
	OutsourceOrderID     string  `json:"outsourceOrderId"`
	OutsourceOrderLineID string  `json:"outsourceOrderLineId"`
	ProductBarcode       string  `json:"productBarcode"`
	InspectionTaskID     string  `json:"inspectionTaskId"`
	Result               string  `json:"result"`
	Disposition          string  `json:"disposition"`
	InspectedQuantity    float64 `json:"inspectedQuantity"`
	AcceptedQuantity     float64 `json:"acceptedQuantity"`
	RejectedQuantity     float64 `json:"rejectedQuantity"`
	ReworkQuantity       float64 `json:"reworkQuantity"`
	ScrapQuantity        float64 `json:"scrapQuantity"`
	UOM                  string  `json:"uom"`
	RouteID              string  `json:"routeId"`
	RouteStepID          string  `json:"routeStepId"`
	ProcessStepID        string  `json:"processStepId"`
	OperationID          string  `json:"operationId"`
	InspectedAt          string  `json:"inspectedAt"`
	Inspector            string  `json:"inspector"`
	Notes                string  `json:"notes"`
}

type OutsourceTransferListResponse struct {
	Items []OutsourceTransferDTO `json:"items"`
	Total int64                  `json:"total"`
}

type OutsourceInspectionListResponse struct {
	Items []OutsourceInspectionDTO `json:"items"`
	Total int64                    `json:"total"`
}

type OutsourceTransferActionResponse struct {
	Order    OutsourceOrderDTO    `json:"order"`
	Transfer OutsourceTransferDTO `json:"transfer"`
}

type OutsourceInspectionActionResponse struct {
	Order          OutsourceOrderDTO                    `json:"order"`
	Inspection     OutsourceInspectionDTO               `json:"inspection"`
	InspectionTask OutsourceInspectionTaskDTO           `json:"inspectionTask"`
	Scan           ExecuteProductionScanCommandResponse `json:"scan"`
}

func ListOutsourceTransfers(query OutsourceTransferListQuery) (OutsourceTransferListResponse, error) {
	return defaultProductionOutsourcingService.ListOutsourceTransfers(query)
}

func ListOutsourceInspections(query OutsourceInspectionListQuery) (OutsourceInspectionListResponse, error) {
	return defaultProductionOutsourcingService.ListOutsourceInspections(query)
}

func SendOutsourceOrderLine(req OutsourceTransferRequest) (OutsourceTransferActionResponse, error) {
	return defaultProductionOutsourcingService.SendOutsourceOrderLine(req)
}

func ReturnOutsourceOrderLine(req OutsourceTransferRequest) (OutsourceTransferActionResponse, error) {
	return defaultProductionOutsourcingService.ReturnOutsourceOrderLine(req)
}

func InspectOutsourceOrderLine(req OutsourceInspectionRequest) (OutsourceInspectionActionResponse, error) {
	return defaultProductionOutsourcingService.InspectOutsourceOrderLine(req)
}

func (s *ProductionOutsourcingService) ListOutsourceTransfers(query OutsourceTransferListQuery) (OutsourceTransferListResponse, error) {
	normalized := normalizeOutsourceTransferListQuery(query)
	base := s.txManager.DB().Model(&models.OutsourceTransfer{}).Where("deleted_at IS NULL")
	if normalized.OutsourceOrderID != "" {
		base = base.Where("outsource_order_id = ?", normalized.OutsourceOrderID)
	}
	if normalized.OutsourceOrderLineID != "" {
		base = base.Where("outsource_order_line_id = ?", normalized.OutsourceOrderLineID)
	}
	if normalized.TransferType != "" {
		base = base.Where("transfer_type = ?", normalized.TransferType)
	}
	if normalized.ProductBarcode != "" {
		base = base.Where("product_barcode = ?", normalized.ProductBarcode)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return OutsourceTransferListResponse{}, err
	}

	var items []models.OutsourceTransfer
	if err := base.Order("occurred_at DESC, created_at DESC, id DESC").
		Limit(normalized.Limit).
		Find(&items).Error; err != nil {
		return OutsourceTransferListResponse{}, err
	}

	return OutsourceTransferListResponse{Items: mapOutsourceTransfersToDTO(items), Total: total}, nil
}

func (s *ProductionOutsourcingService) ListOutsourceInspections(query OutsourceInspectionListQuery) (OutsourceInspectionListResponse, error) {
	normalized := normalizeOutsourceInspectionListQuery(query)
	base := s.txManager.DB().Model(&models.OutsourceInspection{}).Where("deleted_at IS NULL")
	if normalized.OutsourceOrderID != "" {
		base = base.Where("outsource_order_id = ?", normalized.OutsourceOrderID)
	}
	if normalized.OutsourceOrderLineID != "" {
		base = base.Where("outsource_order_line_id = ?", normalized.OutsourceOrderLineID)
	}
	if normalized.ProductBarcode != "" {
		base = base.Where("product_barcode = ?", normalized.ProductBarcode)
	}
	if normalized.Result != "" {
		base = base.Where("result = ?", normalized.Result)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return OutsourceInspectionListResponse{}, err
	}

	var items []models.OutsourceInspection
	if err := base.Order("inspected_at DESC, created_at DESC, id DESC").
		Limit(normalized.Limit).
		Find(&items).Error; err != nil {
		return OutsourceInspectionListResponse{}, err
	}

	return OutsourceInspectionListResponse{Items: mapOutsourceInspectionsToDTO(items), Total: total}, nil
}

func (s *ProductionOutsourcingService) SendOutsourceOrderLine(req OutsourceTransferRequest) (OutsourceTransferActionResponse, error) {
	return s.recordOutsourceTransfer(OutsourceTransferTypeSend, req)
}

func (s *ProductionOutsourcingService) ReturnOutsourceOrderLine(req OutsourceTransferRequest) (OutsourceTransferActionResponse, error) {
	return s.recordOutsourceTransfer(OutsourceTransferTypeReturn, req)
}

func (s *ProductionOutsourcingService) recordOutsourceTransfer(transferType string, req OutsourceTransferRequest) (OutsourceTransferActionResponse, error) {
	normalized := normalizeOutsourceTransferRequest(req)
	occurredAt, err := parseOutsourceExecutionTime(normalized.OccurredAt, "occurredAt")
	if err != nil {
		return OutsourceTransferActionResponse{}, err
	}

	var savedOrder models.OutsourceOrder
	var savedTransfer models.OutsourceTransfer
	var inventoryResult productionOutsourceInventoryTransferResult
	err = s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		order, line, err := loadOutsourceOrderLineForExecutionTx(tx, normalized.OutsourceOrderLineID)
		if err != nil {
			return err
		}
		if err := validateOutsourceTransferAllowed(tx, order, line, transferType, normalized); err != nil {
			return err
		}
		previousOrderStatus := order.Status
		previousLineStatus := line.Status

		state, _, err := loadOutsourceBarcodeStateForLineTx(tx, line, normalized.ProductBarcode)
		if err != nil {
			return err
		}
		if occurredAt == nil {
			now := time.Now().UTC()
			occurredAt = &now
		}

		transfer, err := createOutsourceTransferTx(tx, order, line, state, transferType, normalized, occurredAt)
		if err != nil {
			return err
		}
		savedTransfer = transfer
		inventoryResult, err = applyProductionOutsourceInventoryTransferTx(tx, productionOutsourceInventoryTransferInput{
			TransferID:         transfer.ID,
			TransferType:       transferType,
			ProductID:          line.ProductID,
			ProductCode:        line.ProductCode,
			Quantity:           transfer.Quantity,
			UOM:                transfer.UOM,
			SourceCategory:     transfer.SourceCategory,
			TargetCategory:     transfer.TargetCategory,
			BatchNo:            transfer.BatchNo,
			OutsourceOrderID:   transfer.OutsourceOrderID,
			OutsourceOrderLine: transfer.OutsourceOrderLineID,
			OccurredAt:         transfer.OccurredAt,
			Operator:           transfer.Operator,
			Remarks:            transfer.Notes,
		})
		if err != nil {
			return err
		}

		applyOutsourceTransferQuantity(&line, transferType, normalized.Quantity)
		line.Status = deriveOutsourceLineStatus(line)
		line.Version++
		if err := tx.Save(&line).Error; err != nil {
			return err
		}

		reloaded, err := refreshOutsourceOrderStatusTx(tx, order.ID, strings.TrimSpace(normalized.Operator))
		if err != nil {
			return err
		}
		savedOrder = reloaded
		if err := DispatchOutsourceTransferStatusChangedTx(
			tx,
			savedOrder,
			line,
			transfer,
			previousOrderStatus,
			previousLineStatus,
			normalized.ActorID,
			normalized.Operator,
		); err != nil {
			return err
		}
		return recordOutsourceExecutionAuditTx(tx, savedOrder, string(audit.AuditActionStatus), map[string]string{
			"action":               "OUTSOURCE_" + transferType,
			"transferId":           transfer.ID,
			"transferNo":           transfer.TransferNo,
			"transferType":         transfer.TransferType,
			"outsourceOrderLineId": transfer.OutsourceOrderLineID,
			"productBarcode":       transfer.ProductBarcode,
			"quantity":             formatOutsourceQuantity(transfer.Quantity),
			"status":               savedOrder.Status,
		}, normalized.ActorID, normalized.Operator, normalized.IP)
	})
	if err != nil {
		return OutsourceTransferActionResponse{}, normalizeOutsourceExecutionError(err)
	}
	syncInventoryToSearch(inventoryResult.SourceInventory)
	syncInventoryToSearch(inventoryResult.TargetInventory)

	return OutsourceTransferActionResponse{
		Order:    mapOutsourceOrderToDTO(savedOrder),
		Transfer: mapOutsourceTransferToDTO(savedTransfer),
	}, nil
}

func (s *ProductionOutsourcingService) InspectOutsourceOrderLine(req OutsourceInspectionRequest) (OutsourceInspectionActionResponse, error) {
	normalized := normalizeOutsourceInspectionRequest(req)
	inspectedAt, err := parseOutsourceExecutionTime(normalized.InspectedAt, "inspectedAt")
	if err != nil {
		return OutsourceInspectionActionResponse{}, err
	}

	var savedOrder models.OutsourceOrder
	var savedInspection models.OutsourceInspection
	var savedInspectionTask models.InspectionTask
	var scanResult productionScanCommandTxResult
	err = s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		order, line, err := loadOutsourceOrderLineForExecutionTx(tx, normalized.OutsourceOrderLineID)
		if err != nil {
			return err
		}
		if err := validateOutsourceInspectionAllowed(tx, order, line, normalized); err != nil {
			return err
		}
		task, err := prepareOutsourceInspectionTaskTx(tx, order, line, OutsourceInspectionTaskRequest{
			OutsourceOrderLineID: line.ID,
			ProductBarcode:       normalized.ProductBarcode,
			SampleQty:            normalized.InspectedQuantity,
			UOM:                  normalized.UOM,
			ActorID:              normalized.ActorID,
			Operator:             normalized.Operator,
			IP:                   normalized.IP,
		})
		if err != nil {
			return err
		}
		if normalized.InspectionTaskID != "" && normalized.InspectionTaskID != task.ID {
			return fmt.Errorf("%w: inspectionTaskId does not match the formal quality task for this barcode", ErrInvalidOutsourceOrder)
		}
		normalized.InspectionTaskID = task.ID
		savedInspectionTask = task
		previousOrderStatus := order.Status
		previousLineStatus := line.Status

		state, exists, err := loadOutsourceBarcodeStateForLineTx(tx, line, normalized.ProductBarcode)
		if err != nil {
			return err
		}
		if !exists {
			return fmt.Errorf("%w: productBarcode state does not exist", ErrInvalidOutsourceOrder)
		}
		if inspectedAt == nil {
			now := time.Now().UTC()
			inspectedAt = &now
		}

		qualityTarget, _, err := resolveProductionQualityRoutingTargetForDispositionTx(tx, state.RouteStepID, normalized.Disposition)
		if err != nil {
			return err
		}
		scanReq := buildOutsourceInspectionScanCommand(order, state, normalized, qualityTarget)
		scanResult, err = executeProductionScanCommandTx(context.Background(), tx, normalizeExecuteProductionScanCommandRequest(scanReq))
		if err != nil {
			return err
		}

		inspection := buildOutsourceInspection(order, line, state, scanResult.RecordResult.Operation.ID, normalized, inspectedAt)
		if err := createProductionRecordWithOptionalUUIDs(tx, &inspection,
			productionOptionalUUIDWrite{Column: "inspection_task_id", Value: inspection.InspectionTaskID},
			productionOptionalUUIDWrite{Column: "route_id", Value: inspection.RouteID},
			productionOptionalUUIDWrite{Column: "route_step_id", Value: inspection.RouteStepID},
			productionOptionalUUIDWrite{Column: "process_step_id", Value: inspection.ProcessStepID},
			productionOptionalUUIDWrite{Column: "operation_id", Value: inspection.OperationID},
		); err != nil {
			return err
		}
		savedInspectionTask, err = completeOutsourceInspectionTaskTx(
			tx,
			order,
			line,
			inspection.InspectionTaskID,
			normalized,
			inspection,
		)
		if err != nil {
			return err
		}
		savedInspection = inspection

		line.AcceptedQuantity += inspection.AcceptedQuantity
		line.RejectedQuantity += inspection.RejectedQuantity
		line.ReworkQuantity += inspection.ReworkQuantity
		line.ScrapQuantity += inspection.ScrapQuantity
		line.Status = deriveOutsourceLineStatus(line)
		line.Version++
		if err := tx.Save(&line).Error; err != nil {
			return err
		}

		reloaded, err := refreshOutsourceOrderStatusTx(tx, order.ID, strings.TrimSpace(normalized.Operator))
		if err != nil {
			return err
		}
		savedOrder = reloaded
		if err := DispatchOutsourceInspectionStatusChangedTx(
			tx,
			savedOrder,
			line,
			inspection,
			previousOrderStatus,
			previousLineStatus,
			normalized.ActorID,
			normalized.Operator,
		); err != nil {
			return err
		}
		if previousOrderStatus != savedOrder.Status && savedOrder.Status == OutsourceOrderStatusClosed {
			if err := DispatchOutsourceOrderClosedTx(
				tx,
				savedOrder,
				line,
				inspection,
				previousOrderStatus,
				normalized.ActorID,
				normalized.Operator,
			); err != nil {
				return err
			}
		}
		return recordOutsourceExecutionAuditTx(tx, savedOrder, string(audit.AuditActionStatus), map[string]string{
			"action":               "OUTSOURCE_INSPECT",
			"inspectionId":         inspection.ID,
			"inspectionNo":         inspection.InspectionNo,
			"outsourceOrderLineId": inspection.OutsourceOrderLineID,
			"productBarcode":       inspection.ProductBarcode,
			"result":               inspection.Result,
			"disposition":          inspection.Disposition,
			"quantity":             formatOutsourceQuantity(inspection.InspectedQuantity),
			"operationId":          inspection.OperationID,
			"status":               savedOrder.Status,
		}, normalized.ActorID, normalized.Operator, normalized.IP)
	})
	if err != nil {
		return OutsourceInspectionActionResponse{}, normalizeOutsourceExecutionError(err)
	}

	return OutsourceInspectionActionResponse{
		Order:          mapOutsourceOrderToDTO(savedOrder),
		Inspection:     mapOutsourceInspectionToDTO(savedInspection),
		InspectionTask: mapOutsourceInspectionTaskToDTO(savedInspectionTask),
		Scan:           mapProductionScanCommandTxResultToResponse(scanResult),
	}, nil
}

func normalizeOutsourceTransferListQuery(query OutsourceTransferListQuery) OutsourceTransferListQuery {
	limit := query.Limit
	if limit <= 0 {
		limit = 100
	}
	if limit > 500 {
		limit = 500
	}
	return OutsourceTransferListQuery{
		OutsourceOrderID:     strings.TrimSpace(query.OutsourceOrderID),
		OutsourceOrderLineID: strings.TrimSpace(query.OutsourceOrderLineID),
		TransferType:         normalizeOutsourceTransferType(query.TransferType),
		ProductBarcode:       normalizeProductBarcodeValue(query.ProductBarcode),
		Limit:                limit,
	}
}

func normalizeOutsourceInspectionListQuery(query OutsourceInspectionListQuery) OutsourceInspectionListQuery {
	limit := query.Limit
	if limit <= 0 {
		limit = 100
	}
	if limit > 500 {
		limit = 500
	}
	return OutsourceInspectionListQuery{
		OutsourceOrderID:     strings.TrimSpace(query.OutsourceOrderID),
		OutsourceOrderLineID: strings.TrimSpace(query.OutsourceOrderLineID),
		ProductBarcode:       normalizeProductBarcodeValue(query.ProductBarcode),
		Result:               normalizeOutsourceInspectionResult(query.Result),
		Limit:                limit,
	}
}

func normalizeOutsourceTransferRequest(req OutsourceTransferRequest) OutsourceTransferRequest {
	return OutsourceTransferRequest{
		OutsourceOrderLineID: strings.TrimSpace(req.OutsourceOrderLineID),
		ProductBarcode:       normalizeProductBarcodeValue(req.ProductBarcode),
		Quantity:             req.Quantity,
		UOM:                  normalizeOutsourceOrderUOM(req.UOM),
		OccurredAt:           strings.TrimSpace(req.OccurredAt),
		FromHolderType:       strings.ToUpper(strings.TrimSpace(req.FromHolderType)),
		FromHolderID:         strings.TrimSpace(req.FromHolderID),
		ToHolderType:         strings.ToUpper(strings.TrimSpace(req.ToHolderType)),
		ToHolderID:           strings.TrimSpace(req.ToHolderID),
		SourceCategory:       normalizeWarehouseCategoryCode(req.SourceCategory),
		TargetCategory:       normalizeWarehouseCategoryCode(req.TargetCategory),
		BatchNo:              strings.TrimSpace(req.BatchNo),
		Notes:                strings.TrimSpace(req.Notes),
		ActorID:              strings.TrimSpace(req.ActorID),
		Operator:             strings.TrimSpace(req.Operator),
		IP:                   strings.TrimSpace(req.IP),
	}
}

func normalizeOutsourceInspectionRequest(req OutsourceInspectionRequest) OutsourceInspectionRequest {
	result := normalizeOutsourceInspectionResult(req.Result)
	disposition := normalizeOutsourceInspectionDisposition(req.Disposition)
	if disposition == "" {
		disposition = defaultOutsourceInspectionDisposition(result)
	}
	return OutsourceInspectionRequest{
		OutsourceOrderLineID: strings.TrimSpace(req.OutsourceOrderLineID),
		ProductBarcode:       normalizeProductBarcodeValue(req.ProductBarcode),
		Result:               result,
		Disposition:          disposition,
		InspectedQuantity:    req.InspectedQuantity,
		UOM:                  normalizeOutsourceOrderUOM(req.UOM),
		InspectionTaskID:     strings.TrimSpace(req.InspectionTaskID),
		InspectedAt:          strings.TrimSpace(req.InspectedAt),
		Notes:                strings.TrimSpace(req.Notes),
		ActorID:              strings.TrimSpace(req.ActorID),
		Operator:             strings.TrimSpace(req.Operator),
		IP:                   strings.TrimSpace(req.IP),
	}
}

func normalizeOutsourceTransferType(value string) string {
	normalized := strings.ToUpper(strings.TrimSpace(value))
	switch normalized {
	case "", "ALL":
		return ""
	case "SEND", "SENT", "OUT":
		return OutsourceTransferTypeSend
	case "RETURN", "RETURNED", "IN":
		return OutsourceTransferTypeReturn
	default:
		return normalized
	}
}

func normalizeOutsourceInspectionResult(value string) string {
	normalized := strings.ToUpper(strings.TrimSpace(value))
	switch normalized {
	case "", "PASS", "PASSED":
		return OutsourceInspectionResultPass
	case "FAIL", "FAILED":
		return OutsourceInspectionResultFail
	case "CONDITIONAL", "CONDITION", "SPECIAL":
		return OutsourceInspectionResultConditional
	default:
		return normalized
	}
}

func normalizeOutsourceInspectionDisposition(value string) string {
	normalized := strings.ToUpper(strings.TrimSpace(value))
	switch normalized {
	case "":
		return ""
	case "ACCEPT", "PASS", "PASSED":
		return OutsourceInspectionDispositionAccept
	case "REWORK":
		return OutsourceInspectionDispositionRework
	case "CONCESSION", "SPECIAL_BUY", "SPECIALBUY":
		return OutsourceInspectionDispositionConcession
	case "SCRAP":
		return OutsourceInspectionDispositionScrap
	default:
		return normalized
	}
}

func defaultOutsourceInspectionDisposition(result string) string {
	switch result {
	case OutsourceInspectionResultPass:
		return OutsourceInspectionDispositionAccept
	case OutsourceInspectionResultConditional:
		return OutsourceInspectionDispositionConcession
	default:
		return ""
	}
}

func parseOutsourceExecutionTime(value string, field string) (*time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, nil
	}
	for _, layout := range []string{time.RFC3339, "2006-01-02 15:04:05", "2006-01-02"} {
		parsed, err := time.Parse(layout, trimmed)
		if err == nil {
			return &parsed, nil
		}
	}
	return nil, fmt.Errorf("%w: %s must be RFC3339 or YYYY-MM-DD", ErrInvalidOutsourceOrder, field)
}

func loadOutsourceOrderLineForExecutionTx(tx *gorm.DB, lineID string) (models.OutsourceOrder, models.OutsourceOrderLine, error) {
	id := strings.TrimSpace(lineID)
	if id == "" {
		return models.OutsourceOrder{}, models.OutsourceOrderLine{}, fmt.Errorf("%w: outsourceOrderLineId is required", ErrInvalidOutsourceOrder)
	}

	var line models.OutsourceOrderLine
	if err := tx.First(&line, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.OutsourceOrder{}, models.OutsourceOrderLine{}, ErrOutsourceOrderNotFound
		}
		return models.OutsourceOrder{}, models.OutsourceOrderLine{}, err
	}

	var order models.OutsourceOrder
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&order, "id = ?", line.OutsourceOrderID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.OutsourceOrder{}, models.OutsourceOrderLine{}, ErrOutsourceOrderNotFound
		}
		return models.OutsourceOrder{}, models.OutsourceOrderLine{}, err
	}
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&line, "id = ?", id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.OutsourceOrder{}, models.OutsourceOrderLine{}, ErrOutsourceOrderNotFound
		}
		return models.OutsourceOrder{}, models.OutsourceOrderLine{}, err
	}
	return order, line, nil
}

func validateOutsourceTransferAllowed(tx *gorm.DB, order models.OutsourceOrder, line models.OutsourceOrderLine, transferType string, req OutsourceTransferRequest) error {
	if !isOutsourceTransferType(transferType) {
		return fmt.Errorf("%w: unsupported transferType %s", ErrInvalidOutsourceOrder, transferType)
	}
	if req.ProductBarcode == "" {
		return fmt.Errorf("%w: productBarcode is required", ErrInvalidOutsourceOrder)
	}
	if req.Quantity <= 0 {
		return fmt.Errorf("%w: quantity must be greater than 0", ErrInvalidOutsourceOrder)
	}
	if !strings.EqualFold(req.UOM, line.UOM) {
		return fmt.Errorf("%w: transfer uom must match outsource line uom", ErrInvalidOutsourceOrder)
	}
	if order.Status == OutsourceOrderStatusDraft {
		return fmt.Errorf("%w: outsource order must be released before transfer", ErrInvalidOutsourceOrder)
	}
	if order.Status == OutsourceOrderStatusClosed || order.Status == OutsourceOrderStatusCanceled {
		return fmt.Errorf("%w: closed or canceled outsource order cannot be transferred", ErrInvalidOutsourceOrder)
	}

	switch transferType {
	case OutsourceTransferTypeSend:
		if line.SentQuantity+req.Quantity-line.Quantity > outsourceQuantityEpsilon {
			return fmt.Errorf("%w: send quantity exceeds outsource line quantity", ErrInvalidOutsourceOrder)
		}
	case OutsourceTransferTypeReturn:
		if line.SentQuantity <= 0 {
			return fmt.Errorf("%w: line has not been sent", ErrInvalidOutsourceOrder)
		}
		if line.ReturnedQuantity+req.Quantity-line.SentQuantity > outsourceQuantityEpsilon {
			return fmt.Errorf("%w: return quantity exceeds sent quantity", ErrInvalidOutsourceOrder)
		}
		var sent models.OutsourceTransfer
		if err := tx.Where(
			"outsource_order_line_id = ? AND transfer_type = ? AND product_barcode = ?",
			line.ID,
			OutsourceTransferTypeSend,
			req.ProductBarcode,
		).First(&sent).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("%w: productBarcode has not been sent for this outsource line", ErrInvalidOutsourceOrder)
			}
			return err
		}
		if sent.Quantity-req.Quantity < -outsourceQuantityEpsilon {
			return fmt.Errorf("%w: return quantity exceeds sent quantity for barcode", ErrInvalidOutsourceOrder)
		}
	}

	var duplicate models.OutsourceTransfer
	err := tx.Where(
		"outsource_order_line_id = ? AND transfer_type = ? AND product_barcode = ?",
		line.ID,
		transferType,
		req.ProductBarcode,
	).First(&duplicate).Error
	if err == nil {
		return fmt.Errorf("%w: productBarcode already has %s transfer for this outsource line", ErrInvalidOutsourceOrder, transferType)
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return nil
}

func validateOutsourceInspectionAllowed(tx *gorm.DB, order models.OutsourceOrder, line models.OutsourceOrderLine, req OutsourceInspectionRequest) error {
	if req.ProductBarcode == "" {
		return fmt.Errorf("%w: productBarcode is required", ErrInvalidOutsourceOrder)
	}
	if req.InspectedQuantity <= 0 {
		return fmt.Errorf("%w: inspectedQuantity must be greater than 0", ErrInvalidOutsourceOrder)
	}
	if !isOutsourceInspectionResult(req.Result) {
		return fmt.Errorf("%w: unsupported inspection result %s", ErrInvalidOutsourceOrder, req.Result)
	}
	if !isOutsourceInspectionDisposition(req.Disposition) {
		return fmt.Errorf("%w: unsupported inspection disposition %s", ErrInvalidOutsourceOrder, req.Disposition)
	}
	if req.Result == OutsourceInspectionResultFail && req.Disposition != OutsourceInspectionDispositionRework && req.Disposition != OutsourceInspectionDispositionScrap {
		return fmt.Errorf("%w: failed inspection must choose REWORK or SCRAP disposition", ErrInvalidOutsourceOrder)
	}
	if !strings.EqualFold(req.UOM, line.UOM) {
		return fmt.Errorf("%w: inspection uom must match outsource line uom", ErrInvalidOutsourceOrder)
	}
	if order.Status == OutsourceOrderStatusDraft {
		return fmt.Errorf("%w: outsource order must be released before inspection", ErrInvalidOutsourceOrder)
	}
	if order.Status == OutsourceOrderStatusClosed || order.Status == OutsourceOrderStatusCanceled {
		return fmt.Errorf("%w: closed or canceled outsource order cannot be inspected", ErrInvalidOutsourceOrder)
	}

	var returned models.OutsourceTransfer
	if err := tx.Where(
		"outsource_order_line_id = ? AND transfer_type = ? AND product_barcode = ?",
		line.ID,
		OutsourceTransferTypeReturn,
		req.ProductBarcode,
	).First(&returned).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("%w: productBarcode has not returned for this outsource line", ErrInvalidOutsourceOrder)
		}
		return err
	}
	if req.InspectedQuantity-returned.Quantity > outsourceQuantityEpsilon {
		return fmt.Errorf("%w: inspectedQuantity exceeds returned quantity for barcode", ErrInvalidOutsourceOrder)
	}

	var duplicate models.OutsourceInspection
	err := tx.Where(
		"outsource_order_line_id = ? AND product_barcode = ?",
		line.ID,
		req.ProductBarcode,
	).First(&duplicate).Error
	if err == nil {
		return fmt.Errorf("%w: productBarcode already inspected for this outsource line", ErrInvalidOutsourceOrder)
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return nil
}

func loadOutsourceBarcodeStateForLineTx(tx *gorm.DB, line models.OutsourceOrderLine, productBarcode string) (models.ProductBarcodeState, bool, error) {
	state, exists, err := findProductBarcodeStateTx(tx, productBarcode)
	if err != nil {
		return models.ProductBarcodeState{}, false, err
	}
	if !exists {
		return models.ProductBarcodeState{}, false, fmt.Errorf("%w: productBarcode state does not exist", ErrInvalidOutsourceOrder)
	}
	if strings.TrimSpace(state.CurrentProcessStepID) == "" {
		return models.ProductBarcodeState{}, false, fmt.Errorf("%w: productBarcode has no current process step", ErrInvalidOutsourceOrder)
	}
	if strings.TrimSpace(state.RouteStepID) == "" {
		return models.ProductBarcodeState{}, false, fmt.Errorf("%w: productBarcode has no current route step", ErrInvalidOutsourceOrder)
	}
	if line.ProductID != "" && state.ProductID != "" && line.ProductID != state.ProductID {
		return models.ProductBarcodeState{}, false, fmt.Errorf("%w: productBarcode product does not match outsource line", ErrInvalidOutsourceOrder)
	}
	if line.ProcessStepID != "" && state.CurrentProcessStepID != "" && line.ProcessStepID != state.CurrentProcessStepID {
		return models.ProductBarcodeState{}, false, fmt.Errorf("%w: productBarcode current process does not match outsource line process", ErrInvalidOutsourceOrder)
	}
	return state, exists, nil
}

func createOutsourceTransferTx(
	tx *gorm.DB,
	order models.OutsourceOrder,
	line models.OutsourceOrderLine,
	state models.ProductBarcodeState,
	transferType string,
	req OutsourceTransferRequest,
	occurredAt *time.Time,
) (models.OutsourceTransfer, error) {
	fromHolderType, fromHolderID, toHolderType, toHolderID := resolveOutsourceTransferHolders(order, transferType, req)
	transferEvent, err := recordProductBarcodeTransferEventTx(tx, ProductBarcodeTransferEventWriteRequest{
		ProductBarcode:    req.ProductBarcode,
		StateID:           state.ID,
		TransferType:      ProductBarcodeTransferTypeCustodyTransfer,
		RouteID:           state.RouteID,
		FromRouteStepID:   state.RouteStepID,
		ToRouteStepID:     state.RouteStepID,
		FromProcessStepID: state.CurrentProcessStepID,
		ToProcessStepID:   state.CurrentProcessStepID,
		FromHolderType:    fromHolderType,
		FromHolderID:      fromHolderID,
		ToHolderType:      toHolderType,
		ToHolderID:        toHolderID,
		Operator:          req.Operator,
		CommandSource:     ProductionScanCommandSourceWeb,
		Action:            "OUTSOURCE_" + transferType,
	})
	if err != nil {
		return models.OutsourceTransfer{}, err
	}

	transfer := models.OutsourceTransfer{
		BaseModel:            models.BaseModel{ID: uuid.NewString()},
		TransferNo:           generateOutsourceTransferNo(transferType),
		OutsourceOrderID:     order.ID,
		OutsourceOrderLineID: line.ID,
		TransferType:         transferType,
		ProductBarcode:       req.ProductBarcode,
		Quantity:             req.Quantity,
		UOM:                  line.UOM,
		PartnerID:            order.PartnerID,
		RouteID:              state.RouteID,
		RouteStepID:          state.RouteStepID,
		ProcessStepID:        state.CurrentProcessStepID,
		FromHolderType:       fromHolderType,
		FromHolderID:         fromHolderID,
		ToHolderType:         toHolderType,
		ToHolderID:           toHolderID,
		SourceCategory:       req.SourceCategory,
		TargetCategory:       req.TargetCategory,
		BatchNo:              req.BatchNo,
		TransferEventID:      transferEvent.ID,
		OccurredAt:           occurredAt,
		Operator:             resolveProductBarcodeStateOperator(req.Operator),
		Notes:                req.Notes,
	}
	if err := createProductionRecordWithOptionalUUIDs(tx, &transfer,
		productionOptionalUUIDWrite{Column: "route_id", Value: transfer.RouteID},
		productionOptionalUUIDWrite{Column: "route_step_id", Value: transfer.RouteStepID},
		productionOptionalUUIDWrite{Column: "process_step_id", Value: transfer.ProcessStepID},
		productionOptionalUUIDWrite{Column: "from_holder_id", Value: transfer.FromHolderID},
		productionOptionalUUIDWrite{Column: "to_holder_id", Value: transfer.ToHolderID},
		productionOptionalUUIDWrite{Column: "transfer_event_id", Value: transfer.TransferEventID},
	); err != nil {
		return models.OutsourceTransfer{}, err
	}
	return transfer, nil
}

func resolveOutsourceTransferHolders(order models.OutsourceOrder, transferType string, req OutsourceTransferRequest) (string, string, string, string) {
	fromHolderType := req.FromHolderType
	fromHolderID := req.FromHolderID
	toHolderType := req.ToHolderType
	toHolderID := req.ToHolderID
	if transferType == OutsourceTransferTypeSend {
		if fromHolderType == "" {
			fromHolderType = outsourceHolderFactory
		}
		if toHolderType == "" {
			toHolderType = outsourceHolderPartner
		}
		if toHolderID == "" {
			toHolderID = order.PartnerID
		}
		return fromHolderType, fromHolderID, toHolderType, toHolderID
	}
	if fromHolderType == "" {
		fromHolderType = outsourceHolderPartner
	}
	if fromHolderID == "" {
		fromHolderID = order.PartnerID
	}
	if toHolderType == "" {
		toHolderType = outsourceHolderFactory
	}
	return fromHolderType, fromHolderID, toHolderType, toHolderID
}

func buildOutsourceInspection(
	order models.OutsourceOrder,
	line models.OutsourceOrderLine,
	state models.ProductBarcodeState,
	operationID string,
	req OutsourceInspectionRequest,
	inspectedAt *time.Time,
) models.OutsourceInspection {
	accepted, rejected, rework, scrap := deriveOutsourceInspectionQuantities(req)
	return models.OutsourceInspection{
		BaseModel:            models.BaseModel{ID: uuid.NewString()},
		InspectionNo:         generateOutsourceInspectionNo(),
		OutsourceOrderID:     order.ID,
		OutsourceOrderLineID: line.ID,
		ProductBarcode:       req.ProductBarcode,
		InspectionTaskID:     req.InspectionTaskID,
		Result:               req.Result,
		Disposition:          req.Disposition,
		InspectedQuantity:    req.InspectedQuantity,
		AcceptedQuantity:     accepted,
		RejectedQuantity:     rejected,
		ReworkQuantity:       rework,
		ScrapQuantity:        scrap,
		UOM:                  line.UOM,
		RouteID:              state.RouteID,
		RouteStepID:          state.RouteStepID,
		ProcessStepID:        state.CurrentProcessStepID,
		OperationID:          operationID,
		InspectedAt:          inspectedAt,
		Inspector:            resolveProductBarcodeStateOperator(req.Operator),
		Notes:                req.Notes,
	}
}

func buildOutsourceInspectionScanCommand(
	order models.OutsourceOrder,
	state models.ProductBarcodeState,
	req OutsourceInspectionRequest,
	target productionQualityRoutingTarget,
) ExecuteProductionScanCommandRequest {
	action := ProductionOperationActionComplete
	result := "OUTSOURCE_" + req.Disposition
	if req.Disposition == OutsourceInspectionDispositionRework {
		action = ProductionOperationActionRework
	}
	if req.Disposition == OutsourceInspectionDispositionScrap {
		action = ProductionOperationActionHold
		result = "OUTSOURCE_SCRAP"
	}
	return ExecuteProductionScanCommandRequest{
		ProductBarcode:      req.ProductBarcode,
		RouteID:             state.RouteID,
		RouteStepID:         state.RouteStepID,
		ProcessStepID:       state.CurrentProcessStepID,
		TargetRouteStepID:   target.TargetRouteStepID,
		TargetProcessStepID: target.TargetProcessStepID,
		ExecutionMode:       ProductionOperationExecutionModeOutsource,
		PartnerID:           order.PartnerID,
		Action:              action,
		Result:              result,
		Notes:               req.Notes,
		CommandSource:       ProductionScanCommandSourceWeb,
		ActorID:             req.ActorID,
		Operator:            req.Operator,
		IP:                  req.IP,
	}
}

func deriveOutsourceInspectionQuantities(req OutsourceInspectionRequest) (float64, float64, float64, float64) {
	switch req.Disposition {
	case OutsourceInspectionDispositionAccept, OutsourceInspectionDispositionConcession:
		return req.InspectedQuantity, 0, 0, 0
	case OutsourceInspectionDispositionRework:
		return 0, req.InspectedQuantity, req.InspectedQuantity, 0
	case OutsourceInspectionDispositionScrap:
		return 0, req.InspectedQuantity, 0, req.InspectedQuantity
	default:
		return 0, req.InspectedQuantity, 0, 0
	}
}

func applyOutsourceTransferQuantity(line *models.OutsourceOrderLine, transferType string, quantity float64) {
	if transferType == OutsourceTransferTypeSend {
		line.SentQuantity += quantity
		return
	}
	line.ReturnedQuantity += quantity
}

func refreshOutsourceOrderStatusTx(tx *gorm.DB, orderID string, operator string) (models.OutsourceOrder, error) {
	var order models.OutsourceOrder
	if err := tx.Preload("Lines", func(db *gorm.DB) *gorm.DB {
		return db.Order("line_no asc")
	}).First(&order, "id = ?", orderID).Error; err != nil {
		return models.OutsourceOrder{}, err
	}
	previousStatus := order.Status
	nextStatus := deriveOutsourceOrderStatus(order)
	updates := map[string]interface{}{
		"status":   nextStatus,
		"operator": strings.TrimSpace(operator),
		"version":  gorm.Expr("version + ?", 1),
	}
	if err := tx.Model(&models.OutsourceOrder{}).Where("id = ?", order.ID).Updates(updates).Error; err != nil {
		return models.OutsourceOrder{}, err
	}
	if err := tx.Preload("Lines", func(db *gorm.DB) *gorm.DB {
		return db.Order("line_no asc")
	}).First(&order, "id = ?", orderID).Error; err != nil {
		return models.OutsourceOrder{}, err
	}
	if previousStatus != nextStatus {
		order.Status = nextStatus
	}
	return order, nil
}

func deriveOutsourceLineStatus(line models.OutsourceOrderLine) string {
	if line.Status == OutsourceOrderStatusCanceled {
		return OutsourceOrderStatusCanceled
	}
	if line.ReturnedQuantity-line.Quantity >= -outsourceQuantityEpsilon &&
		line.AcceptedQuantity+line.ReworkQuantity+line.ScrapQuantity-line.Quantity >= -outsourceQuantityEpsilon {
		return OutsourceOrderStatusClosed
	}
	if line.ReturnedQuantity-line.Quantity >= -outsourceQuantityEpsilon {
		return OutsourceOrderStatusReturned
	}
	if line.ReturnedQuantity > outsourceQuantityEpsilon {
		return OutsourceOrderStatusInProcess
	}
	if line.SentQuantity > outsourceQuantityEpsilon {
		return OutsourceOrderStatusSent
	}
	if line.Status == OutsourceOrderStatusDraft {
		return OutsourceOrderStatusDraft
	}
	return OutsourceOrderStatusReleased
}

func deriveOutsourceOrderStatus(order models.OutsourceOrder) string {
	if order.Status == OutsourceOrderStatusDraft || order.Status == OutsourceOrderStatusCanceled {
		return order.Status
	}
	if len(order.Lines) == 0 {
		return order.Status
	}

	allClosed := true
	allReturned := true
	allSent := true
	hasReturned := false
	hasSent := false
	for _, line := range order.Lines {
		lineStatus := deriveOutsourceLineStatus(line)
		if lineStatus != OutsourceOrderStatusClosed {
			allClosed = false
		}
		if line.ReturnedQuantity-line.Quantity < -outsourceQuantityEpsilon {
			allReturned = false
		}
		if line.SentQuantity-line.Quantity < -outsourceQuantityEpsilon {
			allSent = false
		}
		if line.ReturnedQuantity > outsourceQuantityEpsilon {
			hasReturned = true
		}
		if line.SentQuantity > outsourceQuantityEpsilon {
			hasSent = true
		}
	}
	switch {
	case allClosed:
		return OutsourceOrderStatusClosed
	case allReturned:
		return OutsourceOrderStatusReturned
	case hasReturned:
		return OutsourceOrderStatusInProcess
	case allSent || hasSent:
		return OutsourceOrderStatusSent
	default:
		return OutsourceOrderStatusReleased
	}
}

func recordOutsourceExecutionAuditTx(tx *gorm.DB, order models.OutsourceOrder, action string, metadata map[string]string, actorID string, operator string, ip string) error {
	auditAction := audit.AuditActionUpdate
	if action == string(audit.AuditActionStatus) {
		auditAction = audit.AuditActionStatus
	}
	event := audit.NewAuditEvent(
		audit.AuditEntityOutsourceOrder,
		order.ID,
		auditAction,
		outsourceOrderAuditActor(actorID, operator, ip),
	).WithMetadata("orderNo", order.OrderNo)
	for key, value := range metadata {
		event = event.WithMetadata(key, value)
	}
	return recordAuditEventTx(tx, event.Normalize())
}

func isOutsourceTransferType(value string) bool {
	switch value {
	case OutsourceTransferTypeSend, OutsourceTransferTypeReturn:
		return true
	default:
		return false
	}
}

func isOutsourceInspectionResult(value string) bool {
	switch value {
	case OutsourceInspectionResultPass, OutsourceInspectionResultFail, OutsourceInspectionResultConditional:
		return true
	default:
		return false
	}
}

func isOutsourceInspectionDisposition(value string) bool {
	switch value {
	case OutsourceInspectionDispositionAccept,
		OutsourceInspectionDispositionRework,
		OutsourceInspectionDispositionConcession,
		OutsourceInspectionDispositionScrap:
		return true
	default:
		return false
	}
}

func generateOutsourceTransferNo(transferType string) string {
	prefix := "OST"
	if transferType == OutsourceTransferTypeReturn {
		prefix = "OSR"
	}
	return prefix + "-" + time.Now().Format("20060102") + "-" + strings.ToUpper(uuid.NewString()[:8])
}

func generateOutsourceInspectionNo() string {
	return "OSI-" + time.Now().Format("20060102") + "-" + strings.ToUpper(uuid.NewString()[:8])
}

func formatOutsourceQuantity(value float64) string {
	if math.Abs(value-math.Round(value)) < outsourceQuantityEpsilon {
		return fmt.Sprintf("%.0f", value)
	}
	return strings.TrimRight(strings.TrimRight(fmt.Sprintf("%.6f", value), "0"), ".")
}

func normalizeOutsourceExecutionError(err error) error {
	if err == nil {
		return nil
	}
	if isDatabaseUniqueViolation(err) {
		return fmt.Errorf("%w: duplicate outsource execution fact violates unique constraint", ErrInvalidOutsourceOrder)
	}
	if errors.Is(err, ErrInvalidProductionScanCommand) || errors.Is(err, ErrInvalidProductionOperationExecution) {
		return fmt.Errorf("%w: %v", ErrInvalidOutsourceOrder, err)
	}
	return err
}

func mapOutsourceTransfersToDTO(items []models.OutsourceTransfer) []OutsourceTransferDTO {
	result := make([]OutsourceTransferDTO, 0, len(items))
	for _, item := range items {
		result = append(result, mapOutsourceTransferToDTO(item))
	}
	return result
}

func mapOutsourceTransferToDTO(item models.OutsourceTransfer) OutsourceTransferDTO {
	return OutsourceTransferDTO{
		ID:                   strings.TrimSpace(item.ID),
		CreatedAt:            formatProductionExecutionLotTime(item.CreatedAt),
		UpdatedAt:            formatProductionExecutionLotTime(item.UpdatedAt),
		TransferNo:           strings.TrimSpace(item.TransferNo),
		OutsourceOrderID:     strings.TrimSpace(item.OutsourceOrderID),
		OutsourceOrderLineID: strings.TrimSpace(item.OutsourceOrderLineID),
		TransferType:         strings.TrimSpace(item.TransferType),
		ProductBarcode:       strings.TrimSpace(item.ProductBarcode),
		Quantity:             item.Quantity,
		UOM:                  strings.TrimSpace(item.UOM),
		PartnerID:            strings.TrimSpace(item.PartnerID),
		RouteID:              strings.TrimSpace(item.RouteID),
		RouteStepID:          strings.TrimSpace(item.RouteStepID),
		ProcessStepID:        strings.TrimSpace(item.ProcessStepID),
		FromHolderType:       strings.TrimSpace(item.FromHolderType),
		FromHolderID:         strings.TrimSpace(item.FromHolderID),
		ToHolderType:         strings.TrimSpace(item.ToHolderType),
		ToHolderID:           strings.TrimSpace(item.ToHolderID),
		SourceCategory:       strings.TrimSpace(item.SourceCategory),
		TargetCategory:       strings.TrimSpace(item.TargetCategory),
		BatchNo:              strings.TrimSpace(item.BatchNo),
		TransferEventID:      strings.TrimSpace(item.TransferEventID),
		OccurredAt:           formatProductBarcodeStateTime(item.OccurredAt),
		Operator:             strings.TrimSpace(item.Operator),
		Notes:                strings.TrimSpace(item.Notes),
	}
}

func mapOutsourceInspectionsToDTO(items []models.OutsourceInspection) []OutsourceInspectionDTO {
	result := make([]OutsourceInspectionDTO, 0, len(items))
	for _, item := range items {
		result = append(result, mapOutsourceInspectionToDTO(item))
	}
	return result
}

func mapOutsourceInspectionToDTO(item models.OutsourceInspection) OutsourceInspectionDTO {
	return OutsourceInspectionDTO{
		ID:                   strings.TrimSpace(item.ID),
		CreatedAt:            formatProductionExecutionLotTime(item.CreatedAt),
		UpdatedAt:            formatProductionExecutionLotTime(item.UpdatedAt),
		InspectionNo:         strings.TrimSpace(item.InspectionNo),
		OutsourceOrderID:     strings.TrimSpace(item.OutsourceOrderID),
		OutsourceOrderLineID: strings.TrimSpace(item.OutsourceOrderLineID),
		ProductBarcode:       strings.TrimSpace(item.ProductBarcode),
		InspectionTaskID:     strings.TrimSpace(item.InspectionTaskID),
		Result:               strings.TrimSpace(item.Result),
		Disposition:          strings.TrimSpace(item.Disposition),
		InspectedQuantity:    item.InspectedQuantity,
		AcceptedQuantity:     item.AcceptedQuantity,
		RejectedQuantity:     item.RejectedQuantity,
		ReworkQuantity:       item.ReworkQuantity,
		ScrapQuantity:        item.ScrapQuantity,
		UOM:                  strings.TrimSpace(item.UOM),
		RouteID:              strings.TrimSpace(item.RouteID),
		RouteStepID:          strings.TrimSpace(item.RouteStepID),
		ProcessStepID:        strings.TrimSpace(item.ProcessStepID),
		OperationID:          strings.TrimSpace(item.OperationID),
		InspectedAt:          formatProductBarcodeStateTime(item.InspectedAt),
		Inspector:            strings.TrimSpace(item.Inspector),
		Notes:                strings.TrimSpace(item.Notes),
	}
}

func mapProductionScanCommandTxResultToResponse(result productionScanCommandTxResult) ExecuteProductionScanCommandResponse {
	return ExecuteProductionScanCommandResponse{
		CommandSource:  result.CommandSource,
		Operation:      mapProductionOperationExecutionToResponse(result.RecordResult.Operation),
		State:          result.StateResponse,
		Progress:       result.Progress,
		TransferEvents: mapProductBarcodeTransferEventsToResponse(result.TransferEvents),
		Message:        result.Message,
	}
}
