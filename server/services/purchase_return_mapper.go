package services

import (
	"math"
	"time"
	"xdfc-server/models"
)

type CreatePurchaseReturnInput struct {
	PurchaseOrderID string
	Operator        string
	IssueCategory   string
	Reason          string
	Remarks         string
	Evidences       []OrderEvidencePayload
	ReturnDate      time.Time
	ReturnDateRaw   string
	Lines           []CreatePurchaseReturnLineInput
}

type CreatePurchaseReturnLineInput struct {
	PurchaseOrderLineID uint
	Quantity            float64
	Price               float64
	IssueCategory       string
	Reason              string
	Evidences           []OrderEvidencePayload
}

type CreatePurchaseReturnResult struct {
	PurchaseReturn models.PurchaseReturn
	PurchaseOrder  models.PurchaseOrder
}

func MapCreatePurchaseReturnRequestToInput(request CreatePurchaseReturnRequest, purchaseOrderID string, operator string) CreatePurchaseReturnInput {
	lines := make([]CreatePurchaseReturnLineInput, 0, len(request.Lines))
	for _, line := range request.Lines {
		lines = append(lines, CreatePurchaseReturnLineInput{
			PurchaseOrderLineID: line.PurchaseOrderLineID,
			Quantity:            line.Quantity,
			Price:               line.Price,
			IssueCategory:       line.IssueCategory,
			Reason:              line.Reason,
			Evidences:           line.Evidences,
		})
	}

	return CreatePurchaseReturnInput{
		PurchaseOrderID: purchaseOrderID,
		Operator:        operator,
		IssueCategory:   request.IssueCategory,
		Reason:          request.Reason,
		Remarks:         request.Remarks,
		Evidences:       request.Evidences,
		ReturnDateRaw:   request.ReturnDate,
		Lines:           lines,
	}
}

func mapPurchaseReturnLineToResponse(line models.PurchaseReturnLine) PurchaseReturnLineResponse {
	return PurchaseReturnLineResponse{
		ID:                  line.ID,
		PurchaseOrderLineID: line.PurchaseOrderLineID,
		LineNo:              line.LineNo,
		MaterialID:          line.MaterialID,
		MaterialCode:        line.MaterialCode,
		MaterialName:        line.MaterialName,
		Specification:       line.Specification,
		UOM:                 line.UOM,
		Quantity:            line.Quantity,
		Price:               line.Price,
		Amount:              math.Round(line.Amount*100) / 100,
		IssueCategory:       line.IssueCategory,
		Reason:              line.Reason,
		Evidences:           decodeOrderEvidences(line.Evidences),
	}
}

func MapPurchaseReturnToResponse(record models.PurchaseReturn) PurchaseReturnResponse {
	lines := make([]PurchaseReturnLineResponse, 0, len(record.Lines))
	for _, line := range record.Lines {
		lines = append(lines, mapPurchaseReturnLineToResponse(line))
	}

	return PurchaseReturnResponse{
		ID:              record.ID,
		ReturnNo:        record.ReturnNo,
		PurchaseOrderID: record.PurchaseOrderID,
		PurchaseOrderNo: record.PurchaseOrderNo,
		SupplierID:      record.SupplierID,
		SupplierName:    record.SupplierName,
		Status:          record.Status,
		ReturnDate:      record.ReturnDate,
		IssueCategory:   record.IssueCategory,
		Reason:          record.Reason,
		Remarks:         record.Remarks,
		Evidences:       decodeOrderEvidences(record.Evidences),
		Operator:        record.Operator,
		TotalQuantity:   math.Round(record.TotalQuantity*100) / 100,
		TotalAmount:     math.Round(record.TotalAmount*100) / 100,
		CreatedAt:       record.CreatedAt,
		UpdatedAt:       record.UpdatedAt,
		Lines:           lines,
	}
}

func MapPurchaseReturnsToResponse(items []models.PurchaseReturn) []PurchaseReturnResponse {
	result := make([]PurchaseReturnResponse, 0, len(items))
	for _, item := range items {
		result = append(result, MapPurchaseReturnToResponse(item))
	}
	return result
}

func MapCreatePurchaseReturnResultToResponse(result CreatePurchaseReturnResult) CreatePurchaseReturnResponse {
	return CreatePurchaseReturnResponse{
		PurchaseReturn: MapPurchaseReturnToResponse(result.PurchaseReturn),
		PurchaseOrder:  MapPurchaseOrderToResponse(result.PurchaseOrder),
	}
}
