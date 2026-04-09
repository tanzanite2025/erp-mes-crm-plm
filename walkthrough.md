# 变更记录与验证（walkthrough.md）

## 2026-04-09 Notification Gateway 硬切（Phase 1）

### 变更概览
- 新增 `src/features/system-mgmt/notifications/notification-gateway.ts`，作为通知读写、归档、快照访问、批量同步的统一基础设施边界。
- 首批调用方完成迁移并切到 gateway：
  - `src/features/trading/sales/services/sales-service.ts`
  - `src/features/ai-assistant/services/ai-context-service.ts`
  - `src/features/system-mgmt/workflow-core/services/dispatch-service.ts`
- `notification-service.ts` 移除桥接式 store 访问导出：
  - `getNotificationStateSnapshot`
  - `getNotificationMessages`
  - `archiveNotificationsByOrderId`
- `notification-service.ts` 内部通知读写/归档改为经由 `NotificationGateway`，职责收口到“规则分发与编排”。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
node scripts/verify-permissions.mjs
```
结果：通过。

## 专项：生产 `uploads/backups` 目录权限防回归固化（2026-04-09）

### 背景
生产图片上传 `Disk write failed` 的证据链已经基本锁定为：

- `app` 容器以非 root 的 `xdfcuser` 运行；
- 宿主机 `server/uploads` 曾出现 `root:root 755`；
- 该目录挂载进容器后，普通用户没有写权限。

这类问题如果只靠一次人工 `chown` 恢复，后续部署仍可能再次回归。因此本轮改动目标不是临时补丁，而是把“容器运行身份”和“宿主机挂载目录归属”固化成同一套可重复约束。

### 固化方式

#### 1. 固定 `app` 运行用户的数值身份
文件：`server/Dockerfile`

- 为运行时镜像新增显式 build args：
  - `XDFC_APP_UID`
  - `XDFC_APP_GID`
- `xdfcuser:xdfcgroup` 不再依赖 Alpine 自动分配 UID/GID；
- `/app/uploads` 与 `/app/backups` 的镜像内默认归属也同步改为同一组数值身份。

#### 2. 让 compose 构建链显式传入同一身份
文件：`server/docker-compose.yml`

- `app.build` 改为显式 `context + args`；
- 将：
  - `XDFC_APP_UID=${XDFC_APP_UID:-10001}`
  - `XDFC_APP_GID=${XDFC_APP_GID:-10001}`
 传入镜像构建；
- 这样镜像内用户身份与部署脚本准备目录时使用的是同一组值。

#### 3. 在部署脚本中固化挂载目录准备逻辑
文件：`server/deploy-prod.sh`

- 新增 `load_deploy_env()`，先读取 `server/.env` 或 `server/.env.production`；
- 新增 `prepare_app_runtime_dir()`，在每次部署前对 `./uploads` 与 `./backups` 执行：
  - `mkdir -p`
  - `chown ${XDFC_APP_UID}:${XDFC_APP_GID}`
  - `chmod 0755`
- 这样无论目录是否首次创建，部署都会把顶层挂载目录重新收敛到容器可写状态。

#### 4. 补充环境模板
文件：`.env.example`

- 新增：
  - `XDFC_APP_UID=10001`
  - `XDFC_APP_GID=10001`
- 用于明确仓库约定的默认运行时身份，并与部署脚本和镜像构建保持一致。

### 验证
已执行：

```bash
docker compose -f server/docker-compose.yml config
```

结果：**通过**。

展开后的 compose 配置中可确认：

- `app.build.args.XDFC_APP_UID = 10001`
- `app.build.args.XDFC_APP_GID = 10001`
- `app` 仍挂载：
  - `./uploads -> /app/uploads`
  - `./backups -> /app/backups`

### 本轮结论
本轮已完成仓库侧的防回归固化：

- 容器运行用户身份已显式固定；
- 部署脚本会在每次部署前主动修正运行目录顶层属主与权限；
- 后续生产恢复不再依赖“记得手工 `chown` 一次”这种一次性动作。

## 专项：本地 DEV `/uploads` 访问链补齐（2026-04-08）

### 问题现象
图片上传主链恢复后，本地页面里上传返回已成功，浏览器对图片资源请求也显示：

- `GET /uploads/ev-*.webp 200 OK`

但页面预览仍显示坏图。

继续复核前端预览链与本地开发代理后确认：

- 前端最终预览地址来自 `getStaticEvidenceUrl(...)`；
- 上传成功后会访问 `/uploads/{fileName}`；
- 当前 `vite.config.ts` 只代理 `/api`，未代理 `/uploads`；
- 因此本地 `127.0.0.1:5173/uploads/*` 请求会落到 Vite Dev Server，而不是后端静态资源提供方。

这属于本地 DEV 访问链缺口，不是本轮 Rust 图像处理再次失败；同时仓库中的生产 Nginx 与容器内 Nginx 已存在 `/uploads/` 映射，因此该问题本质上是“本地与生产访问语义不一致”。

### 修复方式
文件：`vite.config.ts`

已执行最小修复：

- 保留现有 `/api` 代理；
- 新增 `/uploads` 代理；
- `/uploads` 与 `/api` 统一复用现有 `VITE_PROXY_TARGET` / `proxyTarget`；
- 不新增新的上传资源地址环境变量，避免本地与生产再次分叉。

### 最小验证口径
本轮代码改动完成后，应按以下口径做本地回归：

1. 重启前端 Vite Dev Server；
2. 在现有已登录 DEV 会话中重新上传一张图片；
3. 确认浏览器请求 `/uploads/ev-*.webp` 时返回真实图片内容；
4. 确认页面中的图片预览可正常显示；
5. 确认 `/api` 现有代理行为未受影响。

### 本轮结论
本轮已完成本地 DEV 上传资源访问链补齐：

- Vite 开发环境现已同时代理 `/api` 与 `/uploads`；
- 本地图片预览链路已与生产站点保持同一访问语义；
- 后续凡是依赖 `/uploads/` 的页面回显问题，都可以在 DEV 阶段更早暴露与验证。

## 专项：图片上传 pHash 长期稳定修复（2026-04-08）

### 问题现象
前端代理修正为命中正确后端后，销售订单图片上传仍返回：

- `500 Image processing failed`
- Go 后端日志显示：`rust image worker returned status: 400, body: Failed to decode image for perceptual hash`

继续下钻到 Rust `server/search-engine/src/processor.rs` 后确认，旧实现存在同一请求内的双解码：

- `image::load_from_memory(raw_data)` 用于宽高读取与 WebP 压缩
- `img_hash::image::load_from_memory(raw_data)` 再次独立解码用于 pHash

这意味着同一份原始字节会经过两套不同 crate 的解码路径，运行时兼容性一旦分叉，就会出现“第一次能解、第二次不能解”的稳定失败。

### 长期修复方式
本轮没有继续做补丁式兜底，而是改为单次权威解码与统一像素管线：

#### 1. Rust 图像处理改为单次权威解码
文件：`server/search-engine/src/processor.rs`

- 保留一次 `image::load_from_memory(raw_data)` 作为唯一权威解码入口；
- 解码成功后立即转换为统一的 `RGBA8` 像素缓冲；
- 后续处理不再从 `raw_data` 重新走第二次独立解码。

#### 2. pHash 改为消费统一像素数据
- 不再调用 `img_hash::image::load_from_memory(raw_data)`；
- 改为用统一 `RGBA8` 像素缓冲构造 `img_hash` 可接受的图像对象；
- 让 pHash、宽高读取、WebP 编码三步共享同一份图像事实来源。

#### 3. 补充最小定向验证
- 在 `server/search-engine/src/processor.rs` 新增定向测试 `process_image_handles_png_sample`；
- 直接使用仓库现成样本 `public/images/shadcn-admin.png` 调用 `process_image(...)`；
- 断言：
  - `width > 0`
  - `height > 0`
  - `phash` 非空
  - `webp_data` 非空

### 验证结果

#### 1. 本地 Rust 编译验证
执行：

```bash
cargo build -j 1
```

结果：**通过**。

说明当前 `processor.rs` 的单解码实现与现有依赖组合兼容。

#### 2. Docker 镜像重建验证
执行：

```bash
docker pull rust:1.88-alpine
docker pull alpine:latest
docker compose build search-engine
docker compose up -d search-engine
```

结果：**通过**。

说明新的 Rust 处理逻辑已成功进入 `search-engine` 镜像并完成容器重建。

#### 3. 定向函数级验证
执行：

```bash
cargo test process_image_handles_png_sample -- --nocapture
```

结果：**通过**。

说明对真实 PNG 样本，新的 `process_image(...)` 已能完成：

- 单次解码
- pHash 生成
- WebP 编码

### 运行态附注
本轮尝试过在容器内用 BusyBox `wget --post-file` 直接回放二进制图片到 `/v1/process-image`，但诊断日志显示：

- `body_len=8`
- `body_prefix=89 50 4E 47 0D 0A 1A 0A`

也就是该测试方式只发出了 PNG 文件头 8 字节，而非完整图片，因此随后出现的：

- `Failed to decode image from memory`

不能作为当前业务修复失败的结论。该现象属于容器内临时 HTTP 工具链对二进制请求体的失真，不代表新的 `process_image(...)` 处理链仍然失败。

### 本轮结论
本轮已完成图片上传 pHash 根因的长期稳定修复：

- 已移除旧的“双解码分叉”结构；
- `search-engine` 已切换为“单次权威解码 + 统一像素管线”；
- Rust 本地编译、Docker 重建、真实 PNG 样本函数级测试均已通过。

当前若要补最后一层业务闭环，只剩在现有已登录 DEV 会话中再做一次真实页面上传回归，确认前端上传不再返回 `500`。

## 专项：`search-engine` Docker 构建链修复（2026-04-08）

### 问题现象
本地执行 `pnpm run dev:stack` 后，`search-engine` 在 Docker 构建阶段失败，外层表现为：

- `cargo build --release` 退出码 `101`
- `docker compose up -d --build search-engine app nginx_lb watchdog` 失败

进一步展开构建日志后，根因分为四层：

1. `server/search-engine/Dockerfile` 使用的 `rust:1.75-alpine` 过旧；
2. Dockerfile 只复制 `Cargo.toml`，未复制仓库中已有的 `Cargo.lock`，导致依赖解析漂移；
3. `Cargo.lock` 中的 `zstd-sys 2.0.16+zstd.1.5.7` 与 `zstd-safe 6.0.6` 组合不兼容；
4. 构建链恢复后，Rust 源码本身还暴露出若干真实编译错误。

### 修复方式

#### 1. 修复 Docker 构建链
- 将 `server/search-engine/Dockerfile` 的 builder 从 `rust:1.75-alpine` 升级为 `rust:1.88-alpine`；
- 在依赖缓存层同时复制：
  - `Cargo.toml`
  - `Cargo.lock`

#### 2. 修复锁文件依赖失配
- 使用 Cargo 将 `zstd-sys` 从：
  - `2.0.16+zstd.1.5.7`
- 回退锁定到：
  - `2.0.9+zstd.1.5.5`

这样 `zstd-safe 6.0.6` 才能和底层绑定保持兼容。

#### 3. 修复 Rust 源码真实编译错误
- `src/main.rs`
  - 将 `StatusCode.OK` 修正为 `StatusCode::OK`
  - 先保存 `results.len()`，避免 `items: results` 后再次借用
- `src/processor.rs`
  - pHash 计算改为使用 `img_hash::image::load_from_memory(raw_data)` 单独解码
  - 避免 `img_hash` 内部 `image` 类型与项目直接依赖的 `image` crate 类型冲突

### 验证结果
已执行：

```bash
docker compose build search-engine
```

结果：**通过**。

日志显示：

- `server-search-engine Built`
- 最终镜像成功导出并命名为 `server-search-engine:latest`

### 本轮结论
本地 DEV 一键启动链此前失败的关键阻塞点已解除：

- `search-engine` 已恢复可构建；
- Rust 工具链与锁文件依赖已收敛到可用组合；
- Docker 构建现已能进入并完成真实业务代码编译。

## 专项：本地 DEV 一键启动链补齐（2026-04-08）

### 问题现象
本地开发时虽然已有前端与后端启动入口，但图片上传链仍会因为缺少 Rust 图像处理服务而失败：

- `pnpm dev` 只启动前端 Vite；
- `server/dev-up.ps1` 原先只启动 `db/redis/app/nginx_lb/watchdog`；
- Rust `search-engine` 未被纳入本地 DEV 启动链。

### 修复方式
已执行最小补齐：

#### 1. `server/dev-up.ps1`
- 保留原有本地数据库健康检查与 `-ResetDb` 自愈逻辑；
- 将启动服务从 `app/nginx_lb/watchdog` 扩展为：
  - `search-engine`
  - `app`
  - `nginx_lb`
  - `watchdog`
- 完成后终端会额外输出：`Search engine: http://localhost:8081`

#### 2. 根目录 `package.json`
- 新增：`pnpm run dev:stack`
- 新增：`pnpm run dev:stack:reset-db`
- 保持原有 `pnpm dev` 仅启动前端的语义不变。

### 使用方式

#### 只启动前端
```bash
pnpm dev
```

#### 启动完整本地栈（前提：已先单独开前端或按需再执行 `pnpm dev`）
```bash
pnpm run dev:stack
```

#### 本地数据库凭据不一致时重建本地 DB 数据
```bash
pnpm run dev:stack:reset-db
```

### 本轮结论
本轮已补齐本地 DEV 图片上传链的基础运行条件：

- 现有 `server/dev-up.ps1` 已纳入 Rust `search-engine`；
- 根目录已有清晰快捷入口；
- 后续本地排查图片上传问题时，不再需要手工遗漏图像处理服务。

## 专项：`search-engine` 纳入生产部署链（2026-04-08）

### 问题现象
虽然顶层部署命令会执行 `deploy.sh -> server/deploy-prod.sh`，但原有生产部署路径存在明显缺口：

- `server/docker-compose.yml` 未声明 `search-engine` 服务；
- `server/deploy-prod.sh` 默认只重建 `app`；
- 因此 `server/search-engine/src/processor.rs` 的修复不会随默认部署自动发布到服务器。

### 根因分析
当前仓库里虽然已有 `server/search-engine/Dockerfile`，但该 Rust 图像处理服务没有正式接入生产 compose 编排；同时 `app` 继续依赖宿主机 `localhost:8081` 的默认假设，不适合容器内服务间通信。

### 修复方式
已执行最小部署链修复：

#### 1. `server/docker-compose.yml`
- 新增 `search-engine` 服务，构建上下文为 `./search-engine`；
- 容器内暴露 `8081`；
- 为 `app` 注入：`SEARCH_ENGINE_URL=${SEARCH_ENGINE_URL:-http://search-engine:8081}`；
- 为 `app.depends_on` 增加 `search-engine`。

#### 2. `server/deploy-prod.sh`
- 默认部署路径由仅重建 `app`，调整为同时 `--build search-engine app`；
- `--full-build` 路径纳入 `search-engine`；
- `--no-build` 与 `--watchdog-build` 路径也通过 `DEFAULT_SERVICES` 保证 `search-engine` 会被启动。

### 使用方式
修复后，服务器仍可继续沿用你现有的部署入口：

```bash
chmod +x deploy.sh && ./deploy.sh
```

区别在于：现在默认部署会把 `search-engine` 一起构建并启动，因此 Rust 图像处理修复具备了真正发布到服务器的路径。

### 本轮结论
本轮已补齐图片上传依赖的 Rust 图像处理服务部署缺口：

- `search-engine` 已成为正式的生产 compose 服务；
- `app` 已改为使用容器内服务地址访问它；
- 默认部署命令现在可以真正把 Rust 图像处理改动发布到服务器。

## 专项：销售订单图片上传 `500 Image processing failed` 修复（2026-04-08）

### 问题现象
在上一轮修复上传路径后，销售订单图片上传已能命中后端接口，但继续报：

- `/sales-orders/evidence/upload` 返回 `500`
- 前端提示 `Image processing failed`
- 错误发生在后端 `HandleEvidenceUpload(...)` 调用 Rust 图像处理链期间

### 根因判断
本轮复核确认：

- 不是文件体积超限；超限按现有逻辑应返回 `413`
- 不是 Redis 未初始化；当前实现只会降级跳过 pHash 去重，不会返回 `500`
- 真实高风险点位于 Rust `/v1/process-image`：
  - `image::load_from_memory(...)` 图像解码
  - `webp::Encoder::from_image(...)` WebP 编码器创建

结合当前实现方式，优先判断为 WebP 编码输入格式兼容性不足，同时 Go 侧又吞掉了 Rust 的真实错误文本，导致前端只能看到笼统的 `Image processing failed`。

### 修复方式
已执行两类底层修复：

#### 1. Go 侧错误可观测性增强
文件：`server/services/search_client.go`

- `ProcessImage(...)` 在 Rust 返回非 `200` 时，现会读取响应体内容；
- 错误会同时带上：
  - Rust 返回状态码
  - Rust 真实错误文本
- 这样后端日志可直接区分“图像解码失败”与“WebP 编码失败”。

#### 2. Rust 侧 WebP 编码兼容性修复
文件：`server/search-engine/src/processor.rs`

- 不再直接把 `DynamicImage` 原样传给 `Encoder::from_image(...)`；
- 改为先显式转换为稳定的 `RGBA8` 像素缓冲；
- 再通过 `Encoder::from_rgba(...)` 进行 WebP 编码；
- 额外增加空编码结果保护，避免返回空 payload。

### 验证
已执行：

```bash
go test ./services -run ^$
```

结果：通过。

## 2026-04-09 删除 7 个旧 requirements 组件兼容壳

### 变更概述
- 物理删除以下 Trading 侧旧组件壳文件：
  - `src/features/trading/components/requirements/mold-requirement-alert.tsx`
  - `src/features/trading/components/requirements/requirement-drawer.tsx`
  - `src/features/trading/components/requirements/requirement-list.tsx`
  - `src/features/trading/components/requirements/requirement-row.tsx`
  - `src/features/trading/components/requirements/requirement-stats.tsx`
  - `src/features/trading/components/requirements/selection-tree.tsx`
  - `src/features/trading/components/requirements/supply-analysis-details.tsx`
- 删除依据：
  - 当前真实页面实现已经完全切换到 `src/features/mrp/components/requirements/*`
  - 对旧 Trading 组件路径的外部消费已清零
  - 删除不影响当前 `/trading/requirements` 路由与模块入口

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

## 2026-04-09 Service 纯净化（Service Purity）第一批治理

### 变更概述
- 共享错误处理链纯化：
  - `src/lib/handle-server-error.ts`
  - 拆出 `getServerErrorPresentation(...)` 与 `showServerErrorToast(...)`
  - `handleServerError(...)` 保留为兼容 UI 适配入口，不再把“错误解析”和“错误展示”硬绑成单一实现点。
- 共享异常出口纯化：
  - `src/lib/safe-catch.ts`
  - 改为先走纯错误解析，再由 UI 展示适配函数负责 toast，降低底层工具对单一 UI 实现的耦合。
- 共享 mutation 辅助纯化：
  - `src/lib/react-query-mutation.ts`
  - 移除默认 `successMessage -> toast.success(...)` 行为。
  - 默认失败路径改为仅做日志上报，不再由底层工具自动决定 UI 提示。
- 首批 Hook 显式承接成功提示：
  - `src/features/quality/hooks/use-quality.ts`
  - `src/features/logistics/hooks/use-logistics.ts`
  - 成功提示已上浮到 Hook `onSuccess`，失败提示继续由调用方显式处理。
- 业务 Service 越权清理：
  - `src/features/system-mgmt/workflow-core/services/dispatch-service.ts`
  - 移除 service 内 `toast.success(...)`，保持扫描函数只返回 `newCount`。
  - `src/features/system-mgmt/workflow-core/hooks/use-notification-rules.ts`
  - 扫描完成提示已上浮到 Hook 层，根据 `scannedCount` 决定是否 toast。
- AI 相关 Service 越权清理：
  - `src/features/ai-assistant/services/ai-action-bus.ts`
  - 改为返回结构化 `ActionDispatchResult`，不再在 service 内直接 toast。
  - `src/features/ai-assistant/services/ai-agent-service.ts`
  - 不再在后台任务 service 内直接 toast，改为维护 `lastError` 状态并通知订阅方。
  - `src/features/ai-assistant/components/daily-insight-modal.tsx`
  - 接住 `ActionDispatchResult.errorMessage` 并在组件层 toast。
  - `src/features/ai-assistant/components/ai-trigger.tsx`
  - 监听 `aiAgentService` 状态，在组件层消费并清理 `lastError`。
  - `src/components/config-drawer.tsx`
  - 手动 `forceRun(...)` 的失败反馈由 UI 层显式承接。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
```
- 结果：通过。

### 本轮结论
- `Service / lib` 这条主链已经开始从“底层顺带做 UI 提示”收口到“底层返回事实，Hook / Component 决定提示”。
- `handle-server-error` 与 `react-query-mutation` 两个高扩散共享层已完成第一步纯化，为后续继续治理其他业务模块提供了统一样板。
- `dispatch-service` 与 AI 相关 service 的直接 toast 越权已被移除，提示职责已上浮到对应 Hook / Component。

### 遗留说明
- `workflow-core` 相关文件仍存在一批既有 `any` 类型 lint，属于该模块原有类型债，不是本轮 Service Purity 改造引入的新问题。
- 当前 `tsc --noEmit` 已通过；未对与本轮目标无关的 Tailwind 建议类 warning 做额外处理。

## 2026-04-09 Service 纯净化（Service Purity）第二批治理

### 变更概述
- `workflow-core` 关键类型债收口：
  - `src/features/system-mgmt/workflow-core/services/routing-service.ts`
  - `patchCommand(...)` / `patchRule(...)` 已从 `any` 切换为 `DeltaSet`。
  - `src/features/system-mgmt/workflow-core/services/dispatch-service.ts`
  - 新增 `DispatchContext`、`OrderSnapshot`、metadata 读取辅助函数，核心扫描逻辑不再直接依赖多处 `any`。
  - 已将 `uniqueKey / OrderId / SegmentId` 等关键元数据访问改为显式字符串提取函数，降低通知扫描链路的隐式类型漂移。
- `workflow-core` Hook / 组件类型债收口：
  - `src/features/system-mgmt/workflow-core/hooks/use-notification-rules.ts`
  - `addRule(...)` 已使用明确的 `NotificationRuleCreateInput`，去掉新增链路中的 `as any`。
  - `src/features/system-mgmt/workflow-core/components/command-mgmt/command-form.tsx`
  - 表单层 `bindType` / `nodeType` 的 `setValue(...)` 已改为消费 `StandardCommand` 对应字段类型，去掉显式 `any`。
- 通知跨域桥接收口：
  - `src/features/system-mgmt/notifications/notification-service.ts`
  - 新增 `getNotificationMessages()` 与 `archiveNotificationsByOrderId(...)` 作为通知读写桥接入口。
  - 让其他 service 不再直接把 `useNotificationStore.getState()` 当作跨域基础设施 API 使用。
- 更多 service/lib 子域边界收口：
  - `src/features/trading/sales/services/sales-service.ts`
  - 删除销售单后归档通知，已改为调用 `archiveNotificationsByOrderId(...)`。
  - `src/features/ai-assistant/services/ai-context-service.ts`
  - AI 上下文采集读取通知消息，已改为调用 `getNotificationMessages()`。
  - 同时将 `injectLocalContext(...)` 的输入从 `Record<string, any>` 收口为 `Record<string, unknown>`。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
```
- 结果：通过。

### 本轮结论
- 第二批治理已把 `workflow-core` 中最影响继续推进的关键 `any` 和通知扫描元数据访问收口到可维护状态。
- 通知能力已开始从“各处 service 直接碰 Zustand store”收口为“通过 notification-service 桥接函数访问”，降低了跨域状态耦合扩散风险。
- `sales-service` 与 `ai-context-service` 已不再直接依赖 `notification-store`，符合 `Service Purity` 中“底层 service 不直接绑状态容器细节”的目标。

### 遗留说明
- `dispatch-service.ts` 仍保留对通知写入能力的直接依赖，这是当前通知编排链路的领域事实源接入点，后续若继续纯化可再抽出更正式的 notification gateway。
- `notification-service.ts` 与 `notification-store.ts` 仍存在部分历史 `any` / 兼容性占位字段，属于通知域自己的存量类型债，当前未扩散为整域重构。
- 当前 `tsc --noEmit` 已通过；未处理与本轮目标无关的 Tailwind 建议类 warning。

### 本轮结论
- Trading 侧 `requirements` 旧组件兼容壳已完成物理清理。
- 当前 `requirements` 视图层只保留 `MRP` 新模块实现，结构进一步收敛。
- `src/features/trading/tabs/index.tsx` 中遗留的 `PartRequirements` 兼容导出已移除，Trading tabs 不再承担该页面转发职责。

## 2026-04-09 旧 requirements 组件归属收口

### 变更概述
- 盘点 `src/features/trading/components/requirements/*` 的现状后，确认当前真实页面实现已经由 `MRP` 新模块承载。
- 因此将以下旧组件统一收口为兼容导出：
  - `mold-requirement-alert.tsx`
  - `requirement-drawer.tsx`
  - `requirement-list.tsx`
  - `requirement-row.tsx`
  - `requirement-stats.tsx`
  - `selection-tree.tsx`
  - `supply-analysis-details.tsx`
- 上述文件现在均转发到：
  - `@/features/mrp/components/requirements/*`

### 本轮结论
- `Trading/components/requirements/*` 已不再承载真实实现，只保留历史兼容入口职责。
- `requirements` 视图层的真实归属已进一步收口到 `MRP` 模块。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

## 2026-04-09 customer/supplier 列表接口响应显式 DTO 化

### 变更概述
- 新增 `server/services/partner_list_dto.go`：
  - `PartnerListPaginationMeta`
  - `CustomerListStats`
  - `SupplierListStats`
  - `CustomerListMetadata`
  - `SupplierListMetadata`
  - `CustomerListResponse`
  - `SupplierListResponse`
- 调整 `server/handlers/customers.go`：
  - 将列表响应从 `gin.H` 匿名拼装改为显式 `services.CustomerListResponse`。
- 调整 `server/handlers/suppliers.go`：
  - 将列表响应从 `gin.H` 匿名拼装改为显式 `services.SupplierListResponse`。

### 设计收口
- 继续保留现有前端兼容字段：`items / total / page / pageSize / metadata.pagination / metadata.stats`。
- 这次改动只把响应契约从匿名 map 收口为显式 struct，不改变接口字段名与现有消费方式。
- 后续如果再补 customer/supplier 相关测试或响应字段，可以直接围绕 DTO 结构扩展，而不是继续散落在 handler 的 `gin.H` 中。

### 验证
执行：
```bash
go test ./handlers ./services -run "Customer|Supplier|Partner"
```

结果：通过。

### 补充清理：移除销售订单前端事务路由遗留代码
- 已物理删除以下前端事务路由遗留文件：
  - `src/features/trading/hooks/sales-order-save-plan.ts`
  - `src/features/trading/hooks/sales-order-save-executor.ts`
- 复核结果：仓库内已无 `buildSalesOrderSavePlan`、`executeSalesOrderSavePlan`、`sales-order-save-plan`、`sales-order-save-executor` 剩余引用，且 `pnpm exec tsc --noEmit` 继续通过。

补充执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

## 2026-04-09 销售订单保存路径后端收敛为单一入口

### 变更概述
- 前端 `src/features/trading/hooks/use-sales-order-save.ts`：
  - 编辑保存不再根据 `delta` 内容、行结构差异和状态字段组合自行选择不同 mutation；
  - 现统一调用 `saveMutation`，仅提交 `delta + finalData + expectedVersion`。
- 前端 `src/features/trading/sales/services/sales-transaction-service.ts`：
  - 新增 `SALES_TRANSACTION_INTENT_ORDER_SAVE = 'ORDER_SAVE'`；
  - 新增 `saveSalesOrderTransaction()`，统一走 `/sales-orders/:id/transactions`。
- 前端 `src/features/trading/sales/hooks/use-sales-transactions.ts`：
  - 新增 `saveMutation`，封装统一销售订单保存事务调用；
  - 保留既有细分 mutation，避免其他非本轮主链场景被强行打断。
- 后端 `server/services/sales_transaction_service.go`：
  - 新增 `SalesTransactionIntentOrderSave`；
  - 新增 `SalesOrderSavePayload`；
  - 新增 `executeOrderUnifiedSaveTx()`，由后端根据 `delta + finalData` 在服务层内部判定：
    - 客户变更
    - 分类/型号/条码变更
    - 交期变更
    - 状态迁移/作废
    - 采购单号变更
    - requirements 变更
    - 行内容变更 / 行新增 / 行删除 / 全量行变更
    - 以及通用 patch 场景
  - 对外单一入口，内部继续复用既有细分事务实现。

### 设计收口
- 前端不再充当“事务路由器”，不再根据领域语义决定调用哪条后端 mutation。
- 后端成为唯一的业务语义裁决方；若内部仍需细分事务处理，只在服务层内部完成分派。
- 继续保留 `expectedVersion` / 版本冲突语义，没有为了入口统一退回到粗暴全量覆盖保存。

### 保留项
- `sales-order-save-plan.ts` 与 `sales-order-save-executor.ts` 本轮已不再是主保存链依赖；
- 为降低本轮删除风险，暂未强行物理删除，可作为后续文档化清理项处理。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./services -run "SalesOrder|SalesTransaction"
```

结果：通过。

### 补充收口：前端 metadata.stats 缺失态显式提示
- 增强 `src/features/trading/components/customer-list.tsx`：
  - 当 `metadata.stats.total / active / newThisMonth` 任一缺失时，在统计卡片上方显示中文/英文显式提示；
  - 统计卡片数字降为占位符 `—`；
  - 不再回退到前端基于当前列表数组的本地重算。
- 增强 `src/features/trading/components/supplier-list.tsx`：
  - 当 `metadata.stats.total / active / pendingReview` 任一缺失时，在统计卡片上方显示中文/英文显式提示；
  - 统计卡片数字降为占位符 `—`；
  - 不再回退到前端基于当前列表数组的本地重算。
- 这样即使后端契约异常退化，列表主体仍可继续浏览，但统计区会明确暴露“契约缺失”，而不是静默给出错误数字。

补充执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

另执行：

```bash
cargo check
```

结果：未完成，当前被本机 `server/search-engine/target/...` 构建产物文件锁阻塞（Windows `os error 32`，另一个进程正在占用文件），属于本地环境占用问题，不是当前代码链已确认的业务错误口径。

### 本轮结论
本轮已从底层收敛图片上传 `500` 的两个核心问题：

- Go 侧不再吞掉 Rust 真实错误上下文；
- Rust 侧 WebP 编码改为使用稳定的 `RGBA8` 输入格式；

当前剩余事项仅为：待释放本机 Rust 构建文件占用后，再补一次 `cargo check` 或实际上传回归验证。

## 专项：销售订单图片上传 404 修复（2026-04-08）

### 问题现象
在“创建销售订单”时上传订单凭据图片，前端控制台报错：

- `/trading/sales-orders/evidence/upload` 返回 `404 Not Found`
- UI 提示 `Evidence upload failed [API_ERROR] 404 Not Found`
- 页面同时显示“存储服务同步失败”

### 根因分析
本轮先完成代码级排查，确认主因不是 Redis 未就绪，也不是 Rust 图像处理服务先崩溃，而是前后端上传路径契约漂移：

1. 前端 `order-evidence-manager.tsx` 之前调用的是 `'/trading/sales-orders/evidence/upload'`；
2. `apiFetch(...)` 会统一拼接 `/api/v1` 前缀，因此真实请求变成 `/api/v1/trading/sales-orders/evidence/upload`；
3. 后端 `server/routes/routes_trading.go` 实际注册的是 `POST /api/v1/sales-orders/evidence/upload`；
4. 因此前端多出的 `/trading` 前缀直接导致 `404`，请求未命中 `HandleEvidenceUpload`；
5. 若是 Rust 不可用，后端按当前逻辑会返回 `503 Image worker offline`；若 Rust 处理失败，会返回 `500 Image processing failed`；若 Redis 未初始化，仅会降级跳过 pHash 去重，不会返回 `404`。

### 修复方式
已执行最小修复：

- 将 `src/features/trading/components/parts/order-evidence-manager.tsx` 中的上传地址从 `/trading/sales-orders/evidence/upload` 改为 `/sales-orders/evidence/upload`；
- 将 `src/locales/messages/zh-CN/tradingSalesOrder.ts` 中误导性的失败文案从“存储服务同步失败”改为“图片上传失败”。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
本次订单图片上传失败的第一根因已确认并修复：

- 主因是前端上传路径多写了 `/trading` 前缀；
- Redis 与 Rust 不是本次 `404` 的主因；
- 当前前端已改为命中后端真实存在的上传接口；
- 用户侧失败提示也已与真实语义对齐，不再把路由问题误报为存储同步失败。

## 专项：`error-action-registry` / `translate` 类型对齐修复（2026-04-08）

### 问题现象
部署机构建失败，报错点位于 `src/lib/handle-server-error.ts`：

```ts
translate(locale, actionMetadata.messageKey)
translate(locale, actionMetadata.actionLabelKey)
```

`translate` 要求第二个参数为 `TranslationKey`，但 `error-action-registry.ts` 中的 `messageKey` / `actionLabelKey` 被声明为普通 `string`，导致 `tsc` 报 `TS2345`。

### 修复方式
本轮采用最小修复：

- 在 `src/lib/error-action-registry.ts` 中引入 `TranslationKey`；
- 将 `messageKey` 收紧为 `TranslationKey`；
- 将 `actionLabelKey` 收紧为 `TranslationKey | undefined`；
- 不继续扩大 `handle-server-error.ts` 中的 `as any` 覆盖范围；
- 让错误动作注册表在定义期就接受 i18n key 合法性校验。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 结论
本次失败的根因不是部署脚本，而是前端严格类型构建拦截了 `string -> TranslationKey` 的不兼容传参。修复后，`handle-server-error.ts` 对 `translate(...)` 的调用已重新满足类型约束。

## 专项：`customer / supplier` 核心标识字段变更事务化（2026-04-08）

### 本轮目标
在已完成 `customer.status` / `supplier.status` 主数据事务化后，继续为更高语义密度的主数据动作建立显式 transaction：主体核心标识字段变更。

本轮限定只处理：

- `customer.code`
- `customer.name`
- `supplier.code`
- `supplier.name`

### 本轮实际执行
已完成：

- 后端 `partner_transaction_service.go` 新增：
  - `CUSTOMER_IDENTITY_CHANGE`
  - `SUPPLIER_IDENTITY_CHANGE`
- transaction payload 仅允许 `code` / `name`；
- 事务链继续复用：
  - 乐观锁版本控制
  - 主数据存在性校验
  - 审计日志写入
  - `code` 唯一性校验
- 前端 `customer-service.ts` / `supplier-service.ts` 已新增 identity change transaction 请求；
- 前端 hooks 已新增 `identityChangeMutation`；
- `customer-list.tsx` / `supplier-list.tsx` 已在纯 `code`、纯 `name`、`code + name` 变更时优先走显式 transaction；
- 若混入其他普通档案字段，仍继续保留在原有 `patch` 链中。

### 本轮分流边界
- 仅当 delta 只包含 `code` / `name` 时命中 identity transaction；
- `status` 仍继续命中上一轮已落地的 status transaction；
- 若同时混入联系人、地址、分类、主营产品等字段，则不进入本轮 identity intent；
- 新建场景继续走现有 create；
- 前端未新增任何唯一性猜测逻辑，最终裁决仍以后端为准。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run "Customer|Supplier"
```

结果：通过。

### 本轮结论
`customer / supplier` 第二批主数据 TDO 已完成：

- 核心标识字段变更已具备显式 transaction 语义；
- 纯身份字段变更与普通混合档案编辑已形成稳定分流；
- 未破坏现有 `patch` 兜底链与前后端编译测试。

## 专项：`trading/customer` / `trading/supplier` 主数据 TDO 接入（2026-04-08）

### 本轮目标
在订单域局部事务化后，回到主数据域，优先为 `customer` 与 `supplier` 当前仍以 CRUD + `patch` 为主的编辑链路接入最窄语义的显式 TDO，同时继续保留 `patch` 作为普通混合档案编辑的兜底。

### 本轮实际执行
本轮没有强拆普通档案混合编辑，而是先落地最稳定、最单一的主数据动作：状态变更。

已完成：

- 后端新增 `customer` / `supplier` 状态变更 transaction 服务与 handler；
- 新增路由：`POST /customers/:id/transactions`、`POST /suppliers/:id/transactions`；
- 为 `customer` 补齐了现有前端已依赖但后端缺失的 `PATCH /customers/:id` 兜底链；
- 前端 `customer-service.ts` / `supplier-service.ts` 增加状态变更 transaction 请求；
- 前端 hooks 增加 `statusChangeMutation`；
- `customer-list.tsx` / `supplier-list.tsx` 已在纯 `status` 变更时优先命中显式 transaction；
- `customer-action-dialog.tsx` 增加了最小状态编辑入口，便于触发纯状态事务；
- 若混入其他普通档案字段，仍继续保留在原有 `patch` 链中。

### 本轮边界确认
- 本轮只接入 `customer.status` / `supplier.status` 这类单语义主数据动作；
- 未把 customer / supplier 的普通档案混合编辑强行包装为 transaction；
- `patch` 仍是主数据维护场景的安全兜底；
- 主数据状态校验继续以后端裁决为准，前端不做规则猜测。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run "Customer|Supplier"
```

结果：通过。

### 本轮结论
`trading/customer` / `trading/supplier` 已完成第一批主数据 TDO 接入：

- 主数据状态变更已具备显式 transaction 语义；
- 普通混合档案编辑继续保留在 `patch`，未破坏现有兜底链；
- `customer` 原先缺失的 patch 后端入口也已补齐，现有前端链路恢复闭环。

## 专项：`purchase` 头部第二刀：供应商主体变更事务化（2026-04-08）

### 本轮目标
在已完成 `purchase` 的 `expectedDate` 事务化与三类基础行级事务后，继续压缩采购订单编辑中的 `patchMutation` 承担面，并收口采购订单供应商主体切换这一稳定头部语义。

### 本轮现状复核
本轮进入实现前复核确认到：

- 前端已存在 `ORDER_SUPPLIER_CHANGE` 常量与事务请求封装；
- `use-purchase-orders.ts` 已存在 `supplierChangeMutation`；
- `purchase-order-action-dialog.tsx` 已存在纯 `supplierId` / `supplierName` 变更分流；
- 后端 `purchase_transaction_service.go` 已存在 `PurchaseTransactionIntentSupplierChange` 与 `executePurchaseOrderSupplierChangeTx(...)`；
- 该链路已按版本控制、供应商存在性校验、审计与快照返回完成闭环。

因此本轮无需新增业务代码，重点转为确认当前仓库状态与规划边界一致，并完成验证与文档收口。

### 本轮实际确认结果
- `ORDER_SUPPLIER_CHANGE` 已落地为正式 `purchase` transaction intent；
- 仅当 delta 仅涉及 `supplierId` / `supplierName` 时，采购编辑弹窗才命中 `supplierChangeMutation`；
- 若混入其他头部字段或行级字段，仍继续保留在现有 transaction / `patch` 链中；
- 后端会复用现有供应商数据源校验供应商是否存在，并在必要时回填 `supplierName`；
- 更新后仍返回最新采购订单快照并写入审计日志。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Purchase
```

结果：通过。

### 本轮结论
本轮确认 `purchase` 头部第二刀——供应商主体变更事务化——已在仓库中落地且验证通过：

- 采购头部供应商主体切换已具备独立 transaction 语义；
- `purchase` 编辑弹窗对纯供应商主体切换与混合编辑的分流边界清晰；
- 当前无需重复补码，可直接视为本轮治理项已完成并已完成验证收尾。

## 请假管理模块闭环（仅本人申请）

### 本轮完成内容
- 前端身份链补齐：`AuthUser` 新增 `employeeId`，登录成功与 `/auth/snapshot` 同步流程都会将当前用户绑定的员工档案 ID 写入 store，解决“仅本人申请”场景下前端拿不到员工身份的问题。
- 后端请假 authority 链路补齐：新增 `server/services/leave_service.go`、`server/handlers/leave_handlers.go`、`server/routes/routes_leave.go`，正式提供 `GET /leaves/my`、`GET /leaves/stats`、`POST /leaves/preview`、`POST /leaves`、`POST /leaves/:id/cancel`。
- 后端严格限定“仅本人申请”：服务层通过当前登录用户 `userId -> users.employee_id -> employees.id` 解析员工身份，创建与试算均以后端解析出的本人员工档案为准，不信任前端传入 `employeeId`。
- 后端权威试算 `durationDays`：新增请假试算逻辑，由后端依据开始/结束时间统一计算请假天数，前端不再提交终裁后的 `durationDays`。
- 前端新增独立提交链路：`leave-service.ts` 对齐新的后端契约；新增 `use-submit-leave-request.ts`；新增 `components/leave-action-dialog.tsx`，将表单、试算、提交、刷新职责隔离。
- 请假页面闭环：`leave-management.tsx` 现在可打开“新建请假申请”对话框，提交成功后自动刷新“我的请假记录”和统计卡片。

### 关键实现边界
- 本轮仅支持“本人申请”，未实现代他人申请入口。
- `employeeId` 以后端身份绑定为准，前端仅消费，不参与授权裁决。
- `durationDays` 由后端 authority 试算返回，前端只做展示。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services
```

结果：通过。

### 本轮结论
请假管理模块已从只读 mock 页面推进为“仅本人申请”的真实闭环：

- 当前登录用户可基于已绑定的员工档案发起请假申请；
- 提交前可调用后端权威试算获取请假天数；
- 提交成功后列表与统计即时刷新；
- 后端已具备正式路由、身份约束与最小撤销能力，前后端契约已对齐。

## 请假管理模块回归补强

### 本轮完成内容
- 新增 `server/services/leave_service_test.go`，覆盖请假服务的核心边界：
  - 当前登录用户绑定员工档案后，试算结果必须返回本人 `employeeId` 与 `employeeName`；
  - 创建请假申请时，记录必须以本人身份落库，并保持 `PENDING` 状态；
  - 其他员工不得撤销非本人请假申请；
  - 统计接口需正确聚合 `pending/approved/rejected` 数量，并仅累计本人已批准工日。
- 新增 `server/handlers/leave_handlers_test.go`，覆盖处理器层关键契约：
  - 未登录/缺少 `userId` 上下文时，请假试算返回 `401`；
  - 请假创建成功时，返回体需包含新建记录 ID、本人 `employeeId`、`employeeName`、`PENDING` 状态及正确 `durationDays`。
- 修复 `server/services/leave_service.go` 的隐式数据库默认值依赖：创建请假申请时改为应用层生成 ID，不再依赖数据库默认 UUID。这样既兼容现有 Postgres，也避免 SQLite 测试环境下记录 ID 为空的问题。
- 为避免 SQLite 与 Postgres 方言差异导致误报，本轮新增测试全部采用“手工建最小表结构”的方式，而不是直接对带 `gen_random_uuid()` 默认值的模型执行 `AutoMigrate`。

### 验证
执行：
```bash
go test ./handlers ./services -run Leave
go test ./handlers ./routes ./services
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
请假管理模块不仅完成了“仅本人申请”功能闭环，也补齐了自动化回归兜底：

- 关键业务约束已通过测试固化；
- 请假记录创建不再隐式依赖数据库默认主键生成；
- 前后端闭环在编译与后端回归层面均已验证通过。

## 请假管理前端交互细化

### 本轮完成内容
- 新增 `src/features/org-personnel/hooks/use-cancel-leave-request.ts`，将请假撤销能力单独封装为独立 hook，统一负责：
  - 调用 `LeaveService.cancelLeaveRequest(...)`；
  - 成功后失效“我的请假记录”和“请假统计”查询；
  - 统一 toast 成功/失败反馈。
- 增强 `src/features/org-personnel/tabs/leave-management.tsx` 的展示层：
  - 将请假状态从后端枚举值映射为中文文案：`待审批 / 已通过 / 已拒绝 / 已撤销`；
  - 为不同状态补充更清晰的 Badge 视觉区分；
  - 将请假类型从英文枚举映射为中文文案；
  - 将 `startTime / endTime` 统一格式化为 `zh-CN` 本地可读时间；
  - 对 `PENDING` 状态记录显示“撤销申请”按钮，并在请求处理中显示“撤销中...”。

### 本轮设计约束
- 本轮未引入前端权限硬拦截；“是否允许撤销”继续以后端校验为准。
- 本轮只优化展示层与交互接线，不改变后端接口结构与时间传输事实。
- 后端排班/节假日 authority 算法升级按本轮决策暂缓，未在本次执行中落地。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
请假管理页面已从“最小闭环”提升到更可用的正式交互态：

- 列表状态与请假类型不再直接暴露原始枚举；
- 时间信息对业务用户更可读；
- 待审批请假单已具备撤销入口，且撤销后能回到真实后端状态。

## 请假列表筛选、排序与详情展示

### 本轮完成内容
- 将请假列表的展示工具从页面内联逻辑中抽离到 `src/features/org-personnel/data/leave-display.ts`：
  - 统一维护请假状态中文映射；
  - 统一维护请假类型中文映射；
  - 统一维护时间格式化；
  - 新增基于现有列表数据的筛选与排序派生函数。
- 新增 `src/features/org-personnel/components/leave-list-toolbar.tsx`：
  - 支持按状态筛选；
  - 支持按请假类型筛选；
  - 支持按开始时间正序 / 倒序排序。
- 新增 `src/features/org-personnel/components/leave-detail-dialog.tsx`：
  - 可查看员工姓名与员工 ID；
  - 可查看请假类型、状态、开始时间、结束时间、工日与请假事由；
  - 与列表摘要使用同一套状态/类型/时间显示逻辑，避免展示漂移。
- 增强 `src/features/org-personnel/tabs/leave-management.tsx`：
  - 页面负责维护筛选条件、排序条件与当前选中详情记录；
  - 列表渲染改为使用派生后的 `visibleLeaves`；
  - 新增“查看详情”入口；
  - 在筛选后无结果时显示独立空态；
  - 保持现有撤销按钮与撤销刷新链路不变。

### 本轮设计约束
- 本轮继续基于现有 `LeaveService.getMyLeaveRequests()` 返回的数据完成增强，未扩展新的后端查询参数。
- 排序使用当前稳定存在的 `startTime` 字段，不依赖假设一定存在的其他时间事实。
- 详情展示采用独立 Dialog 组件，避免把列表卡片继续膨胀为复杂明细面板。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
请假管理页面已进一步具备“可浏览、可定位、可查看明细”的列表体验：

- 用户可以按状态和类型快速筛选请假记录；
- 用户可以按开始时间切换排序方式；
- 用户可以查看每条请假记录的完整详情，而不必依赖列表摘要信息。

## Trading 审计样板接入

### 本轮完成内容
- 新增后端审计模块收口文件 `server/services/audit_modules.go`：
  - 为 `sales-order` / `purchase-order` 建立统一 canonical module 值；
  - 为历史值 `SalesOrder` / `PurchaseOrder` 建立别名映射；
  - 为查询层提供别名展开能力。
- 增强 `server/services/audit_service.go`：
  - `defaultAuditLogger.Write(...)` 在落库前统一规范化 `AuditEntry.Module`；
  - 新产生的 Trading 审计日志统一写入 canonical module 值。
- 增强 `server/handlers/audit_handlers.go`：
  - `/audit/timeline` 查询从“单值精确匹配”调整为“按 canonical module + 历史别名集合兼容查询”；
  - 确保旧数据与新数据在 Trading 样板接入期间都可被时间线正常命中。
- 新增前端统一模块文件 `src/features/audit-timeline/data/audit-modules.ts`：
  - 输出 `AUDIT_MODULES`；
  - 输出 audit-engine 的模块接入配置骨架。
- 增强 Trading 前端详情页：
  - `sales-order-detail-activity.tsx` 改为使用统一 `AUDIT_MODULES.salesOrder`；
  - `purchase-order-detail.tsx` 新增 `AuditStamp`，补齐采购单详情时间线入口，并使用 `AUDIT_MODULES.purchaseOrder`。
- 收口 `src/features/audit-timeline/components/audit-engine-tab.tsx`：
  - 从静态手写 `MODULES` 切到基于 `AUDIT_ENGINE_MODULE_STATUS` 派生；
  - Trading 现在由“已接入样板实体列表”驱动状态表达，而不是裸写 `connected: true` 假象。

### 本轮设计约束
- 本轮优先做兼容式收口：既统一新写入口径，也兼容历史 `SalesOrder` / `PurchaseOrder` 数据查询。
- 本轮只把 Trading 做成“真实可验证样板”，未扩展到 Finance / Engineering / Warehouse / Equipment 全量接入。
- 本轮未新建第二套审计查询接口，继续复用 `/audit/timeline` 与既有 `AuditStamp` / `DataTimeline` 组件。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./services -run Audit -count=1
```

结果：通过。

### 本轮结论
Trading 已从“看板宣称已接入”推进为“具备真实可验证审计链路的样板模块”：

- 销售单与采购单详情均具备统一的审计时间线入口；
- Trading 审计查询不再受新旧 module 命名漂移直接阻断；
- audit-engine 中的 Trading 状态已开始建立在可维护事实映射上。

## audit-engine 真实统计升级

### 本轮完成内容
- 扩展后端审计注册表 `server/services/audit_modules.go`：
  - 为 `sales-order`、`purchase-order`、`customer`、`supplier`、`employee`、`production-line` 建立 canonical module 与历史别名归一化；
  - 新增实体到业务模块的集中映射；
  - 新增 `EntryIntegrated` 标记，沉淀“真实入口覆盖”事实；
  - 新增 audit-engine 聚合结果结构定义。
- 增强 `server/handlers/audit_handlers.go`：
  - 保持 `/audit/timeline` 的 Trading 兼容查询能力；
  - 新增 `GET /audit/engine/stats`，基于注册表与 `audit_logs` 聚合模块级真实统计；
  - 输出每个模块的目标实体数、日志覆盖数、入口覆盖数、综合覆盖率、状态与最近事件时间。
- 增强 `server/routes/routes.go`：
  - 注册 `/audit/engine/stats` 路由。
- 收口前端审计类型与 hook：
  - `src/features/audit-timeline/types.ts` 新增 `AuditEngineModuleStats` / `AuditEngineStatsResponse`；
  - 新增 `src/features/audit-timeline/hooks/use-audit-engine-stats.ts`；
  - `DiffItem` 中原有 `any` 已收口为 `unknown`。
- 收口 `src/features/audit-timeline/components/audit-engine-tab.tsx`：
  - 页面改为消费后端真实统计结果；
  - `connectedCount`、模块状态、覆盖率、最近事件时间均来自 `/audit/engine/stats`；
  - 新增 loading 态；
  - 模块卡片中显式展示 `LOG COVERAGE` 与 `ENTRY COVERAGE`，可区分“部分接入”和“完全未接入”。

### 本轮设计约束
- 本轮以“后端聚合结果”为权威源，前端不再自行裁决模块真实接入状态。
- 本轮采用“日志覆盖 + 入口覆盖”双维度统计，而非单纯看是否存在日志或是否挂了入口。
- 本轮仍基于受控注册表表达入口覆盖，未尝试动态扫描整个前端代码库来发现入口。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./services -run Audit -count=1
```

结果：通过。

### 本轮结论
audit-engine 已从“配置驱动表达”升级为“基于真实日志 / 真实入口统计”的看板：

- 模块连接数量不再来自静态数组；
- Trading 现在能同时体现“有日志 + 有入口”的真实接入状态；
- Engineering / Equipment 等存在“有日志但无入口”的模块，会被看板识别为部分接入，而不是被简单误判为未接入。

## audit-engine 真实入口补齐（方案A）

### 本轮完成内容
- 扩展前端审计 module 常量 `src/features/audit-timeline/data/audit-modules.ts`：
  - 新增 `customer`、`supplier`、`employee` canonical module 值；
  - 供各业务页面挂接真实入口时统一复用。
- 同步更新后端审计注册表 `server/services/audit_modules.go`：
  - 将 `Customer`、`Supplier`、`Employee` 的 `EntryIntegrated` 标记改为 `true`；
  - 保持 `ProductionLine` 仍为 `false`，用于真实统计继续反映“有日志无入口”现状。
- 增强 `src/features/trading/components/customer-list.tsx`：
  - 在客户卡片信息区补充 `AuditStamp`；
  - 使用 `AUDIT_MODULES.customer` + 客户 `id` 打开真实时间线。
- 增强 `src/features/trading/components/supplier-list.tsx`：
  - 在供应商卡片信息区补充 `AuditStamp`；
  - 使用 `AUDIT_MODULES.supplier` + 供应商 `id` 打开真实时间线。
- 增强 `src/features/org-personnel/data/schema.ts`：
  - 为员工前端数据模型补充可选的 `createdAt / updatedAt / createdBy / updatedBy` 字段。
- 增强 `src/features/org-personnel/components/employee-action-dialog.tsx`：
  - 在编辑弹层头部补充 `AuditStamp`；
  - 使用 `AUDIT_MODULES.employee` + 员工 `id` 打开真实时间线；
  - 仅在编辑场景展示，不对新建场景强行注入半残入口。

### 本轮设计约束
- 本轮继续复用既有 `AuditStamp` / `DataTimeline`，不新建第二套入口组件。
- 入口仅挂在现有自然承载位：客户卡片、供应商卡片、员工编辑弹层头部。
- `ProductionLine` 本轮暂未纳入，因为当前更偏结构化树/工艺配置视图，缺少稳定且自然的详情承载位；若强行接入，会引入伪详情语义。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./services -run Audit -count=1
```

结果：通过。

### 本轮结论
方案A已把 `Customer`、`Supplier`、`Employee` 从“有日志无入口”的部分接入继续推进到更完整的前端可见接入状态：

- 用户现在可以在对应业务页面直接打开这些实体的审计时间线；
- 后端真实统计中的 `entryCoverage` 将随之提升；
- `ProductionLine` 仍保留为后续单独评估项，而不是在本轮被强行塞入不合适的入口。

## 2026-04-09 客户/供应商列表统计下沉到后端 metadata/stats

### 变更概述
- 后端 `server/handlers/customers.go`：
  - 为 `GET /customers` 增加 `metadata.pagination` 与 `metadata.stats` 返回；
  - 统计口径覆盖 `total / active / newThisMonth`；
  - 保留既有 `items / total / page / pageSize` 根字段，避免现有调用方被立即打断。
- 后端 `server/handlers/suppliers.go`：
  - 为 `GET /suppliers` 增加 `metadata.pagination` 与 `metadata.stats` 返回；
  - 统计口径覆盖 `total / active / pendingReview`；
  - 同样保留既有根字段兼容结构。
- 前端 `src/features/trading/customer/services/customer-service.ts` / `hooks/use-customer.ts`：
  - 保留 `getCustomers()` 作为 `options=true` 选项数组接口；
  - 新增 `getCustomerList()` / `useGetCustomerList()` 作为列表页对象响应入口；
  - mutations 同时失效 `['customers']` 与 `['customers', 'list']`。
- 前端 `src/features/trading/supplier/services/supplier-service.ts` / `hooks/use-supplier.ts`：
  - 保留 `getSuppliers()` 作为 `options=true` 选项数组接口；
  - 新增 `getSupplierList()` / `useGetSupplierList()` 作为列表页对象响应入口；
  - mutations 同时失效 `['suppliers']` 与 `['suppliers', 'list']`。
- 前端 `src/features/trading/components/customer-list.tsx`：
  - 列表页切换为消费 `useGetCustomerList()`；
  - 头部卡片改为读取后端 `metadata.stats.total / active / newThisMonth`。
- 前端 `src/features/trading/components/supplier-list.tsx`：
  - 列表页切换为消费 `useGetSupplierList()`；
  - 头部卡片改为读取后端 `metadata.stats.total / active / pendingReview`。

### 设计收口
- 客户/供应商下拉选项与列表页统计不再共用同一响应语义：
  - 选项场景继续消费纯数组；
  - 列表场景消费对象响应与后端统计。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers -run "Customer|Supplier"
```

结果：通过。

### 补充回归：handler 级 metadata.stats 字段断言
- 新增 `server/handlers/partner_list_stats_handler_test.go`：
  - `TestGetCustomersHandlerReturnsMetadataStats`
  - `TestGetSuppliersHandlerReturnsMetadataStats`
- 覆盖点：
  - 列表接口返回 `metadata.pagination`；
  - 列表接口返回 `metadata.stats`；
  - 客户统计断言 `total / active / newThisMonth`；
  - 供应商统计断言 `total / active / pendingReview`；
  - 逻辑删除记录不会混入统计总数。

补充执行：
```bash
go test ./handlers -run "CustomersHandlerReturnsMetadataStats|SuppliersHandlerReturnsMetadataStats|Customer|Supplier"
```

结果：通过。

## 2026-04-09 MRP Phase 1 独立模块骨架迁移

### 变更概述
- 新建 `src/features/mrp` 正式模块骨架：
  - `data/requirement-schema.ts`
  - `services/requirement-core-service.ts`
  - `services/requirement-service.ts`
  - `services/requirement-export-service.ts`
  - `hooks/use-requirements.ts`
  - `hooks/use-mold-status.ts`
  - `components/requirements/*`
  - `pages/part-requirements.tsx`
  - `index.ts`
- 将 MRP 需求分析页面的真实实现迁入 `src/features/mrp/pages/part-requirements.tsx`：
  - 模块页面容器不再继续以内联方式挂在 `src/features/trading/tabs/index.tsx` 中维护。
- 保持现有 URL 不变：
  - `src/routes/_authenticated/trading/requirements.lazy.tsx` 仍承载 `/trading/requirements`
  - 但页面组件已切换为 `@/features/mrp/pages/part-requirements`
- 保留 Trading 旧路径兼容层：
  - `src/features/trading/hooks/use-requirements.ts` 改为转发到 `@/features/mrp/hooks/use-requirements`
  - `src/features/trading/hooks/use-mold-status.ts` 改为转发到 `@/features/mrp/hooks/use-mold-status`
  - `src/features/trading/services/requirement-core-service.ts` 改为转发到 `@/features/mrp/services/requirement-core-service`
  - `src/features/trading/services/requirement-service.ts` 改为兼容导出 `RequirementCoreService`
  - `src/features/trading/services/requirement-export-service.ts` 改为转发到 `@/features/mrp/services/requirement-export-service`
  - `src/features/trading/tabs/index.tsx` 当时曾保留 `PartRequirements` 兼容导出，后续已在 `2026-04-09` 清理移除

### 本轮边界
- 本轮只迁移 MRP 自有前端层：`requirements` 的 `data / services / hooks / components / page`。
- 本轮未改动 `/trading/requirements` URL，不在这一阶段强行切换导航与路由语义。
- 本轮继续复用：
  - `Trading` 的销售订单事实源
  - `Engineering` 的 BOM 服务
  - 现有国际化 key 与 API 契约

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
- `MRP` 已不再只是空目录，而是形成了最小可承载的前端领域骨架。
- `/trading/requirements` 现已由 `MRP` 新模块实际承载，但对现有 URL 与调用方保持兼容。
- Trading 旧路径中的 `tabs/index.tsx -> PartRequirements` 兼容导出已完成阶段性收口；其余兼容层仍可按引用面继续清理。

## 2026-04-09 删除 Trading 侧剩余 requirements 兼容层

### 变更概述
- 继续按“无引用即删除”原则，清理 Trading 侧残留的 `requirements` 兼容层与历史快照：
  - `src/features/trading/data/requirement-schema.ts`
  - `src/features/trading/hooks/use-requirements.ts`
  - `src/features/trading/services/requirement-core-service.ts`
  - `src/features/trading/services/requirement-export-service.ts`
  - `src/features/trading/services/requirement-service.ts`
  - `src/features/trading/services/requirement-export-service.ts.txt`
  - `src/features/trading/services/requirement-service.ts.txt`
- 删除依据：
  - `src` 范围内已无任何代码继续引用上述 Trading 路径；
  - 当前真实 schema / hook / service 实现均已归属到 `src/features/mrp/**`；
  - `.txt` 文件仅为旧实现快照，不参与当前构建与运行链路。

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
```
- 结果：通过。

### 本轮结论
- Trading 侧 `requirements` 的 schema / hook / service 兼容壳已完成物理清理。
- `requirements` 领域的前端实现与消费入口现已统一收敛到 `src/features/mrp/**`。

## 2026-04-09 清理 Trading -> MRP 最后一层显式转发壳

### 变更概述
- 对 `src/features/trading/**` 做了进一步盘点，按文件内容扫描所有直接指向 `src/features/mrp/**` 的兼容转发。
- 盘点结果显示仅剩一处显式 Trading -> MRP 转发壳：
  - `src/features/trading/hooks/use-mold-status.ts`
- 该文件仅执行：
  - `export { useMoldStatus } from '@/features/mrp/hooks/use-mold-status'`
  - `export type { MoldAlert } from '@/features/mrp/hooks/use-mold-status'`
- 同时确认 `src` 范围内已无任何代码继续通过 Trading 路径引用该 hook，因此执行物理删除。

### 验证
- 代码搜索结果表明：删除后 `src/features/trading/**` 内已不再存在直接指向 `src/features/mrp/**` 的显式转发文件。
- 执行：
```bash
pnpm exec tsc --noEmit
```
- 结果：通过。

### 本轮结论
- Trading -> MRP 的显式兼容转发壳已完成清零。
- 当前 `MRP` 相关实现已不再通过 Trading feature 做代码层转发，边界进一步明确。

## 2026-04-09 提升 MRP 为独立前端模块入口

### 变更概述
- 新增 `MRP` 独立前端模块骨架：
  - `src/features/mrp/module.tsx`
  - `src/features/mrp/tabs.ts`
- 新增独立路由树：
  - `src/routes/_authenticated/mrp/route.tsx`
  - `src/routes/_authenticated/mrp/route.lazy.tsx`
  - `src/routes/_authenticated/mrp/index.tsx`
  - `src/routes/_authenticated/mrp/requirements.tsx`
  - `src/routes/_authenticated/mrp/requirements.lazy.tsx`
- 新增独立访问路径：
  - `/mrp` -> 重定向到 `/mrp/requirements`
  - `/mrp/requirements` -> 直接承载 `src/features/mrp/pages/part-requirements.tsx`
- 将旧入口改为兼容跳转：
  - `src/routes/_authenticated/trading/requirements.tsx` 现统一重定向到 `/mrp/requirements`
  - `src/routes/_authenticated/trading/requirements.lazy.tsx` 不再直接挂载 MRP 页面组件
- 同步拆除 Trading 模块内的 requirements tab：
  - `src/features/trading/tabs.ts` 中移除 `requirements`
- 为新模块补齐系统级入口：
  - 侧边栏新增 `MRP` 入口
  - 命令面板搜索项与快捷动作改为指向 `/mrp/requirements`
  - `authenticated-route-catalog`、AI 协议允许路由、菜单权限映射中补入 `/mrp`
- 权限策略采取最小破坏方案：
  - `/mrp` 当前暂复用 Trading 菜单权限，避免本轮引入权限回归

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
```
- 结果：通过。

### 本轮结论
- `MRP` 已拥有独立的前端模块入口、路由树与导航入口，不再只是 Trading 模块中的一个语义附属页。
- `/trading/requirements` 仍可访问，但已退化为兼容入口；结构性宿主已切换为 `/mrp/requirements`。

## 2026-04-09 收口 MRP 语义层残留

### 变更概述
- 清理 Trading locale 中已无引用的旧 `requirements` 文案：
  - `src/locales/messages/en-US/trading.ts`
  - `src/locales/messages/zh-CN/trading.ts`
- 这意味着 `requirements` 页面的文案宿主已完全收敛到：
  - `src/locales/messages/en-US/mrp.ts`
  - `src/locales/messages/zh-CN/mrp.ts`
- 收口权限语义残留：
  - `src/features/authz/data/permission-catalog.ts` 中将 `menu_trading` 的标签/说明更新为同时覆盖 `Trading、Purchase、MRP`
  - 显式注释 `/mrp -> menu_trading` 为“继承授权”关系，而非隐式同模块
- 同步修正权限审计视图中的展示语义：
  - `src/locales/messages/en-US/systemManagement.ts`
  - `src/locales/messages/zh-CN/systemManagement.ts`
  - 审计矩阵里的 `menu_trading` 现展示为 `Trading / MRP`

### 验证
- 执行：
```bash
pnpm exec tsc --noEmit
```
- 结果：通过。
- 搜索确认：
  - `src` 范围内已无 `trading.requirements`
  - `src` 范围内已无 `trading.tabs.requirements`

### 本轮结论
- `MRP` 页面文案命名空间已不再依赖 Trading locale。
- `/mrp` 的权限语义已从“默默复用 Trading”收口为“显式继承 Trading 菜单授权”，为后续后端单独下发 `menu_mrp` 契约保留了清晰升级点。

## 2026-04-09 MRP schema 归属收口

### 变更概述
- 将 `src/features/trading/data/requirement-schema.ts` 收口为纯兼容导出：
  - `export type { MaterialRequirement, MrpStats } from '@/features/mrp/data/requirement-schema'`
- 这意味着 `MaterialRequirement` 与 `MrpStats` 的权威定义已统一归属到：
  - `src/features/mrp/data/requirement-schema.ts`
- `Trading` 目录下残留的 requirements 旧组件仍可继续通过兼容层获取相同类型，不会立即中断旧引用。

### 本轮结论
- MRP 的 schema 权威归属已从 `Trading` 收回到 `MRP`。
- `Trading` 的 `requirement-schema` 现在只承担向后兼容职责，不再是事实源。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。
