# P1 优先级任务实施指南

**创建时间**: 2026-05-20  
**优先级**: P1 (近期修复)  
**预计工作量**: 16-20 小时

---

## 📋 任务清单

| 任务 | 优先级 | 工作量 | 依赖 | 状态 |
|------|--------|--------|------|------|
| 1. 添加 Rate Limiting | P1 | 3-4h | 无 | ✅ 已完成 |
| 2. 添加 CSRF 保护 | P1 | 3-4h | 无 | ✅ 已完成 |
| 3. 补充 API 文档 | P1 | 4-6h | 无 | ⏳ 待开始 |
| 4. 优化搜索性能 | P1 | 6-8h | 无 | ⏳ 待开始 |

---

## 🎯 任务 1: 添加 Rate Limiting

### 目标
防止暴力攻击和 DoS 攻击,限制每个 IP 的请求频率。

### 技术方案

#### 方案选择
使用 **基于内存的 Token Bucket 算法** + **Redis 存储** (可选)

**优点**:
- 简单高效
- 支持突发流量
- 易于实现和维护

**缺点**:
- 单机部署时重启会丢失计数
- 多实例部署需要 Redis 共享状态

#### 实施步骤

##### Step 1: 创建 Rate Limiter 中间件 (1h)

**文件**: `server/middleware/rate_limiter.go`

```go
package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

// RateLimiter 基于 IP 的限流器
type RateLimiter struct {
	visitors map[string]*rate.Limiter
	mu       sync.RWMutex
	rate     rate.Limit
	burst    int
}

// NewRateLimiter 创建限流器
// r: 每秒允许的请求数
// b: 突发请求数
func NewRateLimiter(r rate.Limit, b int) *RateLimiter {
	return &RateLimiter{
		visitors: make(map[string]*rate.Limiter),
		rate:     r,
		burst:    b,
	}
}


// getVisitor 获取或创建访问者的限流器
func (rl *RateLimiter) getVisitor(ip string) *rate.Limiter {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	limiter, exists := rl.visitors[ip]
	if !exists {
		limiter = rate.NewLimiter(rl.rate, rl.burst)
		rl.visitors[ip] = limiter
	}

	return limiter
}

// Middleware 限流中间件
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		limiter := rl.getVisitor(ip)

		if !limiter.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "[RATE_LIMIT] 请求过于频繁,请稍后重试",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// CleanupVisitors 定期清理不活跃的访问者 (防止内存泄漏)
func (rl *RateLimiter) CleanupVisitors(interval time.Duration) {
	ticker := time.NewTicker(interval)
	go func() {
		for range ticker.C {
			rl.mu.Lock()
			// 清空所有访问者 (简单实现)
			// 生产环境可以记录最后访问时间,只清理不活跃的
			rl.visitors = make(map[string]*rate.Limiter)
			rl.mu.Unlock()
		}
	}()
}
```

##### Step 2: 在路由中应用限流 (0.5h)

**文件**: `server/routes/routes.go`

```go
package routes

import (
	"xdfc-server/handlers"
	"xdfc-server/middleware"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

func SetupRoutes(r *gin.Engine) {
	// 创建全局限流器: 每秒 10 个请求, 突发 20 个
	globalLimiter := middleware.NewRateLimiter(rate.Limit(10), 20)
	globalLimiter.CleanupVisitors(5 * time.Minute)

	// 创建写操作限流器: 每秒 2 个请求, 突发 5 个
	writeLimiter := middleware.NewRateLimiter(rate.Limit(2), 5)
	writeLimiter.CleanupVisitors(5 * time.Minute)

	// 应用全局限流
	r.Use(globalLimiter.Middleware())

	api := r.Group("/api/v1")
	{
		// 读操作 (使用全局限流)
		api.GET("/maintenance-records", handlers.GetMaintenanceRecordsHandler)
		api.GET("/maintenance-records/stats", handlers.GetMaintenanceRecordStatsHandler)
		api.GET("/maintenance-records/:id", handlers.GetMaintenanceRecordHandler)

		// 写操作 (使用更严格的限流)
		api.POST("/maintenance-records", writeLimiter.Middleware(), handlers.CreateMaintenanceRecordHandler)
		api.PATCH("/maintenance-records/:id", writeLimiter.Middleware(), handlers.PatchMaintenanceRecordHandler)
		api.DELETE("/maintenance-records/:id", writeLimiter.Middleware(), handlers.DeleteMaintenanceRecordHandler)
	}
}
```


##### Step 3: 添加配置支持 (0.5h)

**文件**: `server/.env.dev`

```env
# Rate Limiting 配置
RATE_LIMIT_GLOBAL_RPS=10      # 全局每秒请求数
RATE_LIMIT_GLOBAL_BURST=20    # 全局突发请求数
RATE_LIMIT_WRITE_RPS=2        # 写操作每秒请求数
RATE_LIMIT_WRITE_BURST=5      # 写操作突发请求数
```

**文件**: `server/routes/routes.go` (更新)

```go
import (
	"os"
	"strconv"
)

func getRateLimitConfig(key string, defaultValue int) int {
	if val := os.Getenv(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func SetupRoutes(r *gin.Engine) {
	// 从环境变量读取配置
	globalRPS := getRateLimitConfig("RATE_LIMIT_GLOBAL_RPS", 10)
	globalBurst := getRateLimitConfig("RATE_LIMIT_GLOBAL_BURST", 20)
	writeRPS := getRateLimitConfig("RATE_LIMIT_WRITE_RPS", 2)
	writeBurst := getRateLimitConfig("RATE_LIMIT_WRITE_BURST", 5)

	globalLimiter := middleware.NewRateLimiter(rate.Limit(globalRPS), globalBurst)
	writeLimiter := middleware.NewRateLimiter(rate.Limit(writeRPS), writeBurst)
	
	// ... 其余代码
}
```

##### Step 4: 添加测试 (1h)

**文件**: `server/middleware/rate_limiter_test.go`

```go
package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"golang.org/x/time/rate"
)

func TestRateLimiter(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("允许正常请求", func(t *testing.T) {
		limiter := NewRateLimiter(rate.Limit(10), 20)
		router := gin.New()
		router.Use(limiter.Middleware())
		router.GET("/test", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		req := httptest.NewRequest("GET", "/test", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, 200, w.Code)
	})

	t.Run("限制超频请求", func(t *testing.T) {
		limiter := NewRateLimiter(rate.Limit(1), 2) // 每秒1个,突发2个
		router := gin.New()
		router.Use(limiter.Middleware())
		router.GET("/test", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		// 前3个请求应该成功 (突发2个 + 1个正常)
		for i := 0; i < 3; i++ {
			req := httptest.NewRequest("GET", "/test", nil)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)
			assert.Equal(t, 200, w.Code, "请求 %d 应该成功", i+1)
		}

		// 第4个请求应该被限流
		req := httptest.NewRequest("GET", "/test", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, 429, w.Code, "第4个请求应该被限流")
	})

	t.Run("不同IP独立限流", func(t *testing.T) {
		limiter := NewRateLimiter(rate.Limit(1), 1)
		router := gin.New()
		router.Use(limiter.Middleware())
		router.GET("/test", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		// IP1 的第1个请求
		req1 := httptest.NewRequest("GET", "/test", nil)
		req1.RemoteAddr = "192.168.1.1:1234"
		w1 := httptest.NewRecorder()
		router.ServeHTTP(w1, req1)
		assert.Equal(t, 200, w1.Code)

		// IP2 的第1个请求 (应该成功,因为是不同IP)
		req2 := httptest.NewRequest("GET", "/test", nil)
		req2.RemoteAddr = "192.168.1.2:1234"
		w2 := httptest.NewRecorder()
		router.ServeHTTP(w2, req2)
		assert.Equal(t, 200, w2.Code)
	})
}
```


##### Step 5: 前端错误处理 (0.5h)

**文件**: `src/lib/api-client.ts` (更新)

```typescript
// 在 apiFetch 中添加 429 错误处理
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(endpoint, options)
    
    if (response.status === 429) {
      // Rate limit 错误
      toast.error('请求过于频繁,请稍后重试')
      throw new ApiError('RATE_LIMIT', '请求过于频繁', 429)
    }
    
    // ... 其他错误处理
  } catch (error) {
    // ... 错误处理
  }
}
```

### 验证测试

#### 手动测试
```bash
# 测试全局限流 (每秒10个请求)
for i in {1..15}; do
  curl http://localhost:8080/api/v1/maintenance-records
  echo "Request $i"
done

# 测试写操作限流 (每秒2个请求)
for i in {1..5}; do
  curl -X POST http://localhost:8080/api/v1/maintenance-records \
    -H "Content-Type: application/json" \
    -d '{"title":"test","type":"PREVENTIVE","assetType":"MOLD"}'
  echo "Request $i"
done
```

#### 自动化测试
```bash
cd server
go test ./middleware -run TestRateLimiter -v
```

### 预期结果
- ✅ 超过限制的请求返回 429 状态码
- ✅ 错误消息: `[RATE_LIMIT] 请求过于频繁,请稍后重试`
- ✅ 不同 IP 独立计数
- ✅ 前端显示友好的错误提示

### 注意事项
1. **生产环境**: 建议使用 Redis 存储限流状态,支持多实例部署
2. **白名单**: 可以为内部 IP 或管理员 IP 设置白名单
3. **监控**: 记录被限流的请求,用于分析攻击模式
4. **动态调整**: 可以根据服务器负载动态调整限流参数

---

## 🎯 任务 2: 添加 CSRF 保护

### 目标
防止跨站请求伪造攻击,确保请求来自合法的前端页面。

### 技术方案

#### 方案选择
使用 **Double Submit Cookie** 模式

**工作原理**:
1. 服务器生成 CSRF Token,存储在 Cookie 中
2. 前端从 Cookie 读取 Token,在请求头中发送
3. 服务器验证 Cookie 中的 Token 和请求头中的 Token 是否一致

**优点**:
- 无需服务器端存储
- 实现简单
- 支持多实例部署


#### 实施步骤

##### Step 1: 创建 CSRF 中间件 (1.5h)

**文件**: `server/middleware/csrf.go`

```go
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

	// 设置 Cookie
	secure := os.Getenv("GIN_MODE") == "release"
	c.SetCookie(
		csrfCookieName,
		token,
		3600*24,      // 24小时
		"/",
		"",
		secure,       // 生产环境使用 HTTPS
		true,         // HttpOnly
	)

	// 同时在响应头中返回 Token (方便前端读取)
	c.Header("X-CSRF-Token", token)

	return nil
}
```

##### Step 2: 在路由中应用 CSRF 保护 (0.5h)

**文件**: `server/routes/routes.go` (更新)

```go
func SetupRoutes(r *gin.Engine) {
	// ... Rate Limiting 配置

	// 获取 CSRF Token 的端点 (不需要认证)
	r.GET("/api/v1/csrf-token", func(c *gin.Context) {
		if err := middleware.SetCSRFToken(c); err != nil {
			c.JSON(500, gin.H{"error": "生成 CSRF Token 失败"})
			return
		}
		c.JSON(200, gin.H{"status": "ok"})
	})

	api := r.Group("/api/v1")
	{
		// 应用 CSRF 保护到所有写操作
		api.Use(middleware.CSRFProtection())

		// 读操作 (不需要 CSRF 保护)
		api.GET("/maintenance-records", handlers.GetMaintenanceRecordsHandler)
		api.GET("/maintenance-records/stats", handlers.GetMaintenanceRecordStatsHandler)
		api.GET("/maintenance-records/:id", handlers.GetMaintenanceRecordHandler)

		// 写操作 (需要 CSRF 保护)
		api.POST("/maintenance-records", writeLimiter.Middleware(), handlers.CreateMaintenanceRecordHandler)
		api.PATCH("/maintenance-records/:id", writeLimiter.Middleware(), handlers.PatchMaintenanceRecordHandler)
		api.DELETE("/maintenance-records/:id", writeLimiter.Middleware(), handlers.DeleteMaintenanceRecordHandler)
	}
}
```


##### Step 3: 前端集成 (1h)

**文件**: `src/lib/api-client.ts` (更新)

```typescript
// 获取 CSRF Token
async function getCSRFToken(): Promise<string> {
  // 先尝试从 Cookie 读取
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf_token') {
      return value
    }
  }

  // 如果 Cookie 中没有,从服务器获取
  const response = await fetch('/api/v1/csrf-token', {
    credentials: 'include',
  })
  
  if (!response.ok) {
    throw new Error('获取 CSRF Token 失败')
  }

  // 从响应头读取 Token
  const token = response.headers.get('X-CSRF-Token')
  if (!token) {
    throw new Error('CSRF Token 缺失')
  }

  return token
}

// 更新 apiFetch 函数
export async function apiFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  // 对于写操作,添加 CSRF Token
  const method = options?.method?.toUpperCase() || 'GET'
  const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  }

  if (needsCSRF) {
    const csrfToken = await getCSRFToken()
    headers['X-CSRF-Token'] = csrfToken
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include', // 发送 Cookie
  })

  if (response.status === 403) {
    const data = await response.json()
    if (data.error?.includes('CSRF')) {
      // CSRF 验证失败,清除 Token 并重试
      document.cookie = 'csrf_token=; Max-Age=0'
      toast.error('安全验证失败,请刷新页面重试')
      throw new ApiError('CSRF_ERROR', 'CSRF 验证失败', 403)
    }
  }

  // ... 其他错误处理
}
```

**文件**: `src/main.tsx` (应用启动时获取 CSRF Token)

```typescript
import { getCSRFToken } from './lib/api-client'

// 应用启动时获取 CSRF Token
async function initApp() {
  try {
    await getCSRFToken()
  } catch (error) {
    console.error('初始化 CSRF Token 失败:', error)
  }

  // 渲染应用
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

initApp()
```

##### Step 4: 添加测试 (1h)

**文件**: `server/middleware/csrf_test.go`

```go
package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestCSRFProtection(t *testing.T) {
	gin.SetMode(gin.TestMode)

	t.Run("GET 请求不需要 CSRF Token", func(t *testing.T) {
		router := gin.New()
		router.Use(CSRFProtection())
		router.GET("/test", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		req := httptest.NewRequest("GET", "/test", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, 200, w.Code)
	})

	t.Run("POST 请求缺少 CSRF Token 返回 403", func(t *testing.T) {
		router := gin.New()
		router.Use(CSRFProtection())
		router.POST("/test", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		req := httptest.NewRequest("POST", "/test", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, 403, w.Code)
	})

	t.Run("POST 请求带有效 CSRF Token 成功", func(t *testing.T) {
		router := gin.New()
		router.Use(CSRFProtection())
		router.POST("/test", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		token := "test-csrf-token"
		req := httptest.NewRequest("POST", "/test", nil)
		req.AddCookie(&http.Cookie{Name: csrfCookieName, Value: token})
		req.Header.Set(csrfHeaderName, token)

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, 200, w.Code)
	})

	t.Run("POST 请求 Token 不匹配返回 403", func(t *testing.T) {
		router := gin.New()
		router.Use(CSRFProtection())
		router.POST("/test", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		req := httptest.NewRequest("POST", "/test", nil)
		req.AddCookie(&http.Cookie{Name: csrfCookieName, Value: "token1"})
		req.Header.Set(csrfHeaderName, "token2")

		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)

		assert.Equal(t, 403, w.Code)
	})
}
```


### 验证测试

#### 手动测试
```bash
# 1. 获取 CSRF Token
curl -c cookies.txt http://localhost:8080/api/v1/csrf-token

# 2. 使用 Token 发送 POST 请求
TOKEN=$(grep csrf_token cookies.txt | awk '{print $7}')
curl -b cookies.txt \
  -H "X-CSRF-Token: $TOKEN" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8080/api/v1/maintenance-records \
  -d '{"title":"test","type":"PREVENTIVE","assetType":"MOLD"}'

# 3. 不带 Token 的请求应该失败
curl -X POST http://localhost:8080/api/v1/maintenance-records \
  -H "Content-Type: application/json" \
  -d '{"title":"test","type":"PREVENTIVE","assetType":"MOLD"}'
```

#### 自动化测试
```bash
cd server
go test ./middleware -run TestCSRFProtection -v
```

### 预期结果
- ✅ GET 请求不需要 CSRF Token
- ✅ POST/PUT/PATCH/DELETE 请求需要 CSRF Token
- ✅ Token 不匹配返回 403
- ✅ 前端自动处理 CSRF Token

### 注意事项
1. **Cookie 设置**: 生产环境必须使用 HTTPS 和 Secure Cookie
2. **Token 刷新**: Token 过期后需要重新获取
3. **跨域**: 如果前后端分离部署,需要配置 CORS
4. **白名单**: 可以为某些 API (如 Webhook) 跳过 CSRF 验证

---

## 🎯 任务 3: 补充 API 文档

### 目标
使用 Swagger/OpenAPI 自动生成 API 文档,方便前端开发和接口测试。

### 技术方案

#### 方案选择
使用 **swaggo/swag** 生成 Swagger 文档

**优点**:
- 从代码注释自动生成文档
- 支持 Swagger UI 交互式测试
- 文档和代码同步更新

#### 实施步骤

##### Step 1: 安装 Swag 工具 (0.5h)

```bash
# 安装 swag CLI
go install github.com/swaggo/swag/cmd/swag@latest

# 添加依赖
cd server
go get -u github.com/swaggo/gin-swagger
go get -u github.com/swaggo/files
```

**文件**: `server/go.mod` (更新)

```go
require (
	// ... 现有依赖
	github.com/swaggo/gin-swagger v1.6.0
	github.com/swaggo/files v1.0.1
	github.com/swaggo/swag v1.16.3
)
```


##### Step 2: 添加 Swagger 注释到 main.go (1h)

**文件**: `server/main.go` (更新)

```go
package main

import (
	"xdfc-server/routes"
	
	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	
	_ "xdfc-server/docs" // 导入生成的文档
)

// @title XDFC 数字化管理 ERP API
// @version 2.2.1
// @description XDFC 数字化管理 ERP 系统的 RESTful API 文档
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@xdfc.com

// @license.name Proprietary
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8080
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description JWT Token (格式: Bearer {token})

func main() {
	r := gin.Default()
	
	// 设置路由
	routes.SetupRoutes(r)
	
	// Swagger 文档路由
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	
	r.Run(":8080")
}
```

##### Step 3: 添加 API 注释到 Handler (2h)

**文件**: `server/handlers/handler_maintenance_record.go` (更新)

```go
// GetMaintenanceRecordsHandler godoc
// @Summary 获取维保记录列表
// @Description 查询维保记录列表,支持分页、筛选、搜索
// @Tags 维保记录
// @Accept json
// @Produce json
// @Param assetType query string false "资产类型" Enums(MOLD, FURNACE)
// @Param assetId query string false "资产ID"
// @Param status query string false "状态" Enums(OPEN, IN_PROGRESS, COMPLETED, CANCELLED)
// @Param priority query string false "优先级(逗号分隔)" example(HIGH,CRITICAL)
// @Param type query string false "维保类型" Enums(PREVENTIVE, CORRECTIVE, INSPECTION)
// @Param dateFrom query string false "开始日期" example(2026-01-01)
// @Param dateTo query string false "结束日期" example(2026-12-31)
// @Param search query string false "搜索关键词(标题/序列号,最少2个字符)"
// @Param limit query int false "每页数量" default(100) maximum(1000)
// @Param offset query int false "偏移量" default(0)
// @Success 200 {object} map[string]interface{} "成功返回记录列表"
// @Failure 400 {object} map[string]string "参数错误"
// @Failure 500 {object} map[string]string "服务器错误"
// @Security BearerAuth
// @Router /maintenance-records [get]
func GetMaintenanceRecordsHandler(c *gin.Context) {
	// ... 现有代码
}

// GetMaintenanceRecordStatsHandler godoc
// @Summary 获取维保记录统计
// @Description 返回按状态分组的维保记录统计数据
// @Tags 维保记录
// @Accept json
// @Produce json
// @Success 200 {object} map[string]interface{} "统计数据"
// @Failure 500 {object} map[string]string "服务器错误"
// @Security BearerAuth
// @Router /maintenance-records/stats [get]
func GetMaintenanceRecordStatsHandler(c *gin.Context) {
	// ... 现有代码
}

// GetMaintenanceRecordHandler godoc
// @Summary 获取单条维保记录
// @Description 根据ID获取维保记录详情
// @Tags 维保记录
// @Accept json
// @Produce json
// @Param id path string true "记录ID"
// @Success 200 {object} models.MaintenanceRecord "维保记录详情"
// @Failure 404 {object} map[string]string "记录不存在"
// @Failure 500 {object} map[string]string "服务器错误"
// @Security BearerAuth
// @Router /maintenance-records/{id} [get]
func GetMaintenanceRecordHandler(c *gin.Context) {
	// ... 现有代码
}


// CreateMaintenanceRecordHandler godoc
// @Summary 创建维保记录
// @Description 创建新的维保记录
// @Tags 维保记录
// @Accept json
// @Produce json
// @Param body body object true "维保记录信息"
// @Success 200 {object} models.MaintenanceRecord "创建成功"
// @Failure 400 {object} map[string]string "参数错误"
// @Failure 500 {object} map[string]string "服务器错误"
// @Security BearerAuth
// @Router /maintenance-records [post]
func CreateMaintenanceRecordHandler(c *gin.Context) {
	// ... 现有代码
}

// PatchMaintenanceRecordHandler godoc
// @Summary 更新维保记录
// @Description 差分更新维保记录(SDRTS Delta 格式)
// @Tags 维保记录
// @Accept json
// @Produce json
// @Param id path string true "记录ID"
// @Param body body object true "更新数据(Delta格式)"
// @Success 200 {object} models.MaintenanceRecord "更新成功"
// @Failure 400 {object} map[string]string "参数错误"
// @Failure 404 {object} map[string]string "记录不存在"
// @Failure 409 {object} map[string]string "版本冲突"
// @Failure 422 {object} map[string]string "状态流转错误"
// @Failure 500 {object} map[string]string "服务器错误"
// @Security BearerAuth
// @Router /maintenance-records/{id} [patch]
func PatchMaintenanceRecordHandler(c *gin.Context) {
	// ... 现有代码
}

// DeleteMaintenanceRecordHandler godoc
// @Summary 删除维保记录
// @Description 软删除维保记录
// @Tags 维保记录
// @Accept json
// @Produce json
// @Param id path string true "记录ID"
// @Success 200 {object} map[string]string "删除成功"
// @Failure 404 {object} map[string]string "记录不存在"
// @Failure 500 {object} map[string]string "服务器错误"
// @Security BearerAuth
// @Router /maintenance-records/{id} [delete]
func DeleteMaintenanceRecordHandler(c *gin.Context) {
	// ... 现有代码
}
```

##### Step 4: 生成 Swagger 文档 (0.5h)

```bash
# 在 server 目录下生成文档
cd server
swag init

# 生成的文件:
# - docs/docs.go
# - docs/swagger.json
# - docs/swagger.yaml
```

**添加到 package.json scripts**:

```json
{
  "scripts": {
    "gen:api-docs": "cd server && swag init",
    "dev:api-docs": "cd server && swag init && go run main.go"
  }
}
```

##### Step 5: 访问 Swagger UI (0.5h)

启动服务器后访问:
```
http://localhost:8080/swagger/index.html
```

### 验证测试

#### 手动测试
1. 启动服务器: `pnpm run dev:server`
2. 访问 Swagger UI: `http://localhost:8080/swagger/index.html`
3. 测试各个 API 端点

#### 文档检查
- ✅ 所有 API 端点都有文档
- ✅ 参数说明完整
- ✅ 响应示例清晰
- ✅ 可以在 Swagger UI 中测试

### 注意事项
1. **文档更新**: 修改 API 后需要重新运行 `swag init`
2. **模型定义**: 复杂的请求/响应需要定义 struct 并添加注释
3. **认证**: Swagger UI 支持 JWT Token 认证测试
4. **版本控制**: 建议将生成的 docs 目录加入 Git

---

## 🎯 任务 4: 优化搜索性能

### 目标
优化维保记录搜索功能,避免全表扫描,提升大数据量下的查询性能。

### 技术方案

#### 方案选择
**PostgreSQL 全文搜索 (Full-Text Search)**

**优点**:
- 原生支持,无需额外服务
- 支持中文分词
- 性能优秀
- 支持相关性排序

**缺点**:
- 需要创建索引
- 需要数据库迁移


#### 实施步骤

##### Step 1: 创建数据库迁移 (1h)

**文件**: `server/migrations/20260520_add_maintenance_record_search_index.sql`

```sql
-- 添加全文搜索向量列
ALTER TABLE maintenance_records 
ADD COLUMN search_vector tsvector;

-- 创建触发器函数,自动更新搜索向量
CREATE OR REPLACE FUNCTION maintenance_records_search_vector_update() 
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.asset_sn, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER maintenance_records_search_vector_trigger
BEFORE INSERT OR UPDATE ON maintenance_records
FOR EACH ROW
EXECUTE FUNCTION maintenance_records_search_vector_update();

-- 为现有数据生成搜索向量
UPDATE maintenance_records SET search_vector = 
  setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(asset_sn, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(description, '')), 'C');

-- 创建 GIN 索引
CREATE INDEX idx_maintenance_records_search_vector 
ON maintenance_records USING gin(search_vector);

-- 创建复合索引优化常用查询
CREATE INDEX idx_maintenance_records_status_created 
ON maintenance_records(status, created_at DESC);

CREATE INDEX idx_maintenance_records_asset 
ON maintenance_records(asset_type, asset_id);

CREATE INDEX idx_maintenance_records_priority 
ON maintenance_records(priority);
```

**回滚脚本**: `server/migrations/20260520_add_maintenance_record_search_index_down.sql`

```sql
-- 删除索引
DROP INDEX IF EXISTS idx_maintenance_records_search_vector;
DROP INDEX IF EXISTS idx_maintenance_records_status_created;
DROP INDEX IF EXISTS idx_maintenance_records_asset;
DROP INDEX IF EXISTS idx_maintenance_records_priority;

-- 删除触发器
DROP TRIGGER IF EXISTS maintenance_records_search_vector_trigger ON maintenance_records;

-- 删除触发器函数
DROP FUNCTION IF EXISTS maintenance_records_search_vector_update();

-- 删除搜索向量列
ALTER TABLE maintenance_records DROP COLUMN IF EXISTS search_vector;
```

##### Step 2: 更新 Repository 层 (2h)

**文件**: `server/repositories/maintenance_record_repository.go` (更新)

```go
// List 查询维保记录列表
func (r *MaintenanceRecordRepository) List(params ListParams) (*ListResult, error) {
	query := r.db.Model(&models.MaintenanceRecord{})

	// 按设备筛选（可选）
	if params.AssetType != "" && params.AssetID != "" {
		query = query.Where("asset_type = ? AND asset_id = ?", params.AssetType, params.AssetID)
	}

	// 按状态筛选
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}

	// 按优先级筛选（支持多值）
	if len(params.Priorities) > 0 {
		if len(params.Priorities) == 1 {
			query = query.Where("priority = ?", params.Priorities[0])
		} else {
			query = query.Where("priority IN ?", params.Priorities)
		}
	}

	// 按类型筛选
	if params.Type != "" {
		query = query.Where("type = ?", params.Type)
	}

	// 按日期范围筛选
	if params.DateFrom != "" {
		query = query.Where("created_at >= ?", params.DateFrom)
	}
	if params.DateTo != "" {
		query = query.Where("created_at <= ?", params.DateTo)
	}

	// 全文搜索（使用 PostgreSQL FTS）
	if params.Search != "" {
		// 使用全文搜索
		searchQuery := strings.ReplaceAll(params.Search, " ", " & ")
		query = query.Where("search_vector @@ plainto_tsquery('simple', ?)", searchQuery)
		
		// 按相关性排序
		query = query.Order("ts_rank(search_vector, plainto_tsquery('simple', ?)) DESC", searchQuery)
	} else {
		// 默认按创建时间排序
		query = query.Order("created_at DESC")
	}

	// 获取总记录数
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	// 查询记录
	var records []models.MaintenanceRecord
	if err := query.Limit(params.Limit).Offset(params.Offset).Find(&records).Error; err != nil {
		return nil, err
	}

	return &ListResult{
		Records: records,
		Total:   total,
	}, nil
}
```

