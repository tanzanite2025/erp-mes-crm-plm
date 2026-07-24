package services

import "testing"

func TestValidateProductionRouteDTORequiresRouteIdentity(t *testing.T) {
	route := ProductionRouteDTO{
		Status: "DRAFT",
	}

	if err := validateProductionRouteDTO(route); err == nil {
		t.Fatal("expected missing route code to be rejected")
	}
}

func TestValidateProductionRouteDTORequiresTransferForOutsource(t *testing.T) {
	route := ProductionRouteDTO{
		Code:   "route-001",
		Name:   "Standard Route",
		Status: "DRAFT",
		Steps: []ProductionRouteStepDTO{{
			SegmentID:     "segment-1",
			ProcessStepID: "process-1",
			ExecutionMode: "OUTSOURCE_REQUIRED",
			QualityGate:   "NONE",
		}},
	}

	if err := validateProductionRouteDTO(route); err == nil {
		t.Fatal("expected outsourced route step without transfer to be rejected")
	}
}

func TestValidateProductionRouteDTORequiresStepsBeforePublish(t *testing.T) {
	route := ProductionRouteDTO{
		Code:   "route-001",
		Name:   "Standard Route",
		Status: "PUBLISHED",
	}

	if err := validateProductionRouteDTO(route); err == nil {
		t.Fatal("expected published route without steps to be rejected")
	}
}

func TestNormalizeProductionRouteDTODefaultsStatusAndSequence(t *testing.T) {
	route := normalizeProductionRouteDTO(ProductionRouteDTO{
		Code: " route-001 ",
		Name: " Standard Route ",
		Steps: []ProductionRouteStepDTO{{
			SegmentID:     " segment-1 ",
			ProcessStepID: " process-1 ",
			ExecutionMode: "in_house",
			QualityGate:   "",
		}},
	})

	if route.Status != "DRAFT" {
		t.Fatalf("expected DRAFT status, got %q", route.Status)
	}
	if route.Code != "route-001" || route.Name != "Standard Route" {
		t.Fatalf("expected trimmed route identity, got code=%q name=%q", route.Code, route.Name)
	}
	if route.Steps[0].Sequence != 1 {
		t.Fatalf("expected default sequence 1, got %d", route.Steps[0].Sequence)
	}
	if route.Steps[0].ExecutionMode != "IN_HOUSE" {
		t.Fatalf("expected normalized execution mode, got %q", route.Steps[0].ExecutionMode)
	}
}
