package services

import (
	"math"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"gorm.io/gorm"
)

func getReceivableOrderByID(id string) (ReceivableLedgerDetailResponse, error) {
	return getReceivableOrderByIDTx(db.DB, id)
}

func getReceivableOrderByIDTx(tx *gorm.DB, id string) (ReceivableLedgerDetailResponse, error) {
	order, err := resolveReceivableSalesOrderTx(tx, id)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return ReceivableLedgerDetailResponse{}, ErrReceivableLedgerNotFound
		}
		return ReceivableLedgerDetailResponse{}, err
	}
	bundle, err := loadReceivableSettlementBundle(tx, []models.SalesOrder{order})
	if err != nil {
		return ReceivableLedgerDetailResponse{}, err
	}
	return buildReceivableDetail(order, bundle), nil
}

func loadReceivableSettlementBundle(tx *gorm.DB, orders []models.SalesOrder) (receivableOrderSettlementBundle, error) {
	bundle := receivableOrderSettlementBundle{
		recordsByOrderID:                make(map[string][]models.ReceiptRecord),
		allocationsByOrderID:            make(map[string][]models.SettlementAllocation),
		receivedAmountByOrderID:         make(map[string]float64),
		actualAmountRecordsByOrderID:    make(map[string][]models.SalesReturnActualAmountRecord),
		actualAmountAdjustmentByOrderID: make(map[string]float64),
	}
	if len(orders) == 0 {
		return bundle, nil
	}
	orderIDs := make([]string, 0, len(orders))
	for _, order := range orders {
		orderIDs = append(orderIDs, order.ID)
	}

	var actualAmountRecords []models.SalesReturnActualAmountRecord
	if err := tx.Where("sales_order_id IN ?", orderIDs).Order("recorded_at desc, created_at desc").Find(&actualAmountRecords).Error; err != nil {
		return bundle, err
	}
	for _, record := range actualAmountRecords {
		orderID := strings.TrimSpace(record.SalesOrderID)
		if orderID == "" {
			continue
		}
		bundle.actualAmountRecordsByOrderID[orderID] = append(bundle.actualAmountRecordsByOrderID[orderID], record)
		bundle.actualAmountAdjustmentByOrderID[orderID] = math.Round((bundle.actualAmountAdjustmentByOrderID[orderID]+record.Amount)*100) / 100
	}

	var allocations []models.SettlementAllocation
	if err := tx.Where("sales_order_id IN ?", orderIDs).Find(&allocations).Error; err != nil {
		return bundle, err
	}

	recordIDSet := make(map[string]struct{})
	for _, allocation := range allocations {
		orderID := strings.TrimSpace(allocation.SalesOrderID)
		if orderID == "" {
			continue
		}
		allocation.LedgerID = orderID
		bundle.allocationsByOrderID[orderID] = append(bundle.allocationsByOrderID[orderID], allocation)
		bundle.receivedAmountByOrderID[orderID] += allocation.AllocatedAmount
		if strings.TrimSpace(allocation.ReceiptRecordID) != "" {
			recordIDSet[strings.TrimSpace(allocation.ReceiptRecordID)] = struct{}{}
		}
	}

	var directRecords []models.ReceiptRecord
	if err := tx.Preload("Evidences.Asset").Where("sales_order_id IN ?", orderIDs).Find(&directRecords).Error; err != nil {
		return bundle, err
	}
	for _, record := range directRecords {
		recordIDSet[record.ID] = struct{}{}
	}

	recordIDs := make([]string, 0, len(recordIDSet))
	for id := range recordIDSet {
		recordIDs = append(recordIDs, id)
	}
	if len(recordIDs) == 0 {
		return bundle, nil
	}

	var records []models.ReceiptRecord
	if err := tx.Preload("Evidences.Asset").Where("id IN ?", recordIDs).Find(&records).Error; err != nil {
		return bundle, err
	}
	recordMap := make(map[string]models.ReceiptRecord, len(records))
	for _, record := range records {
		recordMap[record.ID] = record
		orderID := strings.TrimSpace(record.SalesOrderID)
		if orderID != "" {
			record.LedgerID = orderID
			bundle.recordsByOrderID[orderID] = append(bundle.recordsByOrderID[orderID], record)
		}
	}
	for orderID, orderAllocations := range bundle.allocationsByOrderID {
		seen := make(map[string]struct{}, len(bundle.recordsByOrderID[orderID]))
		for _, record := range bundle.recordsByOrderID[orderID] {
			seen[record.ID] = struct{}{}
		}
		for _, allocation := range orderAllocations {
			record, ok := recordMap[strings.TrimSpace(allocation.ReceiptRecordID)]
			if !ok {
				continue
			}
			if _, exists := seen[record.ID]; exists {
				continue
			}
			record.LedgerID = orderID
			bundle.recordsByOrderID[orderID] = append(bundle.recordsByOrderID[orderID], record)
			seen[record.ID] = struct{}{}
		}
	}
	return bundle, nil
}

func resolveReceivableSalesOrderTx(tx *gorm.DB, id string) (models.SalesOrder, error) {
	id = strings.TrimSpace(id)
	var order models.SalesOrder
	if err := tx.Where("id = ? AND is_deleted = ? AND LOWER(COALESCE(status, '')) <> LOWER(?)", id, false, "Canceled").First(&order).Error; err != nil {
		return models.SalesOrder{}, err
	}
	return order, nil
}
