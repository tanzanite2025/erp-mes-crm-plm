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
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			order_no TEXT,
			order_id TEXT,
			product_id TEXT,
			product_name TEXT,
			quantity REAL,
			status TEXT,
			start_date DATETIME,
			end_date DATETIME,
			notes TEXT
		)
	`).Error)
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

func TestSaveProductionExecutionLotCreatesOptionalBatchLink(t *testing.T) {
	service, database := newProductionExecutionLotTestService(t)
	require.NoError(t, database.Create(&models.ProductionPlan{
		BaseModel:   models.BaseModel{ID: "plan-a"},
		OrderNo:     "MO-001",
		ProductID:   "product-a",
		ProductName: "产品A",
		Quantity:    10,
	}).Error)
	require.NoError(t, database.Create(&models.ProductionTask{
		ID:        "task-a",
		PlanID:    "plan-a",
		BatchNo:   "BATCH-001",
		TargetQty: 10,
	}).Error)

	lot, err := service.SaveProductionExecutionLot(SaveProductionExecutionLotRequest{
		ProductBarcode: " abc-001 ",
		ProductID:      "product-a",
		ProductName:    "产品A",
		PlanID:         "plan-a",
		TaskID:         "task-a",
		BatchNo:        " BATCH-001 ",
		Quantity:       2,
		Operator:       "tester",
	})

	require.NoError(t, err)
	require.Equal(t, "ABC-001", lot.ProductBarcode)
	require.Equal(t, "BATCH-001", lot.BatchNo)
	require.Equal(t, ProductionExecutionLotStatusActive, lot.Status)
	require.Equal(t, 2.0, lot.Quantity)

	list, err := service.ListProductionExecutionLots(ProductionExecutionLotListQuery{
		ProductBarcode: "abc-001",
	})
	require.NoError(t, err)
	require.EqualValues(t, 1, list.Total)
	require.Len(t, list.Items, 1)
	require.Equal(t, lot.ID, list.Items[0].ID)
}

func TestSaveProductionExecutionLotUpsertsByProductBarcode(t *testing.T) {
	service, _ := newProductionExecutionLotTestService(t)

	first, err := service.SaveProductionExecutionLot(SaveProductionExecutionLotRequest{
		ProductBarcode: "ABC-002",
		BatchNo:        "BATCH-A",
		Quantity:       1,
	})
	require.NoError(t, err)

	second, err := service.SaveProductionExecutionLot(SaveProductionExecutionLotRequest{
		ProductBarcode: "ABC-002",
		BatchNo:        "BATCH-B",
		Quantity:       3,
	})
	require.NoError(t, err)

	require.Equal(t, first.ID, second.ID)
	require.Equal(t, "BATCH-B", second.BatchNo)
	require.Equal(t, 3.0, second.Quantity)
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
