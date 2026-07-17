# XDFC 单 VPS 生产架构路线

> 适用前提：当前使用一台 Hostinger VPS，并计划承载多个独立项目。
> 核心目标：先形成可上线、可回滚、无公网数据端口的生产基线，再按资源与业务需求扩展。

## 1. 已确定的生产基线

当前不再使用“宿主机 Nginx + VPS 源码构建 + 固定端口段”作为生产目标。

统一基线：

1. `tanzanite-edge` Caddy Stack 独占宿主机 `80/443`。
2. 每个业务项目使用独立 Compose Project。
3. 项目只向共享 edge 网络暴露一个内部 Web 服务。
4. 数据库、Redis、API 和管理工具不发布宿主机端口。
5. GitHub Actions 构建 GHCR 镜像，生产使用不可变 `sha-*` 标签。
6. Hostinger Docker Manager 保存生产 Compose 和环境变量。
7. PostgreSQL、上传文件和镜像版本均有独立回滚路径。

ERP 的首个生产实现是：

- 共享入口：`deployment/gateway/compose.yml`
- ERP Stack：`compose.prod.yml`
- 前端镜像：`deployment/docker/web.Dockerfile`
- 镜像发布：`.github/workflows/publish-images.yml`

## 2. 当前风险

### P0：首次上线链路尚未闭环

1. SSH 公钥已注册到 Hostinger 账号，但 VPS 尚未接受该 key。
2. GHCR Package 尚未完成首次构建和公开拉取验证。
3. 网关和 ERP Project 尚未在 Hostinger 上完成健康检查。
4. Cloudflare 仍指向旧服务器，这是正确的回滚保护状态。

### P1：数据恢复能力尚未验证

1. PostgreSQL 只有持久卷设计，尚未建立异机逻辑备份。
2. 上传文件使用 VPS 持久卷，尚未建立异地副本。
3. Hostinger 当前没有可用恢复点，Snapshot 计划仍需确认。

### P2：单机资源需要预算

1. KVM 2 为 2 CPU / 8 GB RAM，不能为每个项目重复运行 Loki、Grafana、数据库管理工具。
2. ERP 首次上线只运行一个 API 实例，不声明无法验证的伪副本。
3. 新项目接入前必须评估常驻内存、CPU 峰值、数据卷增长和数据库连接数。

## 3. Phase A：完成 ERP 首次上线

### 动作

1. 在 hPanel 修复 SSH key 登录，保留 root 会话直到 deploy 用户验证成功。
2. 运行 `pnpm run predeploy:check`。
3. 发布四个 GHCR 镜像并确认 VPS 可拉取。
4. 部署 `tanzanite-edge`，验证 `80/443` 只有该 Stack 占用。
5. 部署 ERP Project，确认所有默认服务 Healthy。
6. 切换 ERP DNS，完成 Caddy 证书签发，再恢复 Cloudflare Proxy。
7. 完成登录、权限、上传、WebSocket 和核心业务烟测。

### 验收

- 生产 Compose 无宿主机内部端口映射。
- Cloudflare 使用 `Full (strict)`。
- 可通过旧 `sha-*` 镜像标签回滚。
- 未修改主站和其他项目 DNS。

## 4. Phase B：备份与容量治理

### 动作

1. PostgreSQL 每日逻辑备份并同步到 VPS 之外。
2. 上传文件每日增量备份。
3. 每月恢复演练并记录恢复时间。
4. 配置磁盘、内存、CPU、容器重启次数和数据库连接告警。
5. 按实际流量确定 API 连接池和 Redis 连接预算。

### 验收

- 可以从备份恢复到隔离环境。
- 单个容器异常不会耗尽整机磁盘。
- 日志轮换和镜像清理不破坏回滚镜像。

## 5. Phase C：接入第二个项目

`TANZANITE-THEME` 不能复用当前开发 Compose。接入前必须：

1. 审计 Go 后端、Nuxt 前端、数据库迁移、环境变量和生产数据边界。
2. 删除生产默认密码和公开端口。
3. 建立独立 GHCR 镜像与生产 Compose。
4. 只向 edge 网络暴露 `theme-web`。
5. 确认其资源预算不会影响 ERP。
6. 网关和容器健康后再切换主站 DNS。

共享网关只负责域名路由，不为任何项目保留旧端口或开发约定。

## 6. Phase D：存储与多机扩展

只有满足以下条件才进入多机：

- 单 VPS 已接近持续资源上限。
- PostgreSQL 与文件存储已具备外部或高可用方案。
- 已有统一监控、告警和演练机制。

多机阶段再评估：

- 托管 PostgreSQL 或数据库主从。
- S3 兼容对象存储。
- 多节点入口和负载均衡。
- 应用多副本与滚动发布。

在这些依赖未准备前，不通过增加 `deploy.replicas` 假装系统已经分布式。

## 7. 回滚原则

1. 镜像问题：回退 `IMAGE_TAG`。
2. 网关问题：恢复上一份已验证的 Gateway Compose。
3. DNS 问题：恢复切换前的 Cloudflare 记录内容。
4. 数据迁移问题：按版本迁移方案恢复数据库，不依赖镜像回滚自动修复。
5. Project 删除不是回滚手段，数据 Stack 禁止直接删除。
