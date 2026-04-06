package handlers

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"xdfc-server/db"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: isWebSocketOriginAllowed,
}

// Client wraps one websocket client session.
type Client struct {
	Conn   *websocket.Conn
	Send   chan []byte
	UserID string
	Role   string
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

// WSHandler handles websocket handshake and enforces JWT authentication.
func WSHandler(c *gin.Context) {
	tokenString := extractWSToken(c)
	if tokenString == "" {
		log.Printf("[WS_AUTH_FAIL] Missing websocket token, RemoteAddr=%s", c.Request.RemoteAddr)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing websocket token"})
		return
	}

	claims, err := middleware.ParseJWTClaims(tokenString)
	if err != nil {
		log.Printf("[WS_AUTH_FAIL] Invalid or expired token for websocket, err=%v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
		return
	}

	userID, role := extractWSIdentity(claims)
	if userID == "" {
		log.Printf("[WS_AUTH_FAIL] Invalid websocket claims (missing sub), userId=%s role=%s", userID, role)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid websocket claims"})
		return
	}

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("[WS_ERROR] Upgrade failed, userId=%s origin=%s err=%v", userID, c.GetHeader("Origin"), err)
		return
	}

	client := &Client{Conn: conn, Send: make(chan []byte, 256), UserID: userID, Role: role}
	GlobalHub.Register <- client

	go client.WritePump()
	go client.ReadPump()
}

// NotifyTrigger publishes one business notification into Redis channel.
func NotifyTrigger(module, action, title, targetUser string, data interface{}) {
	msg := map[string]interface{}{
		"module":     module,
		"action":     action,
		"title":      title,
		"targetUser": targetUser,
		"payload":    data,
	}
	jsonBytes, _ := json.Marshal(msg)
	db.RDB.Publish(context.Background(), "xdfc_notifications", string(jsonBytes))
}

// NotifyCacheInvalidate publishes cache invalidation event for clients.
func NotifyCacheInvalidate(module string) {
	msg := map[string]interface{}{
		"type":   "CACHE_INVALIDATE",
		"module": module,
	}
	jsonBytes, _ := json.Marshal(msg)
	db.RDB.Publish(context.Background(), "xdfc_notifications", string(jsonBytes))
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
	if strings.EqualFold(targetUser, "admin") {
		return isAdminRole(client.Role)
	}
	return targetUser == client.UserID
}

func isAdminRole(role string) bool {
	normalized := strings.ToLower(strings.TrimSpace(role))
	if normalized == "" {
		return false
	}
	parts := strings.FieldsFunc(normalized, func(r rune) bool {
		switch r {
		case ',', ';', ' ', '[', ']', '\'', '"':
			return true
		default:
			return false
		}
	})
	for _, part := range parts {
		if part == "admin" {
			return true
		}
	}
	return false
}

func extractWSToken(c *gin.Context) string {
	if token := strings.TrimSpace(c.Query("token")); token != "" {
		return token
	}
	authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
	if authHeader == "" {
		return ""
	}
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
		return strings.TrimSpace(parts[1])
	}
	return ""
}

func extractWSIdentity(claims jwt.MapClaims) (userID string, role string) {
	userID = middleware.ClaimString(claims, "sub")
	role = middleware.ClaimString(claims, "role")
	return userID, role
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
