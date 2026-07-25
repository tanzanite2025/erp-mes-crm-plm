package services

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
	"xdfc-server/audit"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const (
	OutsourceOrderSourceSalesOrder     = "SALES_ORDER"
	OutsourceOrderSourceProductionPlan = "PRODUCTION_PLAN"
)

const (
	OutsourceOrderStatusDraft     = "DRAFT"
	OutsourceOrderStatusReleased  = "RELEASED"
	OutsourceOrderStatusSent      = "SENT"
	OutsourceOrderStatusInProcess = "IN_PROCESS"
	OutsourceOrderStatusReturned  = "RETURNED"
	OutsourceOrderStatusClosed    = "CLOSED"
	OutsourceOrderStatusCanceled  = "CANCELED"
)

var (
	ErrInvalidOutsourceOrder         = errors.New("invalid outsource order")
	ErrOutsourceOrderNotFound        = errors.New("outsource order not found")
	ErrOutsourceOrderDuplicateNo     = errors.New("outsource order no already exists")
	ErrOutsourceOrderVersionConflict = errors.New("outsource order version conflict")
)

type SaveOutsourceOrderRequest struct {
	Order    OutsourceOrderDTO
	ActorID  string
	Operator string
	IP       string
}

type UpdateOutsourceOrderRequest struct {
	ID       string
	Order    OutsourceOrderDTO
	ActorID  string
	Operator string
	IP       string
}

type DeleteOutsourceOrderRequest struct {
	ID       string
	ActorID  string
	Operator string
	IP       string
}

type ReleaseOutsourceOrderRequest struct {
	ID       string
	ActorID  string
	Operator string
	IP       string
}

func ListOutsourceOrders(query OutsourceOrderListQuery) (OutsourceOrderListResponse, error) {
	return defaultProductionOutsourcingService.ListOutsourceOrders(query)
}

func CreateOutsourceOrder(req SaveOutsourceOrderRequest) (OutsourceOrderDTO, error) {
	return defaultProductionOutsourcingService.CreateOutsourceOrder(req)
}

func UpdateOutsourceOrder(req UpdateOutsourceOrderRequest) (OutsourceOrderDTO, error) {
	return defaultProductionOutsourcingService.UpdateOutsourceOrder(req)
}

func DeleteOutsourceOrder(req DeleteOutsourceOrderRequest) error {
	return defaultProductionOutsourcingService.DeleteOutsourceOrder(req)
}

func ReleaseOutsourceOrder(req ReleaseOutsourceOrderRequest) (OutsourceOrderDTO, error) {
	return defaultProductionOutsourcingService.ReleaseOutsourceOrder(req)
}

func (s *ProductionOutsourcingService) ListOutsourceOrders(query OutsourceOrderListQuery) (OutsourceOrderListResponse, error) {
	normalized := normalizeOutsourceOrderListQuery(query)
	dbQuery := s.txManager.DB().
		Model(&models.OutsourceOrder{}).
		Preload("Lines", func(db *gorm.DB) *gorm.DB {
			return db.Order("line_no asc")
		})

	if normalized.Search != "" {
		searchPattern := "%" + strings.ToLower(normalized.Search) + "%"
		dbQuery = dbQuery.Where(
			"LOWER(order_no) LIKE ? OR LOWER(source_no) LIKE ? OR LOWER(customer_name) LIKE ? OR LOWER(partner_name_snapshot) LIKE ?",
			searchPattern,
			searchPattern,
			searchPattern,
			searchPattern,
		)
	}
	if normalized.Status != "" {
		dbQuery = dbQuery.Where("status = ?", normalized.Status)
	}
	if normalized.SourceType != "" {
		dbQuery = dbQuery.Where("source_type = ?", normalized.SourceType)
	}
	if normalized.PartnerID != "" {
		dbQuery = dbQuery.Where("partner_id = ?", normalized.PartnerID)
	}

	var orders []models.OutsourceOrder
	if err := dbQuery.Order("created_at desc").Find(&orders).Error; err != nil {
		return OutsourceOrderListResponse{}, err
	}

	items := mapOutsourceOrdersToDTO(orders)
	return OutsourceOrderListResponse{
		Items:    items,
		Metadata: buildOutsourceOrderListStats(items),
	}, nil
}

func (s *ProductionOutsourcingService) CreateOutsourceOrder(req SaveOutsourceOrderRequest) (OutsourceOrderDTO, error) {
	normalized := normalizeOutsourceOrderDTO(req.Order)
	if err := validateOutsourceOrderDTO(normalized); err != nil {
		return OutsourceOrderDTO{}, err
	}
	if err := validateDraftOnlyOutsourceOrderDTO(normalized); err != nil {
		return OutsourceOrderDTO{}, err
	}
	plannedSendDate, plannedReturnDate, err := parseOutsourceOrderDates(normalized)
	if err != nil {
		return OutsourceOrderDTO{}, err
	}

	order := mapOutsourceOrderDTOToModel(normalized)
	if order.ID == "" || strings.HasPrefix(order.ID, "temp-") {
		order.ID = uuid.NewString()
	}
	if order.OrderNo == "" {
		order.OrderNo = generateOutsourceOrderNo()
	}
	order.PlannedSendDate = plannedSendDate
	order.PlannedReturnDate = plannedReturnDate
	order.Version = 1
	order.Operator = strings.TrimSpace(req.Operator)
	prepareOutsourceOrderLines(&order)

	var saved models.OutsourceOrder
	err = s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		if err := ensureOutsourceOrderNoAvailable(tx, order.OrderNo, ""); err != nil {
			return err
		}
		if err := fillOutsourceOrderSnapshots(tx, &order); err != nil {
			return err
		}
		recalculateOutsourceOrderTotals(&order)
		if err := tx.Omit("Lines", "Partner").Create(&order).Error; err != nil {
			return err
		}
		if len(order.Lines) > 0 {
			if err := tx.Create(&order.Lines).Error; err != nil {
				return err
			}
		}
		if err := tx.Preload("Lines", func(db *gorm.DB) *gorm.DB {
			return db.Order("line_no asc")
		}).First(&saved, "id = ?", order.ID).Error; err != nil {
			return err
		}
		return recordAuditEventTx(tx, audit.NewAuditEvent(
			audit.AuditEntityOutsourceOrder,
			saved.ID,
			audit.AuditActionCreate,
			outsourceOrderAuditActor(req.ActorID, req.Operator, req.IP),
		).WithMetadata("orderNo", saved.OrderNo).WithMetadata("status", saved.Status).Normalize())
	})
	return mapOutsourceOrderToDTO(saved), err
}

func (s *ProductionOutsourcingService) UpdateOutsourceOrder(req UpdateOutsourceOrderRequest) (OutsourceOrderDTO, error) {
	id := strings.TrimSpace(req.ID)
	if id == "" {
		return OutsourceOrderDTO{}, fmt.Errorf("%w: id is required", ErrInvalidOutsourceOrder)
	}

	normalized := normalizeOutsourceOrderDTO(req.Order)
	normalized.ID = id
	if err := validateOutsourceOrderDTO(normalized); err != nil {
		return OutsourceOrderDTO{}, err
	}
	plannedSendDate, plannedReturnDate, err := parseOutsourceOrderDates(normalized)
	if err != nil {
		return OutsourceOrderDTO{}, err
	}

	var saved models.OutsourceOrder
	err = s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var existing models.OutsourceOrder
		if err := tx.Preload("Lines", func(db *gorm.DB) *gorm.DB {
			return db.Order("line_no asc")
		}).First(&existing, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrOutsourceOrderNotFound
			}
			return err
		}
		if existing.Status != OutsourceOrderStatusDraft {
			return fmt.Errorf("%w: only draft outsource orders can be edited", ErrInvalidOutsourceOrder)
		}
		if normalized.Version <= 0 || existing.Version != normalized.Version {
			return ErrOutsourceOrderVersionConflict
		}
		if normalized.Status != existing.Status {
			return fmt.Errorf("%w: use release/send/return actions to change outsource order status", ErrInvalidOutsourceOrder)
		}
		if err := validateDraftOnlyOutsourceOrderDTO(normalized); err != nil {
			return err
		}
		if normalized.OrderNo == "" {
			normalized.OrderNo = existing.OrderNo
		}
		if err := ensureOutsourceOrderNoAvailable(tx, normalized.OrderNo, id); err != nil {
			return err
		}

		before := mapOutsourceOrderToDTO(existing)
		updated := existing
		applyOutsourceOrderDTO(&updated, normalized)
		updated.PlannedSendDate = plannedSendDate
		updated.PlannedReturnDate = plannedReturnDate
		updated.Operator = strings.TrimSpace(req.Operator)
		updated.Version = existing.Version + 1
		prepareOutsourceOrderLines(&updated)
		if err := fillOutsourceOrderSnapshots(tx, &updated); err != nil {
			return err
		}
		recalculateOutsourceOrderTotals(&updated)

		if err := tx.Omit("Lines", "Partner").Save(&updated).Error; err != nil {
			return err
		}
		if err := tx.Unscoped().
			Where("outsource_order_id = ?", updated.ID).
			Delete(&models.OutsourceOrderLine{}).Error; err != nil {
			return err
		}
		if len(updated.Lines) > 0 {
			if err := tx.Create(&updated.Lines).Error; err != nil {
				return err
			}
		}
		if err := tx.Preload("Lines", func(db *gorm.DB) *gorm.DB {
			return db.Order("line_no asc")
		}).First(&saved, "id = ?", updated.ID).Error; err != nil {
			return err
		}

		after := mapOutsourceOrderToDTO(saved)
		event := audit.NewAuditEvent(
			audit.AuditEntityOutsourceOrder,
			saved.ID,
			audit.AuditActionUpdate,
			outsourceOrderAuditActor(req.ActorID, req.Operator, req.IP),
		).WithChanges(audit.DiffModelValues(before, after)...).
			WithMetadata("orderNo", saved.OrderNo).
			WithMetadata("status", saved.Status)
		return recordAuditEventTx(tx, event.Normalize())
	})
	return mapOutsourceOrderToDTO(saved), err
}

func (s *ProductionOutsourcingService) DeleteOutsourceOrder(req DeleteOutsourceOrderRequest) error {
	id := strings.TrimSpace(req.ID)
	if id == "" {
		return fmt.Errorf("%w: id is required", ErrInvalidOutsourceOrder)
	}

	return s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var existing models.OutsourceOrder
		if err := tx.First(&existing, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrOutsourceOrderNotFound
			}
			return err
		}
		if existing.Status != OutsourceOrderStatusDraft {
			return fmt.Errorf("%w: only draft outsource orders can be deleted", ErrInvalidOutsourceOrder)
		}
		if err := tx.Unscoped().
			Where("outsource_order_id = ?", existing.ID).
			Delete(&models.OutsourceOrderLine{}).Error; err != nil {
			return err
		}
		if err := tx.Delete(&models.OutsourceOrder{}, "id = ?", existing.ID).Error; err != nil {
			return err
		}
		return recordAuditEventTx(tx, audit.NewAuditEvent(
			audit.AuditEntityOutsourceOrder,
			existing.ID,
			audit.AuditActionDelete,
			outsourceOrderAuditActor(req.ActorID, req.Operator, req.IP),
		).WithMetadata("orderNo", existing.OrderNo).WithMetadata("status", existing.Status).Normalize())
	})
}

func (s *ProductionOutsourcingService) ReleaseOutsourceOrder(req ReleaseOutsourceOrderRequest) (OutsourceOrderDTO, error) {
	id := strings.TrimSpace(req.ID)
	if id == "" {
		return OutsourceOrderDTO{}, fmt.Errorf("%w: id is required", ErrInvalidOutsourceOrder)
	}

	var saved models.OutsourceOrder
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		var existing models.OutsourceOrder
		if err := tx.Preload("Lines", func(db *gorm.DB) *gorm.DB {
			return db.Order("line_no asc")
		}).First(&existing, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrOutsourceOrderNotFound
			}
			return err
		}
		if existing.Status == OutsourceOrderStatusClosed || existing.Status == OutsourceOrderStatusCanceled {
			return fmt.Errorf("%w: closed or canceled order cannot be released", ErrInvalidOutsourceOrder)
		}
		if existing.Status != OutsourceOrderStatusDraft {
			return fmt.Errorf("%w: only draft outsource orders can be released", ErrInvalidOutsourceOrder)
		}

		previousStatus := existing.Status
		existing.Status = OutsourceOrderStatusReleased
		existing.Operator = strings.TrimSpace(req.Operator)
		existing.Version++
		if err := tx.Omit("Lines", "Partner").Save(&existing).Error; err != nil {
			return err
		}
		if err := tx.Model(&models.OutsourceOrderLine{}).
			Where("outsource_order_id = ?", existing.ID).
			Where("status = ? OR status = ?", OutsourceOrderStatusDraft, "").
			Updates(map[string]interface{}{
				"status":  OutsourceOrderStatusReleased,
				"version": gorm.Expr("version + ?", 1),
			}).Error; err != nil {
			return err
		}
		if err := tx.Preload("Lines", func(db *gorm.DB) *gorm.DB {
			return db.Order("line_no asc")
		}).First(&saved, "id = ?", existing.ID).Error; err != nil {
			return err
		}
		return recordAuditEventTx(tx, audit.NewAuditEvent(
			audit.AuditEntityOutsourceOrder,
			saved.ID,
			audit.AuditActionStatus,
			outsourceOrderAuditActor(req.ActorID, req.Operator, req.IP),
		).WithMetadata("orderNo", saved.OrderNo).
			WithMetadata("from", previousStatus).
			WithMetadata("to", saved.Status).
			Normalize())
	})
	return mapOutsourceOrderToDTO(saved), err
}

func normalizeOutsourceOrderListQuery(query OutsourceOrderListQuery) OutsourceOrderListQuery {
	return OutsourceOrderListQuery{
		Search:     strings.TrimSpace(query.Search),
		Status:     normalizeOutsourceOrderFilterStatus(query.Status),
		SourceType: normalizeOutsourceOrderFilterSourceType(query.SourceType),
		PartnerID:  strings.TrimSpace(query.PartnerID),
	}
}

func normalizeOutsourceOrderDTO(order OutsourceOrderDTO) OutsourceOrderDTO {
	order.ID = strings.TrimSpace(order.ID)
	order.OrderNo = strings.ToUpper(strings.TrimSpace(order.OrderNo))
	order.SourceType = normalizeOutsourceOrderSourceType(order.SourceType)
	order.SourceID = strings.TrimSpace(order.SourceID)
	order.SourceNo = strings.TrimSpace(order.SourceNo)
	order.CustomerID = strings.TrimSpace(order.CustomerID)
	order.CustomerName = strings.TrimSpace(order.CustomerName)
	order.PartnerID = strings.TrimSpace(order.PartnerID)
	order.PartnerNameSnapshot = strings.TrimSpace(order.PartnerNameSnapshot)
	order.Status = normalizeOutsourceOrderStatus(order.Status)
	order.PlannedSendDate = strings.TrimSpace(order.PlannedSendDate)
	order.PlannedReturnDate = strings.TrimSpace(order.PlannedReturnDate)
	order.UOM = normalizeOutsourceOrderUOM(order.UOM)
	order.Notes = strings.TrimSpace(order.Notes)
	order.Operator = strings.TrimSpace(order.Operator)

	lines := make([]OutsourceOrderLineDTO, 0, len(order.Lines))
	for index, line := range order.Lines {
		lines = append(lines, normalizeOutsourceOrderLineDTO(line, index, order.Status))
	}
	order.Lines = lines
	return order
}

func normalizeOutsourceOrderLineDTO(line OutsourceOrderLineDTO, index int, orderStatus string) OutsourceOrderLineDTO {
	line.ID = strings.TrimSpace(line.ID)
	line.OutsourceOrderID = strings.TrimSpace(line.OutsourceOrderID)
	if line.LineNo <= 0 {
		line.LineNo = index + 1
	}
	line.SourceLineID = strings.TrimSpace(line.SourceLineID)
	line.ProductID = strings.TrimSpace(line.ProductID)
	line.ProductCode = strings.TrimSpace(line.ProductCode)
	line.ProductName = strings.TrimSpace(line.ProductName)
	line.Specification = strings.TrimSpace(line.Specification)
	line.UOM = normalizeOutsourceOrderUOM(line.UOM)
	line.SegmentID = strings.TrimSpace(line.SegmentID)
	line.SegmentName = strings.TrimSpace(line.SegmentName)
	line.ProcessStepID = strings.TrimSpace(line.ProcessStepID)
	line.ProcessCode = strings.TrimSpace(line.ProcessCode)
	line.ProcessName = strings.TrimSpace(line.ProcessName)
	rawStatus := strings.TrimSpace(line.Status)
	line.Status = normalizeOutsourceOrderStatus(rawStatus)
	if rawStatus == "" {
		line.Status = orderStatus
	}
	line.Notes = strings.TrimSpace(line.Notes)
	return line
}

func normalizeOutsourceOrderSourceType(sourceType string) string {
	normalized := strings.ToUpper(strings.TrimSpace(sourceType))
	switch normalized {
	case "":
		return ""
	case "SALES", "SALES_ORDER", "SALE_ORDER":
		return OutsourceOrderSourceSalesOrder
	case "PRODUCTION", "PRODUCTION_PLAN", "PLAN":
		return OutsourceOrderSourceProductionPlan
	default:
		return normalized
	}
}

func normalizeOutsourceOrderFilterSourceType(sourceType string) string {
	normalized := strings.ToUpper(strings.TrimSpace(sourceType))
	if normalized == "" || normalized == "ALL" {
		return ""
	}
	return normalizeOutsourceOrderSourceType(normalized)
}

func normalizeOutsourceOrderStatus(status string) string {
	normalized := strings.ToUpper(strings.TrimSpace(status))
	switch normalized {
	case "":
		return OutsourceOrderStatusDraft
	case "DRAFT":
		return OutsourceOrderStatusDraft
	case "RELEASED":
		return OutsourceOrderStatusReleased
	case "SENT":
		return OutsourceOrderStatusSent
	case "IN_PROCESS", "INPROCESS", "PROCESSING":
		return OutsourceOrderStatusInProcess
	case "RETURNED":
		return OutsourceOrderStatusReturned
	case "CLOSED", "DONE", "COMPLETED":
		return OutsourceOrderStatusClosed
	case "CANCELED", "CANCELLED":
		return OutsourceOrderStatusCanceled
	default:
		return normalized
	}
}

func normalizeOutsourceOrderFilterStatus(status string) string {
	normalized := strings.ToUpper(strings.TrimSpace(status))
	if normalized == "" || normalized == "ALL" {
		return ""
	}
	return normalizeOutsourceOrderStatus(normalized)
}

func normalizeOutsourceOrderUOM(uom string) string {
	normalized := strings.ToUpper(strings.TrimSpace(uom))
	if normalized == "" {
		return "PCS"
	}
	return normalized
}

func validateOutsourceOrderDTO(order OutsourceOrderDTO) error {
	if !isOutsourceOrderSourceType(order.SourceType) {
		return fmt.Errorf("%w: unsupported source type %s", ErrInvalidOutsourceOrder, order.SourceType)
	}
	if order.SourceID == "" {
		return fmt.Errorf("%w: sourceId is required for %s", ErrInvalidOutsourceOrder, order.SourceType)
	}
	if order.PartnerID == "" {
		return fmt.Errorf("%w: partnerId is required", ErrInvalidOutsourceOrder)
	}
	if !isOutsourceOrderStatus(order.Status) {
		return fmt.Errorf("%w: unsupported status %s", ErrInvalidOutsourceOrder, order.Status)
	}
	if len(order.Lines) == 0 {
		return fmt.Errorf("%w: at least one line is required", ErrInvalidOutsourceOrder)
	}
	if order.SourceType == OutsourceOrderSourceProductionPlan && len(order.Lines) != 1 {
		return fmt.Errorf("%w: production plan source requires exactly one line", ErrInvalidOutsourceOrder)
	}
	for index, line := range order.Lines {
		if order.SourceType == OutsourceOrderSourceSalesOrder && line.SourceLineID == "" {
			return fmt.Errorf("%w: lines[%d].sourceLineId is required for sales order source", ErrInvalidOutsourceOrder, index)
		}
		if line.Quantity <= 0 {
			return fmt.Errorf("%w: lines[%d].quantity must be greater than 0", ErrInvalidOutsourceOrder, index)
		}
		if line.UOM == "" {
			return fmt.Errorf("%w: lines[%d].uom is required", ErrInvalidOutsourceOrder, index)
		}
		if !isOutsourceOrderStatus(line.Status) {
			return fmt.Errorf("%w: lines[%d] unsupported status %s", ErrInvalidOutsourceOrder, index, line.Status)
		}
	}
	return nil
}

func validateDraftOnlyOutsourceOrderDTO(order OutsourceOrderDTO) error {
	if order.Status != OutsourceOrderStatusDraft {
		return fmt.Errorf("%w: outsource order must start as draft", ErrInvalidOutsourceOrder)
	}
	for index, line := range order.Lines {
		if line.Status != OutsourceOrderStatusDraft {
			return fmt.Errorf("%w: lines[%d] must start as draft", ErrInvalidOutsourceOrder, index)
		}
	}
	return nil
}

func isOutsourceOrderSourceType(value string) bool {
	switch value {
	case OutsourceOrderSourceSalesOrder, OutsourceOrderSourceProductionPlan:
		return true
	default:
		return false
	}
}

func isOutsourceOrderStatus(value string) bool {
	switch value {
	case OutsourceOrderStatusDraft,
		OutsourceOrderStatusReleased,
		OutsourceOrderStatusSent,
		OutsourceOrderStatusInProcess,
		OutsourceOrderStatusReturned,
		OutsourceOrderStatusClosed,
		OutsourceOrderStatusCanceled:
		return true
	default:
		return false
	}
}

func parseOutsourceOrderDates(order OutsourceOrderDTO) (*time.Time, *time.Time, error) {
	plannedSendDate, err := parseOutsourceOrderDateField(order.PlannedSendDate, "plannedSendDate")
	if err != nil {
		return nil, nil, err
	}
	plannedReturnDate, err := parseOutsourceOrderDateField(order.PlannedReturnDate, "plannedReturnDate")
	if err != nil {
		return nil, nil, err
	}
	if plannedSendDate != nil && plannedReturnDate != nil && plannedSendDate.After(*plannedReturnDate) {
		return nil, nil, fmt.Errorf("%w: plannedSendDate must not be after plannedReturnDate", ErrInvalidOutsourceOrder)
	}
	return plannedSendDate, plannedReturnDate, nil
}

func parseOutsourceOrderDateField(value string, field string) (*time.Time, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return nil, nil
	}
	for _, layout := range []string{"2006-01-02", time.RFC3339} {
		parsed, err := time.Parse(layout, trimmed)
		if err == nil {
			return &parsed, nil
		}
	}
	return nil, fmt.Errorf("%w: %s must be YYYY-MM-DD", ErrInvalidOutsourceOrder, field)
}

func ensureOutsourceOrderNoAvailable(tx *gorm.DB, orderNo string, excludingID string) error {
	var count int64
	query := tx.Model(&models.OutsourceOrder{}).Where("order_no = ?", strings.TrimSpace(orderNo))
	if strings.TrimSpace(excludingID) != "" {
		query = query.Where("id <> ?", strings.TrimSpace(excludingID))
	}
	if err := query.Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return ErrOutsourceOrderDuplicateNo
	}
	return nil
}

func fillOutsourceOrderSnapshots(tx *gorm.DB, order *models.OutsourceOrder) error {
	if err := fillOutsourceOrderPartnerSnapshot(tx, order); err != nil {
		return err
	}
	if err := fillOutsourceOrderSourceSnapshot(tx, order); err != nil {
		return err
	}
	return fillOutsourceOrderProcessSnapshots(tx, order)
}

func fillOutsourceOrderSourceSnapshot(tx *gorm.DB, order *models.OutsourceOrder) error {
	switch order.SourceType {
	case OutsourceOrderSourceSalesOrder:
		return fillOutsourceOrderSalesOrderSnapshot(tx, order)
	case OutsourceOrderSourceProductionPlan:
		return fillOutsourceOrderProductionPlanSnapshot(tx, order)
	default:
		return fmt.Errorf("%w: unsupported source type %s", ErrInvalidOutsourceOrder, order.SourceType)
	}
}

func fillOutsourceOrderProcessSnapshots(tx *gorm.DB, order *models.OutsourceOrder) error {
	for index := range order.Lines {
		line := &order.Lines[index]
		if strings.TrimSpace(line.ProcessStepID) == "" {
			line.ProcessStepID = ""
			line.ProcessCode = ""
			line.ProcessName = ""
			line.SegmentID = ""
			line.SegmentName = ""
			continue
		}
		var process models.ProcessStep
		if err := tx.First(&process, "id = ?", line.ProcessStepID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("%w: lines[%d].processStepId does not exist", ErrInvalidOutsourceOrder, index)
			}
			return err
		}
		if !process.IsActive {
			return fmt.Errorf("%w: lines[%d].processStepId is inactive", ErrInvalidOutsourceOrder, index)
		}
		line.ProcessCode = process.Code
		line.ProcessName = process.Name

		if strings.TrimSpace(line.SegmentID) == "" {
			continue
		}
		var segment models.LineSegment
		if err := tx.First(&segment, "id = ?", line.SegmentID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("%w: lines[%d].segmentId does not exist", ErrInvalidOutsourceOrder, index)
			}
			return err
		}
		var mappingCount int64
		if err := tx.Table("line_segment_process_mappings").
			Where("line_segment_id = ? AND process_step_id = ?", line.SegmentID, line.ProcessStepID).
			Count(&mappingCount).Error; err != nil {
			return err
		}
		if mappingCount == 0 {
			return fmt.Errorf("%w: lines[%d] process is not mapped to the selected segment", ErrInvalidOutsourceOrder, index)
		}
		line.SegmentName = segment.Name
	}
	return nil
}

func fillOutsourceOrderPartnerSnapshot(tx *gorm.DB, order *models.OutsourceOrder) error {
	var partner models.OutsourcePartner
	if err := tx.First(&partner, "id = ?", order.PartnerID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("%w: partnerId does not exist", ErrInvalidOutsourceOrder)
		}
		return err
	}
	if partner.Status == OutsourcePartnerStatusInactive {
		return fmt.Errorf("%w: inactive partner cannot receive outsource order", ErrInvalidOutsourceOrder)
	}
	order.PartnerNameSnapshot = partner.Name
	return nil
}

func fillOutsourceOrderSalesOrderSnapshot(tx *gorm.DB, order *models.OutsourceOrder) error {
	var salesOrder models.SalesOrder
	if err := tx.Preload("Lines").First(&salesOrder, "id = ?", order.SourceID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("%w: sales order source does not exist", ErrInvalidOutsourceOrder)
		}
		return err
	}
	order.SourceNo = salesOrder.OrderNo
	order.CustomerID = salesOrder.CustomerID
	order.CustomerName = salesOrder.CustomerName
	return fillOutsourceOrderLinesFromSalesOrder(order, salesOrder.Lines)
}

func fillOutsourceOrderProductionPlanSnapshot(tx *gorm.DB, order *models.OutsourceOrder) error {
	var plan models.ProductionPlan
	if err := tx.First(&plan, "id = ?", order.SourceID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("%w: production plan source does not exist", ErrInvalidOutsourceOrder)
		}
		return err
	}
	order.SourceNo = plan.OrderNo
	if len(order.Lines) != 1 {
		return fmt.Errorf("%w: production plan source requires exactly one line", ErrInvalidOutsourceOrder)
	}

	line := &order.Lines[0]
	line.SourceLineID = ""
	line.ProductID = plan.ProductID
	line.ProductCode = ""
	line.ProductName = plan.ProductName
	line.Specification = ""
	line.UOM = "PCS"
	if line.Quantity <= 0 {
		line.Quantity = plan.Quantity
	}
	return nil
}

func fillOutsourceOrderLinesFromSalesOrder(order *models.OutsourceOrder, salesLines []models.SalesOrderLine) error {
	if len(order.Lines) == 1 && order.Lines[0].SourceLineID == "" && len(salesLines) == 1 {
		order.Lines[0].SourceLineID = strconv.FormatUint(uint64(salesLines[0].ID), 10)
	}
	lineByID := make(map[string]models.SalesOrderLine, len(salesLines))
	for _, line := range salesLines {
		lineByID[strconv.FormatUint(uint64(line.ID), 10)] = line
	}
	seenSourceLineIDs := make(map[string]struct{}, len(order.Lines))
	for index := range order.Lines {
		sourceLineID := strings.TrimSpace(order.Lines[index].SourceLineID)
		if sourceLineID == "" {
			return fmt.Errorf("%w: lines[%d].sourceLineId is required for sales order source", ErrInvalidOutsourceOrder, index)
		}
		if _, exists := seenSourceLineIDs[sourceLineID]; exists {
			return fmt.Errorf("%w: lines[%d].sourceLineId is duplicated", ErrInvalidOutsourceOrder, index)
		}
		seenSourceLineIDs[sourceLineID] = struct{}{}
		sourceLine, ok := lineByID[sourceLineID]
		if !ok {
			return fmt.Errorf("%w: sourceLineId %s does not belong to sales order", ErrInvalidOutsourceOrder, sourceLineID)
		}
		fillOutsourceOrderLineFromSalesLine(&order.Lines[index], sourceLine)
	}
	return nil
}

func fillOutsourceOrderLineFromSalesLine(target *models.OutsourceOrderLine, source models.SalesOrderLine) {
	target.ProductID = strings.TrimSpace(source.ProductID)
	target.ProductCode = firstNonEmptyOutsourceOrder(
		source.ProductDisplayCodeSnapshot,
		source.ProductCode,
		source.ModelCodeSnapshot,
	)
	target.ProductName = firstNonEmptyOutsourceOrder(
		source.ProductDisplayFullLabelSnapshot,
		source.ProductDisplayTitleSnapshot,
		source.ProductModel,
		source.ProductCode,
	)
	target.Specification = strings.TrimSpace(source.Specification)
	if target.Quantity <= 0 {
		target.Quantity = source.Qty
	}
	target.UOM = normalizeOutsourceOrderUOM(source.UOM)
}

func prepareOutsourceOrderLines(order *models.OutsourceOrder) {
	for index := range order.Lines {
		line := &order.Lines[index]
		if line.ID == "" || strings.HasPrefix(line.ID, "temp-") {
			line.ID = uuid.NewString()
		}
		line.OutsourceOrderID = order.ID
		if line.LineNo <= 0 {
			line.LineNo = index + 1
		}
		if line.Status == "" {
			line.Status = order.Status
		}
		if line.Version <= 0 {
			line.Version = 1
		}
	}
}

func recalculateOutsourceOrderTotals(order *models.OutsourceOrder) {
	total := 0.0
	uom := ""
	for index := range order.Lines {
		line := &order.Lines[index]
		total += line.Quantity
		if uom == "" {
			uom = normalizeOutsourceOrderUOM(line.UOM)
		} else if !strings.EqualFold(uom, line.UOM) {
			uom = "MIXED"
		}
		line.UOM = normalizeOutsourceOrderUOM(line.UOM)
	}
	order.TotalQuantity = total
	if order.UOM == "" || order.UOM == "PCS" || order.UOM == "MIXED" {
		order.UOM = uom
	}
}

func generateOutsourceOrderNo() string {
	return "OSO-" + time.Now().Format("20060102") + "-" + strings.ToUpper(uuid.NewString()[:8])
}

func firstNonEmptyOutsourceOrder(values ...string) string {
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func outsourceOrderAuditActor(actorID string, username string, ip string) audit.AuditActor {
	return audit.AuditActor{
		UserID:   strings.TrimSpace(actorID),
		Username: strings.TrimSpace(username),
		IP:       strings.TrimSpace(ip),
		Source:   "http",
	}
}
