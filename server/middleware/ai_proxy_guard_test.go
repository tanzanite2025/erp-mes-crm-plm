package middleware

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestAIProxyIngressGuardAppliesStreamingBodyLimit(t *testing.T) {
	t.Setenv("AI_PROXY_MAX_BODY_BYTES", "5")
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.POST("/ai/proxy", AIProxyIngressGuard(), func(c *gin.Context) {
		if _, err := io.ReadAll(c.Request.Body); err != nil {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{
				"code": "AI_PROXY_BODY_TOO_LARGE",
			})
			return
		}
		c.Status(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodPost, "/ai/proxy", bytes.NewBufferString("123456"))
	req.Header.Set("Content-Type", "application/json")
	req.ContentLength = -1
	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("expected 413, got %d", recorder.Code)
	}
}
