package services

import (
	"context"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type qualityQuantitySettlementTestTxManager struct {
	database *gorm.DB
}

func (m qualityQuantitySettlementTestTxManager) DB() *gorm.DB {
	return m.database
}

func (m qualityQuantitySettlementTestTxManager) WithinTransaction(
	fn func(tx *gorm.DB) error,
) error {
	return m.database.Transaction(fn)
}

func TestValidateQualityBatchQuantitySettlementRequiresExactQuantityBreakdown(t *testing.T) {
	valid := &models.QualityBatchQuantitySettlement{
		ProductionPlanID:  "plan-001",
		ProductID:         "product-001",
		BatchNo:           "batch-001",
		InspectionTaskID:  "task-001",
		InputQuantity:     10,
		QualifiedQuantity: 7,
		RejectedQuantity:  2,
		ReworkQuantity:    1,
		QuantityUnit:      "pcs",
	}
	require.NoError(t, ValidateQualityBatchQuantitySettlement(valid))
	require.False(t, valid.OccurredAt.IsZero())

	invalid := *valid
	invalid.ReworkQuantity = 0
	require.Error(t, ValidateQualityBatchQuantitySettlement(&invalid))
}

func TestConfirmQualityBatchQuantitySettlementUpsertsOneFactPerPlanAndBatch(t *testing.T) {
	database, err := gorm.Open(
		sqlite.Open("file:quality_quantity_settlement?mode=memory&cache=shared"),
		&gorm.Config{},
	)
	require.NoError(t, err)
	createQualityQuantitySettlementTestSchema(t, database)

	completedAt := time.Date(2026, time.July, 24, 9, 0, 0, 0, time.UTC)
	task := models.InspectionTask{
		BaseModel: models.BaseModel{
			ID:        "task-001",
			CreatedAt: completedAt,
		},
		ProductionPlanID: "plan-001",
		OrderID:          "order-001",
		BatchNo:          "batch-001",
		ProductID:        "product-001",
		Result:           "PASS",
		CompletedAt:      &completedAt,
	}
	insertQualityQuantitySettlementTestProduct(t, database, task.ProductID)
	insertQualityQuantitySettlementTestPlan(
		t,
		database,
		task.ProductionPlanID,
		task.OrderID,
		task.ProductID,
		"COMPLETED",
	)
	insertQualityQuantitySettlementTestInspectionTask(t, database, task)

	service := &qualityQuantitySettlementService{
		txManager: qualityQuantitySettlementTestTxManager{database: database},
		database:  database,
	}
	occurredAt := completedAt
	first, err := service.Confirm(
		context.Background(),
		&models.QualityBatchQuantitySettlement{
			ProductionPlanID:  task.ProductionPlanID,
			OrderID:           task.OrderID,
			ProductID:         task.ProductID,
			BatchNo:           task.BatchNo,
			InspectionTaskID:  task.ID,
			InputQuantity:     10,
			QualifiedQuantity: 8,
			RejectedQuantity:  1,
			ReworkQuantity:    1,
			QuantityUnit:      "pcs",
			OccurredAt:        occurredAt,
		},
	)
	require.NoError(t, err)
	require.NotEmpty(t, first.ID)
	require.Equal(t, float64(8), first.QualifiedQuantity)

	second, err := service.Confirm(
		context.Background(),
		&models.QualityBatchQuantitySettlement{
			ProductionPlanID:  task.ProductionPlanID,
			OrderID:           task.OrderID,
			ProductID:         task.ProductID,
			BatchNo:           task.BatchNo,
			InspectionTaskID:  task.ID,
			InputQuantity:     10,
			QualifiedQuantity: 9,
			RejectedQuantity:  1,
			ReworkQuantity:    0,
			QuantityUnit:      "pcs",
			OccurredAt:        occurredAt,
		},
	)
	require.NoError(t, err)
	require.Equal(t, first.ID, second.ID)

	var count int64
	require.NoError(
		t,
		database.Model(&models.QualityBatchQuantitySettlement{}).Count(&count).Error,
	)
	require.Equal(t, int64(1), count)
	require.Equal(t, float64(9), second.QualifiedQuantity)
}

func TestConfirmQualityBatchQuantitySettlementRejectsPendingInspection(t *testing.T) {
	database, err := gorm.Open(
		sqlite.Open("file:quality_quantity_settlement_pending?mode=memory&cache=shared"),
		&gorm.Config{},
	)
	require.NoError(t, err)
	createQualityQuantitySettlementTestSchema(t, database)
	insertQualityQuantitySettlementTestProduct(t, database, "product-pending")
	insertQualityQuantitySettlementTestPlan(
		t,
		database,
		"plan-pending",
		"",
		"product-pending",
		"IN_PROGRESS",
	)
	insertQualityQuantitySettlementTestInspectionTask(t, database, models.InspectionTask{
		BaseModel:        models.BaseModel{ID: "task-pending"},
		ProductionPlanID: "plan-pending",
		BatchNo:          "batch-pending",
		ProductID:        "product-pending",
		Result:           "PENDING",
	})

	service := &qualityQuantitySettlementService{
		txManager: qualityQuantitySettlementTestTxManager{database: database},
		database:  database,
	}
	_, err = service.Confirm(
		context.Background(),
		&models.QualityBatchQuantitySettlement{
			ProductionPlanID:  "plan-pending",
			ProductID:         "product-pending",
			BatchNo:           "batch-pending",
			InspectionTaskID:  "task-pending",
			InputQuantity:     1,
			QualifiedQuantity: 1,
			QuantityUnit:      "pcs",
		},
	)
	require.Error(t, err)
}

func createQualityQuantitySettlementTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()

	statements := []string{
		`CREATE TABLE products (
			id TEXT PRIMARY KEY,
			deleted_at DATETIME
		)`,
		`CREATE TABLE production_plans (
			id TEXT PRIMARY KEY,
			order_id TEXT,
			product_id TEXT,
			status TEXT,
			deleted_at DATETIME
		)`,
		`CREATE TABLE inspection_tasks (
			id TEXT PRIMARY KEY,
			production_plan_id TEXT,
			order_id TEXT,
			batch_no TEXT,
			product_id TEXT,
			result TEXT,
			completed_at DATETIME,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE quality_batch_quantity_settlements (
			id TEXT PRIMARY KEY,
			production_plan_id TEXT NOT NULL,
			order_id TEXT,
			product_id TEXT NOT NULL,
			batch_no TEXT NOT NULL,
			inspection_task_id TEXT NOT NULL,
			input_quantity REAL NOT NULL,
			qualified_quantity REAL NOT NULL,
			rejected_quantity REAL NOT NULL,
			rework_quantity REAL NOT NULL,
			quantity_unit TEXT NOT NULL,
			occurred_at DATETIME NOT NULL,
			confirmed_at DATETIME NOT NULL,
			confirmed_by TEXT NOT NULL,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)`,
	}
	for _, statement := range statements {
		require.NoError(t, database.Exec(statement).Error)
	}
}

func insertQualityQuantitySettlementTestProduct(
	t *testing.T,
	database *gorm.DB,
	id string,
) {
	t.Helper()
	require.NoError(
		t,
		database.Exec("INSERT INTO products (id) VALUES (?)", id).Error,
	)
}

func insertQualityQuantitySettlementTestPlan(
	t *testing.T,
	database *gorm.DB,
	id string,
	orderID string,
	productID string,
	status string,
) {
	t.Helper()
	require.NoError(
		t,
		database.Exec(
			"INSERT INTO production_plans (id, order_id, product_id, status) VALUES (?, ?, ?, ?)",
			id,
			orderID,
			productID,
			status,
		).Error,
	)
}

func insertQualityQuantitySettlementTestInspectionTask(
	t *testing.T,
	database *gorm.DB,
	task models.InspectionTask,
) {
	t.Helper()
	require.NoError(
		t,
		database.Exec(
			"INSERT INTO inspection_tasks (id, production_plan_id, order_id, batch_no, product_id, result, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
			task.ID,
			task.ProductionPlanID,
			task.OrderID,
			task.BatchNo,
			task.ProductID,
			task.Result,
			task.CompletedAt,
			task.CreatedAt,
			task.UpdatedAt,
		).Error,
	)
}
