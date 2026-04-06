package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
)

func setupUsersContractRegressionTestDB(t *testing.T) {
	t.Helper()
	setupHandlerSQLiteTestDB(t)

	schemaStatements := []string{
		`CREATE TABLE users (
			id TEXT PRIMARY KEY,
			username TEXT NOT NULL UNIQUE,
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
		)`,
		`CREATE TABLE roles (
			id TEXT PRIMARY KEY,
			role_id TEXT NOT NULL UNIQUE,
			label TEXT,
			color TEXT,
			permissions TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
	}

	for _, stmt := range schemaStatements {
		require.NoError(t, db.DB.Exec(stmt).Error)
	}
}

func seedRegressionRole(t *testing.T, roleID string) {
	t.Helper()
	require.NoError(t, db.DB.Create(&models.Role{
		BaseModel: models.BaseModel{ID: uuid.NewString()},
		RoleID:    roleID,
		Label:     roleID,
	}).Error)
}

func seedRegressionUser(t *testing.T, user models.User) {
	t.Helper()
	require.NoError(t, db.DB.Create(&user).Error)
}

func performReplaceUserRequest(t *testing.T, userID string, requestBody string, currentRole string) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPut, "/api/v1/users/"+userID, strings.NewReader(requestBody))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Params = gin.Params{{Key: "id", Value: userID}}
	ctx.Set("role", currentRole)
	ReplaceUserHandler(ctx)
	return recorder
}

func TestReplaceUserHandlerReplacesAllDeclaredFieldsAndKeepsPasswordWhenOmitted(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)
	seedRegressionRole(t, "finance_manager")
	seedRegressionRole(t, "ops_manager")

	hashedPassword, err := hashUserPassword("original-pass")
	require.NoError(t, err)

	userID := uuid.NewString()
	seedRegressionUser(t, models.User{
		ID:          userID,
		Username:    "legacy-user",
		Password:    hashedPassword,
		Email:       "legacy@example.com",
		PhoneNumber: "1111",
		FirstName:   "Legacy",
		LastName:    "User",
		Role:        "finance_manager",
		Status:      "active",
		EmployeeID:  "EMP-001",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	})

	recorder := performReplaceUserRequest(t, userID, `{
		"username":"replacement-user",
		"phoneNumber":"2222",
		"firstName":"Replaced",
		"lastName":"Account",
		"role":"ops_manager",
		"status":"inactive",
		"employeeId":"EMP-009"
	}`, "admin")

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var persisted models.User
	require.NoError(t, db.DB.First(&persisted, "id = ?", userID).Error)
	require.Equal(t, "replacement-user", persisted.Username)
	require.Equal(t, "2222", persisted.PhoneNumber)
	require.Equal(t, "Replaced", persisted.FirstName)
	require.Equal(t, "Account", persisted.LastName)
	require.Equal(t, "ops_manager", persisted.Role)
	require.Equal(t, "inactive", persisted.Status)
	require.Equal(t, "EMP-009", persisted.EmployeeID)
	require.Equal(t, hashedPassword, persisted.Password)
	require.Equal(t, "legacy@example.com", persisted.Email)
}

func TestReplaceUserHandlerRejectsInvalidStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)
	seedRegressionRole(t, "finance_manager")

	hashedPassword, err := hashUserPassword("original-pass")
	require.NoError(t, err)

	userID := uuid.NewString()
	seedRegressionUser(t, models.User{
		ID:        userID,
		Username:  "status-user",
		Password:  hashedPassword,
		Role:      "finance_manager",
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	})

	recorder := performReplaceUserRequest(t, userID, `{
		"username":"status-user",
		"phoneNumber":"2222",
		"firstName":"Status",
		"lastName":"User",
		"role":"finance_manager",
		"status":"archived"
	}`, "admin")

	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "invalid status")
}

func TestReplaceUserHandlerRejectsAdminReplacementByNonAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)
	seedRegressionRole(t, "admin")

	hashedPassword, err := hashUserPassword("seed-pass")
	require.NoError(t, err)

	userID := uuid.NewString()
	seedRegressionUser(t, models.User{
		ID:        userID,
		Username:  "admin",
		Password:  hashedPassword,
		Role:      "admin",
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	})

	recorder := performReplaceUserRequest(t, userID, `{
		"username":"admin",
		"phoneNumber":"0000",
		"firstName":"Seed",
		"lastName":"Admin",
		"role":"admin",
		"status":"active"
	}`, "finance_manager")

	require.Equal(t, http.StatusForbidden, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "Only admin can manage admin roles")
}

func TestGetUsersHandlerReturnsPaginatedContractWithFilters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	hashedPassword, err := hashUserPassword("user-pass")
	require.NoError(t, err)

	seedRegressionUser(t, models.User{ID: uuid.NewString(), Username: "alice-fin", Password: hashedPassword, Role: "finance_manager", Status: "active", EmployeeID: "EMP-1", CreatedAt: time.Now(), UpdatedAt: time.Now()})
	seedRegressionUser(t, models.User{ID: uuid.NewString(), Username: "alice-ops", Password: hashedPassword, Role: "ops_manager", Status: "active", EmployeeID: "EMP-2", CreatedAt: time.Now(), UpdatedAt: time.Now()})
	seedRegressionUser(t, models.User{ID: uuid.NewString(), Username: "bob-fin", Password: hashedPassword, Role: "finance_manager", Status: "inactive", EmployeeID: "EMP-3", CreatedAt: time.Now(), UpdatedAt: time.Now()})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/users?page=1&pageSize=5&username=alice&status=active&role=finance_manager", nil)

	GetUsersHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response struct {
		Items    []models.User `json:"items"`
		Total    int64         `json:"total"`
		Page     int           `json:"page"`
		PageSize int           `json:"pageSize"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, int64(1), response.Total)
	require.Equal(t, 1, response.Page)
	require.Equal(t, 5, response.PageSize)
	require.Len(t, response.Items, 1)
	require.Equal(t, "alice-fin", response.Items[0].Username)
}

func TestGetUsersHandlerReturnsOptionsArrayWhenOptionsEnabled(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	hashedPassword, err := hashUserPassword("user-pass")
	require.NoError(t, err)

	seedRegressionUser(t, models.User{ID: uuid.NewString(), Username: "ops-a", Password: hashedPassword, Role: "ops_manager", Status: "active", EmployeeID: "EMP-10", CreatedAt: time.Now(), UpdatedAt: time.Now()})
	seedRegressionUser(t, models.User{ID: uuid.NewString(), Username: "ops-b", Password: hashedPassword, Role: "ops_manager", Status: "active", EmployeeID: "EMP-11", CreatedAt: time.Now(), UpdatedAt: time.Now()})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/users?options=true&role=ops_manager", nil)

	GetUsersHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []models.User
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Len(t, response, 2)
}

func TestGetProfileReturnsExpectedUserMetadata(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	hashedPassword, err := hashUserPassword("user-pass")
	require.NoError(t, err)

	userID := uuid.NewString()
	seedRegressionUser(t, models.User{
		ID:         userID,
		Username:   "snapshot-user",
		Password:   hashedPassword,
		Email:      "snapshot@example.com",
		Role:       "finance_manager",
		Status:     "active",
		EmployeeID: "EMP-SNAP",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	})

	router := gin.New()
	router.GET("/auth/snapshot", func(c *gin.Context) {
		c.Set("userId", userID)
		c.Set("username", "snapshot-user")
		c.Set("role", "finance_manager")
		c.Set("effectiveRoles", []string{"finance_manager"})
		c.Set("status", "active")
		c.Set("permissions", []string{"menu_org", "permission_user_view"})
		GetAuthSnapshotHandler(c)
	})

	profileRecorder := httptest.NewRecorder()
	router.ServeHTTP(profileRecorder, httptest.NewRequest(http.MethodGet, "/auth/snapshot", nil))
	require.Equal(t, http.StatusOK, profileRecorder.Code, profileRecorder.Body.String())

	legacyRecorder := httptest.NewRecorder()
	router.ServeHTTP(legacyRecorder, httptest.NewRequest(http.MethodGet, "/profile", nil))
	require.Equal(t, http.StatusNotFound, legacyRecorder.Code)

	var payload map[string]any
	require.NoError(t, json.Unmarshal(profileRecorder.Body.Bytes(), &payload))
	require.Equal(t, "snapshot@example.com", payload["email"])
	require.Equal(t, "EMP-SNAP", payload["employeeId"])
	require.Equal(t, "snapshot-user", payload["username"])

	permissions := payload["permissions"].([]any)
	require.Contains(t, permissions, "menu_org")
	require.Contains(t, permissions, "permission_user_view")
}

func TestGetAuthSnapshotHandlerDoesNotRecomputePermissionsWhenContextPermissionsMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	userID := uuid.NewString()
	seedRegressionUser(t, models.User{
		ID:         userID,
		Username:   "snapshot-no-fallback",
		Password:   "$2a$11$abcdefghijklmnopqrstuv",
		Email:      "snapshot-no-fallback@example.com",
		Role:       "finance_manager",
		Status:     "active",
		EmployeeID: "EMP-NO-FALLBACK",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/auth/snapshot", nil)
	ctx.Set("userId", userID)
	ctx.Set("username", "snapshot-no-fallback")
	ctx.Set("role", "finance_manager")
	ctx.Set("effectiveRoles", []string{"finance_manager"})
	ctx.Set("status", "active")

	GetAuthSnapshotHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, []any{}, payload["permissions"])
}

func TestGetAuthSnapshotHandlerDoesNotFallbackEffectiveRolesFromRoleContext(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	userID := uuid.NewString()
	seedRegressionUser(t, models.User{
		ID:         userID,
		Username:   "snapshot-effective-only",
		Password:   "$2a$11$abcdefghijklmnopqrstuv",
		Email:      "snapshot-effective-only@example.com",
		Role:       "finance_manager",
		Status:     "active",
		EmployeeID: "EMP-EFFECTIVE-ONLY",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/auth/snapshot", nil)
	ctx.Set("userId", userID)
	ctx.Set("username", "snapshot-effective-only")
	ctx.Set("role", "finance_manager")
	ctx.Set("status", "active")
	ctx.Set("permissions", []string{"menu_org"})

	GetAuthSnapshotHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, []any{"finance_manager"}, payload["role"])
	require.Nil(t, payload["effectiveRoles"])
}
