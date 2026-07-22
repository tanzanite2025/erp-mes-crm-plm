package middleware

import (
	"net/http"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// AIProxyIngressGuard performs lightweight ingress checks before proxy handler.
func AIProxyIngressGuard() gin.HandlerFunc {
	maxBody := 256 * 1024
	if v := strings.TrimSpace(os.Getenv("AI_PROXY_MAX_BODY_BYTES")); v != "" {
		if b, err := strconv.Atoi(v); err == nil && b > 0 {
			maxBody = b
		}
	}

	return func(c *gin.Context) {
		if c.ContentType() != "application/json" {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":  "AI_PROXY_CONTENT_TYPE_INVALID",
				"error": "Content-Type must be application/json",
			})
			c.Abort()
			return
		}

		if c.Request.ContentLength > int64(maxBody) && c.Request.ContentLength != -1 {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"code":  "AI_PROXY_BODY_TOO_LARGE",
				"error": "Request body exceeds allowed size",
			})
			c.Abort()
			return
		}

		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, int64(maxBody))
		c.Next()
	}
}
