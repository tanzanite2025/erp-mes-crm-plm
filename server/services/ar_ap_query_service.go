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

var (
	ErrReceivableLedgerNotFound        = errors.New("receivable ledger not found")
	ErrPayableLedgerNotFound           = errors.New("payable ledger not found")
	ErrSettlementAmountInvalid         = errors.New("settlement amount must be greater than zero")
	ErrSettlementAllocationsRequired   = errors.New("settlement allocations are required")
	ErrSettlementAllocationSumMismatch = errors.New("settlement allocation sum mismatch")
	ErrSettlementAllocationOverflow    = errors.New("settlement allocation exceeds outstanding amount")
	ErrSettlementLedgerStatusInvalid   = errors.New("settlement target ledger status invalid")
)

var ledgerSearchSortColumns = map[string]string{
	"updated_at":         "updated_at",
	"outstanding_amount": "outstanding_amount",
	"ledger_no":          "ledger_no",
}

func CreatePaymentRecord(ledgerID string, req CreatePaymentRecordRequest) (CreatePaymentRecordResponse, error) {
	if req.Amount <= 0 {
		return CreatePaymentRecordResponse{}, ErrSettlementAmountInvalid
	}
	if err := validateSettlementAllocationRequests(req.Amount, req.Allocations); err != nil {
		return CreatePaymentRecordResponse{}, err
	}

	var response CreatePaymentRecordResponse
	err := db.DB.Transaction(func(tx *gorm.DB) error {
		record := models.PaymentRecord{
			BaseModel:     models.BaseModel{ID: uuid.NewString()},
			RecordNo:      buildSettlementRecordNo("PAY"),
			LedgerID:      strings.TrimSpace(ledgerID),
			Amount:        req.Amount,
			Currency:      normalizeSettlementCurrency(req.Currency, "CNY"),
			PaymentMethod: strings.TrimSpace(req.PaymentMethod),
			PaymentTerm:   strings.TrimSpace(req.PaymentTerm),
			RecordDate:    strings.TrimSpace(req.RecordDate),
			Status:        models.SettlementRecordStatusConfirmed,
			ReferenceNo:   strings.TrimSpace(req.ReferenceNo),
		}
		if err := tx.Create(&record).Error; err != nil {
			return err
		}

		allocations, primaryLedgerID, err := createPayableAllocationsTx(tx, record, req.Allocations)
		if err != nil {
			return err
		}

		loaded, err := reloadPayableLedgerDetailTx(tx, primaryLedgerID)
		if err != nil {
			return err
		}
		response = CreatePaymentRecordResponse{
			Ledger:      loaded,
			Record:      mapPaymentRecord(record),
			Allocations: allocations,
		}
		return nil
	})
	return response, err
}

func ListPayableLedgers(query PayableLedgerQuery) (PayableLedgerListResponse, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 50
	}

	status := strings.ToUpper(strings.TrimSpace(query.Status))
	baseQuery := db.DB.Model(&models.PayableLedger{})
	if status != "" {
		baseQuery = baseQuery.Where("status = ?", status)
	}

	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		return PayableLedgerListResponse{}, err
	}

	var items []models.PayableLedger
	if err := baseQuery.Order("created_at desc").Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return PayableLedgerListResponse{}, err
	}

	summary, err := summarizePayableLedgers(status)
	if err != nil {
		return PayableLedgerListResponse{}, err
	}

	return PayableLedgerListResponse{
		Items:    mapPayableLedgerListItems(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
		Summary:  summary,
	}, nil
}

func SearchPayableLedgers(query LedgerSearchQuery) (LedgerSearchResponse, error) {
	page := query.Page
	pageSize := query.PageSize
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 20
	}
	status := strings.ToUpper(strings.TrimSpace(query.Status))
	currency := strings.ToUpper(strings.TrimSpace(query.Currency))
	keyword := strings.TrimSpace(query.Keyword)

	baseQuery := db.DB.Model(&models.PayableLedger{})
	if status != "" {
		baseQuery = baseQuery.Where("status = ?", status)
	}
	if currency != "" {
		baseQuery = baseQuery.Where("currency = ?", currency)
	}
	if query.OutstandingMin > 0 {
		baseQuery = baseQuery.Where("outstanding_amount >= ?", query.OutstandingMin)
	}
	if query.OutstandingMax > 0 {
		baseQuery = baseQuery.Where("outstanding_amount <= ?", query.OutstandingMax)
	}
	if keyword != "" {
		likeKeyword := "%" + keyword + "%"
		baseQuery = baseQuery.Where("ledger_no LIKE ? OR supplier_name LIKE ?", likeKeyword, likeKeyword)
	}
	baseQuery = baseQuery.Order(buildLedgerSearchOrderClause(query.SortBy, query.SortOrder))

	var total int64
	if err := baseQuery.Count(&total).Error; err != nil {
		return LedgerSearchResponse{}, err
	}

	var items []models.PayableLedger
	if err := baseQuery.Limit(pageSize).Offset((page - 1) * pageSize).Find(&items).Error; err != nil {
		return LedgerSearchResponse{}, err
	}

	return LedgerSearchResponse{
		Items:    mapPayableLedgerSearchItems(items),
		Total:    total,
		Page:     page,
		PageSize: pageSize,
	}, nil
}

func GetPayableLedgerByID(id string) (PayableLedgerDetailResponse, error) {
	var ledger models.PayableLedger
	err := db.DB.Preload("PaymentRecords.Evidences.Asset").Preload("SettlementMappings").First(&ledger, "id = ?", strings.TrimSpace(id)).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return PayableLedgerDetailResponse{}, ErrPayableLedgerNotFound
	}
	if err != nil {
		return PayableLedgerDetailResponse{}, err
	}
	return mapPayableLedgerDetail(ledger), nil
}

func buildLedgerSearchOrderClause(sortBy string, sortOrder string) string {
	column, ok := ledgerSearchSortColumns[strings.ToLower(strings.TrimSpace(sortBy))]
	if !ok {
		column = "updated_at"
	}
	order := strings.ToLower(strings.TrimSpace(sortOrder))
	if order != "asc" {
		order = "desc"
	}
	return column + " " + order
}

func summarizePayableLedgers(status string) (PayableSummaryResponse, error) {
	baseQuery := db.DB.Model(&models.PayableLedger{})
	if status != "" {
		baseQuery = baseQuery.Where("status = ?", status)
	}

	var ledgers []models.PayableLedger
	if err := baseQuery.Find(&ledgers).Error; err != nil {
		return PayableSummaryResponse{}, err
	}

	summary := PayableSummaryResponse{}
	for _, item := range ledgers {
		summary.TotalPayable += item.OutstandingAmount
		if strings.EqualFold(item.Status, models.LedgerStatusOverdue) {
			summary.OverduePayable += item.OutstandingAmount
		}
		if item.OutstandingAmount > 0 {
			summary.PendingPaymentCount++
		}
	}
	return summary, nil
}

func mapPayableLedgerListItems(items []models.PayableLedger) []PayableLedgerListItemResponse {
	if len(items) == 0 {
		return make([]PayableLedgerListItemResponse, 0)
	}
	result := make([]PayableLedgerListItemResponse, 0, len(items))
	for _, item := range items {
		result = append(result, PayableLedgerListItemResponse{
			ID:                item.ID,
			DocumentNo:        item.LedgerNo,
			SupplierName:      item.SupplierName,
			Currency:          item.Currency,
			InvoiceAmount:     item.OriginalAmount,
			PaidAmount:        item.SettledAmount,
			OutstandingAmount: item.OutstandingAmount,
			DueDate:           item.DueDate,
			AgingBucket:       deriveLedgerAgingBucket(item.Status),
			Status:            item.Status,
			CreatedAt:         item.CreatedAt,
			UpdatedAt:         item.UpdatedAt,
		})
	}
	return result
}

func mapPayableLedgerSearchItems(items []models.PayableLedger) []LedgerSearchCandidateResponse {
	if len(items) == 0 {
		return make([]LedgerSearchCandidateResponse, 0)
	}
	result := make([]LedgerSearchCandidateResponse, 0, len(items))
	for _, item := range items {
		result = append(result, LedgerSearchCandidateResponse{
			ID:                item.ID,
			DocumentNo:        item.LedgerNo,
			PartnerName:       item.SupplierName,
			OutstandingAmount: item.OutstandingAmount,
			Status:            item.Status,
			Currency:          item.Currency,
		})
	}
	return result
}

func deriveLedgerAgingBucket(status string) string {
	if strings.EqualFold(status, models.LedgerStatusSettled) {
		return models.LedgerAgingBucketSettled
	}
	if strings.EqualFold(status, models.LedgerStatusOverdue) {
		return models.LedgerAgingBucketOverdue
	}
	return models.LedgerAgingBucketOpen
}

func mapSettlementAllocation(item models.SettlementAllocation) SettlementAllocationResponse {
	return SettlementAllocationResponse{
		ID:              item.ID,
		LedgerID:        item.LedgerID,
		ReceiptRecordID: item.ReceiptRecordID,
		PaymentRecordID: item.PaymentRecordID,
		AllocatedAmount: item.AllocatedAmount,
		SequenceNo:      item.SequenceNo,
		Remark:          item.Remark,
		Operator:        item.Operator,
		CreatedAt:       item.CreatedAt,
		UpdatedAt:       item.UpdatedAt,
	}
}

func mapReceiptRecord(item models.ReceiptRecord) ReceiptRecordResponse {
	evidences := make([]SettlementRecordEvidenceResponse, 0, len(item.Evidences))
	for _, evidence := range item.Evidences {
		evidences = append(evidences, mapSettlementRecordEvidence(evidence))
	}
	return ReceiptRecordResponse{
		ID:             item.ID,
		RecordNo:       item.RecordNo,
		LedgerID:       item.LedgerID,
		Amount:         item.Amount,
		Currency:       item.Currency,
		PaymentMethod:  item.PaymentMethod,
		PaymentTerm:    item.PaymentTerm,
		RecordDate:     item.RecordDate,
		ReceivedAt:     item.ReceivedAt,
		ReceiptAccount: item.ReceiptAccount,
		Status:         item.Status,
		ReferenceNo:    item.ReferenceNo,
		CreatedAt:      item.CreatedAt,
		UpdatedAt:      item.UpdatedAt,
		Evidences:      evidences,
	}
}

func mapPaymentRecord(item models.PaymentRecord) PaymentRecordResponse {
	evidences := make([]SettlementRecordEvidenceResponse, 0, len(item.Evidences))
	for _, evidence := range item.Evidences {
		evidences = append(evidences, mapSettlementRecordEvidence(evidence))
	}
	return PaymentRecordResponse{
		ID:            item.ID,
		RecordNo:      item.RecordNo,
		LedgerID:      item.LedgerID,
		Amount:        item.Amount,
		Currency:      item.Currency,
		PaymentMethod: item.PaymentMethod,
		PaymentTerm:   item.PaymentTerm,
		RecordDate:    item.RecordDate,
		Status:        item.Status,
		ReferenceNo:   item.ReferenceNo,
		CreatedAt:     item.CreatedAt,
		UpdatedAt:     item.UpdatedAt,
		Evidences:     evidences,
	}
}

func validateSettlementAllocationRequests(amount float64, allocations []SettlementAllocationRequest) error {
	if len(allocations) == 0 {
		return ErrSettlementAllocationsRequired
	}
	total := 0.0
	for _, item := range allocations {
		if item.AllocatedAmount <= 0 {
			return ErrSettlementAmountInvalid
		}
		if strings.TrimSpace(item.LedgerID) == "" {
			return ErrSettlementAllocationsRequired
		}
		total += item.AllocatedAmount
	}
	if math.Abs(total-amount) > 0.000001 {
		return ErrSettlementAllocationSumMismatch
	}
	return nil
}

func createPayableAllocationsTx(tx *gorm.DB, record models.PaymentRecord, requests []SettlementAllocationRequest) ([]SettlementAllocationResponse, string, error) {
	responses := make([]SettlementAllocationResponse, 0, len(requests))
	primaryLedgerID := strings.TrimSpace(requests[0].LedgerID)
	ledgersByID, err := lockPayableLedgersByIDTx(tx, requests)
	if err != nil {
		return nil, "", err
	}
	for index, item := range requests {
		ledgerID := strings.TrimSpace(item.LedgerID)
		ledger, ok := ledgersByID[ledgerID]
		if !ok {
			return nil, "", ErrPayableLedgerNotFound
		}
		if isLedgerNotAllocatable(ledger.Status) {
			return nil, "", ErrSettlementLedgerStatusInvalid
		}
		if item.AllocatedAmount > ledger.OutstandingAmount {
			return nil, "", ErrSettlementAllocationOverflow
		}

		allocation := models.SettlementAllocation{
			BaseModel:       models.BaseModel{ID: uuid.NewString()},
			LedgerID:        ledger.ID,
			ReceiptRecordID: "",
			PaymentRecordID: record.ID,
			AllocatedAmount: item.AllocatedAmount,
			SequenceNo:      normalizeSequenceNo(item.SequenceNo, index),
			Remark:          strings.TrimSpace(item.Remark),
			Operator:        "system",
		}
		if err := tx.Create(&allocation).Error; err != nil {
			return nil, "", err
		}

		applySettlementToPayableLedger(&ledger, item.AllocatedAmount)
		if err := tx.Save(&ledger).Error; err != nil {
			return nil, "", err
		}
		ledgersByID[ledgerID] = ledger

		responses = append(responses, mapSettlementAllocation(allocation))
	}
	if err := tx.Model(&models.PaymentRecord{}).Where("id = ?", record.ID).Update("ledger_id", primaryLedgerID).Error; err != nil {
		return nil, "", err
	}
	return responses, primaryLedgerID, nil
}

func lockPayableLedgersByIDTx(tx *gorm.DB, requests []SettlementAllocationRequest) (map[string]models.PayableLedger, error) {
	uniqueIDs := make(map[string]struct{}, len(requests))
	for _, item := range requests {
		id := strings.TrimSpace(item.LedgerID)
		if id != "" {
			uniqueIDs[id] = struct{}{}
		}
	}
	orderedIDs := make([]string, 0, len(uniqueIDs))
	for id := range uniqueIDs {
		orderedIDs = append(orderedIDs, id)
	}
	sort.Strings(orderedIDs)

	ledgersByID := make(map[string]models.PayableLedger, len(orderedIDs))
	for _, id := range orderedIDs {
		var ledger models.PayableLedger
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&ledger, "id = ?", id).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, ErrPayableLedgerNotFound
			}
			return nil, err
		}
		ledgersByID[ledger.ID] = ledger
	}
	return ledgersByID, nil
}

func isLedgerNotAllocatable(status string) bool {
	return strings.EqualFold(status, models.LedgerStatusSettled) ||
		strings.EqualFold(status, models.LedgerStatusVoided) ||
		strings.EqualFold(status, models.LedgerStatusCancelled)
}

func normalizeSequenceNo(value int, index int) int {
	if value > 0 {
		return value
	}
	return index + 1
}

func applySettlementToPayableLedger(ledger *models.PayableLedger, amount float64) {
	ledger.SettledAmount += amount
	ledger.OutstandingAmount -= amount
	if ledger.OutstandingAmount < 0 {
		ledger.OutstandingAmount = 0
	}
	ledger.Status = deriveLedgerStatus(ledger.OutstandingAmount, ledger.Status)
	ledger.Version++
}

func deriveLedgerStatus(outstandingAmount float64, current string) string {
	if outstandingAmount <= 0 {
		return models.LedgerStatusSettled
	}
	if strings.EqualFold(current, models.LedgerStatusOverdue) {
		return models.LedgerStatusOverdue
	}
	return models.LedgerStatusPartial
}

func normalizeSettlementCurrency(input string, fallback string) string {
	value := strings.TrimSpace(input)
	if value != "" {
		return value
	}
	value = strings.TrimSpace(fallback)
	if value != "" {
		return value
	}
	return "CNY"
}

func buildSettlementRecordNo(prefix string) string {
	return prefix + "-" + strings.ToUpper(uuid.NewString()[:8])
}

func reloadPayableLedgerDetailTx(tx *gorm.DB, id string) (PayableLedgerDetailResponse, error) {
	var ledger models.PayableLedger
	if err := tx.Preload("PaymentRecords.Evidences.Asset").Preload("SettlementMappings").First(&ledger, "id = ?", id).Error; err != nil {
		return PayableLedgerDetailResponse{}, err
	}
	return mapPayableLedgerDetail(ledger), nil
}

func mapPayableLedgerDetail(item models.PayableLedger) PayableLedgerDetailResponse {
	records := make([]PaymentRecordResponse, 0, len(item.PaymentRecords))
	for _, record := range item.PaymentRecords {
		records = append(records, mapPaymentRecord(record))
	}
	allocations := make([]SettlementAllocationResponse, 0, len(item.SettlementMappings))
	for _, allocation := range item.SettlementMappings {
		allocations = append(allocations, mapSettlementAllocation(allocation))
	}
	return PayableLedgerDetailResponse{
		ID:                item.ID,
		DocumentNo:        item.LedgerNo,
		SourceType:        item.SourceType,
		SourceRefID:       item.SourceRefID,
		SupplierID:        item.SupplierID,
		SupplierName:      item.SupplierName,
		Currency:          item.Currency,
		InvoiceAmount:     item.OriginalAmount,
		PaidAmount:        item.SettledAmount,
		OutstandingAmount: item.OutstandingAmount,
		DueDate:           item.DueDate,
		AgingBucket:       deriveLedgerAgingBucket(item.Status),
		Status:            item.Status,
		Version:           item.Version,
		CreatedAt:         item.CreatedAt,
		UpdatedAt:         item.UpdatedAt,
		PaymentRecords:    records,
		Allocations:       allocations,
	}
}
