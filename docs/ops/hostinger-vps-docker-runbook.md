# Hostinger VPS 多项目 Docker 部署与运维手册

本文档是 `tanzanite.site` 在 Hostinger VPS 上运行多个项目的生产基线。生产环境采用共享入口 Stack、独立业务 Stack、GHCR 镜像和 Cloudflare 代理，不在 VPS 上编译源码。

> 安全边界：仓库不保存 SSH 私钥、数据库密码、JWT 密钥、Cloudflare Token、证书私钥或生产 `.env`。Hostinger Docker Manager 中的环境变量也不得复制到日志、Issue 或聊天记录。

## 1. 当前资产

| 项目 | 当前值 |
| --- | --- |
| Hostinger VPS ID | `1834903` |
| 管理入口 | `https://hpanel.hostinger.com/vps/1834903/docker-manager` |
| 系统 | Ubuntu 24.04 LTS |
| 主机名 | `srv1834903.hstgr.cloud` |
| IPv4 | `2.25.85.201` |
| IPv6 | `2a02:4780:75:fa73::1` |
| Hostinger 防火墙 | `erp-prod-edge`，ID `330015` |
| ERP 域名 | `erp.tanzanite.site` |
| Cloudflare Zone | `tanzanite.site` |

当前生产流量：

- `erp.tanzanite.site -> 2.25.85.201`，Proxied，TTL Auto。
- Cloudflare Zone 和 ERP 主机覆盖规则均使用 `Full (strict)`。
- Caddy 使用 Let's Encrypt 证书并自动续期，Cloudflare 到源站执行证书校验。
- `tanzanite.site` 和 `www.tanzanite.site` 仍属于现有主站环境，本次切流未修改。

## 2. 生产架构

一台 VPS 只允许一个公共入口占用 `80/443`。每个业务项目是独立 Compose Project，只向共享边缘网络暴露一个内部 Web 入口。

```text
Internet
  -> Cloudflare
  -> Hostinger firewall: 80/443
  -> tanzanite-edge (Caddy)
      -> erp.tanzanite.site -> erp-web:8080
      -> future project     -> project-web:internal-port

erp project
  -> web -> app -> search-engine
                  -> PostgreSQL
                  -> Redis
```

生产 Stack：

| Compose Project | 配置文件 | 职责 | 宿主机端口 |
| --- | --- | --- | --- |
| `tanzanite-edge` | `deployment/gateway/compose.yml` | Caddy、TLS、域名路由、共享 `tanzanite-edge` 网络 | `80/443` |
| `erp` | `compose.prod.yml` | ERP Web、API、Search、PostgreSQL、Redis、可选 Watchdog | 无 |
| `host-kernel-tuning` | 一次性 Hostinger Docker Manager Project | 写入宿主机内核参数，例如 Redis 所需的 `vm.overcommit_memory=1` | 无 |

`server/docker-compose.yml` 只用于本地开发，不得复制到 Hostinger Docker Manager。

## 3. 统一生产规则

所有新项目必须满足：

1. 使用独立 Compose Project 名称、数据卷和私有网络。
2. 不使用 `container_name`，避免跨项目冲突并保留扩缩容能力。
3. 除共享网关外不使用 `ports`；数据库、Redis、API 和管理工具不得发布到宿主机。
4. 只让项目的 `web` 服务加入外部 `tanzanite-edge` 网络。
5. 镜像从 GHCR 拉取，并使用不可变 `sha-*` 标签。
6. 生产秘密使用 Hostinger Project Environment，不能写入 Compose 或镜像。
7. 配置健康检查、日志轮换、`no-new-privileges` 和合理的进程限制。
8. 可观测系统属于共享基础设施，不能每个项目各运行一套 Loki/Grafana。
9. 数据卷变更和 Project 删除前必须完成备份与恢复验证。
10. 共享网关不挂载 `/var/run/docker.sock`。

`TANZANITE-THEME` 当前根 Compose 是开发配置，包含公开数据库端口、开发默认密码和固定容器名。该文件不能为了兼容而直接接入生产；项目完成独立审计后应按本章重构。

## 3.1 宿主机内核调优

Redis 在生产环境需要宿主机启用内存 overcommit，否则容器启动日志会提示：

```text
WARNING Memory overcommit must be enabled!
```

`vm.overcommit_memory` 是宿主机内核参数，不属于 Docker 可命名空间化的 sysctl，不能写进 ERP Redis 服务的 `sysctls`，也不能为了消除告警给 ERP 项目增加长期 `privileged` 权限。生产基线是：

```bash
sysctl -w vm.overcommit_memory=1
printf '%s\n' 'vm.overcommit_memory = 1' > /etc/sysctl.d/99-redis-overcommit.conf
sysctl --system
```

当 SSH 暂不可用时，允许使用独立的一次性 Hostinger Docker Manager Project `host-kernel-tuning`，通过短生命周期 `privileged` Alpine 容器写入宿主机 `/etc/sysctl.d/99-redis-overcommit.conf` 并立即执行 `sysctl -w`。该 Project 只负责宿主机基线，不加入 `erp` 或 `tanzanite-edge`，也不挂载业务数据卷。

## 4. 网络与防火墙

Hostinger 防火墙当前规则：

| 端口 | 当前来源 | 用途 |
| --- | --- | --- |
| `22/TCP` | 任意，临时 | SSH 初始化 |
| `80/TCP` | 任意，临时 | HTTP 和 ACME 验证 |
| `443/TCP` | 任意，临时 | HTTPS |

未列出的入站端口不放行。当前规则已同步到 VPS，且 TCP `22` 已从本机验证可达。

后续收紧顺序：

1. SSH 密钥登录验证成功后，将 `22` 限制为管理员固定公网 IP。
2. Cloudflare 切流稳定后，将 `80/443` 限制为 Cloudflare 官方 IPv4/IPv6 网段。
3. 管理员直连排障时临时增加来源 IP，结束后立即删除。

Docker 发布端口可能绕过 UFW，因此安全基线是“Compose 不发布内部端口 + Hostinger 外层防火墙”，不能只依赖 UFW。

## 5. SSH 初始化

优先使用 Hostinger hPanel 添加 SSH 公钥，不传递 root 密码。

首次登录后创建日常用户：

```bash
adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
install -m 600 -o deploy -g deploy /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
```

使用第二个终端确认以下命令成功后，才能禁用密码认证：

```bash
ssh deploy@2.25.85.201
docker version
docker compose version
```

目标 SSH 配置：

```text
PasswordAuthentication no
PermitRootLogin prohibit-password
```

修改后先运行 `sshd -t`，再运行 `systemctl reload ssh`，并保持当前会话不关闭直到新会话验证成功。

## 6. 镜像发布

`.github/workflows/publish-images.yml` 在 `master` 变更后构建：

- `ghcr.io/tanzanite2025/erp-web`
- `ghcr.io/tanzanite2025/erp-api`
- `ghcr.io/tanzanite2025/erp-search`
- `ghcr.io/tanzanite2025/erp-watchdog`

每次发布生成：

- `master`：便于确认最新构建，不作为稳定回滚锚点。
- `sha-<commit>`：生产部署和回滚必须使用该标签。

首次发布后确认 GHCR Package 为公开可拉取，或者在 Hostinger 配置只读 Registry 凭据。没有完成 Registry 拉取验证前不得创建 ERP Project。

## 7. 部署共享网关

在 Hostinger Docker Manager 创建 Project：

```text
Project name: tanzanite-edge
Compose source: deployment/gateway/compose.yml 的完整内容
Environment（首次容器验收）: ERP_SITE=http://erp.tanzanite.site
```

验收项：

- Caddy 容器状态为 Running/Healthy。
- 仅网关容器显示 `80/443` 映射。
- Docker 网络 `tanzanite-edge` 已创建。
- Project 日志中没有 Caddyfile 解析错误。
- `http://2.25.85.201/__edge/health` 返回 `200` 和 `ok`。

网关可以早于 ERP Project 启动。`erp-web` 尚不存在时，ERP 域名路由返回 `502` 是预期状态，但网关自身必须保持 Healthy。

完成第 9 节 TLS 切流后，生产环境必须使用 `ERP_SITE=erp.tanzanite.site`，不能保留 `http://` 前缀。

## 8. 部署 ERP Stack

从 `server/.env.production.example` 创建 Hostinger Project Environment。至少替换：

```dotenv
IMAGE_TAG=sha-<tested-commit>
POSTGRES_USER=erp_prod
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=erp_prod
REDIS_PASSWORD=<strong-random-password>
JWT_SECRET=<at-least-64-random-characters>
INITIAL_ADMIN_PASSWORD=<one-time-strong-password>
TOPOLOGY_AUTH_PASSWORD=<strong-random-password>
ALERT_WEBHOOK_TOKEN=<strong-random-token>
ALLOWED_ORIGIN=https://erp.tanzanite.site
```

在 Hostinger Docker Manager 创建 Project：

```text
Project name: erp
Compose source: compose.prod.yml 的完整内容
Environment: 上述生产环境变量
```

验收项：

- `db`、`redis`、`search-engine`、`app`、`web` 均为 Healthy。
- `watchdog` 默认不启动；只有完成专项验收后才启用 profile。
- ERP Project 没有任何宿主机端口映射。
- `web` 同时加入 ERP 私有网络和 `tanzanite-edge`。
- 日志中没有 `CHANGE_ME`、认证失败循环或数据库迁移失败。

不要使用 Hostinger 的“删除 Project”来更新 ERP。删除接口可能同时清理网络、卷和镜像，数据 Stack 必须通过编辑 Compose、更新镜像标签或 Project Update 完成发布。

## 9. TLS 与 Cloudflare 切流

Caddy 自动申请并续期公开可信的 Let's Encrypt 证书，不再维护宿主机 Nginx Origin Certificate。Cloudflare CAA 已允许 Let's Encrypt。

切流步骤：

1. 保持旧 A 记录不变，先完成网关和 ERP 容器验收。
2. 将 Gateway Project Environment 中的 `ERP_SITE` 改为 `erp.tanzanite.site`，启用自动 TLS。
3. 将现有 `erp.tanzanite.site` A 记录 Content 改为 `2.25.85.201`，初次签发时临时设为 DNS only。
4. 等待 Caddy 日志显示证书签发成功。
5. 验证 `https://erp.tanzanite.site/api/v1/health` 和登录流程。
6. 将记录恢复为 Proxied。
7. Cloudflare Zone 和 ERP 主机级 Configuration Rule 均保持 `Full (strict)`，不得被旧规则覆盖为 `Full` 或 `Flexible`。
8. 对 `/api/*`、`/uploads/*` 和 `/sw.js` 配置 Bypass cache，并确认 WebSockets 可用。

切换时只更新现有 DNS 记录，不删除重建，以保留记录 ID 和审计连续性。

Cloudflare 安全规则：

- 免费版 Bot Fight Mode 无法按路径 Skip，会误伤 Postman、监控和程序化 API 客户端，因此该 Zone 保持关闭。
- Browser Integrity Check 继续全局启用，仅通过 Configuration Rule 对 `erp.tanzanite.site/api/*` 关闭。
- Cache Rule 对 `erp.tanzanite.site` 的 `/api/*`、`/uploads/*` 和 `/sw.js` 显式设置 `cache=false`。
- Minimum TLS 保持 `1.2`，`Always Use HTTPS` 和 WebSockets 保持启用。

## 10. 发布与回滚

正常发布：

1. CI、测试和镜像构建全部通过。
2. 记录新的 `sha-*` 标签。
3. 在 Hostinger ERP Project Environment 更新 `IMAGE_TAG`。
4. 执行 Project Update/Recreate。
5. 检查所有容器健康与业务烟测。

回滚：

1. 将 `IMAGE_TAG` 改回上一个已验证的 `sha-*` 标签。
2. 重新协调 ERP Project。
3. 验证健康接口、登录、上传和关键业务页面。

镜像回滚不能替代数据库迁移回滚。包含不可逆迁移的版本必须先有备份和独立回滚方案。

SSH 兼容发布路径：

```bash
cd /var/www/erp
./deploy.sh
```

该脚本只拉取镜像并运行 `compose.prod.yml`，不会在 VPS 构建源码、安装 pnpm 或管理宿主机 Nginx。

## 11. 备份与恢复

最低要求：

- PostgreSQL 每日逻辑备份。
- `erp-uploads` 每日增量备份。
- `erp-storage` 中的审计归档每日增量备份。
- Hostinger Snapshot 仅作为整机灾备，不能替代数据库备份。
- 每月至少执行一次恢复演练。

使用 SSH 时可执行：

```bash
docker compose --env-file server/.env -f compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > \
  "/opt/backups/erp/postgres-$(date +%Y%m%d-%H%M%S).dump"
```

备份目录必须位于 Project 数据卷之外，并同步到另一存储位置。只存在同一 VPS 磁盘上的备份不构成完整灾备。

## 12. 多项目接入流程

接入新项目时：

1. 完成代码、依赖、数据迁移和安全审计。
2. 新增独立生产 Dockerfile、镜像工作流和 Compose。
3. Compose 不发布宿主机端口，不使用固定容器名。
4. 只给 Web 入口设置唯一 edge alias，例如 `theme-web`。
5. 在共享网关增加域名到 alias 的路由。
6. 先启动容器并验证健康，再修改 Cloudflare DNS。
7. 为项目建立独立备份、回滚和资源预算。

不要为兼容开发 Compose 而改变共享网关、安全边界或端口策略；不符合基线的项目必须先改造。

## 13. MCP 使用规则

Hostinger MCP 默认保持只读，只开放项目、容器、日志、虚拟机、防火墙和操作状态查询。执行创建 Project、绑定公钥、修改防火墙等写操作时：

1. 临时开放精确工具。
2. 每次写入前读取当前状态。
3. 写入后轮询操作状态并执行独立验证。
4. 完成后恢复只读白名单。

Cloudflare MCP 可读写，但 DNS 写入必须满足：

- 新源站已健康。
- TLS 已准备。
- 已记录旧值和回滚值。
- 只更新目标记录，不批量修改无关记录。

## 14. 当前执行状态

- [x] Hostinger 防火墙仅开放 `22/80/443` 并已同步。
- [x] VPS Docker Manager 使用独立的 `tanzanite-edge` 和 `erp` Compose Projects。
- [x] `host-kernel-tuning` 已将宿主机 `vm.overcommit_memory` 固定为 `1`，满足 Redis 生产内存基线。
- [x] Hostinger 账号已注册本机公钥 `P16V-workstation`。
- [ ] Hostinger API 绑定公钥后 SSH 仍未接受该 key；需在 hPanel 控制台确认 authorized key 后再使用 SSH 路径。
- [x] `tanzanite-edge` Project 已部署，容器 Healthy，公网 `/__edge/health` 返回 `ok`。
- [x] GHCR 四个 ERP Package 已构建并确认可匿名拉取，生产使用不可变 `sha-*` 标签。
- [x] ERP Project 已创建，`db`、`redis`、`search-engine`、`app` 和 `web` 全部 Healthy。
- [x] Caddy 已为 `erp.tanzanite.site` 签发 Let's Encrypt 证书，源站 TLS 1.3 验证通过。
- [x] Cloudflare ERP A 记录已原位切换到 `2.25.85.201` 并恢复 Proxied。
- [x] Cloudflare Zone 与 ERP 主机规则均为 `Full (strict)`，WebSockets 和 Always Use HTTPS 已启用。
- [x] ERP API 客户端例外、动态路径 Cache Bypass 和未认证 WebSocket Upgrade 链路已验收。
- [x] Cloudflare Minimum TLS 已提升到 `1.2`，TLS 1.0 被拒绝且 TLS 1.2 API 验证返回 `200`。
- [ ] PostgreSQL 与上传文件备份已建立并完成恢复演练。
