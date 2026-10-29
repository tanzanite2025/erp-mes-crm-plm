package middleware

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

func TestAuthenticatedPasswordChangeIgnoresForgedForwardingFromUntrustedPeersAndSharesTheirIPLimit(t *testing.T) {
	previousMode, previousRedis := gin.Mode(), db.RDB
	t.Cleanup(func() { gin.SetMode(previousMode); db.RDB = previousRedis })
	gin.SetMode(gin.TestMode)
	t.Setenv("GIN_MODE", "test")
	db.RDB = nil
	router := gin.New()
	require.NoError(t, router.SetTrustedProxies([]string{"127.0.0.1"}))
	router.POST("/change-password", func(c *gin.Context) {
		c.Set("userId", c.GetHeader("X-Test-Account"))
	}, AuthenticatedUserPasswordChangeRateLimitMiddleware(), func(c *gin.Context) {
		c.String(http.StatusOK, c.ClientIP())
	})
	for index := 1; index <= 21; index++ {
		request := httptest.NewRequest(http.MethodPost, "/change-password", nil)
		request.RemoteAddr = "198.51.100.10:51234"
		request.Header.Set("X-Test-Account", fmt.Sprintf("untrusted-peer-account-%d", index))
		request.Header.Set("X-Forwarded-For", fmt.Sprintf("203.0.113.%d", index))
		request.Header.Set("X-Real-IP", fmt.Sprintf("203.0.113.%d", index))
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		if index <= 20 {
			require.Equal(t, http.StatusOK, response.Code)
			require.Equal(t, "198.51.100.10", response.Body.String())
		} else {
			require.Equal(t, http.StatusTooManyRequests, response.Code)
			require.Contains(t, response.Body.String(), "auth_password_change_rate_limited")
		}
	}
}

func TestAuthenticatedPasswordChangeTrustedProxyUsesNearestUntrustedHopAndSeparatesClientIPLimits(t *testing.T) {
	previousMode, previousRedis := gin.Mode(), db.RDB
	t.Cleanup(func() { gin.SetMode(previousMode); db.RDB = previousRedis })
	gin.SetMode(gin.TestMode)
	t.Setenv("GIN_MODE", "test")
	db.RDB = nil
	router := gin.New()
	require.NoError(t, router.SetTrustedProxies([]string{"127.0.0.1"}))
	router.POST("/change-password", func(c *gin.Context) {
		c.Set("userId", c.GetHeader("X-Test-Account"))
	}, AuthenticatedUserPasswordChangeRateLimitMiddleware(), func(c *gin.Context) {
		c.String(http.StatusOK, c.ClientIP())
	})
	for index := 1; index <= 21; index++ {
		request := httptest.NewRequest(http.MethodPost, "/change-password", nil)
		request.RemoteAddr = "127.0.0.1:51234"
		request.Header.Set("X-Test-Account", fmt.Sprintf("trusted-proxy-account-%d", index))
		clientIP := fmt.Sprintf("198.51.100.%d", index)
		// The leftmost entry may be supplied by a client; use the nearest untrusted hop.
		request.Header.Set("X-Forwarded-For", "203.0.113.250, "+clientIP)
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		require.Equal(t, http.StatusOK, response.Code)
		require.Equal(t, clientIP, response.Body.String())
	}
}
