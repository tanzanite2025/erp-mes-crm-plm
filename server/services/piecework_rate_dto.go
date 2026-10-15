package services

import (
	"time"
	"xdfc-server/models"
)

// PieceworkRateDTO exposes only the independent payroll contract.
type PieceworkRateDTO struct {
	ID            string     `json:"id"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
	PayItemID     string     `json:"payItemId"`
	PayItemCode   string     `json:"payItemCode"`
	PayItemName   string     `json:"payItemName"`
	Unit          string     `json:"unit"`
	UnitPrice     float64    `json:"unitPrice"`
	Currency      string     `json:"currency"`
	EffectiveFrom *time.Time `json:"effectiveFrom"`
	EffectiveTo   *time.Time `json:"effectiveTo"`
	Status        string     `json:"status"`
	Remarks       string     `json:"remarks"`
	Version       int64      `json:"version"`
	Operator      string     `json:"operator"`
}

// PieceworkRateCommand contains payroll identity and canonical price fields.
type PieceworkRateCommand struct {
	PayItemID     string
	Unit          string
	UnitPrice     float64
	Currency      string
	EffectiveFrom *time.Time
	EffectiveTo   *time.Time
	Status        string
	Remarks       string
}

type PieceworkRatePatchField[T any] struct {
	Set   bool
	Value *T
}

// PieceworkRatePatchCommand is the canonical partial-update command. The
// Set bit distinguishes "not supplied" from an explicit null/clear value.
type PieceworkRatePatchCommand struct {
	PayItemID     PieceworkRatePatchField[string]
	Unit          PieceworkRatePatchField[string]
	UnitPrice     PieceworkRatePatchField[float64]
	Currency      PieceworkRatePatchField[string]
	EffectiveFrom PieceworkRatePatchField[time.Time]
	EffectiveTo   PieceworkRatePatchField[time.Time]
	Status        PieceworkRatePatchField[string]
	Remarks       PieceworkRatePatchField[string]
}

func mapPieceworkRateToDTO(rate models.PieceworkRate) PieceworkRateDTO {
	return PieceworkRateDTO{
		ID:            rate.ID,
		CreatedAt:     rate.CreatedAt,
		UpdatedAt:     rate.UpdatedAt,
		PayItemID:     rate.PayItemID,
		PayItemCode:   rate.PayItemCode,
		PayItemName:   rate.PayItemName,
		Unit:          rate.Unit,
		UnitPrice:     rate.UnitPrice,
		Currency:      rate.Currency,
		EffectiveFrom: rate.EffectiveFrom,
		EffectiveTo:   rate.EffectiveTo,
		Status:        rate.Status,
		Remarks:       rate.Remarks,
		Version:       rate.Version,
		Operator:      rate.Operator,
	}
}
