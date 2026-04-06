package services

import "xdfc-server/models"

func mapClearingEntryToResponse(entry models.ClearingEntry) ClearingEntryResponse {
	return ClearingEntryResponse{
		ID:          entry.ID,
		CreatedAt:   entry.CreatedAt,
		UpdatedAt:   entry.UpdatedAt,
		VoucherID:   entry.VoucherID,
		LineNo:      entry.LineNo,
		EntryType:   entry.EntryType,
		AccountCode: entry.AccountCode,
		Amount:      entry.Amount,
		Memo:        entry.Memo,
	}
}

func MapFinancialVoucherToResponse(voucher models.FinancialVoucher) FinancialVoucherResponse {
	entries := make([]ClearingEntryResponse, 0, len(voucher.Entries))
	for _, entry := range voucher.Entries {
		entries = append(entries, mapClearingEntryToResponse(entry))
	}
	return FinancialVoucherResponse{
		ID:          voucher.ID,
		CreatedAt:   voucher.CreatedAt,
		UpdatedAt:   voucher.UpdatedAt,
		VoucherNo:   voucher.VoucherNo,
		SourceType:  voucher.SourceType,
		SourceRefID: voucher.SourceRefID,
		Currency:    voucher.Currency,
		TotalAmount: voucher.TotalAmount,
		Status:      voucher.Status,
		Entries:     entries,
	}
}

func MapFinancialVouchersToResponse(vouchers []models.FinancialVoucher) []FinancialVoucherResponse {
	items := make([]FinancialVoucherResponse, 0, len(vouchers))
	for _, voucher := range vouchers {
		items = append(items, MapFinancialVoucherToResponse(voucher))
	}
	return items
}
