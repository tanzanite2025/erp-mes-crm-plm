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

func TestProductBarcodeInventoryExpiryContractDescribesScanPersistence(t *testing.T) {
	contract := GetProductBarcodeStateContract()
	for _, status := range contract.InventoryStatuses {
		if status.Code == LinearBarcodeInventoryStatusExpired {
			if status.Trigger != "binding_scan_expiry_check" {
				t.Fatalf("expected expiry to be persisted by binding scan, got trigger %q", status.Trigger)
			}
			if !status.IsTerminal {
				t.Fatal("expected expired inventory status to be terminal")
			}
			return
		}
	}
	t.Fatal("expected EXPIRED inventory status in product barcode state contract")
}

func TestBoundInventoryStatusIsTerminalWhileProductionStatusRemainsIndependent(t *testing.T) {
	contract := GetProductBarcodeStateContract()
	for _, status := range contract.InventoryStatuses {
		if status.Code == LinearBarcodeInventoryStatusBound {
			if !status.IsTerminal {
				t.Fatal("expected BOUND inventory status to be terminal")
			}
			return
		}
	}
	t.Fatal("expected BOUND inventory status in product barcode state contract")
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
