# XDFC ERP 生产环境部署清单 (PRODUCTION_CHECKLIST)

为了确保系统在生产环境（公网/云端）稳定运行，请务必在服务器上配置以下环境变量。

## 1. 后端服务 (Golang Server)

| 变量名 | 必填 | 示例值 | 作用描述 |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | 是 | `postgres://user:pass@host:5432/dbname` | PostgreSQL 数据库连接字符串 |
| `JWT_SECRET` | 是 | `your_long_random_secure_string` | 用户鉴权令牌的签名密钥（严禁泄露） |
| `ALLOWED_ORIGIN` | 是 | `https://your-domain.com` | **核心**：允许跨域的域名。支持逗号分隔或 `*` |
| `GIN_MODE` | 否 | `release` | 设置为 `release` 可关闭调试日志并提升性能 |
| `PORT` | 否 | `8080` | 后端监听端口 |
| `INITIAL_ADMIN_PASSWORD` | 是 | `your_secure_password` | **核心**：系统首次启动时初始管理员的密码 |
| `AI_PROXY_STREAM_TIMEOUT_MS` | 建议 | `120000` | AI 代理流式超时（毫秒）。建议生产环境 >= 120000，MiniMax 2.7 可设 180000 |

> [!IMPORTANT]
> **关于 CORS**：如果前端使用 HTTPS 访问，`ALLOWED_ORIGIN` 必须包含 `https://` 前缀。如果登录报“网络请求失败”，请优先检查此项。

---

## 2. 前端应用 (React Frontend)

前端环境变量在**构建 (Build) 阶段**注入。如果使用 Docker 或 CI/CD，请确保构建命令中包含：

| 变量名 | 必填 | 示例值 | 作用描述 |
| :--- | :--- | :--- | :--- |
| `VITE_API_BASE_URL` | 是 | `https://api.your-domain.com` | 指向后端 API 的公网根地址 |

> [!WARNING]
> 如果构建时未设置此变量，前端将默认请求 `localhost:8080`，导致公网用户无法访问。

---

---

## 4. 全自动原子化部署 (Recommended)

项目根目录已集成加固版的 `deploy.sh`。该脚本已内置 **路径自适应 (Self-Aware)** 机制，无论您在服务器哪个位置执行，都会自动定位至根目录并物理消除 Git 冲突（由于自动生成文件引起）。

**推荐操作指令** (确保物理定位正确):
```bash
# 切换到项目根目录并执行一键加固部署
cd /var/www/erp && chmod +x deploy.sh && ./deploy.sh
```

> [!TIP]
> 即使您通过绝对路径（如 `/var/www/erp/deploy.sh`）直接调用，脚本也会自动切换至 `/var/www/erp` 执行任务，确保全链路文件路径一致。
