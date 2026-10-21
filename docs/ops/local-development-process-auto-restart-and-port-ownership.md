# 本地开发进程自动重启

在仓库根目录执行 `npm run dev`（或 `pnpm run dev`），会自动停止本仓库上次启动的前后端进程，编译当前后端代码并启动新服务。无需手动结束旧进程或修改开发端口。

```powershell
npm run dev
```

需要独立调试时：

```powershell
npm run dev:frontend
npm run dev:server
```

这两个命令只接管所选服务；例如原先通过完整 `dev` 启动后，再执行 `dev:frontend`，后端会继续运行。`dev:prepare` 只准备基础服务和生成文件，不会接管应用进程。PostgreSQL、Redis 和搜索服务仍由 Docker Compose 管理。

脚本在 `output/local-development-process-state/` 记录应用进程的 PID、启动时间、命令和仓库路径。重新启动时先核对进程身份，再终止旧进程；PID 被系统复用时不会仅凭旧记录结束新进程。手动启动且命令明确包含本仓库 Vite 入口或本仓库开发后端可执行文件的监听进程，也可以自动接管。

如果端口属于其他项目，或旧进程无法确认归属，启动会显示占用端口和 PID，保留该进程。此时可以手动停止对应服务，或在 `server/.env.dev` 调整 `DEV_FRONTEND_PORT` / `DEV_BACKEND_PORT`。同一次启动会先检查全部目标端口，避免发现外部占用前已经停止了一半旧服务。

同时启动多个命令时，会通过启动锁顺序处理，避免互相清理尚未启动完的进程。上一次启动异常退出后，下一次会核对并回收失效的锁和进程记录。正常按 `Ctrl+C` 会结束该终端仍持有的应用进程并清理登记。

后端编译产物位于 `server/tmp/local-development-backend-api-server.exe`（非 Windows 无 `.exe`）。脚本直接管理后端进程，减少 `go run` 包装进程退出后子进程残留的情况。编译产物、进程记录和基础服务数据均不进入 Git；自动重启不会重置数据库。

回归检查：

```powershell
node --test scripts/local-development-service-port-overrides-and-listener-conflict-validation.spec.mjs scripts/local-development-owned-process-auto-restart-and-concurrent-startup.spec.mjs
```
