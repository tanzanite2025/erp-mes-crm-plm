package services

import (
	"errors"
	"fmt"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	"xdfc-server/salesorderidentity"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var ErrQuoteConversionNotAllowed = errors.New("quote status does not allow conversion")
var ErrQuoteConversionTargetMissing = errors.New("converted quote target sales order is missing")

func ConvertQuoteToSalesOrder(id string, operator string) (QuoteConvertResponse, error) {
	quoteID := strings.TrimSpace(id)
	if quoteID == "" {
		return QuoteConvertResponse{}, fmt.Errorf("quote id is required")
	}

	var response QuoteConvertResponse
	var targetOrder models.SalesOrder
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var quote models.SalesOrder
		if err := applyQuoteRecordScope(
			tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Lines").Where("id = ?", quoteID),
		).First(&quote).Error; err != nil {
			return err
		}

		var existingConversion models.QuoteConversion
		if err := tx.Where("quote_id = ?", quote.ID).First(&existingConversion).Error; err == nil {
			if err := tx.Preload("Lines").First(&targetOrder, "id = ?", existingConversion.SalesOrderID).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return ErrQuoteConversionTargetMissing
				}
				return err
			}
			response = mapQuoteConversionResponse(quote.ID, targetOrder)
			return nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		status := normalizeQuoteStatus(quote.Status)
		if status != "draft" && status != "pending" && status != "converted" {
			return ErrQuoteConversionNotAllowed
		}

		orderNo, err := salesorderidentity.GenerateSalesOrderBarcodeTx(tx, quoteTargetSalesOrderClassification(quote))
		if err != nil {
			return err
		}
		targetOrder = buildSalesOrderFromQuote(quote, uuid.NewString(), orderNo, operator)
		if err := tx.Create(&targetOrder).Error; err != nil {
			return err
		}

		now := time.Now()
		conversion := models.QuoteConversion{
			ID:           uuid.NewString(),
			QuoteID:      quote.ID,
			SalesOrderID: targetOrder.ID,
			ConvertedAt:  now,
			ConvertedBy:  strings.TrimSpace(operator),
		}
		if err := tx.Create(&conversion).Error; err != nil {
			return err
		}

		updates := map[string]any{
			"status":     "Converted",
			"updated_at": now,
			"version":    gorm.Expr("version + 1"),
		}
		if convertedBy := strings.TrimSpace(operator); convertedBy != "" {
			updates["updated_by"] = convertedBy
		}
		if err := tx.Model(&models.SalesOrder{}).Where("id = ?", quote.ID).Updates(updates).Error; err != nil {
			return err
		}

		response = mapQuoteConversionResponse(quote.ID, targetOrder)
		return nil
	})
	if err != nil {
		return QuoteConvertResponse{}, err
	}

	if targetOrder.ID != "" {
		syncSalesOrderToSearch(MapSalesOrderToResponse(targetOrder))
	}
	return response, nil
}

func buildSalesOrderFromQuote(quote models.SalesOrder, targetID string, orderNo string, operator string) models.SalesOrder {
	target := quote
	target.ID = targetID
	target.OrderNo = orderNo
	target.Barcode = orderNo
	target.Classification = quoteTargetSalesOrderClassification(quote)
	target.Status = "Draft"
	target.StatusNote = ""
	target.Version = 1
	target.CreatedAt = time.Time{}
	target.UpdatedAt = time.Time{}
	target.DeletedAt = gorm.DeletedAt{}
	target.UpdatedBy = strings.TrimSpace(operator)
	target.IsDeleted = false
	target.Lines = make([]models.SalesOrderLine, 0, len(quote.Lines))

	for _, sourceLine := range quote.Lines {
		line := sourceLine
		line.ID = 0
		line.SalesOrderID = target.ID
		line.DeliveredQty = 0
		line.Status = "Draft"
		line.ClaimedBy = ""
		line.ClaimedAt = ""
		target.Lines = append(target.Lines, line)
	}
	if len(target.Lines) > 0 {
		recalculateSalesOrderAuthorityCosts(&target)
	}
	return target
}

func quoteTargetSalesOrderClassification(quote models.SalesOrder) string {
	if normalizeQuoteSummaryType(quote.Type, quote.Classification) == "sample" {
		return "SAMPLE"
	}
	return "GENERAL"
}

func mapQuoteConversionResponse(quoteID string, target models.SalesOrder) QuoteConvertResponse {
	return QuoteConvertResponse{
		QuoteID:            quoteID,
		TargetSalesOrderID: target.ID,
		TargetSalesOrderNo: target.OrderNo,
		Status:             "converted",
	}
}
