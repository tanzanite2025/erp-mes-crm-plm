package services

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

const (
	ProductionExecutionLotStatusActive   = "ACTIVE"
	ProductionExecutionLotStatusClosed   = "CLOSED"
	ProductionExecutionLotStatusCanceled = "CANCELED"
)

const productionExecutionLotDefaultLimit = 50

var ErrInvalidProductionExecutionLot = errors.New("invalid production execution lot")

type ProductionExecutionLotListQuery struct {
	ProductBarcode string
	BatchNo        string
	PlanID         string
	TaskID         string
	Limit          int
}

type SaveProductionExecutionLotRequest struct {
	ID             string  `json:"id"`
	ProductBarcode string  `json:"productBarcode"`
	ProductID      string  `json:"productId"`
	ProductName    string  `json:"productName"`
	PlanID         string  `json:"planId"`
	TaskID         string  `json:"taskId"`
	BatchNo        string  `json:"batchNo"`
	Quantity       float64 `json:"quantity"`
	Status         string  `json:"status"`
	Notes          string  `json:"notes"`
	Operator       string  `json:"-"`
}

type ProductionExecutionLotResponse struct {
	ID             string  `json:"id"`
	ProductBarcode string  `json:"productBarcode"`
	ProductID      string  `json:"productId"`
	ProductName    string  `json:"productName"`
	PlanID         string  `json:"planId"`
	TaskID         string  `json:"taskId"`
	BatchNo        string  `json:"batchNo"`
	Quantity       float64 `json:"quantity"`
	Status         string  `json:"status"`
	Notes          string  `json:"notes"`
	Operator       string  `json:"operator"`
	CreatedAt      string  `json:"createdAt"`
	UpdatedAt      string  `json:"updatedAt"`
}

type ProductionExecutionLotListResponse struct {
	Items []ProductionExecutionLotResponse `json:"items"`
	Total int64                            `json:"total"`
}

type ProductionExecutionLotService struct {
	txManager transactionManager
}

func NewProductionExecutionLotService(txManager transactionManager) *ProductionExecutionLotService {
	return &ProductionExecutionLotService{txManager: txManager}
}

var defaultProductionExecutionLotService = NewProductionExecutionLotService(defaultServiceRuntime().txManager)

func ListProductionExecutionLots(query ProductionExecutionLotListQuery) (ProductionExecutionLotListResponse, error) {
	return defaultProductionExecutionLotService.ListProductionExecutionLots(query)
}

func SaveProductionExecutionLot(req SaveProductionExecutionLotRequest) (ProductionExecutionLotResponse, error) {
	return defaultProductionExecutionLotService.SaveProductionExecutionLot(req)
}

func (s *ProductionExecutionLotService) ListProductionExecutionLots(query ProductionExecutionLotListQuery) (ProductionExecutionLotListResponse, error) {
	normalized := normalizeProductionExecutionLotListQuery(query)
	base := s.txManager.DB().Model(&models.ProductionExecutionLot{}).Where("deleted_at IS NULL")
	if normalized.ProductBarcode != "" {
		base = base.Where("product_barcode = ?", normalized.ProductBarcode)
	}
	if normalized.BatchNo != "" {
		base = base.Where("batch_no = ?", normalized.BatchNo)
	}
	if normalized.PlanID != "" {
		base = base.Where("plan_id = ?", normalized.PlanID)
	}
	if normalized.TaskID != "" {
		base = base.Where("task_id = ?", normalized.TaskID)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return ProductionExecutionLotListResponse{}, fmt.Errorf("failed to count production execution lots: %w", err)
	}

	var lots []models.ProductionExecutionLot
	if err := base.
		Order("updated_at DESC, created_at DESC, id DESC").
		Limit(normalized.Limit).
		Find(&lots).Error; err != nil {
		return ProductionExecutionLotListResponse{}, fmt.Errorf("failed to list production execution lots: %w", err)
	}

	return ProductionExecutionLotListResponse{
		Items: mapProductionExecutionLotsToResponse(lots),
		Total: total,
	}, nil
}

func (s *ProductionExecutionLotService) SaveProductionExecutionLot(req SaveProductionExecutionLotRequest) (ProductionExecutionLotResponse, error) {
	normalized := normalizeSaveProductionExecutionLotRequest(req)
	if err := validateSaveProductionExecutionLotRequest(s.txManager.DB(), normalized); err != nil {
		return ProductionExecutionLotResponse{}, err
	}

	var saved models.ProductionExecutionLot
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		lot, exists, err := findProductionExecutionLotForSaveTx(tx, normalized)
		if err != nil {
			return err
		}
		if exists {
			if strings.TrimSpace(lot.PlanID) == "" {
				return fmt.Errorf("%w: an execution lot without a production plan cannot be reused", ErrInvalidProductionExecutionLot)
			}
			if strings.TrimSpace(lot.PlanID) != normalized.PlanID {
				return fmt.Errorf("%w: an execution lot cannot change its production plan", ErrInvalidProductionExecutionLot)
			}
		}
		var plan models.ProductionPlan
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&plan, "id = ?", normalized.PlanID).Error; err != nil {
			return fmt.Errorf("%w: planId does not exist", ErrInvalidProductionExecutionLot)
		}
		if err := ValidateProductionPlanBOMBranchTx(tx, &plan, nil); err != nil {
			return fmt.Errorf("%w: %v", ErrInvalidProductionExecutionLot, err)
		}
		if normalized.ProductID != "" && normalized.ProductID != strings.TrimSpace(plan.ProductID) {
			return fmt.Errorf("%w: productId does not match planId", ErrInvalidProductionExecutionLot)
		}
		if strings.EqualFold(strings.TrimSpace(plan.Status), "CANCELED") || strings.EqualFold(strings.TrimSpace(plan.Status), "COMPLETED") {
			return fmt.Errorf("%w: canceled or completed plans cannot receive an execution lot", ErrInvalidProductionExecutionLot)
		}
		normalized.ProductID = strings.TrimSpace(plan.ProductID)
		if strings.TrimSpace(plan.ProductName) != "" {
			normalized.ProductName = strings.TrimSpace(plan.ProductName)
		}

		if !exists {
			lot.BaseModel = models.BaseModel{ID: uuid.NewString()}
		}
		applyProductionExecutionLotRequest(&lot, normalized)
		if err := saveProductionRecordWithOptionalUUIDs(tx, &lot,
			productionOptionalUUIDWrite{Column: "task_id", Value: lot.TaskID},
		); err != nil {
			return fmt.Errorf("failed to save production execution lot: %w", err)
		}
		saved = lot
		return nil
	})
	if err != nil {
		return ProductionExecutionLotResponse{}, err
	}
	return mapProductionExecutionLotToResponse(saved), nil
}

func normalizeProductionExecutionLotListQuery(query ProductionExecutionLotListQuery) ProductionExecutionLotListQuery {
	limit := query.Limit
	if limit <= 0 {
		limit = productionExecutionLotDefaultLimit
	}
	if limit > 200 {
		limit = 200
	}

	return ProductionExecutionLotListQuery{
		ProductBarcode: normalizeProductBarcodeValue(query.ProductBarcode),
		BatchNo:        strings.TrimSpace(query.BatchNo),
		PlanID:         strings.TrimSpace(query.PlanID),
		TaskID:         strings.TrimSpace(query.TaskID),
		Limit:          limit,
	}
}

func normalizeSaveProductionExecutionLotRequest(req SaveProductionExecutionLotRequest) SaveProductionExecutionLotRequest {
	status := strings.ToUpper(strings.TrimSpace(req.Status))
	if status == "" {
		status = ProductionExecutionLotStatusActive
	}
	quantity := req.Quantity
	if quantity == 0 {
		quantity = 1
	}

	return SaveProductionExecutionLotRequest{
		ID:             strings.TrimSpace(req.ID),
		ProductBarcode: normalizeProductBarcodeValue(req.ProductBarcode),
		ProductID:      strings.TrimSpace(req.ProductID),
		ProductName:    strings.TrimSpace(req.ProductName),
		PlanID:         strings.TrimSpace(req.PlanID),
		TaskID:         strings.TrimSpace(req.TaskID),
		BatchNo:        strings.TrimSpace(req.BatchNo),
		Quantity:       quantity,
		Status:         status,
		Notes:          strings.TrimSpace(req.Notes),
		Operator:       strings.TrimSpace(req.Operator),
	}
}

func validateSaveProductionExecutionLotRequest(tx *gorm.DB, req SaveProductionExecutionLotRequest) error {
	if req.ProductBarcode == "" {
		return fmt.Errorf("%w: productBarcode is required", ErrInvalidProductionExecutionLot)
	}
	if len(req.ProductBarcode) > 120 {
		return fmt.Errorf("%w: productBarcode cannot exceed 120 characters", ErrInvalidProductionExecutionLot)
	}
	if req.Quantity <= 0 {
		return fmt.Errorf("%w: quantity must be greater than zero", ErrInvalidProductionExecutionLot)
	}
	if req.Quantity != 1 {
		return fmt.Errorf("%w: quantity must equal 1 for a product barcode", ErrInvalidProductionExecutionLot)
	}
	if !isSupportedProductionExecutionLotStatus(req.Status) {
		return fmt.Errorf("%w: unsupported status %s", ErrInvalidProductionExecutionLot, req.Status)
	}
	if req.PlanID == "" {
		return fmt.Errorf("%w: planId is required", ErrInvalidProductionExecutionLot)
	}
	var plan models.ProductionPlan
	if err := tx.First(&plan, "id = ?", req.PlanID).Error; err != nil {
		return fmt.Errorf("%w: planId does not exist", ErrInvalidProductionExecutionLot)
	}
	if err := ValidateProductionPlanBOMBranchTx(tx, &plan, nil); err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidProductionExecutionLot, err)
	}
	if strings.EqualFold(strings.TrimSpace(plan.Status), "CANCELED") || strings.EqualFold(strings.TrimSpace(plan.Status), "COMPLETED") {
		return fmt.Errorf("%w: canceled or completed plans cannot receive an execution lot", ErrInvalidProductionExecutionLot)
	}
	if req.ProductID != "" && strings.TrimSpace(req.ProductID) != strings.TrimSpace(plan.ProductID) {
		return fmt.Errorf("%w: productId does not match planId", ErrInvalidProductionExecutionLot)
	}
	if req.TaskID != "" {
		var task models.ProductionTask
		if err := tx.First(&task, "id = ?", req.TaskID).Error; err != nil || strings.TrimSpace(task.PlanID) != req.PlanID {
			return fmt.Errorf("%w: taskId does not belong to planId", ErrInvalidProductionExecutionLot)
		}
	}
	return nil
}

func isSupportedProductionExecutionLotStatus(status string) bool {
	switch status {
	case ProductionExecutionLotStatusActive,
		ProductionExecutionLotStatusClosed,
		ProductionExecutionLotStatusCanceled:
		return true
	default:
		return false
	}
}

func findProductionExecutionLotForSaveTx(tx *gorm.DB, req SaveProductionExecutionLotRequest) (models.ProductionExecutionLot, bool, error) {
	var lot models.ProductionExecutionLot
	query := tx.Model(&models.ProductionExecutionLot{})
	if req.ID != "" {
		query = query.Where("id = ?", req.ID)
	} else {
		query = query.Where("product_barcode = ?", req.ProductBarcode)
	}

	err := query.First(&lot).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.ProductionExecutionLot{}, false, nil
	}
	if err != nil {
		return models.ProductionExecutionLot{}, false, fmt.Errorf("failed to query production execution lot: %w", err)
	}
	return lot, true, nil
}

func applyProductionExecutionLotRequest(lot *models.ProductionExecutionLot, req SaveProductionExecutionLotRequest) {
	lot.ProductBarcode = req.ProductBarcode
	lot.ProductID = req.ProductID
	lot.ProductName = req.ProductName
	lot.PlanID = req.PlanID
	lot.TaskID = req.TaskID
	lot.BatchNo = req.BatchNo
	lot.Quantity = req.Quantity
	lot.Status = req.Status
	lot.Notes = req.Notes
	lot.Operator = resolveProductionExecutionLotOperator(req.Operator)
}

func resolveProductionExecutionLotOperator(operator string) string {
	if strings.TrimSpace(operator) == "" {
		return "system"
	}
	return strings.TrimSpace(operator)
}

func mapProductionExecutionLotsToResponse(lots []models.ProductionExecutionLot) []ProductionExecutionLotResponse {
	result := make([]ProductionExecutionLotResponse, 0, len(lots))
	for _, lot := range lots {
		result = append(result, mapProductionExecutionLotToResponse(lot))
	}
	return result
}

func mapProductionExecutionLotToResponse(lot models.ProductionExecutionLot) ProductionExecutionLotResponse {
	return ProductionExecutionLotResponse{
		ID:             strings.TrimSpace(lot.ID),
		ProductBarcode: strings.TrimSpace(lot.ProductBarcode),
		ProductID:      strings.TrimSpace(lot.ProductID),
		ProductName:    strings.TrimSpace(lot.ProductName),
		PlanID:         strings.TrimSpace(lot.PlanID),
		TaskID:         strings.TrimSpace(lot.TaskID),
		BatchNo:        strings.TrimSpace(lot.BatchNo),
		Quantity:       lot.Quantity,
		Status:         strings.TrimSpace(lot.Status),
		Notes:          strings.TrimSpace(lot.Notes),
		Operator:       strings.TrimSpace(lot.Operator),
		CreatedAt:      formatProductionExecutionLotTime(lot.CreatedAt),
		UpdatedAt:      formatProductionExecutionLotTime(lot.UpdatedAt),
	}
}

func formatProductionExecutionLotTime(value time.Time) string {
	if value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}
