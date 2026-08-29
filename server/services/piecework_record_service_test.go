package services

import (
	"testing"
	"time"

	"xdfc-server/models"

	"github.com/stretchr/testify/require"
)

func TestPieceworkRecordServiceFreezesResolvedRateIdentityAndSnapshot(t *testing.T) {
	rateService, database := newPieceworkRateTestService(t)
	seedPieceworkRateProcess(t, database, "process-record", "RECORD", "记录作业")
	require.NoError(t, database.Exec(`
		CREATE TABLE piecework_records (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			work_date DATETIME NOT NULL,
			employee_id TEXT,
			team_id TEXT,
			product_id TEXT,
			product_name TEXT,
			route_id TEXT,
			route_step_id TEXT,
			process_step_id TEXT,
			process_code TEXT,
			process_name TEXT,
			rate_id TEXT,
			rate_version INTEGER,
			quantity REAL,
			unit TEXT,
			currency TEXT,
			unit_price REAL,
			total_amount REAL,
			source_execution_id TEXT,
			is_settled BOOLEAN
		)
	`).Error)

	rate, err := rateService.SavePieceworkRateDTO(pieceworkRateTestContext(), PieceworkRateWriteDTO{
		ProductID:     "product-g24",
		ProcessStepID: "process-record",
		UnitPrice:     pointerFloat(2.5),
		EffectiveFrom: time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC).Format(time.RFC3339),
	})
	require.NoError(t, err)

	recordService := NewPieceworkRecordService(pieceworkRateTestTxManager{db: database})
	record, err := recordService.RecordPiecework(pieceworkRateTestContext(), PieceworkRecordCommand{
		WorkDate:      time.Date(2026, 8, 14, 0, 0, 0, 0, time.UTC),
		ProductID:     "product-g24",
		ProductName:   "G24",
		ProcessStepID: "process-record",
		Quantity:      4,
	})
	require.NoError(t, err)
	require.Equal(t, rate.ID, record.RateID)
	require.Equal(t, rate.Version, record.RateVersion)
	require.Equal(t, "process-record", record.ProcessStepID)
	require.Equal(t, "RECORD", record.ProcessCode)
	require.Equal(t, "PCS", record.Unit)
	require.Equal(t, "CNY", record.Currency)
	require.Equal(t, 2.5, record.UnitPrice)
	require.Equal(t, 10.0, record.TotalAmount)
}

func TestPieceworkRecordServicePrefersRouteSpecificRate(t *testing.T) {
	rateService, database := newPieceworkRateTestService(t)
	seedPieceworkRateProcess(t, database, "process-route-record", "ROUTE-RECORD", "路线记录")
	require.NoError(t, database.Create(&models.ProductionRoute{
		BaseModel: models.BaseModel{ID: "route-record"},
		Code:      "ROUTE-RECORD-V1",
		Name:      "路线记录",
		ProductID: "product-g24",
		Status:    "PUBLISHED",
	}).Error)
	require.NoError(t, database.Create(&models.ProductionRouteStep{
		BaseModel:     models.BaseModel{ID: "route-step-record"},
		RouteID:       "route-record",
		Sequence:      10,
		SegmentID:     "segment-record",
		ProcessStepID: "process-route-record",
	}).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE piecework_records (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			work_date DATETIME NOT NULL,
			employee_id TEXT,
			team_id TEXT,
			product_id TEXT,
			product_name TEXT,
			route_id TEXT,
			route_step_id TEXT,
			process_step_id TEXT,
			process_code TEXT,
			process_name TEXT,
			rate_id TEXT,
			rate_version INTEGER,
			quantity REAL,
			unit TEXT,
			currency TEXT,
			unit_price REAL,
			total_amount REAL,
			source_execution_id TEXT,
			is_settled BOOLEAN
		)
	`).Error)

	start := time.Date(2026, 8, 1, 0, 0, 0, 0, time.UTC)
	generic, err := rateService.SavePieceworkRateDTO(pieceworkRateTestContext(), PieceworkRateWriteDTO{
		ProductID:     "product-g24",
		ProcessStepID: "process-route-record",
		UnitPrice:     pointerFloat(1),
		EffectiveFrom: start.Format(time.RFC3339),
	})
	require.NoError(t, err)
	routeSpecific, err := rateService.SavePieceworkRateDTO(pieceworkRateTestContext(), PieceworkRateWriteDTO{
		ProductID:     "product-g24",
		ProcessStepID: "process-route-record",
		RouteStepID:   "route-step-record",
		UnitPrice:     pointerFloat(2),
		EffectiveFrom: start.Add(24 * time.Hour).Format(time.RFC3339),
	})
	require.NoError(t, err)

	recordService := NewPieceworkRecordService(pieceworkRateTestTxManager{db: database})
	record, err := recordService.RecordPiecework(pieceworkRateTestContext(), PieceworkRecordCommand{
		WorkDate:      start.Add(48 * time.Hour),
		ProductID:     "product-g24",
		RouteID:       "route-record",
		RouteStepID:   "route-step-record",
		ProcessStepID: "process-route-record",
		Quantity:      3,
	})
	require.NoError(t, err)
	require.NotEqual(t, generic.ID, record.RateID)
	require.Equal(t, routeSpecific.ID, record.RateID)
	require.Equal(t, 2.0, record.UnitPrice)
	require.Equal(t, 6.0, record.TotalAmount)
}
