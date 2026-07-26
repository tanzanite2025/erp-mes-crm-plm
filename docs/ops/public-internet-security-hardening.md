# ERP 公网部署安全加固清单

本文档用于 ERP 在 `erp.tanzanite.site` 面向公网前的安全核查。它不是泛化建议，而是基于当前仓库的生产 Compose、Caddy/Nginx 入口、Go 路由和中间件实现整理的执行清单。

最后核对日期：2026-07-27。

## 1. 当前安全边界

当前推荐生产路径以 `docs/ops/hostinger-vps-docker-runbook.md` 和 `compose.prod.yml` 为准：

```text
Internet
  -> Cloudflare proxied DNS
  -> Hostinger firewall: 80/443 only
  -> tanzanite-edge / Caddy
  -> erp-web:8080
  -> app:8080
  -> db / redis / search-engine
```

核心配置来源：

| 层级 | 文件 | 当前状态 |
| --- | --- | --- |
| 共享入口 | `deployment/gateway/compose.yml` | Caddy 只发布 `80/443`，`admin off`，配置 Cloudflare trusted proxies 和安全响应头 |
| ERP Stack | `compose.prod.yml` | ERP 服务不使用 `ports`，仅通过 Docker 网络暴露；DB 网络为 `internal` |
| Web 容器 Nginx | `deployment/nginx/erp-web.conf` | `/api/v1/system/metrics` 直接返回 `404`，并设置 CSP、HSTS 以外的基础安全头 |
| 兼容/旧入口 Nginx | `server/deployment/nginx/erp.tanzanite.site.conf` | 保留 Cloudflare real IP 和 metrics 内网 allowlist；如果仍使用宿主机 Nginx，必须单独验证 |
| 后端路由 | `server/routes/routes.go` | `/uploads/*filepath` 经过 `AuthMiddleware`；metrics 是公开注册路由，但依赖入口层阻断公网访问 |
| 后端启动 | `server/main.go` | release 下要求 `ALERT_WEBHOOK_TOKEN`，设置 trusted proxies，Swagger 默认关闭 |
| 生产环境模板 | `server/.env.production.example` | `GIN_MODE=release`、`ENABLE_SWAGGER=false`、`ALLOWED_ORIGIN=https://erp.tanzanite.site` |

不要同时启用 Caddy 和宿主机 Nginx 占用 `80/443`。如果迁移入口实现，必须重新执行第 6 节验证命令。

## 2. 上线前阻断项

以下任一项未满足时，不应把功能继续推进到公网：

1. Cloudflare DNS 记录必须为 Proxied，SSL/TLS 模式必须为 Full (strict)。
2. Hostinger 防火墙只允许公网访问 `80/443`；SSH 只允许管理员来源或临时开放。
3. `compose.prod.yml` 中 ERP 业务服务不得使用 `ports` 暴露数据库、Redis、API、搜索服务或监控服务。
4. `GIN_MODE=release`，`ENABLE_SWAGGER=false`，`ALLOWED_ORIGIN` 不得为 `*`。
5. `JWT_SECRET`、`POSTGRES_PASSWORD`、`REDIS_PASSWORD`、`AI_SECRET_ENCRYPTION_KEY`、`INITIAL_ADMIN_PASSWORD`、`TOPOLOGY_AUTH_PASSWORD`、`ALERT_WEBHOOK_TOKEN` 必须是生产专用强随机值。
6. 公网访问 `/api/v1/system/metrics` 必须返回 `404` 或 `403`，不能返回 Prometheus 指标。
7. 未登录访问 `/uploads/*` 必须失败，不能直接下载上传文件。
8. `/swagger/*` 在生产必须返回 `404`。
9. 备份、日志、上传卷和存储卷不能通过静态文件服务或管理面板公开。
10. Cloudflare、Hostinger、GHCR、VPS SSH 账户必须启用强口令和 2FA，生产 token 不得复制进仓库、Issue、日志或聊天记录。

## 3. 七类风险与当前状态

| 风险 | 当前已有防护 | 仍需确认或补强 |
| --- | --- | --- |
| 入口与源站绕过 | Cloudflare Proxied、Caddy trusted proxies、Hostinger 防火墙基线 | 防火墙是否只开放 `80/443`；是否允许直接用源站 IP 访问业务域名；是否需要 Cloudflare Authenticated Origin Pulls |
| 密钥与环境变量泄露 | 生产 Compose 使用 `${VAR:?required}`；仓库只有 `.env.production.example` | 生产 `.env` 或 Hostinger Project Environment 不得入库；轮换所有曾经出现在聊天、日志或测试环境里的密钥 |
| 登录、CORS、CSRF | `JWT_SECRET` 缺失即退出；release Cookie 为 Secure/HttpOnly；写操作有 CSRF；CORS 按 `ALLOWED_ORIGIN` 匹配 | `ALLOWED_ORIGIN` 必须是精确域名；公开提交端点需单独评估一次性 token、验证码或更严限流 |
| 公共 API 滥用 | 全局限流默认 `20 rps / burst 40`；写限流默认 `5 rps / burst 10`；登录 release 默认 `5 次 / 5 分钟` | Cloudflare WAF rate limiting 需覆盖登录、公开提交、AI proxy、上传入口；阈值按真实业务压测调整 |
| 调试与管理面暴露 | Caddy `admin off`；Swagger release 默认关闭；metrics 在 Web Nginx 返回 `404` | 换入口时必须继续阻断 metrics；不得公开 Grafana、Prometheus、数据库管理器或 Docker socket |
| 文件上传与下载 | `/uploads/*filepath` 经登录鉴权；上传 API 有权限位；入口 `client_max_body_size 100M` | 校验允许的 MIME/扩展名、大小、路径穿越、防病毒或异步扫描策略；长期文件应按业务权限二次校验 |
| 数据、备份与可观测 | DB 网络 `internal`；容器 `read_only`、`no-new-privileges`、日志轮换；监控清单要求共享栈不公开端口 | 备份恢复演练；备份卷访问控制；日志脱敏；磁盘告警；删除 Hostinger Project 前先验证备份 |

## 4. 路由暴露清单

| 路径 | 预期公网状态 | 依据 |
| --- | --- | --- |
| `/`、`/assets/*`、`/fonts/*`、`/sw.js` | 允许公开访问 | `deployment/nginx/erp-web.conf` 静态前端入口 |
| `/api/v1/health` | 允许公开或由入口健康检查访问 | `server/routes/routes.go` public route |
| `/api/v1/csrf-token` | 允许公开访问 | 前端获取 CSRF token |
| `/api/v1/auth/login` | 允许公开，但必须限流 | `LoginRateLimitMiddleware` |
| `/api/v1/auth/logout` | 允许调用，但需要 CSRF | public route 中显式加 `CSRFProtection` |
| `/api/v1/raw-materials/prepreg-label-ocr-sessions/:sessionId/submit` | 业务公开提交，需独立防滥用 | public route |
| `/api/v1/production/product-barcode-capture-sessions/:sessionId/submit` | 业务公开提交，需独立防滥用 | public route |
| `/api/v1/warehouse/packaging-assemblies/capture-sessions/:sessionId/submit` | 业务公开提交，需独立防滥用 | public route |
| `/api/v1/ws` | 允许公开握手，但应校验业务 ticket | public route 调用 `WSHandler` |
| `/api/v1/system/alerts/webhook` | 允许来自 Alertmanager，但必须带 token | `AlertWebhookIngressGuard` |
| `/api/v1/system/metrics` | 不允许公网访问 | `deployment/nginx/erp-web.conf` 返回 `404`；监控应从容器网络直连 `app:8080` |
| `/uploads/*` | 未登录不得访问 | `AuthMiddleware` 包裹 `ServeUploadedAssetHandler` |
| `/swagger/*` | 生产不得访问 | `ENABLE_SWAGGER=false` |

## 5. Cloudflare 与入口层建议

### Cloudflare

必选：

1. DNS：`erp.tanzanite.site` 为 Proxied。
2. SSL/TLS：Full (strict)，源站证书未过期且主机名匹配。
3. WAF：启用托管规则，并为高风险路径添加自定义规则或限流规则。
4. Rate limiting：至少覆盖以下表达式类别：
   - 登录：`http.host eq "erp.tanzanite.site" and http.request.uri.path eq "/api/v1/auth/login" and http.request.method eq "POST"`
   - 公开提交：路径包含 `/submit` 且方法为 `POST`
   - 上传：路径包含 `/assets/upload` 或 `/uploads/`
   - AI proxy：`http.request.uri.path eq "/api/v1/ai/proxy"`
5. Origin IP：如果 Hostinger 支持来源网段规则，优先只允许 Cloudflare IP 访问 `80/443`。

可选但建议评估：

1. Authenticated Origin Pulls，减少源站 IP 被直连绕过 Cloudflare 的风险。
2. Bot Fight Mode、Turnstile 或 Managed Challenge，用于登录和公开提交端点。
3. Cloudflare 通知：证书、WAF 大量拦截、源站错误率、流量突增。

Cloudflare IP 段必须以官方页面为准，不要把旧清单当成永久常量。

### Caddy 网关

当前 `deployment/gateway/compose.yml` 已具备：

1. `admin off`。
2. `trusted_proxies static` 配置 Cloudflare IPv4/IPv6 网段。
3. `trusted_proxies_strict`，避免客户端伪造左侧 `X-Forwarded-For`。
4. `Strict-Transport-Security`、`X-Content-Type-Options`、`Referrer-Policy`、隐藏 `Server`。
5. 只反代到 `erp-web:8080`，不直接接入 `app`、`db` 或 `redis`。

继续补强建议：

1. 为 Caddy 添加请求体、请求头和读写超时上限，降低慢请求占用风险。
2. 保持 Caddy 镜像版本跟随安全更新，并用固定版本或 digest 管理升级。
3. 不开启 Caddy admin API，不挂载 Docker socket。

### Web 容器 Nginx

当前 `deployment/nginx/erp-web.conf` 是 ERP 容器内部 Web 入口，必须保留：

1. `/api/v1/system/metrics` 返回 `404`。
2. `/api/v1/ai/proxy` 关闭 proxy buffering，读写超时为长请求服务。
3. `/api/` 和 `/uploads/` 反代到 `app:8080`。
4. `X-Frame-Options`、`X-Content-Type-Options`、`Referrer-Policy`、`Permissions-Policy`、`Content-Security-Policy`。
5. `server_tokens off`、JSON access log、日志输出到 stdout/stderr。

如果仍使用 `server/deployment/nginx/erp.tanzanite.site.conf` 作为宿主机入口，必须额外确认：

1. 不与 Caddy 同时占用 `80/443`。
2. Cloudflare IP 段与官方最新清单一致。
3. `/api/v1/system/metrics` 仍只允许本机和私网。
4. `real_ip_header CF-Connecting-IP` 只在请求确实来自 Cloudflare 时信任。
5. TLS 证书私钥不入库，权限限制到 root 或 nginx 运行用户。

## 6. 验证命令

在生产环境执行前，不要把命令输出里的 token、cookie、真实内网地址复制到公共位置。

### 公网验证

```bash
curl -I https://erp.tanzanite.site/api/v1/health
curl -I https://erp.tanzanite.site/api/v1/system/metrics
curl -I https://erp.tanzanite.site/swagger/index.html
curl -I https://erp.tanzanite.site/uploads/not-exist
```

预期：

| 命令 | 预期结果 |
| --- | --- |
| `/api/v1/health` | `200` |
| `/api/v1/system/metrics` | `404` 或 `403`，不能出现 Prometheus 指标 |
| `/swagger/index.html` | `404` |
| `/uploads/not-exist` 未带登录态 | `401` 或等价未授权响应 |

### 宿主机验证

```bash
docker compose -f deployment/gateway/compose.yml ps
docker compose -f compose.prod.yml ps
docker network inspect tanzanite-edge
docker network inspect erp_data
docker compose -f compose.prod.yml config
```

检查点：

1. 只有 `tanzanite-edge` 的 `gateway` 发布宿主机 `80/443`。
2. `erp` 项目中的 `db`、`redis`、`app`、`search-engine` 没有 `ports`。
3. `erp_data` 是 internal 网络。
4. `ENABLE_SWAGGER=false`、`GIN_MODE=release`、`AI_PROXY_ALLOW_PRIVATE_IP=false`。
5. `ALLOWED_ORIGIN` 只包含可信 HTTPS 域名。

### 入口配置验证

Caddy：

```bash
docker compose -f deployment/gateway/compose.yml logs --tail=100 gateway
```

确认没有启用 admin API，没有证书错误，Cloudflare 代理后的客户端 IP 解析符合预期。

Web Nginx：

```bash
docker compose -f compose.prod.yml exec web nginx -T
```

确认 `location = /api/v1/system/metrics { return 404; }` 存在。

后端：

```bash
docker compose -f compose.prod.yml logs --tail=100 app
```

确认启动日志包含：

1. Swagger UI disabled for this runtime。
2. Trusted proxies configured。
3. alert webhook token loaded 为 true。

## 7. 发布后巡检

首次公网开放后的 24 小时内：

1. 每小时查看 Cloudflare 安全事件、源站 4xx/5xx、登录失败、429 数量。
2. 查看 VPS CPU、内存、磁盘、网络和 Docker 日志大小。
3. 抽查上传、下载、登录、公开提交、AI proxy、WebSocket。
4. 确认备份任务成功，并完成一次恢复演练记录。
5. 如果出现异常 429 或误拦截，优先调整 Cloudflare 规则阈值，不要关闭应用层限流。

每次入口、域名、Cloudflare 规则、Compose 网络、认证中间件或上传功能改动后，必须重新执行第 6 节。

## 8. 实测审计结果与加固队列

本节记录 2026-07-27 本地审计与第一轮安全收口结果。

### 8.1 前端依赖审计

命令：

```bash
pnpm audit --prod --audit-level high
pnpm why seroval xlsx vite postcss rollup exceljs minimatch brace-expansion tmp uuid --prod
```

初始结果：生产依赖存在 `1 critical / 21 high / 7 moderate`。

第一轮收口后：

- 移除直接依赖 `xlsx`，计量单位导入改用既有 `exceljs` 链路，并将该入口限制为 `.xlsx`。
- 升级 TanStack Router、Vite/Tailwind Vite 相关锁定版本。
- 使用 `pnpm.overrides` 收敛 `exceljs` 传递依赖中的 `brace-expansion`、`minimatch`、`picomatch`、`tmp`、`uuid`。
- 将内部 ERP 前端包设置为 `private: true`，避免误发布到 npm。
- `pnpm audit --prod --audit-level high` 返回 `No known vulnerabilities found`。

| 优先级 | 依赖 | 来源 | 当前处理 |
| --- | --- | --- | --- |
| P0 | `seroval@1.4.0` | `@tanstack/react-router -> @tanstack/router-core` | 已通过 TanStack Router lockfile 升级清除 |
| P1 | `xlsx@0.18.5` | 直接依赖 | 已移除，前端不再 import `xlsx` |
| P1 | `vite@7.3.0` / `postcss@8.5.6` / `rollup@4.52.5` | `@tailwindcss/vite` | 已通过 lockfile 升级清除 |
| P1 | `exceljs@4.4.0` 依赖链 | `archiver` / `glob` / `minimatch` / `brace-expansion` / `tmp` / `uuid` | 已通过 `pnpm.overrides` 清除 audit 报告；后续仍建议评估替换老旧压缩链 |

CI 已加入 `pnpm audit --prod --audit-level high`，生产依赖 high 及以上漏洞会阻断构建。

### 8.2 Go 漏洞审计

命令：

```bash
go run golang.org/x/vuln/cmd/govulncheck@latest ./...
go list -m -u -json golang.org/x/text github.com/jackc/pgx/v5 github.com/redis/go-redis/v9
```

初始结果：`govulncheck` 报告 `17` 个代码可达漏洞，集中在 Go 标准库/toolchain、`golang.org/x/text`、`github.com/jackc/pgx/v5`、`github.com/redis/go-redis/v9`。

第一轮收口后：

- `server/Dockerfile` 后端 builder 固定到 `golang:1.26.5-alpine`。
- CI 后端测试固定到 `go-version: 1.26.5`。
- `golang.org/x/text` 升级到 `v0.40.0`。
- `github.com/jackc/pgx/v5` 升级到 `v5.10.0`。
- `github.com/redis/go-redis/v9` 升级到 `v9.21.0`。
- 使用 `GOTOOLCHAIN=go1.26.5+auto` 复跑 `govulncheck`，代码可达漏洞为 `0`。

| 优先级 | 对象 | 当前处理 |
| --- | --- | --- |
| P0 | Go build/runtime toolchain | 已固定到 `1.26.5`；后续建议再固定镜像 digest |
| P0 | `golang.org/x/text` | 已升级到 `v0.40.0` |
| P0 | `github.com/jackc/pgx/v5` | 已升级到 `v5.10.0` |
| P1 | `github.com/redis/go-redis/v9` | 已升级到 `v9.21.0` |

Go 依赖修复后已执行：

```bash
cd server
go test ./... -count=1
GOTOOLCHAIN=go1.26.5+auto GOSUMDB=sum.golang.org go run golang.org/x/vuln/cmd/govulncheck@latest ./...
```

### 8.3 发布门禁队列

| 优先级 | 门禁 | 目标 |
| --- | --- | --- |
| P0 | 公网 curl 验证 | `/metrics` 非公开、Swagger 关闭、uploads 未登录失败、health 正常 |
| P0 | 生产环境核验 | 强随机密钥、无 dev 默认值、`GIN_MODE=release`、`ENABLE_SWAGGER=false` |
| P0 | 防火墙核验 | 源站只开放 `80/443`，DB/Redis/API/监控无宿主机端口 |
| P0 | 备份恢复演练 | 至少一次真实恢复验证后再公网放量 |
| P1 | `pnpm audit` | critical/high 修复或逐项风险接受，CI 中可复现 |
| P1 | `govulncheck` | 代码可达漏洞归零或逐项风险接受 |
| P1 | 容器扫描 | 已加入 CI：本地构建 `erp-web`、`erp-api`、`erp-search`、`erp-watchdog`，使用 Trivy/Grype 扫描 fixable high/critical |
| P1 | secrets scan | 已加入 CI：gitleaks 使用完整 Git 历史扫描并 redacted 输出；`.gitleaksignore` 记录已复核的历史测试夹具假阳性 |
| P1 | SBOM/provenance 验证 | 发布工作流已有 SBOM/provenance；补充签名和部署验签策略 |

本地复核：gitleaks 扫描 `425` 个历史提交，应用 `.gitleaksignore` 后返回 `no leaks found`。

### 8.4 应用层加固队列

| 优先级 | 区域 | 当前状态 | 加固方向 |
| --- | --- | --- | --- |
| P1 | 公开 submit 端点 | 有 session token 和 TTL | 路径级限流、失败次数锁定、统一错误响应、异常审计 |
| P1 | AI proxy | 有白名单、私网禁用、大小/超时/用量治理 | Cloudflare 规则、用户预算、异常消费告警、模型/供应商白名单审计 |
| P1 | 文件上传 | 有鉴权、扩展名和基础内容类型检查 | 隔离区、恶意文件扫描、压缩包策略、业务对象级下载授权 |
| P1 | WebSocket | 有一次性 ticket 和 Origin 检查 | 连接数限制、同用户连接上限、idle timeout、ping/pong deadline |
| P2 | CSP | Web Nginx 已配置 CSP | 逐步减少 `unsafe-inline` / `unsafe-eval`，先 report-only 再收紧 |
| P2 | 账号安全 | 依赖强口令和权限模型 | 管理员 MFA、登录异常告警、长期未用账号禁用 |

未完成 P0 前，不建议继续功能升级；P1 未完成前，不建议扩大公网访问范围。

## 9. 参考

- Cloudflare IP ranges: https://www.cloudflare.com/ips/
- Cloudflare Full (strict): https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/
- Cloudflare WAF rate limiting rules: https://developers.cloudflare.com/waf/rate-limiting-rules/
- Caddy trusted proxies: https://caddyserver.com/docs/caddyfile/options#trusted-proxies
- Caddy header directive: https://caddyserver.com/docs/caddyfile/directives/header
- Gitleaks: https://github.com/gitleaks/gitleaks
- Trivy: https://github.com/aquasecurity/trivy
- Grype: https://github.com/anchore/grype
