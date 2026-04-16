package services

import (
	"fmt"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func testOptimisticVersion(ts time.Time) int {
	version := ts.UnixMilli()
	if version < 1 {
		return 1
	}
	return int(version)
}

type fakeRoleSnapshotSynchronizer struct {
	syncedEmployees   []string
	syncedDepartments []string
}

func (s *fakeRoleSnapshotSynchronizer) SyncDepartment(tx *gorm.DB, deptID string) error {
	s.syncedDepartments = append(s.syncedDepartments, strings.TrimSpace(deptID))
	return nil
}

func (s *fakeRoleSnapshotSynchronizer) SyncEmployee(tx *gorm.DB, employee models.Employee) error {
	s.syncedEmployees = append(s.syncedEmployees, strings.TrimSpace(employee.ID))
	return nil
}

type fakeOrganizationRepository struct {
	nameExists        bool
	saveOrgHit        bool
	saveEmployeeHit   bool
	childCount        int64
	employeeCount     int64
	positions         []models.Position
	updatedIDs        []string
	updatedStatus     string
	deletedIDs        []string
	disabledUserIDs   []string
	existingEmployee  models.Employee
	foundEmployee     bool
	foundOrganization bool
	existingOrg       models.Organization
}

func (r *fakeOrganizationRepository) ListOrganizations(database *gorm.DB) ([]models.Organization, error) {
	return nil, nil
}

func (r *fakeOrganizationRepository) GetOrganizationByID(database *gorm.DB, id string) (models.Organization, bool, error) {
	return r.existingOrg, r.foundOrganization, nil
}

func (r *fakeOrganizationRepository) OrganizationNameExists(database *gorm.DB, name string, parentID *string, excludeID string) (bool, error) {
	return r.nameExists, nil
}

func (r *fakeOrganizationRepository) SaveOrganization(database *gorm.DB, organization *models.Organization) error {
	r.saveOrgHit = true
	return nil
}

func (r *fakeOrganizationRepository) CountChildOrganizations(database *gorm.DB, id string) (int64, error) {
	return r.childCount, nil
}

func (r *fakeOrganizationRepository) CountEmployeesByDeptID(database *gorm.DB, deptID string) (int64, error) {
	return r.employeeCount, nil
}

func (r *fakeOrganizationRepository) DeleteOrganization(database *gorm.DB, id string) error {
	return nil
}

func (r *fakeOrganizationRepository) ListEmployees(database *gorm.DB) ([]models.Employee, error) {
	return nil, nil
}

func (r *fakeOrganizationRepository) ListPositions(database *gorm.DB) ([]models.Position, error) {
	return append([]models.Position(nil), r.positions...), nil
}

func (r *fakeOrganizationRepository) BulkUpdateEmployeeStatus(database *gorm.DB, ids []string, status string) (int64, error) {
	r.updatedIDs = append([]string(nil), ids...)
	r.updatedStatus = status
	return int64(len(ids)), nil
}

func (r *fakeOrganizationRepository) SaveEmployee(database *gorm.DB, employee *models.Employee) error {
	r.saveEmployeeHit = true
	if database != nil && database.Migrator().HasTable("employees") {
		return database.Save(employee).Error
	}
	return nil
}

func (r *fakeOrganizationRepository) DeleteEmployees(database *gorm.DB, ids []string) error {
	r.deletedIDs = append([]string(nil), ids...)
	return nil
}

func (r *fakeOrganizationRepository) DisableUsersByEmployeeIDs(database *gorm.DB, ids []string) error {
	r.disabledUserIDs = append([]string(nil), ids...)
	return nil
}

func (r *fakeOrganizationRepository) FindEmployeeByIDOrStaffID(database *gorm.DB, id string, staffID string) (models.Employee, bool, error) {
	if !r.foundEmployee {
		return models.Employee{}, false, nil
	}
	trimmedID := strings.TrimSpace(id)
	trimmedStaffID := strings.TrimSpace(staffID)
	if trimmedID != "" && trimmedID == r.existingEmployee.ID {
		return r.existingEmployee, true, nil
	}
	if trimmedStaffID != "" && trimmedStaffID == r.existingEmployee.StaffID {
		return r.existingEmployee, true, nil
	}
	return models.Employee{}, false, nil
}

func setupOrganizationServiceSQLiteDB(t *testing.T) *gorm.DB {
	t.Helper()

	prevDB := db.DB
	testDB, err := gorm.Open(sqlite.Open(fmt.Sprintf("file:%s?mode=memory&cache=shared", t.Name())), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}
	if err := testDB.Exec(`
		CREATE TABLE users (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL,
			password TEXT NOT NULL,
			email TEXT,
			phone_number TEXT,
			first_name TEXT,
			last_name TEXT,
			status TEXT,
			employee_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("create users table failed: %v", err)
	}
	if err := testDB.Exec(`
		CREATE TABLE organizations (
			id TEXT PRIMARY KEY,
			name TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("create organizations table failed: %v", err)
	}
	if err := testDB.Exec(`
		CREATE TABLE production_lines (
			id TEXT PRIMARY KEY,
			name TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("create production_lines table failed: %v", err)
	}
	if err := testDB.Exec(`
		CREATE TABLE process_steps (
			id TEXT PRIMARY KEY,
			name TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("create process_steps table failed: %v", err)
	}
	if err := testDB.Exec(`
		CREATE TABLE employee_assignments (
			id TEXT PRIMARY KEY,
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
			remarks TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("create employee_assignments table failed: %v", err)
	}
	if err := testDB.Exec(`
		CREATE TABLE org_units (
			id TEXT PRIMARY KEY,
			name TEXT,
			code TEXT,
			parent_id TEXT,
			unit_type TEXT,
			manager_employee_id TEXT,
			status TEXT,
			sort_order INTEGER,
			metadata TEXT,
			legacy_payload TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("create org_units table failed: %v", err)
	}
	if err := testDB.Exec(`
		CREATE TABLE positions (
			id TEXT PRIMARY KEY,
			name TEXT,
			code TEXT,
			org_unit_id TEXT,
			production_unit_id TEXT,
			category TEXT,
			level INTEGER,
			is_managerial BOOLEAN,
			status TEXT,
			sort_order INTEGER,
			metadata TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("create positions table failed: %v", err)
	}
	if err := testDB.AutoMigrate(&models.AuditLog{}); err != nil {
		t.Fatalf("migrate audit_logs table failed: %v", err)
	}

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

func TestOrganizationServiceSaveOrganizationRejectsDuplicateName(t *testing.T) {
	repo := &fakeOrganizationRepository{nameExists: true}
	service := NewOrganizationService(
		fakeTransactionManager{},
		nil,
		repo,
	)

	_, err := service.SaveOrganization(OrganizationSaveRequest{Name: "Ops"})

	require.ErrorIs(t, err, ErrOrganizationNameConflict)
	require.False(t, repo.saveOrgHit)
}

func TestOrganizationServiceDeleteOrganizationRejectsChildDepartments(t *testing.T) {
	service := NewOrganizationService(
		fakeTransactionManager{},
		nil,
		&fakeOrganizationRepository{childCount: 2},
	)

	err := service.DeleteOrganization("dept-1")

	require.ErrorIs(t, err, ErrOrganizationHasChildren)
}

func TestOrganizationServiceDeleteOrganizationRejectsEmployees(t *testing.T) {
	service := NewOrganizationService(
		fakeTransactionManager{},
		nil,
		&fakeOrganizationRepository{employeeCount: 1},
	)

	err := service.DeleteOrganization("dept-1")

	require.ErrorIs(t, err, ErrOrganizationHasEmployees)
}

func TestOrganizationServiceSaveOrganizationRejectsInvalidRootType(t *testing.T) {
	service := NewOrganizationService(
		fakeTransactionManager{},
		nil,
		&fakeOrganizationRepository{},
	)

	_, err := service.SaveOrganization(OrganizationSaveRequest{
		Name: "Production Unit A",
		Type: "team",
	})

	require.ErrorIs(t, err, ErrOrganizationHierarchyInvalid)
}

func TestOrganizationServiceSaveOrganizationRejectsMissingParent(t *testing.T) {
	parentID := "missing-parent"
	service := NewOrganizationService(
		fakeTransactionManager{},
		nil,
		&fakeOrganizationRepository{},
	)

	_, err := service.SaveOrganization(OrganizationSaveRequest{
		Name:     "Manufacturing",
		Type:     "department",
		ParentID: &parentID,
	})

	require.ErrorIs(t, err, ErrOrganizationParentNotFound)
}

func TestOrganizationServiceSaveOrganizationRejectsInvalidChildType(t *testing.T) {
	parentID := "org-root"
	repo := &fakeOrganizationRepository{
		foundOrganization: true,
		existingOrg: models.Organization{
			BaseModel: models.BaseModel{ID: parentID},
			Type:      "company",
		},
	}
	service := NewOrganizationService(
		fakeTransactionManager{},
		nil,
		repo,
	)

	_, err := service.SaveOrganization(OrganizationSaveRequest{
		Name:     "Workshop Unit",
		Type:     "team",
		ParentID: &parentID,
	})

	require.ErrorIs(t, err, ErrOrganizationHierarchyInvalid)
}

func TestOrganizationServiceSaveOrganizationRejectsFourthLevel(t *testing.T) {
	parentID := "team-parent"
	repo := &fakeOrganizationRepository{
		foundOrganization: true,
		existingOrg: models.Organization{
			BaseModel: models.BaseModel{ID: parentID},
			Type:      "team",
		},
	}
	service := NewOrganizationService(
		fakeTransactionManager{},
		nil,
		repo,
	)

	_, err := service.SaveOrganization(OrganizationSaveRequest{
		Name:     "Too Deep",
		Type:     "team",
		ParentID: &parentID,
	})

	require.ErrorIs(t, err, ErrOrganizationDepthExceeded)
}

func TestOrganizationServiceSaveOrganizationAcceptsDepartmentUnderCompany(t *testing.T) {
	parentID := "org-root"
	repo := &fakeOrganizationRepository{
		foundOrganization: true,
		existingOrg: models.Organization{
			BaseModel: models.BaseModel{ID: parentID},
			Type:      "company",
		},
	}
	service := NewOrganizationService(
		fakeTransactionManager{},
		nil,
		repo,
	)

	_, err := service.SaveOrganization(OrganizationSaveRequest{
		Name:     "Manufacturing",
		Type:     "department",
		ParentID: &parentID,
	})

	require.NoError(t, err)
	require.True(t, repo.saveOrgHit)
}

func TestOrganizationServiceBulkUpdateEmployeeStatusNormalizesIDs(t *testing.T) {
	repo := &fakeOrganizationRepository{}
	service := NewOrganizationService(
		fakeTransactionManager{},
		nil,
		repo,
	)

	result, err := service.BulkUpdateEmployeeStatus([]string{" emp-1 ", "", "emp-2"}, "active")

	require.NoError(t, err)
	require.Equal(t, int64(2), result.Updated)
	require.False(t, result.OperatedAt.IsZero())
	require.Equal(t, []string{"emp-1", "emp-2"}, repo.updatedIDs)
	require.Equal(t, "active", repo.updatedStatus)
}

func TestOrganizationServiceDeleteEmployeesDisablesLinkedUsers(t *testing.T) {
	testDB := setupOrganizationServiceSQLiteDB(t)
	repo := &fakeOrganizationRepository{}
	service := NewOrganizationService(
		fakeTransactionManager{db: testDB},
		nil,
		repo,
	)

	err := service.DeleteEmployees([]string{" emp-1 ", "emp-2"})

	require.NoError(t, err)
	require.Equal(t, []string{"emp-1", "emp-2"}, repo.deletedIDs)
	require.Equal(t, []string{"emp-1", "emp-2"}, repo.disabledUserIDs)
	var logs []models.AuditLog
	require.NoError(t, testDB.Order("target_id asc").Find(&logs).Error)
	require.Len(t, logs, 2)
	require.Equal(t, "employee", logs[0].Module)
	require.Equal(t, "emp-1", logs[0].TargetID)
	require.Equal(t, "Delete", logs[0].Action)
	require.Equal(t, "emp-2", logs[1].TargetID)
}

func TestOrganizationServiceBulkSyncEmployeesWritesAudit(t *testing.T) {
	repo := &fakeOrganizationRepository{
		existingEmployee: models.Employee{
			BaseModel: models.BaseModel{ID: "emp-1"},
			Status:    "active",
			DeptID:    "dept-old",
		},
		foundEmployee: true,
	}
	testDB := setupOrganizationServiceSQLiteDB(t)
	service := NewOrganizationService(
		fakeTransactionManager{db: testDB},
		nil,
		repo,
	)

	count, err := service.BulkSyncEmployees([]BulkSyncEmployeeRequest{
		{
			ID:     "emp-1",
			Name:   "Alice",
			Status: "resigned",
			DeptID: "dept-new",
		},
		{
			ID:     "emp-2",
			Name:   "Bob",
			Status: "active",
			DeptID: "dept-new",
		},
	})

	require.NoError(t, err)
	require.Equal(t, 2, count)
	var logs []models.AuditLog
	require.NoError(t, testDB.Order("target_id asc").Find(&logs).Error)
	require.Len(t, logs, 2)
	require.Equal(t, "employee", logs[0].Module)
	require.Equal(t, "emp-1", logs[0].TargetID)
	require.Equal(t, "Update", logs[0].Action)
	require.Equal(t, "emp-2", logs[1].TargetID)
	require.Equal(t, "Create", logs[1].Action)
}

func TestOrganizationServiceSaveEmployeeTriggersRoleSnapshotSync(t *testing.T) {
	testDB := setupOrganizationServiceSQLiteDB(t)
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
			status TEXT,
			joined_date DATETIME,
			dept_id TEXT,
			line_id TEXT,
			process_id TEXT,
			dept_name TEXT,
			line_name TEXT,
			process_name TEXT
		);
	`).Error)

	repo := &fakeOrganizationRepository{}
	snapshotSynchronizer := &fakeRoleSnapshotSynchronizer{}
	service := NewOrganizationService(
		fakeTransactionManager{db: testDB},
		snapshotSynchronizer,
		repo,
	)

	_, err := service.SaveEmployee(EmployeeSaveRequest{
		ID:     "emp-sync-1",
		Name:   "Alice",
		Status: "active",
		DeptID: "dept-1",
	})

	require.NoError(t, err)
	require.Equal(t, []string{"emp-sync-1"}, snapshotSynchronizer.syncedEmployees)
}

func TestOrganizationServiceBulkSyncEmployeesTriggersRoleSnapshotSync(t *testing.T) {
	repo := &fakeOrganizationRepository{}
	snapshotSynchronizer := &fakeRoleSnapshotSynchronizer{}
	service := NewOrganizationService(
		fakeTransactionManager{},
		snapshotSynchronizer,
		repo,
	)

	_, err := service.BulkSyncEmployees([]BulkSyncEmployeeRequest{
		{ID: "emp-sync-1", Name: "Alice", Status: "active", DeptID: "dept-a"},
		{ID: "emp-sync-2", Name: "Bob", Status: "active", DeptID: "dept-b"},
	})

	require.NoError(t, err)
	require.Equal(t, []string{"emp-sync-1", "emp-sync-2"}, snapshotSynchronizer.syncedEmployees)
}

func TestOrganizationServiceSaveEmployeeProjectsPrimaryAssignmentFromLegacyDept(t *testing.T) {
	testDB := setupOrganizationServiceSQLiteDB(t)
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
			status TEXT,
			joined_date DATETIME,
			dept_id TEXT,
			line_id TEXT,
			process_id TEXT,
			dept_name TEXT,
			line_name TEXT,
			process_name TEXT
		);
	`).Error)

	service := NewOrganizationService(
		fakeTransactionManager{db: testDB},
		nil,
		&fakeOrganizationRepository{},
	)

	_, err := service.SaveEmployee(EmployeeSaveRequest{
		ID:     "emp-assignment-1",
		Name:   "Alice",
		Status: "active",
		DeptID: "org-unit-a",
	})

	require.NoError(t, err)

	var row struct {
		EmployeeID string
		OrgUnitID  string
		IsPrimary  bool
		Status     string
		Source     string
	}
	require.NoError(t, testDB.Table("employee_assignments").
		Select("employee_id, org_unit_id, is_primary, status, source").
		Where("employee_id = ?", "emp-assignment-1").
		First(&row).Error)
	require.Equal(t, "emp-assignment-1", row.EmployeeID)
	require.Equal(t, "org-unit-a", row.OrgUnitID)
	require.True(t, row.IsPrimary)
	require.Equal(t, "active", row.Status)
	require.Equal(t, "legacy_employee_save", row.Source)
}

func TestOrganizationServiceChangeEmployeeOrgUnitUpdatesLegacyDeptAndAssignment(t *testing.T) {
	testDB := setupOrganizationServiceSQLiteDB(t)
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
			status TEXT,
			joined_date DATETIME,
			dept_id TEXT,
			line_id TEXT,
			process_id TEXT,
			dept_name TEXT,
			line_name TEXT,
			process_name TEXT
		);
	`).Error)

	now := time.Now().Add(-time.Second)
	require.NoError(t, testDB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-change-org", CreatedAt: now, UpdatedAt: now},
		Name:      "Alice",
		Status:    "active",
		DeptID:    "legacy-dept",
	}).Error)
	require.NoError(t, testDB.Create(&models.OrgUnit{
		BaseModel: models.BaseModel{ID: "org-unit-b"},
		Name:      "Manufacturing",
		Status:    "active",
		UnitType:  "department",
	}).Error)

	snapshotSynchronizer := &fakeRoleSnapshotSynchronizer{}
	service := NewOrganizationService(
		fakeTransactionManager{db: testDB},
		snapshotSynchronizer,
		&fakeOrganizationRepository{},
	)

	response, err := service.ChangeEmployeeOrgUnit(ChangeEmployeeOrgUnitRequest{
		EmployeeID:      "emp-change-org",
		OrgUnitID:       "org-unit-b",
		ExpectedVersion: testOptimisticVersion(now),
	})

	require.NoError(t, err)
	require.Equal(t, "org-unit-b", response.Employee.DeptID)
	require.Equal(t, []string{"emp-change-org"}, snapshotSynchronizer.syncedEmployees)

	var employee models.Employee
	require.NoError(t, testDB.First(&employee, "id = ?", "emp-change-org").Error)
	require.Equal(t, "org-unit-b", employee.DeptID)

	var row struct {
		OrgUnitID string
		Source    string
	}
	require.NoError(t, testDB.Table("employee_assignments").
		Select("org_unit_id, source").
		Where("employee_id = ?", "emp-change-org").
		First(&row).Error)
	require.Equal(t, "org-unit-b", row.OrgUnitID)
	require.Equal(t, "employee_change_org_unit", row.Source)
}

func TestOrganizationServiceChangeEmployeePositionCreatesPrimaryAssignment(t *testing.T) {
	testDB := setupOrganizationServiceSQLiteDB(t)
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
			status TEXT,
			joined_date DATETIME,
			dept_id TEXT,
			line_id TEXT,
			process_id TEXT,
			dept_name TEXT,
			line_name TEXT,
			process_name TEXT
		);
	`).Error)

	now := time.Now().Add(-time.Second)
	require.NoError(t, testDB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-change-position", CreatedAt: now, UpdatedAt: now},
		Name:      "Bob",
		Status:    "active",
		DeptID:    "org-unit-c",
	}).Error)
	require.NoError(t, testDB.Create(&models.Position{
		BaseModel: models.BaseModel{ID: "position-a"},
		Name:      "Supervisor",
		Status:    "active",
	}).Error)

	snapshotSynchronizer := &fakeRoleSnapshotSynchronizer{}
	service := NewOrganizationService(
		fakeTransactionManager{db: testDB},
		snapshotSynchronizer,
		&fakeOrganizationRepository{},
	)

	response, err := service.ChangeEmployeePosition(ChangeEmployeePositionRequest{
		EmployeeID:      "emp-change-position",
		PositionID:      "position-a",
		ExpectedVersion: testOptimisticVersion(now),
	})

	require.NoError(t, err)
	require.Equal(t, "position-a", *response.Assignment.PositionID)
	require.Equal(t, "position-a", response.Employee.PositionID)
	require.Equal(t, "Supervisor", response.Employee.PositionName)
	require.Equal(t, []string{"emp-change-position"}, snapshotSynchronizer.syncedEmployees)

	var row struct {
		OrgUnitID  string
		PositionID string
		Source     string
	}
	require.NoError(t, testDB.Table("employee_assignments").
		Select("org_unit_id, position_id, source").
		Where("employee_id = ?", "emp-change-position").
		First(&row).Error)
	require.Equal(t, "org-unit-c", row.OrgUnitID)
	require.Equal(t, "position-a", row.PositionID)
	require.Equal(t, "employee_change_position", row.Source)
}

func TestOrganizationServiceClearEmployeePositionClearsPrimaryAssignmentPosition(t *testing.T) {
	testDB := setupOrganizationServiceSQLiteDB(t)
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
			status TEXT,
			joined_date DATETIME,
			dept_id TEXT,
			line_id TEXT,
			process_id TEXT,
			dept_name TEXT,
			line_name TEXT,
			process_name TEXT
		);
	`).Error)

	now := time.Now().Add(-time.Second)
	require.NoError(t, testDB.Create(&models.Employee{
		BaseModel: models.BaseModel{ID: "emp-clear-position", CreatedAt: now, UpdatedAt: now},
		Name:      "Carol",
		Status:    "active",
		DeptID:    "org-unit-d",
	}).Error)
	require.NoError(t, testDB.Create(&models.EmployeeAssignment{
		BaseModel:      models.BaseModel{ID: "assignment-clear-position", CreatedAt: now, UpdatedAt: now},
		EmployeeID:     "emp-clear-position",
		OrgUnitID:      stringPointer("org-unit-d"),
		PositionID:     stringPointer("position-b"),
		AssignmentType: "regular",
		IsPrimary:      true,
		StartDate:      now,
		Status:         "active",
		Source:         "seed",
	}).Error)
	require.NoError(t, testDB.Create(&models.Position{
		BaseModel: models.BaseModel{ID: "position-b"},
		Name:      "Operator",
		Status:    "active",
	}).Error)

	snapshotSynchronizer := &fakeRoleSnapshotSynchronizer{}
	service := NewOrganizationService(
		fakeTransactionManager{db: testDB},
		snapshotSynchronizer,
		&fakeOrganizationRepository{},
	)

	response, err := service.ClearEmployeePosition(ClearEmployeePositionRequest{
		EmployeeID:      "emp-clear-position",
		ExpectedVersion: testOptimisticVersion(now),
	})

	require.NoError(t, err)
	require.Nil(t, response.Assignment.PositionID)
	require.Equal(t, "", response.Employee.PositionID)
	require.Equal(t, "", response.Employee.PositionName)
	require.Equal(t, []string{"emp-clear-position"}, snapshotSynchronizer.syncedEmployees)

	var row struct {
		PositionID *string
		Source     string
	}
	require.NoError(t, testDB.Table("employee_assignments").
		Select("position_id, source").
		Where("employee_id = ?", "emp-clear-position").
		First(&row).Error)
	require.Nil(t, row.PositionID)
	require.Equal(t, "employee_clear_position", row.Source)
}

func TestOrganizationServiceListPositionsReturnsLookupItems(t *testing.T) {
	repo := &fakeOrganizationRepository{
		positions: []models.Position{
			{
				BaseModel:   models.BaseModel{ID: "position-a", CreatedAt: time.UnixMilli(1700000000000), UpdatedAt: time.UnixMilli(1700000000100)},
				Name:        "Supervisor",
				Code:        "SUP",
				Status:      "active",
				SortOrder:   1,
				OrgUnitName: "Manufacturing",
			},
		},
	}
	service := NewOrganizationService(
		fakeTransactionManager{},
		nil,
		repo,
	)

	positions, err := service.ListPositions()

	require.NoError(t, err)
	require.Len(t, positions, 1)
	require.Equal(t, "position-a", positions[0].ID)
	require.Equal(t, "Supervisor", positions[0].Name)
	require.Equal(t, "Manufacturing", positions[0].OrgUnitName)
	require.NotZero(t, positions[0].Version)
}
