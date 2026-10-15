package services

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"
	"xdfc-server/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

var ErrInvalidFinancePieceworkCalculation = errors.New("invalid salary calculation")

type FinanceSalaryEmployeeOption struct {
	ID           string `json:"id"`
	StaffID      string `json:"staffId"`
	Name         string `json:"name"`
	DepartmentID string `json:"departmentId"`
}
type FinanceSalaryDepartmentOption struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
type FinancePieceworkCalculationOptions struct {
	Employees   []FinanceSalaryEmployeeOption   `json:"employees"`
	Departments []FinanceSalaryDepartmentOption `json:"departments"`
}
type FinancePieceworkSalaryCalculationRow struct {
	EmployeeID   string  `json:"employeeId"`
	DepartmentID string  `json:"departmentId"`
	PayItemID    string  `json:"payItemId"`
	Quantity     float64 `json:"quantity"`
}
type FinancePieceworkSalaryCalculationRequest struct {
	CalculationDate string                                 `json:"calculationDate"`
	Rows            []FinancePieceworkSalaryCalculationRow `json:"rows"`
}
type FinancePieceworkSalaryCalculatedRow struct {
	FinancePieceworkSalaryCalculationRow
	EmployeeName   string  `json:"employeeName"`
	StaffID        string  `json:"staffId"`
	DepartmentName string  `json:"departmentName"`
	PayItemName    string  `json:"payItemName"`
	Unit           string  `json:"unit"`
	UnitPrice      float64 `json:"unitPrice"`
	Currency       string  `json:"currency"`
	AmountCents    int64   `json:"amountCents"`
}
type FinancePieceworkSalaryCalculationResult struct {
	Rows []FinancePieceworkSalaryCalculatedRow `json:"rows"`
}

func ListFinancePieceworkCalculationOptions(ctx context.Context) (FinancePieceworkCalculationOptions, error) {
	return listFinancePieceworkCalculationOptionsFromExistingMasterData(defaultServiceRuntime().txManager.DB().WithContext(ctx))
}

func listFinancePieceworkCalculationOptionsFromExistingMasterData(database *gorm.DB) (FinancePieceworkCalculationOptions, error) {
	options := FinancePieceworkCalculationOptions{Employees: []FinanceSalaryEmployeeOption{}, Departments: []FinanceSalaryDepartmentOption{}}
	// Departments belong to the personnel assignment, not the obsolete employees.dept_id column.
	err := database.Table("employees AS e").Select("e.id, e.staff_id, e.name, COALESCE(CAST(a.org_unit_id AS TEXT), '') AS department_id").
		Joins("LEFT JOIN employee_assignments AS a ON a.employee_id = e.id AND a.deleted_at IS NULL AND a.is_primary = ?", true).
		Where("e.deleted_at IS NULL").Order("e.staff_id, e.id").Scan(&options.Employees).Error
	if err != nil {
		return options, err
	}
	err = database.Model(&models.OrgUnit{}).Select("id", "name").Where("unit_type = ?", "department").Order("sort_order, name, id").Scan(&options.Departments).Error
	return options, err
}

func CalculateFinancePieceworkSalary(ctx context.Context, request FinancePieceworkSalaryCalculationRequest) (FinancePieceworkSalaryCalculationResult, error) {
	return calculateFinancePieceworkSalaryFromMasterData(ctx, defaultServiceRuntime().txManager.DB(), request)
}

// Calculation only reads master data and rates; it does not save a report or start a workflow.
func calculateFinancePieceworkSalaryFromMasterData(ctx context.Context, database *gorm.DB, request FinancePieceworkSalaryCalculationRequest) (FinancePieceworkSalaryCalculationResult, error) {
	result := FinancePieceworkSalaryCalculationResult{Rows: []FinancePieceworkSalaryCalculatedRow{}}
	date, err := time.Parse("2006-01-02", request.CalculationDate)
	if err != nil || validatePieceworkCalendarDate(date) != nil || len(request.Rows) == 0 || len(request.Rows) > 500 {
		return result, fmt.Errorf("%w: calculationDate and 1 to 500 rows are required", ErrInvalidFinancePieceworkCalculation)
	}
	for index, row := range request.Rows {
		for _, id := range []string{row.EmployeeID, row.DepartmentID, row.PayItemID} {
			if _, err := uuid.Parse(id); err != nil {
				return result, fmt.Errorf("%w: row %d requires existing employee, department and pay item IDs", ErrInvalidFinancePieceworkCalculation, index+1)
			}
		}
		if err := validatePieceworkDecimalPrecision(row.Quantity, 99999999.9999); err != nil {
			return result, fmt.Errorf("%w: row %d quantity: %v", ErrInvalidFinancePieceworkCalculation, index+1, err)
		}
	}
	err = database.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		options, err := listFinancePieceworkCalculationOptionsFromExistingMasterData(tx)
		if err != nil {
			return err
		}
		employees := map[string]FinanceSalaryEmployeeOption{}
		departments := map[string]FinanceSalaryDepartmentOption{}
		for _, employee := range options.Employees {
			employees[normalizeUUIDIdentity(employee.ID)] = employee
		}
		for _, department := range options.Departments {
			departments[normalizeUUIDIdentity(department.ID)] = department
		}
		rates := map[string]models.PieceworkRate{}
		items := map[string]models.PieceworkPayItem{}
		for index, row := range request.Rows {
			row.EmployeeID, row.DepartmentID, row.PayItemID = normalizeUUIDIdentity(row.EmployeeID), normalizeUUIDIdentity(row.DepartmentID), normalizeUUIDIdentity(row.PayItemID)
			employee, employeeExists := employees[row.EmployeeID]
			department, departmentExists := departments[row.DepartmentID]
			if !employeeExists || !departmentExists {
				return fmt.Errorf("%w: row %d employee or department does not exist", ErrInvalidFinancePieceworkCalculation, index+1)
			}
			item, exists := items[row.PayItemID]
			if !exists {
				if err := tx.First(&item, "id = ? AND status = ?", row.PayItemID, "active").Error; err != nil {
					return err
				}
				items[row.PayItemID] = item
				match, err := resolvePieceworkRateForPayrollItemTx(ctx, tx, PieceworkRateLookup{PayItemID: item.ID, Unit: item.Unit, At: date})
				if err != nil {
					return fmt.Errorf("row %d (%s): %w", index+1, item.Name, err)
				}
				rates[row.PayItemID] = match.Rate
			}
			rate := rates[row.PayItemID]
			amount, err := calculateFinancePieceworkSalaryAmount(row.Quantity, rate.UnitPrice)
			if err != nil {
				return fmt.Errorf("%w: row %d: %v", ErrInvalidFinancePieceworkCalculation, index+1, err)
			}
			result.Rows = append(result.Rows, FinancePieceworkSalaryCalculatedRow{FinancePieceworkSalaryCalculationRow: row, EmployeeName: employee.Name, StaffID: employee.StaffID, DepartmentName: department.Name, PayItemName: item.Name, Unit: item.Unit, UnitPrice: rate.UnitPrice, Currency: rate.Currency, AmountCents: int64(math.Round(amount * 100))})
		}
		return nil
	})
	if err != nil {
		return FinancePieceworkSalaryCalculationResult{}, err
	}
	return result, nil
}
