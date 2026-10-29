package services

import (
	"encoding/json"
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

func TestCuttingPlanValidationAcceptsMissingHoleCountAndNormalizesLegacyPayload(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatal(err)
	}
	connection, err := database.DB()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = connection.Close() })
	for _, statement := range []string{
		`CREATE TABLE products (id text PRIMARY KEY, sku text, name text, status text, deleted_at datetime)`,
		`CREATE TABLE engineering_specs (id text PRIMARY KEY, name text, code text, type text, cutting_data text, deleted_at datetime)`,
		`INSERT INTO products (id, sku, name, status) VALUES ('product-1', 'R50-SKU', 'R50', 'Active')`,
		`INSERT INTO engineering_specs (id, name, code, type, cutting_data) VALUES ('cut-size-1', '标准裁片', 'CUT-100', 'CUT_SIZE_LIBRARY', '{"widthMm":"100","lengthMm":"200","pieceCount":"1","areaWeightGsm":"150","status":"Active"}')`,
	} {
		if err := database.Exec(statement).Error; err != nil {
			t.Fatal(err)
		}
	}
	for _, legacyHoleCount := range []string{"", `,"holeCount":"24"`} {
		input := models.EngineeringSpec{
			CuttingData: datatypes.JSON(`{"name":"旧名称","productId":"product-1","status":"Active","lines":[{"id":"line-1","cutSizeId":"cut-size-1"}]` + legacyHoleCount + `}`),
		}
		if err := validateAndNormalizeCuttingPlanSpec(database, &input); err != nil {
			t.Fatalf("validate cutting plan without hole dependency: %v", err)
		}
		var savedPayload map[string]any
		if err := json.Unmarshal(input.CuttingData, &savedPayload); err != nil {
			t.Fatal(err)
		}
		if input.Name != "R50-裁纱单" || savedPayload["name"] != input.Name {
			t.Fatalf("unexpected generated name: %q", input.Name)
		}
		if _, exists := savedPayload["holeCount"]; exists {
			t.Fatal("saved cutting plan must not contain customer-order hole count")
		}
		line := savedPayload["lines"].([]any)[0].(map[string]any)
		if line["cutSizeCode"] != "CUT-100" || line["weightG"] != "3" {
			t.Fatalf("authoritative cutting dimensions were not retained: %+v", line)
		}
	}
}

func TestCuttingTemplateCompatibilityIgnoresOrderHoleCountAndRetainsOtherGuards(t *testing.T) {
	template := &cuttingPlanSnapshot{
		ProductName: "R50",
		ProductCode: "R50-SKU",
		Status:      "Active",
		Lines:       []json.RawMessage{json.RawMessage(`{"id":"line-1"}`)},
	}
	for _, holeCount := range []int{0, 14, 24, 28, 32} {
		line := &salesOrderLineSnapshot{ProductModel: "R50", ProductCode: "R50-SKU", HoleCount: holeCount, Quantity: 10}
		if err := validateTemplateCompatibility(CreateCuttingIssuanceExecutionRequest{Quantity: 10}, line, template); err != nil {
			t.Fatalf("matching model with %d order holes should be compatible: %v", holeCount, err)
		}
	}
	line := &salesOrderLineSnapshot{ProductModel: "R60", ProductCode: "R60-SKU", Quantity: 10}
	if err := validateTemplateCompatibility(CreateCuttingIssuanceExecutionRequest{Quantity: 10}, line, template); err == nil {
		t.Fatal("unrelated model must remain incompatible")
	}
	line.ProductModel = "R50"
	if err := validateTemplateCompatibility(CreateCuttingIssuanceExecutionRequest{Quantity: 9}, line, template); err == nil {
		t.Fatal("order quantity mismatch must remain incompatible")
	}
	template.Status = "Archived"
	if err := validateTemplateCompatibility(CreateCuttingIssuanceExecutionRequest{Quantity: 10}, line, template); err == nil {
		t.Fatal("archived cutting template must remain incompatible")
	}
}
