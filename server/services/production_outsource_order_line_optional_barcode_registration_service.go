package services

import (
	"fmt"
	"strings"
	"unicode"
	"unicode/utf8"
	"xdfc-server/audit"
	"xdfc-server/models"

	"gorm.io/gorm"
)

type SaveProductionOutsourceOrderLineOptionalBarcodeRegistrationRequest struct {
	LineID          string   `json:"-"`
	Version         int64    `json:"version"`
	ProductBarcodes []string `json:"productBarcodes"`
	ActorID         string   `json:"-"`
	Operator        string   `json:"-"`
	IP              string   `json:"-"`
}

func SaveProductionOutsourceOrderLineOptionalBarcodeRegistration(req SaveProductionOutsourceOrderLineOptionalBarcodeRegistrationRequest) (OutsourceOrderLineDTO, error) {
	return defaultProductionOutsourcingService.SaveProductionOutsourceOrderLineOptionalBarcodeRegistration(req)
}

// Registration may be empty or incomplete. It never requires an initialized
// process state, creates a transfer, or gates any existing execution command.
func (s *ProductionOutsourcingService) SaveProductionOutsourceOrderLineOptionalBarcodeRegistration(req SaveProductionOutsourceOrderLineOptionalBarcodeRegistrationRequest) (OutsourceOrderLineDTO, error) {
	if req.Version < 1 || len(req.ProductBarcodes) > 1000 {
		return OutsourceOrderLineDTO{}, fmt.Errorf("%w: 条码登记版本无效或超过1000条", ErrInvalidOutsourceOrder)
	}
	barcodes := make([]string, 0, len(req.ProductBarcodes))
	seen := make(map[string]bool)
	for _, input := range req.ProductBarcodes {
		barcode := normalizeProductBarcodeValue(input)
		if barcode == "" || utf8.RuneCountInString(barcode) > 120 || strings.IndexFunc(barcode, unicode.IsControl) >= 0 || seen[barcode] {
			return OutsourceOrderLineDTO{}, fmt.Errorf("%w: 条码不能为空、重复、超过120个字符或包含控制字符", ErrInvalidOutsourceOrder)
		}
		seen[barcode] = true
		barcodes = append(barcodes, barcode)
	}
	var saved models.OutsourceOrderLine
	err := s.txManager.WithinTransaction(func(tx *gorm.DB) error {
		order, line, err := loadOutsourceOrderLineForExecutionTx(tx, req.LineID)
		if err != nil {
			return err
		}
		if order.Status == OutsourceOrderStatusDraft || order.Status == OutsourceOrderStatusCanceled || order.Status == OutsourceOrderStatusClosed {
			return fmt.Errorf("%w: 请选择已下发且未关闭的委外任务明细", ErrInvalidOutsourceOrder)
		}
		saved = line
		if saved.Version != req.Version {
			return ErrOutsourceOrderVersionConflict
		}
		before := append([]string{}, saved.RegisteredProductBarcodes...)
		saved.RegisteredProductBarcodes = barcodes
		saved.Version++
		result := tx.Model(&saved).Where("version = ?", req.Version).Select("RegisteredProductBarcodes", "Version", "UpdatedAt").Updates(&saved)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return ErrOutsourceOrderVersionConflict
		}
		if err := tx.Model(&order).Update("version", gorm.Expr("version + 1")).Error; err != nil {
			return err
		}
		return recordAuditEventTx(tx, audit.NewAuditEvent(audit.AuditEntityOutsourceOrder, order.ID, audit.AuditActionUpdate,
			outsourceOrderAuditActor(req.ActorID, req.Operator, req.IP)).
			WithMetadata("operation", "optional_barcode_registration").WithMetadata("lineId", saved.ID).
			WithChanges(audit.DiffModelValues(map[string]any{"registeredProductBarcodes": before}, map[string]any{"registeredProductBarcodes": barcodes})...).Normalize())
	})
	return mapOutsourceOrderLineToDTO(saved), err
}
