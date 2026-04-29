package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const ProductBarcodeBindingStatusBound = "BOUND"
const ProductBarcodeBindingSourceProductBindingTab = "PRODUCT_BINDING_TAB"
const ProductBarcodeBindingEventTypeBound = "BOUND"
const productBarcodeBindingDefaultListLimit = 10

var (
	ErrProductBarcodeBindingProductConflict = errors.New("product barcode binding product conflict")
)

type ProductBarcodeBindingValidationError struct {
	Message string
}

func (e *ProductBarcodeBindingValidationError) Error() string {
	return e.Message
}

type ProductBarcodeBindingConflictError struct {
	Message string
	Kind    error
}

func (e *ProductBarcodeBindingConflictError) Error() string {
	return e.Message
}

func (e *ProductBarcodeBindingConflictError) Unwrap() error {
	return e.Kind
}

type CreateProductBarcodeBindingRequest struct {
	ProductBarcode string `json:"productBarcode"`
	PrepregQrCode  string `json:"prepregQrCode"`
}

type ProductBarcodeBindingListQuery struct {
	Limit               int
	ProductBarcode      string
	PrepregBindingToken string
}

type ProductBarcodeBindingRollInstanceSummary struct {
	ID              string `json:"id"`
	BindingToken    string `json:"bindingToken"`
	SpecID          string `json:"specId"`
	SpecCode        string `json:"specCode"`
	SpecName        string `json:"specName"`
	SupplierBatchNo string `json:"supplierBatchNo"`
	WidthMM         string `json:"widthMm"`
	LengthM         string `json:"lengthM"`
	NominalAreaM2   string `json:"nominalAreaM2"`
	BoxNo           string `json:"boxNo"`
	ProductionDate  string `json:"productionDate"`
	Status          string `json:"status"`
	ActivatedAt     string `json:"activatedAt"`
}

type ProductBarcodeBindingResponse struct {
	ID                    string                                    `json:"id"`
	ProductBarcode        string                                    `json:"productBarcode"`
	PrepregRollInstanceID string                                    `json:"prepregRollInstanceId"`
	PrepregRollInstance   *ProductBarcodeBindingRollInstanceSummary `json:"prepregRollInstance,omitempty"`
	PrepregQrCode         string                                    `json:"prepregQrCode"`
	PrepregBindingToken   string                                    `json:"prepregBindingToken,omitempty"`
	BarcodeProtocol       string                                    `json:"barcodeProtocol"`
	BarcodeSummary        string                                    `json:"barcodeSummary"`
	BoundAt               string                                    `json:"boundAt"`
	BoundBy               string                                    `json:"boundBy"`
	Source                string                                    `json:"source"`
	Status                string                                    `json:"status"`
	Message               string                                    `json:"message,omitempty"`
}

type ProductBarcodeBindingListResponse struct {
	Items []ProductBarcodeBindingResponse `json:"items"`
	Total int64                           `json:"total"`
}

func normalizeProductBarcodeBindingRequest(input CreateProductBarcodeBindingRequest) CreateProductBarcodeBindingRequest {
	return CreateProductBarcodeBindingRequest{
		ProductBarcode: strings.ToUpper(strings.TrimSpace(input.ProductBarcode)),
		PrepregQrCode:  strings.TrimSpace(input.PrepregQrCode),
	}
}

func normalizeProductBarcodeBindingListQuery(input ProductBarcodeBindingListQuery) ProductBarcodeBindingListQuery {
	limit := input.Limit
	if limit <= 0 {
		limit = productBarcodeBindingDefaultListLimit
	}
	if limit > 100 {
		limit = 100
	}

	productBarcode := strings.ToUpper(strings.TrimSpace(input.ProductBarcode))
	prepregBindingToken := extractProductBindingPrepregToken(input.PrepregBindingToken)
	if prepregBindingToken == "" {
		prepregBindingToken = normalizePrepregBindingToken(input.PrepregBindingToken)
	}

	return ProductBarcodeBindingListQuery{
		Limit:               limit,
		ProductBarcode:      productBarcode,
		PrepregBindingToken: prepregBindingToken,
	}
}

func formatProductBarcodeBindingTime(value *time.Time) string {
	if value == nil || value.IsZero() {
		return ""
	}
	return value.UTC().Format(time.RFC3339)
}

func mapProductBarcodeBindingRollInstanceSummary(item *models.PrepregRollInstance) *ProductBarcodeBindingRollInstanceSummary {
	if item == nil || strings.TrimSpace(item.ID) == "" {
		return nil
	}
	return &ProductBarcodeBindingRollInstanceSummary{
		ID:              strings.TrimSpace(item.ID),
		BindingToken:    strings.TrimSpace(item.BindingToken),
		SpecID:          strings.TrimSpace(item.SpecID),
		SpecCode:        strings.TrimSpace(item.SpecCode),
		SpecName:        strings.TrimSpace(item.SpecName),
		SupplierBatchNo: strings.TrimSpace(item.SupplierBatchNo),
		WidthMM:         strings.TrimSpace(item.WidthMM),
		LengthM:         strings.TrimSpace(item.LengthM),
		NominalAreaM2:   strings.TrimSpace(item.NominalAreaM2),
		BoxNo:           strings.TrimSpace(item.BoxNo),
		ProductionDate:  strings.TrimSpace(item.ProductionDate),
		Status:          strings.TrimSpace(item.Status),
		ActivatedAt:     formatProductBarcodeBindingTime(item.ActivatedAt),
	}
}

func mapProductBarcodeBindingToResponse(item models.ProductBarcodeBinding, message string) ProductBarcodeBindingResponse {
	return ProductBarcodeBindingResponse{
		ID:                    strings.TrimSpace(item.ID),
		ProductBarcode:        strings.TrimSpace(item.ProductBarcode),
		PrepregRollInstanceID: strings.TrimSpace(item.PrepregRollInstanceID),
		PrepregRollInstance:   mapProductBarcodeBindingRollInstanceSummary(item.PrepregRollInstance),
		PrepregQrCode:         strings.TrimSpace(item.PrepregQrCode),
		PrepregBindingToken:   strings.TrimSpace(item.PrepregBindingToken),
		BarcodeProtocol:       strings.TrimSpace(item.BarcodeProtocol),
		BarcodeSummary:        strings.TrimSpace(item.BarcodeSummary),
		BoundAt:               formatProductBarcodeBindingTime(item.BoundAt),
		BoundBy:               strings.TrimSpace(item.BoundBy),
		Source:                strings.TrimSpace(item.Source),
		Status:                strings.TrimSpace(item.Status),
		Message:               strings.TrimSpace(message),
	}
}

func extractProductBindingPrepregToken(input string) string {
	raw := strings.TrimSpace(input)
	if raw == "" {
		return ""
	}
	if IsValidPrepregBindingToken(raw) {
		return strings.ToUpper(raw)
	}
	parsed, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	return normalizePrepregBindingToken(parsed.Query().Get("bindToken"))
}

func loadPrepregRollInstanceByTokenTx(tx *gorm.DB, token string) (models.PrepregRollInstance, error) {
	var binding models.PrepregBindingToken
	err := tx.Preload("BoundRollInstance").Where("token = ?", strings.TrimSpace(token)).First(&binding).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.PrepregRollInstance{}, &ProductBarcodeBindingValidationError{Message: "prepregQrCode is invalid"}
	}
	if err != nil {
		return models.PrepregRollInstance{}, fmt.Errorf("failed to query prepreg binding token: %w", err)
	}
	if isExpiredUnboundPrepregBindingToken(binding, time.Now()) {
		if err := invalidatePrepregBindingTokenTx(tx, &binding); err != nil {
			return models.PrepregRollInstance{}, err
		}
		return models.PrepregRollInstance{}, ErrPrepregBindingTokenExpired
	}
	if strings.TrimSpace(binding.BoundRollInstanceID) == "" || binding.BoundRollInstance == nil {
		return models.PrepregRollInstance{}, &ProductBarcodeBindingValidationError{Message: "该绑定二维码尚未在预浸料页面完成卷实例激活"}
	}
	return *binding.BoundRollInstance, nil
}

func findProductBarcodeBindingByProductBarcodeTx(tx *gorm.DB, productBarcode string) (models.ProductBarcodeBinding, bool, error) {
	var item models.ProductBarcodeBinding
	err := tx.Preload("PrepregRollInstance").
		Where("product_barcode = ? AND deleted_at IS NULL", productBarcode).
		Order("bound_at DESC, created_at DESC, id DESC").
		First(&item).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return models.ProductBarcodeBinding{}, false, nil
	}
	if err != nil {
		return models.ProductBarcodeBinding{}, false, fmt.Errorf("failed to query product barcode binding by product barcode: %w", err)
	}
	return item, true, nil
}

func buildProductBarcodeBindingConflictByProduct(existing models.ProductBarcodeBinding) *ProductBarcodeBindingConflictError {
	return &ProductBarcodeBindingConflictError{
		Message: "该产品码已绑定到其它预浸料卷，不允许重复绑定",
		Kind:    ErrProductBarcodeBindingProductConflict,
	}
}

func buildProductBarcodeBindingEventSnapshot(req CreateProductBarcodeBindingRequest, parsedBarcode *LinearBarcodeParseResult, prepregBindingToken string, roll models.PrepregRollInstance) string {
	payload, err := json.Marshal(map[string]any{
		"productBarcode":        req.ProductBarcode,
		"prepregQrCode":         req.PrepregQrCode,
		"prepregBindingToken":   prepregBindingToken,
		"prepregRollInstanceId": strings.TrimSpace(roll.ID),
		"specId":                strings.TrimSpace(roll.SpecID),
		"specCode":              strings.TrimSpace(roll.SpecCode),
		"specName":              strings.TrimSpace(roll.SpecName),
		"supplierBatchNo":       strings.TrimSpace(roll.SupplierBatchNo),
		"boxNo":                 strings.TrimSpace(roll.BoxNo),
		"barcodeProtocol":       parsedBarcode.Protocol,
		"barcodeSummary":        parsedBarcode.Summary,
	})
	if err != nil {
		return "{}"
	}
	return string(payload)
}

func ListProductBarcodeBindings(input ProductBarcodeBindingListQuery) (ProductBarcodeBindingListResponse, error) {
	if db.DB == nil {
		return ProductBarcodeBindingListResponse{}, errors.New("database not initialized")
	}

	query := normalizeProductBarcodeBindingListQuery(input)
	base := db.DB.Model(&models.ProductBarcodeBinding{}).Where("deleted_at IS NULL")
	if query.ProductBarcode != "" {
		base = base.Where("product_barcode = ?", query.ProductBarcode)
	}
	if query.PrepregBindingToken != "" {
		base = base.Where("prepreg_binding_token = ?", query.PrepregBindingToken)
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		return ProductBarcodeBindingListResponse{}, fmt.Errorf("failed to count product barcode bindings: %w", err)
	}

	var items []models.ProductBarcodeBinding
	if err := base.Preload("PrepregRollInstance").
		Order("bound_at DESC, created_at DESC, id DESC").
		Limit(query.Limit).
		Find(&items).Error; err != nil {
		return ProductBarcodeBindingListResponse{}, fmt.Errorf("failed to list product barcode bindings: %w", err)
	}

	responseItems := make([]ProductBarcodeBindingResponse, 0, len(items))
	for _, item := range items {
		responseItems = append(responseItems, mapProductBarcodeBindingToResponse(item, ""))
	}

	return ProductBarcodeBindingListResponse{Items: responseItems, Total: total}, nil
}

func CreateProductBarcodeBinding(input CreateProductBarcodeBindingRequest, operator string) (ProductBarcodeBindingResponse, error) {
	if db.DB == nil {
		return ProductBarcodeBindingResponse{}, errors.New("database not initialized")
	}

	req := normalizeProductBarcodeBindingRequest(input)
	if req.ProductBarcode == "" {
		return ProductBarcodeBindingResponse{}, &ProductBarcodeBindingValidationError{Message: "productBarcode is required"}
	}
	if req.PrepregQrCode == "" {
		return ProductBarcodeBindingResponse{}, &ProductBarcodeBindingValidationError{Message: "prepregQrCode is required"}
	}

	parsedBarcode, err := ParseLinearBarcode(req.ProductBarcode)
	if err != nil {
		return ProductBarcodeBindingResponse{}, &ProductBarcodeBindingValidationError{Message: err.Error()}
	}

	prepregBindingToken := extractProductBindingPrepregToken(req.PrepregQrCode)
	if prepregBindingToken == "" {
		return ProductBarcodeBindingResponse{}, &ProductBarcodeBindingValidationError{Message: "prepregQrCode is invalid"}
	}

	resolvedOperator := strings.TrimSpace(operator)
	if resolvedOperator == "" {
		resolvedOperator = "system"
	}

	var response ProductBarcodeBindingResponse
	err = db.DB.Transaction(func(tx *gorm.DB) error {
		roll, err := loadPrepregRollInstanceByTokenTx(tx, prepregBindingToken)
		if err != nil {
			return err
		}

		if item, exists, err := findProductBarcodeBindingByProductBarcodeTx(tx, parsedBarcode.RawCode); err != nil {
			return err
		} else if exists {
			if strings.TrimSpace(item.PrepregRollInstanceID) == strings.TrimSpace(roll.ID) {
				response = mapProductBarcodeBindingToResponse(item, "重复提交已按既有绑定记录回显")
				return nil
			}
			return buildProductBarcodeBindingConflictByProduct(item)
		}

		now := time.Now().UTC()
		record := models.ProductBarcodeBinding{
			BaseModel:             models.BaseModel{ID: uuid.NewString()},
			ProductBarcode:        parsedBarcode.RawCode,
			PrepregRollInstanceID: strings.TrimSpace(roll.ID),
			PrepregBindingToken:   prepregBindingToken,
			PrepregQrCode:         req.PrepregQrCode,
			BarcodeProtocol:       parsedBarcode.Protocol,
			BarcodeSummary:        parsedBarcode.Summary,
			BoundAt:               &now,
			BoundBy:               resolvedOperator,
			Source:                ProductBarcodeBindingSourceProductBindingTab,
			Status:                ProductBarcodeBindingStatusBound,
		}
		if err := tx.Create(&record).Error; err != nil {
			if item, exists, queryErr := findProductBarcodeBindingByProductBarcodeTx(tx, parsedBarcode.RawCode); queryErr == nil && exists {
				if strings.TrimSpace(item.PrepregRollInstanceID) == strings.TrimSpace(roll.ID) {
					response = mapProductBarcodeBindingToResponse(item, "重复提交已按既有绑定记录回显")
					return nil
				}
				return buildProductBarcodeBindingConflictByProduct(item)
			}
			return fmt.Errorf("failed to create product barcode binding: %w", err)
		}

		record.PrepregRollInstance = &roll
		event := models.ProductBarcodeBindingEvent{
			BaseModel:             models.BaseModel{ID: uuid.NewString()},
			BindingID:             record.ID,
			PrepregRollInstanceID: strings.TrimSpace(roll.ID),
			EventType:             ProductBarcodeBindingEventTypeBound,
			ProductBarcode:        record.ProductBarcode,
			PrepregBindingToken:   record.PrepregBindingToken,
			PayloadSnapshot:       buildProductBarcodeBindingEventSnapshot(req, parsedBarcode, prepregBindingToken, roll),
			Operator:              resolvedOperator,
			OccurredAt:            &now,
		}
		if err := tx.Create(&event).Error; err != nil {
			return fmt.Errorf("failed to create product barcode binding event: %w", err)
		}

		response = mapProductBarcodeBindingToResponse(record, "绑定记录已创建")
		return nil
	})
	if err != nil {
		return ProductBarcodeBindingResponse{}, err
	}
	return response, nil
}

func ParseProductBarcodeBindingListLimit(raw string) int {
	limit, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return productBarcodeBindingDefaultListLimit
	}
	return limit
}
