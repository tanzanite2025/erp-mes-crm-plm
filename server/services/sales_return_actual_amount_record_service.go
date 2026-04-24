package services

import (
	"errors"
	"math"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func ListSalesReturnActualAmountRecords(salesReturnID string) ([]SalesReturnActualAmountRecordResponse, error) {
	normalizedID := strings.TrimSpace(salesReturnID)
	if normalizedID == "" {
		return nil, errors.New("sales return id is required")
	}

	var salesReturn models.SalesReturn
	if err := db.DB.Select("id").First(&salesReturn, "id = ?", normalizedID).Error; err != nil {
		return nil, err
	}

	var records []models.SalesReturnActualAmountRecord
	if err := db.DB.
		Where("sales_return_id = ?", normalizedID).
		Order("recorded_at desc, created_at desc").
		Find(&records).Error; err != nil {
		return nil, err
	}

	response := make([]SalesReturnActualAmountRecordResponse, 0, len(records))
	for _, record := range records {
		response = append(response, mapSalesReturnActualAmountRecordToResponse(record))
	}
	return response, nil
}

func mapSalesReturnActualAmountRecordToResponse(record models.SalesReturnActualAmountRecord) SalesReturnActualAmountRecordResponse {
	return SalesReturnActualAmountRecordResponse{
		ID:                            record.ID,
		SalesReturnID:                 record.SalesReturnID,
		SalesOrderID:                  record.SalesOrderID,
		SalesOrderNo:                  record.SalesOrderNo,
		ReturnNo:                      record.ReturnNo,
		CustomerID:                    record.CustomerID,
		CustomerName:                  record.CustomerName,
		Amount:                        math.Round(record.Amount*100) / 100,
		Note:                          record.Note,
		Evidences:                     decodeOrderEvidences(record.Evidences),
		EstimatedReturnAmountSnapshot: math.Round(record.EstimatedReturnAmountSnapshot*100) / 100,
		RecordedAt:                    record.RecordedAt,
		RecordedBy:                    record.RecordedBy,
		CreatedAt:                     record.CreatedAt,
		UpdatedAt:                     record.UpdatedAt,
	}
}

func createSalesReturnActualAmountRecordTx(tx *gorm.DB, salesReturn models.SalesReturn, input PatchSalesReturnActualAmountEntryInput, recordedAt time.Time) (models.SalesReturnActualAmountRecord, error) {
	record := models.SalesReturnActualAmountRecord{
		BaseModel:                     models.BaseModel{ID: uuid.NewString()},
		SalesReturnID:                 salesReturn.ID,
		SalesOrderID:                  salesReturn.SalesOrderID,
		SalesOrderNo:                  salesReturn.SalesOrderNo,
		ReturnNo:                      salesReturn.ReturnNo,
		CustomerID:                    salesReturn.CustomerID,
		CustomerName:                  salesReturn.CustomerName,
		Amount:                        math.Round(input.ActualReturnAmount*100) / 100,
		Note:                          strings.TrimSpace(input.ActualReturnAmountNote),
		Evidences:                     encodeOrderEvidences(input.ActualReturnAmountEvidences),
		EstimatedReturnAmountSnapshot: math.Round(salesReturn.TotalAmount*100) / 100,
		RecordedAt:                    recordedAt,
		RecordedBy:                    strings.TrimSpace(input.Operator),
	}
	if err := tx.Create(&record).Error; err != nil {
		return models.SalesReturnActualAmountRecord{}, err
	}
	return record, nil
}

func PatchSalesReturnActualAmountEntry(input PatchSalesReturnActualAmountEntryInput) (SalesReturnResponse, error) {
	salesReturnID := strings.TrimSpace(input.SalesReturnID)
	if salesReturnID == "" {
		return SalesReturnResponse{}, errors.New("sales return id is required")
	}
	if input.ActualReturnAmount < 0 {
		return SalesReturnResponse{}, errors.New("actual return amount must be greater than or equal to 0")
	}

	input.Operator = strings.TrimSpace(input.Operator)
	input.ActualReturnAmountNote = strings.TrimSpace(input.ActualReturnAmountNote)
	if input.Operator == "" {
		input.Operator = "unknown"
	}

	recordedAt := time.Now()
	var response SalesReturnResponse
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var salesReturn models.SalesReturn
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Lines").First(&salesReturn, "id = ?", salesReturnID).Error; err != nil {
			return err
		}

		status := normalizeSalesReturnStatus(salesReturn.Status)
		if status == SalesReturnStatusCanceled {
			return errors.New("已取消退货单不允许登记退货金额")
		}

		record, err := createSalesReturnActualAmountRecordTx(tx, salesReturn, input, recordedAt)
		if err != nil {
			return err
		}

		salesReturn.ActualReturnAmount = record.Amount
		salesReturn.ActualReturnAmountNote = record.Note
		salesReturn.ActualReturnAmountEvidences = record.Evidences
		salesReturn.ActualReturnAmountRecordedAt = &record.RecordedAt
		salesReturn.ActualReturnAmountRecordedBy = record.RecordedBy

		if err := tx.Model(&models.SalesReturn{}).Where("id = ?", salesReturnID).Updates(map[string]any{
			"actual_return_amount":             salesReturn.ActualReturnAmount,
			"actual_return_amount_note":        salesReturn.ActualReturnAmountNote,
			"actual_return_amount_evidences":   salesReturn.ActualReturnAmountEvidences,
			"actual_return_amount_recorded_at": salesReturn.ActualReturnAmountRecordedAt,
			"actual_return_amount_recorded_by": salesReturn.ActualReturnAmountRecordedBy,
		}).Error; err != nil {
			return err
		}

		var reloaded models.SalesReturn
		if err := tx.Preload("Lines").First(&reloaded, "id = ?", salesReturn.ID).Error; err != nil {
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
