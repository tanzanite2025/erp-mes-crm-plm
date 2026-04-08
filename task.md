- [ ] 510. 冻结本轮范围，修复图片上传在 pHash 阶段的运行时解码失败（2026-04-08，待确认）
  - [ ] 本轮聚焦 Rust `search-engine` 的图像处理稳定性，不扩散到上传业务接口、Redis 查重策略或前端交互。
  - [ ] 不采用补丁式“双解码兜底”，而是转向长期稳定的单次解码方案。
  - [ ] 目标是让同一张图片在尺寸读取、pHash 计算、WebP 编码三步共享同一份已解码图像数据。

- [ ] 516. 冻结本轮范围，规划生产环境图片上传 `500 Disk write failed` 的专项修复（2026-04-09，待批准）
  - [ ] 本轮先聚焦生产环境上传物理落盘失败，不扩散到前端预览、本地 DEV `/uploads` 代理或新的业务重构。
  - [ ] 当前已确认前端拿到的错误文案为 `Disk write failed`，该文本来自 Go 上传处理器，不是 Rust `search-engine` 直接返回。
  - [ ] 本轮先完成“高概率根因锁定 + 修复专项规划”，待批准后再实施生产变更。

- [ ] 517. 固化当前已确认的生产现场事实链
  - [ ] `server/handlers/evidence_handler.go` 中先执行 Rust 图像处理，随后才调用 `os.WriteFile(filepath.Join("uploads", fileName), ...)` 落盘，因此 `Disk write failed` 发生在 Go 本地写盘阶段。
  - [ ] 生产宿主机当前工作目录已确认是 `/var/www/erp/server`，`./uploads` 目录存在，但当前权限为 `root:root` + `755`。
  - [ ] 生产 `app` 当前有两个副本在跑，因此此前 `docker exec -it $(docker compose ps -q app) ...` 失败是因为命令替换返回了两个容器 ID，不是新的独立根因。
  - [ ] 生产磁盘空间与 inode 已确认正常，当前不再优先怀疑 `no space left on device` 一类基础设施问题。

- [ ] 518. 锁定当前高概率直接根因
  - [ ] `server/Dockerfile` 已确认 `app` 容器最终以非 root 用户 `xdfcuser:xdfcgroup` 运行。
  - [ ] `server/docker-compose.yml` 已确认宿主机 `./uploads` 以卷挂载方式映射到容器内 `/app/uploads`。
  - [ ] 因此在宿主机 `server/uploads` 为 `root:root 755` 的前提下，容器内普通用户对挂载目录无写权限，与当前 `Disk write failed` 现象高度吻合。
  - [ ] 当前高优先级修复方向应落在宿主机挂载目录权限/归属与容器运行用户对齐，而不是 Rust 版本、图像处理逻辑或前端上传链。

- [ ] 519. 明确专项修复分层
  - [ ] A 层先做生产恢复：让宿主机 `server/uploads` 对容器内 `xdfcuser` 可写，优先恢复上传能力。
  - [ ] B 层再做长期防回归：补齐 `server/deploy-prod.sh` 的运行目录权限准备逻辑，避免后续部署再次生成 `root:root 755` 的不可写挂载目录。
  - [ ] 本轮不把容器重新切回 root 作为默认方案，也不采用无边界的 `777` 兜底作为长期解法。

- [ ] 520. 明确批准前的产出与约束
  - [ ] 当前阶段只更新 `task.md` 与 `implementation_plan.md`，把根因、修复分层与实施边界写清楚。
  - [ ] 在收到批准前，不直接对生产宿主机目录执行 `chown`、`chmod`、`docker compose up` 或其他实际变更动作。
  - [ ] 实施时需同时准备“临时人工恢复步骤”和“部署脚本固化步骤”，避免只救火、不防回归。

- [x] 521. 固化 `uploads/backups` 目录权限防回归约束（2026-04-09，仓库侧已完成）
  - [x] `server/Dockerfile` 已改为显式固定 `app` 运行用户的 UID/GID，避免继续依赖 Alpine 自动分配系统用户编号。
  - [x] `server/docker-compose.yml` 已把同一组 `XDFC_APP_UID` / `XDFC_APP_GID` 作为 build args 传入 `app` 镜像构建链。
  - [x] `server/deploy-prod.sh` 已在每次部署前按同一 UID/GID 准备 `./uploads` 与 `./backups` 顶层目录属主和权限，防止再次生成容器不可写的挂载目录。
  - [x] `.env.example` 已补充运行时身份配置项，默认与部署脚本、容器镜像保持一致。

- [ ] 522. 冻结本轮范围，规划 `sales` 事务编排下沉与并发写收口（2026-04-09，待确认）
  - [ ] 本轮先固化审查结论与改造边界，不直接并发修改 `sales` UI、前端 service 与后端事务接口。
  - [ ] 本轮聚焦两个问题：`sales-order-action-dialog.tsx` 的交易编排泄露，以及遗留前端交付回写链路的并发写风险。
  - [ ] 本轮不顺手扩散到 `purchase`、`customer`、`supplier` 或新的事务语义实现。

- [ ] 523. 固化当前 `sales` 交易编排泄露现状
  - [ ] `src/features/trading/components/sales-order-action-dialog.tsx` 当前在 UI 层承担了大段 delta 分类、行结构比对与 mutation 分发逻辑。
  - [ ] 组件当前通过 `isCustomerOnlyChange`、`isLinesOnlyChange`、`isPureLineAdd`、`isPureLineRemove` 等条件，在保存前手动决定调用哪条 transaction mutation 或 `patchMutation`。
  - [ ] 这意味着“哪种编辑命中哪种事务意图”的领域编排仍由 UI 裁决，而不是由单一 orchestration/service 层或后端权威入口裁决。

- [ ] 524. 固化当前并发写风险边界
  - [ ] 当前主 `patchSalesOrder(...)` 链路已通过 `version` 与后端 `409 CONFLICT` 具备基础乐观锁保护，不应误判为完全没有并发保护。
  - [ ] 但 `src/features/trading/services/order-delivery-service.ts` 仍保留前端 read-modify-write 式的交付数量累加与状态推导，并通过整单保存方式回写。
  - [ ] 该遗留链路绕开了显式事务意图与版本治理，若仍被业务入口调用，将存在脏写覆盖与状态漂移风险。
  - [ ] 需进一步确认该文件是否已完全失去引用；若未失活，应视为高优先级架构风险。

- [ ] 525. 明确本轮专项规划目标
  - [ ] 将 `sales-order-action-dialog.tsx` 中的 delta 分类与 mutation 分发下沉到单一 `sales` orchestration/service hook，UI 仅提交表单结果与 delta。
  - [ ] 将“交付增量”收敛为显式事务意图，由后端基于快照与版本执行原子裁决，而不是前端先计算后回写。
  - [ ] 在完成上述收敛前，不继续增加新的 UI 内 if/else 分流规则，不继续复制到 `purchase` 侧形成新的泄露面。

- [ ] 526. 明确实施前验证与约束
  - [ ] 先补专项规划文档，明确改造切口、涉及文件、兼容策略与最小验证口径，再开始实际代码改造。
  - [ ] 若 `order-delivery-service.ts` 已无引用，可将其移出正式导出面或删除；若仍有引用，需先定位调用入口。
  - [ ] 实施时必须保留现有 `patch`/transaction 路径的 `version` 冲突语义，不得为了下沉 orchestration 反向削弱乐观锁。

- [ ] 513. 冻结本轮范围，补齐本地 DEV `/uploads` 访问链（2026-04-08，待确认）
  - [ ] 本轮只修本地开发环境中的静态上传资源访问链，不扩散到上传业务逻辑、Rust 图像处理或生产 Nginx 配置。
  - [ ] 当前问题表现为本地图片上传成功后，`GET /uploads/ev-*.webp` 在 `127.0.0.1:5173` 返回 `200` 但预览破图。
  - [ ] 已确认生产配置中 `/uploads/` 由 Nginx 正式暴露，本轮不改生产部署语义。

- [ ] 514. 固化当前本地预览坏图根因
  - [ ] 前端预览使用 `getStaticEvidenceUrl(...)` 将后端返回文件名拼为 `/uploads/{fileName}`，不是 `blob:` 临时地址。
  - [ ] `vite.config.ts` 当前只代理 `/api`，未代理 `/uploads`，导致浏览器把 `/uploads/*` 请求发给 Vite Dev Server。
  - [ ] 本地坏图不代表 Rust 图像处理失败，也不代表生产必然复现；它是 DEV 访问链与生产访问链不一致导致的验证盲区。

- [ ] 515. 明确本轮修复要求
  - [ ] 在本地 DEV 中补齐 `/uploads` 代理，使上传后图片回显链路与生产访问语义一致。
  - [ ] 优先复用现有 `VITE_PROXY_TARGET`，避免为 `/uploads` 再引入新的独立目标地址配置。
  - [ ] 不修改生产 Nginx、`docker-compose`、Go 上传接口或 Rust 图像处理逻辑。
  - [ ] 完成后需要验证本地上传后的 `GET /uploads/*.webp` 能正常返回真实图片内容，而不是 Vite 回退响应。

- [ ] 511. 固化当前运行时根因
  - [ ] 前端请求已命中正确后端 `http://localhost:8080`，当前问题不再是 Vite 代理错配。
  - [ ] Go 后端日志显示：`rust image worker returned status: 400, body: Failed to decode image for perceptual hash`。
  - [ ] Rust 当前实现先用 `image::load_from_memory(raw_data)` 解码，再用 `img_hash::image::load_from_memory(raw_data)` 二次解码用于 pHash。
  - [ ] 同一份原始字节由两套解码路径处理，导致运行时格式兼容性出现分叉，是当前 500 的直接根因。

- [ ] 512. 明确长期稳定修复要求
  - [ ] Rust 图像处理链改为“单次权威解码 + 统一像素管线”，避免同一请求内出现双解码分叉。
  - [ ] pHash 计算需要基于已成功解码后的统一像素数据完成，而不是再次从原始字节独立解码。
  - [ ] 如需调整依赖组合，只能作为配套收敛手段，不能替代主方案。
  - [ ] 完成后需要重新验证图片上传成功，并确认 Rust 日志中不再出现 `Failed to decode image for perceptual hash`。

- [ ] 507. 冻结本轮范围，修复 `search-engine` 本地 Docker 构建失败（2026-04-08，待确认）
  - [ ] 本轮只修 Rust 构建链，不扩散到图像处理业务逻辑。
  - [ ] 目标是恢复 `search-engine` 在本地 DEV/Compose 下的可构建性。
  - [ ] 不改变运行时接口、端口和镜像职责。

- [ ] 508. 固化当前构建失败根因
  - [ ] `server/search-engine/Dockerfile` 当前使用 `rust:1.75-alpine`，工具链版本过旧。
  - [ ] 构建日志显示依赖链中的 `time-core` 需要更高版本 Cargo 才能解析 `edition2024`。
  - [ ] Dockerfile 当前只复制 `Cargo.toml`，没有复制已存在的 `Cargo.lock`，导致依赖解析存在漂移。

- [ ] 509. 明确本轮修复要求
  - [ ] 升级 `search-engine` 的 Rust builder 镜像到兼容当前依赖链的稳定版本。
  - [ ] 将 `Cargo.lock` 纳入 Docker 构建缓存层，避免依赖漂移。
  - [ ] 完成后需要重新验证 `docker compose build search-engine` 能通过。

- [ ] 504. 冻结本轮范围，补齐本地 DEV 一键启动链（2026-04-08，待确认）
  - [ ] 本轮只修本地开发启动体验，不扩散到业务逻辑或生产部署语义。
  - [ ] 目标是让前端、Go 后端与 Rust `search-engine` 在本地具备一致的启动入口。
  - [ ] 优先复用现有脚本，而不是重复创建新的平行入口。

- [ ] 505. 固化当前 DEV 启动缺口
  - [ ] `server/dev-up.ps1` 当前只启动 `db/redis/app/nginx_lb/watchdog`。
  - [ ] 当前脚本未启动 `search-engine`，导致图片上传链在 DEV 下天然缺失图像处理依赖。
  - [ ] 根目录 `package.json` 也没有可直接拉起完整本地开发链的脚本。

- [ ] 506. 明确本轮修复要求
  - [ ] `server/dev-up.ps1` 需要把 `search-engine` 纳入本地启动流程。
  - [ ] 根目录需要提供清晰的脚本入口，减少手工切目录操作。
  - [ ] `walkthrough.md` 需要记录新的本地 DEV 使用方式。

- [ ] 501. 冻结本轮范围，修复 `search-engine` 未随生产部署更新的问题（2026-04-08，待确认）
  - [ ] 本轮只修部署链，不扩散到业务逻辑或搜索索引功能重构。
  - [ ] 目标是让默认部署路径能够同步构建并启动 Rust 图像处理服务。
  - [ ] 不改变现有运行时数据目录保护策略。

- [ ] 502. 固化当前部署缺口
  - [ ] 顶层 `deploy.sh` 最终调用 `server/deploy-prod.sh`。
  - [ ] `server/deploy-prod.sh` 默认只重建 `app`，不会重建 `search-engine`。
  - [ ] `server/docker-compose.yml` 当前未声明 `search-engine` 服务。
  - [ ] 因此 `server/search-engine/src/processor.rs` 的修复不会随默认部署自动上服务器。

- [ ] 503. 明确本轮修复要求
  - [ ] `docker-compose.yml` 需要纳入 `search-engine` 服务，并提供稳定的容器内访问地址。
  - [ ] `deploy-prod.sh` 默认部署路径需要把 `search-engine` 一起构建/启动。
  - [ ] `app` 需要通过环境变量显式指向容器内 `search-engine`，避免继续依赖宿主机 `localhost:8081` 假设。

- [ ] 498. 冻结本轮范围，修复销售订单图片上传 `500 Image processing failed`（2026-04-08，待确认）
  - [ ] 本轮聚焦 Go -> Rust 图像处理链，不扩散到通知 WebSocket 或其他业务域。
  - [ ] 先增强错误可观测性，再修复图像处理兼容性。
  - [ ] 不把 Redis 查重降级链误判为本次主因。

- [ ] 499. 固化当前 500 根因判断
  - [ ] 当前失败点位于后端 `HandleEvidenceUpload(...)` 内的 `ProcessImage(rawData)`。
  - [ ] 文件大小超限并非本次主因；超限按现有逻辑应返回 `413`。
  - [ ] Redis 未初始化并非本次主因；当前实现只会跳过去重，不会返回 `500`。
  - [ ] 高优先级怀疑为 Rust 图像解码或 WebP 编码兼容性问题。

- [ ] 500. 明确本轮修复与验证要求
  - [ ] Go 侧需要保留 Rust 返回的真实错误上下文，避免前端只看到笼统的 `Image processing failed`。
  - [ ] Rust 侧需要提升 `process_image(...)` 对常见截图格式的兼容性，优先修复 WebP 编码输入格式问题。
  - [ ] 完成后至少执行与本轮改动直接相关的最小验证，并同步 `walkthrough.md`。

- [ ] 495. 冻结本轮范围，只排查“建立订单时图片上传报错”根因（2026-04-08，待确认）
  - [ ] 本轮先做根因分析，不直接修改业务代码。
  - [ ] 聚焦销售订单图片上传链路：前端请求、后端路由、存储同步提示。
  - [ ] 明确判断当前报错是否与 Redis 未就绪、Rust 服务异常或接口未实现/未注册有关。

- [ ] 496. 固化当前已观察现象
  - [ ] 前端控制台对 `/trading/sales-orders/evidence/upload` 报 `[API_ERROR] 404 Not Found`。
  - [ ] UI 同时出现“Evidence upload failed [API_ERROR] 404 Not Found”。
  - [ ] 页面另有“存储服务同步失败”提示，需要判断其是否与本次图片上传主失败链路直接相关。

- [ ] 497. 明确排查结论输出要求
  - [ ] 需要确认上传接口在前后端是否真实存在且路径一致。
  - [ ] 需要确认上传链路是否依赖 Redis、WebSocket 通知、或 Rust 解析服务。
  - [ ] 需要给出根因优先级判断，并明确下一步应修复的最小切口。

- [x] 494. 修复 `error-action-registry` 与 `translate` 的类型不匹配构建失败（2026-04-08，已完成）
  - [x] 已定位为 `handle-server-error.ts` 中传入 `translate(...)` 的 `messageKey` / `actionLabelKey` 被推断为普通 `string`。
  - [x] 已收紧 `src/lib/error-action-registry.ts` 的 key 类型，使其对齐 `TranslationKey`。
  - [x] 已避免继续使用宽泛 `string` 导致部署构建时 `tsc -b` 失败。
  - [x] 已验证：`pnpm exec tsc --noEmit` 通过，且 `handle-server-error.ts` 不再报 TS2345。

- [x] 490. 冻结本轮范围，规划并实现 `customer / supplier` 核心标识字段变更事务化（2026-04-08，已完成）
  - [x] 本轮只处理 `customer` / `supplier` 的核心标识字段，未并发进入状态、归档、删除或其他业务域。
  - [x] 已为“主体身份识别字段变更”建立显式 intent，而不是继续只依赖通用 `patch`。
  - [x] 仅对具备稳定业务语义、可审计、可复用后端裁决的字段进行了事务化。

- [x] 491. 明确 `customer` 核心标识字段事务化边界
  - [x] 已将候选字段限定为 `code` 与 `name`，未扩展到联系人、电话、邮箱、地址等普通档案字段。
  - [x] 已在纯 `code`、纯 `name` 或 `code + name` 场景下命中显式 transaction。
  - [x] 若混入其他普通档案字段，继续保留在现有 `patch` 链中。
  - [x] 唯一性、存在性与可变更约束继续由后端裁决，前端未猜规则。

- [x] 492. 明确 `supplier` 核心标识字段事务化边界
  - [x] 已将候选字段限定为 `code` 与 `name`，未扩展到分类、联系人、电话、邮箱、地址、主营产品等普通档案字段。
  - [x] 已在纯 `code`、纯 `name` 或 `code + name` 场景下命中显式 transaction。
  - [x] 若混入其他普通档案字段，继续保留在现有 `patch` 链中。
  - [x] 唯一性、存在性与可变更约束继续由后端裁决，前端未猜规则。

- [x] 493. 明确本轮风险、验证与收尾要求
  - [x] 已确认 `code` 存在唯一索引约束，并在 transaction 中复用后端唯一性校验。
  - [x] 已补后端 identity change transaction service，而不是仅让前端硬分流。
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run "Customer|Supplier"`。
  - [x] 已同步 `walkthrough.md` 记录核心标识字段 intent、分流条件、唯一性约束复用情况与验证结果。

- [x] 486. 冻结本轮范围，执行 `trading/customer` / `trading/supplier` 的 TDO 接入（2026-04-08，已完成）
  - [x] 本轮优先处理客户与供应商主数据模块，未并发进入其他业务域。
  - [x] 已为主数据编辑建立显式业务 intent，而不是继续只依赖 `patch`。
  - [x] 本轮先落地了最窄语义动作：`customer.status` / `supplier.status` 变更。

- [x] 487. 明确 `trading/customer` 的 TDO 边界
  - [x] 已盘点客户当前编辑仍以 CRUD + `patch` 主导的现状。
  - [x] 已为稳定、单语义的 `status` 变更建立 customer transaction intent。
  - [x] 普通档案混合编辑继续保留在现有 `patch` 链中。
  - [x] 未前端猜测客户校验规则，继续复用后端主数据裁决。

- [x] 488. 明确 `trading/supplier` 的 TDO 边界
  - [x] 已盘点供应商当前编辑仍以 CRUD + `patch` 主导的现状。
  - [x] 已为稳定、单语义的 `status` 变更建立 supplier transaction intent。
  - [x] 普通档案混合编辑继续保留在现有 `patch` 链中。
  - [x] 未前端猜测供应商校验规则，继续复用后端主数据裁决。

- [x] 489. 明确本轮验证与收尾要求
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run "Customer|Supplier"`。
  - [x] 已验证：customer / supplier 的纯 `status` 动作命中显式 transaction，普通混合编辑仍保留原链路。
  - [x] 已同步 `walkthrough.md`，记录 customer / supplier 的 TDO intent、分流条件与验证结果。

- [x] 484. 完成 `purchase` 头部第二刀：供应商主体变更事务化（2026-04-08，已完成）
  - [x] 已确认 `ORDER_SUPPLIER_CHANGE` 在前后端均已落地。
  - [x] 已确认采购编辑弹窗中纯 `supplierId` / `supplierName` 变更命中显式 transaction。
  - [x] 已确认混合编辑继续保留在现有 transaction / `patch` 链中。

- [x] 485. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [x] 已同步 `walkthrough.md`，记录 `purchase` 头部第二刀结果。

- [x] 481. 冻结本轮范围，执行 `purchase` 头部第二刀：供应商主体变更事务化（2026-04-08，已完成）
  - [x] 本轮只处理采购订单 `supplierId` / `supplierName` 的纯头部变更事务。
  - [x] 已确认供应商主体切换使用窄语义 intent。
  - [x] 未并发处理 `expectedDate`、其他头部字段、收货状态或任何行级编辑。

- [x] 482. 明确 `purchase` 头部第二刀边界
  - [x] 仅当 delta 仅包含 `supplierId` / `supplierName` 时，才走供应商主体变更 transaction。
  - [x] 若混入其他头部字段或行级字段，则不进入本轮 intent。
  - [x] 其余采购订单编辑继续保留在现有 transaction / `patch` 链中。
  - [x] 供应商不存在或不可用校验继续复用现有后端规则，不由前端猜测。

- [x] 483. 明确本轮验证与收尾要求
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [x] 已验证：采购编辑弹窗中纯供应商主体切换命中 transaction，混合编辑仍回落原链路。
  - [x] 完成后已同步 `walkthrough.md`，记录 `purchase` 头部第二刀 intent、分流条件与验证结果。

- [x] 479. 完成 `sales` 的 `status` / `statusNote` 联动重构（2026-04-08，已完成）
  - [x] 已补销售订单 `statusNote` 的最小编辑入口。
  - [x] 已将编辑弹窗中的纯 `statusNote` 修改从 `patch` 收敛到显式状态 transaction。
  - [x] 已保持详情页状态按钮与编辑弹窗共享同一条状态语义主链。

- [x] 480. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [x] 已同步 `walkthrough.md`，记录 `sales` 的 `status` / `statusNote` 联动重构结果。

- [x] 476. 冻结本轮范围，执行 `sales` 的 `status` / `statusNote` 联动重构（2026-04-08，已完成）
  - [x] 本轮处理销售订单 `status` 与 `statusNote` 的联动语义边界。
  - [x] 本轮按单一状态 transaction 主链收敛执行。
  - [x] 不并发处理 `orderName`、`purchaseOrderNo`、`requirements`、交期、客户、分类/类型或任何行级编辑。

- [x] 477. 明确 `sales` 中 `status` / `statusNote` 的重构边界
  - [x] 纯 `statusNote` 修改不再落回 `patch`，统一进入显式状态 transaction。
  - [x] `status + statusNote` 同时修改继续走现有状态流转 transaction。
  - [x] 若混入其他头部字段或行级字段，则不在本轮重构范围内。
  - [x] 其余销售订单编辑继续保留在现有 transaction / `patch` 链中。

- [x] 478. 明确本轮验证与收尾要求
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [x] 已验证：详情页状态按钮与编辑弹窗保存链路的 `status` / `statusNote` 语义一致。
  - [x] 完成后已同步 `walkthrough.md`，记录 `sales` 的 `status` / `statusNote` 联动重构结果。

- [ ] 471. 冻结本轮范围，执行 `sales` 头部下一刀：`purchaseOrderNo` 事务化（2026-04-08，待确认）
  - [ ] 本轮只处理销售订单 `purchaseOrderNo` 的纯头部变更事务。
  - [ ] 仅针对 `purchaseOrderNo` 单字段建 intent。
  - [ ] 不并发处理 `orderName`、`requirements`、交期、客户、分类/类型或任何行级编辑。

- [ ] 472. 明确 `sales` 头部 `purchaseOrderNo` 边界
  - [ ] 仅当 delta 仅包含 `purchaseOrderNo` 时，才走 `purchaseOrderNo` transaction。
  - [ ] 若混入其他头部字段或行级字段，则不进入本轮 intent。
  - [ ] 其余销售订单编辑继续保留在现有 transaction / `patch` 链中。

- [ ] 473. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `sales` 头部 `purchaseOrderNo` 事务化结果。

- [ ] 466. 冻结本轮范围，执行 `sales` 头部下一刀：`orderName` 编辑入口 + 事务化（2026-04-08，待确认）
  - [x] 1. 账号管理：修复废弃服务调用逻辑 / Personnel Accounts Migration
    - [x] 修正 `EmployeeService` Proxy 导出逻辑
    - [x] 完成 `use-users-action-dialog-options.ts` 迁移
  - [x] 2. 采购物流：修复无限循环与快照报错 / Purchase Logistics Fix
    - [x] 优化 `purchase-logistics-offline-draft-service.ts` 快照缓存
    - [x] 优化 `PurchaseLogisticsPage` 自动同步 Effect
  - [x] 3. 架构归一化：质量管理与计件工资模块 / Quality & Piecework Normalization
    - [x] 创建 QualityCore/Maintenance Services
    - [x] 重构 `use-quality.ts` Hook
    - [x] 创建 PieceworkMaintenanceService
    - [x] 重构 `use-piecework.ts` Hook
    - [x] [四阶段] BOM 财务成本试算下沉 (SummaryPanel)
- [x] [四阶段] SKU 与 产品条码规则合规化 (ProductDerive)
- [x] [四阶段] 质量任务待测总量统计优化 (QualityInspection)
- [x] [四阶段] 物料使用频率统计下沉 (MaterialUsageService)
  - [x] 4. 仓库管理：架构归一化与清理 / Warehouse Normalization
    - [x] 移除 `inbound-service.ts` 废弃文件 (通过代码清理完成)
    - [x] 拆分 `WarehouseCategory` Core/Maintenance 服务
    - [x] 拆分 `Stocktake` Core/Maintenance 服务
    - [x] 建立 `use-warehouse-category.ts` 与 `use-stocktake.ts` Hooks
    - [x] 重构 `warehouse-category.tsx` 与 `stocktake-mgmt.tsx` UI
    - [x] 迁移 PDA 模块：`src/features/pda-stocktake/hooks/use-stocktake.ts`
    - [x] 深度重构 `use-stock-mgmt.ts` 至 TanStack Query 架构

- [ ] 5. Rust 高性能搜索增强 (隔离开发阶段) / Rust Search Engine (Isolated)
    - [x] 初始化项目结构: `server/search-engine` & `Cargo.toml`
    - [x] 定义 Tantivy 索引 Schema (Material/Asset 映射)
    - [x] 实现 Axum 接口: `/v1/index` (SDRTS 接入) & `/v1/search`
    - [x] 编写支持多阶段构建的 `Dockerfile` (适配 VPS)
    - [ ] 6. Rust 高性能搜索增强 (后端集成阶段) / Rust Search Integration (Backend)
    - [x] 创建 Go 侧 `SearchServiceClient` (`search_client.go`)
    - [x] 为 `Inventory` 实体插入 SDRTS 同步钩子 (入库/出库/调拨)
    - [x] 实现全量索引初始化脚本 (`RebuildSearchIndex`)
    - [x] 验证后端变动与 Rust 服务的连通性
    - [x] 7. Rust 高性能搜索增强 (全栈集成阶段) / Rust Search Full-Stack Integration
    - [x] 在 `SearchServiceClient` 中增加 `Search` 查询方法
    - [x] 实现 Go 侧 `SearchGlobal` Handler (带数据脱敏/增强)
    - [x] 注册 `/api/v1/search/global` 路由
    - [x] 重构 `use-command-menu.ts` 接入新接口并清理旧调用
    - [x] 8. 全量搜索 UI 重构 (业务优先 & 选项卡布局) / Search UI Refactor (Tabbed)
    - [x] 简化 `search-data.ts` 剔除冗余导航项
    - [x] 引入 `Tabs` 组件并重构 `CommandMenuView` 为双 Tab 架构
    - [x] 适配跨设备样式 (Mobile/PDA/Desktop)
    - [x] 验证 Tab 切换动画及 Rust 结果展示逻辑
    - [x] 9. 命令菜单生产力中心重构 (指令爆炸 & 去外观化) / Search Productivity Hub
    - [x] 补全全量业务指令集 (`search-data.ts` / `actionConfigs`)
    - [x] 清理 `CommandMenuView` 中的主题设置与低频系统入口
    - [x] 调整操作 Tab 为高密度紧凑布局
    - [x] 验证全量指令的搜索命中与路由直达逻辑
    - [x] 10. 搜索结果初始展示优化 (按需折叠) / Search Display Optimization
    - [x] 实现针对 `searchValue` 为空的列表截断逻辑 (`slice(0, 6)`)
    - [x] 添加全量搜索引导视觉锚点 (`More...`)
    - [x] 验证有无搜索关键词状态下的布局联动效果

- [ ] 467. 明确 `sales` 头部 `orderName` 边界
  - [ ] 仅当 UI 可编辑且 delta 仅包含 `orderName` 时，才走 `orderName` transaction。
  - [ ] 若混入其他头部字段或行级字段，则不进入本轮 intent。
  - [ ] 其余销售订单编辑继续保留在现有 transaction / `patch` 链中。

- [ ] 468. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `sales` 头部 `orderName` 事务化结果。

- [ ] 461. 冻结本轮范围，执行 `sales` 头部 patch 压缩下一稳定切口（2026-04-08，待确认）
  - [ ] 本轮只从 `sales` 当前仍直落 `patchMutation` 的头部字段中挑一个稳定切口。
  - [ ] 不并发实现多个 `sales` 头部新 intent。
  - [ ] 不进入 `sales` 行级混合编辑压缩。

- [ ] 462. 明确 `sales` 头部下一唯一切口
  - [ ] 先确认当前仍直接落回 `patchMutation` 的头部字段候选。
  - [ ] 按“单语义、稳定、可复制已有样板、收益高”选择唯一切口。
  - [ ] 其余 `sales` 头部编辑继续保留在现有 `patch` 链中。

- [ ] 463. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `sales` 头部 patch 压缩结果。

- [ ] 455. 冻结本轮范围，执行 `purchase` 头部第二刀：供应商主体变更事务化（2026-04-08，待确认）
  - [ ] 本轮只处理采购订单供应商主体变更事务。
  - [ ] 仅针对 `supplierId` / `supplierName` 的纯头部变更建 intent。
  - [ ] 不并发处理 `expectedDate`、其他头部字段或任何行级编辑。

- [ ] 456. 明确 `purchase` 头部第二刀边界
  - [ ] 仅当 delta 仅包含 `supplierId` / `supplierName` 时，才走供应商主体变更 transaction。
  - [ ] 若混入其他头部字段或行级字段，则不进入本轮 intent。
  - [ ] 其余采购订单编辑继续保留在现有 `patch` 链中。

- [ ] 457. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `purchase` 头部第二刀 intent、分流条件与验证结果。

- [ ] 450. 冻结本轮范围，执行 `sales` / `purchase` 的 patch 兜底压缩专项（2026-04-08，待确认）
  - [ ] 本轮先做双域现状盘点，不直接并发推进多个新 intent。
  - [ ] 目标是明确哪些编辑路径仍落回 `patch`，以及这些回退是否合理。
  - [ ] 本轮只允许在完成分析后选择一个最高价值切口进入下一轮实现。

- [ ] 451. 梳理 `sales` / `purchase` 仍落回 `patch` 的真实路径
  - [ ] 明确头部字段编辑中哪些仍由 `patchMutation` 承担。
  - [ ] 明确行级混合编辑中哪些仍由 `patchMutation` 承担。
  - [ ] 区分“合理兜底”与“仍可继续语义化”的回退路径。

- [ ] 452. 明确本轮验证与收尾要求
  - [ ] 若本轮仅完成分析，则同步 `walkthrough.md` 记录盘点结论与下一轮建议。
  - [ ] 若本轮选定并实现一个新切口，则执行 `pnpm exec tsc --noEmit` 与对应 Go 测试。
  - [ ] 全程不得把 `patch` 直接删除，必须保留安全兜底链路。

- [ ] 444. 冻结本轮范围，执行 `purchase` 行级事务化第三刀：`ORDER_LINE_REMOVE`（2026-04-08，待确认）
  - [ ] 本轮只处理采购订单纯删除行事务。
  - [ ] 不并发处理 `ORDER_LINE_ADD`。
  - [ ] 不扩展回采购订单头字段，不退回整单 patch 包装型 transaction。

- [ ] 445. 明确 `purchase` 行级第三刀边界
  - [ ] 仅当可稳定识别为“纯删除行”时，才走 `ORDER_LINE_REMOVE`。
  - [ ] 若存在既有行内容修改或头部字段混入，则不进入本轮 intent。
  - [ ] 若纯行级变更但不是“仅删除”，继续保留在现有 `ORDER_LINE_CONTENT_CHANGE` / `ORDER_LINE_ADD` / `patch` 链中。

- [ ] 446. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `purchase` 行级第三刀 intent、分流条件与验证结果。

- [ ] 438. 冻结本轮范围，执行 `purchase` 行级事务化第二刀：`ORDER_LINE_ADD`（2026-04-08，待确认）
  - [ ] 本轮只处理采购订单纯新增行事务。
  - [ ] 不并发处理 `ORDER_LINE_REMOVE`。
  - [ ] 不扩展回采购订单头字段，不退回整单 patch 包装型 transaction。

- [ ] 439. 明确 `purchase` 行级第二刀边界
  - [ ] 仅当可稳定识别为“纯新增行”时，才走 `ORDER_LINE_ADD`。
  - [ ] 若存在既有行内容修改或头部字段混入，则不进入本轮 intent。
  - [ ] 若纯行级变更但不是“仅新增”，继续保留在现有 `ORDER_LINE_CONTENT_CHANGE` / `patch` 链中。

- [ ] 440. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `purchase` 行级第二刀 intent、分流条件与验证结果。

- [ ] 426. 冻结本轮范围，执行 `purchase` 事务化第一刀（2026-04-08，待确认）
  - [ ] 本轮目标是将 `sales` 已验证的 transaction 样板横向复制到 `purchase`。
  - [ ] 本轮只选一个最小可复制切口，不并发推进整个采购域事务化。
  - [ ] 不扩展到库存、MRP 或跨域聚合链路。

- [ ] 427. 明确 `purchase` 第一刀的优先切口
  - [ ] 优先分析是否应先做采购订单头部字段事务，而非直接切行级。
  - [ ] 候选优先项：`ORDER_DELIVERY_DATE_CHANGE` 对应采购预计到货期调整。
  - [ ] 明确本轮只选一个最稳妥切口实施，避免一开始并发复制过多 intent。

- [ ] 428. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `purchase` 第一刀 intent、分流条件与验证结果。

- [ ] 420. 冻结本轮范围，执行 `sales` 行级事务化第四刀：`ORDER_LINE_REMOVE`（2026-04-08，待确认）
  - [ ] 本轮只处理销售订单纯删除行事务。
  - [ ] 不并发处理 `ORDER_LINE_ADD`。
  - [ ] 不扩展回订单头字段，不退回整单 patch 包装型 transaction。

- [ ] 421. 明确 `ORDER_LINE_REMOVE` 的边界
  - [ ] 仅当可稳定识别为“纯删除行”时，才走 `ORDER_LINE_REMOVE`。
  - [ ] 若存在既有行内容修改或头部字段混入，则不进入本轮 intent。
  - [ ] 若是纯行级变更但不是“仅删除”，继续保留在现有 `ORDER_LINES_CHANGE` / `ORDER_LINE_CONTENT_CHANGE` / `ORDER_LINE_ADD`。

- [ ] 422. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `ORDER_LINE_REMOVE` 的分流条件与验证结果。

- [ ] 414. 冻结本轮范围，执行 `sales` 行级事务化第三刀：`ORDER_LINE_ADD`（2026-04-08，待确认）
  - [ ] 本轮只处理销售订单行新增事务。
  - [ ] 不并发处理 `ORDER_LINE_REMOVE`。
  - [ ] 不扩展回订单头字段，不退回整单 patch 包装型 transaction。

- [ ] 415. 明确 `ORDER_LINE_ADD` 的边界
  - [ ] 仅当可稳定识别为“纯行级新增”时，才走 `ORDER_LINE_ADD`。
  - [ ] 若存在既有行内容修改或头部字段混入，则不进入本轮 intent。
  - [ ] 若是纯行级变更但不是“仅新增”，继续保留在现有 `ORDER_LINES_CHANGE` / `ORDER_LINE_CONTENT_CHANGE`。

- [ ] 416. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `ORDER_LINE_ADD` 的分流条件与验证结果。

- [ ] 408. 冻结本轮范围，执行 `sales` 行级事务化第二刀（2026-04-08，待确认）
  - [ ] 本轮目标是将 `ORDER_LINES_CHANGE` 进一步细化为更窄的行级语义事务。
  - [ ] 候选范围仅限：行新增、行删除、行内容编辑。
  - [ ] 不扩展回订单头字段，不退回整单 patch 包装型 transaction。

- [ ] 409. 明确行级第二刀的优先切口
  - [ ] 优先分析是否应先做 `ORDER_LINE_CONTENT_CHANGE`。
  - [ ] 评估 `ORDER_LINE_ADD` 与 `ORDER_LINE_REMOVE` 是否适合在本轮独立收口。
  - [ ] 明确本轮只选一个最稳妥切口实施，避免一次性并发改三条行级语义链。

- [ ] 410. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录本轮 intent、分流条件与验证结果。

- [ ] 402. 冻结本轮范围，执行 `sales` 行级编辑事务化第一刀（2026-04-08，待确认）
  - [ ] 本轮只处理销售订单 `lines` 的纯内容编辑事务化。
  - [ ] 不扩展到订单头字段、客户主体、交期、分类/模式调整。
  - [ ] 不实现泛化 `ORDER_AMEND` 或整单 patch 包装型 transaction。

- [ ] 403. 明确行级编辑事务化第一刀边界
  - [ ] 仅当编辑订单提交的 delta 只涉及 `lines` 时，才允许切换到行级 transaction。
  - [ ] 本轮优先覆盖行内内容编辑场景，不把头部字段混入同一个 intent。
  - [ ] 其余任何混合编辑仍继续保留在现有 `patchMutation` 链中。

- [ ] 404. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录本轮行级 transaction intent、分流条件与验证结果。

- [ ] 396. 冻结本轮范围，执行 `sales` 分类/模式调整事务化（2026-04-08，待确认）
  - [ ] 本轮只处理订单头字段 `classification` / `type` 的语义事务化。
  - [ ] 不扩展到行项目编辑、客户主体、交期之外的其他改单项。
  - [ ] 代码改造前需确认：仅在纯 `classification/type` 变更场景切换到 transaction。

- [ ] 397. 明确分类/模式调整事务化边界
  - [ ] 当编辑订单提交的 delta 仅包含 `classification`、`type` 时，走独立 transaction。
  - [ ] 若同时混入其他字段，仍保留在现有 `patch` 链中。
  - [ ] 保持已有 `ORDER_CUSTOMER_CHANGE` 与 `ORDER_DELIVERY_DATE_CHANGE` 分流逻辑不回退。

- [ ] 398. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录本轮 transaction intent、分流条件与验证结果。

- [ ] 391. 冻结本轮范围，执行 `sales` 交期调整事务化（2026-04-08，待确认）
  - [ ] 本轮只处理改单事务化第二刀：交期调整。
  - [ ] 已完成客户主体调整事务化后，本轮继续沿用“单字段语义收口”的推进方式。
  - [ ] 代码改造前需先确认本轮只覆盖 `deliveryDate`。

- [ ] 392. 明确交期调整事务化边界
  - [ ] 仅当 `deliveryDate` 发生变化时，编辑订单才走独立 transaction。
  - [ ] 不将分类/模式调整或其他字段一并混入本轮 intent。
  - [ ] 其他普通编辑仍继续保留在 `patch` 链中。

- [ ] 393. 明确交期调整事务化风险控制
  - [ ] 需要避免把包含多字段的 delta 强行塞入“交期调整 transaction”。
  - [ ] 需要保证现有编辑对话框在非纯交期修改场景下继续走 `patchMutation`。
  - [ ] 需要保持 toast、invalidate、版本冲突与详情回显口径一致。

- [ ] 386. 冻结本轮范围，执行 `sales` 改单事务化（2026-04-08，待确认）
  - [ ] 本轮只推进改单事务化，不扩展到审批后状态细化或其他域。
  - [ ] 第一刀不做全量改单事务化，避免退化成 `patch` 外层包装壳。
  - [ ] 代码改造前需先确认本轮首个切入范围。

- [ ] 387. 明确改单事务化首个切入范围
  - [ ] 建议第一刀只处理订单头关键语义修改，而不是整单任意字段修改。
  - [ ] 优先候选可包含：客户主体调整、交期调整、订单分类/模式调整。
  - [ ] 行项目明细的大范围编辑暂继续保留在普通 `patch` 表单链中。

- [ ] 388. 明确改单事务化风险与边界
  - [ ] 需要避免把现有 `patchSalesOrder` 原样包进 transaction intent，导致语义失真。
  - [ ] 需要明确改单事务的 payload 只承载被批准的一小组业务语义字段。
  - [ ] 需要保证普通表单编辑链路仍可用，不因首刀事务化造成大面积断裂。

- [ ] 375. 冻结本轮范围，只处理 `sales` query / transaction 分层拆分（2026-04-08，待确认）
  - [ ] 本轮聚焦前端 `sales` 域分层拆分，不扩散到新的事务语义扩展。
  - [ ] 本轮目标是拆出 query hooks / transaction hooks / query service，收口旧混合入口。
  - [ ] 本轮不顺手推进 `ORDER_STATUS_TRANSITION` 或其他域改造。

- [ ] 376. 明确分层拆分目标与边界
  - [ ] 拆分目标优先覆盖：`use-sales-queries.ts`、`use-sales-transactions.ts`、`sales-query-service.ts`。
  - [ ] 已存在的 `sales-transaction-service.ts` 继续保留，作为 transaction 层正式入口之一。
  - [ ] 本轮只做职责重组与引用切换，不改变现有业务语义与接口契约。

- [ ] 377. 明确建议改动面与风险点
  - [ ] 需要评估 `use-sales.ts` 是否保留为兼容 re-export 薄壳，还是直接收缩为过渡文件。
  - [ ] 需要同步评估 `src/features/trading/sales/index.ts` 的导出策略，避免拆分后出现双入口漂移。
  - [ ] 需要控制 query key、mutation 成功回调、toast / invalidate 行为不发生回归。

- [ ] 378. 明确进入拆分实施前确认点
  - [ ] 需要用户确认本轮按前端分层拆分推进。
  - [ ] 需要用户确认是否允许 `use-sales.ts` 暂时保留为兼容桥接层。
  - [ ] 用户确认后再正式开始业务代码拆分。



- [ ] 367. 冻结本轮范围，只沉淀 `sales` 第一阶段 TDO 化改造方案独立文档（2026-04-08，待确认）
  - [ ] 本轮只新增单独 Markdown 方案文档，不修改业务代码。
  - [ ] 文档聚焦 `sales` 域第一阶段，从当前 patch 驱动走向语义事务入口的最小改造方案。
  - [ ] 文档应明确边界、分阶段目标、拟改文件、风险点与验证口径。

- [ ] 368. 明确方案文档目标与边界
  - [ ] 文档应服务于 `sales` 第一阶段 TDO 化，而不是泛化为全域统一方案。
  - [ ] 文档应聚焦第一阶段样板动作，优先围绕 `claim` 与状态推进链路展开。
  - [ ] 文档应先给出“方案与实施路径”，不在本轮混入具体代码 diff。

- [ ] 369. 明确建议落点与目录策略
  - [ ] 延续 `workflow` 专题目录，保持“现状拓扑图”与“阶段方案”并排存放。
  - [ ] 建议路径：`docs/architecture/workflow/sales-phase1-tdo-alignment-plan.md`。
  - [ ] 若用户确认其他命名，再按确认结果调整，不擅自生成多份近义文档。

- [ ] 370. 明确本轮确认点
  - [ ] 需要用户确认是否接受建议路径 `docs/architecture/workflow/sales-phase1-tdo-alignment-plan.md`。
  - [ ] 需要用户确认文档主体以第一阶段方案为主，是否允许文末附“后续阶段预留”。
  - [ ] 用户确认后再正式创建该独立 Markdown 文件。

- [ ] 363. 冻结本轮范围，只沉淀“当前各域数据流/副作用流/工作流接点”独立拓扑图文档（2026-04-08，待确认）
  - [ ] 本轮只新增单独 Markdown 文档，不修改业务代码。
  - [ ] 文档内容聚焦 `sales / purchase / inventory / workflow-core` 四域当前真实拓扑。
  - [ ] 文档应覆盖三条主线：数据流、副作用流、工作流接点。

- [ ] 364. 明确文档目标与产出形式
  - [ ] 产出一份可独立阅读的现状拓扑图文档，而不是将内容塞入 `implementation_plan.md`。
  - [ ] 文档需可作为后续 `SDRTS + Workflow + TDO` 收敛方案的现状基线。
  - [ ] 文档需明确各域当前真实职责，而不是抽象化愿景描述，并在文末增加“后续收敛方向”作为下一步入口。

- [ ] 365. 明确建议落点与目录策略
  - [ ] 优先采用目录化落点，避免继续在仓库根目录堆叠架构说明。
  - [ ] 若用户确认其他目录，再按确认结果调整，不擅自新增多个重复版本。

- [ ] 366. 明确本轮确认点
  - [ ] 根据确认结果创建该独立 Markdown 文件。


- [ ] 328. 冻结本轮范围，只处理仓储库存聚合链后移后端方案（2026-04-07，待确认）
  - [ ] 聚焦 `src/features/warehouse/services/inventory-service.ts` 的 `getInventoryList()`。
  - [ ] 本轮只先收口库存视图聚合，不顺带处理主数据搜索聚合、通知扫描与 dashboard 统计。
  - [ ] 本轮先完成方案与边界确认，待批准后再改前后端业务代码。

- [ ] 329. 固化当前前端重计算现状
  - [ ] 当前 `inventory-service.ts` 需要并行拉取 `materialService.getMaterialOptions()`、`productService.getProducts()`、`getInventoryListRaw()` 后在浏览器本地聚合结果。
  - [ ] `getInventoryList()` 在前端完成库存视图拼装、主数据映射与孤儿库存完整性校验日志。
  - [ ] 这条库存视图链目前是 `use-stock-mgmt.ts` 等仓储页面的正式展示事实源。

- [ ] 330. 固化当前架构问题
  - [ ] 前端承担了跨模块库存聚合与主数据拼装，而不是只消费后端权威视图。
  - [ ] 同一页面/服务需要拉取多份主数据再本地组装，放大网络体积与快照不一致风险。
  - [ ] 库存展示口径、搜索口径与数据完整性校验未收敛到后端，难以复算、审计与复用。

- [ ] 331. 明确最小后移目标
  - [ ] 后端提供权威库存视图接口，直接返回当前前端 `InventoryView` 所需字段。
  - [ ] 前端 `inventory-service.ts#getInventoryList()` 不再自行拉三份数据做正式聚合。
  - [ ] `searchMasterData()` 暂不纳入本轮实施。

- [ ] 332. 明确本轮实施边界
  - [ ] 本轮只改造 `warehouse` 库存视图链路。
  - [ ] `use-stock-mgmt.ts` 做最小消费层适配，不重做页面 UI。
  - [ ] `use-report.ts` 若不受影响则不改，`searchMasterData()` 留待下一轮。
  - [ ] `use-notification-rules.ts` 与 `dashboard/trace-service.ts` 只记录为下一批候选，不在本轮实施。

- [ ] 333. 明确验证口径
  - [ ] 前端不再通过 `materialService + productService + inventory raw` 本地拼装库存权威视图。
  - [ ] `searchMasterData()` 保持现状，不作为本轮回归阻塞项。
  - [ ] `pnpm exec tsc --noEmit` 通过，且 `warehouse` 库存管理主链可正常编译。

## P1 AI 单入口收敛专项（2026-04-07，待确认）

- [ ] 312. 冻结本轮范围，只处理 AI 入口容器收敛
  - [ ] 保留当前中间弹窗交互作为唯一主容器。
  - [ ] 移除侧边栏/抽屉式 AI 主交互路径。
  - [ ] 本轮不顺带重做 AI provider、提示词、权限体系或业务数据采集链。

- [ ] 313. 固化当前维护问题
  - [ ] 当前同一个 AI 按钮会因状态不同而打开 `DailyInsightModal` 或 `AiDrawer` 两种完全不同容器。
  - [ ] 用户点击前无法预期结果，形成明显交互歧义。
  - [ ] 双容器并存会放大后续样式、状态、权限和行为维护成本。

- [ ] 314. 明确收口目标
  - [ ] AI 按钮点击后始终进入同一种容器。
  - [ ] 统一保留中间弹窗，不再保留侧边抽屉作为主交互入口。
  - [ ] 减少多套 UI 同步维护造成的偏差和生产/DEV 认知错位。

- [ ] 315. 明确最小实施边界
  - [ ] 复用现有 `DailyInsightModal` 作为唯一主容器。
  - [ ] `AiDrawer` 从主入口移除，必要时删除相关触发链和无用状态。
  - [ ] 若仍需普通聊天能力，应在同一中间弹窗内承载，而不是继续保留第二套主容器。

- [ ] 316. 明确验证要求
  - [ ] 点击 AI 按钮后，无论是否有 unread insight，用户都进入统一中间弹窗体系。
  - [ ] 不再出现“一次点开抽屉、一次点开弹窗”的随机体验。
  - [ ] 生产与 DEV 在容器层级上保持一致。

## P1 AI 治理权限口径统一专项（方案B，2026-04-07，待确认）

- [ ] 306. 冻结本轮范围，只处理 AI 治理权限前后端判定口径漂移
  - [ ] 聚焦 `use-ai-permissions.ts`、`provider-client.ts`、`server/middleware/ai_policy_guard.go`、认证上下文中的 `role/username` 来源。
  - [ ] 本轮不顺带重做 AI 弹窗 UI，不扩散到 provider 选型或通用权限体系重构。
  - [ ] 本轮先输出统一口径方案，待确认后再改代码。

- [ ] 307. 固化已确认问题现象
  - [ ] DEV 环境点击 AI 后可进入 `DailyInsightModal`。
  - [ ] 生产环境点击 AI 后只进入 `AiDrawer`。
  - [ ] 生产日志显示 `AI_PROXY_ERROR (403): Current user is not allowed by AI governance policy`。

- [ ] 308. 固化根因判断
  - [ ] `DailyInsightModal` 是否出现取决于 `aiAgentService` 是否成功把 `hasUnread` 置为 `true`。
  - [ ] 生产环境后台任务已触发，但在 `/api/v1/ai/proxy` 进入服务端时被 `AIPolicyGuard()` 拒绝。
  - [ ] 前端当前按 `user.role[] / username` 做可见性与能力判定；后端当前按单个 `context.role / username` 做准入判定，存在口径漂移。

- [ ] 309. 明确方案B目标
  - [ ] 前后端 AI 治理判定必须收敛到同一事实来源。
  - [ ] 避免再次出现“前端允许打开 AI，后端 `/ai/proxy` 403 拒绝”的割裂体验。
  - [ ] 不依赖前端本地缓存或页面态猜测角色集合。

- [ ] 310. 明确最小实施边界
  - [ ] 优先以后端认证上下文中的权威角色集合/用户名作为唯一裁决输入。
  - [ ] 前端 `useAiPermissions()` 仅消费与后端一致的权威可用性结果，或至少与同一策略口径对齐。
  - [ ] 不通过前端吞掉 403 或强行伪造 unread insight 掩盖问题。

- [ ] 311. 明确验证口径
  - [ ] 被授权用户在 DEV / 生产应都能成功触发 AI 背景任务，并出现 `DailyInsightModal`。
  - [ ] 未授权用户前后端都应一致拒绝，且拒绝方式一致、可解释。
  - [ ] `/api/v1/ai/proxy` 不应再对“前端已判定可用”的同一用户返回治理 403。

。

## P1 DTO 接入缺口盘点与整改规划（2026-04-07，待确认）

- [ ] 281. 冻结本轮范围，只处理前端 service 层 DTO/Delta 协议接入缺口盘点与整改规划
  - [ ] 仅盘点 `src/features/**/services` 下的前端 service 文件。
  - [ ] 仅输出文件、函数、风险级别、问题类型与拟整改策略。
  - [ ] 本轮不直接修改业务代码，不顺带重构全局 `apiFetch`。

- [ ] 282. 识别高风险 DTO 缺口（优先整改候选）
  - [ ] `src/features/engineering/services/product-service.ts`
    - [ ] `getProducts()`：仍使用 `apiFetch<any>` + `as Product[]`。
    - [ ] `getProductTypes()`：仍使用 `apiFetch<any>` + `as ProductType[]`。
  - [ ] `src/features/trading/services/trading-service.ts`
    - [ ] `saveCustomer()`：返回对象未显式做响应校验。
    - [ ] `saveSupplier()`：返回对象未显式做响应校验。
    - [ ] `getSalesOrderById()`：详情读取未显式做响应校验。
    - [ ] `getSalesOrderByNo()`：详情读取未显式做响应校验。
    - [ ] `saveSalesOrder()`：返回对象未显式做响应校验。
    - [ ] `savePurchaseOrder()`：返回对象未显式做响应校验。
  - [ ] `src/features/warehouse/services/category-service.ts`
    - [ ] `getCategories()`：列表读取仍直接返回 `apiFetch` 结果。

- [ ] 283. 识别中风险 DTO 缺口（已部分接入 Delta，但全链路未收口）
  - [ ] `src/features/users/services/user-api.ts`
    - [ ] `fetchUsers()`：分页读取未显式做响应校验。
    - [ ] `fetchUserOptions()`：选项读取未显式做响应校验。
    - [ ] `createUser()`：创建返回对象未显式做响应校验。
    - [ ] `replaceUser()`：全量替换返回对象未显式做响应校验。
  - [ ] `src/features/trading/services/trading-service.ts`
    - [ ] 已补 `patchCustomer()`，但 customer/supplier/order 的 create/read/patch 响应校验风格仍未完全统一。

- [ ] 284. 识别待二次审计的低到中风险目录
  - [ ] `src/features/equipment-tooling/services/*.ts`
  - [ ] `src/features/basic-settings/services/*.ts`
  - [ ] `src/features/engineering-db/services/*.ts`
  - [ ] `src/features/finance/services/*.ts`
  - [ ] `src/features/approval/services/*.ts`
  - [ ] 输出时优先确认是否存在“只有 save/get，没有 patch DTO”或“直接 `apiFetch<any>` + 类型断言”的链路。

- [ ] 285. 为每个整改项定义统一判定标准
  - [ ] 读取链路：避免 `apiFetch<any>` 与裸 `as Xxx[]`。
  - [ ] 创建/更新链路：返回对象需显式做 `ensureObjectResponse(...)`。
  - [ ] 列表/选项链路：返回数组需显式做 `ensureArrayResponse(...)`。
  - [ ] Patch 链路：统一走 `DeltaPayload` / `DeltaSet`。

- [ ] 286. 将 DTO 整改表写入实施文档
  - [ ] 在 `implementation_plan.md` 中输出“文件 + 函数 + 风险级别 + 问题类型 + 拟整改策略”表。
  - [ ] 待确认后再按风险等级分批实施，避免一次性横扫全部 service。
