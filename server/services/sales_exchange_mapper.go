package services

import (
	"fmt"
	"math"
	"strings"
	"time"
	"xdfc-server/models"
)

type CreateSalesExchangeInput struct {
	SalesOrderID               string
	Operator                   string
	ExchangeDate               time.Time
	ExchangeDateRaw            string
	ExpectedReplacementDate    *time.Time
	ExpectedReplacementDateRaw string
	ReceivedOldItemTrackingNo  string
	ReplacementTrackingNo      string
	ExchangeReason             string
	ExchangeRemarks            string
	Lines                      []CreateSalesExchangeLineInput
	UnmatchedLabelCodes        []SalesExchangeUnmatchedLabelInput
}

type CreateSalesExchangeLineInput struct {
	SalesOrderLineID        uint
	ExchangeQuantity        float64
	ReplacementMode         string
	ReplacementProductCode  string
	ReplacementProductModel string
	IssueCategory           string
	IssueDescription        string
	LabelCodes              []SalesExchangeRecognizedLabelInput
}

type SalesExchangeRecognizedLabelInput struct {
	RawLabelCode        string
	NormalizedLabelCode string
	RecognizedAtRaw     string
	RecognitionSource   string
	Side                string
}

type SalesExchangeUnmatchedLabelInput struct {
	RawLabelCode        string
	NormalizedLabelCode string
	RecognizedAtRaw     string
	RecognitionSource   string
	UnmatchedReason     string
	Side                string
}

type ConfirmSalesExchangeOldItemInboundInput struct {
	SalesExchangeID     string
	SalesExchangeLineID uint
	ExecutionKey        string
	Quantity            float64
	Operator            string
	TargetCategory      string
	BatchNo             string
	InboundDate         time.Time
	InboundDateRaw      string
	Remarks             string
	Barcodes            []SalesExchangeExecutionBarcodeInput
}

type PatchSalesExchangeOldItemLogisticsInput struct {
	SalesExchangeID   string
	Operator          string
	OldItemTrackingNo string
}

type SalesExchangeExecutionBarcodeInput struct {
	RawLabelCode        string
	NormalizedLabelCode string
	RecognizedAtRaw     string
	RecognitionSource   string
	Side                string
}

type ConfirmSalesExchangeReplacementShipmentInput struct {
	SalesExchangeID       string
	ExecutionKey          string
	Operator              string
	SourceCategory        string
	BatchNo               string
	ShipmentDate          time.Time
	ShipmentDateRaw       string
	ReplacementTrackingNo string
	Remarks               string
	Lines                 []ConfirmSalesExchangeReplacementShipmentLineInput
}

type ConfirmSalesExchangeReplacementShipmentLineInput struct {
	SalesExchangeLineID uint
	Quantity            float64
	Barcodes            []SalesExchangeExecutionBarcodeInput
}

type CreateSalesExchangeResult struct {
	SalesExchange models.SalesExchange
	SalesOrder    models.SalesOrder
}

type ConfirmSalesExchangeOldItemInboundResult struct {
	SalesExchange         models.SalesExchange
	CreatedInboundRecords []models.InboundRecord
}

type ConfirmSalesExchangeReplacementShipmentResult struct {
	SalesExchange          models.SalesExchange
	CreatedShipmentRecords []models.ShipmentRecord
}

func MapCreateSalesExchangeRequestToInput(request CreateSalesExchangeRequest, salesOrderID string, operator string) CreateSalesExchangeInput {
	lines := make([]CreateSalesExchangeLineInput, 0, len(request.Lines))
	for _, line := range request.Lines {
		labelCodes := make([]SalesExchangeRecognizedLabelInput, 0, len(line.LabelCodes))
		for _, label := range line.LabelCodes {
			labelCodes = append(labelCodes, SalesExchangeRecognizedLabelInput{
				RawLabelCode:        label.RawLabelCode,
				NormalizedLabelCode: label.NormalizedLabelCode,
				RecognizedAtRaw:     label.RecognizedAt,
				RecognitionSource:   label.RecognitionSource,
				Side:                label.Side,
			})
		}
		lines = append(lines, CreateSalesExchangeLineInput{
			SalesOrderLineID:        line.SalesOrderLineID,
			ExchangeQuantity:        line.ExchangeQuantity,
			ReplacementMode:         line.ReplacementMode,
			ReplacementProductCode:  strings.TrimSpace(line.ReplacementProductCode),
			ReplacementProductModel: strings.TrimSpace(line.ReplacementProductModel),
			IssueCategory:           strings.TrimSpace(line.IssueCategory),
			IssueDescription:        strings.TrimSpace(line.IssueDescription),
			LabelCodes:              labelCodes,
		})
	}

	unmatched := make([]SalesExchangeUnmatchedLabelInput, 0, len(request.UnmatchedLabelCodes))
	for _, label := range request.UnmatchedLabelCodes {
		unmatched = append(unmatched, SalesExchangeUnmatchedLabelInput{
			RawLabelCode:        label.RawLabelCode,
			NormalizedLabelCode: label.NormalizedLabelCode,
			RecognizedAtRaw:     label.RecognizedAt,
			RecognitionSource:   label.RecognitionSource,
			UnmatchedReason:     label.UnmatchedReason,
			Side:                label.Side,
		})
	}

	return CreateSalesExchangeInput{
		SalesOrderID:               salesOrderID,
		Operator:                   operator,
		ExchangeDateRaw:            request.ExchangeDate,
		ExpectedReplacementDateRaw: request.ExpectedReplacementDate,
		ReceivedOldItemTrackingNo:  request.ReceivedOldItemTrackingNo,
		ReplacementTrackingNo:      request.ReplacementTrackingNo,
		ExchangeReason:             request.ExchangeReason,
		ExchangeRemarks:            request.ExchangeRemarks,
		Lines:                      lines,
		UnmatchedLabelCodes:        unmatched,
	}
}

func MapConfirmSalesExchangeOldItemInboundRequestToInput(request ConfirmSalesExchangeOldItemInboundRequest, salesExchangeID string, operator string) ConfirmSalesExchangeOldItemInboundInput {
	barcodes := make([]SalesExchangeExecutionBarcodeInput, 0, len(request.Barcodes))
	for _, barcode := range request.Barcodes {
		barcodes = append(barcodes, mapSalesExchangeExecutionBarcodeRequestToInput(barcode))
	}
	return ConfirmSalesExchangeOldItemInboundInput{
		SalesExchangeID:     salesExchangeID,
		SalesExchangeLineID: request.SalesExchangeLineID,
		ExecutionKey:        request.ClientRequestID,
		Quantity:            request.Quantity,
		Operator:            operator,
		TargetCategory:      request.TargetCategory,
		BatchNo:             request.BatchNo,
		InboundDateRaw:      request.InboundDate,
		Remarks:             request.Remarks,
		Barcodes:            barcodes,
	}
}

func MapPatchSalesExchangeOldItemLogisticsRequestToInput(request PatchSalesExchangeOldItemLogisticsRequest, salesExchangeID string, operator string) PatchSalesExchangeOldItemLogisticsInput {
	return PatchSalesExchangeOldItemLogisticsInput{
		SalesExchangeID:   salesExchangeID,
		Operator:          operator,
		OldItemTrackingNo: request.ReceivedOldItemTrackingNo,
	}
}

func mapSalesExchangeExecutionBarcodeRequestToInput(request SalesExchangeExecutionBarcodeRequest) SalesExchangeExecutionBarcodeInput {
	return SalesExchangeExecutionBarcodeInput{
		RawLabelCode:        request.RawLabelCode,
		NormalizedLabelCode: request.NormalizedLabelCode,
		RecognizedAtRaw:     request.RecognizedAt,
		RecognitionSource:   request.RecognitionSource,
		Side:                request.Side,
	}
}

func MapConfirmSalesExchangeReplacementShipmentRequestToInput(request ConfirmSalesExchangeReplacementShipmentRequest, salesExchangeID string, operator string) ConfirmSalesExchangeReplacementShipmentInput {
	lines := make([]ConfirmSalesExchangeReplacementShipmentLineInput, 0, len(request.Lines))
	for _, line := range request.Lines {
		barcodes := make([]SalesExchangeExecutionBarcodeInput, 0, len(line.Barcodes))
		for _, barcode := range line.Barcodes {
			barcodes = append(barcodes, mapSalesExchangeExecutionBarcodeRequestToInput(barcode))
		}
		lines = append(lines, ConfirmSalesExchangeReplacementShipmentLineInput{
			SalesExchangeLineID: line.SalesExchangeLineID,
			Quantity:            line.Quantity,
			Barcodes:            barcodes,
		})
	}
	return ConfirmSalesExchangeReplacementShipmentInput{
		SalesExchangeID:       salesExchangeID,
		ExecutionKey:          request.ClientRequestID,
		Operator:              operator,
		SourceCategory:        request.SourceCategory,
		BatchNo:               request.BatchNo,
		ShipmentDateRaw:       request.ShipmentDate,
		ReplacementTrackingNo: request.ReplacementTrackingNo,
		Remarks:               request.Remarks,
		Lines:                 lines,
	}
}

func MapVoidSalesExchangeReplacementShipmentRequestToInput(
	request VoidSalesExchangeReplacementShipmentRequest,
	salesExchangeID string,
	shipmentID string,
	operator string,
) VoidSalesExchangeReplacementShipmentInput {
	resolvedOperator := strings.TrimSpace(request.Operator)
	if resolvedOperator == "" {
		resolvedOperator = operator
	}
	return VoidSalesExchangeReplacementShipmentInput{
		SalesExchangeID: salesExchangeID,
		ShipmentID:      shipmentID,
		Operator:        resolvedOperator,
		Reason:          request.Reason,
	}
}

func MapVoidSalesExchangeReplacementShipmentResultToResponse(
	result VoidSalesExchangeReplacementShipmentResult,
) VoidSalesExchangeReplacementShipmentResponse {
	return VoidSalesExchangeReplacementShipmentResponse{
		SalesExchange: MapSalesExchangeToResponse(result.SalesExchange),
		Shipment:      MapShipmentRecordToResponse(result.Shipment),
	}
}

func mapSalesExchangeLabelCodeToResponse(label models.SalesExchangeLabelCode) SalesExchangeLabelCodeResponse {
	return SalesExchangeLabelCodeResponse{
		ID:                  label.ID,
		RawLabelCode:        label.RawLabelCode,
		NormalizedLabelCode: label.NormalizedLabelCode,
		RecognitionSource:   label.RecognitionSource,
		RecognizedAt:        label.RecognizedAt,
		Side:                label.Side,
		UnmatchedReason:     label.UnmatchedReason,
	}
}

func mapSalesExchangeLineToResponse(line models.SalesExchangeLine) SalesExchangeLineResponse {
	labels := make([]SalesExchangeLabelCodeResponse, 0, len(line.LabelCodes))
	for _, label := range line.LabelCodes {
		if strings.EqualFold(label.Status, "Unmatched") {
			continue
		}
		labels = append(labels, mapSalesExchangeLabelCodeToResponse(label))
	}
	return SalesExchangeLineResponse{
		ID:                                    line.ID,
		LineDraftID:                           fmt.Sprintf("sales-exchange-line-%d", line.ID),
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
		OriginalOrderQuantity:                 math.Round(line.OriginalOrderQuantity*100) / 100,
		DeliveredQuantity:                     math.Round(line.DeliveredQuantity*100) / 100,
		ExchangeQuantity:                      math.Round(line.ExchangeQuantity*100) / 100,
		OldItemReceivedQuantity:               math.Round(line.OldItemReceivedQuantity*100) / 100,
		ReplacementShippedQuantity:            math.Round(line.ReplacementShippedQuantity*100) / 100,
		Status:                                line.Status,
		ReplacementMode:                       line.ReplacementMode,
		ReplacementProductCode:                line.ReplacementProductCode,
		ReplacementProductModel:               line.ReplacementProductModel,
		IssueCategory:                         line.IssueCategory,
		IssueDescription:                      line.IssueDescription,
		RecognizedLabelCodes:                  labels,
	}
}

func MapSalesExchangeToResponse(record models.SalesExchange) SalesExchangeResponse {
	lines := make([]SalesExchangeLineResponse, 0, len(record.Lines))
	unmatched := make([]SalesExchangeLabelCodeResponse, 0)
	for _, line := range record.Lines {
		lines = append(lines, mapSalesExchangeLineToResponse(line))
	}
	for _, label := range record.LabelCodes {
		if strings.EqualFold(label.Status, "Unmatched") {
			unmatched = append(unmatched, mapSalesExchangeLabelCodeToResponse(label))
		}
	}

	return SalesExchangeResponse{
		ID:                         record.ID,
		ExchangeNo:                 record.ExchangeNo,
		SourceSalesOrderID:         record.SalesOrderID,
		SourceSalesOrderNo:         record.SalesOrderNo,
		CustomerID:                 record.CustomerID,
		CustomerName:               record.CustomerName,
		Status:                     normalizeSalesExchangeStatus(record.Status),
		ExchangeDate:               record.ExchangeDate,
		ExpectedReplacementDate:    record.ExpectedReplacementDate,
		ReceivedOldItemTrackingNo:  record.ReceivedOldItemTrackingNo,
		ReplacementTrackingNo:      record.ReplacementTrackingNo,
		ExchangeReason:             record.ExchangeReason,
		ExchangeRemarks:            record.ExchangeRemarks,
		Operator:                   record.Operator,
		TotalExchangeQuantity:      math.Round(record.TotalExchangeQuantity*100) / 100,
		OldItemInboundConfirmedAt:  record.OldItemInboundConfirmedAt,
		OldItemInboundConfirmedBy:  record.OldItemInboundConfirmedBy,
		OldItemInboundTarget:       record.OldItemInboundTarget,
		OldItemInboundBatchNo:      record.OldItemInboundBatchNo,
		OldItemInboundRemarks:      record.OldItemInboundRemarks,
		ReplacementShippedAt:       record.ReplacementShippedAt,
		ReplacementShippedBy:       record.ReplacementShippedBy,
		ReplacementSourceCategory:  record.ReplacementSourceCategory,
		ReplacementBatchNo:         record.ReplacementBatchNo,
		ReplacementShipmentRemarks: record.ReplacementShipmentRemarks,
		CreatedAt:                  record.CreatedAt,
		UpdatedAt:                  record.UpdatedAt,
		Lines:                      lines,
		UnmatchedLabelCodes:        unmatched,
		InboundRecords:             []InventoryInboundRecordResponse{},
		ShipmentRecords:            []InventoryShipmentRecordResponse{},
	}
}

func MapSalesExchangesToResponse(items []models.SalesExchange) []SalesExchangeResponse {
	result := make([]SalesExchangeResponse, 0, len(items))
	for _, item := range items {
		result = append(result, MapSalesExchangeToResponse(item))
	}
	return result
}

func MapCreateSalesExchangeResultToResponse(result CreateSalesExchangeResult) CreateSalesExchangeResponse {
	return CreateSalesExchangeResponse{
		SalesExchange: MapSalesExchangeToResponse(result.SalesExchange),
		SalesOrder:    MapSalesOrderToResponse(result.SalesOrder),
	}
}

func MapConfirmSalesExchangeOldItemInboundResultToResponse(result ConfirmSalesExchangeOldItemInboundResult) ConfirmSalesExchangeOldItemInboundResponse {
	records := make([]InventoryInboundRecordResponse, 0, len(result.CreatedInboundRecords))
	for _, record := range result.CreatedInboundRecords {
		records = append(records, MapInboundRecordToResponse(record))
	}
	return ConfirmSalesExchangeOldItemInboundResponse{
		SalesExchange:         MapSalesExchangeToResponse(result.SalesExchange),
		CreatedInboundRecords: records,
	}
}

func MapConfirmSalesExchangeReplacementShipmentResultToResponse(result ConfirmSalesExchangeReplacementShipmentResult) ConfirmSalesExchangeReplacementShipmentResponse {
	records := make([]InventoryShipmentRecordResponse, 0, len(result.CreatedShipmentRecords))
	for _, record := range result.CreatedShipmentRecords {
		records = append(records, MapShipmentRecordToResponse(record))
	}
	return ConfirmSalesExchangeReplacementShipmentResponse{
		SalesExchange:          MapSalesExchangeToResponse(result.SalesExchange),
		CreatedShipmentRecords: records,
	}
}
