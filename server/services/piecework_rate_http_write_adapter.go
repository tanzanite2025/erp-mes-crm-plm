package services

import (
	"context"
	"fmt"
	"strings"
)

// HTTP writes require the independent payroll contract.
type PieceworkRateHTTPWriteRequest struct {
	ID            string   `json:"id"`
	PayItemID     string   `json:"payItemId"`
	Unit          string   `json:"unit"`
	UnitPrice     *float64 `json:"unitPrice"`
	Currency      string   `json:"currency"`
	EffectiveFrom string   `json:"effectiveFrom"`
	EffectiveTo   string   `json:"effectiveTo"`
	Status        string   `json:"status"`
	Remarks       string   `json:"remarks"`
	Version       int64    `json:"version"`
}

func SavePieceworkRateFromHTTPRequest(ctx context.Context, input PieceworkRateHTTPWriteRequest) (PieceworkRateDTO, error) {
	return savePieceworkRateFromHTTPRequest(ctx, defaultPieceworkRateService, input)
}

func savePieceworkRateFromHTTPRequest(ctx context.Context, service *PieceworkRateService, input PieceworkRateHTTPWriteRequest) (PieceworkRateDTO, error) {
	if input.UnitPrice == nil {
		return PieceworkRateDTO{}, fmt.Errorf("%w: unitPrice is required", ErrInvalidPieceworkRate)
	}
	start, err := parsePieceworkTime(input.EffectiveFrom)
	if err != nil {
		return PieceworkRateDTO{}, fmt.Errorf("%w: %v", ErrInvalidPieceworkRate, err)
	}
	end, err := parsePieceworkTime(input.EffectiveTo)
	if err != nil {
		return PieceworkRateDTO{}, fmt.Errorf("%w: %v", ErrInvalidPieceworkRate, err)
	}
	command := PieceworkRateCommand{PayItemID: input.PayItemID, Unit: input.Unit, UnitPrice: *input.UnitPrice, Currency: input.Currency, EffectiveFrom: start, EffectiveTo: end, Status: input.Status, Remarks: input.Remarks}
	if strings.TrimSpace(input.ID) == "" {
		return service.CreatePieceworkRate(ctx, command)
	}
	return service.UpdatePieceworkRate(ctx, input.ID, command, input.Version)
}
