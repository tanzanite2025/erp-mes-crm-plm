package services

import (
	"fmt"
	"strings"
	"time"
	"xdfc-server/models"
)

func legacyPieceworkRateWriteDTO(rate *models.PieceworkRate) (PieceworkRateWriteDTO, error) {
	if rate == nil {
		return PieceworkRateWriteDTO{}, fmt.Errorf("%w: rate is required", ErrInvalidPieceworkRate)
	}

	input := PieceworkRateWriteDTO{
		ID:            rate.ID,
		ProductID:     rate.ProductID,
		ProcessStepID: optionalPieceworkID(rate.ProcessStepID),
		RouteStepID:   optionalPieceworkID(rate.RouteStepID),
		ProcessCode:   rate.ProcessCode,
		ProcessName:   rate.ProcessName,
		Unit:          rate.Unit,
		UnitPrice:     pointerPieceworkRatePrice(rate.UnitPrice),
		Currency:      rate.Currency,
		EffectiveFrom: formatPieceworkTime(rate.EffectiveFrom),
		EffectiveTo:   formatPieceworkTime(rate.EffectiveTo),
		Status:        rate.Status,
		Remarks:       rate.Remarks,
		Version:       rate.Version,
	}
	if !rate.EffectiveAt.IsZero() {
		input.EffectiveAt = rate.EffectiveAt.UTC().Format(time.RFC3339Nano)
	}
	return input, nil
}

func applyPieceworkRateDTOToModel(rate *models.PieceworkRate, dto PieceworkRateDTO) {
	rate.ID = dto.ID
	rate.CreatedAt = dto.CreatedAt
	rate.UpdatedAt = dto.UpdatedAt
	rate.ProductID = dto.ProductID
	rate.ProcessStepID = pieceworkIDPointerFromString(dto.ProcessStepID)
	rate.RouteStepID = pieceworkIDPointerFromString(dto.RouteStepID)
	rate.ProcessCode = dto.ProcessCode
	rate.ProcessName = dto.ProcessName
	rate.Unit = dto.Unit
	rate.UnitPrice = dto.UnitPrice
	rate.Currency = dto.Currency
	rate.EffectiveAt = dto.EffectiveAt
	rate.EffectiveFrom = dto.EffectiveFrom
	rate.EffectiveTo = dto.EffectiveTo
	rate.Status = dto.Status
	rate.Remarks = dto.Remarks
	rate.Version = dto.Version
	rate.Operator = dto.Operator
}

func pointerPieceworkRatePrice(value float64) *float64 {
	return &value
}

func formatPieceworkTime(value *time.Time) string {
	if value == nil {
		return ""
	}
	return value.UTC().Format(time.RFC3339Nano)
}

func pieceworkIDPointerFromString(value string) *string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}
	return &value
}

func (s *PieceworkService) canonicalCommandFromWriteDTO(
	input PieceworkRateWriteDTO,
) (PieceworkRateCommand, error) {
	input = normalizePieceworkRateWriteDTO(input)

	if input.UnitPrice != nil && input.PiecePrice != nil && *input.UnitPrice != *input.PiecePrice {
		return PieceworkRateCommand{}, fmt.Errorf(
			"%w: unitPrice and piecePrice disagree",
			ErrInvalidPieceworkRate,
		)
	}

	effectiveFrom, err := parsePieceworkTime(input.EffectiveFrom)
	if err != nil {
		return PieceworkRateCommand{}, fmt.Errorf("%w: effectiveFrom: %v", ErrInvalidPieceworkRate, err)
	}
	legacyEffectiveAt, err := parsePieceworkTime(input.EffectiveAt)
	if err != nil {
		return PieceworkRateCommand{}, fmt.Errorf("%w: effectiveAt: %v", ErrInvalidPieceworkRate, err)
	}
	if effectiveFrom != nil && legacyEffectiveAt != nil && !effectiveFrom.Equal(*legacyEffectiveAt) {
		return PieceworkRateCommand{}, fmt.Errorf(
			"%w: effectiveFrom and effectiveAt disagree",
			ErrInvalidPieceworkRate,
		)
	}
	if effectiveFrom == nil {
		effectiveFrom = legacyEffectiveAt
	}
	effectiveTo, err := parsePieceworkTime(input.EffectiveTo)
	if err != nil {
		return PieceworkRateCommand{}, fmt.Errorf("%w: effectiveTo: %v", ErrInvalidPieceworkRate, err)
	}

	processStepID := input.ProcessStepID
	if processStepID == "" && input.ProcessCode != "" {
		var matches []models.ProcessStep
		if err := s.txManager.DB().
			Where("code = ?", input.ProcessCode).
			Find(&matches).Error; err != nil {
			return PieceworkRateCommand{}, err
		}
		if len(matches) != 1 {
			return PieceworkRateCommand{}, fmt.Errorf(
				"%w: processCode must resolve to exactly one processStep",
				ErrInvalidPieceworkRate,
			)
		}
		processStepID = matches[0].ID
	}

	return PieceworkRateCommand{
		ProductID:     input.ProductID,
		ProcessStepID: strings.TrimSpace(processStepID),
		RouteStepID:   input.RouteStepID,
		Unit:          input.Unit,
		UnitPrice:     firstPieceworkRatePrice(input.UnitPrice, input.PiecePrice),
		Currency:      input.Currency,
		EffectiveFrom: effectiveFrom,
		EffectiveTo:   effectiveTo,
		Status:        input.Status,
		Remarks:       input.Remarks,
	}, nil
}

func firstPieceworkRatePrice(unitPrice, piecePrice *float64) float64 {
	if unitPrice != nil {
		return *unitPrice
	}
	if piecePrice != nil {
		return *piecePrice
	}
	return 0
}

func pieceworkRateModelFromCommand(command PieceworkRateCommand) models.PieceworkRate {
	rate := models.PieceworkRate{
		ProductID:     strings.TrimSpace(command.ProductID),
		Unit:          strings.TrimSpace(command.Unit),
		UnitPrice:     command.UnitPrice,
		Currency:      strings.TrimSpace(command.Currency),
		EffectiveFrom: command.EffectiveFrom,
		EffectiveTo:   command.EffectiveTo,
		Status:        strings.TrimSpace(command.Status),
		Remarks:       strings.TrimSpace(command.Remarks),
	}
	if processStepID := strings.TrimSpace(command.ProcessStepID); processStepID != "" {
		rate.ProcessStepID = &processStepID
	}
	if routeStepID := strings.TrimSpace(command.RouteStepID); routeStepID != "" {
		rate.RouteStepID = &routeStepID
	}
	return rate
}
