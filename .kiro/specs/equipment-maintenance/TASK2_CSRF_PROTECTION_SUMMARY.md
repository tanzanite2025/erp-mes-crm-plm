# 任务2: CSRF 保护实施总结

**完成时间**: 2026-05-20  
**状态**: ✅ 已完成  
**实际工作量**: 1.5 小时

---

## 📋 完成内容

### 1. 创建 CSRF 中间件
- **文件**: `server/middleware/csrf.go`
- **功能**: 
  - Double Submit Cookie 模式
  - 生成随机 CSRF Token (32 字节 Base64 编码)
  - Cookie 和请求头双重验证
  - 自动跳过 GET/HEAD/OPTIONS 请求

### 2. 添加完整测试
- **文件**: `server/middleware/csrf_test.go`
- **测试覆盖**:
  - ✅ GET 请求不需要 CSRF Token
  - ✅ POST 请求缺少 Token 返回 403
  - ✅ POST 请求带有效 Token 成功
  - ✅ POST 请求 Token 不匹配返回 403
  - ✅ OPTIONS 请求不需要 CSRF Token
  - ✅ 成功设置 CSRF Token
- **测试结果**: 6/6 通过 (100%)

### 3. 集成到系统
- **登录时设置**: 修改 `server/handlers/auth.go`
- **公开端点**: 添加 `/api/v1/csrf-token` 端点
- **认证路由保护**: 所有写操作自动验证 CSRF Token

---

## 🔧 实现特性

### 核心功能
1. **Double Submit Cookie**: Cookie + 请求头双重验证
2. **自动生成**: 登录时自动设置 CSRF Token
3. **公开端点**: 未登录用户也可获取 Token
4. **智能跳过**: GET/HEAD/OPTIONS 请求自动跳过
5. **友好错误**: 返回 403 状态码和中文错误消息

### 技术亮点
- 使用 `crypto/rand` 生成安全随机数
- Base64 URL 编码,适合 Cookie 和 HTTP 头
- HttpOnly Cookie 防止 XSS 攻击
- 生产环境自动启用 Secure Cookie (HTTPS)

---

## 📝 工作原理

### Double Submit Cookie 模式

```
1. 用户登录
   ↓
2. 服务器生成 CSRF Token
   ↓
3. Token 存储在 Cookie 中 (HttpOnly)
   ↓
4. Token 同时在响应头返回
   ↓
5. 前端从响应头读取 Token
   ↓
6. 前端在写请求中添加 X-CSRF-Token 头
   ↓
7. 服务器验证 Cookie Token == Header Token
   ↓
8. 验证通过 → 请求成功
   验证失败 → 返回 403
```

### 为什么安全?

**攻击场景**: 恶意网站诱导用户点击
```html
<!-- 恶意网站 evil.com -->
<form action="https://your-app.com/api/v1/records" method="POST">
  <input name="action" value="delete" />
</form>
<script>document.forms[0].submit();</script>
```

**防护机制**:
1. 浏览器会自动发送 Cookie (包含 CSRF Token)
2. 但恶意网站**无法读取** Cookie 中的 Token
3. 恶意网站**无法设置** X-CSRF-Token 请求头
4. 服务器验证失败 → 请求被拒绝 ✅

---

## 🎯 集成点

### 1. 登录时设置 Token
**文件**: `server/handlers/auth.go`

```go
// 登录成功后设置 CSRF Token
if err := middleware.SetCSRFToken(c); err != nil {
    log.Error().Err(err).Msg("AUTH_LOGIN_CSRF_TOKEN_FAILED")
    // 不影响登录,继续返回
}
```

### 2. 公开端点获取 Token
**文件**: `server/routes/routes.go`

```go
// 未登录用户也可以获取 CSRF Token
api.GET("/csrf-token", func(c *gin.Context) {
    if err := middleware.SetCSRFToken(c); err != nil {
        c.JSON(500, gin.H{"error": "生成 CSRF Token 失败"})
        return
    }
    c.JSON(200, gin.H{"status": "ok"})
})
```

### 3. 认证路由自动保护
**文件**: `server/routes/routes.go`

```go
// 所有写操作自动应用 CSRF 保护
authorized.Use(func(c *gin.Context) {
    method := c.Request.Method
    if method == "POST" || method == "PUT" || method == "PATCH" || method == "DELETE" {
        middleware.CSRFProtection()(c)
    }
    c.Next()
})
```

---

## ✅ 验证结果

### 单元测试
```bash
$ go test ./middleware -run TestCSRF -v
=== RUN   TestCSRFProtection
    --- PASS: TestCSRFProtection/GET_请求不需要_CSRF_Token (0.00s)
    --- PASS: TestCSRFProtection/POST_请求缺少_CSRF_Token_返回_403 (0.00s)
    --- PASS: TestCSRFProtection/POST_请求带有效_CSRF_Token_成功 (0.00s)
    --- PASS: TestCSRFProtection/POST_请求_Token_不匹配返回_403 (0.00s)
    --- PASS: TestCSRFProtection/OPTIONS_请求不需要_CSRF_Token (0.00s)
--- PASS: TestCSRFProtection (0.00s)

=== RUN   TestSetCSRFToken
    --- PASS: TestSetCSRFToken/成功设置_CSRF_Token (0.00s)
--- PASS: TestSetCSRFToken (0.00s)
PASS
```
✅ 所有测试通过

### 编译测试
```bash
$ go build -o xdfc-server-test.exe .
Exit Code: 0
```
✅ 编译成功,无错误

---

## 📦 文件清单

| 文件 | 行数 | 说明 |
|------|------|------|
| `server/middleware/csrf.go` | 90 | CSRF 中间件实现 |
| `server/middleware/csrf_test.go` | 130 | 单元测试 |
| `server/handlers/auth.go` | +10 | 登录时设置 Token |
| `server/routes/routes.go` | +10 | 路由集成 |
| **总计** | **240** | |

---

## 🔄 前端集成 (待实现)

### 需要前端配合

#### 1. 从 Cookie 读取 Token
```typescript
function getCSRFTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === 'csrf_token') {
      return decodeURIComponent(value)
    }
  }
  return null
}
```

#### 2. 在请求中添加 Token
```typescript
// 方案 A: 在 API 客户端中全局添加
const api = axios.create({
  baseURL: '/api/v1',
  withCredentials: true, // 发送 Cookie
})

api.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase()
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method || '')) {
    const token = getCSRFTokenFromCookie()
    if (token) {
      config.headers['X-CSRF-Token'] = token
    }
  }
  return config
})

// 方案 B: 在每个请求中手动添加
const token = getCSRFTokenFromCookie()
await fetch('/api/v1/records', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token || '',
  },
  credentials: 'include',
  body: JSON.stringify(data),
})
```

#### 3. 处理 403 错误
```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const errorMsg = error.response?.data?.error
      if (errorMsg?.includes('CSRF')) {
        // CSRF 验证失败,提示用户刷新页面
        toast.error('安全验证失败,请刷新页面重试')
        // 可选: 自动刷新页面
        // window.location.reload()
      }
    }
    return Promise.reject(error)
  }
)
```

---

## 📊 安全性分析

### 防护能力

| 攻击类型 | 防护效果 | 说明 |
|---------|---------|------|
| CSRF 攻击 | ✅ 完全防护 | 恶意网站无法获取 Token |
| XSS 攻击 | ⚠️ 部分防护 | HttpOnly Cookie 防止 JS 读取 |
| 重放攻击 | ⚠️ 需要额外措施 | Token 24小时有效 |
| 中间人攻击 | ✅ HTTPS 防护 | 生产环境 Secure Cookie |

### 安全建议

1. **必须使用 HTTPS**: 生产环境必须启用 HTTPS
2. **Token 定期刷新**: 建议每次请求刷新 Token (可选)
3. **结合其他措施**: CSRF 保护不能替代其他安全措施
4. **监控异常**: 记录 CSRF 验证失败的请求

---

## ⚠️ 注意事项

### 1. Cookie 设置
```go
// 开发环境: secure = false (允许 HTTP)
// 生产环境: secure = true (仅 HTTPS)
secure := os.Getenv("GIN_MODE") == "release"
```

### 2. 跨域配置
如果前后端分离部署,需要配置 CORS:

```go
// 允许前端域名
config := cors.DefaultConfig()
config.AllowOrigins = []string{"https://your-frontend.com"}
config.AllowCredentials = true // 允许发送 Cookie
r.Use(cors.New(config))
```

### 3. Token 过期
当前 Token 24小时过期,过期后需要:
- 重新登录
- 或调用 `/api/v1/csrf-token` 获取新 Token

### 4. 子域名共享
如果需要在子域名间共享 Token:

```go
c.SetCookie(
    csrfCookieName,
    token,
    3600*24,
    "/",
    ".yourdomain.com", // 设置为主域名
    secure,
    true,
)
```

---

## 🚀 下一步优化

### 短期 (可选)
1. **前端集成**: 在 API 客户端中添加 CSRF Token
2. **错误处理**: 优化前端 403 错误提示
3. **监控日志**: 记录 CSRF 验证失败事件

### 中期 (推荐)
1. **Token 刷新**: 每次请求自动刷新 Token
2. **白名单**: 某些 API (如 Webhook) 跳过 CSRF 验证
3. **统计分析**: 提供 CSRF 攻击统计

### 长期 (可选)
1. **双 Token 模式**: Cookie Token + Session Token
2. **Origin 验证**: 额外验证 Origin/Referer 头
3. **自适应安全**: 根据风险等级调整验证强度

---

## 📚 相关资源

### OWASP 文档
- [CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)

### 测试工具
- [CSRF PoC Generator](https://security.love/CSRF-PoC-Genorator/)
- [Burp Suite CSRF Scanner](https://portswigger.net/burp/documentation/desktop/scanning)

---

**任务完成时间**: 2026-05-20  
**实施人员**: Kiro AI Assistant  
**状态**: ✅ 已完成并测试通过  
**下一任务**: 前端集成 CSRF Token

