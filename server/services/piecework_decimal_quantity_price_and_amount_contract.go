package services

import (
	"fmt"
	"math"
	"math/big"
	"strconv"
	"time"
)

func validatePieceworkDecimalPrecision(value float64, maximum float64) error {
	if math.IsNaN(value) || math.IsInf(value, 0) || value < 0 || value > maximum {
		return fmt.Errorf("value is outside the supported decimal range")
	}
	decimal, ok := new(big.Rat).SetString(strconv.FormatFloat(value, 'f', -1, 64))
	if !ok {
		return fmt.Errorf("invalid decimal")
	}
	if !new(big.Rat).Mul(decimal, big.NewRat(10000, 1)).IsInt() {
		return fmt.Errorf("at most four decimal places are supported")
	}
	return nil
}

// Multiply decimal values exactly, then round half up once to currency cents.
func calculateFinancePieceworkSalaryAmount(quantity, unitPrice float64) (float64, error) {
	q, _ := new(big.Rat).SetString(strconv.FormatFloat(quantity, 'f', -1, 64))
	p, _ := new(big.Rat).SetString(strconv.FormatFloat(unitPrice, 'f', -1, 64))
	if q == nil || p == nil {
		return 0, fmt.Errorf("invalid decimal operands")
	}
	amount := new(big.Rat).Mul(q, p)
	amount.Mul(amount, big.NewRat(100, 1)).Add(amount, big.NewRat(1, 2))
	cents := new(big.Int).Quo(amount.Num(), amount.Denom())
	if cents.Sign() < 0 || cents.Cmp(big.NewInt(999999999999)) > 0 {
		return 0, fmt.Errorf("amount exceeds decimal(12,2)")
	}
	result, _ := new(big.Rat).SetFrac(cents, big.NewInt(100)).Float64()
	return result, nil
}

func validatePieceworkCalendarDate(value time.Time) error {
	if value.IsZero() || value.Year() < 1900 || value.Year() > 9999 || value.Format("15:04:05.999999999") != "00:00:00" {
		return fmt.Errorf("an explicit calendar date at midnight is required")
	}
	return nil
}
