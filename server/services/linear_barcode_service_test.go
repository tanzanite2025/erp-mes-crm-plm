package services

import "testing"

func TestParseLinearBarcode(t *testing.T) {
	result, err := ParseLinearBarcode("25601014R140123")
	if err != nil {
		t.Fatalf("ParseLinearBarcode returned error: %v", err)
	}

	if result.Protocol != "linear-wheel-v1" {
		t.Fatalf("unexpected protocol: %s", result.Protocol)
	}
	if result.Segments.ModelCode != "01" {
		t.Fatalf("unexpected model code: %s", result.Segments.ModelCode)
	}
	if result.Segments.HolePrefix != "R" {
		t.Fatalf("unexpected hole prefix: %s", result.Segments.HolePrefix)
	}
	if result.Segments.Serial != "0123" {
		t.Fatalf("unexpected serial: %s", result.Segments.Serial)
	}
	if result.ProductionDate != "2025-06-01" {
		t.Fatalf("unexpected production date: %s", result.ProductionDate)
	}
}

func TestParseLinearBarcodeRejectsInvalidLength(t *testing.T) {
	if _, err := ParseLinearBarcode("250101"); err == nil {
		t.Fatal("expected invalid length error")
	}
}
