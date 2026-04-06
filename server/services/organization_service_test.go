package services

import (
	"fmt"
	"strings"
	"testing"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

type fakeOrganizationRepository struct {
	nameExists        bool
	saveOrgHit        bool
	saveEmployeeHit   bool
	childCount        int64
	employeeCount     int64
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

func (r *fakeOrganizationRepository) BulkUpdateEmployeeStatus(database *gorm.DB, ids []string, status string) (int64, error) {
	r.updatedIDs = append([]string(nil), ids...)
	r.updatedStatus = status
	return int64(len(ids)), nil
}

func (r *fakeOrganizationRepository) SaveEmployee(database *gorm.DB, employee *models.Employee) error {
	r.saveEmployeeHit = true
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
			role TEXT,
			status TEXT,
			employee_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		);
	`).Error; err != nil {
		t.Fatalf("create users table failed: %v", err)
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
		&fakeAuditLogger{},
		repo,
	)

	_, err := service.SaveOrganization(models.Organization{Name: "Ops"})

	require.ErrorIs(t, err, ErrOrganizationNameConflict)
	require.False(t, repo.saveOrgHit)
}

func TestOrganizationServiceDeleteOrganizationRejectsChildDepartments(t *testing.T) {
	service := NewOrganizationService(
		fakeTransactionManager{},
		&fakeAuditLogger{},
		&fakeOrganizationRepository{childCount: 2},
	)

	err := service.DeleteOrganization("dept-1")

	require.ErrorIs(t, err, ErrOrganizationHasChildren)
}

func TestOrganizationServiceDeleteOrganizationRejectsEmployees(t *testing.T) {
	service := NewOrganizationService(
		fakeTransactionManager{},
		&fakeAuditLogger{},
		&fakeOrganizationRepository{employeeCount: 1},
	)

	err := service.DeleteOrganization("dept-1")

	require.ErrorIs(t, err, ErrOrganizationHasEmployees)
}

func TestOrganizationServiceBulkUpdateEmployeeStatusNormalizesIDs(t *testing.T) {
	repo := &fakeOrganizationRepository{}
	service := NewOrganizationService(
		fakeTransactionManager{},
		&fakeAuditLogger{},
		repo,
	)

	updated, err := service.BulkUpdateEmployeeStatus([]string{" emp-1 ", "", "emp-2"}, "active")

	require.NoError(t, err)
	require.Equal(t, int64(2), updated)
	require.Equal(t, []string{"emp-1", "emp-2"}, repo.updatedIDs)
	require.Equal(t, "active", repo.updatedStatus)
}

func TestOrganizationServiceDeleteEmployeesDisablesLinkedUsers(t *testing.T) {
	testDB := setupOrganizationServiceSQLiteDB(t)
	repo := &fakeOrganizationRepository{}
	auditLogger := &fakeAuditLogger{}
	service := NewOrganizationService(
		fakeTransactionManager{db: testDB},
		auditLogger,
		repo,
	)

	err := service.DeleteEmployees([]string{" emp-1 ", "emp-2"})

	require.NoError(t, err)
	require.Equal(t, []string{"emp-1", "emp-2"}, repo.deletedIDs)
	require.Equal(t, []string{"emp-1", "emp-2"}, repo.disabledUserIDs)
	require.Len(t, auditLogger.entries, 2)
	require.Equal(t, "Employee", auditLogger.entries[0].Module)
	require.Equal(t, "emp-1", auditLogger.entries[0].TargetID)
	require.Equal(t, "Delete", auditLogger.entries[0].Action)
	require.Equal(t, "emp-2", auditLogger.entries[1].TargetID)
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
	auditLogger := &fakeAuditLogger{}
	service := NewOrganizationService(
		fakeTransactionManager{},
		auditLogger,
		repo,
	)

	count, err := service.BulkSyncEmployees([]models.Employee{
		{
			BaseModel: models.BaseModel{ID: "emp-1"},
			Name:      "Alice",
			Status:    "resigned",
			DeptID:    "dept-new",
		},
		{
			BaseModel: models.BaseModel{ID: "emp-2"},
			Name:      "Bob",
			Status:    "active",
			DeptID:    "dept-new",
		},
	})

	require.NoError(t, err)
	require.Equal(t, 2, count)
	require.Len(t, auditLogger.entries, 2)
	require.Equal(t, AuditEntry{Module: "Employee", TargetID: "emp-1", Action: "Update"}, auditLogger.entries[0])
	require.Equal(t, AuditEntry{Module: "Employee", TargetID: "emp-2", Action: "Create"}, auditLogger.entries[1])
}
