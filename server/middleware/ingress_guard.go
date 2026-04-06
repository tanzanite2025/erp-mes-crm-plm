package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func AlertWebhookIngressGuard() gin.HandlerFunc {
	sharedToken := strings.TrimSpace(os.Getenv("ALERT_WEBHOOK_TOKEN"))
	requireToken := strings.EqualFold(strings.TrimSpace(os.Getenv("GIN_MODE")), "release")

	return func(c *gin.Context) {
		if requireToken && sharedToken == "" {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": "alert webhook token is required in release mode"})
			c.Abort()
			return
		}

		if sharedToken != "" {
			if !isWebhookTokenValid(c.GetHeader("Authorization"), c.GetHeader("X-Alertmanager-Token"), sharedToken) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid alert webhook token"})
				c.Abort()
				return
			}
		}

		c.Next()
	}
}

func isWebhookTokenValid(authHeader, fallbackHeader, expectedToken string) bool {
	if strings.TrimSpace(fallbackHeader) == expectedToken {
		return true
	}

	authHeader = strings.TrimSpace(authHeader)
	if authHeader == "" {
		return false
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return false
	}
	return strings.TrimSpace(parts[1]) == expectedToken
}
