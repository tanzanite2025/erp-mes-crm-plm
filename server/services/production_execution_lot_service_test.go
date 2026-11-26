package services

import (
	"testing"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type productionExecutionLotTestTxManager struct {
	db *gorm.DB
}

func (m productionExecutionLotTestTxManager) DB() *gorm.DB {
	return m.db
}

func (m productionExecutionLotTestTxManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return m.db.Transaction(fn)
}

func newProductionExecutionLotTestService(t *testing.T) (*ProductionExecutionLotService, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	createProductionExecutionLotTestSchema(t, database)

	return NewProductionExecutionLotService(productionExecutionLotTestTxManager{db: database}), database
}

func createProductionExecutionLotTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()

	require.NoError(t, database.Exec(`
		CREATE TABLE production_plans (
			sales_order_line_id INTEGER,
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			order_no TEXT,
			order_id TEXT,
			product_id TEXT,
			product_name TEXT,
			bom_owner_type TEXT NOT NULL DEFAULT '',
			bom_owner_customer_id TEXT NOT NULL DEFAULT '',
			bom_version_level TEXT NOT NULL DEFAULT '',
			production_route_mode TEXT NOT NULL DEFAULT 'BRANCH_DEFAULT',
			production_route_revision_id TEXT,
			production_route_revision_no INTEGER NOT NULL DEFAULT 0,
			quantity REAL,
			status TEXT,
			start_date DATETIME,
			end_date DATETIME,
			notes TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE products (
		id TEXT PRIMARY KEY, sku TEXT, name TEXT, status TEXT, deleted_at DATETIME
	)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE customers (
		id TEXT PRIMARY KEY, name TEXT, deleted_at DATETIME
	)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE boms (
		id TEXT PRIMARY KEY, product_id TEXT, bom_type TEXT, status TEXT,
		owner_type TEXT, owner_customer_id TEXT, version_level TEXT,
		effective_from DATETIME, effective_to DATETIME, deleted_at DATETIME
	)`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_tasks (
			id TEXT PRIMARY KEY,
			plan_id TEXT,
			batch_no TEXT,
			process_id TEXT,
			process_name TEXT,
			target_qty REAL,
			actual_qty REAL,
			status TEXT,
			operator TEXT,
			started_at DATETIME,
			completed_at DATETIME
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE production_execution_lots (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			product_barcode TEXT NOT NULL UNIQUE,
			product_id TEXT,
			product_name TEXT,
			plan_id TEXT,
			task_id TEXT,
			batch_no TEXT,
			quantity REAL,
			status TEXT,
			notes TEXT,
			operator TEXT
		)
	`).Error)
}

func seedProductionExecutionLotTestPlan(t *testing.T, database *gorm.DB, planID string) {
	t.Helper()
	productID := "product-" + planID
	require.NoError(t, database.Exec(
		"INSERT INTO products (id, sku, name, status) VALUES (?, ?, ?, 'ACTIVE')",
		productID, productID, "测试产品",
	).Error)
	require.NoError(t, database.Exec(
		`INSERT INTO boms (id, product_id, bom_type, status, owner_type, owner_customer_id, version_level)
		 VALUES (?, ?, 'MBOM', 'RELEASED', 'INTERNAL', '', 'std')`,
		"bom-"+planID, productID,
	).Error)
	require.NoError(t, database.Create(&models.ProductionPlan{
		BaseModel:       models.BaseModel{ID: planID},
		OrderNo:         "MO-" + planID,
		ProductID:       productID,
		ProductName:     "测试产品",
		BOMOwnerType:    "INTERNAL",
		BOMVersionLevel: "std",
		Quantity:        10,
		Status:          "SCHEDULED",
	}).Error)
}

func TestSaveProductionExecutionLotCreatesOptionalBatchLink(t *testing.T) {
	service, database := newProductionExecutionLotTestService(t)
	seedProductionExecutionLotTestPlan(t, database, "plan-a")
	require.NoError(t, database.Create(&models.ProductionTask{
		ID:        "task-a",
		PlanID:    "plan-a",
		BatchNo:   "BATCH-001",
		TargetQty: 10,
	}).Error)

	lot, err := service.SaveProductionExecutionLot(SaveProductionExecutionLotRequest{
		ProductBarcode: " abc-001 ",
		ProductID:      "product-plan-a",
		ProductName:    "产品A",
		PlanID:         "plan-a",
		TaskID:         "task-a",
		BatchNo:        " BATCH-001 ",
		Quantity:       1,
		Operator:       "tester",
	})

	require.NoError(t, err)
	require.Equal(t, "ABC-001", lot.ProductBarcode)
	require.Equal(t, "BATCH-001", lot.BatchNo)
	require.Equal(t, ProductionExecutionLotStatusActive, lot.Status)
	require.Equal(t, 1.0, lot.Quantity)

	list, err := service.ListProductionExecutionLots(ProductionExecutionLotListQuery{
		ProductBarcode: "abc-001",
	})
	require.NoError(t, err)
	require.EqualValues(t, 1, list.Total)
	require.Len(t, list.Items, 1)
	require.Equal(t, lot.ID, list.Items[0].ID)
}

func TestSaveProductionExecutionLotUpsertsByProductBarcode(t *testing.T) {
	service, database := newProductionExecutionLotTestService(t)
	seedProductionExecutionLotTestPlan(t, database, "plan-upsert")

	first, err := service.SaveProductionExecutionLot(SaveProductionExecutionLotRequest{
		ProductBarcode: "ABC-002",
		ProductID:      "product-plan-upsert",
		PlanID:         "plan-upsert",
		BatchNo:        "BATCH-A",
		Quantity:       1,
	})
	require.NoError(t, err)

	second, err := service.SaveProductionExecutionLot(SaveProductionExecutionLotRequest{
		ProductBarcode: "ABC-002",
		ProductID:      "product-plan-upsert",
		PlanID:         "plan-upsert",
		BatchNo:        "BATCH-B",
		Quantity:       1,
	})
	require.NoError(t, err)

	require.Equal(t, first.ID, second.ID)
	require.Equal(t, "BATCH-B", second.BatchNo)
	require.Equal(t, 1.0, second.Quantity)
}

func TestSaveProductionExecutionLotRejectsQuantityOtherThanOnePerBarcode(t *testing.T) {
	service, _ := newProductionExecutionLotTestService(t)
	seedProductionExecutionLotTestPlan(t, service.txManager.DB(), "plan-unit-quantity")

	for _, quantity := range []float64{0.5, 2} {
		_, err := service.SaveProductionExecutionLot(SaveProductionExecutionLotRequest{
			ProductBarcode: "ABC-UNIT-QUANTITY",
			PlanID:         "plan-unit-quantity",
			Quantity:       quantity,
		})
		require.ErrorIs(t, err, ErrInvalidProductionExecutionLot)
		require.Contains(t, err.Error(), "quantity must equal 1")
	}
}

func TestSaveProductionExecutionLotRejectsMissingPlan(t *testing.T) {
	service, _ := newProductionExecutionLotTestService(t)

	_, err := service.SaveProductionExecutionLot(SaveProductionExecutionLotRequest{
		ProductBarcode: "ABC-003",
		PlanID:         "missing-plan",
		Quantity:       1,
	})

	require.ErrorIs(t, err, ErrInvalidProductionExecutionLot)
}

func TestProductionPlanCannotChangeMBOMBranchAfterExecutionLotExists(t *testing.T) {
	service, database := newProductionExecutionLotTestService(t)
	seedProductionExecutionLotTestPlan(t, database, "plan-branch-locked")

	_, err := service.SaveProductionExecutionLot(SaveProductionExecutionLotRequest{
		ProductBarcode: "BRANCH-LOCKED-001",
		PlanID:         "plan-branch-locked",
		Quantity:       1,
	})
	require.NoError(t, err)

	require.NoError(t, database.Exec(
		`INSERT INTO boms (id, product_id, bom_type, status, owner_type, owner_customer_id, version_level)
		 VALUES (?, ?, 'MBOM', 'RELEASED', 'INTERNAL', '', 'alternate')`,
		"bom-plan-branch-locked-alternate", "product-plan-branch-locked",
	).Error)
	var previous models.ProductionPlan
	require.NoError(t, database.First(&previous, "id = ?", "plan-branch-locked").Error)
	updated := previous
	updated.BOMVersionLevel = "alternate"

	err = ValidateProductionPlanBOMBranchTx(database, &updated, &previous)

	require.ErrorIs(t, err, ErrInvalidProductionPlanBOMBranch)
	require.Contains(t, err.Error(), "cannot change its MBOM branch")
}
