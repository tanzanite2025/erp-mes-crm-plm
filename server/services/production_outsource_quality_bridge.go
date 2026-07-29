package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type OutsourceInspectionTaskRequest struct {
	OutsourceOrderLineID string  `json:"-"`
	ProductBarcode       string  `json:"productBarcode"`
	SampleQty            float64 `json:"sampleQty"`
	UOM                  string  `json:"uom"`
	BatchNo              string  `json:"batchNo"`
	ActorID              string  `json:"-"`
	Operator             string  `json:"-"`
	IP                   string  `json:"-"`
}

type OutsourceInspectionTaskDTO struct {
	ID               string  `json:"id"`
	Status           string  `json:"status"`
	SourceType       string  `json:"sourceType"`
	SourceID         string  `json:"sourceId"`
	SourceLineID     string  `json:"sourceLineId"`
	ProductBarcode   string  `json:"productBarcode"`
	ProductionPlanID string  `json:"productionPlanId"`
	OrderID          string  `json:"orderId"`
	BatchNo          string  `json:"batchNo"`
	ProductID        string  `json:"productId"`
	ProductName      string  `json:"productName"`
	SampleQty        float64 `json:"sampleQty"`
	Result           string  `json:"result"`
	Inspector        string  `json:"inspector"`
	ClaimedBy        string  `json:"claimedBy"`
	ClaimedAt        string  `json:"claimedAt"`
	CompletedAt      string  `json:"completedAt"`
}

func PrepareOutsourceInspectionTask(
	req OutsourceInspectionTaskRequest,
) (OutsourceInspectionTaskDTO, error) {
	return defaultProductionOutsourcingService.PrepareOutsourceInspectionTask(req)
}

func (s *ProductionOutsourcingService) PrepareOutsourceInspectionTask(
	req OutsourceInspectionTaskRequest,
) (OutsourceInspectionTaskDTO, error) {
	req.ProductBarcode = strings.TrimSpace(req.ProductBarcode)
	req.UOM = strings.ToUpper(strings.TrimSpace(req.UOM))
	req.BatchNo = strings.TrimSpace(req.BatchNo)
	if req.SampleQty <= 0 {
		req.SampleQty = 1
	}

	var task models.InspectionTask
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		order, line, err := loadOutsourceOrderLineForExecutionTx(tx, req.OutsourceOrderLineID)
		if err != nil {
			return err
		}
		task, err = prepareOutsourceInspectionTaskTx(tx, order, line, req)
		return err
	})
	if err != nil {
		return OutsourceInspectionTaskDTO{}, normalizeOutsourceExecutionError(err)
	}
	return mapOutsourceInspectionTaskToDTO(task), nil
}

func prepareOutsourceInspectionTaskTx(
	tx *gorm.DB,
	order models.OutsourceOrder,
	line models.OutsourceOrderLine,
	req OutsourceInspectionTaskRequest,
) (models.InspectionTask, error) {
	if strings.TrimSpace(req.ProductBarcode) == "" {
		return models.InspectionTask{}, fmt.Errorf("%w: productBarcode is required", ErrInvalidOutsourceOrder)
	}
	if order.Status == OutsourceOrderStatusDraft ||
		order.Status == OutsourceOrderStatusCanceled ||
		order.Status == OutsourceOrderStatusClosed {
		return models.InspectionTask{}, fmt.Errorf("%w: outsource order is not available for inspection", ErrInvalidOutsourceOrder)
	}
	if req.UOM != "" && !strings.EqualFold(req.UOM, line.UOM) {
		return models.InspectionTask{}, fmt.Errorf("%w: inspection task uom must match outsource line uom", ErrInvalidOutsourceOrder)
	}

	var returned models.OutsourceTransfer
	if err := tx.Where(
		"outsource_order_line_id = ? AND transfer_type = ? AND product_barcode = ?",
		line.ID,
		OutsourceTransferTypeReturn,
		req.ProductBarcode,
	).First(&returned).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.InspectionTask{}, fmt.Errorf("%w: productBarcode has not returned for this outsource line", ErrInvalidOutsourceOrder)
		}
		return models.InspectionTask{}, err
	}
	if req.SampleQty > returned.Quantity+outsourceQuantityEpsilon {
		return models.InspectionTask{}, fmt.Errorf("%w: inspection sample quantity exceeds returned quantity", ErrInvalidOutsourceOrder)
	}

	batchNo := req.BatchNo
	if batchNo == "" {
		batchNo = strings.TrimSpace(returned.BatchNo)
	}
	if batchNo == "" {
		batchNo = req.ProductBarcode
	}
	uom := line.UOM
	if req.UOM != "" {
		uom = req.UOM
	}
	claimedBy := resolveOutsourceQualityTaskActor(req.Operator, req.ActorID)

	var task models.InspectionTask
	result := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where(
			"source_type = ? AND source_line_id = ? AND product_barcode = ?",
			QualityInspectionTaskSourceProductionOutsource,
			line.ID,
			req.ProductBarcode,
		).
		First(&task)
	switch {
	case result.Error == nil:
		if task.Status == QualityInspectionTaskStatusCompleted {
			return models.InspectionTask{}, fmt.Errorf("%w: productBarcode already has a completed quality task", ErrInvalidOutsourceOrder)
		}
		if task.Status == QualityInspectionTaskStatusCancelled {
			return models.InspectionTask{}, fmt.Errorf("%w: productBarcode quality task is canceled", ErrInvalidOutsourceOrder)
		}
		if task.Status == QualityInspectionTaskStatusClaimed &&
			strings.TrimSpace(task.ClaimedBy) != claimedBy {
			return models.InspectionTask{}, ErrQualityInspectionTaskClaimed
		}
		now := time.Now()
		if err := tx.Model(&models.InspectionTask{}).
			Where("id = ?", task.ID).
			Updates(map[string]any{
				"status":     QualityInspectionTaskStatusClaimed,
				"claimed_by": claimedBy,
				"claimed_at": &now,
				"sample_qty": req.SampleQty,
				"updated_at": now,
			}).Error; err != nil {
			return models.InspectionTask{}, err
		}
		task.Status = QualityInspectionTaskStatusClaimed
		task.ClaimedBy = claimedBy
		task.ClaimedAt = &now
		task.SampleQty = req.SampleQty
	case errors.Is(result.Error, gorm.ErrRecordNotFound):
		task = models.InspectionTask{
			BaseModel:        models.BaseModel{ID: uuid.NewString()},
			Status:           QualityInspectionTaskStatusClaimed,
			SourceType:       QualityInspectionTaskSourceProductionOutsource,
			SourceID:         order.ID,
			SourceLineID:     line.ID,
			ProductBarcode:   req.ProductBarcode,
			ProductionPlanID: outsourceQualityProductionPlanID(order),
			OrderID:          outsourceQualityOrderID(order),
			BatchNo:          batchNo,
			ProductID:        line.ProductID,
			ProductName:      line.ProductName,
			SampleQty:        req.SampleQty,
			Result:           "PENDING",
			ClaimedBy:        claimedBy,
		}
		now := time.Now()
		task.ClaimedAt = &now
		task.InputData = mustMarshalOutsourceQualityTaskInput(uom, line, order)
		if err := createProductionRecordWithOptionalUUIDs(tx, &task,
			productionOptionalUUIDWrite{Column: "standard_id", Value: task.StandardID},
			productionOptionalUUIDWrite{Column: "production_plan_id", Value: task.ProductionPlanID},
			productionOptionalUUIDWrite{Column: "order_id", Value: task.OrderID},
			productionOptionalUUIDWrite{Column: "product_id", Value: task.ProductID},
		); err != nil {
			return models.InspectionTask{}, err
		}
	default:
		return models.InspectionTask{}, result.Error
	}

	if err := recordAuditEventTx(tx, audit.NewAuditEvent(
		"InspectionTask",
		task.ID,
		audit.AuditActionStatus,
		audit.AuditActor{UserID: req.ActorID, Username: claimedBy, IP: req.IP, Source: "production-outsource"},
	).WithMetadata("sourceType", QualityInspectionTaskSourceProductionOutsource).
		WithMetadata("sourceLineId", line.ID).
		WithMetadata("productBarcode", req.ProductBarcode).
		WithMetadata("status", QualityInspectionTaskStatusClaimed).
		Normalize()); err != nil {
		return models.InspectionTask{}, err
	}
	return task, nil
}

func completeOutsourceInspectionTaskTx(
	tx *gorm.DB,
	order models.OutsourceOrder,
	line models.OutsourceOrderLine,
	taskID string,
	req OutsourceInspectionRequest,
	inspection models.OutsourceInspection,
) (models.InspectionTask, error) {
	taskID = strings.TrimSpace(taskID)
	if taskID == "" {
		return models.InspectionTask{}, fmt.Errorf("%w: inspectionTaskId is required", ErrInvalidOutsourceOrder)
	}

	var task models.InspectionTask
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		First(&task, "id = ?", taskID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return models.InspectionTask{}, fmt.Errorf("%w: inspection task does not exist", ErrInvalidOutsourceOrder)
		}
		return models.InspectionTask{}, err
	}
	if task.SourceType != QualityInspectionTaskSourceProductionOutsource ||
		task.SourceID != order.ID ||
		task.SourceLineID != line.ID ||
		task.ProductBarcode != req.ProductBarcode {
		return models.InspectionTask{}, fmt.Errorf("%w: inspection task does not match outsource line or product barcode", ErrInvalidOutsourceOrder)
	}
	if task.Status == QualityInspectionTaskStatusCompleted {
		return models.InspectionTask{}, fmt.Errorf("%w: inspection task is already completed", ErrInvalidOutsourceOrder)
	}
	if task.Status == QualityInspectionTaskStatusCancelled {
		return models.InspectionTask{}, fmt.Errorf("%w: inspection task is canceled", ErrInvalidOutsourceOrder)
	}
	claimedBy := resolveOutsourceQualityTaskActor(req.Operator, req.ActorID)
	if task.Status == QualityInspectionTaskStatusClaimed &&
		strings.TrimSpace(task.ClaimedBy) != claimedBy {
		return models.InspectionTask{}, ErrQualityInspectionTaskClaimed
	}

	now := time.Now()
	task.Status = QualityInspectionTaskStatusCompleted
	task.Result = req.Result
	task.Inspector = claimedBy
	task.ClaimedBy = claimedBy
	task.CompletedAt = &now
	task.InputData = mustMarshalOutsourceQualityInspectionInput(order, line, req, inspection)
	if err := tx.Model(&models.InspectionTask{}).
		Where("id = ?", task.ID).
		Updates(map[string]any{
			"status":       task.Status,
			"result":       task.Result,
			"inspector":    task.Inspector,
			"claimed_by":   task.ClaimedBy,
			"input_data":   task.InputData,
			"completed_at": task.CompletedAt,
			"updated_at":   now,
		}).Error; err != nil {
		return models.InspectionTask{}, err
	}

	if req.Disposition != OutsourceInspectionDispositionAccept {
		var abnormality models.QualityAbnormality
		err := tx.Where("task_id = ? AND status = ?", task.ID, "OPEN").
			First(&abnormality).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			disposalMethod := req.Disposition
			abnormality = models.QualityAbnormality{
				BaseModel:        models.BaseModel{ID: uuid.NewString()},
				TaskID:           task.ID,
				Severity:         "MAJOR",
				Description:      "委外回厂检验处置: " + req.Disposition,
				DisposalMethod:   disposalMethod,
				ProductionPlanID: task.ProductionPlanID,
				OrderID:          task.OrderID,
				ProductID:        task.ProductID,
				BatchNo:          task.BatchNo,
				OccurredAt:       inspection.InspectedAt,
				Status:           "OPEN",
				Reporter:         claimedBy,
			}
			if req.Disposition == OutsourceInspectionDispositionScrap {
				quantity := inspection.ScrapQuantity
				abnormality.ScrapQuantity = &quantity
				abnormality.ScrapUnit = inspection.UOM
			}
			if err := createProductionRecordWithOptionalUUIDs(tx, &abnormality,
				productionOptionalUUIDWrite{Column: "production_plan_id", Value: abnormality.ProductionPlanID},
				productionOptionalUUIDWrite{Column: "order_id", Value: abnormality.OrderID},
				productionOptionalUUIDWrite{Column: "product_id", Value: abnormality.ProductID},
			); err != nil {
				return models.InspectionTask{}, err
			}
		} else if err != nil {
			return models.InspectionTask{}, err
		}
	}

	if err := recordAuditEventTx(tx, audit.NewAuditEvent(
		"InspectionTask",
		task.ID,
		audit.AuditActionStatus,
		audit.AuditActor{UserID: req.ActorID, Username: claimedBy, IP: req.IP, Source: "production-outsource"},
	).WithMetadata("status", QualityInspectionTaskStatusCompleted).
		WithMetadata("result", req.Result).
		WithMetadata("disposition", req.Disposition).
		Normalize()); err != nil {
		return models.InspectionTask{}, err
	}
	return task, nil
}

func resolveOutsourceQualityTaskActor(operator, actorID string) string {
	if value := strings.TrimSpace(operator); value != "" {
		return value
	}
	if value := strings.TrimSpace(actorID); value != "" {
		return value
	}
	return "system"
}

func outsourceQualityProductionPlanID(order models.OutsourceOrder) string {
	if order.SourceType == OutsourceOrderSourceProductionPlan {
		return strings.TrimSpace(order.SourceID)
	}
	return ""
}

func outsourceQualityOrderID(order models.OutsourceOrder) string {
	if order.SourceType == OutsourceOrderSourceSalesOrder {
		return strings.TrimSpace(order.SourceID)
	}
	return ""
}

func mustMarshalOutsourceQualityTaskInput(
	uom string,
	line models.OutsourceOrderLine,
	order models.OutsourceOrder,
) []byte {
	payload, _ := json.Marshal(map[string]any{
		"sourceType":           QualityInspectionTaskSourceProductionOutsource,
		"outsourceOrderId":     order.ID,
		"outsourceOrderLineId": line.ID,
		"uom":                  uom,
	})
	return payload
}

func mustMarshalOutsourceQualityInspectionInput(
	order models.OutsourceOrder,
	line models.OutsourceOrderLine,
	req OutsourceInspectionRequest,
	inspection models.OutsourceInspection,
) []byte {
	payload, _ := json.Marshal(map[string]any{
		"sourceType":           QualityInspectionTaskSourceProductionOutsource,
		"outsourceOrderId":     order.ID,
		"outsourceOrderLineId": line.ID,
		"productBarcode":       req.ProductBarcode,
		"result":               req.Result,
		"disposition":          req.Disposition,
		"inspectedQuantity":    req.InspectedQuantity,
		"acceptedQuantity":     inspection.AcceptedQuantity,
		"rejectedQuantity":     inspection.RejectedQuantity,
		"reworkQuantity":       inspection.ReworkQuantity,
		"scrapQuantity":        inspection.ScrapQuantity,
		"uom":                  inspection.UOM,
	})
	return payload
}

func mapOutsourceInspectionTaskToDTO(task models.InspectionTask) OutsourceInspectionTaskDTO {
	return OutsourceInspectionTaskDTO{
		ID:               strings.TrimSpace(task.ID),
		Status:           strings.TrimSpace(task.Status),
		SourceType:       strings.TrimSpace(task.SourceType),
		SourceID:         strings.TrimSpace(task.SourceID),
		SourceLineID:     strings.TrimSpace(task.SourceLineID),
		ProductBarcode:   strings.TrimSpace(task.ProductBarcode),
		ProductionPlanID: strings.TrimSpace(task.ProductionPlanID),
		OrderID:          strings.TrimSpace(task.OrderID),
		BatchNo:          strings.TrimSpace(task.BatchNo),
		ProductID:        strings.TrimSpace(task.ProductID),
		ProductName:      strings.TrimSpace(task.ProductName),
		SampleQty:        task.SampleQty,
		Result:           strings.TrimSpace(task.Result),
		Inspector:        strings.TrimSpace(task.Inspector),
		ClaimedBy:        strings.TrimSpace(task.ClaimedBy),
		ClaimedAt:        formatOptionalOutsourceQualityTaskTime(task.ClaimedAt),
		CompletedAt:      formatOptionalOutsourceQualityTaskTime(task.CompletedAt),
	}
}

func formatOptionalOutsourceQualityTaskTime(value *time.Time) string {
	if value == nil {
		return ""
	}
	return formatProductionExecutionLotTime(*value)
}
