# Hostinger VPS 快速部署与 Docker 运维手册

本文档是本项目在 Hostinger VPS 上长期运行的操作基线。它覆盖首次初始化、Docker 管理、多项目隔离、日常发布、备份、恢复和故障处理。

> 安全边界：本文只记录可公开的服务器标识，不记录 root 密码、SSH 私钥、数据库密码、JWT 密钥、Cloudflare Origin 私钥或其他生产秘密。

当前部署原则：第一阶段使用 `Git -> deploy.sh -> VPS 构建 -> Docker Compose` 发布链路，在 Hostinger 上全新初始化服务、Origin TLS 和 DNS；第二阶段再逐步引入 GHCR、全容器前端和 Docker Manager 原生 Stack。首次部署不依赖其他 VPS，也不要把两个阶段混在一起。

## 1. VPS 资产记录

| 项目 | 当前值 |
| --- | --- |
| 服务商 | Hostinger VPS |
| 管理入口 | `https://hpanel.hostinger.com/vps/1834903/docker-manager` |
| 区域 | United States - Boston 2 |
| 操作系统 | Ubuntu 24.04 LTS |
| 主机名 | `srv1834903.hstgr.cloud` |
| 公网 IPv4 | `2.25.85.201` |
| 初始 SSH 用户 | `root`，仅用于首次初始化和应急 |
| 日常 SSH 用户 | `deploy` |
| Hostinger 备份/快照 | 当前无可用恢复点；上线后确认计划，且不能替代数据库逻辑备份 |
| ERP 代码目录 | `/var/www/erp` |
| ERP 域名 | `erp.tanzanite.site` |

资产发生变化时只更新本表，不在仓库中保存任何凭据。

## 2. 目标架构

一台 VPS 可以运行多个项目，但只能有一个公共入口占用 `80/443`。每个项目必须拥有独立的 Compose 项目名、网络、数据卷、环境文件和备份目录。

```text
Internet
  -> Hostinger firewall
  -> Host Nginx / future shared gateway (80, 443)
      -> erp.tanzanite.site  -> 127.0.0.1:8020 -> ERP stack
      -> app2.example.com    -> 127.0.0.1:8120 -> Project B stack
      -> app3.example.com    -> 127.0.0.1:8220 -> Project C stack
```

ERP 当前端口基线：

| 用途 | 宿主机端口 | 容器端口 | 公网开放 |
| --- | ---: | ---: | --- |
| 前端 | `80/443` | 宿主机 Nginx 静态文件 | 是 |
| ERP API 入口 | `127.0.0.1:8020` | `nginx_lb:80` | 否 |
| Rust Search | `127.0.0.1:8030` | `8081` | 否 |
| PostgreSQL | `127.0.0.1:8040` | `5432` | 否 |
| Redis | `127.0.0.1:8050` | `6379` | 否 |
| Loki | `127.0.0.1:8060` | `3100` | 否 |
| Grafana | `127.0.0.1:8070` | `3000` | 否，需反向代理或 SSH 隧道 |

第二个项目建议使用 `8120-8170`，第三个项目使用 `8220-8270`。不要复用 ERP 的端口、容器名或数据目录。

## 3. 当前部署模式与长期方向

### 3.1 当前可执行模式

仓库当前使用混合部署：

- 前端在 VPS 上通过 pnpm 构建。
- `scripts/publish-frontend-release.sh` 将前端发布到 `.deploy-runtime/frontend`。
- 宿主机 Nginx 提供前端静态文件和 HTTPS。
- `server/docker-compose.yml` 运行 PostgreSQL、Redis、Rust Search、Go API、内部 Nginx 和可选 watchdog。
- 根目录 `deploy.sh` 拉取 `origin/master`、构建前端并调用 `server/deploy-prod.sh`。

当前阶段通过 SSH 在 `/var/www/erp` 执行 `./deploy.sh`，不需要把前端改成容器，也不需要先建设 GHCR。

在这个阶段，Hostinger Docker Manager 主要用于查看容器状态、日志、CPU/内存和手动重启。**不要在面板和 Git 仓库中同时维护两份 Compose**，否则会产生配置漂移。

### 3.2 长期推荐模式

长期应改为：

1. GitHub Actions 构建带 Git SHA 标签的前端、API、Search 镜像。
2. 镜像推送到 GHCR。
3. Hostinger Docker Manager 只拉取镜像，不在 VPS 编译源码。
4. 公共 Gateway Stack 独占 `80/443`。
5. 每个业务项目是独立 Compose Stack。
6. 发布和回滚只切换镜像标签。

在生产前端 Dockerfile、`compose.prod.yml` 和 GHCR 工作流完成前，不把当前 `server/docker-compose.yml` 原样粘贴到 Docker Manager。

## 4. 快速部署状态

仓库内已经完成的 Hostinger 兼容项：

- [x] 宿主机 Nginx 的 API、上传和指标代理指向 `127.0.0.1:8020`，与 Compose 的 `nginx_lb` 一致。
- [x] 两份兼容 Nginx 配置和根模板不再引用旧的宿主机 `8080`。
- [x] Compose 传入 `ENABLE_SWAGGER`、`TOPOLOGY_AUTH_PASSWORD` 和 `TRUSTED_PROXIES`，关键秘密缺失时直接终止。
- [x] `deploy` 用户可通过一次 `sudo` 验证完成目录属主调整、Nginx 配置安装和 reload。
- [x] Git 中的 Shell 脚本固定使用 LF，避免 Windows 提交后在 Ubuntu 出现解释器错误。

每次首次部署仍需人工确认：

- [ ] Hostinger 已创建生产 `server/.env`，且不存在 `CHANGE_ME`。
- [ ] Cloudflare Origin Certificate 已安装到规定路径。
- [ ] 本地执行 `pnpm run predeploy:check` 并通过。
- [ ] Hostinger 的 `8020-8070` 均未向公网开放。

固定 `container_name`、镜像流水线和 Docker Manager 原生 Stack 属于第二阶段优化，不阻塞这次单项目快速部署。同一台 VPS 增加第二个项目之前，必须先处理容器命名隔离。

## 5. Hostinger 初始设置

### 5.1 DNS

准备 Hostinger 时先保持 Cloudflare 中现有 A 记录不变，不要提前切流。最终切换后的记录为：

```text
erp.tanzanite.site -> 2.25.85.201
```

Cloudflare 设置：

- DNS Proxy status 使用橙色云朵 `Proxied`。
- SSL/TLS 模式使用 `Full (strict)`。
- 不使用 `Flexible`。
- Origin Certificate 私钥只保存在 VPS。
- Cache Rules 对 `/api/*`、`/uploads/*` 和 `/sw.js` 执行 `Bypass cache`。
- WebSockets 保持启用。

Cloudflare 代理记录的 TTL 通常显示为 `Auto`。切换前记录 A 记录的原值用于审计；切换时只修改现有记录的 Content，不删除并重建记录。

### 5.2 Hostinger 防火墙

只开放：

| 端口 | 来源 | 用途 |
| --- | --- | --- |
| `22/TCP` | 优先限制为管理员公网 IP | SSH |
| `80/TCP` | 任意 | HTTP 跳转和证书验证 |
| `443/TCP` | 任意 | HTTPS |

不要开放 `8020-8070`、`5432`、`6379`、`8080` 或 `8081`。Compose 内部服务必须使用 Docker 网络或绑定到 `127.0.0.1`。

注意：Docker 发布端口可能绕过部分 UFW 规则，因此真正的安全边界是 Compose 中的 `127.0.0.1:hostPort:containerPort` 和 Hostinger 外层防火墙。

上表的“任意”只用于首次部署和 Origin 直连验收。Cloudflare 切换稳定后，将 `80/443` 来源收紧为 [Cloudflare 官方 IPv4/IPv6 网段](https://www.cloudflare.com/ips/)，并同步审计 Nginx 中的 `set_real_ip_from` 列表。仅检查 `CF-Connecting-IP` 请求头不能阻止绕过，因为直连者可以伪造该请求头。收紧后若需直连排障，应临时添加管理员公网 IP，排障完成立即删除。

### 5.3 创建日常部署用户

首次使用 root 登录：

```bash
ssh root@2.25.85.201

apt update
apt upgrade -y
apt install -y git nginx ca-certificates curl openssl

# Hostinger Docker Manager 通常已完成 Docker 安装，先验证。
docker version
docker compose version

# 仅当上面两条命令不存在时使用 Ubuntu 包安装。
apt install -y docker.io docker-compose-v2
systemctl enable --now docker

adduser deploy
usermod -aG sudo deploy
usermod -aG docker deploy
mkdir -p /var/www/erp
chown -R deploy:deploy /var/www/erp
mkdir -p /opt/backups/erp
chown -R deploy:deploy /opt/backups/erp
chmod 700 /opt/backups/erp
```

如果 Docker 已由 Hostinger 安装，不要重复执行 `apt install docker.io`。只需确认 `docker compose version` 可用并把 `deploy` 加入现有 `docker` 组。

将本机 SSH 公钥加入 `/home/deploy/.ssh/authorized_keys`。打开第二个终端确认 `deploy` 可以登录并运行 `docker ps` 后，才能关闭 SSH 密码认证。不要在未验证密钥登录前禁用 root。

建议最终状态：

```text
PasswordAuthentication no
PermitRootLogin prohibit-password
```

修改后先执行 `sshd -t`，再执行 `systemctl reload ssh`。

### 5.4 资源检查

```bash
free -h
df -h
docker version
docker compose version
swapon --show
```

如果 VPS 内存较小且没有 swap，在首次前端/Rust/Go 同时构建前创建 swap。不要在磁盘空间不足时继续构建镜像。

## 6. GitHub 私有仓库访问

以 `deploy` 用户创建部署密钥：

```bash
sudo -iu deploy
ssh-keygen -t ed25519 -C "hostinger-erp-deploy"
cat ~/.ssh/id_ed25519.pub
```

把公钥添加到 GitHub 仓库 Deploy keys。只需要拉取时不要启用写权限。

验证并克隆：

```bash
ssh -T git@github.com
git clone git@github.com:tanzanite2025/erp-mes-crm-plm.git /var/www/erp
cd /var/www/erp
git remote -v
git branch --show-current
```

生产目录应固定在 `master`，不要直接在 VPS 修改源码。

## 7. 生产环境变量

创建 `/var/www/erp/server/.env`：

```bash
cd /var/www/erp/server
umask 077
cp .env.production.example .env
nano .env
chmod 600 .env
grep -nE '^[A-Za-z_][A-Za-z0-9_]*=CHANGE_ME' .env
```

最后一条命令必须没有输出；有输出时不得部署。

生产文件至少包含：

```dotenv
POSTGRES_USER=erp_prod
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_DB=erp_prod

REDIS_PASSWORD=<strong-random-password>

JWT_SECRET=<at-least-64-random-characters>
INITIAL_ADMIN_PASSWORD=<one-time-strong-password>
TOPOLOGY_AUTH_PASSWORD=<strong-random-password>
ALERT_WEBHOOK_TOKEN=<strong-random-token>

ALLOWED_ORIGIN=https://erp.tanzanite.site
TRUSTED_PROXIES=127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
GIN_MODE=release
ENABLE_SWAGGER=false

EXCHANGERATE_API_KEY=
GF_SECURITY_ADMIN_PASSWORD=

AI_PROXY_STREAM_TIMEOUT_MS=120000
AI_PROXY_ALLOW_PRIVATE_IP=false
AI_PROXY_ALLOWED_HOSTS=api.openai.com,generativelanguage.googleapis.com,api.minimax.io,api.minimaxi.com

XDFC_APP_UID=10001
XDFC_APP_GID=10001
```

生成随机值：

```bash
openssl rand -hex 32
```

PostgreSQL、Redis 和 JWT 等值优先使用十六进制随机串。当前 Compose 会把数据库密码拼入连接 URL，未经编码的 `@`、`:`、`/`、`?`、`#` 等字符可能破坏 URL。

规则：

- 不把 `.env` 放入 Git。
- 不在 Hostinger 截图、工单或聊天中发送秘密。
- 更换秘密时记录更换日期，但不记录旧值。
- `INITIAL_ADMIN_PASSWORD` 完成首次登录后立即更换。

## 8. HTTPS 方案

当前 `server/deploy-prod.sh` 期望：

```text
/etc/nginx/ssl/xdfc_origin.crt
/etc/nginx/ssl/xdfc_origin.key
```

使用 Cloudflare Origin Certificate 时，先在 Hostinger 上生成私钥和 CSR，避免私钥出现在浏览器、MCP 输出或聊天记录中：

```bash
sudo install -d -m 700 /etc/nginx/ssl
sudo openssl req -new -newkey rsa:2048 -nodes \
  -keyout /etc/nginx/ssl/xdfc_origin.key \
  -out /tmp/xdfc_origin.csr \
  -subj "/CN=erp.tanzanite.site" \
  -addext "subjectAltName=DNS:erp.tanzanite.site"
sudo chmod 600 /etc/nginx/ssl/xdfc_origin.key
sudo cat /tmp/xdfc_origin.csr
```

通过 Cloudflare Origin CA API 的 `POST /certificates` 提交上一步输出的 CSR；可以由已授权的 Cloudflare MCP 调用。请求使用 `request_type=origin-rsa`、`requested_validity=5475`，主机名至少包含 `erp.tanzanite.site`。MCP 只能提交 CSR，不得代为生成或返回私钥。将签发后的证书写入 `/etc/nginx/ssl/xdfc_origin.crt`，然后执行：

```bash
sudo chmod 644 /etc/nginx/ssl/xdfc_origin.crt
sudo chmod 600 /etc/nginx/ssl/xdfc_origin.key
sudo openssl x509 -in /etc/nginx/ssl/xdfc_origin.crt -noout -subject -issuer -dates -ext subjectAltName
sudo nginx -t
sudo rm -f /tmp/xdfc_origin.csr
```

Cloudflare Origin Certificate 只用于 Cloudflare 到源站的链路，普通浏览器或本机 `curl` 直连 Origin 时不会默认信任它，这是正常现象。公网验收必须经过 Cloudflare 并保持 `Full (strict)`。

不要使用仓库根目录或 `server/` 下的本地证书文件。证书私钥不能进入 Git。

如果不用 Cloudflare，应改用 Certbot/Let's Encrypt，并先修改部署脚本和 Nginx 证书路径；当前脚本不能自动完成这种切换。

## 9. Hostinger 快速部署

### 9.1 本地发布前检查

在开发机确认部署版本已经推送：

```bash
pnpm run predeploy:check
pnpm run build
git status
git push origin master
```

首次部署期间只使用一个明确的 `master` 提交；开始部署后，不再临时合入其他业务代码。

### 9.2 Hostinger 安装构建工具

当前部署脚本会在 VPS 构建前端，因此 Hostinger 需要 Node.js 22 LTS 和 pnpm 10.33.0。先检查：

```bash
node --version
corepack --version
pnpm --version
```

如果没有 Node.js 22，可按 NodeSource 的 Node.js 22 LTS 安装入口执行：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo corepack enable
sudo corepack prepare pnpm@10.33.0 --activate
node --version
pnpm --version
```

Go 和 Rust 均在 Docker 构建阶段使用，不需要安装到 Hostinger 宿主机。

### 9.3 Hostinger 部署前准备

完成第 5-8 节后，以 `deploy` 用户执行：

```bash
cd /var/www/erp
git fetch --all --prune
git reset --hard origin/master
chmod +x deploy.sh server/deploy-prod.sh scripts/publish-frontend-release.sh

cd server
docker compose --env-file .env config >/dev/null
```

此时不要修改 Cloudflare A 记录。

### 9.4 执行一键部署

```bash
cd /var/www/erp
./deploy.sh
```

`deploy.sh` 会同步 `origin/master`、安装依赖、构建并原子发布前端、构建后端容器、安装宿主机 Nginx 配置，然后 reload Nginx。第一次会要求一次 `sudo` 验证。

脚本会执行 `git reset --hard` 和带排除项的 `git clean`。运行数据只能放在 `.deploy-runtime`、`server/uploads`、`server/backups`、`server/postgres_data`、`server/redis_data` 或独立备份目录，不要在 VPS 直接修改 tracked 文件。

Redis 使用 `server/redis_data` 和 AOF 持久化。首次部署后立即开始 PostgreSQL、Redis 和 uploads 的定期备份。

### 9.5 切换 Cloudflare

切换 DNS 前从任意外部机器直连 Hostinger Origin 预验收：

```bash
curl -kfsS --resolve erp.tanzanite.site:443:2.25.85.201 \
  https://erp.tanzanite.site/api/v1/health
curl -kI --resolve erp.tanzanite.site:443:2.25.85.201 \
  https://erp.tanzanite.site/
```

这里的 `-k` 只用于切流前直连 Cloudflare Origin Certificate 的测试，不用于最终公网验收。确认正常后：

1. Cloudflare SSL/TLS 保持 `Full (strict)`。
2. 将 `erp.tanzanite.site` 的现有 A 记录 Content 改为 `2.25.85.201`。
3. 保持橙色云朵 `Proxied`。
4. 等待数分钟并执行正常公网检查。

```bash
curl -fsS https://erp.tanzanite.site/api/v1/health
curl -I https://erp.tanzanite.site/
```

本方案没有旧 VPS 回切依赖，因此只有完成 Origin 直连验收后才能修改 DNS。切流后若出现应用问题，先停止新增写入，再通过 Git revert、重新部署或 Hostinger 备份恢复处理；不要把 DNS 指向未经验证的旧源站。

### 9.6 首次验收

```bash
cd /var/www/erp/server
docker compose --env-file .env config >/dev/null
docker compose --env-file .env ps
docker compose --env-file .env logs --tail=100 app

curl -fsS http://127.0.0.1:8020/api/v1/health
sudo nginx -t
curl -fsS https://erp.tanzanite.site/api/v1/health
```

还应手动验证：

- 登录、退出和权限受限页面。
- 上传文件及 `/uploads/` 访问。
- 数据新增、编辑、删除和刷新后持久化。
- 全局搜索。
- WebSocket/实时通知。
- 重启一个 app 容器后服务可恢复。

## 10. Hostinger Docker Manager 使用规则

Hostinger Docker Manager 的长期用途：

- 查看 Stack 和容器状态。
- 查看日志、CPU、内存和重启次数。
- 在确认 Git 配置一致后重启单个服务。
- 未来使用 GHCR 镜像时更新镜像标签并重新部署。

禁止事项：

- 不在面板里临时改 Compose 后忘记同步 Git。
- 不在面板里粘贴生产秘密到可公开字段。
- 不删除数据库卷来解决启动失败。
- 不将 PostgreSQL、Redis、Search 端口发布为 `0.0.0.0`。
- 不用 `latest` 作为唯一生产镜像标签。

当前仓库没有前端生产 Dockerfile，因此面板不能独立部署完整 ERP。完成 `compose.prod.yml` 和镜像流水线前，面板是管理工具，不是部署配置的唯一来源。

### 10.1 未来的面板原生部署流程

只有在生产 Compose 全部改为 `image:` 引用、镜像已经推送到 GHCR 后，才按下面流程操作：

1. 打开 Hostinger Docker Manager 的 Compose 页面。
2. 创建独立项目，名称使用 `erp-prod`，不要使用 `default`。
3. 粘贴仓库中的 `compose.prod.yml`，不要直接粘贴开发用 `server/docker-compose.yml`。
4. 设置生产环境变量；敏感变量使用面板提供的私密变量能力，不能写进 Compose 文本。
5. 固定 `ERP_VERSION=<Git SHA>`，确认所有镜像标签属于同一次发布。
6. 先执行配置校验，再部署 Stack。
7. 查看所有容器健康状态和日志。
8. 验证内部健康检查后，再让共享 Gateway 路由流量。
9. 保留上一版本 Git SHA；回滚时只切回该版本并重新部署。

面板字段名称可能随 Hostinger UI 更新，但 Compose 项目隔离、不可变镜像标签和秘密不入库这三条规则不变。

### 10.2 Codex Hostinger MCP

`https://hpanel.hostinger.com/api` 是 Hostinger API Token 管理入口，不是 MCP URL。Codex 应连接 Hostinger 官方的 [API MCP Server](https://github.com/hostinger/api-mcp-server)：

```powershell
npm install -g hostinger-api-mcp@1.8.0
hostinger-vps-mcp --login
codex mcp get hostinger-vps
```

本机采用 stdio + OAuth，不把 `HOSTINGER_API_TOKEN` 写入 `config.toml`。官方 OAuth 凭据保存在 `%APPDATA%\hostinger-mcp\credentials.json`；不要提交或复制该文件。修改配置后需要重启 Codex。

配置使用两层隔离：用户级 `~/.codex/config.toml` 保存命令和只读工具白名单，但设置 `enabled = false`；本仓库本地的 `.codex/config.toml` 只负责设置 `enabled = true`，并由 `.gitignore` 排除。用户级配置仅将本仓库路径标记为 trusted，因此切换到其他项目时 Hostinger MCP 保持禁用。

安全基线：

- 使用范围较小的 `hostinger-vps-mcp`，不加载包含账单、域名和托管站点的全部 219 个工具。
- 初始 `enabled_tools` 只允许 GET 类的 VPS、Docker 项目、日志、指标、备份和防火墙查询。
- 不开放列出账号下全部 VPS、全部防火墙等账号级发现工具；本项目操作固定以 VPS `1834903` 为目标。
- 不默认开放重装 VPS、恢复备份、恢复快照、修改密码、删除项目或修改防火墙等操作。
- 需要写操作时只临时增加明确的单个工具，操作完成后从白名单移除。
- API Token 只适合 CI 或脚本；必须通过环境变量 `HOSTINGER_API_TOKEN` 注入，不能直接写进 Codex 配置或仓库。

项目级 MCP 只限制“哪个 Codex 项目能看到工具”，不是 Hostinger 账号内部的硬资源边界。Hostinger 官方 MCP 1.8.0 没有提供按 VPS ID 过滤的环境变量；如果未来多个敏感项目共用同一账号并开放写操作，应使用独立凭据/账号，或增加强制校验 VPS ID 和项目名的过滤代理。

### 10.3 Codex Cloudflare MCP

Codex 全局连接 Cloudflare 官方 API MCP：

```text
https://mcp.cloudflare.com/mcp
```

当前 OAuth 只申请账户发现、Zone 读取、DNS 记录读写、DNS 设置读取和 SSL 证书读写权限，不开放 Workers、R2、D1、Access 或密钥库。`docs` 和 `search` 工具可以自动执行，通用 `execute` 工具无论读写都必须先确认。

部署核对固定使用 Account `cf3d89270ea56d051da3fa5f25332d9b`、Zone `tanzanite.site`。切流前至少检查：

- `erp.tanzanite.site` 只有预期的 A 记录，保持 `Proxied` 和 `Auto TTL`。
- Edge Certificate 覆盖 `erp.tanzanite.site`。
- 新 Origin Certificate 使用 Hostinger 本机生成的 CSR，私钥不进入 MCP 输出。
- DNS 只在 Origin 直连、容器健康和 Nginx 校验全部通过后修改。

Cloudflare OAuth 当前对 Zone Settings、DNSSEC、Cache Rules 和 Page Rules 接口可能返回 `Unauthorized`。需要自动管理这些配置时，使用仅限 `tanzanite.site` 的专用 API Token，并通过环境变量注入；按实际操作授予 Zone Settings、Cache Rules 或 Page Rules 权限，不能把 Token 写入仓库或 `config.toml`。Cache Rules 写入还可能需要 Cloudflare 官方文档列出的 Account Rulesets 和 Account Filter Lists 权限，不要长期开放无关账户权限。

## 11. 多项目管理规范

建议目录：

```text
/opt/stacks/gateway
/opt/stacks/erp
/opt/stacks/project-b
/opt/backups/erp
/opt/backups/project-b
/var/www/erp
```

每个项目必须有：

- 独立域名或子域名。
- 独立 Compose project name，例如 `erp-prod`。
- 独立 `.env`。
- 独立 Docker 网络。
- 独立数据库和 Redis 数据卷。
- 独立 uploads 和 backups。
- 独立端口段。

运行 Compose 时显式指定项目名：

```bash
docker compose -p erp-prod --env-file .env up -d
docker compose -p project-b-prod --env-file .env up -d
```

长期 Compose 不使用固定 `container_name`。Docker 自动生成的 `project-service-index` 名称可以避免不同项目互相覆盖。

## 12. 日常发布

开发机：

```bash
pnpm run predeploy:check
git push origin master
```

VPS：

```bash
sudo -iu deploy
cd /var/www/erp
./deploy.sh
```

发布后：

```bash
cd /var/www/erp/server
docker compose --env-file .env ps
docker compose --env-file .env logs --tail=100 app
curl -fsS http://127.0.0.1:8020/api/v1/health
curl -fsS https://erp.tanzanite.site/api/v1/health
```

不允许在没有备份和健康检查的情况下执行数据库结构变更。

## 13. 备份策略

Hostinger 整机快照只能作为灾难恢复手段，不能替代以下备份。

### 13.1 PostgreSQL 每日逻辑备份

```bash
mkdir -p /opt/backups/erp/postgres
cd /var/www/erp/server

docker compose --env-file .env exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > /opt/backups/erp/postgres/erp-$(date +%F-%H%M%S).dump
```

### 13.2 上传文件

```bash
mkdir -p /opt/backups/erp/uploads
tar -C /var/www/erp/server -czf \
  /opt/backups/erp/uploads/uploads-$(date +%F-%H%M%S).tar.gz uploads
```

### 13.3 Redis

```bash
mkdir -p /opt/backups/erp/redis
cd /var/www/erp/server
set -a
source .env
set +a

docker compose --env-file .env exec -T \
  -e REDISCLI_AUTH="$REDIS_PASSWORD" redis redis-cli SAVE
docker compose --env-file .env cp redis:/data/dump.rdb \
  /opt/backups/erp/redis/redis-$(date +%F-%H%M%S).rdb
```

### 13.4 保留策略

- 每日备份保留 14 天。
- 每周备份保留 8 周。
- 每月至少一次恢复演练。
- 至少一份副本离开 VPS，可使用加密对象存储、另一台主机或受控本地存储。
- `server/.env` 需要加密备份，不能明文同步到公共存储。

## 14. 恢复演练

恢复前先停止写入，并创建现状备份。示例：

```bash
cd /var/www/erp/server
docker compose --env-file .env stop app nginx_lb

cat /opt/backups/erp/postgres/<backup>.dump | \
  docker compose --env-file .env exec -T db \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists'

docker compose --env-file .env start app nginx_lb
```

恢复命令会覆盖数据库。只能在确认备份文件、目标数据库和停写窗口后执行。
如果生产环境正在运行 watchdog，恢复前后应分别停止和启动它。

Redis 恢复必须和应用停写一起执行。停止 `app`、`watchdog`、`nginx_lb` 和 `redis`，把当前 `server/redis_data` 移到带时间戳的保留目录，再创建空的 `redis_data` 并把目标 RDB 放为 `redis_data/dump.rdb`，最后先启动 Redis、确认 `PONG`，再启动应用。不要直接覆盖正在运行的 AOF 目录。

## 15. 回滚

### 15.1 前端

前端发布保留最近 5 个 release。检查：

```bash
ls -lah /var/www/erp/.deploy-runtime/frontend/releases
readlink -f /var/www/erp/.deploy-runtime/frontend/current
```

切换前保存当前 release 路径。切换完成后执行 `nginx -t` 并验证页面。

### 15.2 后端

当前后端镜像在 VPS 本地重建，尚未使用不可变 Git SHA 标签。标准回滚方式是在 GitHub 对问题提交执行 `git revert`，推送 `master`，然后重新执行 `./deploy.sh`。

不要只在 VPS `git reset` 到旧提交，因为下一次 `deploy.sh` 会再次强制同步 `origin/master`。

数据库迁移回滚必须单独评估。代码回滚不等于数据结构自动回滚。

## 16. 常见故障处理

### 16.1 网站 502

```bash
nginx -t
systemctl status nginx --no-pager
curl -v http://127.0.0.1:8020/api/v1/health
cd /var/www/erp/server
docker compose --env-file .env ps
docker compose --env-file .env logs --tail=200 nginx_lb app
```

重点检查宿主机 Nginx 是否代理到 `127.0.0.1:8020`。

### 16.2 app 反复重启

```bash
docker compose --env-file .env logs --tail=300 app
docker compose --env-file .env exec db pg_isready
docker compose --env-file .env exec redis \
  sh -c 'REDISCLI_AUTH="$REDIS_PASSWORD" redis-cli ping'
```

优先检查环境变量、数据库凭据、挂载目录权限和端口冲突。不要先删卷。

### 16.3 磁盘空间不足

```bash
df -h
docker system df
du -sh /var/www/erp/server/postgres_data
du -sh /var/www/erp/server/redis_data
du -sh /var/www/erp/server/uploads
du -sh /opt/backups/erp
```

只清理确认无用的旧构建和过期备份。不要执行 `docker system prune --volumes`。

### 16.4 容器启动但业务不可用

```bash
curl -fsS http://127.0.0.1:8020/api/v1/health
curl -fsS http://127.0.0.1:8030/v1/health
docker compose --env-file .env logs --since=15m app search-engine
```

## 17. 固定巡检周期

每日：

- 容器健康状态和重启次数。
- API 健康检查。
- PostgreSQL 备份是否生成。
- Redis RDB 备份是否生成。
- 磁盘使用率。

每周：

- Hostinger 快照状态。
- 上传文件备份。
- Docker 镜像和构建缓存占用。
- 系统安全更新。

每月：

- 数据库恢复演练。
- SSH 用户和密钥审计。
- 防火墙规则审计。
- Cloudflare 官方源站网段变更审计。
- 生产秘密轮换计划。
- 检查项目间端口、卷和网络是否发生冲突。

## 18. 生产上线验收记录

每次新 VPS 或重大部署变更复制以下清单到运维工单：

- [ ] DNS 指向正确。
- [ ] SSH 密钥登录成功。
- [ ] root 密码登录已按计划限制。
- [ ] Hostinger 防火墙只开放 `22/80/443`。
- [ ] 生产 `.env` 权限为 `600`。
- [ ] Docker 服务全部 healthy。
- [ ] `http://127.0.0.1:8020/api/v1/health` 正常。
- [ ] HTTPS 证书链正常。
- [ ] 登录、权限、上传、搜索和通知正常。
- [ ] PostgreSQL 备份成功。
- [ ] Redis RDB 备份成功。
- [ ] 备份已复制到 VPS 外。
- [ ] 已记录当前 Git commit。
- [ ] 已完成一次回滚或恢复演练。

## 19. 后续平台化任务

为了让 Hostinger Docker Manager 成为完整部署入口，后续按此顺序实施：

1. 新增前端多阶段 Dockerfile。
2. 新增生产专用 `compose.prod.yml`。
3. 移除固定 `container_name`。
4. 将 monitoring 放入 Compose profile。
5. 新增共享 Gateway Stack。
6. GitHub Actions 构建并推送 GHCR 镜像。
7. 镜像使用 Git SHA 和语义版本双标签。
8. Docker Manager 中每个项目创建独立 Stack。
9. 发布脚本改为切换镜像标签并保留上一版本。
10. 自动执行异地备份与恢复验证。

在这些任务完成前，继续以 Git 中的部署脚本为配置源，Hostinger Docker Manager 作为状态和日志管理界面。
