package middleware

import (
	"net"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
)

func createPasswordChangeRateLimitFailureTestRouter() *gin.Engine {
	router := gin.New()
	router.POST("/change-password", func(c *gin.Context) { c.Set("userId", "rate-limit-test-account") }, AuthenticatedUserPasswordChangeRateLimitMiddleware(), func(c *gin.Context) { c.Status(http.StatusNoContent) })
	return router
}

func TestAuthenticatedPasswordChangeRejectsMissingRedisInActualReleaseModeWithUnsetEnvironment(t *testing.T) {
	previousMode, previousRedis := gin.Mode(), db.RDB
	t.Cleanup(func() { gin.SetMode(previousMode); db.RDB = previousRedis })
	t.Setenv("GIN_MODE", "")
	gin.SetMode(gin.ReleaseMode)
	db.RDB = nil
	response := httptest.NewRecorder()
	createPasswordChangeRateLimitFailureTestRouter().ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/change-password", nil))
	require.Equal(t, http.StatusServiceUnavailable, response.Code)
	require.Contains(t, response.Body.String(), "auth_password_change_unavailable")
}

func TestAuthenticatedPasswordChangeRejectsUnresponsiveRedisWithinBoundedTime(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	t.Cleanup(func() { _ = listener.Close() })
	connections := make(chan net.Conn, 8)
	acceptLoopFinished := make(chan struct{})
	go func() {
		defer close(acceptLoopFinished)
		for {
			connection, err := listener.Accept()
			if err != nil {
				return
			}
			connections <- connection
		}
	}()
	t.Cleanup(func() {
		_ = listener.Close()
		<-acceptLoopFinished
		close(connections)
		for connection := range connections {
			_ = connection.Close()
		}
	})
	client := redis.NewClient(&redis.Options{Addr: listener.Addr().String(), ReadTimeout: 30 * time.Second, WriteTimeout: 30 * time.Second})
	t.Cleanup(func() { _ = client.Close() })
	previousRedis := db.RDB
	db.RDB = client
	t.Cleanup(func() { db.RDB = previousRedis })
	response := httptest.NewRecorder()
	startedAt := time.Now()
	createPasswordChangeRateLimitFailureTestRouter().ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/change-password", nil))
	require.Less(t, time.Since(startedAt), 4*time.Second)
	require.Equal(t, http.StatusServiceUnavailable, response.Code)
	require.Contains(t, response.Body.String(), "auth_password_change_unavailable")
}
