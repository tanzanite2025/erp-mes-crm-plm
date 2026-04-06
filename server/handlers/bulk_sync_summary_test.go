package handlers

import (
	"strings"
	"testing"
)

func TestBulkSyncSummaryBuildersExposeSensitivityLayers(t *testing.T) {
	orgSummary := buildOrgBulkSyncSummary(
		2, 3, 4, 5,
		[]string{"node-1:old->new"},
		[]string{"node-1:department->team"},
		[]string{"node-1:a->b"},
	)
	if !strings.Contains(orgSummary, "sensitivity=HIGH") {
		t.Fatalf("org summary missing HIGH sensitivity: %s", orgSummary)
	}
	if !strings.Contains(orgSummary, "parent_samples=[node-1:old->new]") {
		t.Fatalf("org summary missing parent sample: %s", orgSummary)
	}

	employeeSummary := buildEmployeeBulkSyncSummary(
		1, 2, 3, 4, 5, 6,
		[]string{"emp-1:active->disabled"},
		[]string{"emp-1:dept-a->dept-b"},
	)
	if !strings.Contains(employeeSummary, "sensitivity=HIGH") {
		t.Fatalf("employee summary missing HIGH sensitivity: %s", employeeSummary)
	}
	if !strings.Contains(employeeSummary, "status_changed=2") || !strings.Contains(employeeSummary, "dept_changed=3") {
		t.Fatalf("employee summary missing key counters: %s", employeeSummary)
	}

	materialSummary := buildMaterialBulkSyncSummary(
		1, 2, 3, 4, 5, 6,
		[]string{"M001:Active->Archived"},
		[]string{"M001:A->B"},
	)
	if !strings.Contains(materialSummary, "sensitivity=MEDIUM") {
		t.Fatalf("material summary missing MEDIUM sensitivity: %s", materialSummary)
	}
	if !strings.Contains(materialSummary, "cost_price_changed=6") {
		t.Fatalf("material summary missing cost price change counter: %s", materialSummary)
	}

	inventorySummary := buildInventoryBulkSyncSummary(
		1, 2, 3, 4, 5, 6,
		[]string{"inv-1:10->12"},
		[]string{"inv-1:A->B"},
	)
	if !strings.Contains(inventorySummary, "sensitivity=CRITICAL") {
		t.Fatalf("inventory summary missing CRITICAL sensitivity: %s", inventorySummary)
	}
	if !strings.Contains(inventorySummary, "quantity_inc=3") || !strings.Contains(inventorySummary, "quantity_dec=4") {
		t.Fatalf("inventory summary missing quantity direction counters: %s", inventorySummary)
	}
}
