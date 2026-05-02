package services

import (
	"errors"
	"math"
	"sort"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func createReceiptRecordForSalesOrder(id string, req CreateReceiptRecordRequest, operator string) (CreateReceiptRecordResponse, error) {
	if req.Amount <= 0 {
		return CreateReceiptRecordResponse{}, ErrSettlementAmountInvalid
	}
	if err := validateSettlementAllocationRequests(req.Amount, req.Allocations); err != nil {
		return CreateReceiptRecordResponse{}, err
	}

	var response CreateReceiptRecordResponse
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		routeOrder, targets, err := resolveReceivableSettlementTargetsTx(tx, id, req.Allocations)
		if err != nil {
			return err
		}

		record := models.ReceiptRecord{
			BaseModel:      models.BaseModel{ID: uuid.NewString()},
			RecordNo:       buildSettlementRecordNo("RCV"),
			LedgerID:       routeOrder.ID,
			SalesOrderID:   routeOrder.ID,
			Amount:         req.Amount,
			Currency:       normalizeSettlementCurrency(req.Currency, routeOrder.Currency),
			PaymentMethod:  strings.TrimSpace(req.PaymentMethod),
			PaymentTerm:    strings.TrimSpace(req.PaymentTerm),
			RecordDate:     strings.TrimSpace(req.RecordDate),
			ReceivedAt:     strings.TrimSpace(req.ReceivedAt),
			ReceiptAccount: strings.TrimSpace(req.ReceiptAccount),
			Status:         models.SettlementRecordStatusConfirmed,
			Operator:       operator,
			ReferenceNo:    strings.TrimSpace(req.ReferenceNo),
		}
		if err := tx.Create(&record).Error; err != nil {
			return err
		}

		allocations, err := createReceivableOrderAllocationsTx(tx, record, targets)
		if err != nil {
			return err
		}
		loaded, err := getReceivableOrderByIDTx(tx, routeOrder.ID)
		if err != nil {
			return err
		}
		response = CreateReceiptRecordResponse{
			Ledger:      loaded,
			Record:      mapReceiptRecord(record),
			Allocations: allocations,
		}
		return nil
	})
	return response, err
}

func resolveReceivableSettlementTargetsTx(tx *gorm.DB, routeID string, requests []SettlementAllocationRequest) (models.SalesOrder, []receivableAllocationTarget, error) {
	uniqueIDs := make(map[string]struct{}, len(requests)+1)
	routeID = strings.TrimSpace(routeID)
	if routeID != "" {
		uniqueIDs[routeID] = struct{}{}
	}
	for _, request := range requests {
		id := strings.TrimSpace(request.LedgerID)
		if id != "" {
			uniqueIDs[id] = struct{}{}
		}
	}
	ordersByID, lockedOrders, err := lockReceivableSalesOrdersByIDTx(tx, uniqueIDs)
	if err != nil {
		return models.SalesOrder{}, nil, err
	}
	routeOrder, ok := ordersByID[routeID]
	if !ok {
		return models.SalesOrder{}, nil, ErrReceivableLedgerNotFound
	}

	targets := make([]receivableAllocationTarget, 0, len(requests))
	for _, item := range requests {
		order, ok := ordersByID[strings.TrimSpace(item.LedgerID)]
		if !ok {
			return models.SalesOrder{}, nil, ErrReceivableLedgerNotFound
		}
		targets = append(targets, receivableAllocationTarget{request: item, orderID: order.ID})
	}
	bundle, err := loadReceivableSettlementBundle(tx, lockedOrders)
	if err != nil {
		return models.SalesOrder{}, nil, err
	}
	remaining := make(map[string]float64, len(lockedOrders))
	for _, order := range lockedOrders {
		_, outstanding := calculateReceivableAmounts(order, bundle)
		remaining[order.ID] = outstanding
		if isReceivableOrderNotAllocatable(order, outstanding) {
			return models.SalesOrder{}, nil, ErrSettlementLedgerStatusInvalid
		}
	}
	for _, target := range targets {
		if target.request.AllocatedAmount > remaining[target.orderID] {
			return models.SalesOrder{}, nil, ErrSettlementAllocationOverflow
		}
		remaining[target.orderID] = math.Round((remaining[target.orderID]-target.request.AllocatedAmount)*100) / 100
	}
	return routeOrder, targets, nil
}

func resolveReceivableSalesOrderForUpdateTx(tx *gorm.DB, id string) (models.SalesOrder, error) {
	id = strings.TrimSpace(id)
	var order models.SalesOrder
	if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ? AND LOWER(COALESCE(status, '')) <> LOWER(?)", id, "Canceled").
		First(&order).Error; err != nil {
		return models.SalesOrder{}, err
	}
	return order, nil
}

func lockReceivableSalesOrdersByIDTx(tx *gorm.DB, ids map[string]struct{}) (map[string]models.SalesOrder, []models.SalesOrder, error) {
	orderedIDs := make([]string, 0, len(ids))
	for id := range ids {
		orderedIDs = append(orderedIDs, id)
	}
	sort.Strings(orderedIDs)

	ordersByID := make(map[string]models.SalesOrder, len(orderedIDs))
	orders := make([]models.SalesOrder, 0, len(orderedIDs))
	for _, id := range orderedIDs {
		order, err := resolveReceivableSalesOrderForUpdateTx(tx, id)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, nil, ErrReceivableLedgerNotFound
			}
			return nil, nil, err
		}
		ordersByID[order.ID] = order
		orders = append(orders, order)
	}
	return ordersByID, orders, nil
}

func createReceivableOrderAllocationsTx(tx *gorm.DB, record models.ReceiptRecord, targets []receivableAllocationTarget) ([]SettlementAllocationResponse, error) {
	operator := record.Operator
	responses := make([]SettlementAllocationResponse, 0, len(targets))
	for index, target := range targets {
		allocation := models.SettlementAllocation{
			BaseModel:       models.BaseModel{ID: uuid.NewString()},
			LedgerID:        target.orderID,
			SalesOrderID:    target.orderID,
			ReceiptRecordID: record.ID,
			AllocatedAmount: target.request.AllocatedAmount,
			SequenceNo:      normalizeSequenceNo(target.request.SequenceNo, index),
			Remark:          strings.TrimSpace(target.request.Remark),
			Operator:        operator,
		}
		if err := tx.Create(&allocation).Error; err != nil {
			return nil, err
		}
		responses = append(responses, mapSettlementAllocation(allocation))
	}
	return responses, nil
}
