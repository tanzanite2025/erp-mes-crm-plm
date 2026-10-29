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

func TestProductionMaterialRequirementMRPDatabaseOrchestrationUsesSharedBasisAndWarehouseWithoutWrites(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	statements := []string{
		`CREATE TABLE product_attribute_options (id TEXT PRIMARY KEY, category TEXT, value TEXT, label TEXT, label_en TEXT, deleted_at DATETIME)`,
		`INSERT INTO product_attribute_options VALUES ('option-1','versionLevel','standard','标准版','Standard',NULL)`,
		`CREATE TABLE warehouse_categories (id TEXT PRIMARY KEY, code TEXT, is_system BOOLEAN, active BOOLEAN, allow_shipment BOOLEAN, deleted_at DATETIME)`,
		`CREATE TABLE sales_orders (id TEXT PRIMARY KEY, order_no TEXT, customer_id TEXT, customer_name TEXT, status TEXT, order_date TEXT, version INTEGER, deleted_at DATETIME)`,
		`CREATE TABLE sales_order_lines (id INTEGER PRIMARY KEY, sales_order_id TEXT, line_no INTEGER, product_id TEXT, product_model TEXT, qty REAL)`,
		`CREATE TABLE boms (id TEXT PRIMARY KEY, product_id TEXT, bom_type TEXT, bom_no TEXT, status TEXT, owner_type TEXT, owner_customer_id TEXT, version INTEGER, version_text TEXT, version_level TEXT, revision_no TEXT, measured_weight REAL, measured_weight_unit TEXT, effective_from DATETIME, effective_to DATETIME, deleted_at DATETIME)`,
		`CREATE TABLE bom_items (id TEXT PRIMARY KEY, bom_id TEXT, sort_order INTEGER, section TEXT, material_id TEXT, unit TEXT, standard_usage REAL)`,
		`CREATE TABLE materials (id TEXT PRIMARY KEY, code TEXT, name TEXT, spec TEXT, uom TEXT, status TEXT, deleted_at DATETIME)`,
		`CREATE TABLE products (id TEXT PRIMARY KEY, sku TEXT, name TEXT, tech_series TEXT, brake_type TEXT, deleted_at DATETIME)`,
		`CREATE TABLE inventory (id TEXT PRIMARY KEY, material_id TEXT, category_code TEXT, batch_no TEXT, quantity REAL, uom TEXT, deleted_at DATETIME)`,
		`CREATE TABLE inventory_reservations (id TEXT PRIMARY KEY, material_id TEXT, category_code TEXT, batch_no TEXT, quantity REAL, status TEXT, deleted_at DATETIME)`,
		`CREATE TABLE packaging_rules (id TEXT PRIMARY KEY, material_id TEXT, pack_unit TEXT, base_unit TEXT, conversion_factor REAL, direction TEXT)`,
		`INSERT INTO warehouse_categories VALUES ('warehouse-1','MATERIAL',1,1,1,NULL)`,
		`INSERT INTO sales_orders VALUES ('order-1','SO-2026-01','customer-1','客户','Scheduling','2026-10-26',7,NULL)`,
		`INSERT INTO sales_order_lines VALUES (12,'order-1',1,'product-1','R50',100)`,
		`INSERT INTO boms VALUES ('bom-1','product-1','MBOM','MBOM-1','RELEASED','INTERNAL','',3,'V1','standard','A',480,'g',NULL,NULL,NULL)`,
		`INSERT INTO bom_items VALUES ('item-1','bom-1',1,'A','material-1','m2',0.6), ('item-2','bom-1',2,'B','material-1','m2',0.6)`,
		`INSERT INTO materials VALUES ('material-1','m1','材料','规格','m2','Active',NULL)`,
		`INSERT INTO products VALUES ('product-1','SKU-1','产品名称','系列','碟刹',NULL)`,
		`INSERT INTO inventory VALUES ('stock-1','material-1','MATERIAL','A',100,'m2',NULL), ('stock-2','material-1','RD','A',1000,'m2',NULL)`,
		`INSERT INTO inventory_reservations VALUES ('reserve-1','material-1','MATERIAL','A',10,'RESERVED',NULL)`,
		`INSERT INTO packaging_rules VALUES ('rule-1','material-1','roll','m2',25,'forward')`,
	}
	for _, statement := range statements {
		require.NoError(t, database.Exec(statement).Error)
	}
	require.NoError(t, database.Exec(`ALTER TABLE sales_orders ADD COLUMN classification TEXT`).Error)
	require.NoError(t, database.Exec(`ALTER TABLE sales_orders ADD COLUMN type TEXT`).Error)
	writeCount := 0
	for _, register := range []func(string, func(*gorm.DB)) error{database.Callback().Create().Before("gorm:create").Register, database.Callback().Update().Before("gorm:update").Register, database.Callback().Delete().Before("gorm:delete").Register} {
		require.NoError(t, register("requirement_analysis_must_only_read", func(*gorm.DB) { writeCount++ }))
	}
	parameters := GetMrpRequirementsParams{SelectedKeys: []string{"SO-2026-01-1"}}
	asOf := time.Date(2026, 10, 26, 12, 0, 0, 0, time.UTC)
	response, err := queryMRPRequirementsFromSharedProductionMaterialBasis(database, parameters, asOf)
	require.NoError(t, err)
	require.True(t, response.IsComplete)
	require.Equal(t, "MATERIAL", response.WarehouseCategoryCode)
	require.Len(t, response.Requirements, 2)
	require.Equal(t, 1, response.Stats.TotalMaterials)
	require.Equal(t, "R50", response.Stats.AnalyzedModels[0].ModelName)
	require.Contains(t, response.SourceLines[0].ProductName, "standard")
	require.Equal(t, uint(12), response.SourceLines[0].SalesOrderLineID)
	require.Equal(t, float64(480), response.SourceLines[0].BOM.MeasuredWeight)
	require.Equal(t, "标准版", response.SourceLines[0].BOM.VersionLevelLabelZh)
	require.Equal(t, "Standard", response.SourceLines[0].BOM.VersionLevelLabelEn)
	require.InDelta(t, 90, response.Requirements[0].AllocatedStockQty+response.Requirements[1].AllocatedStockQty, 1e-9)
	require.InDelta(t, 30, response.Requirements[0].EffectiveGap+response.Requirements[1].EffectiveGap, 1e-9)
	require.Equal(t, 3, response.Requirements[0].Packaging.PackQty)
	require.Zero(t, writeCount)

	require.NoError(t, database.Exec(`UPDATE boms SET status='DRAFT'`).Error)
	incomplete, err := queryMRPRequirementsFromSharedProductionMaterialBasis(database, parameters, asOf)
	require.NoError(t, err)
	require.False(t, incomplete.IsComplete)
	require.Empty(t, incomplete.Requirements)
	require.Equal(t, "MISSING_BOM", incomplete.SourceLines[0].IssueCode)
	require.Equal(t, 1, incomplete.Stats.MissingBOMCount)
	require.Zero(t, writeCount)

	require.NoError(t, database.Exec(`UPDATE warehouse_categories SET active=0`).Error)
	_, err = queryMRPRequirementsFromSharedProductionMaterialBasis(database, parameters, asOf)
	require.ErrorContains(t, err, "production material warehouse is unavailable")
}

func TestProductionMaterialRequirementRejectsPackagingMismatchAndAggregateOverflow(t *testing.T) {
	input := newProductionMaterialRequirementExpansionFixture()
	expansion, err := ExpandProductionMaterialRequirements(input)
	require.NoError(t, err)
	reverse, err := ProjectMRPRequirementsFromExpandedSources(expansion, input.Materials, nil, []models.PackagingRule{{MaterialID: "material-1", BaseUnit: "m2", PackUnit: "bag", ConversionFactor: 2, Direction: "reverse"}})
	require.NoError(t, err)
	require.Equal(t, 120, reverse[0].Packaging.PackQty)
	for _, invalidRule := range []struct {
		factor          float64
		unit, direction string
	}{{0, "m2", "forward"}, {25, "kg", "forward"}, {25, "m2", "invalid"}} {
		rule := []models.PackagingRule{{MaterialID: "material-1", PackUnit: "roll", BaseUnit: invalidRule.unit, ConversionFactor: invalidRule.factor, Direction: invalidRule.direction}}
		_, err := ProjectMRPRequirementsFromExpandedSources(expansion, input.Materials, nil, rule)
		require.Error(t, err)
	}
	expansion.SourceLines[0].Contributions[0].RequiredQty = math.MaxFloat64
	expansion.SourceLines[0].Contributions[1].RequiredQty = math.MaxFloat64
	_, err = ProjectMRPRequirementsFromExpandedSources(expansion, input.Materials, nil, nil)
	require.ErrorContains(t, err, "aggregate demand exceeds supported range")
}

func TestProductionMaterialRequirementRejectsNonfiniteResponseQuantitiesBeforeJSONEncoding(t *testing.T) {
	input := newProductionMaterialRequirementExpansionFixture()
	input.Orders[0].Lines[0].Qty = math.Inf(1)
	_, err := ExpandProductionMaterialRequirements(input)
	require.ErrorContains(t, err, "nonfinite finished quantity")
	input = newProductionMaterialRequirementExpansionFixture()
	input.BOMs[0].MeasuredWeight = math.NaN()
	_, err = ExpandProductionMaterialRequirements(input)
	require.ErrorContains(t, err, "invalid finished weight")
	_, err = buildMRPRequirementStatsFromSourceLines([]ProductionMaterialRequirementSourceLine{{ProductModel: "R50", FinishedQty: math.MaxFloat64}, {ProductModel: "R50", FinishedQty: math.MaxFloat64}})
	require.ErrorContains(t, err, "aggregate finished quantity exceeds supported range")
}
