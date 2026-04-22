package services

import (
	"math"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func createReceiptRecordForSalesOrder(id string, req CreateReceiptRecordRequest) (CreateReceiptRecordResponse, error) {
	if req.Amount <= 0 {
		return CreateReceiptRecordResponse{}, ErrSettlementAmountInvalid
	}
	if err := validateSettlementAllocationRequests(req.Amount, req.Allocations); err != nil {
		return CreateReceiptRecordResponse{}, err
	}

	var response CreateReceiptRecordResponse
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		routeOrder, err := resolveReceivableSalesOrderTx(tx, id)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return ErrReceivableLedgerNotFound
			}
			return err
		}
		targets, err := resolveReceivableAllocationTargetsTx(tx, req.Allocations)
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

func resolveReceivableAllocationTargetsTx(tx *gorm.DB, requests []SettlementAllocationRequest) ([]receivableAllocationTarget, error) {
	targets := make([]receivableAllocationTarget, 0, len(requests))
	uniqueOrders := make(map[string]models.SalesOrder)
	for _, item := range requests {
		order, err := resolveReceivableSalesOrderTx(tx, item.LedgerID)
		if err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, ErrReceivableLedgerNotFound
			}
			return nil, err
		}
		uniqueOrders[order.ID] = order
		targets = append(targets, receivableAllocationTarget{request: item, orderID: order.ID})
	}
	orders := make([]models.SalesOrder, 0, len(uniqueOrders))
	for _, order := range uniqueOrders {
		orders = append(orders, order)
	}
	bundle, err := loadReceivableSettlementBundle(tx, orders)
	if err != nil {
		return nil, err
	}
	remaining := make(map[string]float64, len(orders))
	for _, order := range orders {
		_, outstanding := calculateReceivableAmounts(order, bundle)
		remaining[order.ID] = outstanding
		if isReceivableOrderNotAllocatable(order, outstanding) {
			return nil, ErrSettlementLedgerStatusInvalid
		}
	}
	for _, target := range targets {
		if target.request.AllocatedAmount > remaining[target.orderID] {
			return nil, ErrSettlementAllocationOverflow
		}
		remaining[target.orderID] = math.Round((remaining[target.orderID]-target.request.AllocatedAmount)*100) / 100
	}
	return targets, nil
}

func createReceivableOrderAllocationsTx(tx *gorm.DB, record models.ReceiptRecord, targets []receivableAllocationTarget) ([]SettlementAllocationResponse, error) {
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
		}
		if err := tx.Create(&allocation).Error; err != nil {
			return nil, err
		}
		responses = append(responses, mapSettlementAllocation(allocation))
	}
	return responses, nil
}
