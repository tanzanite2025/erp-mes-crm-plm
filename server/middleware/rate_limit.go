package middleware

import (
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog/log"
)

// loginLimiter 绠€鍗曠殑鍐呭瓨绾ч檺娴佸櫒
type loginLimiter struct {
	mu            sync.Mutex
	ips           map[string][]time.Time
	maxRequests   int
	windowSeconds int
}

var globalLoginLimiter *loginLimiter
var once sync.Once

func getLoginLimiter() *loginLimiter {
	once.Do(func() {
		ginMode := os.Getenv("GIN_MODE")
		max := 5
		window := 300 // 5 鍒嗛挓闄愬埗 5 娆?
		if ginMode != "release" {
			max = 100
			window = 60 // Debug 妯″紡锛? 鍒嗛挓 100 娆★紝鍩烘湰涓嶅共鎵板紑鍙?
		}

		globalLoginLimiter = &loginLimiter{
			ips:           make(map[string][]time.Time),
			maxRequests:   max,
			windowSeconds: window,
		}
	})
	return globalLoginLimiter
}

// LoginRateLimitMiddleware 閽堝鐧诲綍鎺ュ彛鐨勯檺娴佷腑闂翠欢
func LoginRateLimitMiddleware() gin.HandlerFunc {
	limiter := getLoginLimiter()

	return func(c *gin.Context) {
		ip := c.ClientIP()
		requestID := c.GetString("requestId")

		limiter.mu.Lock()
		defer limiter.mu.Unlock()

		now := time.Now()
		windowStart := now.Add(time.Duration(-limiter.windowSeconds) * time.Second)

		// 娓呯悊杩囨湡璁板綍
		requests := limiter.ips[ip]
		var validRequests []time.Time
		for _, t := range requests {
			if t.After(windowStart) {
				validRequests = append(validRequests, t)
			}
		}

		if len(validRequests) >= limiter.maxRequests {
			retryAfterSeconds := limiter.windowSeconds
			if len(validRequests) > 0 {
				retryAt := validRequests[0].Add(time.Duration(limiter.windowSeconds) * time.Second)
				retryAfterSeconds = int(time.Until(retryAt).Seconds()) + 1
				if retryAfterSeconds < 1 {
					retryAfterSeconds = 1
				}
			}

			c.Header("Retry-After", strconv.Itoa(retryAfterSeconds))
			log.Warn().
				Str("request_id", requestID).
				Str("ip", ip).
				Str("path", c.FullPath()).
				Int("retry_after_seconds", retryAfterSeconds).
				Int("attempts_in_window", len(validRequests)).
				Msg("AUTH_LOGIN_RATE_LIMITED")

			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":             "Too many login attempts. Please retry later.",
				"code":              "auth_rate_limited",
				"retryAfterSeconds": retryAfterSeconds,
			})
			c.Abort()
			return
		}

		// 璁板綍鏈璇锋眰
		validRequests = append(validRequests, now)
		limiter.ips[ip] = validRequests
		c.Next()
	}
}
