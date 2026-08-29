package services

import (
	"strings"
	"time"
	"xdfc-server/models"
)

// PieceworkRateDTO is the stable API contract. Legacy fields remain in the
// response so old clients can continue reading existing rates.
type PieceworkRateDTO struct {
	ID            string     `json:"id"`
	CreatedAt     time.Time  `json:"createdAt"`
	UpdatedAt     time.Time  `json:"updatedAt"`
	ProductID     string     `json:"productId"`
	ProcessStepID string     `json:"processStepId"`
	RouteStepID   string     `json:"routeStepId"`
	ProcessCode   string     `json:"processCode"`
	ProcessName   string     `json:"processName"`
	Unit          string     `json:"unit"`
	UnitPrice     float64    `json:"unitPrice"`
	PiecePrice    float64    `json:"piecePrice"` // legacy read projection
	Currency      string     `json:"currency"`
	EffectiveAt   time.Time  `json:"effectiveAt"` // legacy read projection
	EffectiveFrom *time.Time `json:"effectiveFrom"`
	EffectiveTo   *time.Time `json:"effectiveTo"`
	Status        string     `json:"status"`
	Remarks       string     `json:"remarks"`
	Version       int64      `json:"version"`
	Operator      string     `json:"operator"`
}

// PieceworkRateCommand is the canonical write command. It contains only
// stable identities and canonical interval fields; legacy names and aliases
// are resolved before this command reaches the core service.
type PieceworkRateCommand struct {
	ProductID     string
	ProcessStepID string
	RouteStepID   string
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
	ProductID     PieceworkRatePatchField[string]
	ProcessStepID PieceworkRatePatchField[string]
	RouteStepID   PieceworkRatePatchField[string]
	Unit          PieceworkRatePatchField[string]
	UnitPrice     PieceworkRatePatchField[float64]
	Currency      PieceworkRatePatchField[string]
	EffectiveFrom PieceworkRatePatchField[time.Time]
	EffectiveTo   PieceworkRatePatchField[time.Time]
	Status        PieceworkRatePatchField[string]
	Remarks       PieceworkRatePatchField[string]
}

// PieceworkRateWriteDTO accepts both the new contract and the legacy
// piecePrice/effectiveAt fields at the HTTP compatibility boundary.
type PieceworkRateWriteDTO struct {
	ID            string   `json:"id"`
	ProductID     string   `json:"productId"`
	ProcessStepID string   `json:"processStepId"`
	RouteStepID   string   `json:"routeStepId"`
	ProcessCode   string   `json:"processCode"`
	ProcessName   string   `json:"processName"`
	Unit          string   `json:"unit"`
	UnitPrice     *float64 `json:"unitPrice"`
	PiecePrice    *float64 `json:"piecePrice"`
	Currency      string   `json:"currency"`
	EffectiveAt   string   `json:"effectiveAt"`
	EffectiveFrom string   `json:"effectiveFrom"`
	EffectiveTo   string   `json:"effectiveTo"`
	Status        string   `json:"status"`
	Remarks       string   `json:"remarks"`
	Version       int64    `json:"version"`
}

func mapPieceworkRateToDTO(rate models.PieceworkRate) PieceworkRateDTO {
	unitPrice := rate.UnitPrice
	effectiveFrom := rate.EffectiveFrom
	if effectiveFrom == nil && !rate.EffectiveAt.IsZero() {
		value := rate.EffectiveAt
		effectiveFrom = &value
	}
	effectiveAt := time.Time{}
	if effectiveFrom != nil {
		effectiveAt = *effectiveFrom
	} else {
		effectiveAt = rate.EffectiveAt
	}

	return PieceworkRateDTO{
		ID:            rate.ID,
		CreatedAt:     rate.CreatedAt,
		UpdatedAt:     rate.UpdatedAt,
		ProductID:     rate.ProductID,
		ProcessStepID: optionalPieceworkID(rate.ProcessStepID),
		RouteStepID:   optionalPieceworkID(rate.RouteStepID),
		ProcessCode:   rate.ProcessCode,
		ProcessName:   rate.ProcessName,
		Unit:          rate.Unit,
		UnitPrice:     unitPrice,
		PiecePrice:    unitPrice,
		Currency:      rate.Currency,
		EffectiveAt:   effectiveAt,
		EffectiveFrom: effectiveFrom,
		EffectiveTo:   rate.EffectiveTo,
		Status:        rate.Status,
		Remarks:       rate.Remarks,
		Version:       rate.Version,
		Operator:      rate.Operator,
	}
}

func optionalPieceworkID(value *string) string {
	if value == nil {
		return ""
	}
	return strings.TrimSpace(*value)
}

func normalizePieceworkRateWriteDTO(input PieceworkRateWriteDTO) PieceworkRateWriteDTO {
	input.ID = strings.TrimSpace(input.ID)
	input.ProductID = strings.TrimSpace(input.ProductID)
	input.ProcessStepID = strings.TrimSpace(input.ProcessStepID)
	input.RouteStepID = strings.TrimSpace(input.RouteStepID)
	input.ProcessCode = strings.TrimSpace(input.ProcessCode)
	input.ProcessName = strings.TrimSpace(input.ProcessName)
	input.Unit = strings.TrimSpace(input.Unit)
	input.Currency = strings.TrimSpace(input.Currency)
	input.Status = strings.ToLower(strings.TrimSpace(input.Status))
	input.Remarks = strings.TrimSpace(input.Remarks)
	if input.Unit == "" {
		input.Unit = "PCS"
	}
	if input.Currency == "" {
		input.Currency = "CNY"
	}
	if input.Status == "" {
		input.Status = "active"
	}
	if input.UnitPrice == nil && input.PiecePrice != nil {
		input.UnitPrice = input.PiecePrice
	}
	return input
}
