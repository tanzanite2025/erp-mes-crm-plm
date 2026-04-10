package services

import (
	"errors"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

var (
	ErrFinancialVoucherInvalidSourceType = errors.New("invalid voucher source type")
	ErrFinancialVoucherInvalidStatus     = errors.New("invalid voucher status")
	ErrFinancialVoucherIDRequired        = errors.New("voucher id is required")
	ErrFinancialVoucherNotFound          = errors.New("financial voucher not found")
)

var allowedVoucherSourceTypes = map[string]struct{}{
	models.FinancialVoucherSourceInbound:  {},
	models.FinancialVoucherSourceShipment: {},
}

var allowedVoucherStatuses = map[string]struct{}{
	models.FinancialVoucherStatusDraft:  {},
	models.FinancialVoucherStatusPosted: {},
	models.FinancialVoucherStatusVoid:   {},
}

func ListFinancialVouchers(request FinancialVoucherQueryRequest) ([]FinancialVoucherResponse, error) {
	sourceType := strings.ToUpper(strings.TrimSpace(request.SourceType))
	sourceRefID := strings.TrimSpace(request.SourceRefID)
	status := strings.ToUpper(strings.TrimSpace(request.Status))

	if sourceType != "" {
		if _, ok := allowedVoucherSourceTypes[sourceType]; !ok {
			return nil, ErrFinancialVoucherInvalidSourceType
		}
	}
	if status != "" {
		if _, ok := allowedVoucherStatuses[status]; !ok {
			return nil, ErrFinancialVoucherInvalidStatus
		}
	}

	query := db.DB.Model(&models.FinancialVoucher{})
	if request.IncludeEntries {
		query = query.Preload("Entries")
	}
	if sourceType != "" {
		query = query.Where("source_type = ?", sourceType)
	}
	if sourceRefID != "" {
		query = query.Where("source_ref_id = ?", sourceRefID)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	var vouchers []models.FinancialVoucher
	if err := query.Order("created_at desc").Find(&vouchers).Error; err != nil {
		return nil, err
	}

	response := MapFinancialVouchersToResponse(vouchers)
	if response == nil {
		response = make([]FinancialVoucherResponse, 0)
	}
	return response, nil
}

func GetFinancialVoucher(id string) (FinancialVoucherResponse, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return FinancialVoucherResponse{}, ErrFinancialVoucherIDRequired
	}

	var voucher models.FinancialVoucher
	err := db.DB.Preload("Entries").First(&voucher, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return FinancialVoucherResponse{}, ErrFinancialVoucherNotFound
	}
	if err != nil {
		return FinancialVoucherResponse{}, err
	}
	return MapFinancialVoucherToResponse(voucher), nil
}
