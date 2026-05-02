package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
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
			status TEXT,
			role TEXT,
			employee_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
		`CREATE TABLE user_permissions (
			id TEXT PRIMARY KEY,
			user_id TEXT NOT NULL,
			permission_id TEXT NOT NULL,
			source TEXT,
			granted_by TEXT,
			reason TEXT,
			batch_id TEXT,
			created_at DATETIME,
			updated_at DATETIME,
			deleted_at DATETIME
		)`,
	}

	for _, stmt := range schemaStatements {
		require.NoError(t, db.DB.Exec(stmt).Error)
	}
}

func seedRegressionUser(t *testing.T, user models.User) {
	t.Helper()
	require.NoError(t, db.DB.Create(&user).Error)
}

func performPatchUserRequestWithActor(t *testing.T, userID string, requestBody string, actorUserID string, permissions []string) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPatch, "/api/v1/users/"+userID, strings.NewReader(requestBody))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Params = gin.Params{{Key: "id", Value: userID}}
	if actorUserID != "" {
		ctx.Set("userId", actorUserID)
	}
	if permissions != nil {
		ctx.Set("permissions", permissions)
	}
	PatchUserHandler(ctx)
	return recorder
}

func performPatchUserRequest(t *testing.T, userID string, requestBody string) *httptest.ResponseRecorder {
	t.Helper()
	return performPatchUserRequestWithActor(t, userID, requestBody, userID, nil)
}

func performReplaceUserRequestWithActor(t *testing.T, userID string, requestBody string, actorUserID string, permissions []string) *httptest.ResponseRecorder {
	t.Helper()
	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	request := httptest.NewRequest(http.MethodPut, "/api/v1/users/"+userID, strings.NewReader(requestBody))
	request.Header.Set("Content-Type", "application/json")
	ctx.Request = request
	ctx.Params = gin.Params{{Key: "id", Value: userID}}
	if actorUserID != "" {
		ctx.Set("userId", actorUserID)
	}
	if permissions != nil {
		ctx.Set("permissions", permissions)
	}
	ReplaceUserHandler(ctx)
	return recorder
}

func performReplaceUserRequest(t *testing.T, userID string, requestBody string) *httptest.ResponseRecorder {
	t.Helper()
	return performReplaceUserRequestWithActor(t, userID, requestBody, userID, nil)
}

func TestReplaceUserHandlerReplacesAllDeclaredFieldsAndKeepsPasswordWhenOmitted(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

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
		"status":"inactive",
		"employeeId":"EMP-009"
	}`)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var persisted models.User
	require.NoError(t, db.DB.First(&persisted, "id = ?", userID).Error)
	require.Equal(t, "replacement-user", persisted.Username)
	require.Equal(t, "2222", persisted.PhoneNumber)
	require.Equal(t, "Replaced", persisted.FirstName)
	require.Equal(t, "Account", persisted.LastName)
	require.Equal(t, "inactive", persisted.Status)
	require.Equal(t, "EMP-009", persisted.EmployeeID)
	require.Equal(t, hashedPassword, persisted.Password)
	require.Equal(t, "legacy@example.com", persisted.Email)
}

func TestPatchUserHandlerRejectsCrossUserPasswordResetWithoutManagePermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	targetID := uuid.NewString()
	actorID := uuid.NewString()
	hashedPassword, err := hashUserPassword("finance-pass")
	require.NoError(t, err)

	seedRegressionUser(t, models.User{
		ID:        targetID,
		Username:  "finance-manager",
		Password:  hashedPassword,
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	})

	recorder := performPatchUserRequestWithActor(t, targetID, `{"password":"HackerPassword123"}`, actorID, nil)
	require.Equal(t, http.StatusForbidden, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "modify your own account")

	var persisted models.User
	require.NoError(t, db.DB.First(&persisted, "id = ?", targetID).Error)
	require.Equal(t, hashedPassword, persisted.Password)
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(persisted.Password), []byte("finance-pass")))
}

func TestPatchUserHandlerRejectsCrossUserEmployeeBindingWithoutManagePermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	targetID := uuid.NewString()
	actorID := uuid.NewString()
	hashedPassword, err := hashUserPassword("ops-pass")
	require.NoError(t, err)

	seedRegressionUser(t, models.User{
		ID:         targetID,
		Username:   "ops-manager",
		Password:   hashedPassword,
		Status:     "active",
		EmployeeID: "EMP-FIN-001",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	})

	recorder := performPatchUserRequestWithActor(t, targetID, `{"employeeId":"EMP-ATTACKER"}`, actorID, nil)
	require.Equal(t, http.StatusForbidden, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "modify your own account")

	var persisted models.User
	require.NoError(t, db.DB.First(&persisted, "id = ?", targetID).Error)
	require.Equal(t, "EMP-FIN-001", persisted.EmployeeID)
}

func TestPatchUserHandlerAllowsSelfPasswordChange(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	userID := uuid.NewString()
	hashedPassword, err := hashUserPassword("self-pass")
	require.NoError(t, err)

	seedRegressionUser(t, models.User{
		ID:        userID,
		Username:  "self-user",
		Password:  hashedPassword,
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	})

	recorder := performPatchUserRequest(t, userID, `{"password":"SelfUpdated123"}`)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var persisted models.User
	require.NoError(t, db.DB.First(&persisted, "id = ?", userID).Error)
	require.NotEqual(t, hashedPassword, persisted.Password)
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(persisted.Password), []byte("SelfUpdated123")))
}

func TestReplaceUserHandlerRejectsInvalidStatus(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	hashedPassword, err := hashUserPassword("original-pass")
	require.NoError(t, err)

	userID := uuid.NewString()
	seedRegressionUser(t, models.User{
		ID:        userID,
		Username:  "status-user",
		Password:  hashedPassword,
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	})

	recorder := performReplaceUserRequest(t, userID, `{
		"username":"status-user",
		"phoneNumber":"2222",
		"firstName":"Status",
		"lastName":"User",
		"status":"archived"
	}`)

	require.Equal(t, http.StatusBadRequest, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "invalid status")
}

func TestReplaceUserHandlerRejectsAdminReplacementByNonAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	hashedPassword, err := hashUserPassword("seed-pass")
	require.NoError(t, err)

	userID := uuid.NewString()
	seedRegressionUser(t, models.User{
		ID:        userID,
		Username:  "admin",
		Password:  hashedPassword,
		Status:    "active",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	})

	recorder := performReplaceUserRequest(t, userID, `{
		"username":"admin",
		"phoneNumber":"0000",
		"firstName":"Seed",
		"lastName":"Admin",
		"status":"active"
	}`)

	require.Equal(t, http.StatusForbidden, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "Only admin can manage the seed admin account")
}

func TestReplaceUserHandlerRejectsCrossUserReplacementWithoutManagePermission(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	targetID := uuid.NewString()
	actorID := uuid.NewString()
	hashedPassword, err := hashUserPassword("finance-pass")
	require.NoError(t, err)

	seedRegressionUser(t, models.User{
		ID:         targetID,
		Username:   "finance-manager",
		Password:   hashedPassword,
		Status:     "active",
		EmployeeID: "EMP-FIN-200",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	})

	recorder := performReplaceUserRequestWithActor(t, targetID, `{
		"username":"finance-manager",
		"phoneNumber":"9999",
		"firstName":"Hijacked",
		"lastName":"Account",
		"status":"inactive",
		"employeeId":"EMP-HIJACK",
		"password":"ResetByAttacker123"
	}`, actorID, nil)
	require.Equal(t, http.StatusForbidden, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), "modify your own account")

	var persisted models.User
	require.NoError(t, db.DB.First(&persisted, "id = ?", targetID).Error)
	require.Equal(t, "EMP-FIN-200", persisted.EmployeeID)
	require.Equal(t, "active", persisted.Status)
	require.Equal(t, hashedPassword, persisted.Password)
}

func TestReplaceUserHandlerAllowsManagerToReplaceAnotherUser(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	targetID := uuid.NewString()
	managerID := uuid.NewString()
	hashedPassword, err := hashUserPassword("legacy-pass")
	require.NoError(t, err)

	seedRegressionUser(t, models.User{
		ID:         targetID,
		Username:   "replace-target",
		Password:   hashedPassword,
		Status:     "active",
		EmployeeID: "EMP-OLD",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	})

	recorder := performReplaceUserRequestWithActor(t, targetID, `{
		"username":"replace-target-updated",
		"phoneNumber":"2222",
		"firstName":"Managed",
		"lastName":"Target",
		"status":"inactive",
		"employeeId":"EMP-NEW",
		"password":"ManagerReset456"
	}`, managerID, []string{authz.PermissionManage})
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var persisted models.User
	require.NoError(t, db.DB.First(&persisted, "id = ?", targetID).Error)
	require.Equal(t, "replace-target-updated", persisted.Username)
	require.Equal(t, "EMP-NEW", persisted.EmployeeID)
	require.Equal(t, "inactive", persisted.Status)
	require.NoError(t, bcrypt.CompareHashAndPassword([]byte(persisted.Password), []byte("ManagerReset456")))
}

func TestGetUsersHandlerReturnsPaginatedContractWithFilters(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	hashedPassword, err := hashUserPassword("user-pass")
	require.NoError(t, err)

	seedRegressionUser(t, models.User{ID: uuid.NewString(), Username: "alice-fin", Password: hashedPassword, Status: "active", EmployeeID: "EMP-1", CreatedAt: time.Now(), UpdatedAt: time.Now()})
	seedRegressionUser(t, models.User{ID: uuid.NewString(), Username: "alice-ops", Password: hashedPassword, Status: "active", EmployeeID: "EMP-2", CreatedAt: time.Now(), UpdatedAt: time.Now()})
	seedRegressionUser(t, models.User{ID: uuid.NewString(), Username: "bob-fin", Password: hashedPassword, Status: "inactive", EmployeeID: "EMP-3", CreatedAt: time.Now(), UpdatedAt: time.Now()})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/users?page=1&pageSize=5&username=alice&status=active", nil)

	GetUsersHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response struct {
		Items []struct {
			ID         string `json:"id"`
			Username   string `json:"username"`
			Status     string `json:"status"`
			EmployeeID string `json:"employeeId"`
		} `json:"items"`
		Total    int64 `json:"total"`
		Page     int   `json:"page"`
		PageSize int   `json:"pageSize"`
	}
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	require.Equal(t, int64(2), response.Total)
	require.Equal(t, 1, response.Page)
	require.Equal(t, 5, response.PageSize)
	require.Len(t, response.Items, 2)
}

func TestGetUsersHandlerReturnsOptionsArrayWhenOptionsEnabled(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	hashedPassword, err := hashUserPassword("user-pass")
	require.NoError(t, err)

	seedRegressionUser(t, models.User{ID: uuid.NewString(), Username: "ops-a", Password: hashedPassword, Status: "active", EmployeeID: "EMP-10", CreatedAt: time.Now(), UpdatedAt: time.Now()})
	seedRegressionUser(t, models.User{ID: uuid.NewString(), Username: "ops-b", Password: hashedPassword, Status: "active", EmployeeID: "EMP-11", CreatedAt: time.Now(), UpdatedAt: time.Now()})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/users?options=true", nil)

	GetUsersHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var response []struct {
		ID         string `json:"id"`
		Username   string `json:"username"`
		Status     string `json:"status"`
		EmployeeID string `json:"employeeId"`
	}
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
		Status:     "active",
		EmployeeID: "EMP-SNAP",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	})

	router := gin.New()
	router.GET("/auth/snapshot", func(c *gin.Context) {
		c.Set("userId", userID)
		c.Set("username", "snapshot-user")
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
	ctx.Set("status", "active")

	GetAuthSnapshotHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, []any{}, payload["permissions"])
}

func TestGetAuthSnapshotHandlerReturnsUserPermissionSnapshot(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	userID := uuid.NewString()
	seedRegressionUser(t, models.User{
		ID:         userID,
		Username:   "snapshot-effective-only",
		Password:   "$2a$11$abcdefghijklmnopqrstuv",
		Email:      "snapshot-effective-only@example.com",
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
	ctx.Set("status", "active")
	ctx.Set("permissions", []string{"menu_org"})

	GetAuthSnapshotHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
}

func TestGetUserAccessSnapshotHandlerReturnsPermissionOnlySnapshot(t *testing.T) {
	gin.SetMode(gin.TestMode)
	setupUsersContractRegressionTestDB(t)

	userID := uuid.NewString()
	require.NoError(t, db.DB.Create(&models.UserPermission{
		BaseModel:    models.BaseModel{ID: uuid.NewString()},
		UserID:       userID,
		PermissionID: "user_view",
		Source:       "manual",
	}).Error)
	seedRegressionUser(t, models.User{
		ID:         userID,
		Username:   "access-user",
		Password:   "$2a$11$abcdefghijklmnopqrstuv",
		Email:      "access@example.com",
		Status:     "active",
		EmployeeID: "EMP-ACCESS",
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
	})

	recorder := httptest.NewRecorder()
	ctx, _ := gin.CreateTestContext(recorder)
	ctx.Request = httptest.NewRequest(http.MethodGet, "/api/v1/users/"+userID+"/access", nil)
	ctx.Params = gin.Params{{Key: "id", Value: userID}}

	GetUserAccessSnapshotHandler(ctx)

	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())

	var payload map[string]any
	require.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &payload))
	require.Equal(t, userID, payload["userId"])
	require.Equal(t, "access-user", payload["username"])
	require.Contains(t, payload["permissions"].([]any), "user_view")
	require.Contains(t, payload["diagnostics"].([]any), "role_plus_user_permissions_authoritative")
	require.Contains(t, payload["diagnostics"].([]any), "role_unassigned")
}
