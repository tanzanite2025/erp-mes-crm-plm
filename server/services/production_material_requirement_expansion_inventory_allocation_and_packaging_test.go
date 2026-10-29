package services

import (
	"math"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func newProductionMaterialRequirementExpansionFixture() ProductionMaterialRequirementExpansionInput {
	return ProductionMaterialRequirementExpansionInput{
		PerformanceVersionOptions: []models.ProductAttributeOption{{Value: "standard", LabelZh: "标准版", LabelEn: "Standard"}},
		AsOf:                      time.Date(2026, 10, 26, 12, 0, 0, 0, time.UTC),
		Orders:                    []models.SalesOrder{{ID: "order-1", OrderNo: "SO-2026-01", CustomerID: "customer-1", Version: 7, Lines: []models.SalesOrderLine{{ID: 12, LineNo: 1, ProductID: "product-1", ProductModel: "R50", Qty: 100}}}},
		Materials:                 []models.Material{{BaseModel: models.BaseModel{ID: "material-1"}, Code: "M1", Name: "材料", UOM: "m2", Status: "Active"}},
		BOMs: []models.BOM{{BaseModel: models.BaseModel{ID: "bom-1"}, BOMNo: "MBOM-1", ProductID: "product-1", BOMType: models.BOMTypeMBOM, Status: models.BOMStatusReleased, OwnerType: "INTERNAL", Version: 3, VersionLevel: "standard", Items: []models.BOMItem{
			{ID: "item-1", MaterialID: "material-1", Section: "A", Unit: "m2", StandardUsage: 0.4},
			{ID: "item-2", MaterialID: "material-1", Section: "A", Unit: "m2", StandardUsage: 0.2},
			{ID: "item-3", MaterialID: "material-1", Section: "B", Unit: "m2", StandardUsage: 0.6},
		}}},
	}
}

func TestProductionMaterialRequirementRepeatedRecipeContributionsPreserveFinishedQuantityAndAllocateStockOnce(t *testing.T) {
	input := newProductionMaterialRequirementExpansionFixture()
	input.SelectedKeys = []string{"SO-2026-01-1"}
	expansion, err := ExpandProductionMaterialRequirements(input)
	require.NoError(t, err)
	require.True(t, expansion.IsComplete)
	items, err := ProjectMRPRequirementsFromExpandedSources(expansion, input.Materials, map[string]MaterialInventoryAvailability{"material-1": {InventoryQty: 100, AvailableQty: 100, Unit: "m2"}}, []models.PackagingRule{{MaterialID: "material-1", BaseUnit: "m2", PackUnit: "roll", ConversionFactor: 25, Direction: "forward"}})
	require.NoError(t, err)
	require.Len(t, items, 2)
	require.InDelta(t, 60, items[0].TotalRequired, 1e-9)
	require.InDelta(t, 20, items[0].EffectiveGap+items[1].EffectiveGap, 1e-9)
	require.InDelta(t, 100, items[0].AllocatedStockQty+items[1].AllocatedStockQty, 1e-9)
	require.Equal(t, float64(100), items[0].SourceOrders[0].Qty)
	require.InDelta(t, 60, items[0].SourceOrders[0].RequiredQty, 1e-9)
	require.Equal(t, []string{"item-1", "item-2"}, items[0].SourceOrders[0].BOMItemIDs)
	require.Equal(t, uint(12), items[0].SourceOrders[0].SalesOrderLineID)
	require.Equal(t, 7, items[0].SourceOrders[0].OrderVersion)
	require.Equal(t, "bom-1", items[0].SourceOrders[0].BOMID)
	require.Equal(t, 3, items[0].Packaging.PackQty) // Total requirement 60 / 25, independent of the gap.
}

func TestProductionMaterialRequirementRequiresExplicitBOMChoiceAndRejectsStaleChoice(t *testing.T) {
	input := newProductionMaterialRequirementExpansionFixture()
	second := input.BOMs[0]
	second.ID, second.VersionLevel = "bom-2", "lightweight"
	second.CreatedAt = input.AsOf.Add(time.Hour)
	input.BOMs = append(input.BOMs, second)
	expansion, err := ExpandProductionMaterialRequirements(input)
	require.NoError(t, err)
	require.False(t, expansion.IsComplete)
	require.Equal(t, "BOM_SELECTION_REQUIRED", expansion.SourceLines[0].IssueCode)
	require.Nil(t, expansion.SourceLines[0].BOM)
	items, err := ProjectMRPRequirementsFromExpandedSources(expansion, input.Materials, nil, nil)
	require.NoError(t, err)
	require.Empty(t, items)
	input.BOMSelections = []ProductionMaterialRequirementBOMSelection{{SalesOrderID: "order-1", SalesOrderLineID: 12, BOMID: "bom-1"}}
	expansion, err = ExpandProductionMaterialRequirements(input)
	require.NoError(t, err)
	require.True(t, expansion.IsComplete)
	require.Equal(t, "bom-1", expansion.SourceLines[0].BOM.ID)
	input.BOMSelections[0].BOMID = "unavailable-bom"
	expansion, err = ExpandProductionMaterialRequirements(input)
	require.NoError(t, err)
	require.False(t, expansion.IsComplete)
	require.Equal(t, "BOM_SELECTION_CHANGED", expansion.SourceLines[0].IssueCode)
}

func TestProductionMaterialRequirementRespectsCustomerOwnershipManufacturingTypeAndEffectiveDate(t *testing.T) {
	input := newProductionMaterialRequirementExpansionFixture()
	customer := input.BOMs[0]
	customer.ID, customer.OwnerType, customer.OwnerCustomerID = "customer-bom", "CUSTOMER", "customer-1"
	customer.EffectiveTo = &input.AsOf // The final calendar day is inclusive.
	input.BOMs = append(input.BOMs, customer)
	future := customer
	future.ID = "future-bom"
	start := input.AsOf.AddDate(0, 0, 1)
	future.EffectiveFrom = &start
	input.BOMs = append(input.BOMs, future)
	ebom := customer
	ebom.ID, ebom.BOMType = "research-bom", models.BOMTypeEBOM
	input.BOMs = append(input.BOMs, ebom)
	expansion, err := ExpandProductionMaterialRequirements(input)
	require.NoError(t, err)
	require.True(t, expansion.IsComplete)
	require.Equal(t, "customer-bom", expansion.SourceLines[0].BOM.ID)
	require.Len(t, expansion.SourceLines[0].BOMCandidates, 1)
}

func TestProductionMaterialRequirementBlocksInvalidUnitsMaterialsUsageAndMissingSelectionWithoutPartialTotals(t *testing.T) {
	for _, testCase := range []struct {
		name   string
		change func(*ProductionMaterialRequirementExpansionInput)
		issue  string
	}{
		{"unit_mismatch", func(input *ProductionMaterialRequirementExpansionInput) { input.BOMs[0].Items[0].Unit = "kg" }, "MATERIAL_UNIT_MISMATCH"},
		{"missing_material", func(input *ProductionMaterialRequirementExpansionInput) { input.Materials = nil }, "INVALID_MATERIAL"},
		{"negative_usage", func(input *ProductionMaterialRequirementExpansionInput) { input.BOMs[0].Items[0].StandardUsage = -1 }, "INVALID_STANDARD_USAGE"},
		{"nonfinite_usage", func(input *ProductionMaterialRequirementExpansionInput) {
			input.BOMs[0].Items[0].StandardUsage = math.Inf(1)
		}, "INVALID_STANDARD_USAGE"},
		{"missing_bom", func(input *ProductionMaterialRequirementExpansionInput) { input.BOMs = nil }, "MISSING_BOM"},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			input := newProductionMaterialRequirementExpansionFixture()
			testCase.change(&input)
			expansion, err := ExpandProductionMaterialRequirements(input)
			require.NoError(t, err)
			require.False(t, expansion.IsComplete)
			require.Equal(t, testCase.issue, expansion.SourceLines[0].IssueCode)
			require.Empty(t, expansion.SourceLines[0].Contributions)
		})
	}
	for _, key := range []string{"malformed", "SO-2026-01-1trailing", "SO-2026-01-2"} {
		input := newProductionMaterialRequirementExpansionFixture()
		input.SelectedKeys = []string{key}
		_, err := ExpandProductionMaterialRequirements(input)
		require.ErrorIs(t, err, ErrInvalidProductionMaterialRequirementSelection)
	}
}

func TestProductionMaterialRequirementInventoryAvailabilityUsesExplicitWarehouseAndBatchReservationsWithoutWrites(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	require.NoError(t, database.Exec(`CREATE TABLE inventory (id TEXT PRIMARY KEY, material_id TEXT, category_code TEXT, batch_no TEXT, quantity REAL, uom TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE inventory_reservations (id TEXT PRIMARY KEY, material_id TEXT, category_code TEXT, batch_no TEXT, quantity REAL, status TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO inventory VALUES ('1', 'material-1', 'MATERIAL', 'A', 80, 'm2', NULL), ('2', 'material-1', 'MATERIAL', 'B', 20, 'm2', NULL), ('3', 'material-1', 'RD', 'A', 1000, 'm2', NULL)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO inventory_reservations VALUES ('1', 'material-1', 'MATERIAL', 'A', 30, 'RESERVED', NULL), ('2', 'material-1', 'MATERIAL', 'B', 50, 'RELEASED', NULL), ('3', 'material-1', 'RD', 'A', 500, 'RESERVED', NULL)`).Error)
	writeCount := 0
	for _, register := range []func(string, func(*gorm.DB)) error{database.Callback().Create().Before("gorm:create").Register, database.Callback().Update().Before("gorm:update").Register, database.Callback().Delete().Before("gorm:delete").Register} {
		require.NoError(t, register("requirement_availability_must_only_read", func(*gorm.DB) { writeCount++ }))
	}
	stock, err := QueryMaterialInventoryAvailability(database, []string{"material-1"}, []string{"MATERIAL"})
	require.NoError(t, err)
	require.Equal(t, float64(100), stock["material-1"].InventoryQty)
	require.Equal(t, float64(30), stock["material-1"].ReservedQty)
	require.Equal(t, float64(70), stock["material-1"].AvailableQty)
	require.Zero(t, writeCount)
	require.NoError(t, database.Exec(`UPDATE inventory_reservations SET quantity=100 WHERE id='1'`).Error)
	stock, err = QueryMaterialInventoryAvailability(database, []string{"material-1"}, []string{"MATERIAL"})
	require.NoError(t, err)
	require.Equal(t, float64(20), stock["material-1"].AvailableQty) // An over-reserved batch cannot consume another batch's free balance.
	require.Zero(t, writeCount)
	_, err = QueryMaterialInventoryAvailability(database, []string{"material-1"}, nil)
	require.Error(t, err)
}
