package services

import (
	"context"
	"database/sql"
	"os"
	"strings"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestFinanceSalaryPostgresCalculationRunsInsideReadOnlyTransactionWithoutProductionOrReportTables(t *testing.T) {
	dsn := strings.TrimSpace(os.Getenv("PIECEWORK_TEST_POSTGRES_DSN"))
	if dsn == "" {
		t.Skip("set PIECEWORK_TEST_POSTGRES_DSN for isolated PostgreSQL salary calculation verification")
	}
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	schema := "finance_salary_calculation_" + strings.ReplaceAll(uuid.NewString(), "-", "")
	require.NoError(t, database.Exec("CREATE SCHEMA "+schema).Error)
	t.Cleanup(func() { require.NoError(t, database.Exec("DROP SCHEMA "+schema+" CASCADE").Error) })
	require.NoError(t, database.Exec("SET search_path TO "+schema+", public").Error)
	require.NoError(t, db.EnsureIndependentPieceworkPayrollStorageContract(database))
	for _, statement := range []string{
		`CREATE TABLE employees(id UUID PRIMARY KEY, staff_id TEXT, name TEXT, deleted_at TIMESTAMP)`,
		`CREATE TABLE employee_assignments(employee_id UUID, org_unit_id UUID, is_primary BOOLEAN, deleted_at TIMESTAMP)`,
		`CREATE TABLE org_units(id UUID PRIMARY KEY, name TEXT, unit_type TEXT, sort_order INTEGER, deleted_at TIMESTAMP)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
	require.NoError(t, database.Table("employees").Create(map[string]any{"id": pieceworkTestEmployeeID, "staff_id": "E001", "name": "Existing employee"}).Error)
	require.NoError(t, database.Table("org_units").Create(map[string]any{"id": financeSalaryTestDepartmentID, "name": "Existing department", "unit_type": "department", "sort_order": 1}).Error)
	require.NoError(t, database.Table("employee_assignments").Create(map[string]any{"employee_id": pieceworkTestEmployeeID, "org_unit_id": financeSalaryTestDepartmentID, "is_primary": true}).Error)
	require.NoError(t, database.Create(&models.PieceworkPayItem{BaseModel: models.BaseModel{ID: pieceworkTestPayItemID}, Code: "PAY-001", Name: "Independent salary step", Unit: "PCS", Status: "active", Version: 1}).Error)
	date := pieceworkTestDate("2026-10-01")
	require.NoError(t, database.Create(&models.PieceworkRate{PayItemID: pieceworkTestPayItemID, PayItemCode: "PAY-001", PayItemName: "Independent salary step", Unit: "PCS", UnitPrice: 2, Currency: "CNY", EffectiveFrom: &date, Status: "active", Version: 1}).Error)
	require.NoError(t, db.EnsureIndependentPieceworkPayrollStorageContract(database))
	require.NoError(t, database.Transaction(func(tx *gorm.DB) error {
		for _, quantity := range []float64{3, 4, 0.0025} {
			result, err := calculateFinancePieceworkSalaryFromMasterData(context.Background(), tx, financeSalaryTestCalculationRequest(quantity))
			require.NoError(t, err)
			require.Len(t, result.Rows, 1)
			require.Equal(t, financeSalaryTestDepartmentID, result.Rows[0].DepartmentID)
			if quantity == 0.0025 {
				require.Equal(t, int64(1), result.Rows[0].AmountCents)
			}
		}
		return nil
	}, &sql.TxOptions{ReadOnly: true}))
	for _, table := range []string{"piecework_records", "piecework_payroll_settlement_batches", "production_operation_executions", "products"} {
		require.False(t, database.Migrator().HasTable(table))
	}
}
