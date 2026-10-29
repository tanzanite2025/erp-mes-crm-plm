package routes

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/handlers"
	"xdfc-server/middleware"
	"xdfc-server/models"
	"xdfc-server/security"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestAuthenticatedPasswordChangeHTTPRequiresOnlyIdentityAndExpiresAllOldCredentials(t *testing.T) {
	previousLogger := log.Logger
	var passwordChangeLogs bytes.Buffer
	log.Logger = zerolog.New(&passwordChangeLogs)
	t.Cleanup(func() { log.Logger = previousLogger })
	t.Setenv("GIN_MODE", "test")
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	require.NoError(t, database.Exec(`CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT, password TEXT, password_version INTEGER NOT NULL DEFAULT 0, email TEXT, phone_number TEXT, first_name TEXT, last_name TEXT, status TEXT, is_protected BOOLEAN, permission_preset_id TEXT, employee_id TEXT, created_at DATETIME, updated_at DATETIME, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE user_permissions (id TEXT, user_id TEXT, permission_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, database.AutoMigrate(&models.AuditLog{}))
	hash, err := security.HashNewUserPasswordWithValidation("original-password1")
	require.NoError(t, err)
	for _, username := range []string{"operator", "admin", "rate-test", "account-manager", "audit-failure"} {
		require.NoError(t, database.Create(&models.User{ID: username, Username: username, Password: hash, Status: "active", IsProtected: username == "admin"}).Error)
	}
	previousDatabase, previousRedis, previousSecret := db.DB, db.RDB, middleware.JwtSecret
	db.DB, db.RDB, middleware.JwtSecret = database, nil, []byte("isolated-http-password-change-test-secret")
	t.Cleanup(func() { db.DB, db.RDB, middleware.JwtSecret = previousDatabase, previousRedis, previousSecret })
	router := gin.New()
	router.POST("/api/v1/auth/login", handlers.LoginHandler)
	authorized := router.Group("/api/v1", middleware.AuthMiddleware(), middleware.CSRFProtection())
	registerAuthenticatedUserPasswordChangeRoutes(authorized)
	registerUserRoutes(authorized)
	authorized.GET("/auth/snapshot", handlers.GetAuthSnapshotHandler)
	signToken := func(username string) string {
		token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": username, "exp": time.Now().Add(time.Hour).Unix()}).SignedString(middleware.JwtSecret)
		require.NoError(t, err)
		return token
	}
	request := func(method, path, token, body string, csrf bool) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, "/api/v1"+path, bytes.NewBufferString(body))
		req.Header.Set("Content-Type", "application/json")
		if token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
		if csrf {
			req.AddCookie(&http.Cookie{Name: "csrf_token", Value: "test-csrf"})
			req.Header.Set("X-CSRF-Token", "test-csrf")
		}
		response := httptest.NewRecorder()
		router.ServeHTTP(response, req)
		return response
	}
	body := `{"currentPassword":"original-password1","newPassword":"replacement-password2"}`
	currentTokens := map[string]string{}
	require.Equal(t, http.StatusUnauthorized, request(http.MethodPost, "/auth/change-password", "", body, true).Code)
	for _, username := range []string{"operator", "admin"} {
		token := signToken(username)
		require.Equal(t, http.StatusForbidden, request(http.MethodPost, "/auth/change-password", token, body, false).Code)
		require.Equal(t, http.StatusBadRequest, request(http.MethodPost, "/auth/change-password", token, strings.TrimSuffix(body, "}")+`,"userId":"someone-else"}`, true).Code)
		wrongPassword := request(http.MethodPost, "/auth/change-password", token, `{"currentPassword":"wrong-password1","newPassword":"replacement-password2"}`, true)
		require.Equal(t, "no-store", wrongPassword.Header().Get("Cache-Control"))
		require.Equal(t, http.StatusUnprocessableEntity, wrongPassword.Code)
		require.Contains(t, wrongPassword.Body.String(), "auth_current_password_incorrect")
		require.Equal(t, http.StatusOK, request(http.MethodGet, "/auth/snapshot", token, "", false).Code)
		response := request(http.MethodPost, "/auth/change-password", token, body, true)
		require.Equal(t, "no-store", response.Header().Get("Cache-Control"))
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		cleared := map[string]bool{}
		for _, cookie := range response.Result().Cookies() {
			if cookie.MaxAge < 0 {
				cleared[cookie.Name] = true
			}
		}
		require.True(t, cleared["xdfc_access_token"])
		require.True(t, cleared["csrf_token"])
		require.Equal(t, http.StatusUnauthorized, request(http.MethodGet, "/auth/snapshot", token, "", false).Code)
		loginBody, err := json.Marshal(map[string]string{"username": username, "password": "original-password1"})
		require.NoError(t, err)
		require.Equal(t, http.StatusUnauthorized, request(http.MethodPost, "/auth/login", "", string(loginBody), false).Code)
		loginBody, err = json.Marshal(map[string]string{"username": username, "password": "replacement-password2"})
		require.NoError(t, err)
		login := request(http.MethodPost, "/auth/login", "", string(loginBody), false)
		require.Equal(t, http.StatusOK, login.Code, login.Body.String())
		var credentials struct {
			AccessToken string `json:"accessToken"`
		}
		require.NoError(t, json.Unmarshal(login.Body.Bytes(), &credentials))
		currentTokens[username] = credentials.AccessToken
		require.Equal(t, http.StatusOK, request(http.MethodGet, "/auth/snapshot", credentials.AccessToken, "", false).Code)
	}
	// A failed commit must preserve the original credentials and must not clear cookies.
	require.NoError(t, database.Migrator().DropTable(&models.AuditLog{}))
	auditFailureToken := signToken("audit-failure")
	auditFailure := request(http.MethodPost, "/auth/change-password", auditFailureToken, body, true)
	require.Equal(t, http.StatusInternalServerError, auditFailure.Code)
	require.Contains(t, auditFailure.Body.String(), "auth_password_change_failed")
	require.Empty(t, auditFailure.Result().Cookies())
	require.Equal(t, http.StatusOK, request(http.MethodGet, "/auth/snapshot", auditFailureToken, "", false).Code)
	var unchangedAfterAuditFailure models.User
	require.NoError(t, database.First(&unchangedAfterAuditFailure, "id = ?", "audit-failure").Error)
	require.Zero(t, unchangedAfterAuditFailure.PasswordVersion)
	require.Equal(t, hash, unchangedAfterAuditFailure.Password)
	require.NoError(t, database.AutoMigrate(&models.AuditLog{}))
	// A user_edit permission must not permit bypassing current-password verification.
	require.NoError(t, database.Exec(`INSERT INTO user_permissions (id,user_id,permission_id) VALUES ('self-edit','operator','user_edit'),('manager-edit','account-manager','user_edit'),('manager-manage','account-manager','perm_manage')`).Error)
	for _, method := range []string{http.MethodPatch, http.MethodPut} {
		response := request(method, "/users/operator", currentTokens["operator"], `{"username":"operator","status":"active","password":"administrative-password3"}`, true)
		require.Equal(t, http.StatusForbidden, response.Code, response.Body.String())
		require.Contains(t, response.Body.String(), "auth_self_password_change_required")
	}
	managerToken := signToken("account-manager")
	for index, method := range []string{http.MethodPatch, http.MethodPut} {
		response := request(method, "/users/operator", managerToken, `{"username":"operator","status":"active","password":"administrative-password3"}`, true)
		require.Equal(t, http.StatusOK, response.Code, response.Body.String())
		var account models.User
		require.NoError(t, database.First(&account, "id = ?", "operator").Error)
		require.EqualValues(t, index+2, account.PasswordVersion)
	}
	require.Equal(t, http.StatusUnauthorized, request(http.MethodGet, "/auth/snapshot", currentTokens["operator"], "", false).Code)
	for range 5 {
		require.Equal(t, http.StatusUnprocessableEntity, request(http.MethodPost, "/auth/change-password", signToken("rate-test"), `{"currentPassword":"wrong-password1","newPassword":"replacement-password2"}`, true).Code)
	}
	require.Equal(t, http.StatusTooManyRequests, request(http.MethodPost, "/auth/change-password", signToken("rate-test"), body, true).Code)
	require.Contains(t, passwordChangeLogs.String(), "AUTH_PASSWORD_CHANGE_SUCCEEDED")
	require.Contains(t, passwordChangeLogs.String(), "auth_current_password_incorrect")
	for _, secret := range []string{"original-password1", "replacement-password2", "wrong-password1", "administrative-password3", hash} {
		require.NotContains(t, passwordChangeLogs.String(), secret)
	}
}

func TestAuthenticatedPasswordChangeRedisLimitIsSharedAcrossMiddlewareInstances(t *testing.T) {
	address := os.Getenv("PASSWORD_CHANGE_TEST_REDIS_ADDR")
	if address == "" {
		t.Skip("set PASSWORD_CHANGE_TEST_REDIS_ADDR to verify distributed rate limiting")
	}
	client := redis.NewClient(&redis.Options{Addr: address})
	t.Cleanup(func() { require.NoError(t, client.Close()) })
	previousRedis := db.RDB
	db.RDB = client
	t.Cleanup(func() { db.RDB = previousRedis })
	account := "password-change-test-" + time.Now().Format("150405.000000000")
	ip := "2001:db8:" + strings.ReplaceAll(uuid.NewString(), "-", "")[:4] + "::75"
	keys := []string{"auth:{password-change}:account:" + account, "auth:{password-change}:ip:" + ip}
	t.Cleanup(func() { _ = client.Del(context.Background(), keys...).Err() })
	routers := make([]*gin.Engine, 2)
	for index := range routers {
		routers[index] = gin.New()
		routers[index].Use(func(c *gin.Context) { c.Set("userId", account); c.Next() })
		routers[index].POST("/change", middleware.AuthenticatedUserPasswordChangeRateLimitMiddleware(), func(c *gin.Context) { c.Status(http.StatusNoContent) })
	}
	for index := range 6 {
		response := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/change", nil)
		req.RemoteAddr = "[" + ip + "]:12345"
		routers[index%2].ServeHTTP(response, req)
		if index < 5 {
			require.Equal(t, http.StatusNoContent, response.Code)
		} else {
			require.Equal(t, http.StatusTooManyRequests, response.Code)
			require.Equal(t, "300", response.Header().Get("Retry-After"))
		}
	}
}

func TestAuthenticatedPasswordChangeRedisIPLimitCannotBeBypassedBySwitchingAccounts(t *testing.T) {
	address := os.Getenv("PASSWORD_CHANGE_TEST_REDIS_ADDR")
	if address == "" {
		t.Skip("set PASSWORD_CHANGE_TEST_REDIS_ADDR to verify the cross-account IP limit")
	}
	client := redis.NewClient(&redis.Options{Addr: address})
	t.Cleanup(func() { _ = client.Close() })
	previousRedis := db.RDB
	db.RDB = client
	t.Cleanup(func() { db.RDB = previousRedis })
	namespace := uuid.NewString()
	ip := "2001:db8:" + strings.ReplaceAll(namespace, "-", "")[:4] + "::76"
	keys := []string{"auth:{password-change}:ip:" + ip}
	t.Cleanup(func() { _ = client.Del(context.Background(), keys...).Err() })
	routers := make([]*gin.Engine, 2)
	for index := range routers {
		routers[index] = gin.New()
		routers[index].Use(func(c *gin.Context) { c.Set("userId", c.GetHeader("Test-Account-ID")) })
		routers[index].POST("/change", middleware.AuthenticatedUserPasswordChangeRateLimitMiddleware(), func(c *gin.Context) { c.Status(http.StatusNoContent) })
	}
	for index := range 21 {
		account := namespace + "-" + strconv.Itoa(index)
		keys = append(keys, "auth:{password-change}:account:"+account)
		req := httptest.NewRequest(http.MethodPost, "/change", nil)
		req.RemoteAddr = "[" + ip + "]:12345"
		req.Header.Set("Test-Account-ID", account)
		response := httptest.NewRecorder()
		routers[index%2].ServeHTTP(response, req)
		if index < 20 {
			require.Equal(t, http.StatusNoContent, response.Code)
		} else {
			require.Equal(t, http.StatusTooManyRequests, response.Code)
		}
	}
}
