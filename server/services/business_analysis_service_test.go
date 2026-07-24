package services

import (
	"context"
	"encoding/csv"
	"strings"
	"testing"
	"time"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func TestBusinessAnalysisProductionCapacityKeepsQualityMetricsExplicitlyUnavailable(t *testing.T) {
	database, err := gorm.Open(sqlite.Open("file:business_analysis_capacity?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	createBusinessAnalysisTestSchema(t, database)

	loc := time.UTC
	from := time.Date(2026, time.July, 1, 0, 0, 0, 0, loc)
	to := time.Date(2026, time.August, 1, 0, 0, 0, 0, loc)
	completedAt := time.Date(2026, time.July, 3, 10, 0, 0, 0, loc)

	order := models.SalesOrder{
		ID:           "00000000-0000-0000-0000-000000000001",
		OrderNo:      "SO-BA-001",
		CustomerID:   "customer-001",
		CustomerName: "客户 A",
	}
	require.NoError(t, database.Exec(
		"INSERT INTO sales_orders (id, order_no, customer_id, customer_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		order.ID,
		order.OrderNo,
		order.CustomerID,
		order.CustomerName,
		order.CreatedAt,
		order.UpdatedAt,
	).Error)

	plan := models.ProductionPlan{
		BaseModel: models.BaseModel{
			ID:        "00000000-0000-0000-0000-000000000002",
			CreatedAt: time.Date(2026, time.July, 2, 8, 0, 0, 0, loc),
		},
		OrderNo:     order.OrderNo,
		OrderID:     order.ID,
		ProductID:   "product-001",
		ProductName: "型号 A",
		Quantity:    10,
		Status:      "COMPLETED",
		StartDate:   ptrTime(time.Date(2026, time.July, 2, 0, 0, 0, 0, loc)),
	}
	require.NoError(t, database.Exec(
		"INSERT INTO production_plans (id, order_no, order_id, product_id, product_name, quantity, status, start_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		plan.ID,
		plan.OrderNo,
		plan.OrderID,
		plan.ProductID,
		plan.ProductName,
		plan.Quantity,
		plan.Status,
		plan.StartDate,
		plan.CreatedAt,
		plan.UpdatedAt,
	).Error)
	require.NoError(t, database.Exec(
		"INSERT INTO production_tasks (id, plan_id, batch_no, target_qty, actual_qty, status, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		"00000000-0000-0000-0000-000000000003",
		plan.ID,
		"B-001",
		10,
		6,
		"DONE",
		completedAt,
	).Error)
	require.NoError(t, database.Exec(
		"INSERT INTO quality_abnormalities (id, task_id, disposal_method, status, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
		"00000000-0000-0000-0000-000000000004",
		"missing-task",
		"SCRAP",
		"CLOSED",
		"缺少报废数量",
		time.Date(2026, time.July, 5, 9, 0, 0, 0, loc),
		time.Date(2026, time.July, 5, 9, 0, 0, 0, loc),
	).Error)

	response, err := NewBusinessAnalysisService(database).QueryProductionCapacity(
		context.Background(),
		BusinessAnalysisProductionCapacityQuery{From: from, To: to},
	)
	require.NoError(t, err)
	require.Equal(t, float64(10), response.Summary.PlannedQuantity)
	require.Equal(t, float64(6), response.Summary.CompletedQuantity)
	require.NotNil(t, response.Summary.AchievementRate)
	require.InDelta(t, 0.6, *response.Summary.AchievementRate, 0.0001)
	require.Nil(t, response.Summary.QualifiedQuantity)
	require.Nil(t, response.Summary.ScrapQuantity)
	require.Equal(t, int64(1), response.DataQuality.QualityScrapRecordCount)
	require.Equal(t, int64(1), response.DataQuality.UnlinkedQualityRecords)
	require.Equal(t, int64(1), response.DataQuality.MissingQuantityRecords)
	require.False(t, response.DataQuality.IsComplete)
	require.Len(t, response.Breakdowns.ByProduct, 1)
	require.Equal(t, "型号 A", response.Breakdowns.ByProduct[0].ProductName)
}

func TestBusinessAnalysisDoesNotInferQualifiedQuantityFromPassedSample(t *testing.T) {
	database, err := gorm.Open(sqlite.Open("file:business_analysis_qualified_quantity_boundary?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	createBusinessAnalysisTestSchema(t, database)

	loc := time.UTC
	from := time.Date(2026, time.July, 1, 0, 0, 0, 0, loc)
	to := time.Date(2026, time.August, 1, 0, 0, 0, 0, loc)
	planID := "00000000-0000-0000-0000-000000000041"
	createdAt := time.Date(2026, time.July, 8, 8, 0, 0, 0, loc)

	require.NoError(t, database.Exec(
		"INSERT INTO production_plans (id, product_id, product_name, quantity, status, start_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		planID,
		"product-041",
		"型号 D",
		10,
		"COMPLETED",
		createdAt,
		createdAt,
		createdAt,
	).Error)
	require.NoError(t, database.Exec(
		"INSERT INTO production_tasks (id, plan_id, target_qty, actual_qty, status, completed_at) VALUES (?, ?, ?, ?, ?, ?)",
		"00000000-0000-0000-0000-000000000042",
		planID,
		10,
		10,
		"DONE",
		createdAt,
	).Error)
	require.NoError(t, database.Exec(
		"INSERT INTO inspection_tasks (id, production_plan_id, product_id, batch_no, sample_qty, result) VALUES (?, ?, ?, ?, ?, ?)",
		"00000000-0000-0000-0000-000000000043",
		planID,
		"product-041",
		"B-041",
		2,
		"PASS",
	).Error)

	response, err := NewBusinessAnalysisService(database).QueryProductionCapacity(
		context.Background(),
		BusinessAnalysisProductionCapacityQuery{From: from, To: to},
	)
	require.NoError(t, err)
	require.Equal(t, float64(10), response.Summary.CompletedQuantity)
	require.Nil(t, response.Summary.QualifiedQuantity)
	require.Nil(t, response.Summary.YieldRate)
	require.Contains(t, response.DataQuality.Notes, "QUALITY_QUALIFIED_QUANTITY_MISSING")
}

func TestBusinessAnalysisProductionCapacityCountsMissingCompletionTimestamp(t *testing.T) {
	database, err := gorm.Open(sqlite.Open("file:business_analysis_missing_timestamp?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	createBusinessAnalysisTestSchema(t, database)

	loc := time.UTC
	from := time.Date(2026, time.July, 1, 0, 0, 0, 0, loc)
	to := time.Date(2026, time.August, 1, 0, 0, 0, 0, loc)
	plan := models.ProductionPlan{
		BaseModel: models.BaseModel{
			ID:        "00000000-0000-0000-0000-000000000011",
			CreatedAt: time.Date(2026, time.July, 4, 8, 0, 0, 0, loc),
		},
		OrderNo:   "SO-BA-002",
		ProductID: "product-002",
		Quantity:  4,
		Status:    "IN_PROGRESS",
	}
	require.NoError(t, database.Exec(
		"INSERT INTO production_plans (id, order_no, product_id, product_name, quantity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		plan.ID,
		plan.OrderNo,
		plan.ProductID,
		plan.ProductName,
		plan.Quantity,
		plan.Status,
		plan.CreatedAt,
		plan.UpdatedAt,
	).Error)
	require.NoError(t, database.Exec(
		"INSERT INTO production_tasks (id, plan_id, target_qty, actual_qty, status) VALUES (?, ?, ?, ?, ?)",
		"00000000-0000-0000-0000-000000000012",
		plan.ID,
		4,
		4,
		"DONE",
	).Error)

	response, err := NewBusinessAnalysisService(database).QueryProductionCapacity(
		context.Background(),
		BusinessAnalysisProductionCapacityQuery{From: from, To: to},
	)
	require.NoError(t, err)
	require.Equal(t, int64(1), response.DataQuality.MissingCompletionTimestampRecords)
	require.Equal(t, float64(0), response.Summary.CompletedQuantity)
}

func TestBusinessAnalysisProductionCapacityIncludesValidatedScrapQuantity(t *testing.T) {
	database, err := gorm.Open(sqlite.Open("file:business_analysis_valid_scrap?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	createBusinessAnalysisTestSchema(t, database)

	loc := time.UTC
	from := time.Date(2026, time.July, 1, 0, 0, 0, 0, loc)
	to := time.Date(2026, time.August, 1, 0, 0, 0, 0, loc)
	occurredAt := time.Date(2026, time.July, 6, 10, 0, 0, 0, loc)

	orderID := "00000000-0000-0000-0000-000000000021"
	planID := "00000000-0000-0000-0000-000000000022"
	require.NoError(t, database.Exec(
		"INSERT INTO sales_orders (id, order_no, customer_id, customer_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		orderID,
		"SO-BA-021",
		"customer-021",
		"客户 B",
		occurredAt,
		occurredAt,
	).Error)
	require.NoError(t, database.Exec(
		"INSERT INTO production_plans (id, order_no, order_id, product_id, product_name, quantity, status, start_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		planID,
		"SO-BA-021",
		orderID,
		"product-021",
		"型号 B",
		20,
		"COMPLETED",
		occurredAt,
		occurredAt,
		occurredAt,
	).Error)
	require.NoError(t, database.Exec(
		"INSERT INTO quality_abnormalities (id, disposal_method, scrap_quantity, scrap_unit, production_plan_id, order_id, product_id, batch_no, occurred_at, status, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		"00000000-0000-0000-0000-000000000023",
		"SCRAP",
		2.5,
		"pcs",
		planID,
		orderID,
		"product-021",
		"B-021",
		occurredAt,
		"CLOSED",
		"已确认报废",
		occurredAt,
		occurredAt,
	).Error)

	response, err := NewBusinessAnalysisService(database).QueryProductionCapacity(
		context.Background(),
		BusinessAnalysisProductionCapacityQuery{From: from, To: to},
	)
	require.NoError(t, err)
	require.NotNil(t, response.Summary.ScrapQuantity)
	require.InDelta(t, 2.5, *response.Summary.ScrapQuantity, 0.0001)
	require.Equal(t, int64(1), response.DataQuality.QualityScrapRecordCount)
	require.Equal(t, int64(0), response.DataQuality.MissingQuantityRecords)
	require.Equal(t, int64(0), response.DataQuality.UnlinkedQualityRecords)
	require.True(t, response.DataQuality.QualityQuantityAvailable)
	require.True(t, response.DataQuality.QualityProductionLinkageAvailable)
	require.Contains(t, response.DataQuality.Notes, "QUALITY_QUALIFIED_QUANTITY_MISSING")
}

func TestBusinessAnalysisProductionCapacityUsesConfirmedQualifiedQuantityFact(t *testing.T) {
	database, err := gorm.Open(sqlite.Open("file:business_analysis_qualified_fact?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	createBusinessAnalysisTestSchema(t, database)

	loc := time.UTC
	from := time.Date(2026, time.July, 1, 0, 0, 0, 0, loc)
	to := time.Date(2026, time.August, 1, 0, 0, 0, 0, loc)
	occurredAt := time.Date(2026, time.July, 8, 10, 0, 0, 0, loc)
	planID := "00000000-0000-0000-0000-000000000061"
	taskID := "00000000-0000-0000-0000-000000000062"

	require.NoError(t, database.Exec(
		"INSERT INTO production_plans (id, product_id, product_name, quantity, status, start_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		planID,
		"product-061",
		"型号 F",
		12,
		"COMPLETED",
		occurredAt,
		occurredAt,
		occurredAt,
	).Error)
	require.NoError(t, database.Exec(
		"INSERT INTO inspection_tasks (id, production_plan_id, batch_no, product_id, result, completed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
		taskID,
		planID,
		"B-061",
		"product-061",
		"PASS",
		occurredAt,
		occurredAt,
		occurredAt,
	).Error)
	require.NoError(t, database.Exec(
		"INSERT INTO quality_batch_quantity_settlements (id, production_plan_id, product_id, batch_no, inspection_task_id, input_quantity, qualified_quantity, rejected_quantity, rework_quantity, quantity_unit, occurred_at, confirmed_at, confirmed_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		"00000000-0000-0000-0000-000000000063",
		planID,
		"product-061",
		"B-061",
		taskID,
		12,
		10,
		1,
		1,
		"pcs",
		occurredAt,
		occurredAt,
		"quality-user",
		occurredAt,
		occurredAt,
	).Error)

	response, err := NewBusinessAnalysisService(database).QueryProductionCapacity(
		context.Background(),
		BusinessAnalysisProductionCapacityQuery{From: from, To: to},
	)
	require.NoError(t, err)
	require.NotNil(t, response.Summary.QualifiedQuantity)
	require.Equal(t, float64(10), *response.Summary.QualifiedQuantity)
	require.Equal(t, int64(1), response.DataQuality.QualifiedQuantityFactCount)
	require.Equal(t, int64(0), response.DataQuality.MissingQualifiedQuantityRecords)
	require.True(t, response.DataQuality.QualifiedQuantityAvailable)
	require.NotContains(t, response.DataQuality.Notes, "QUALITY_QUALIFIED_QUANTITY_MISSING")
	require.Nil(t, response.Summary.YieldRate)
}

func TestBusinessAnalysisQualityLinkageRequiresAnchorProductAndBatch(t *testing.T) {
	require.True(t, qualityAbnormalityMissingProductionLinkage("", "", "product-1", "batch-1"))
	require.True(t, qualityAbnormalityMissingProductionLinkage("plan-1", "", "", "batch-1"))
	require.True(t, qualityAbnormalityMissingProductionLinkage("plan-1", "", "product-1", ""))
	require.False(t, qualityAbnormalityMissingProductionLinkage("plan-1", "", "product-1", "batch-1"))
	require.False(t, qualityAbnormalityMissingProductionLinkage("", "order-1", "product-1", "batch-1"))
}

func TestExportBusinessAnalysisProductionCapacityCSVUsesAggregatedResponse(t *testing.T) {
	database, err := gorm.Open(sqlite.Open("file:business_analysis_capacity_export?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	createBusinessAnalysisTestSchema(t, database)

	loc := time.UTC
	from := time.Date(2026, time.July, 1, 0, 0, 0, 0, loc)
	to := time.Date(2026, time.August, 1, 0, 0, 0, 0, loc)
	createdAt := time.Date(2026, time.July, 2, 8, 0, 0, 0, loc)
	planID := "00000000-0000-0000-0000-000000000031"

	require.NoError(t, database.Exec(
		"INSERT INTO production_plans (id, order_no, product_id, product_name, quantity, status, start_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		planID,
		"SO-BA-031",
		"product-031",
		"型号 C",
		12,
		"COMPLETED",
		createdAt,
		createdAt,
		createdAt,
	).Error)
	require.NoError(t, database.Exec(
		"INSERT INTO production_tasks (id, plan_id, target_qty, actual_qty, status, completed_at) VALUES (?, ?, ?, ?, ?, ?)",
		"00000000-0000-0000-0000-000000000032",
		planID,
		12,
		9,
		"DONE",
		createdAt,
	).Error)

	export, err := NewBusinessAnalysisService(database).ExportProductionCapacityCSV(
		context.Background(),
		BusinessAnalysisProductionCapacityQuery{From: from, To: to},
	)
	require.NoError(t, err)
	require.Equal(t, "text/csv; charset=utf-8", export.ContentType)
	require.Equal(
		t,
		"business-analysis-production-capacity_2026-07-01_2026-08-01.csv",
		export.FileName,
	)
	require.True(t, strings.HasPrefix(string(export.Content), "\uFEFF"))

	csvText := strings.TrimPrefix(string(export.Content), "\uFEFF")
	require.Contains(t, csvText, "月产能分析")
	require.Contains(t, csvText, "型号 C")
	require.Contains(t, csvText, "计划达成率,75.00%")

	reader := csv.NewReader(strings.NewReader(csvText))
	reader.FieldsPerRecord = -1
	records, err := reader.ReadAll()
	require.NoError(t, err)
	require.NotEmpty(t, records)
}

func TestBusinessAnalysisProductionCapacityDrilldownUsesSamePlanAndTaskDateContract(t *testing.T) {
	database, err := gorm.Open(sqlite.Open("file:business_analysis_capacity_drilldown?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	createBusinessAnalysisTestSchema(t, database)

	loc := time.UTC
	from := time.Date(2026, time.July, 1, 0, 0, 0, 0, loc)
	to := time.Date(2026, time.August, 1, 0, 0, 0, 0, loc)
	orderID := "00000000-0000-0000-0000-000000000051"
	planID := "00000000-0000-0000-0000-000000000052"
	taskID := "00000000-0000-0000-0000-000000000053"
	planDate := time.Date(2026, time.June, 28, 0, 0, 0, 0, loc)
	completedAt := time.Date(2026, time.July, 4, 10, 0, 0, 0, loc)

	require.NoError(t, database.Exec(
		"INSERT INTO sales_orders (id, order_no, customer_id, customer_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
		orderID,
		"SO-BA-051",
		"customer-051",
		"客户 C",
		planDate,
		planDate,
	).Error)
	require.NoError(t, database.Exec(
		"INSERT INTO production_plans (id, order_no, order_id, product_id, product_name, quantity, status, start_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		planID,
		"SO-BA-051",
		orderID,
		"product-051",
		"型号 E",
		11,
		"IN_PROGRESS",
		planDate,
		planDate,
		planDate,
	).Error)
	require.NoError(t, database.Exec(
		"INSERT INTO production_tasks (id, plan_id, batch_no, process_id, process_name, target_qty, actual_qty, status, completed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
		taskID,
		planID,
		"B-051",
		"process-051",
		"裁切",
		11,
		7,
		"DONE",
		completedAt,
	).Error)

	response, err := NewBusinessAnalysisService(database).QueryProductionCapacityDrilldown(
		context.Background(),
		BusinessAnalysisProductionCapacityDrilldownQuery{
			BusinessAnalysisProductionCapacityQuery: BusinessAnalysisProductionCapacityQuery{
				From: from,
				To:   to,
			},
			Dimension: "product",
			Value:     "product-051",
		},
	)
	require.NoError(t, err)
	require.Equal(t, "product", response.Dimension)
	require.Len(t, response.Items, 1)
	require.Equal(t, float64(0), response.Items[0].PlannedQuantity)
	require.Equal(t, float64(7), response.Items[0].CompletedQuantity)
	require.Len(t, response.Items[0].Tasks, 1)
	require.Equal(t, "B-051", response.Items[0].Tasks[0].BatchNo)
	require.Equal(t, "裁切", response.Items[0].Tasks[0].ProcessName)
}

func ptrTime(value time.Time) *time.Time {
	return &value
}

func createBusinessAnalysisTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()
	statements := []string{
		`CREATE TABLE sales_orders (
			id TEXT PRIMARY KEY,
			order_no TEXT,
			customer_id TEXT,
			customer_name TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE production_plans (
			id TEXT PRIMARY KEY,
			order_no TEXT,
			order_id TEXT,
			product_id TEXT,
			product_name TEXT,
			quantity REAL,
			status TEXT,
			start_date DATETIME,
			end_date DATETIME,
			notes TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE production_tasks (
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
		)`,
		`CREATE TABLE inspection_tasks (
			id TEXT PRIMARY KEY,
			production_plan_id TEXT,
			order_id TEXT,
			batch_no TEXT,
			product_id TEXT,
			product_name TEXT,
			sample_qty REAL,
			result TEXT,
			input_data TEXT,
			remarks TEXT,
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
		`CREATE TABLE quality_abnormalities (
			id TEXT PRIMARY KEY,
			task_id TEXT,
			disposal_method TEXT,
			scrap_quantity REAL,
			scrap_unit TEXT,
			production_plan_id TEXT,
			order_id TEXT,
			product_id TEXT,
			batch_no TEXT,
			occurred_at DATETIME,
			status TEXT,
			description TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
	}
	for _, statement := range statements {
		require.NoError(t, database.Exec(statement).Error)
	}
}
