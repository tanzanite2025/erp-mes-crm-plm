package services

import (
	"errors"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ConfirmPurchaseReceiptInput struct {
	PurchaseOrderID string
	Operator        string
	Remarks         string
	ReceiptDate     time.Time
	Lines           []ConfirmPurchaseReceiptLineInput
}

type ConfirmPurchaseReceiptLineInput struct {
	PurchaseOrderLineID uint
	MaterialID          string
	Quantity            float64
	PurchasePrice       float64
	BatchNo             string
	TargetCategory      string
}

type ConfirmPurchaseReceiptResult struct {
	PurchaseOrder         models.PurchaseOrder
	CreatedInboundRecords []models.InboundRecord
}

func ConfirmPurchaseReceipt(input ConfirmPurchaseReceiptInput) (ConfirmPurchaseReceiptResult, error) {
	purchaseOrderID := strings.TrimSpace(input.PurchaseOrderID)
	if purchaseOrderID == "" {
		return ConfirmPurchaseReceiptResult{}, errors.New("purchase order id is required")
	}
	if len(input.Lines) == 0 {
		return ConfirmPurchaseReceiptResult{}, errors.New("receipt lines are required")
	}
	if input.ReceiptDate.IsZero() {
		input.ReceiptDate = time.Now()
	}
	input.Operator = strings.TrimSpace(input.Operator)
	input.Remarks = strings.TrimSpace(input.Remarks)

	result := ConfirmPurchaseReceiptResult{}
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		var order models.PurchaseOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Preload("Lines").
			Where("id = ?", purchaseOrderID).
			First(&order).Error; err != nil {
			return err
		}
		if order.Status != "Sent" && order.Status != "Awaiting" {
			return errors.New("purchase order status does not allow receipt confirmation")
		}

		lineMap := make(map[uint]models.PurchaseOrderLine, len(order.Lines))
		for _, line := range order.Lines {
			lineMap[line.ID] = line
		}

		createdRecords := make([]models.InboundRecord, 0, len(input.Lines))
		for _, lineInput := range input.Lines {
			if lineInput.PurchaseOrderLineID == 0 {
				return errors.New("purchase order line id is required")
			}
			if lineInput.Quantity <= 0 {
				return errors.New("receipt quantity must be greater than zero")
			}
			if lineInput.PurchasePrice < 0 {
				return errors.New("receipt purchase price must be greater than or equal to zero")
			}
			if strings.TrimSpace(lineInput.TargetCategory) == "" {
				return errors.New("target category is required")
			}

			orderLine, ok := lineMap[lineInput.PurchaseOrderLineID]
			if !ok {
				return errors.New("purchase order line not found")
			}
			materialID := strings.TrimSpace(lineInput.MaterialID)
			if materialID == "" {
				materialID = strings.TrimSpace(orderLine.MaterialID)
			}
			if materialID == "" || materialID != strings.TrimSpace(orderLine.MaterialID) {
				return errors.New("material id does not match purchase order line")
			}
			remaining := orderLine.Qty - orderLine.ReceivedQty
			if lineInput.Quantity > remaining+purchaseReceiptTolerance {
				return errors.New("receipt quantity exceeds remaining quantity")
			}

			inbound := models.InboundRecord{
				BaseModel: models.BaseModel{ID: uuid.NewString()},
				MaterialID:          materialID,
				PurchaseOrderID:     purchaseOrderID,
				PurchaseOrderLineID: lineInput.PurchaseOrderLineID,
				Quantity:            lineInput.Quantity,
				PurchasePrice:       lineInput.PurchasePrice,
				TargetCategory:      strings.TrimSpace(lineInput.TargetCategory),
				BatchNo:             strings.TrimSpace(lineInput.BatchNo),
				InboundDate:         input.ReceiptDate,
				Operator:            input.Operator,
				Remarks:             input.Remarks,
			}
			if err := recordInboundTx(tx, &inbound); err != nil {
				return err
			}
			createdRecords = append(createdRecords, inbound)
			updatedLine := lineMap[lineInput.PurchaseOrderLineID]
			updatedLine.ReceivedQty += lineInput.Quantity
			lineMap[lineInput.PurchaseOrderLineID] = updatedLine
		}

		updatedOrder, err := recalculatePurchaseOrderStatusTx(tx, purchaseOrderID)
		if err != nil {
			return err
		}
		result.PurchaseOrder = updatedOrder
		result.CreatedInboundRecords = createdRecords
		return nil
	})
	if err != nil {
		return ConfirmPurchaseReceiptResult{}, err
	}
	return result, nil
}
