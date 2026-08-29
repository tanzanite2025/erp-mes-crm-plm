package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// DecodePieceworkRatePatchDelta is the only place where the wire-level SDRTS
// envelope is converted into the canonical patch command.
func DecodePieceworkRatePatchDelta(
	delta map[string]json.RawMessage,
) (PieceworkRatePatchCommand, error) {
	if err := ValidatePieceworkRateDelta(delta); err != nil {
		return PieceworkRatePatchCommand{}, err
	}

	var command PieceworkRatePatchCommand
	for key, raw := range delta {
		newValue, err := decodeSDRTSNewValue(raw)
		if err != nil {
			return PieceworkRatePatchCommand{}, err
		}

		switch key {
		case "productId":
			command.ProductID, err = decodePatchString(newValue)
		case "processStepId":
			command.ProcessStepID, err = decodePatchString(newValue)
		case "routeStepId":
			command.RouteStepID, err = decodePatchString(newValue)
		case "unit":
			command.Unit, err = decodePatchString(newValue)
		case "unitPrice":
			command.UnitPrice, err = decodePatchFloat(newValue)
		case "currency":
			command.Currency, err = decodePatchString(newValue)
		case "effectiveFrom":
			command.EffectiveFrom, err = decodePatchTime(newValue)
		case "effectiveTo":
			command.EffectiveTo, err = decodePatchTime(newValue)
		case "status":
			command.Status, err = decodePatchString(newValue)
		case "remarks":
			command.Remarks, err = decodePatchString(newValue)
		}
		if err != nil {
			return PieceworkRatePatchCommand{}, fmt.Errorf("%s: %w", key, err)
		}
	}
	return command, nil
}

func decodeSDRTSNewValue(raw json.RawMessage) (json.RawMessage, error) {
	return extractDeltaNewValue(raw)
}

func decodePatchString(raw json.RawMessage) (PieceworkRatePatchField[string], error) {
	field := PieceworkRatePatchField[string]{Set: true}
	if string(raw) == "null" {
		return field, nil
	}
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return PieceworkRatePatchField[string]{}, err
	}
	value = strings.TrimSpace(value)
	field.Value = &value
	return field, nil
}

func decodePatchFloat(raw json.RawMessage) (PieceworkRatePatchField[float64], error) {
	field := PieceworkRatePatchField[float64]{Set: true}
	if string(raw) == "null" {
		return PieceworkRatePatchField[float64]{}, fmt.Errorf("numeric value cannot be null")
	}
	var value float64
	if err := json.Unmarshal(raw, &value); err != nil {
		return PieceworkRatePatchField[float64]{}, err
	}
	field.Value = &value
	return field, nil
}

func decodePatchTime(raw json.RawMessage) (PieceworkRatePatchField[time.Time], error) {
	field := PieceworkRatePatchField[time.Time]{Set: true}
	if string(raw) == "null" {
		return field, nil
	}
	var value string
	if err := json.Unmarshal(raw, &value); err != nil {
		return PieceworkRatePatchField[time.Time]{}, err
	}
	parsed, err := parsePieceworkTime(value)
	if err != nil {
		return PieceworkRatePatchField[time.Time]{}, err
	}
	if parsed != nil {
		field.Value = parsed
	}
	return field, nil
}
