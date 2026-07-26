package services

import "testing"

func TestGetVehiclePackageOrientationsPreservesAxisMapping(t *testing.T) {
	dimension := VehiclePackageDimensionResponse{
		LengthMm:  600,
		WidthMm:   400,
		HeightMm:  200,
		CanRotate: true,
		CanInvert: true,
	}

	var target vehicleOrientation
	for _, orientation := range getVehiclePackageOrientations(dimension) {
		if orientation.Label == "L-H-W" {
			target = orientation
			break
		}
	}

	if target.Label == "" {
		t.Fatal("expected L-H-W orientation to be generated")
	}
	if target.LengthAxis != "length" ||
		target.WidthAxis != "height" ||
		target.HeightAxis != "width" {
		t.Fatalf("unexpected axis mapping: %#v", target)
	}
	if target.LengthMm != 600 || target.WidthMm != 200 || target.HeightMm != 400 {
		t.Fatalf("unexpected oriented dimensions: %#v", target)
	}
}

func TestConvertLoadingProfileUnitsToCalculationUnits(t *testing.T) {
	if got := convertLoadingLengthToMillimeters(42, "cm"); got != 420 {
		t.Fatalf("expected 420mm, got %v", got)
	}
	if got := convertLoadingWeightToKilograms(2500, "g"); got != 2.5 {
		t.Fatalf("expected 2.5kg, got %v", got)
	}
}
