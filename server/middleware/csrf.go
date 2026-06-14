package middleware

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

const (
	csrfTokenLength = 32
	csrfCookieName  = "csrf_token"
	csrfHeaderName  = "X-CSRF-Token"
)

// generateCSRFToken 生成随机 CSRF Token
func generateCSRFToken() (string, error) {
	bytes := make([]byte, csrfTokenLength)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}

// CSRFProtection CSRF 保护中间件
func CSRFProtection() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 跳过 GET, HEAD, OPTIONS 请求
		if c.Request.Method == "GET" || c.Request.Method == "HEAD" || c.Request.Method == "OPTIONS" {
			c.Next()
			return
		}

		// 从 Cookie 获取 Token
		cookieToken, err := c.Cookie(csrfCookieName)
		if err != nil || cookieToken == "" {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "[CSRF] CSRF token 缺失",
			})
			c.Abort()
			return
		}

		// 从请求头获取 Token
		headerToken := c.GetHeader(csrfHeaderName)
		if headerToken == "" {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "[CSRF] CSRF token 缺失",
			})
			c.Abort()
			return
		}

		// 验证 Token 是否一致
		if cookieToken != headerToken {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "[CSRF] CSRF token 验证失败",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// SetCSRFToken 设置 CSRF Token (在登录或首次访问时调用)
func SetCSRFToken(c *gin.Context) error {
	token, err := generateCSRFToken()
	if err != nil {
		return err
	}

	secure := os.Getenv("GIN_MODE") == "release"
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(
		csrfCookieName,
		token,
		3600*24, // 24小时
		"/",
		"",
		secure, // 生产环境使用 HTTPS
		false,  // 前端需要读取后写入 X-CSRF-Token
	)

	// 同时在响应头中返回 Token (方便前端读取)
	c.Header("X-CSRF-Token", token)

	return nil
}
