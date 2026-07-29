package services

import (
	"context"
	"errors"
	"testing"
	"xdfc-server/models"
)

func TestProductionOutsourceExecutionSourceUsesDedicatedInventoryPath(t *testing.T) {
	for _, sourceType := range []string{
		DedicatedInventorySourceProductionOutsource,
		" production_outsource ",
	} {
		if !isProductionOutsourceExecutionSourceType(sourceType) {
			t.Fatalf("expected source type %q to be recognized as production outsource", sourceType)
		}
		if !isDedicatedInventoryExecutionSourceType(sourceType) {
			t.Fatalf("expected source type %q to use a dedicated inventory path", sourceType)
		}
		if isAfterSalesExecutionSourceType(sourceType) {
			t.Fatalf("production outsource source type %q must not be classified as after-sales", sourceType)
		}
	}
}

func TestProductionOutsourceCannotUseGenericInventoryCreatePaths(t *testing.T) {
	shipment := &models.ShipmentRecord{
		SourceType: DedicatedInventorySourceProductionOutsource,
	}
	if err := CreateShipmentDraft(shipment); !errors.Is(err, ErrDedicatedInventoryExecutionPath) {
		t.Fatalf("expected production outsource shipment draft to be rejected, got %v", err)
	}

	inbound := &models.InboundRecord{
		SourceType: " production_outsource ",
	}
	if err := RecordInbound(context.Background(), inbound); !errors.Is(err, ErrDedicatedInventoryExecutionPath) {
		t.Fatalf("expected production outsource inbound to be rejected, got %v", err)
	}
}
