package services

import (
	"strings"
	"xdfc-server/models"
)

func buildReceivableListItem(order models.SalesOrder, bundle receivableOrderSettlementBundle) ReceivableLedgerListItemResponse {
	received, outstanding := calculateReceivableAmounts(order, bundle)
	status := deriveReceivableOrderStatus(order, outstanding, received)
	return ReceivableLedgerListItemResponse{
		ID:                order.ID,
		DocumentNo:        resolveReceivableDocumentNo(order),
		CustomerName:      order.CustomerName,
		Currency:          normalizeSettlementCurrency(order.Currency, "CNY"),
		OrderAmount:       order.Amount,
		ReceivedAmount:    received,
		OutstandingAmount: outstanding,
		DueDate:           resolveReceivableDueDate(order),
		AgingBucket:       deriveReceivableAgingBucket(status),
		Status:            status,
		CreatedAt:         order.CreatedAt,
		UpdatedAt:         order.UpdatedAt,
	}
}

func buildReceivableSearchItem(order models.SalesOrder, bundle receivableOrderSettlementBundle) LedgerSearchCandidateResponse {
	item := buildReceivableListItem(order, bundle)
	return LedgerSearchCandidateResponse{ID: item.ID, DocumentNo: item.DocumentNo, PartnerName: item.CustomerName, OutstandingAmount: item.OutstandingAmount, Status: item.Status, Currency: item.Currency}
}

func buildReceivableDetail(order models.SalesOrder, bundle receivableOrderSettlementBundle) ReceivableLedgerDetailResponse {
	item := buildReceivableListItem(order, bundle)
	records := bundle.recordsByOrderID[order.ID]
	allocations := bundle.allocationsByOrderID[order.ID]
	actualAmountRecords := bundle.actualAmountRecordsByOrderID[order.ID]
	mappedRecords := make([]ReceiptRecordResponse, 0, len(records))
	for _, record := range records {
		record.LedgerID = order.ID
		mappedRecords = append(mappedRecords, mapReceiptRecord(record))
	}
	mappedAllocations := make([]SettlementAllocationResponse, 0, len(allocations))
	for _, allocation := range allocations {
		allocation.LedgerID = order.ID
		mappedAllocations = append(mappedAllocations, mapSettlementAllocation(allocation))
	}
	mappedActualAmountRecords := make([]SalesReturnActualAmountRecordResponse, 0, len(actualAmountRecords))
	for _, record := range actualAmountRecords {
		mappedActualAmountRecords = append(mappedActualAmountRecords, mapSalesReturnActualAmountRecordToResponse(record))
	}
	return ReceivableLedgerDetailResponse{
		ID:                             order.ID,
		DocumentNo:                     item.DocumentNo,
		SourceType:                     "SALES_ORDER",
		SourceRefID:                    order.ID,
		CustomerID:                     order.CustomerID,
		CustomerName:                   order.CustomerName,
		Currency:                       item.Currency,
		OrderAmount:                    item.OrderAmount,
		ReceivedAmount:                 item.ReceivedAmount,
		OutstandingAmount:              item.OutstandingAmount,
		DueDate:                        item.DueDate,
		AgingBucket:                    item.AgingBucket,
		Status:                         item.Status,
		Version:                        order.Version,
		CreatedAt:                      order.CreatedAt,
		UpdatedAt:                      order.UpdatedAt,
		ReceiptRecords:                 mappedRecords,
		Allocations:                    mappedAllocations,
		ReturnAdjustmentAmount:         bundle.actualAmountAdjustmentByOrderID[order.ID],
		SalesReturnActualAmountRecords: mappedActualAmountRecords,
	}
}

func resolveReceivableDocumentNo(order models.SalesOrder) string {
	if strings.TrimSpace(order.OrderNo) != "" {
		return strings.TrimSpace(order.OrderNo)
	}
	return strings.TrimSpace(order.Barcode)
}

func resolveReceivableDueDate(order models.SalesOrder) string {
	if strings.TrimSpace(order.DeliveryDate) != "" {
		return strings.TrimSpace(order.DeliveryDate)
	}
	return strings.TrimSpace(order.OrderDate)
}
