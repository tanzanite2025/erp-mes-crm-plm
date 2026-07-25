package services

import "testing"

func TestProductBarcodeStateContractUsesSupportedProductionStatuses(t *testing.T) {
	contract := GetProductBarcodeStateContract()
	if len(contract.ProductionStatuses) == 0 {
		t.Fatal("expected production statuses in product barcode state contract")
	}

	for _, status := range contract.ProductionStatuses {
		if !isSupportedProductBarcodeStateStatus(status.Code) {
			t.Fatalf("contract exposes unsupported production status %q", status.Code)
		}
	}
}

func TestProductBarcodeStateContractExposesRouteStepAsRequiredLocationAnchor(t *testing.T) {
	contract := GetProductBarcodeStateContract()

	for _, anchor := range contract.ProductionLocationAnchors {
		if anchor.Code == "ROUTE_STEP" {
			if anchor.Field != "routeStepId" {
				t.Fatalf("expected ROUTE_STEP field routeStepId, got %q", anchor.Field)
			}
			if !anchor.Required {
				t.Fatal("expected ROUTE_STEP to be required")
			}
			return
		}
	}

	t.Fatal("expected ROUTE_STEP location anchor in product barcode state contract")
}
