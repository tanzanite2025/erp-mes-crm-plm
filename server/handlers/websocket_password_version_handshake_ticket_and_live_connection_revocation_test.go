package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
	"xdfc-server/db"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openWebsocketPasswordVersionRevocationTestDatabase(t *testing.T) *gorm.DB {
	t.Helper()
	database, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	connection, err := database.DB()
	require.NoError(t, err)
	connection.SetMaxOpenConns(1)
	t.Cleanup(func() { require.NoError(t, connection.Close()) })
	require.NoError(t, database.Exec(`CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT, status TEXT, password_version INTEGER NOT NULL DEFAULT 0, deleted_at DATETIME)`).Error)
	require.NoError(t, database.Exec(`INSERT INTO users (id,username,status) VALUES ('ws-account','operator','active')`).Error)
	previousDatabase, previousSecret := db.DB, middleware.JwtSecret
	db.DB, middleware.JwtSecret = database, []byte("isolated-websocket-password-version-test-secret")
	t.Cleanup(func() { db.DB, middleware.JwtSecret = previousDatabase, previousSecret })
	return database
}

func TestWebsocketHandshakeRejectsOldBearerCredentialsAfterPasswordVersionChanges(t *testing.T) {
	database := openWebsocketPasswordVersionRevocationTestDatabase(t)
	require.NoError(t, database.Exec(`UPDATE users SET password_version = 1`).Error)
	router := gin.New()
	router.GET("/ws", WSHandler)
	for _, version := range []any{nil, 0, "1", -1} {
		claims := jwt.MapClaims{"sub": "ws-account", "exp": time.Now().Add(time.Hour).Unix()}
		if version != nil {
			claims["passwordVersion"] = version
		}
		token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(middleware.JwtSecret)
		require.NoError(t, err)
		request := httptest.NewRequest(http.MethodGet, "/ws", nil)
		request.Header.Set("Authorization", "Bearer "+token)
		response := httptest.NewRecorder()
		router.ServeHTTP(response, request)
		require.Equal(t, http.StatusUnauthorized, response.Code)
	}
}

func TestWebsocketSingleUseRedisTicketRetainsIssuingPasswordVersion(t *testing.T) {
	address := os.Getenv("PASSWORD_CHANGE_TEST_REDIS_ADDR")
	if address == "" {
		t.Skip("set PASSWORD_CHANGE_TEST_REDIS_ADDR to verify websocket Redis ticket invalidation")
	}
	database := openWebsocketPasswordVersionRevocationTestDatabase(t)
	client := redis.NewClient(&redis.Options{Addr: address})
	t.Cleanup(func() { require.NoError(t, client.Close()) })
	previousRedis := db.RDB
	db.RDB = client
	t.Cleanup(func() { db.RDB = previousRedis })
	response := httptest.NewRecorder()
	ginContext, _ := gin.CreateTestContext(response)
	ginContext.Request = httptest.NewRequest(http.MethodPost, "/ticket", nil)
	ginContext.Set("userId", "ws-account")
	ginContext.Set("username", "operator")
	ginContext.Set("passwordVersion", int64(0))
	credentialExpiration := time.Now().Add(30 * time.Second).UTC()
	ginContext.Set("credentialExpiresAt", credentialExpiration)
	CreateWSTicketHandler(ginContext)
	require.Equal(t, http.StatusOK, response.Code)
	var ticket wsTicketResponse
	require.NoError(t, json.Unmarshal(response.Body.Bytes(), &ticket))
	require.WithinDuration(t, credentialExpiration, ticket.ExpiresAt, time.Millisecond)
	stored, err := client.Get(context.Background(), wsTicketRedisPrefix+ticket.Ticket).Result()
	require.NoError(t, err)
	require.Contains(t, stored, `"passwordVersion":0`)
	require.NoError(t, database.Exec(`UPDATE users SET password_version = 1`).Error)
	router := gin.New()
	router.GET("/ws", WSHandler)
	request := httptest.NewRequest(http.MethodGet, "/ws?ticket="+ticket.Ticket, nil)
	response = httptest.NewRecorder()
	router.ServeHTTP(response, request)
	require.Equal(t, http.StatusUnauthorized, response.Code)
	require.Contains(t, response.Body.String(), "auth_password_version_expired")
	exists, err := client.Exists(context.Background(), wsTicketRedisPrefix+ticket.Ticket).Result()
	require.NoError(t, err)
	require.Zero(t, exists, "tickets remain single-use even when credentials expire")
}

func TestWebsocketLiveConnectionRejectsMessagesAndClosesIdleConnectionAfterPasswordChange(t *testing.T) {
	for _, idle := range []bool{false, true} {
		t.Run(map[bool]string{false: "before_next_message", true: "idle_periodic_validation"}[idle], func(t *testing.T) {
			database := openWebsocketPasswordVersionRevocationTestDatabase(t)
			clients := make(chan *Client, 1)
			done := make(chan struct{})
			server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
				connection, err := upgrader.Upgrade(writer, request, nil)
				if err != nil {
					return
				}
				client := &Client{Conn: connection, UserID: "ws-account", PasswordVersion: 0, CredentialsExpireAt: time.Now().Add(time.Hour), Send: make(chan []byte, 2)}
				clients <- client
				interval := time.Hour
				if idle {
					interval = 20 * time.Millisecond
				}
				client.writeMessagesWhileAccountPasswordVersionRemainsValid(interval)
				close(done)
			}))
			defer server.Close()
			connection, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http"), nil)
			require.NoError(t, err)
			defer connection.Close()
			client := <-clients
			defer close(client.Send)
			require.NoError(t, connection.SetReadDeadline(time.Now().Add(3*time.Second)))
			client.Send <- []byte("before-password-change")
			_, message, err := connection.ReadMessage()
			require.NoError(t, err)
			require.Equal(t, "before-password-change", string(message))
			require.NoError(t, database.Exec(`UPDATE users SET password_version = 1`).Error)
			if !idle {
				client.Send <- []byte("must-not-be-delivered")
			}
			_, _, err = connection.ReadMessage()
			require.True(t, websocket.IsCloseError(err, websocket.ClosePolicyViolation), "expected policy close, received %v", err)
			select {
			case <-done:
			case <-time.After(3 * time.Second):
				t.Fatal("expired websocket sender did not finish")
			}
		})
	}
}

func TestWebsocketIdleConnectionClosesWhenOriginalLoginCredentialsExpire(t *testing.T) {
	openWebsocketPasswordVersionRevocationTestDatabase(t)
	done := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		connection, err := upgrader.Upgrade(writer, request, nil)
		if err != nil {
			return
		}
		client := &Client{Conn: connection, UserID: "ws-account", CredentialsExpireAt: time.Now().Add(100 * time.Millisecond), Send: make(chan []byte)}
		// The credential expiry timer must work independently of the 15s version poll.
		client.writeMessagesWhileAccountPasswordVersionRemainsValid(time.Hour)
		close(done)
	}))
	defer server.Close()
	connection, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http"), nil)
	require.NoError(t, err)
	defer connection.Close()
	require.NoError(t, connection.SetReadDeadline(time.Now().Add(3*time.Second)))
	_, _, err = connection.ReadMessage()
	require.True(t, websocket.IsCloseError(err, websocket.ClosePolicyViolation), "expected expiry close, received %v", err)
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("expired websocket sender did not stop")
	}
}

func TestWebsocketRedisTicketCannotOutliveTheIssuingLoginCredentials(t *testing.T) {
	address := os.Getenv("PASSWORD_CHANGE_TEST_REDIS_ADDR")
	if address == "" {
		t.Skip("set PASSWORD_CHANGE_TEST_REDIS_ADDR to verify expired websocket tickets")
	}
	client := redis.NewClient(&redis.Options{Addr: address})
	t.Cleanup(func() { _ = client.Close() })
	previousRedis := db.RDB
	db.RDB = client
	t.Cleanup(func() { db.RDB = previousRedis })
	for _, expiration := range []time.Time{time.Time{}, time.Now().Add(-time.Second)} {
		ticket := "expired-credential-ticket-" + time.Now().Format("150405.000000000")
		payload, err := json.Marshal(wsTicketClaims{UserID: "ws-account", CredentialsExpireAt: expiration})
		require.NoError(t, err)
		require.NoError(t, client.Set(context.Background(), wsTicketRedisPrefix+ticket, payload, time.Minute).Err())
		ginContext, _ := gin.CreateTestContext(httptest.NewRecorder())
		ginContext.Request = httptest.NewRequest(http.MethodGet, "/ws", nil)
		_, _, _, _, err = consumeWSTicket(ginContext, ticket)
		require.Error(t, err)
		require.Zero(t, client.Exists(context.Background(), wsTicketRedisPrefix+ticket).Val())
	}
}
