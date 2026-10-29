package middleware

import (
	"context"
	"net/http"
	"os"
	"sync"
	"time"
	"xdfc-server/db"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// Both counters share a Redis hash tag so the atomic check also works with Redis Cluster.
var authenticatedPasswordChangeRateLimitScript = redis.NewScript(`
local accountCount = tonumber(redis.call('GET', KEYS[1]) or '0')
local ipCount = tonumber(redis.call('GET', KEYS[2]) or '0')
if accountCount >= 5 or ipCount >= 20 then return 0 end
for _, key in ipairs(KEYS) do
  if redis.call('INCR', key) == 1 then redis.call('EXPIRE', key, 300) end
end
return 1
`)

type passwordChangeRateLimitWindow struct {
	count     int
	expiresAt time.Time
}

func AuthenticatedUserPasswordChangeRateLimitMiddleware() gin.HandlerFunc {
	var mutex sync.Mutex
	windows := map[string]passwordChangeRateLimitWindow{}
	nextCleanup := time.Now().Add(5 * time.Minute)
	return func(c *gin.Context) {
		keys := []string{"auth:{password-change}:account:" + GetSafeUserID(c), "auth:{password-change}:ip:" + c.ClientIP()}
		allowed := false
		if db.RDB != nil {
			// A slow Redis must not consume the entire password-change request budget.
			limitContext, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
			result, err := authenticatedPasswordChangeRateLimitScript.Run(limitContext, db.RDB.WithTimeout(time.Second), keys).Int()
			cancel()
			if err != nil {
				c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "Password change rate limiting unavailable", "code": "auth_password_change_unavailable"})
				return
			}
			allowed = result == 1
		} else if gin.Mode() == gin.ReleaseMode || os.Getenv("GIN_MODE") == "release" {
			c.AbortWithStatusJSON(http.StatusServiceUnavailable, gin.H{"error": "Password change rate limiting unavailable", "code": "auth_password_change_unavailable"})
			return
		} else {
			// Development without Redis uses the same limits in process memory.
			now := time.Now()
			mutex.Lock()
			if now.After(nextCleanup) {
				for key, window := range windows {
					if !now.Before(window.expiresAt) {
						delete(windows, key)
					}
				}
				nextCleanup = now.Add(5 * time.Minute)
			}
			allowed = true
			for index, key := range keys {
				window := windows[key]
				if !now.Before(window.expiresAt) {
					window = passwordChangeRateLimitWindow{expiresAt: now.Add(5 * time.Minute)}
				}
				limit := []int{5, 20}[index]
				if window.count >= limit {
					allowed = false
				}
				windows[key] = window
			}
			if allowed {
				for _, key := range keys {
					window := windows[key]
					window.count++
					windows[key] = window
				}
			}
			mutex.Unlock()
		}
		if !allowed {
			c.Header("Retry-After", "300")
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "Too many password change attempts; please retry later", "code": "auth_password_change_rate_limited"})
			return
		}
		c.Next()
	}
}
