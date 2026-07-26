package middleware

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
	"xdfc-server/db"
	"xdfc-server/models"
	access "xdfc-server/services/access"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var JwtSecret []byte

const authCookieName = "xdfc_access_token"

// InitJwt initializes JWT secret from environment.
func InitJwt() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("[CRITICAL_SECURITY] JWT_SECRET environment variable is missing")
	}
	JwtSecret = []byte(secret)
}

// ParseJWTClaims validates a JWT and returns map claims when valid.
func ParseJWTClaims(tokenString string) (jwt.MapClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Enforce HMAC signing method to prevent algorithm downgrade attacks.
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return JwtSecret, nil
	})
	if err != nil || !token.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, jwt.ErrTokenInvalidClaims
	}

	return claims, nil
}

// ClaimString returns a string representation for a claim key, or empty string when absent.
func ClaimString(claims jwt.MapClaims, key string) string {
	raw, ok := claims[key]
	if !ok || raw == nil {
		return ""
	}

	switch v := raw.(type) {
	case string:
		return strings.TrimSpace(v)
	default:
		return strings.TrimSpace(fmt.Sprintf("%v", v))
	}
}

// AuthMiddleware validates JWT bearer token from Authorization header.
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := readAccessToken(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			c.Abort()
			return
		}

		claims, err := ParseJWTClaims(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		userID := ClaimString(claims, "sub")
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		var user models.User
		if db.DB == nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication backend unavailable"})
			c.Abort()
			return
		}

		if err := db.DB.Select("id", "username", "status", "employee_id", "permission_preset_id").Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Account not found or inactive"})
			c.Abort()
			return
		}

		if !strings.EqualFold(strings.TrimSpace(user.Status), "active") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Account not found or inactive"})
			c.Abort()
			return
		}

		accessSnapshot, err := access.NewIdentityAccessServiceWithDB(db.DB).ResolveSnapshotForUser(user)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to resolve account access"})
			c.Abort()
			return
		}
		resolvedPermissions := accessSnapshot.Permissions

		c.Set("userId", user.ID)
		c.Set("username", user.Username)
		c.Set("permissions", resolvedPermissions)
		c.Set("status", user.Status)
		c.Set("accessSnapshot", accessSnapshot)

		c.Next()
	}
}

func readAccessToken(c *gin.Context) (string, error) {
	authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			return "", fmt.Errorf("Invalid authorization header format")
		}
		return strings.TrimSpace(parts[1]), nil
	}

	cookieToken, err := c.Cookie(authCookieName)
	if err != nil || strings.TrimSpace(cookieToken) == "" {
		return "", fmt.Errorf("Missing authorization header")
	}

	return strings.TrimSpace(cookieToken), nil
}

func SetAuthTokenCookie(c *gin.Context, token string) {
	secure := os.Getenv("GIN_MODE") == "release"
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		authCookieName,
		token,
		int((24 * time.Hour).Seconds()),
		"/",
		"",
		secure,
		true,
	)
}

func ClearAuthTokenCookie(c *gin.Context) {
	secure := os.Getenv("GIN_MODE") == "release"
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(authCookieName, "", -1, "/", "", secure, true)
}

// GetSafeUsername safely gets username from context.
func GetSafeUsername(c *gin.Context) string {
	username, ok := c.Get("username")
	if !ok {
		if os.Getenv("GIN_MODE") == "release" {
			log.Printf("[CRITICAL_SECURITY] Context username missing during authorized request from %s", c.ClientIP())
		}
		return "unknown"
	}

	str, ok := username.(string)
	if !ok {
		log.Printf("[ERROR] Context username type mismatch: expected string, got %T", username)
		return "unknown"
	}

	return str
}

// GetSafeUserID safely gets user id from context.
func GetSafeUserID(c *gin.Context) string {
	userID, ok := c.Get("userId")
	if !ok {
		if os.Getenv("GIN_MODE") == "release" {
			log.Printf("[CRITICAL_SECURITY] Context userID missing during authorized request from %s", c.ClientIP())
		}
		return ""
	}

	str, ok := userID.(string)
	if !ok {
		log.Printf("[ERROR] Context userID type mismatch: expected string, got %T", userID)
		return ""
	}

	return str
}

// GetSafeUsernamePtr returns a pointer to the safe username. Useful for pointer-based DTO fields.
func GetSafeUsernamePtr(c *gin.Context) *string {
	username := GetSafeUsername(c)
	return &username
}

// GetUserPermissions safely gets user permissions from context
func GetUserPermissions(c *gin.Context) []string {
	permissions, ok := c.Get("permissions")
	if !ok {
		return []string{}
	}

	// 处理不同类型的权限数据
	switch v := permissions.(type) {
	case []string:
		return v
	case string:
		// 如果是逗号分隔的字符串，分割它
		if v == "" {
			return []string{}
		}
		parts := strings.Split(v, ",")
		result := make([]string, 0, len(parts))
		for _, part := range parts {
			trimmed := strings.TrimSpace(part)
			if trimmed != "" {
				result = append(result, trimmed)
			}
		}
		return result
	case []interface{}:
		result := make([]string, 0, len(v))
		for _, item := range v {
			if str, ok := item.(string); ok {
				result = append(result, str)
			}
		}
		return result
	default:
		return []string{}
	}
}
