package repositories

import (
	"testing"
	"xdfc-server/models"

	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupOrganizationRepositoryTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	return setupRepositoryTestDB(t,
		`CREATE TABLE organizations (
			id TEXT PRIMARY KEY,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME,
			name TEXT NOT NULL,
			parent_id TEXT,
			manager TEXT,
			description TEXT,
			type TEXT,
			linked_architecture BLOB
		)`,
		`CREATE TABLE employees (
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
			remarks TEXT
		)`,
		`CREATE TABLE users (
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
		)`,
	)
}

func TestGormOrganizationRepositoryOrganizationNameExistsByParent(t *testing.T) {
	repo := NewOrganizationRepository()
	testDB := setupOrganizationRepositoryTestDB(t)

	parentID := "root-1"
	organization := models.Organization{
		BaseModel: models.BaseModel{ID: "org-1"},
		Name:      "Assembly",
		ParentID:  &parentID,
	}
	require.NoError(t, testDB.Create(&organization).Error)

	exists, err := repo.OrganizationNameExists(testDB, "Assembly", &parentID, "")
	require.NoError(t, err)
	require.True(t, exists)

	otherParentID := "root-2"
	exists, err = repo.OrganizationNameExists(testDB, "Assembly", &otherParentID, "")
	require.NoError(t, err)
	require.False(t, exists)
}

func TestGormOrganizationRepositoryBulkUpdateStatusAndDisableUsers(t *testing.T) {
	repo := NewOrganizationRepository()
	testDB := setupOrganizationRepositoryTestDB(t)

	employees := []models.Employee{
		{BaseModel: models.BaseModel{ID: "emp-1"}, Name: "Alice", DeptID: "dept-1", Status: "active"},
		{BaseModel: models.BaseModel{ID: "emp-2"}, Name: "Bob", DeptID: "dept-1", Status: "active"},
	}
	users := []models.User{
		{ID: "user-1", Username: "alice", Password: "x", EmployeeID: "emp-1", Status: "active"},
		{ID: "user-2", Username: "bob", Password: "x", EmployeeID: "emp-2", Status: "active"},
	}
	require.NoError(t, testDB.Create(&employees).Error)
	require.NoError(t, testDB.Create(&users).Error)

	updated, err := repo.BulkUpdateEmployeeStatus(testDB, []string{"emp-1", "emp-2"}, "resigned")
	require.NoError(t, err)
	require.Equal(t, int64(2), updated)
	require.NoError(t, repo.DisableUsersByEmployeeIDs(testDB, []string{"emp-1", "emp-2"}))

	var storedEmployees []models.Employee
	require.NoError(t, testDB.Find(&storedEmployees).Error)
	require.Equal(t, "resigned", storedEmployees[0].Status)
	require.Equal(t, "resigned", storedEmployees[1].Status)

	var storedUsers []models.User
	require.NoError(t, testDB.Order("id asc").Find(&storedUsers).Error)
	require.Equal(t, "disabled", storedUsers[0].Status)
	require.Equal(t, "disabled", storedUsers[1].Status)
}

func TestGormOrganizationRepositoryDisableUsersByEmployeeIDsKeepsAdminAccountsActive(t *testing.T) {
	repo := NewOrganizationRepository()
	testDB := setupOrganizationRepositoryTestDB(t)

	users := []models.User{
		{ID: "user-10", Username: "admin", Password: "x", EmployeeID: "emp-admin", Status: "active"},
		{ID: "user-11", Username: "operator", Password: "x", EmployeeID: "emp-operator", Status: "active"},
	}
	require.NoError(t, testDB.Create(&users).Error)

	require.NoError(t, repo.DisableUsersByEmployeeIDs(testDB, []string{"emp-admin", "emp-operator"}))

	var storedUsers []models.User
	require.NoError(t, testDB.Order("id asc").Find(&storedUsers).Error)
	require.Equal(t, "active", storedUsers[0].Status)
	require.Equal(t, "disabled", storedUsers[1].Status)
}

func TestGormOrganizationRepositoryFindEmployeeByIDOrStaffID(t *testing.T) {
	repo := NewOrganizationRepository()
	testDB := setupOrganizationRepositoryTestDB(t)

	employee := models.Employee{
		BaseModel: models.BaseModel{ID: "emp-3"},
		StaffID:   "S-100",
		Name:      "Charlie",
	}
	require.NoError(t, testDB.Create(&employee).Error)

	foundByID, ok, err := repo.FindEmployeeByIDOrStaffID(testDB, employee.ID, "")
	require.NoError(t, err)
	require.True(t, ok)
	require.Equal(t, employee.ID, foundByID.ID)

	foundByStaffID, ok, err := repo.FindEmployeeByIDOrStaffID(testDB, "", employee.StaffID)
	require.NoError(t, err)
	require.True(t, ok)
	require.Equal(t, employee.ID, foundByStaffID.ID)
}
