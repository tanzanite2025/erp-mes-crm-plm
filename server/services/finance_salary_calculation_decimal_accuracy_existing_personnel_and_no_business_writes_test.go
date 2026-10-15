package services

import (
	"context"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"math"
	"testing"
)

const financeSalaryTestDepartmentID = "55555555-5555-4555-8555-555555555555"

func createFinanceSalaryExistingDepartmentAndAssignmentTestData(t *testing.T, database *gorm.DB) {
	t.Helper()
	for _, statement := range []string{
		`CREATE TABLE org_units(id TEXT PRIMARY KEY, name TEXT, deleted_at TIMESTAMP, unit_type TEXT, sort_order INTEGER)`,
		`CREATE TABLE employee_assignments(employee_id TEXT, org_unit_id TEXT, deleted_at TIMESTAMP, is_primary BOOLEAN)`,
	} {
		require.NoError(t, database.Exec(statement).Error)
	}
	require.NoError(t, database.Table("org_units").Create(map[string]any{"id": financeSalaryTestDepartmentID, "name": "Existing finance department", "unit_type": "department", "sort_order": 1}).Error)
	require.NoError(t, database.Table("employee_assignments").Create(map[string]any{"employee_id": pieceworkTestEmployeeID, "org_unit_id": financeSalaryTestDepartmentID, "is_primary": true}).Error)
}

func financeSalaryTestCalculationRequest(quantity float64) FinancePieceworkSalaryCalculationRequest {
	return FinancePieceworkSalaryCalculationRequest{CalculationDate: "2026-10-15", Rows: []FinancePieceworkSalaryCalculationRow{{EmployeeID: pieceworkTestEmployeeID, DepartmentID: financeSalaryTestDepartmentID, PayItemID: pieceworkTestPayItemID, Quantity: quantity}}}
}

func TestFinanceSalaryCalculationUsesExistingPeopleDepartmentsAndWritesNoBusinessFacts(t *testing.T) {
	rates, database := newPieceworkRateTestService(t)
	createFinanceSalaryExistingDepartmentAndAssignmentTestData(t, database)
	_, err := rates.CreatePieceworkRate(pieceworkRateTestContext(), pieceworkTestRateCommand())
	require.NoError(t, err)
	options, err := listFinancePieceworkCalculationOptionsFromExistingMasterData(database)
	require.NoError(t, err)
	require.Len(t, options.Employees, 1)
	require.Equal(t, financeSalaryTestDepartmentID, options.Employees[0].DepartmentID)
	require.Len(t, options.Departments, 1)
	writeCount := 0
	for _, register := range []func(string, func(*gorm.DB)) error{
		database.Callback().Create().Before("gorm:create").Register,
		database.Callback().Update().Before("gorm:update").Register,
		database.Callback().Delete().Before("gorm:delete").Register,
	} {
		require.NoError(t, register("salary_calculation_must_only_read", func(*gorm.DB) { writeCount++ }))
	}
	first, err := calculateFinancePieceworkSalaryFromMasterData(context.Background(), database, financeSalaryTestCalculationRequest(3))
	require.NoError(t, err)
	require.Equal(t, int64(600), first.Rows[0].AmountCents)
	repeated, err := calculateFinancePieceworkSalaryFromMasterData(context.Background(), database, financeSalaryTestCalculationRequest(3))
	require.NoError(t, err)
	require.Equal(t, first, repeated)
	changed, err := calculateFinancePieceworkSalaryFromMasterData(context.Background(), database, financeSalaryTestCalculationRequest(4))
	require.NoError(t, err)
	require.Equal(t, int64(800), changed.Rows[0].AmountCents)
	require.Zero(t, writeCount)
	for _, table := range []string{"piecework_records", "piecework_payroll_settlement_batches", "piecework_payroll_adjustments", "production_operation_executions", "products", "teams_for_salary"} {
		require.False(t, database.Migrator().HasTable(table))
	}
}

func TestFinanceSalaryCalculationRoundsDecimalsOnceAndAcceptsZeroQuantity(t *testing.T) {
	rates, database := newPieceworkRateTestService(t)
	createFinanceSalaryExistingDepartmentAndAssignmentTestData(t, database)
	_, err := rates.CreatePieceworkRate(pieceworkRateTestContext(), pieceworkTestRateCommand())
	require.NoError(t, err)
	for _, testCase := range []struct {
		quantity float64
		cents    int64
	}{{0, 0}, {0.0025, 1}, {0.1, 20}, {1.2345, 247}, {99999999.9999, 20000000000}} {
		result, err := calculateFinancePieceworkSalaryFromMasterData(context.Background(), database, financeSalaryTestCalculationRequest(testCase.quantity))
		require.NoError(t, err)
		require.Equal(t, testCase.cents, result.Rows[0].AmountCents)
	}
}

func TestFinanceSalaryCalculationRejectsInvalidInputsAndMissingRatesWithoutPartialResults(t *testing.T) {
	_, database := newPieceworkRateTestService(t)
	createFinanceSalaryExistingDepartmentAndAssignmentTestData(t, database)
	for _, quantity := range []float64{-1, 1.00001, math.NaN(), math.Inf(1), 100000000} {
		_, err := calculateFinancePieceworkSalaryFromMasterData(context.Background(), database, financeSalaryTestCalculationRequest(quantity))
		require.ErrorIs(t, err, ErrInvalidFinancePieceworkCalculation)
	}
	request := financeSalaryTestCalculationRequest(3)
	_, err := calculateFinancePieceworkSalaryFromMasterData(context.Background(), database, request)
	require.ErrorIs(t, err, ErrPieceworkRateNotFound)
	request.Rows[0].EmployeeID = uuid.NewString()
	_, err = calculateFinancePieceworkSalaryFromMasterData(context.Background(), database, request)
	require.ErrorIs(t, err, ErrInvalidFinancePieceworkCalculation)
	rates := NewPieceworkRateService(pieceworkRateTestTxManager{db: database})
	_, err = rates.CreatePieceworkRate(pieceworkRateTestContext(), pieceworkTestRateCommand())
	require.NoError(t, err)
	request = financeSalaryTestCalculationRequest(3)
	request.Rows = append(request.Rows, FinancePieceworkSalaryCalculationRow{EmployeeID: pieceworkTestEmployeeID, DepartmentID: uuid.NewString(), PayItemID: pieceworkTestPayItemID, Quantity: 3})
	result, err := calculateFinancePieceworkSalaryFromMasterData(context.Background(), database, request)
	require.ErrorIs(t, err, ErrInvalidFinancePieceworkCalculation)
	require.Empty(t, result.Rows)
}
