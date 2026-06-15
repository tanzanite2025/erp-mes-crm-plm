package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
	"xdfc-server/authz"
	"xdfc-server/db"
	"xdfc-server/dependencies"
	"xdfc-server/middleware"
	"xdfc-server/services"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: isWebSocketOriginAllowed,
}

const (
	wsTicketRedisPrefix = "ws_ticket:"
	wsTicketTTL         = 60 * time.Second
)

// Client wraps one websocket client session.
type Client struct {
	Conn        *websocket.Conn
	Send        chan []byte
	UserID      string
	Username    string
	Permissions map[string]struct{}
}

// Hub manages active websocket clients.
type Hub struct {
	Clients    map[*Client]bool
	Broadcast  chan []byte
	Register   chan *Client
	Unregister chan *Client
	mu         sync.Mutex
}

var GlobalHub = &Hub{
	Clients:    make(map[*Client]bool),
	Broadcast:  make(chan []byte),
	Register:   make(chan *Client),
	Unregister: make(chan *Client),
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.Clients[client] = true
			online := len(h.Clients)
			h.mu.Unlock()
			log.Printf("[WS] client connected userId=%s online=%d", client.UserID, online)
		case client := <-h.Unregister:
			h.mu.Lock()
			if _, ok := h.Clients[client]; ok {
				delete(h.Clients, client)
				close(client.Send)
			}
			online := len(h.Clients)
			h.mu.Unlock()
			log.Printf("[WS] client disconnected userId=%s online=%d", client.UserID, online)
		case message := <-h.Broadcast:
			targetUser, ok := parseNotificationTargetUser(message)
			if !ok {
				log.Printf("[WS_WARN] dropped malformed notification payload")
				continue
			}

			h.mu.Lock()
			for client := range h.Clients {
				if !shouldDeliverNotification(client, targetUser) {
					continue
				}
				select {
				case client.Send <- message:
				default:
					close(client.Send)
					delete(h.Clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

// StartRedisSubscriber subscribes Redis notifications and forwards to websocket hub.
func StartRedisSubscriber() {
	pubsub := db.RDB.Subscribe(context.Background(), "xdfc_notifications")
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		GlobalHub.Broadcast <- []byte(msg.Payload)
	}
}

func (c *Client) ReadPump() {
	defer func() {
		GlobalHub.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(512)
	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WS_ERROR] read failed userId=%s err=%v", c.UserID, err)
			}
			break
		}
	}
}

func (c *Client) WritePump() {
	defer func() {
		c.Conn.Close()
	}()
	for message := range c.Send {
		if err := c.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
			break
		}
	}
}

type wsTicketClaims struct {
	UserID   string    `json:"userId"`
	Username string    `json:"username"`
	IssuedAt time.Time `json:"issuedAt"`
}

type wsTicketResponse struct {
	Ticket    string    `json:"ticket"`
	ExpiresAt time.Time `json:"expiresAt"`
}

func CreateWSTicketHandler(c *gin.Context) {
	userID := strings.TrimSpace(middleware.GetSafeUserID(c))
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authenticated user"})
		return
	}

	username := strings.TrimSpace(middleware.GetSafeUsername(c))
	ticket, err := generateRandomWSTicket(24)
	if err != nil {
		log.Printf("[WS_TICKET][ERROR] failed to generate ticket for userId=%s err=%v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create websocket ticket"})
		return
	}

	if db.RDB == nil {
		log.Printf("[WS_TICKET][ERROR] redis unavailable while creating ticket for userId=%s", userID)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Realtime ticket service unavailable"})
		return
	}

	now := time.Now().UTC()
	claimsBytes, err := json.Marshal(wsTicketClaims{
		UserID:   userID,
		Username: username,
		IssuedAt: now,
	})
	if err != nil {
		log.Printf("[WS_TICKET][ERROR] failed to marshal claims for userId=%s err=%v", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create websocket ticket"})
		return
	}

	if err := db.RDB.Set(c.Request.Context(), wsTicketRedisPrefix+ticket, claimsBytes, wsTicketTTL).Err(); err != nil {
		log.Printf("[WS_TICKET][ERROR] failed to persist ticket for userId=%s err=%v", userID, err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Realtime ticket service unavailable"})
		return
	}

	c.JSON(http.StatusOK, wsTicketResponse{
		Ticket:    ticket,
		ExpiresAt: now.Add(wsTicketTTL),
	})
}

// WSHandler handles websocket handshake and enforces JWT authentication.
func WSHandler(c *gin.Context) {
	userID, username, err := resolveWSIdentity(c)
	if err != nil {
		log.Printf("[WS_AUTH_FAIL] %v, RemoteAddr=%s", err, c.Request.RemoteAddr)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired websocket credentials"})
		return
	}

	accessSnapshot, err := dependencies.NewIdentityAccessServiceWithDB(db.DB).ResolveSnapshotByUserID(userID)
	if err != nil {
		log.Printf("[WS_AUTH_FAIL] Failed to resolve websocket access, userId=%s err=%v", userID, err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to resolve account access"})
		return
	}
	if username == "" {
		username = accessSnapshot.Username
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WS_ERROR] Upgrade failed, userId=%s origin=%s err=%v", userID, c.GetHeader("Origin"), err)
		return
	}

	client := &Client{Conn: conn, Send: make(chan []byte, 256), UserID: userID, Username: username, Permissions: buildPermissionSet(accessSnapshot.Permissions)}
	GlobalHub.Register <- client

	go client.WritePump()
	go client.ReadPump()
}

// NotifyTrigger publishes one business notification into Redis channel.
func NotifyTrigger(module, action, title, targetUser string, data interface{}) {
	_ = services.PublishNotification(module, action, title, targetUser, data)
}

// NotifyCacheInvalidate publishes cache invalidation event for clients.
func NotifyCacheInvalidate(module string) {
	_ = services.PublishCacheInvalidate(module)
}

func parseNotificationTargetUser(message []byte) (string, bool) {
	var envelope struct {
		TargetUser string `json:"targetUser"`
	}
	if err := json.Unmarshal(message, &envelope); err != nil {
		return "", false
	}
	return strings.TrimSpace(envelope.TargetUser), true
}

func shouldDeliverNotification(client *Client, targetUser string) bool {
	if targetUser == "" {
		return true
	}
	if permissionID, ok := parseNotificationPermissionTarget(targetUser); ok {
		return clientHasPermission(client, permissionID)
	}
	return targetUser == client.UserID
}

func notificationTargetPermission(permissionID string) string {
	return "permission:" + authz.NormalizePermissionID(permissionID)
}

func parseNotificationPermissionTarget(target string) (string, bool) {
	normalized := strings.TrimSpace(target)
	if !strings.HasPrefix(strings.ToLower(normalized), "permission:") {
		return "", false
	}
	permissionID := authz.NormalizePermissionID(strings.TrimSpace(normalized[len("permission:"):]))
	return permissionID, permissionID != ""
}

func buildPermissionSet(permissionIDs []string) map[string]struct{} {
	result := make(map[string]struct{}, len(permissionIDs))
	for _, permissionID := range permissionIDs {
		normalized := authz.NormalizePermissionID(permissionID)
		if normalized == "" {
			continue
		}
		result[normalized] = struct{}{}
	}
	return result
}

func clientHasPermission(client *Client, permissionID string) bool {
	if client == nil {
		return false
	}
	_, ok := client.Permissions[authz.NormalizePermissionID(permissionID)]
	return ok
}

func resolveWSIdentity(c *gin.Context) (string, string, error) {
	if ticket := strings.TrimSpace(c.Query("ticket")); ticket != "" {
		return consumeWSTicket(c, ticket)
	}

	authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
	if authHeader == "" {
		return "", "", errors.New("missing websocket credentials")
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
		claims, err := middleware.ParseJWTClaims(strings.TrimSpace(parts[1]))
		if err != nil {
			return "", "", errors.New("invalid or expired bearer token")
		}
		userID, username := extractWSIdentity(claims)
		if strings.TrimSpace(userID) == "" {
			return "", "", errors.New("missing websocket subject")
		}
		return userID, username, nil
	}

	return "", "", errors.New("invalid websocket authorization header")
}

func extractWSIdentity(claims jwt.MapClaims) (userID string, username string) {
	userID = middleware.ClaimString(claims, "sub")
	username = middleware.ClaimString(claims, "username")
	return userID, username
}

func consumeWSTicket(c *gin.Context, ticket string) (string, string, error) {
	if db.RDB == nil {
		return "", "", errors.New("realtime ticket service unavailable")
	}

	key := wsTicketRedisPrefix + strings.TrimSpace(ticket)
	claimsRaw, err := db.RDB.GetDel(c.Request.Context(), key).Bytes()
	if err != nil {
		return "", "", errors.New("invalid or expired websocket ticket")
	}

	var claims wsTicketClaims
	if err := json.Unmarshal(claimsRaw, &claims); err != nil {
		return "", "", errors.New("invalid websocket ticket payload")
	}

	userID := strings.TrimSpace(claims.UserID)
	if userID == "" {
		return "", "", errors.New("invalid websocket ticket subject")
	}

	return userID, strings.TrimSpace(claims.Username), nil
}

func generateRandomWSTicket(byteLen int) (string, error) {
	if byteLen <= 0 {
		byteLen = 24
	}

	buf := make([]byte, byteLen)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}

	return hex.EncodeToString(buf), nil
}

func isWebSocketOriginAllowed(r *http.Request) bool {
	origin := strings.TrimSpace(r.Header.Get("Origin"))
	if origin == "" {
		// Non-browser clients may not send Origin.
		return true
	}

	normalizedOrigin := strings.TrimRight(strings.ToLower(origin), "/")
	allowedOriginStr := strings.TrimSpace(os.Getenv("ALLOWED_ORIGIN"))
	if allowedOriginStr == "*" {
		return true
	}
	if allowedOriginStr != "" {
		for _, candidate := range strings.Split(allowedOriginStr, ",") {
			normalizedCandidate := strings.TrimRight(strings.ToLower(strings.TrimSpace(candidate)), "/")
			if normalizedCandidate != "" && (normalizedOrigin == normalizedCandidate || originsMatch(normalizedOrigin, normalizedCandidate)) {
				return true
			}
		}
	}

	// [PRODUCTION_CONNECTIVITY]
	// If ALLOWED_ORIGIN is not set or doesn't match above, we still allow
	// same-site connections where the request host matches the origin host.
	// We no longer strictly compare ports if behind a proxy that might change them.
	originURL, err := url.Parse(origin)
	if err != nil {
		return false
	}

	return strings.EqualFold(originURL.Hostname(), r.Host) || strings.EqualFold(originURL.Host, r.Host)
}

func originsMatch(origin, candidate string) bool {
	if origin == candidate {
		return true
	}

	originURL, err := url.Parse(origin)
	if err != nil {
		return false
	}
	candidateURL, err := url.Parse(candidate)
	if err != nil {
		return false
	}

	if !strings.EqualFold(originURL.Scheme, candidateURL.Scheme) {
		return false
	}

	if originURL.Port() != candidateURL.Port() {
		return false
	}

	return loopbackHostsEquivalent(originURL.Hostname(), candidateURL.Hostname())
}

func loopbackHostsEquivalent(left, right string) bool {
	normalizedLeft := strings.ToLower(strings.TrimSpace(left))
	normalizedRight := strings.ToLower(strings.TrimSpace(right))

	if normalizedLeft == normalizedRight {
		return true
	}

	return isLoopbackHost(normalizedLeft) && isLoopbackHost(normalizedRight)
}

func isLoopbackHost(host string) bool {
	switch strings.ToLower(strings.TrimSpace(host)) {
	case "localhost", "127.0.0.1", "::1":
		return true
	default:
		return false
	}
}
