package middleware

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"xdfc-server/db"
	"xdfc-server/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var JwtSecret []byte

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
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authorization header"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		claims, err := ParseJWTClaims(parts[1])
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

		if err := db.DB.Select("id", "username", "role", "status", "employee_id").Where("id = ?", userID).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Account not found or inactive"})
			c.Abort()
			return
		}

		if !strings.EqualFold(strings.TrimSpace(user.Status), "active") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Account not found or inactive"})
			c.Abort()
			return
		}

		accessProfile := ResolveEffectiveAccessProfileForUser(user)
		contextRoleID := strings.TrimSpace(accessProfile.PrimaryRoleID)

		effectiveRoles := accessProfile.EffectiveRoles

		resolvedPermissions := accessProfile.Permissions

		c.Set("userId", user.ID)
		c.Set("username", user.Username)
		c.Set("role", contextRoleID)
		c.Set("effectiveRoles", effectiveRoles)
		c.Set("permissions", resolvedPermissions)
		c.Set("status", user.Status)

		c.Next()
	}
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
