package services

import (
	"context"
	"testing"
	"xdfc-server/models"
	"xdfc-server/repositories"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type organizationSaveTestTxManager struct {
	db *gorm.DB
}

func (m organizationSaveTestTxManager) DB() *gorm.DB {
	return m.db
}

func (m organizationSaveTestTxManager) WithinTransaction(fn func(tx *gorm.DB) error) error {
	return m.db.Transaction(fn)
}

func newOrganizationSaveTestService(t *testing.T) (*OrganizationService, *gorm.DB) {
	t.Helper()

	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	createOrganizationSaveTestSchema(t, database)

	return NewOrganizationService(
		organizationSaveTestTxManager{db: database},
		repositories.NewOrganizationTreeRepository(),
	), database
}

func createOrganizationSaveTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()

	require.NoError(t, database.Exec(`
		CREATE TABLE org_units (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT NOT NULL,
			parent_id TEXT,
			code TEXT,
			unit_type TEXT,
			manager_employee_id TEXT,
			status TEXT,
			sort_order INTEGER,
			metadata TEXT,
			legacy_payload TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)
	`).Error)
}

func TestSaveOrganizationGeneratesUUIDAndInfersThreeLevelHierarchy(t *testing.T) {
	service, database := newOrganizationSaveTestService(t)

	root, err := service.SaveOrganization(context.Background(), OrganizationSaveRequest{
		ID:          " ",
		Name:        "  总部  ",
		Manager:     "  张三  ",
		Description: "  根节点  ",
	})
	require.NoError(t, err)
	require.Equal(t, "company", root.Type)
	require.Equal(t, "总部", root.Name)
	require.Equal(t, "张三", root.Manager)
	require.Equal(t, "根节点", root.Description)
	require.Nil(t, root.ParentID)
	requireValidUUID(t, root.ID)

	rootID := root.ID
	department, err := service.SaveOrganization(context.Background(), OrganizationSaveRequest{
		Name:     "生产部",
		ParentID: &rootID,
	})
	require.NoError(t, err)
	require.Equal(t, "department", department.Type)
	require.NotNil(t, department.ParentID)
	require.Equal(t, root.ID, *department.ParentID)
	requireValidUUID(t, department.ID)

	departmentID := department.ID
	team, err := service.SaveOrganization(context.Background(), OrganizationSaveRequest{
		Name:     "裁纱组",
		ParentID: &departmentID,
	})
	require.NoError(t, err)
	require.Equal(t, "team", team.Type)
	require.NotNil(t, team.ParentID)
	require.Equal(t, department.ID, *team.ParentID)
	requireValidUUID(t, team.ID)

	teamID := team.ID
	_, err = service.SaveOrganization(context.Background(), OrganizationSaveRequest{
		Name:     "不允许的第四级",
		ParentID: &teamID,
	})
	require.ErrorIs(t, err, ErrOrganizationDepthExceeded)

	var auditCount int64
	require.NoError(t, database.Table("audit_logs").Count(&auditCount).Error)
	require.Equal(t, int64(3), auditCount)
}

func TestSaveOrganizationRejectsInvalidIDsBeforeDatabaseSave(t *testing.T) {
	service, _ := newOrganizationSaveTestService(t)

	_, err := service.SaveOrganization(context.Background(), OrganizationSaveRequest{
		ID:   "temporary-front-end-id",
		Name: "总部",
	})
	require.ErrorIs(t, err, ErrOrganizationIDInvalid)

	invalidParentID := "temporary-front-end-parent-id"
	_, err = service.SaveOrganization(context.Background(), OrganizationSaveRequest{
		Name:     "生产部",
		ParentID: &invalidParentID,
	})
	require.ErrorIs(t, err, ErrOrganizationParentIDInvalid)
}

func TestSaveEmployeeWritesOrgUnitToPrimaryAssignmentNotEmployeeDeptID(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(t, err)
	createEmployeeOrgUnitAssignmentTestSchema(t, database)

	service := NewEmployeeCommandService(
		organizationSaveTestTxManager{db: database},
		repositories.NewOrgPersonnelRepository(),
	)

	orgUnitID := uuid.NewString()
	require.NoError(t, database.Create(&models.OrgUnit{
		BaseModel: models.BaseModel{ID: orgUnitID},
		Name:      "生产部",
		UnitType:  "department",
		Status:    "active",
		Metadata:  "{}",
	}).Error)

	response, err := service.SaveEmployee(context.Background(), EmployeeSaveRequest{
		ID:      uuid.NewString(),
		StaffID: "EMP-001",
		Name:    "张三",
		Status:  "active",
		DeptID:  orgUnitID,
	})
	require.NoError(t, err)
	require.Equal(t, orgUnitID, response.DeptID)
	require.Equal(t, "生产部", response.DeptName)

	var storedEmployeeDeptID string
	require.NoError(t, database.Table("employees").
		Select("COALESCE(dept_id, '')").
		Where("id = ?", response.ID).
		Scan(&storedEmployeeDeptID).Error)
	require.Equal(t, "", storedEmployeeDeptID)

	var assignmentOrgUnitID string
	require.NoError(t, database.Table("employee_assignments").
		Select("org_unit_id").
		Where("employee_id = ? AND is_primary = ?", response.ID, true).
		Scan(&assignmentOrgUnitID).Error)
	require.Equal(t, orgUnitID, assignmentOrgUnitID)
}

func createEmployeeOrgUnitAssignmentTestSchema(t *testing.T, database *gorm.DB) {
	t.Helper()

	require.NoError(t, database.Exec(`
		CREATE TABLE org_units (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT NOT NULL,
			code TEXT,
			parent_id TEXT,
			unit_type TEXT,
			manager_employee_id TEXT,
			status TEXT,
			sort_order INTEGER,
			metadata TEXT,
			legacy_payload TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
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
			status TEXT,
			joined_date DATETIME,
			dept_id TEXT,
			operator TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE employee_assignments (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			employee_id TEXT NOT NULL,
			org_unit_id TEXT,
			position_id TEXT,
			production_unit_id TEXT,
			assignment_type TEXT,
			is_primary BOOLEAN,
			start_date DATETIME,
			end_date DATETIME,
			status TEXT,
			source TEXT,
			remarks TEXT
		)
	`).Error)
	require.NoError(t, database.Exec(`
		CREATE TABLE audit_logs (
			id TEXT PRIMARY KEY,
			module TEXT,
			target_id TEXT,
			action TEXT,
			diff TEXT,
			operator TEXT,
			ip TEXT,
			created_at DATETIME
		)
	`).Error)
}

func requireValidUUID(t *testing.T, value string) {
	t.Helper()

	_, err := uuid.Parse(value)
	require.NoError(t, err)
}
