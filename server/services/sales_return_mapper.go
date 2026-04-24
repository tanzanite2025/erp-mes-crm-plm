package services

import (
	"math"
	"time"
	"xdfc-server/models"
)

type CreateSalesReturnInput struct {
	SalesOrderID  string
	Operator      string
	TrackingNo    string
	Carrier       string
	ShippedAt     *time.Time
	ShippedAtRaw  string
	LogisticsNote string
	IssueCategory string
	Reason        string
	Remarks       string
	Evidences     []OrderEvidencePayload
	ReturnDate    time.Time
	ReturnDateRaw string
	Lines         []CreateSalesReturnLineInput
}

type PatchSalesReturnInput struct {
	SalesReturnID string
	Operator      string
	IssueCategory string
	Reason        string
	Remarks       string
	Evidences     []OrderEvidencePayload
	ReturnDate    time.Time
	ReturnDateRaw string
	Lines         []CreateSalesReturnLineInput
}

type PatchSalesReturnLogisticsInput struct {
	SalesReturnID string
	Operator      string
	TrackingNo    string
	Carrier       string
	ShippedAt     *time.Time
	ShippedAtRaw  string
	LogisticsNote string
	Status        string
}

type PatchSalesReturnActualAmountEntryInput struct {
	SalesReturnID               string
	Operator                    string
	ActualReturnAmount          float64
	ActualReturnAmountNote      string
	ActualReturnAmountEvidences []OrderEvidencePayload
}

type CreateSalesReturnLineInput struct {
	SalesOrderLineID uint
	Quantity         float64
	Price            float64
	IssueCategory    string
	Reason           string
	Evidences        []OrderEvidencePayload
}

type CreateSalesReturnResult struct {
	SalesReturn models.SalesReturn
	SalesOrder  models.SalesOrder
}

func MapCreateSalesReturnRequestToInput(request CreateSalesReturnRequest, salesOrderID string, operator string) CreateSalesReturnInput {
	lines := make([]CreateSalesReturnLineInput, 0, len(request.Lines))
	for _, line := range request.Lines {
		lines = append(lines, CreateSalesReturnLineInput{
			SalesOrderLineID: line.SalesOrderLineID,
			Quantity:         line.Quantity,
			Price:            line.Price,
			IssueCategory:    line.IssueCategory,
			Reason:           line.Reason,
			Evidences:        line.Evidences,
		})
	}

	return CreateSalesReturnInput{
		SalesOrderID:  salesOrderID,
		Operator:      operator,
		TrackingNo:    request.TrackingNo,
		Carrier:       request.Carrier,
		ShippedAtRaw:  request.ShippedAt,
		LogisticsNote: request.LogisticsNote,
		IssueCategory: request.IssueCategory,
		Reason:        request.Reason,
		Remarks:       request.Remarks,
		Evidences:     request.Evidences,
		ReturnDateRaw: request.ReturnDate,
		Lines:         lines,
	}
}

func MapPatchSalesReturnActualAmountEntryRequestToInput(request PatchSalesReturnActualAmountEntryRequest, salesReturnID string, operator string) PatchSalesReturnActualAmountEntryInput {
	return PatchSalesReturnActualAmountEntryInput{
		SalesReturnID:               salesReturnID,
		Operator:                    operator,
		ActualReturnAmount:          request.ActualReturnAmount,
		ActualReturnAmountNote:      request.ActualReturnAmountNote,
		ActualReturnAmountEvidences: request.ActualReturnAmountEvidences,
	}
}

func MapPatchSalesReturnRequestToInput(request PatchSalesReturnRequest, salesReturnID string, operator string) PatchSalesReturnInput {
	lines := make([]CreateSalesReturnLineInput, 0, len(request.Lines))
	for _, line := range request.Lines {
		lines = append(lines, CreateSalesReturnLineInput{
			SalesOrderLineID: line.SalesOrderLineID,
			Quantity:         line.Quantity,
			Price:            line.Price,
			IssueCategory:    line.IssueCategory,
			Reason:           line.Reason,
			Evidences:        line.Evidences,
		})
	}

	return PatchSalesReturnInput{
		SalesReturnID: salesReturnID,
		Operator:      operator,
		IssueCategory: request.IssueCategory,
		Reason:        request.Reason,
		Remarks:       request.Remarks,
		Evidences:     request.Evidences,
		ReturnDateRaw: request.ReturnDate,
		Lines:         lines,
	}
}

func MapPatchSalesReturnLogisticsRequestToInput(request PatchSalesReturnLogisticsRequest, salesReturnID string, operator string) PatchSalesReturnLogisticsInput {
	return PatchSalesReturnLogisticsInput{
		SalesReturnID: salesReturnID,
		Operator:      operator,
		TrackingNo:    request.TrackingNo,
		Carrier:       request.Carrier,
		ShippedAtRaw:  request.ShippedAt,
		LogisticsNote: request.LogisticsNote,
		Status:        request.Status,
	}
}

func mapSalesReturnLineToResponse(line models.SalesReturnLine) SalesReturnLineResponse {
	return SalesReturnLineResponse{
		ID:               line.ID,
		SalesOrderLineID: line.SalesOrderLineID,
		LineNo:           line.LineNo,
		ProductID:        line.ProductID,
		ProductCode:      line.ProductCode,
		ProductModel:     line.ProductModel,
		Specification:    line.Specification,
		Description:      line.Description,
		UOM:              line.UOM,
		Quantity:         math.Round(line.Quantity*100) / 100,
		Price:            math.Round(line.Price*100) / 100,
		Amount:           math.Round(line.Amount*100) / 100,
		IssueCategory:    line.IssueCategory,
		Reason:           line.Reason,
		Evidences:        decodeOrderEvidences(line.Evidences),
	}
}

func MapSalesReturnToResponse(record models.SalesReturn) SalesReturnResponse {
	lines := make([]SalesReturnLineResponse, 0, len(record.Lines))
	for _, line := range record.Lines {
		lines = append(lines, mapSalesReturnLineToResponse(line))
	}

	status := normalizeSalesReturnStatus(record.Status)
	if status == "" {
		status = SalesReturnStatusCreated
	}

	return SalesReturnResponse{
		ID:                           record.ID,
		ReturnNo:                     record.ReturnNo,
		SalesOrderID:                 record.SalesOrderID,
		SalesOrderNo:                 record.SalesOrderNo,
		CustomerID:                   record.CustomerID,
		CustomerName:                 record.CustomerName,
		Status:                       status,
		TrackingNo:                   record.TrackingNo,
		Carrier:                      record.Carrier,
		ShippedAt:                    record.ShippedAt,
		TrackingFilledAt:             record.TrackingFilledAt,
		TrackingFilledBy:             record.TrackingFilledBy,
		LogisticsNote:                record.LogisticsNote,
		PendingTrackingFill:          deriveSalesReturnPendingTracking(record.TrackingNo, status),
		ReturnDate:                   record.ReturnDate,
		IssueCategory:                record.IssueCategory,
		Reason:                       record.Reason,
		Remarks:                      record.Remarks,
		ActualReturnAmount:           math.Round(record.ActualReturnAmount*100) / 100,
		ActualReturnAmountNote:       record.ActualReturnAmountNote,
		ActualReturnAmountEvidences:  decodeOrderEvidences(record.ActualReturnAmountEvidences),
		ActualReturnAmountRecordedAt: record.ActualReturnAmountRecordedAt,
		ActualReturnAmountRecordedBy: record.ActualReturnAmountRecordedBy,
		Evidences:                    decodeOrderEvidences(record.Evidences),
		Operator:                     record.Operator,
		TotalQuantity:                math.Round(record.TotalQuantity*100) / 100,
		TotalAmount:                  math.Round(record.TotalAmount*100) / 100,
		CreatedAt:                    record.CreatedAt,
		UpdatedAt:                    record.UpdatedAt,
		Lines:                        lines,
	}
}

func MapSalesReturnsToResponse(items []models.SalesReturn) []SalesReturnResponse {
	result := make([]SalesReturnResponse, 0, len(items))
	for _, item := range items {
		result = append(result, MapSalesReturnToResponse(item))
	}
	return result
}

func MapCreateSalesReturnResultToResponse(result CreateSalesReturnResult) CreateSalesReturnResponse {
	return CreateSalesReturnResponse{
		SalesReturn: MapSalesReturnToResponse(result.SalesReturn),
		SalesOrder:  MapSalesOrderToResponse(result.SalesOrder),
	}
}
