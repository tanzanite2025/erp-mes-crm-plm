package services

import (
	"context"
	"fmt"
	"testing"
	"time"
	"xdfc-server/models"
	"xdfc-server/repositories"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openEmployeeCommandTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(fmt.Sprintf(
		"file:employee_command_%d?mode=memory&cache=shared",
		time.Now().UnixNano(),
	)), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)

	sqlDB, err := database.DB()
	require.NoError(t, err)
	t.Cleanup(func() {
		if err := sqlDB.Close(); err != nil {
			t.Errorf("close sqlite: %v", err)
		}
	})

	createEmployeeOrgUnitAssignmentTestSchema(t, database)

	require.NoError(t, database.Exec(`
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			username TEXT NOT NULL,
			status TEXT,
			is_protected BOOLEAN DEFAULT false,
			employee_id TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE UNIQUE INDEX idx_employees_staff_id ON employees (staff_id)
	`).Error)

	return database
}

func TestSaveEmployeeRestoresSoftDeletedEmployeeWithSameStaffID(t *testing.T) {
	database := openEmployeeCommandTestDB(t)
	service := NewEmployeeCommandService(
		organizationSaveTestTxManager{db: database},
		repositories.NewOrgPersonnelRepository(),
	)

	employeeID := uuid.NewString()
	created, err := service.SaveEmployee(context.Background(), EmployeeSaveRequest{
		ID:      employeeID,
		StaffID: "7260700003",
		Name:    "吴倩玲",
		Status:  "active",
	})
	require.NoError(t, err)
	require.Equal(t, employeeID, created.ID)

	require.NoError(t, service.DeleteEmployees(context.Background(), []string{created.ID}))

	restored, err := service.SaveEmployee(context.Background(), EmployeeSaveRequest{
		StaffID: "7260700003",
		Name:    "吴倩玲-恢复",
		Status:  "active",
	})
	require.NoError(t, err)
	require.Equal(t, created.ID, restored.ID)
	require.Equal(t, "吴倩玲-恢复", restored.Name)

	var activeCount int64
	require.NoError(t, database.Model(&models.Employee{}).
		Where("staff_id = ?", "7260700003").
		Count(&activeCount).Error)
	require.Equal(t, int64(1), activeCount)

	var loaded models.Employee
	require.NoError(t, database.First(&loaded, "id = ?", created.ID).Error)
	require.False(t, loaded.DeletedAt.Valid)
}
