package services

import (
	"math"
	"strings"
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

type SalesReturnLineBarcodeInput struct {
	SalesReturnLineID  uint
	RawCode            string
	NormalizedCode     string
	BindSource         string
	VerificationStatus string
}

type BindSalesReturnLineBarcodesInput struct {
	SalesReturnID string
	Operator      string
	Barcodes      []SalesReturnLineBarcodeInput
}

type ConfirmSalesReturnInboundLineInput struct {
	SalesReturnLineID uint
	Quantity          float64
	Barcodes          []SalesReturnLineBarcodeInput
}

type ConfirmSalesReturnInboundInput struct {
	SalesReturnID  string
	ExecutionKey   string
	Operator       string
	TargetCategory string
	BatchNo        string
	InboundDate    time.Time
	InboundDateRaw string
	Remarks        string
	Lines          []ConfirmSalesReturnInboundLineInput
}

type CreateSalesReturnLineInput struct {
	SalesOrderLineID uint
	Quantity         float64
	Price            float64
	IssueCategory    string
	Reason           string
	Evidences        []OrderEvidencePayload
	Barcodes         []string
}

type CreateSalesReturnResult struct {
	SalesReturn models.SalesReturn
	SalesOrder  models.SalesOrder
}

type ConfirmSalesReturnInboundResult struct {
	SalesReturn           models.SalesReturn
	CreatedInboundRecords []models.InboundRecord
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
			Barcodes:         line.Barcodes,
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
			Barcodes:         line.Barcodes,
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

func MapBindSalesReturnLineBarcodesRequestToInput(request BindSalesReturnLineBarcodesRequest, salesReturnID string, operator string) BindSalesReturnLineBarcodesInput {
	barcodes := make([]SalesReturnLineBarcodeInput, 0, len(request.Barcodes))
	for _, barcode := range request.Barcodes {
		barcodes = append(barcodes, SalesReturnLineBarcodeInput{
			SalesReturnLineID:  barcode.SalesReturnLineID,
			RawCode:            barcode.RawCode,
			NormalizedCode:     barcode.NormalizedCode,
			BindSource:         barcode.BindSource,
			VerificationStatus: barcode.VerificationStatus,
		})
	}
	return BindSalesReturnLineBarcodesInput{
		SalesReturnID: salesReturnID,
		Operator:      operator,
		Barcodes:      barcodes,
	}
}

func MapConfirmSalesReturnInboundRequestToInput(request ConfirmSalesReturnInboundRequest, salesReturnID string, operator string) ConfirmSalesReturnInboundInput {
	lines := make([]ConfirmSalesReturnInboundLineInput, 0, len(request.Lines))
	for _, line := range request.Lines {
		barcodes := make([]SalesReturnLineBarcodeInput, 0, len(line.Barcodes))
		for _, barcode := range line.Barcodes {
			barcodes = append(barcodes, SalesReturnLineBarcodeInput{
				SalesReturnLineID:  line.SalesReturnLineID,
				RawCode:            barcode.RawCode,
				NormalizedCode:     barcode.NormalizedCode,
				BindSource:         barcode.BindSource,
				VerificationStatus: barcode.VerificationStatus,
			})
		}
		lines = append(lines, ConfirmSalesReturnInboundLineInput{
			SalesReturnLineID: line.SalesReturnLineID,
			Quantity:          line.Quantity,
			Barcodes:          barcodes,
		})
	}
	return ConfirmSalesReturnInboundInput{
		SalesReturnID:  salesReturnID,
		ExecutionKey:   request.ClientRequestID,
		Operator:       operator,
		TargetCategory: request.TargetCategory,
		BatchNo:        request.BatchNo,
		InboundDateRaw: request.InboundDate,
		Remarks:        request.Remarks,
		Lines:          lines,
	}
}

func mapSalesReturnLineBarcodeToResponse(barcode models.SalesReturnLineBarcode) SalesReturnLineBarcodeResponse {
	return SalesReturnLineBarcodeResponse{
		ID:                  barcode.ID,
		SalesReturnID:       barcode.SalesReturnID,
		SalesReturnLineID:   barcode.SalesReturnLineID,
		SalesOrderLineID:    barcode.SalesOrderLineID,
		RawCode:             barcode.RawCode,
		NormalizedCode:      barcode.NormalizedCode,
		ProductCodeSnapshot: barcode.ProductCodeSnapshot,
		BindSource:          barcode.BindSource,
		VerificationStatus:  barcode.VerificationStatus,
		BoundAt:             barcode.BoundAt,
		BoundBy:             barcode.BoundBy,
	}
}

func mapSalesReturnLineToResponse(line models.SalesReturnLine) SalesReturnLineResponse {
	barcodes := make([]SalesReturnLineBarcodeResponse, 0, len(line.Barcodes))
	for _, barcode := range line.Barcodes {
		barcodes = append(barcodes, mapSalesReturnLineBarcodeToResponse(barcode))
	}
	status := line.Status
	if strings.TrimSpace(status) == "" {
		status = SalesReturnLineStatusRequested
	}

	return SalesReturnLineResponse{
		ID:                                    line.ID,
		SalesOrderLineID:                      line.SalesOrderLineID,
		LineNo:                                line.LineNo,
		ProductID:                             line.ProductID,
		ProductCode:                           line.ProductCode,
		ProductModel:                          line.ProductModel,
		Specification:                         line.Specification,
		ProductDisplayTitleSnapshot:           line.ProductDisplayTitleSnapshot,
		ProductDisplaySubtitleSnapshot:        line.ProductDisplaySubtitleSnapshot,
		ProductDisplayCodeSnapshot:            line.ProductDisplayCodeSnapshot,
		ProductDisplayFullLabelSnapshot:       line.ProductDisplayFullLabelSnapshot,
		ProductDisplayStrategyVersionSnapshot: line.ProductDisplayStrategyVersionSnapshot,
		Description:                           line.Description,
		UOM:                                   line.UOM,
		Quantity:                              math.Round(line.Quantity*100) / 100,
		ReceivedQuantity:                      math.Round(line.ReceivedQuantity*100) / 100,
		Status:                                status,
		Price:                                 math.Round(line.Price*100) / 100,
		Amount:                                math.Round(line.Amount*100) / 100,
		IssueCategory:                         line.IssueCategory,
		Reason:                                line.Reason,
		Evidences:                             decodeOrderEvidences(line.Evidences),
		Barcodes:                              barcodes,
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
		TotalReceivedQuantity:        math.Round(record.TotalReceivedQuantity*100) / 100,
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
		InboundRecords:               []InventoryInboundRecordResponse{},
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

func MapConfirmSalesReturnInboundResultToResponse(result ConfirmSalesReturnInboundResult) ConfirmSalesReturnInboundResponse {
	records := make([]InventoryInboundRecordResponse, 0, len(result.CreatedInboundRecords))
	for _, record := range result.CreatedInboundRecords {
		records = append(records, MapInboundRecordToResponse(record))
	}
	return ConfirmSalesReturnInboundResponse{
		SalesReturn:           MapSalesReturnToResponse(result.SalesReturn),
		CreatedInboundRecords: records,
	}
}
