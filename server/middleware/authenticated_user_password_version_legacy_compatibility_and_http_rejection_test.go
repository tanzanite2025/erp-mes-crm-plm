package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func TestPasswordVersionJWTClaimsRejectsMalformedAndAcceptsLegacyCredentials(t *testing.T) {
	for _, value := range []any{nil, "0", float64(-1), float64(0.5), float64(9007199254740992), true, []any{0}} {
		_, err := PasswordVersionFromJWTClaims(jwt.MapClaims{"passwordVersion": value})
		require.ErrorIs(t, err, ErrAccountPasswordVersionInvalid)
	}
	version, err := PasswordVersionFromJWTClaims(jwt.MapClaims{})
	require.NoError(t, err)
	require.Zero(t, version)
	version, err = PasswordVersionFromJWTClaims(jwt.MapClaims{"passwordVersion": float64(3)})
	require.NoError(t, err)
	require.EqualValues(t, 3, version)
}

func TestAuthenticatedHTTPJWTRequiresAValidExpirationForSessionLifetimeEnforcement(t *testing.T) {
	previousSecret := JwtSecret
	JwtSecret = []byte("isolated-jwt-expiration-test-secret")
	t.Cleanup(func() { JwtSecret = previousSecret })
	for _, expiration := range []any{nil, "invalid", time.Now().Add(-time.Second).Unix()} {
		claims := jwt.MapClaims{"sub": "user-1"}
		if expiration != nil {
			claims["exp"] = expiration
		}
		token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(JwtSecret)
		require.NoError(t, err)
		_, err = ParseJWTClaims(token)
		require.Error(t, err)
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{"sub": "user-1", "exp": time.Now().Add(time.Hour).Unix()}).SignedString(JwtSecret)
	require.NoError(t, err)
	_, err = ParseJWTClaims(token)
	require.NoError(t, err)
}

func TestAuthenticatedHTTPRejectsLegacyAndVersionedCredentialsAfterPasswordChange(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	require.NoError(t, database.Exec(`CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT, status TEXT, employee_id TEXT, permission_preset_id TEXT, password_version INTEGER NOT NULL DEFAULT 0, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`CREATE TABLE user_permissions (id TEXT, user_id TEXT, permission_id TEXT, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO users (id, username, status) VALUES ('user-1','operator','active')`).Error)
	previousDatabase, previousSecret := db.DB, JwtSecret
	db.DB, JwtSecret = database, []byte("isolated-password-version-test-secret")
	t.Cleanup(func() { db.DB, JwtSecret = previousDatabase, previousSecret })
	router := gin.New()
	router.GET("/protected", AuthMiddleware(), func(c *gin.Context) { c.Status(http.StatusNoContent) })
	requestWithVersion := func(version any, cookie bool) int {
		claims := jwt.MapClaims{"sub": "user-1", "exp": time.Now().Add(time.Hour).Unix()}
		if version != nil {
			claims["passwordVersion"] = version
		}
		token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(JwtSecret)
		require.NoError(t, err)
		request := httptest.NewRequest(http.MethodGet, "/protected", nil)
		if cookie {
			request.AddCookie(&http.Cookie{Name: authCookieName, Value: token})
		} else {
			request.Header.Set("Authorization", "Bearer "+token)
		}
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		return response.Code
	}
	for _, cookie := range []bool{false, true} {
		require.Equal(t, http.StatusNoContent, requestWithVersion(nil, cookie))
		require.Equal(t, http.StatusNoContent, requestWithVersion(0, cookie))
	}
	require.NoError(t, database.Exec(`UPDATE users SET password_version = 1`).Error)
	for _, cookie := range []bool{false, true} {
		require.Equal(t, http.StatusUnauthorized, requestWithVersion(nil, cookie))
		require.Equal(t, http.StatusUnauthorized, requestWithVersion(0, cookie))
		require.Equal(t, http.StatusNoContent, requestWithVersion(1, cookie))
		require.Equal(t, http.StatusUnauthorized, requestWithVersion("1", cookie))
	}
}
