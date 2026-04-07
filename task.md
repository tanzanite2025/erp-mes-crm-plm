
- [ ] 371. 冻结本轮范围，只沉淀 `sales` 第一阶段 TDO 化可执行实施清单（2026-04-08，待确认）
  - [ ] 本轮只新增单独 Markdown 执行清单，不修改业务代码。
  - [ ] 清单需从既有方案文档压缩而来，直接服务于后续代码改造审批。
  - [ ] 清单需按可执行 Phase 输出目标文件、动作、风险与验证口径。

- [ ] 372. 明确执行清单目标与边界
  - [ ] 文档目标是让后续代码改造可按阶段推进，而不是重复展开长篇方案说明。
  - [ ] 本轮只覆盖 `sales` 第一阶段，不扩散到 `purchase / inventory / workflow-core` 实施清单。
  - [ ] 清单应明确“先改什么、后改什么、每步验什么”，但不直接写代码 diff。

- [ ] 373. 明确建议落点与目录策略
  - [ ] 延续 `workflow` 专题目录，与“现状拓扑图”“方案文档”形成配套三件套。
  - [ ] 建议路径：`docs/architecture/workflow/sales-phase1-tdo-execution-checklist.md`。
  - [ ] 用户确认后创建，作为进入代码改造前的最后审批稿。

- [ ] 374. 明确进入代码改造前的确认点
  - [ ] 需要用户确认执行清单内容可作为正式实施顺序。
  - [ ] 需要用户明确批准后，才可进入 `sales` 第一阶段代码改造。
  - [ ] 未获批准前，不得开始修改业务代码。

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
  - [x] 路径确认：`docs/architecture/workflow/current-domain-topology-map.md`。
  - [ ] 若用户确认其他目录，再按确认结果调整，不擅自新增多个重复版本。

- [ ] 366. 明确本轮确认点
  - [x] 用户已确认接受路径 `docs/architecture/workflow/current-domain-topology-map.md`。
  - [x] 用户已确认文档主体为“当前现状拓扑”，并允许文末补充“后续收敛方向”。
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


## P1 AI 管理员前端误拒绝回归（2026-04-07，待确认）

- [ ] 317. 冻结本轮范围，只处理管理员点击 AI 被前端误拒绝的问题
  - [ ] 聚焦 `src/features/ai-assistant/hooks/use-ai-permissions.ts`。
  - [ ] 本轮不重做 AI policy 数据模型，不扩散到后端治理策略重构。
  - [ ] 本轮先输出最小修复方案，待确认后实施。

- [ ] 318. 固化当前现象
  - [ ] DEV 环境下系统管理员点击 AI 按钮，前端直接提示：`[权限拒绝] 您当前的角色未被授予极光 AI 决策权限。`
  - [ ] 这导致当前无法放心进入生产验证。

- [ ] 319. 固化根因判断
  - [ ] 后端 `AIPolicyGuard()` 当前仍保留 `admin / superadmin` bypass。
  - [ ] 前端 `useAiPermissions()` 在上轮口径统一时已切到 `effectiveRoles` 判定，但没有同步保留管理员 bypass。
  - [ ] 因此前后端再次出现新的轻量漂移：后端可放行，前端先误拒绝。

- [ ] 320. 明确最小修复目标
  - [ ] 前端 AI 准入判定补回与后端一致的 `admin / superadmin` bypass。
  - [ ] 管理员在未命中显式 `allowedRoles / allowedUsers` 时，仍可使用 AI。
  - [ ] 不改普通用户的 AI 治理口径。

- [ ] 321. 明确验证要求
  - [ ] DEV 环境下 `admin / superadmin` 点击 AI 时不再出现前端误拒绝提示。
  - [ ] 非管理员仍按现有 AI policy 正常判定。
  - [ ] 不引入新的“前端放行、后端拒绝”漂移。

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

## P1 仓储报表异常专项（2026-04-07，待确认）

- [ ] 300. 冻结本轮范围，只分析仓储报表当前异常链路
  - [ ] 聚焦 `useWarehouseReport` / `use-report.ts` / `InventoryService.searchMasterData()` / `MaterialService.getMaterialOptions()` / `getAlertThresholds()`。
  - [ ] 本轮先补审批稿，不直接修改业务代码。
  - [ ] 不扩散到库存模块整体重构或全局 API 客户端重写。

- [ ] 301. 明确当前异常现象
  - [ ] 控制台出现 `MaterialService.getMaterialOptions ... expected an object response` 相关错误文案。
  - [ ] 同时可见 `InventoryService [MOCK_SERVICE] getAlertThresholds is returning empty initial object` 警告。
  - [ ] 用户要求“找根因，禁止打补丁”。

- [ ] 302. 明确已确认调用链
  - [ ] `src/features/warehouse/hooks/use-report.ts` 负责报表主数据加载。
  - [ ] `inventoryService.searchMasterData()` 内部调用 `materialService.getMaterialOptions()`。
  - [ ] `inventoryService.getAlertThresholds()` 当前是 mock，返回空对象并打印 warning。

- [ ] 303. 明确根因判断
  - [ ] 当前 `src/features/material-archive/services/material-service.ts` 中 `getMaterialOptions()` 已按数组响应校验收口。
  - [ ] 报错文案仍声称“expected an object response”，与现仓代码不一致。
  - [ ] 结论：当前仓储报表异常更符合“旧 bundle 仍在运行 / 前端资源未刷新 / 部署版本错位”特征，而不是 `getAlertThresholds()` mock 自身导致。

- [ ] 304. 明确不应误判的点
  - [ ] `getAlertThresholds()` 的 mock warning 是噪音，但不是当前 `MaterialService.getMaterialOptions` 契约错误的直接根因。
  - [ ] 不应把本问题误修成继续改 `apiFetch` 全局解包策略。
  - [ ] 不应仅通过前端 try/catch 吞错来掩盖 bundle 漂移问题。

- [ ] 305. 明确后续实施边界
  - [ ] 优先验证实际运行 bundle 是否为最新构建产物。
  - [ ] 若运行产物落后，则先做部署/缓存刷新验证，不直接改业务代码。
  - [ ] 仅当确认当前运行代码与仓库一致后，才评估是否仍存在真实仓储报表链路缺口。

## P1 `asset-service.ts` facade/hook 拆层专项（2026-04-07，待确认）

- [ ] 294. 冻结本轮范围，只分析 `src/features/equipment-tooling/services/asset-service.ts` 是否需要拆层
  - [ ] 本轮仅输出职责拆解、风险判断与拟拆层路径。
  - [ ] 本轮不直接修改 `asset-service.ts`、不改页面调用方。
  - [ ] 本轮不顺带重构 `MoldService`、`FurnaceService`、`MoldLoanService`。

- [ ] 295. 明确 `asset-service.ts` 当前混合职责
  - [ ] facade 职责：聚合 `MoldService` / `FurnaceService` / `MoldLoanService` 能力并统一导出。
  - [ ] hook 职责：`useAssets()` 中维护本地状态、初始加载、事件监听与局部刷新。
  - [ ] UI 协调职责：在 `updateMolds()` / `updateFurnaces()` / `setAssetStatus()` 中执行乐观更新、回滚与错误处理。

- [ ] 296. 判断是否需要拆层
  - [ ] 当前文件已同时承担“领域 facade + React hook + 状态协调器”三类职责。
  - [ ] 该结构增加了测试难度、职责边界模糊度与后续模块抽离成本。
  - [ ] 结论：适合拆层，但应采用最小拆法，避免影响 equipment-tooling 现有页面行为。

- [ ] 297. 明确最小拆层方向
  - [ ] 保留 `AssetService` 作为无状态 facade（仅聚合领域命令与查询能力）。
  - [ ] 将 `useAssets()` 抽离到独立 hook 文件，专门承载 React 状态、事件监听与局部刷新。
  - [ ] 将乐观更新/回滚逻辑视情况进一步收口到 hook 内部私有 helper，不提前引入新的抽象基类。

- [ ] 298. 明确本轮不做事项
  - [ ] 不重写资产模块页面。
  - [ ] 不改变现有事件名（如 `xdfc_molds_updated` 等）。
  - [ ] 不调整 `AssetService` 对外 API 名称。
  - [ ] 不把本专项扩散成 equipment-tooling 全量架构重写。

- [ ] 299. 将拆层实施方案写入 `implementation_plan.md`
  - [ ] 明确拆分后的文件职责、迁移顺序、风险点与验证方式。
  - [ ] 待确认后再进入实施阶段。

## P1 DTO 第二阶段：`equipment-tooling/services` 与 `basic-settings/services`（2026-04-07，待确认）

- [ ] 287. 冻结本轮范围，只处理 `equipment-tooling/services` 与 `basic-settings/services` 的 DTO 接入缺口规划
  - [ ] 本轮仅更新审批稿，不直接修改业务代码。
  - [ ] 仅处理文件级、函数级、风险级别与拟整改策略。
  - [ ] 不扩散到 `engineering-db`、`finance`、`approval` 目录。

- [ ] 288. 识别 `equipment-tooling/services` 高风险缺口
  - [ ] `src/features/equipment-tooling/services/mold-service.ts`
    - [ ] `getMoldsWithVersion()`：仍依赖 `(response as any).data` 与 `(response as any).version` 的旧式兼容分支。
    - [ ] `getMoldById()`：详情读取未显式做对象响应校验。
    - [ ] `isSnDuplicate()`：对象读取未显式做 DTO guard。
    - [ ] `checkLinkIntegrity()`：聚合对象返回未显式做 DTO guard。
  - [ ] `src/features/equipment-tooling/services/mold-loan-service.ts`
    - [ ] `getLoans()`：列表读取未显式做数组响应校验。
    - [ ] `createBorrowRecord()`：仍使用 `apiFetch<any>` 且直接返回裸结果。
  - [ ] `src/features/equipment-tooling/services/furnace-service.ts`
    - [ ] `getFurnaces()`：列表读取未显式做数组响应校验。

- [ ] 289. 识别 `equipment-tooling/services` 中风险缺口
  - [ ] `src/features/equipment-tooling/services/archive-service.ts`
  - [ ] `src/features/equipment-tooling/services/asset-service.ts`
  - [ ] 待进入实施前再补函数级核对，避免当前误改未读文件。
  - [ ] `drawing-service.ts`、`partner-service.ts` 当前可暂视为已基本接入，不列入本轮优先整改。

- [ ] 290. 识别 `basic-settings/services` 高风险缺口
  - [ ] `src/features/basic-settings/services/system-config-service.ts`
    - [ ] `getConfigs()`：列表读取直接返回 `apiFetch` 结果。
    - [ ] `updateConfig()`：保存返回对象未显式做 DTO guard。
  - [ ] `src/features/basic-settings/services/enterprise-service.ts`
    - [ ] `getConfig()`：成功路径未显式做对象响应校验，404 fallback 与 DTO guard 未统一收口。
    - [ ] `saveConfig()`：保存返回对象未显式做 DTO guard。
  - [ ] `src/features/basic-settings/services/linear-barcode-protocol-service.ts`
    - [ ] `getConfig()`：成功路径未显式做对象响应校验。
    - [ ] `updateConfig()`：保存返回对象未显式做对象响应校验。
  - [ ] `src/features/basic-settings/services/numbering-service.ts`
    - [ ] `generateNumber()`：直接读取 `data.number`，未显式做 DTO guard。

- [ ] 291. 识别 `basic-settings/services` 相对完整链路
  - [ ] `src/features/basic-settings/services/unit-service.ts`：已具备数组/对象响应校验与 `patchUnit()`。
  - [ ] `src/features/basic-settings/services/dictionary-service.ts`：主要读取链路已显式做数组响应校验。

- [ ] 292. 明确第二阶段拟整改顺序
  - [ ] 先处理 `system-config-service.ts`、`enterprise-service.ts`、`linear-barcode-protocol-service.ts`、`numbering-service.ts`。
  - [ ] 再处理 `mold-service.ts`、`mold-loan-service.ts`、`furnace-service.ts`。
  - [ ] `archive-service.ts`、`asset-service.ts` 已完成函数级核对后再决定是否实施。

- [ ] 293. 补充 `archive-service.ts` 与 `asset-service.ts` 的函数级盘点结论
  - [ ] `src/features/equipment-tooling/services/archive-service.ts`
    - [ ] `getArchivedMolds()`：已使用 `ensureArrayResponse<Mold>(...)`，当前可视为已基本接入 DTO。
    - [ ] `archive()`：命令型接口，当前不依赖返回对象 DTO，主要是事件分发与命令提交。
    - [ ] 结论：本文件当前不作为优先整改目标，避免为了“统一形式”而过度修改。
  - [ ] `src/features/equipment-tooling/services/asset-service.ts`
    - [ ] 当前文件本质为 facade + hook 组合层，并不直接发起 `apiFetch`。
    - [ ] DTO 边界主要依赖 `MoldService`、`FurnaceService`、`MoldLoanService` 的返回契约。
    - [ ] 结论：本文件当前不应按底层 DTO service 同等处理，优先保持 facade 职责稳定。
  - [ ] 若后续继续治理 `asset-service.ts`，应聚焦 facade 边界与 hook 职责，而非强行补 response guard。

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

## P0 `/purchase/logistics` 页面 500 修复（2026-04-07，待确认）

- [ ] 276. 冻结本轮修复范围，只处理 `/purchase/logistics` 页面当前两处已定位故障
  - [ ] 修复采购订单查询接口路径错误导致的 404。
  - [ ] 修复离线草稿 `useSyncExternalStore` 快照不稳定导致的无限更新。
  - [ ] 不扩散成采购模块整体重构或全局 store 架构改造。

- [ ] 277. 修复采购订单查询路径与后端真实路由不一致问题
  - [ ] 当前前端请求：`/purchase-orders?status=Approved`
  - [ ] 后端真实路由：`/purchase/orders`
  - [ ] 对齐前端请求路径，避免弹窗初始化阶段稳定 404。

- [ ] 278. 修复离线草稿 store 的快照稳定性
  - [ ] `getPurchaseLogisticsOfflineDraftsSnapshot()` 不能每次返回新的数组实例。
  - [ ] 确保 `useSyncExternalStore` 的 `getSnapshot` 在未变化时返回稳定引用。
  - [ ] 消除 `The result of getSnapshot should be cached` 与 `Maximum update depth exceeded`。

- [ ] 279. 明确本轮验证口径
  - [ ] `/purchase/logistics` 页面可正常打开。
  - [ ] 页面不再触发 `useSyncExternalStore` 无限循环。
  - [ ] 采购单下拉不再请求错误路径导致 404。
  - [ ] 不影响现有采购订单列表/物流提交流程。

- [ ] 280. 将最小修复方案写入实施文档
  - [ ] 在 `implementation_plan.md` 中明确拟改文件、根因与验证方式。
  - [ ] 待确认后再进入代码修复与验证。

## P0 MaterialService.getMaterialOptions 响应契约冲突修复（2026-04-07，待确认）

- [ ] 272. 冻结本轮修复范围，只处理材料选项接口的前端响应契约冲突
  - [ ] 仅聚焦 `src/features/material-archive/services/material-service.ts` 及必要验证。
  - [ ] 不修改后端 `materials` handler。
  - [ ] 不扩散成全局 `apiFetch` 解包机制重构。

- [ ] 273. 修复 `getMaterialOptions()` 与全局解包语义冲突
  - [ ] 对齐 `apiFetch` 当前会将 `{ data: [] }` 自动解包为数组的事实。
  - [ ] 移除该函数中对“必须是对象响应”的错误假设。
  - [ ] 保持返回值仍为 `Material[]`，不改页面调用方式。

- [ ] 274. 明确本轮验证口径
  - [ ] 材料组装页 `MaterialAssemblyManager.loadData` 不再因 `[INVALID_RESPONSE]` 失败。
  - [ ] `getMaterialOptions()` 返回的材料数组仍可用于下拉筛选与映射。
  - [ ] 不引入对 `getMaterialsWithVersion()` 等其他依赖对象包装的回归影响。

- [ ] 275. 将最小修复方案写入实施文档
  - [ ] 在 `implementation_plan.md` 中明确根因、拟改文件与验证方式。
  - [ ] 待确认后再进入代码修复与验证。
