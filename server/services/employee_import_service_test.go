package services

import (
	"bytes"
	"fmt"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

func setupEmployeeImportSQLiteDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE organizations (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT NOT NULL,
			parent_id TEXT,
			manager TEXT,
			description TEXT,
			type TEXT,
			linked_architecture TEXT
		);
	`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE employees (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			staff_id TEXT,
			name TEXT NOT NULL,
			gender TEXT,
			birthday DATETIME,
			id_card TEXT,
			phone TEXT,
			emergency_phone TEXT,
			address TEXT,
			bank_card TEXT,
			bank_name TEXT,
			education TEXT,
			age INTEGER,
			station TEXT,
			status TEXT,
			joined_date DATETIME,
			dept_id TEXT,
			line_id TEXT,
			process_id TEXT
		);
	`).Error)
	require.NoError(t, testDB.Exec(`CREATE TABLE production_lines (id TEXT PRIMARY KEY, name TEXT);`).Error)
	require.NoError(t, testDB.Exec(`CREATE TABLE process_steps (id TEXT PRIMARY KEY, name TEXT);`).Error)
	require.NoError(t, testDB.Exec(`
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		);
	`).Error)

	db.DB = testDB
	t.Cleanup(func() {
		db.DB = prevDB
		sqlDB, err := testDB.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	return testDB
}

func buildEmployeeImportWorkbook(t *testing.T, rows [][]string) *bytes.Buffer {
	t.Helper()

	file := excelize.NewFile()
	sheet := "Personnel Import Template"
	file.SetSheetName("Sheet1", sheet)

	for rowIndex, row := range rows {
		for colIndex, value := range row {
			cell, err := excelize.CoordinatesToCellName(colIndex+1, rowIndex+1)
			require.NoError(t, err)
			require.NoError(t, file.SetCellValue(sheet, cell, value))
		}
	}

	buffer, err := file.WriteToBuffer()
	require.NoError(t, err)
	return buffer
}

func TestPreviewEmployeeImportBuildsAuthoritativeDiff(t *testing.T) {
	testDB := setupEmployeeImportSQLiteDB(t)
	require.NoError(t, testDB.Create(&models.Organization{
		BaseModel: models.BaseModel{ID: "dept-1"},
		Name:      "Administration",
		Type:      "department",
	}).Error)
	require.NoError(t, testDB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-1"},
		StaffID:   "A001",
		Name:      "Alice Old",
		DeptID:    "dept-1",
		Status:    "active",
	}).Error)
	require.NoError(t, testDB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-2"},
		StaffID:   "A003",
		Name:      "Charlie",
		DeptID:    "dept-1",
		Status:    "active",
	}).Error)

	workbook := buildEmployeeImportWorkbook(t, [][]string{
		{"No.", "Staff ID", "Name", "Department", "Phone", "Emergency Contact Phone", "Gender", "Join Date", "Employment Status", "Age", "ID Card No.", "Birthday", "Home Address", "Bank Card", "Bank Name", "Education"},
		{"1", "A001", "Alice New", "Administration", "13800000000", "", "Female", "2024-01-02", "Active", "30", "", "", "", "", "", "Bachelor"},
		{"2", "A002", "Bob", "Administration", "13900000000", "", "Male", "2024-03-01", "Active", "28", "", "", "", "", "", "Bachelor"},
	})

	preview, err := PreviewEmployeeImport("personnel.xlsx", bytes.NewReader(workbook.Bytes()))
	require.NoError(t, err)
	require.Equal(t, 2, preview.ImportedCount)
	require.Equal(t, 1, preview.CreateCount)
	require.Equal(t, 1, preview.UpdateCount)
	require.Equal(t, 1, preview.MissingCount)
	require.Len(t, preview.NewEmployees, 1)
	require.Equal(t, "A002", preview.NewEmployees[0].StaffID)
	require.Len(t, preview.ExistingEmployees, 1)
	require.Equal(t, "A001", preview.ExistingEmployees[0].StaffID)
	require.Len(t, preview.MissingEmployees, 1)
	require.Equal(t, "A003", preview.MissingEmployees[0].StaffID)
	require.NotEmpty(t, preview.PreviewToken)
}

func TestCommitEmployeeImportPreservesNonTemplateFieldsOnUpdate(t *testing.T) {
	testDB := setupEmployeeImportSQLiteDB(t)
	require.NoError(t, testDB.Create(&models.Organization{
		BaseModel: models.BaseModel{ID: "dept-1"},
		Name:      "Administration",
		Type:      "department",
	}).Error)
	require.NoError(t, testDB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-1"},
		StaffID:   "A001",
		Name:      "Alice Old",
		DeptID:    "dept-1",
		Station:   "Station-A",
		LineID:    "line-1",
		ProcessID: "process-1",
		Status:    "active",
	}).Error)

	workbook := buildEmployeeImportWorkbook(t, [][]string{
		{"No.", "Staff ID", "Name", "Department", "Phone", "Emergency Contact Phone", "Gender", "Join Date", "Employment Status", "Age", "ID Card No.", "Birthday", "Home Address", "Bank Card", "Bank Name", "Education"},
		{"1", "A001", "Alice New", "Administration", "13800000000", "", "Female", "2024-01-02", "Resigned", "30", "", "", "New Address", "", "", "Bachelor"},
	})

	preview, err := PreviewEmployeeImport("personnel.xlsx", bytes.NewReader(workbook.Bytes()))
	require.NoError(t, err)

	result, err := CommitEmployeeImport(CommitEmployeeImportRequest{
		PreviewToken: preview.PreviewToken,
		Mode:         EmployeeImportModeSync,
	})
	require.NoError(t, err)
	require.Equal(t, 1, result.Count)
	require.Equal(t, 0, result.Created)
	require.Equal(t, 1, result.Updated)

	var employee models.Employee
	require.NoError(t, testDB.First(&employee, "id = ?", "emp-1").Error)
	require.Equal(t, "Alice New", employee.Name)
	require.Equal(t, "resigned", employee.Status)
	require.Equal(t, "13800000000", employee.Phone)
	require.Equal(t, "New Address", employee.Address)
	require.Equal(t, "Station-A", employee.Station)
	require.Equal(t, "line-1", employee.LineID)
	require.Equal(t, "process-1", employee.ProcessID)
}
