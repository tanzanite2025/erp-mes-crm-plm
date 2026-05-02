package services

import "xdfc-server/models"

type receivableOrderSettlementBundle struct {
	recordsByOrderID                map[string][]models.ReceiptRecord
	allocationsByOrderID            map[string][]models.SettlementAllocation
	receivedAmountByOrderID         map[string]float64
	actualAmountRecordsByOrderID    map[string][]models.SalesReturnActualAmountRecord
	actualAmountAdjustmentByOrderID map[string]float64
}

type receivableAllocationTarget struct {
	request SettlementAllocationRequest
	orderID string
}

func ListReceivableLedgers(query ReceivableLedgerQuery) (ReceivableLedgerListResponse, error) {
	return listReceivableOrders(query)
}

func SearchReceivableLedgers(query LedgerSearchQuery) (LedgerSearchResponse, error) {
	return searchReceivableOrders(query)
}

func GetReceivableLedgerByID(id string) (ReceivableLedgerDetailResponse, error) {
	return getReceivableOrderByID(id)
}

func CreateReceiptRecord(ledgerID string, req CreateReceiptRecordRequest, operator string) (CreateReceiptRecordResponse, error) {
	return createReceiptRecordForSalesOrder(ledgerID, req, operator)
}
