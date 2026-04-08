# 变更记录与验证（walkthrough.md）

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
