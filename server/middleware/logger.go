package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func generateRequestID() string {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return time.Now().UTC().Format("20060102150405.000000000")
	}

	return hex.EncodeToString(buf)
}

// Logger 缁撴瀯鍖栨棩蹇椾腑闂翠欢
// 鑳屾櫙锛氱鍚?2026/Cloud Native 鏍囧噯锛岃緭鍑?JSON 鏍煎紡锛屼究浜?Loki 澶勭悊
func Logger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = generateRequestID()
		}

		c.Set("requestId", requestID)
		c.Writer.Header().Set("X-Request-ID", requestID)

		// 澶勭悊璇锋眰
		c.Next()

		// 璁板綍缁撴潫
		end := time.Now()
		latency := end.Sub(start)

		if len(c.Errors) > 0 {
			for _, e := range c.Errors.Errors() {
				log.Error().
					Str("request_id", requestID).
					Str("path", path).
					Msg(e)
			}
		} else {
			var event *zerolog.Event
			status := c.Writer.Status()

			// 鏍规嵁鐘舵€佺爜鍖哄垎棰滆壊绾у埆
			if status >= 500 {
				event = log.Error()
			} else if status >= 400 {
				event = log.Warn()
			} else {
				event = log.Info()
			}

			event.
				Str("request_id", requestID).
				Int("status", status).
				Str("method", c.Request.Method).
				Str("path", path).
				Str("query", query).
				Str("ip", c.ClientIP()).
				Str("origin", c.GetHeader("Origin")).
				Str("referer", c.Request.Referer()).
				Dur("latency", latency).
				Str("user_agent", c.Request.UserAgent()).
				Msg("HTTP_ACCESS")
		}
	}
}
