
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

- [x] 322. 冻结本轮范围，只分析前端 MRP 大运算后移后端方案（2026-04-07，已完成）
  - [x] 聚焦 `src/features/trading/hooks/use-requirements.ts` 与 `src/features/mrp/services/mrp-engine.ts`。
  - [x] 本轮先输出迁移方案与边界，不直接修改前后端业务代码。
  - [x] 不将本轮扩散为 trading / warehouse / engineering 全域重构。

- [x] 323. 固化当前前端大运算现状
  - [x] 当前 `useRequirements()` 会并行拉取销售订单、BOM、物料、产品、包装规则、库存 6 份数据。
  - [x] 当前 `MrpEngine.runCalculation()` 在浏览器内完成订单过滤、BOM 爆炸、物料汇总、库存对冲、缺口计算、包装换算与排序统计。
  - [x] 当前 `calculate()` 仍以内存态重算为核心，仅附带模拟延迟，不依赖后端权威计算结果。

- [x] 324. 固化当前架构问题
  - [x] 前端承担了领域级 MRP 运算，而不是只负责展示与交互。
  - [x] 计算所需主数据分散在多个接口，前端需要拼装后再本地重算，放大网络体积与一致性风险。
  - [x] 当前结果不可审计、不可复算、不可作为后端统一口径的正式真相来源。
  - [x] 数据量增大后，浏览器侧计算与多次重算会持续侵占首屏与交互性能。

- [x] 325. 明确后移目标
  - [x] 前端只提交筛选条件、刷新意图与展示参数，不再承担正式 MRP 计算。
  - [x] 后端统一完成 BOM 爆炸、库存对冲、包装换算、统计汇总，并返回权威结果。
  - [x] 结果应可复算、可审计，并与后端主数据读口径保持一致。

- [x] 326. 明确最小实施边界
  - [x] 第一阶段优先后移 `trading/requirements` 当前 MRP 需求分析链路。
  - [x] 前端页面交互、表格展示、筛选体验尽量保持不变。
  - [x] 本轮不顺带重做销售订单、库存、BOM 的其他页面。
  - [x] 本轮不把所有“可能的大计算”一起打包改造，只先收口已确认的 `MRP` 引擎。

- [x] 327. 明确验证口径
  - [x] 页面展示结果改为以后端返回为准。
  - [x] 相同输入下，前后结果口径一致，不再依赖浏览器本地数据拼装差异。
  - [x] 页面刷新、切页、多人访问时，MRP 结果具备稳定可复现性。
  - [x] 前端移除大运算后，不再在浏览器中保留完整 MRP 引擎主链。

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

## P0 生产部署脚本二阶段优化：默认只重建 app，watchdog 按需重建（2026-04-07，待确认）

- [ ] 267. 冻结本轮优化范围，只处理生产部署脚本的构建粒度优化
  - [ ] 默认路径聚焦 `app` 服务重建，避免每次部署都重编译 `watchdog`。
  - [ ] 不回退本轮已完成的“默认重建后端”安全目标。
  - [ ] 不扩散到 CI/CD、镜像仓库治理或业务代码变更。

- [ ] 268. 调整默认部署路径为“重建 app + 保持其他依赖服务按现状运行”
  - [ ] 默认部署脚本优先重建 `app`。
  - [ ] `watchdog` 改为显式参数或专门路径触发重建。
  - [ ] 保留必要的全量重建入口，避免特殊场景下无法刷新辅助服务。

- [ ] 269. 细化部署参数策略，保证“下次可以直接用”
  - [ ] 默认无参执行应走最常用、最安全、耗时更可控的路径。
  - [ ] 显式提供全量重建路径。
  - [ ] 显式提供快路径或 watchdog 重建路径（仅在确有需要时使用）。

- [ ] 270. 明确脚本优化后的验证要求
  - [ ] 默认部署日志应清楚表明当前仅重建 `app`。
  - [ ] 默认部署完成后，`app` 创建时间应更新，而 `watchdog` 不必每次变化。
  - [ ] 默认路径仍需确保新增后端路由与接口变更可随部署生效。

- [ ] 271. 将二阶段部署优化方案写入实施文档
  - [ ] 在 `implementation_plan.md` 中明确拟改脚本、参数矩阵与验证方式。
  - [ ] 待确认后再进入脚本修改与验证。

## P0 生产部署脚本默认重建后端固化修复（2026-04-07，待确认）

- [ ] 263. 冻结本轮修复范围，只处理生产部署脚本中的后端重建策略
  - [ ] 只聚焦 `server/deploy-prod.sh`，必要时最小联动根目录 `deploy.sh`。
  - [ ] 不扩散到业务代码、权限体系、WebSocket 或登录逻辑重构。

- [ ] 264. 将“默认 fast path”改为“默认重建后端”
  - [ ] 调整脚本默认行为：生产部署默认执行后端镜像重建。
  - [ ] 如仍需快路径，改为显式参数触发，而不是默认行为。
  - [ ] 避免前端已更新、后端仍沿用旧镜像导致 API 路由缺失。

- [ ] 265. 明确脚本修复后的验证要求
  - [ ] 部署日志中应能明确看到 build 已启用。
  - [ ] `server-app-*` 容器创建时间应更新，而不是继续停留在历史时间。
  - [ ] 新增后端路由不应再因为旧后端镜像而表现为 404。

- [ ] 266. 将脚本固化修复方案写入实施文档
  - [ ] 在 `implementation_plan.md` 中明确拟改脚本、参数策略与验证方式。
  - [ ] 待确认后再进入脚本修改与生产验证。

## P0 已治理真相边界链路的最小后端回归测试补强（2026-04-07，待确认）

- [ ] 254. 冻结本轮测试补强范围，只覆盖已完成治理的三条链
  - [ ] 仅覆盖 `sales-order`、`shipment`、`purchase-order`。
  - [ ] 不扩散成全仓库测试重构，不顺带补 unrelated handler/service 测试。

- [ ] 255. 为 `sales-order` 补最小后端回归测试
  - [ ] 覆盖 sales order authoritative flow 中主状态重算规则，至少包含：
    - [ ] `Pending + all claimed -> InProgress`
    - [ ] delivery 后 `InProgress / Done`
    - [ ] `Canceled` 保持稳定
  - [ ] 覆盖删除/取消语义的最小后端行为，防止前端状态机后迁后再次反弹。

- [ ] 256. 为 `shipment` 补最小后端回归测试
  - [ ] 覆盖 `CommitShipment(...)` 的正式提交流程。
  - [ ] 覆盖库存不足 / 非 DRAFT 状态等关键拒绝路径。
  - [ ] 覆盖 commit 后对库存与 sales order 交付联动的关键断言。

- [ ] 257. 为 `purchase-order` 补最小后端回归测试
  - [ ] 覆盖 purchase-order authoritative flow 的核心状态规则。
  - [ ] 覆盖 workflow 批准后 `Draft -> Sent`。
  - [ ] 覆盖 receipt 后 `Awaiting / Received`，确保前端状态扩散删除后仍由后端承接。

- [ ] 258. 将测试补强方案、拟改测试文件与验证口径写入实施文档
  - [ ] 在 `implementation_plan.md` 中明确最小测试文件清单、验证命令与风险。
  - [ ] 待确认后再进入测试代码实施。

## P0 `purchase-service.ts` 前端状态扩散清理专项（2026-04-07，待确认）

- [ ] 250. 冻结本轮真相边界治理范围，先只打 `src/features/trading/services/purchase-service.ts`
  - [ ] 明确本轮不扩散到全部 purchase 页面、hooks、receipt 全链或 warehouse 域。
  - [ ] 明确当前问题不是完整前端状态机，而是前端残留了主表状态向明细状态的补丁式扩散。

- [ ] 251. 盘清必须清理的前端状态扩散逻辑
  - [ ] 排查 `savePurchaseOrder(...)` 中 `Canceled / Received -> lines.status` 的前端扩散逻辑。
  - [ ] 判断该逻辑是否与后端 `purchase_order_flow` / `purchase_receipt` authoritative flow 重复定义。

- [ ] 252. 明确 purchase-order 链的 authoritative path
  - [ ] 前端仅提交采购单数据与用户意图，不再本地派生明细正式状态。
  - [ ] 后端工作流审批负责 `Draft -> Sent`。
  - [ ] 后端收货确认与状态重算负责 `Awaiting / Received` 等正式状态流转。

- [ ] 253. 将专项方案、风险与验证口径写入实施文档
  - [ ] 在 `implementation_plan.md` 中明确前后职责分界、拟改文件与验证方式。
  - [ ] 待确认后再进入代码实施。

## P0 `warehouse / shipment` 真相边界后迁专项（2026-04-07，待确认）

- [ ] 246. 冻结本轮真相边界治理范围，先只打 shipment 链
  - [ ] 明确本轮不扩散到全部 warehouse 模块、stocktake 或 purchase-order。
  - [ ] 明确当前最高风险问题是前端在 `use-shipment.ts` 中承担了库存裁决与状态推进。

- [ ] 247. 盘清 shipment 链必须后迁的前端越界逻辑
  - [ ] 排查 `submitShipment(...)` 中 `quantity > categoryStock` 的提交阻断逻辑，确认其应降级为提示而非最终裁决。
  - [ ] 排查 `commitDraft(...)` 中前端直接提交 `status: DRAFT -> COMMITTED` 的状态推进逻辑。
  - [ ] 排查 `removeRecord(...)` 中前端对 draft / committed 记录语义分流是否越界。

- [ ] 248. 明确 shipment 链的 authoritative path
  - [ ] 前端仅提交出库意图与必要字段，不再本地决定最终 commit 条件。
  - [ ] 后端 `CommitShipment(...)` 成为正式提交入口，负责库存校验、扣减、联动与失败原因返回。
  - [ ] 前端保留预警提示与交互确认，但不保留最终业务裁决。

- [ ] 249. 将专项方案、风险与验证口径写入实施文档
  - [ ] 在 `implementation_plan.md` 中明确前后职责边界、拟改文件与验证方式。
  - [ ] 待确认后再进入代码实施。

## P0 `trading-service.ts` 前端状态机后迁专项（2026-04-07，待确认）

- [ ] 242. 冻结本轮真相边界治理范围，先只打 `src/features/trading/services/trading-service.ts`
  - [ ] 明确本轮不扩散到全部 trading 页面、hooks、后端全域重构。
  - [ ] 明确当前最高风险问题是前端 service 已承担主表/明细状态推进与删除/取消语义分流。

- [ ] 243. 盘清必须后迁的前端状态机逻辑
  - [ ] 排查 `saveSalesOrder(...)` 中主表状态向明细状态扩散的前端逻辑。
  - [ ] 排查 `deleteSalesOrder(...)` 中“删除 vs 取消”语义分流的前端逻辑。
  - [ ] 排查 `claimOrderLine(...)` 中 claim 后主状态推进的前端逻辑。
  - [ ] 排查 `updateOrderDelivery(...)` 中 deliveredQty -> 行状态 -> 主表状态推进的前端逻辑。

- [ ] 244. 明确后迁后的 authoritative path
  - [ ] 前端仅提交意图、正式 delta 或 command 参数，不再本地推导最终业务状态。
  - [ ] 后端统一负责销售订单主表/明细状态推进与取消/删除裁决。
  - [ ] 前端保留提示、展示和局部输入辅助，不保留最终业务裁决。

- [ ] 245. 将专项方案、风险与验证口径写入实施文档
  - [ ] 在 `implementation_plan.md` 中明确前后职责分界、拟改文件与验证方式。
  - [ ] 待确认后再进入代码实施。

## P0 三类共享根因的可复用约束沉淀（2026-04-07，待确认）

- [ ] 238. 沉淀统一默认值 builder 约束，禁止 schema 演进后继续由页面/样例/normalize 裸写核心字段
  - [ ] 明确默认值 builder 的职责边界：负责新建态初始对象、样例草稿、必要的正式默认字段（如 `version` / `createdAt`）。
  - [ ] 明确哪些模块优先接入统一 builder：先从 `engineering` 这轮已暴露问题的 `Product` / `ProductTemplate` / `ChangeOrder` / `Routing` 开始。
  - [ ] 明确页面初始化对象、`INITIAL_*` 常量、局部 `normalizeXxx(...)` 后续优先复用 builder，不再各自手写核心字段。

- [ ] 239. 沉淀统一表单子组件 contract 模式，禁止子组件直接窄化整份 `UseFormReturn`
  - [ ] 明确字段级 contract 为默认方案：子组件优先接 `value` / `onChange` 或最小字段集合，而不是整份 `form`。
  - [ ] 明确只有真正的通用字段容器组件，才允许依赖整份 `form`，且需与父层共享同一正式泛型边界。
  - [ ] 明确 `react-hook-form + zodResolver` 的统一收口方向，避免继续出现父层完整模型、子层局部模型互不兼容。

- [ ] 240. 沉淀统一第三方 adapter 模式，禁止业务组件散写 vendor options
  - [ ] 明确第三方 adapter 的职责边界：对外暴露项目内稳定配置面，对内对齐 vendor 正式类型。
  - [ ] 明确优先接入对象：先从本轮已暴露的条码/二维码渲染链开始。
  - [ ] 明确后续业务组件优先依赖 adapter/helper，不再直接持有 vendor 原始 options。

- [ ] 241. 将三类约束的拟落地目录、风险与不做事项写入实施文档
  - [ ] 在 `implementation_plan.md` 中明确约束落地点、实施批次与回归验证方式。
  - [ ] 待确认后再进入代码实施，不直接扩散修改全仓库。

## P0 本轮 `pnpm build` 多点报错的共享根因分析（2026-04-07，待确认）

- [ ] 233. 先收口“为什么会一批量暴露”，禁止继续把 build 报错当作孤立点逐条打补丁
  - [ ] 确认当前错误不是同一时刻新增的一组偶发 typo，而是 `tsc -b` 口径下把多轮迭代累积欠账集中揭开。
  - [ ] 区分“历史欠账被统一验证放大显形”与“共享架构边界缺口导致持续外溢”两种因素。

- [ ] 234. 归类 schema 演进后的消费层断链根因
  - [ ] 确认 `engineering/data/schema.ts` 已将多个实体的 `version` 正式化，但默认值工厂、样例常量、页面初始化对象没有统一单一事实来源。
  - [ ] 确认 `version` 缺失、`_v` 残留、`never` 推断等现象属于同一类“schema 演进 -> 消费层失联”的表层症状。

- [ ] 235. 归类 `react-hook-form + zodResolver + 子组件 form props` 的共享根因
  - [ ] 确认父层完整 `form` 与子组件窄化 `UseFormReturn<X>` 之间缺少统一泛型策略。
  - [ ] 确认 `mold-loan`、`product-action-dialog`、`use-product-form` 这类问题本质都是表单 contract 未统一，而不是单个字段错误。

- [ ] 236. 归类第三方库类型边界未封装根因
  - [ ] 确认 `dm-preview.tsx` 暴露的是 vendor options 经验写法与正式类型定义不一致问题。
  - [ ] 确认这类问题需要本地 adapter / wrapper 收口，而不是继续在业务组件里散写第三方字段。

- [ ] 237. 将根因/症状/不做事项写入实施文档
  - [ ] 在 `implementation_plan.md` 中明确主根因、表层症状与后续修复顺序。
  - [ ] 待确认后按“根因分批修复”推进，而不是逐条消红。

## P0 `engineering` 域 `version/_v` 契约漂移修复（2026-04-07，待确认）

- [ ] 229. 冻结本轮新增根因范围，禁止将 `mold-loan` 已完成问题与 `engineering` 新问题混为一谈
  - [ ] 确认 `pnpm build` 已不再停在 `mold-loan-action-dialog.tsx`。
  - [ ] 确认当前新阻塞点位于 `src/features/engineering` 域。
  - [ ] 确认新报错本质是 `version` 正式字段必填后，初始化对象/样例数据/旧 `_v` 使用仍未同步收口。

- [ ] 230. 盘清 `engineering` 域缺失 `version` 的对象初始化与样例数据
  - [ ] 排查 `product-routing-view.tsx` 中 `ProductProcessRouting` 初始状态对象缺失 `version` 的根因。
  - [ ] 排查 `template-mgmt.tsx` 中 `INITIAL_TEMPLATES` 映射结果缺失 `version` 的根因。
  - [ ] 确认是否还有同类“schema 已要求 `version`，页面/常量仍未补齐”的断点。

- [ ] 231. 清退 `engineering` 域残留 `_v` 旧字段
  - [ ] 排查 `change-orders.tsx` 中默认对象与编辑对象仍使用 `_v` 的位置。
  - [ ] 将相关逻辑正式切回 `version`，禁止再保留 `_v` 兼容壳。

- [ ] 232. 执行 build 级验证与记录
  - [ ] 重新执行 `pnpm build`，确认 `engineering` 域 version 契约漂移被切断。
  - [ ] 更新 `walkthrough.md`，记录本轮从 `mold-loan` 转移到 `engineering` 的新根因链与修复结果。

## P0 `build` 模式下 `mold-loan-action-dialog` 表单泛型与 i18n key 修复（2026-04-07，待确认）

- [ ] 225. 冻结本轮新增根因范围，禁止再以根目录 `tsc --noEmit` 误判为已通过
  - [ ] 确认当前仓库 `build` 实际执行的是 `tsc -b`，并非与根目录 `pnpm exec tsc --noEmit` 等价。
  - [ ] 确认 `mold-loan-action-dialog.tsx` 在 `tsc -b` 下仍暴露 `react-hook-form + zodResolver` 泛型边界问题。
  - [ ] 确认 `common.actions.create` 不在当前正式翻译 key 联合中，属于真实 i18n 契约漂移。

- [ ] 226. 收口 `MoldLoanActionDialog` 的表单泛型边界到 build 真实检查口径
  - [ ] 对齐 `useForm`、`zodResolver(moldLoanSchema)`、`FormField`、`handleSubmit` 的泛型边界，避免仅在 `tsc -b` 下爆出 `control` / `SubmitHandler` 类型错误。
  - [ ] 不通过 `as any` 或宽泛断言掩盖 resolver / field values 不一致问题。
  - [ ] 保持借出 / 借入表单行为与当前业务语义不变。

- [ ] 227. 收口 `mold-loan-action-dialog.tsx` 的翻译 key 到正式 key
  - [ ] 将 `common.actions.create` 替换为当前正式存在的 key。
  - [ ] 不额外扩散成全局 i18n 重构。

- [ ] 228. 执行 build 级验证与总结
  - [ ] 执行 `pnpm build` 作为本轮最终验证标准。
  - [ ] 更新 `walkthrough.md`，记录为何根目录 `tsc --noEmit` 不能替代 `tsc -b` / `pnpm build`。

## P0 `mold-loan` 页面层契约漂移修复（2026-04-07，待确认）

- [ ] 221. 冻结 `mold-loan` 本轮根因范围，禁止回退为旧页面草稿驱动接口
  - [ ] 确认 `useMoldLoanMgmt` 已从“`newLoan / resetDraft` 草稿驱动”收口为“`isOpen / currentRow / handleDialogSubmit` 驱动”。
  - [ ] 确认 `MoldLoanActionDialog` 已从“外部传 `mode / newLoan / onLoanChange`”收口为“`initialMode / currentRow / onSubmit`”正式 props。
  - [ ] 确认 `mold-loan-mgmt.tsx` 当前仍停留在旧消费方式，因此触发整组 TS2339 / TS2322 报错。

- [ ] 222. 按新版 `useMoldLoanMgmt` 正式返回契约改造页面层
  - [ ] 将 `mold-loan-mgmt.tsx` 从旧 `isDialogOpen / resetDraft / newLoan / setNewLoan / handleCreateRecord` 消费方式切到新版返回值。
  - [ ] 以 `isOpen / setIsOpen / handleAddClick / currentRow / handleDialogSubmit` 为页面层单一事实来源。
  - [ ] 保持借出 / 借入切换、列表展示、归还动作语义不变。

- [ ] 223. 按新版 `MoldLoanActionDialog` 正式 props 收口页面接线
  - [ ] 页面层不再传 `mode / onModeChange / newLoan / onLoanChange`。
  - [ ] 改为按正式 props 传递 `isOpen / onOpenChange / initialMode / currentRow / molds / partners / onSubmit`。
  - [ ] 禁止为了兼容旧页面而把旧 props 补回 dialog 组件。

- [ ] 224. 验证与总结
  - [ ] 执行 `pnpm exec tsc --noEmit`，必要时补目标文件 eslint。
  - [ ] 更新 `walkthrough.md`，记录本轮如何从“旧页面消费未同步”收口回新版正式契约。

## P0 ExcelJS 类型边界与销售订单状态映射收口（2026-04-07，待确认）

- [ ] 217. 冻结本轮新增根因范围，禁止继续按“ESLint 收尾”误判执行
  - [ ] 确认 `excel-service.ts` 当前已从 `any` 问题升级为 ExcelJS 真实类型边界对齐问题。
  - [ ] 确认 `sales-order-list-fixed.tsx` 当前已从 `any` 问题升级为销售订单状态值到 i18n key 的正式映射收口问题。
  - [ ] 本轮不再把这两项当作单纯风格清理处理。

- [ ] 218. 对齐 `excel-service.ts` 的 ExcelJS 类型边界
  - [ ] 基于 ExcelJS 实际 `Workbook` / `Worksheet` / `Row` / `CellValue` 能力建立兼容的最小类型方案。
  - [ ] 允许覆盖 `Date`、公式结果等真实值形态，避免过窄本地类型再次与库类型冲突。
  - [ ] 保持已完成的 `Material.version` 契约收口不回退。

- [ ] 219. 收口销售订单状态值到 i18n key 的正式映射
  - [ ] 盘清 `SalesOrder` 状态枚举的真实取值与 locales 中的正式 key 差异。
  - [ ] 建立明确映射函数，避免继续使用宽泛断言或隐式字符串拼接。
  - [ ] 保持销售订单列表现有业务行为不变，只修复类型与映射边界。

- [ ] 220. 验证与总结
  - [ ] 执行目标文件 eslint 与 `pnpm exec tsc --noEmit`。
  - [ ] 更新 `walkthrough.md`，记录本轮从“ESLint 清理”升级为“类型边界 / 映射边界收口”的原因与结果。

## P0 目标文件 ESLint 债务清理（2026-04-07，待确认）

- [ ] 212. 冻结本轮 ESLint 清理范围，禁止借机扩散成全项目风格整改
  - [ ] 仅处理本轮已验证目标文件中的 ESLint 债务：`excel-service.ts`、`sales-order-list-fixed.tsx`、`partner-mgmt.tsx`。
  - [ ] 以 `pnpm exec eslint <目标文件>` 当前输出为范围基线，不扩散到全项目既有 warning。
  - [ ] 明确本轮目标是消除目标文件中的 `no-explicit-any` 与局部 hook / class warning，不重做业务结构。

- [ ] 213. 清理 `material-archive` 目标文件 ESLint 债务
  - [ ] 为 `excel-service.ts` 中 Excel worksheet / row / cell 辅助对象建立最小必要类型，清退 `any`。
  - [ ] 保持已完成的 `version` 契约收口不回退，不为了消 lint 再引入弱类型兜底。

- [ ] 214. 清理 `trading` 目标文件 ESLint 债务
  - [ ] 为 `sales-order-list-fixed.tsx` 中剩余 `any` 提供正式类型。
  - [ ] 收敛 `orders` 的 `useMemo` 依赖 warning。
  - [ ] 处理该文件内本轮范围中的 class 简写 warning。

- [ ] 215. 清理 `equipment-tooling` 目标文件 ESLint 债务
  - [ ] 为 `partner-mgmt.tsx` 中剩余错误处理 `any` 提供正式类型。
  - [ ] 保持本轮只处理孤立遗留，不扩展成 equipment-tooling 组件重构。

- [ ] 216. 验证与总结
  - [ ] 执行目标文件 eslint 与 `pnpm exec tsc --noEmit`。
  - [ ] 更新 `walkthrough.md`，记录本轮 ESLint 债务是如何在不扩散范围的前提下完成清理。

## P0 TypeScript 契约漂移根因修复（2026-04-07，待确认）

- [ ] 208. 冻结本轮 TS 报错的真正根因，禁止逐行消红式补丁
  - [ ] 确认 `material-archive` 的正式实体版本字段已收口到 `version`，而 `excel-service.ts` 仍停留在旧 `_v` 契约。
  - [ ] 确认 `trading` 的 `PurchaseOrderActionDialog` / `SalesOrderActionDialog` 已内聚保存逻辑，不再暴露 `onSave` props，而列表页仍按旧接口调用。
  - [ ] 确认 `partner-mgmt.tsx` 的 unused import 仅是局部遗留，不是本轮系统性根因。

- [ ] 209. 统一 `Material` 前端版本字段契约到单一事实来源
  - [ ] 将 `excel-service.ts` 的导出、导入、Excel 复合主键解析统一从 `_v` 收口到 `version`。
  - [ ] 复核 `material-service.ts`、`use-material-mgmt-data.ts`、Excel 导入导出链，确保不再混用 `_v` / `version`。
  - [ ] 禁止继续在 `Material` 领域引入第二套版本字段命名兼容层。

- [ ] 210. 清退 `trading` 动作弹窗的旧 `onSave` 调用契约
  - [ ] 以 `PurchaseOrderActionDialog` / `SalesOrderActionDialog` 当前正式 props 为准，移除列表页对旧 `onSave` 的传参。
  - [ ] 复核相关列表/弹窗边界，确保保存与 patch 责任只保留在弹窗内部 mutation 主链。
  - [ ] 消除因旧 `onSave` 失效引出的 `implicit any` 等连锁症状。

- [ ] 211. 收尾清理与验证
  - [ ] 清理 `partner-mgmt.tsx` 等本轮顺带暴露的未使用 import 遗留。
  - [ ] 至少执行 `pnpm exec tsc --noEmit`，必要时补目标文件 lint / 组件回归验证。
  - [ ] 更新 `walkthrough.md`，记录本轮不是逐点消红，而是如何从契约定义层完成根因收口。

## P0 `warehouse` 下一批 DTO 补齐（2026-04-07，待确认）

- [ ] 204. 冻结 `warehouse` 域下一批 DTO 缺口，禁止前端 PATCH 已落地而后端仍停留在 POST-only
  - [ ] 确认 `inventory`：前端已存在 `patchInventory(...)`，后端当前无正式 `PATCH /inventory/:id`。
  - [ ] 确认 `shipment`：前端已存在 `patchShipment(...)`，后端当前无正式 `PATCH /inventory/shipment/:id`。
  - [ ] 确认 `inbound` / `transfer` / `adjustment` 当前并非 SDRTS PATCH 主链，本轮不扩散改造。

- [ ] 205. 优先补 `inventory` 正式 PATCH contract
  - [ ] 为库存记录建立显式 `PatchInventoryHandlerRequest` / `PatchInventoryRequest` 边界。
  - [ ] 注册 `PATCH /inventory/:id`，对齐前端现有 `patchInventory(...)`。
  - [ ] 保持库存记录现有查询、对账、同步主链不变，不另起第二套库存保存实现。

- [ ] 206. 补 `shipment` 正式 PATCH contract
  - [ ] 为出库记录建立显式 `PatchShipmentHandlerRequest` / `PatchShipmentRequest` 边界。
  - [ ] 注册 `PATCH /inventory/shipment/:id`，对齐前端现有 `patchShipment(...)`。
  - [ ] 保持 `commit` / `void` 等审批与库存影响链不变，不把 PATCH 与 commit/void 语义混在一起。

- [ ] 207. 验证与总结
  - [ ] 至少执行 `warehouse` 目标 handler / routes / services 测试与 `pnpm exec tsc --noEmit`。
  - [ ] 更新 `walkthrough.md`，记录本轮 `warehouse` 是如何从 inventory / shipment patch 断链中收口 DTO 边界的。

## P0 `trading` 下一批 DTO 补齐（2026-04-07，待确认）

- [ ] 199. 冻结 `trading` 域下一批 DTO 缺口，禁止再让前后端 PATCH 各说各话
  - [ ] 确认 `supplier`：前端已有 `patchSupplier(...)`，后端当前无正式 `PATCH /suppliers/:id`，且 `SaveSupplierHandler` 仍直接绑定 `models.Supplier`。
  - [ ] 确认 `purchase-order`：前端已有 `patchPurchaseOrder(...)`，后端当前无正式 `PATCH /purchase/orders/:id`，且仅存在 `SavePurchaseOrderRequest`，缺少正式 `PatchPurchaseOrderRequest`。
  - [ ] 确认 `sales-order`：后端已有 `PatchSalesOrderRequest` / mapper 基础，但当前 route / handler 仍未正式承接前端 `patchSalesOrder(...)`。

- [ ] 200. 优先补 `supplier` 正式 PATCH contract
  - [ ] 新增 `SaveSupplierRequest` / `PatchSupplierHandlerRequest` / `PatchSupplierRequest`，不再让 handler 直接绑定 `models.Supplier`。
  - [ ] 注册 `PATCH /suppliers/:id`，对齐前端现有 `patchSupplier(...)`。
  - [ ] 将供应商更新从“POST save 混合更新”收口为正式 POST / PATCH 分离边界。

- [ ] 201. 补 `purchase-order` 正式 PATCH contract
  - [ ] 在现有 `SavePurchaseOrderRequest` 基础上补正式 `PatchPurchaseOrderRequest` 与 mapper。
  - [ ] 注册 `PATCH /purchase/orders/:id`，对齐前端现有 `patchPurchaseOrder(...)`。
  - [ ] 保持现有采购单保存、工作流创建、收货确认主链不变，不另起第二套持久化逻辑。

- [ ] 202. 复核 `sales-order` 是否只需补路由接入，不重复大改已存在 DTO
  - [ ] 若 `PatchSalesOrderRequest` 与 mapper 已能承接正式 patch 语义，则只补 route / handler 接入。
  - [ ] 若仍存在 save/patch 语义混用，再最小范围补 handler/service 边界，不重复重写已存在 mapper。

- [ ] 203. 验证与总结
  - [ ] 至少执行 `trading` 目标 handler / service / routes 测试与 `pnpm exec tsc --noEmit`。
  - [ ] 更新 `walkthrough.md`，记录本轮 `trading` 是如何从 supplier / purchase-order / sales-order patch 断链中收口 DTO 边界的。

## P0 `use-users-action-dialog-sync` 测试工厂重建（2026-04-07，待确认）

- [ ] 195. 复核 `use-users-action-dialog-sync.test.ts` 的类型断裂根因，禁止逐处补 `version`
  - [ ] 确认 `EmployeeOption.raw` 当前要求正式 `Employee` 类型，而测试仍在手写缺少 `version` 的原始字面量。
  - [ ] 确认 `dynamicRoles` 当前要求正式 `Role[]`，测试中的角色字面量同样缺少 `version`。
  - [ ] 复核现有测试基础设施，确认项目并非完全没有工厂，而是**缺少 `Employee` 测试工厂**，且本文件应优先复用已有 `createTestRole`。

- [ ] 196. 重建正式测试数据构造边界，而不是继续手工拼对象
  - [ ] 在 `src/features/org-personnel` 下新增共享 `Employee` 测试工厂，统一补齐 `version`、`status`、`staffId`、`deptId/lineId/processId` 等正式字段默认值。
  - [ ] 保持 `Role` 测试数据复用 `src/features/system-mgmt/test-factories.ts` 中现有 `createTestRole`，不重复发明第二套 Role mock 工厂。
  - [ ] 如需统一风格，可为本轮测试补一个轻量 `createEmployeeOption` 帮助函数，但不新增与正式 schema 脱节的“临时 mock 类型”。

- [ ] 197. 改造 `use-users-action-dialog-sync.test.ts` 以消费共享工厂
  - [ ] 移除该测试文件中的 `employees[].raw` / `dynamicRoles[]` 原始字面量构造。
  - [ ] 改为通过 `Employee` 工厂构造 `raw`，通过 `createTestRole` 构造动态角色。
  - [ ] 保持测试语义不变，只修复测试数据构造边界，不改 hook 业务逻辑。

- [ ] 198. 验证并补总结
  - [ ] 至少执行目标测试文件与 `pnpm exec tsc --noEmit`，确认 29 个类型错误闭合。
  - [ ] 更新 `walkthrough.md`，记录本轮不是补 `version`，而是收口测试工厂边界。

## P0 DTO 边界补齐专项（2026-04-07，已确认）

- [ ] 190. 盘点并冻结当前必须补 DTO 的模块范围，避免继续按症状逐字段追补
  - [ ] 将 `equipment-tooling` 域列为第一优先级：`molds`、`furnaces`、`partners`、`drawings`。
  - [ ] 将 `production line topology` 列为同批收口对象：在已有 PATCH contract 基础上继续从 `map[string]json.RawMessage` 收口到显式 DTO。
  - [ ] 将 `warehouse`（`inventory` / `shipment`）、`trading`（`supplier` / `purchase-order`）、`org-personnel`（`employee` / `org`）列为下一批 DTO 收口对象。

- [ ] 191. 为第一批模块建立统一 DTO 分层，不再让 handler 直接承担字段解释器职责
  - [ ] 每个模块至少补 `SaveXxxRequest`、`PatchXxxHandlerRequest`、`PatchXxxServiceRequest` 三层显式 DTO。
  - [ ] PATCH DTO 统一承接 `op`、`delta`、`metadata.id`、`metadata.version`，如有安全校验字段则显式承接（如 `authCode`）。
  - [ ] 对存在历史/审计记录的模块（如图纸、模具流转）同步明确事件 DTO / 审计 DTO，避免前端任意附带字段穿透入库。

- [ ] 192. 统一 SDRTS Delta 解析边界，避免再出现“后端把 DeltaItem 当裸值”的断链
  - [ ] 抽出通用 `DeltaItem { o, n }` 解析模型与帮助函数，不在每个模块重复手写不一致的 `json.RawMessage` 解包逻辑。
  - [ ] 明确区分“允许的 patch 字段”“服务层解释后的目标 DTO”“最终持久化模型”，避免 handler 直接面向数据库更新 map。
  - [ ] 为嵌套结构（如产线 `segments/processes`、库存明细、订单行）建立可测试的 delta 应用规则，而不是隐式依赖前端对象形状。

- [ ] 193. 第一批优先模块按风险顺序执行并验证
  - [ ] 第一组：`equipment-tooling/molds`、`equipment-tooling/furnaces`、`equipment-tooling/partners`、`equipment-tooling/drawings`。
  - [ ] 第二组：`production line topology` 二次收口，去除当前裸 `map[string]json.RawMessage` 依赖。
  - [ ] 第三组：`warehouse/inventory`、`warehouse/shipment`、`trading/supplier`、`trading/purchase-order`。

- [ ] 194. 保持边界与验证标准一致
  - [ ] 不再新增“前端 schema 加字段，后端再补 switch-case”的工作方式。
  - [ ] 不在 handler 内长期保留 `decodeJSONBodyMap + buildXxxUpdates(map[string]json.RawMessage)` 作为主实现路径，仅允许作为迁移期过渡。
  - [ ] 每补一个模块，至少补 request binding、service 层 delta 应用、版本冲突/权限校验三类验证。


## P1 第三批接口语义升级（2026-04-06，已确认）

- [ ] 7. 拆分 `PATCH /users/:id` 与 `PUT /users/:id` 语义
  - [ ] 新增真正的 `ReplaceUserHandler`，让 `PUT /users/:id` 承接完整资源替换语义。
  - [ ] 保持 `PatchUserHandler` 仅处理按字段存在性更新。
  - [ ] 明确 replace 场景下的必填字段、可清空字段与禁止覆盖字段边界。

- [ ] 8. 为身份快照增加准确别名入口
  - [ ] 新增 `GET /auth/snapshot` 作为规范入口。
  - [ ] 暂时保留 `GET /profile` 作为兼容入口，避免一次性打断现有调用链。
  - [ ] 逐步将前端内部主调用迁移到 `/auth/snapshot`。

- [ ] 9. 统一 `fetchUsers` 长期返回契约
  - [ ] 将主查询接口收敛为分页结构：`items / total / page / pageSize`。
  - [ ] 为审批人选择、下拉选项等轻量场景拆出独立用户选项接口，避免继续复用主查询接口赌数组返回。
  - [ ] 清理当前“数组 / 分页结构”混用点，消除调用方理解不一致。

## P1 生成链耦合治理（2026-04-06，待确认）

- [ ] 27. 盘点权限生成链的源事实层 / 转换层 / 运行时消费层
  - [ ] 识别当前源事实层：`server/authz/permissions.go`、自动生成的 `authenticated-route-catalog.ts`。
  - [ ] 识别当前转换层：`permission-catalog.ts`、`route-permissions-generator.ts`、`action-permission-catalog.ts`、`default-permissions.ts`。
  - [ ] 识别当前运行时消费层：`route-access.ts`、`use-roles.ts`、用户权限树构建与相关 UI 投影工具。

- [ ] 28. 标出生成链中的混合职责节点与隐式规则
  - [ ] 找出同时承担“生成 + fallback + 运行时匹配”的节点，避免继续把消费期猜测混进生成期。
  - [ ] 记录当前显式映射与高风险手工兜底：如 `ROUTE_TO_MENU_MAPPING`、页面/Tab parent 兜底、`routeBindings` 手工目录。
  - [ ] 记录当前缓存、排序、去重、路径规格化等逻辑分别属于哪一层，避免后续继续叠加第二真相。

- [ ] 29. 输出执行前规划并暂停等待确认
  - [ ] 给出后续最小执行顺序：先拆层、再收敛 fallback、最后补验证脚本/回归。
  - [ ] 明确本阶段只做规划与分层盘点，不直接大改业务代码。
  - [ ] 将结果同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

## P1 action routeBindings contract 化（2026-04-06，待确认）

- [ ] 41. 将 `action-permission-catalog.ts` 的 `routeBindings` 从字符串目录收敛为结构化 contract
  - [ ] 设计最小结构，例如 `{ method, path }`，避免继续依赖自由格式字符串。
  - [ ] 保留必要兼容层，避免一次性打断现有脚本或消费点。
  - [ ] 明确注释性附加信息是否需要独立字段承接，避免继续塞回同一字符串。

- [ ] 42. 收敛 `check-action-permission-closure.mjs` 为优先消费结构化 binding 的校验脚本
  - [ ] 先让脚本优先读取结构化 contract，再决定是否短期兼容旧字符串解析。
  - [ ] 继续校验：后端受保护路由是否存在绑定、catalog binding 是否命中真实 route。
  - [ ] 避免把脚本扩成大型静态分析器，优先保证 routeBindings 输入稳定可校验。

- [ ] 43. 执行最小验证并同步总结
  - [ ] 运行 `pnpm exec tsc --noEmit` 与 action closure 检查脚本。
  - [ ] 如脚本接入 `package.json` 或常用校验入口，再同步到文档。
  - [ ] 将结果补充到 `walkthrough.md`，并在必要时记录存量例外项。

## P1 action routeBindings 缺口补齐（2026-04-06，待确认）

- [ ] 45. 补齐 closure 脚本发现的 5 条未绑定后端受保护路由
  - [ ] 为 `action_trading_purchase_order_manage` 补 `POST /purchase/orders/:id/confirm-receipt`。
  - [ ] 为 `action_approval_config_manage` 补 `POST /workflows/definitions` 与 `POST /workflows/instances`。
  - [ ] 为 `action_approval_review` 补 `PATCH /workflows/tasks/:id/approve` 与 `PATCH /workflows/tasks/:id/reject`。

- [ ] 46. 重跑 closure 校验并确认未绑定缺口归零
  - [ ] 运行 `node scripts/check-action-permission-closure.mjs`。
  - [ ] 运行 `pnpm exec tsc --noEmit`。
  - [ ] 将结果同步到 `walkthrough.md`。

## P2 实验 / 沙箱模块长期常驻治理（2026-04-06，待确认）

- [ ] 49. 盘点实验 / 沙箱 / 临时验证模块在正式主链中的残留入口
  - [ ] 识别仍挂在正式 authenticated route 树中的实验模块，如 `experimental/*`。
  - [ ] 识别仍以正式模块名暴露但内部承接 sandbox 实现的入口，如 `system-management/logistics-api`。
  - [ ] 识别这些模块是否继续出现在生成路由目录、权限生成链、搜索入口与菜单/TAB 投影中。

- [ ] 50. 为每个目标项给出分类治理建议
  - [ ] 区分：转正保留、迁移到 labs/sandbox、从正式路由摘除但保留源码、确认无依赖后删除。
  - [ ] 明确哪些项只能摘“正式入口”，不能贸然删源码，避免影响后续排查与迁移。
  - [ ] 明确哪些项已经污染权限/搜索/生成链输入，应优先收敛。

- [ ] 51. 输出执行前规划并暂停等待确认
  - [ ] 将盘点结果与分类建议同步到 `implementation_plan.md`。
  - [ ] 明确本阶段只做规划，不直接删模块或改正式路由。
  - [ ] 完成后暂停，等待用户批准再进入执行阶段。

## P2 实验 / sandbox 源码路径语义迁移（2026-04-06，待确认）

- [ ] 58. 盘点需迁移到 `labs` / `sandbox` 语义路径的实验源码目录与 import 影响面
  - [ ] 识别 `src/features/experimental/**` 的组件、hooks、data、tabs 与 `/_authenticated/experimental/**` 的引用关系。
  - [ ] 识别 `src/features/logistics-api-sandbox/**` 的组件、services、types 与正式路由壳的引用关系。
  - [ ] 明确本轮只迁“源码目录语义”，不恢复正式入口。

- [ ] 59. 形成最小目录迁移方案
  - [ ] 为 `src/features/experimental/**` 设计更明确的目标目录，如 `src/features/labs/experimental/**`。
  - [ ] 为 `src/features/logistics-api-sandbox/**` 设计更明确的目标目录，如 `src/features/sandbox/logistics-api/**`。
  - [ ] 列出需要同步修改的 import、路由壳引用与可能受影响的生成文件。

- [ ] 60. 输出执行前规划并暂停等待确认
  - [ ] 将迁移方案、风险与验证预案同步到 `implementation_plan.md`。
  - [ ] 明确目录迁移属于结构级改动，执行前先暂停等待用户批准。
  - [ ] 批准后再进入实际 rename / import 更新 / 验证阶段。

## P2 兼容路径 / 键名升级专项（2026-04-06，待确认）

- [ ] 70. 规划 `/experimental/*` 路由别名与迁移策略
  - [ ] 明确目标命名空间与最终目标路径，避免继续沿用 `experimental` 作为正式语义。
  - [ ] 设计兼容期策略：是保留旧路由重定向，还是短期双挂载后再下线。
  - [ ] 明确权限生成链、搜索入口、导航入口应在迁移的哪一阶段切换。

- [ ] 71. 规划 `/experimental/*` API 命名升级策略
  - [ ] 盘点前端调用点与后端接口面，明确哪些接口需要别名兼容。
  - [ ] 设计兼容期：保留旧 API 别名还是由前端先切换、新旧共存一段时间。
  - [ ] 明确本轮不把“命名升级”扩成业务协议重构。

- [ ] 72. 规划 `experimental.*` i18n key 迁移策略并暂停等待确认
  - [ ] 设计新 key 命名空间，避免继续把 `experimental` 暴露为长期用户面语义。
  - [ ] 明确是否需要兼容旧 key、批量替换范围与验证方式。
  - [ ] 将专项方案、风险与验证预案同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 73. 切换为“直接清理旧 experimental 入口”专项并暂停等待确认
  - [ ] 明确本轮不再保留旧 `/experimental/*` 路由、旧 `/experimental/*` API alias 与旧 `experimental.*` 兼容消费层。
  - [ ] 盘点并清理旧入口涉及的文件：旧 authenticated experimental 路由壳、旧 route lazy 文件、旧 API 路径引用、旧 i18n key 消费点。
  - [ ] 明确需要同步删除或切换的生成产物与入口引用，避免删除后残留无效导入或 route tree 脏引用。
  - [ ] 将破坏性影响、验证步骤与回滚建议同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 74. 直接清理旧 experimental 路由入口
  - [ ] 删除 `src/routes/_authenticated/experimental/**` 下不再需要的旧路由文件。
  - [ ] 清理所有指向旧 `/experimental/*` 的前端导航与入口引用，统一改为 `/labs/experimental/*`。
  - [ ] 重新生成 route tree，确认删除旧路由后生成产物无残留引用。

- [ ] 75. 直接清理旧 experimental API 入口
  - [ ] 删除后端 `server/routes/routes.go` 中旧 `/experimental/*` 分组，仅保留 `/labs/experimental/*`。
  - [ ] 全量确认前端实验模块 API 调用均已切换到 `/labs/experimental/*`。

- [ ] 78. 实施可安全改名的 residual naming / 文案语义统一
  - [ ] 优先处理实验模块内部局部命名：组件名、函数名、hooks 命名、局部类型名、页面标题文案等。
  - [ ] 统一“实验中心 / labs / laboratory”相关用户面文案语义，避免同一模块多套表述并存。
  - [ ] 同步调整搜索关键词、菜单父级描述等低风险用户面语义文本。

- [ ] 79. 完成验证与文档整理
  - [ ] 执行 `pnpm exec tsc --noEmit`，必要时补充生成与定向搜索校验。
  - [ ] 更新 `walkthrough.md`，记录本轮 residual naming 收敛范围、保留项与验证结果。

- [ ] 80. 规划实验模块内部剩余命名债清理并暂停等待确认
  - [ ] 盘点 `src/features/labs/experimental/**` 内仍残留的 `use-experimental.ts`、`Lab*`、`Experimental*` 内部命名债。
  - [ ] 明确本轮仅处理内部函数名、hooks 名、局部类型名、组件名与文件内语义命名，不改路径、API 前缀、权限 ID、query key。
  - [ ] 将执行范围、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 81. 实施实验模块内部命名收敛
  - [ ] 统一 hooks 文件与导出命名，减少 `use-experimental.ts` 与 `useLab*` 混杂语义。
  - [ ] 统一实验模块页面、组件、局部类型中的 `Lab* / Experimental*` 命名风格。
  - [ ] 同步调整所有内部 import / export 引用，避免残留旧命名。

- [ ] 82. 验证并整理文档
  - [ ] 执行 `pnpm exec tsc --noEmit` 并搜索确认旧内部命名不再残留。
  - [ ] 更新 `walkthrough.md`，记录本轮内部命名收敛结果与保留项。

- [ ] 83. 规划实验模块 hooks 文件名收敛并暂停等待确认
  - [ ] 将 `src/features/labs/experimental/hooks/use-experimental.ts` 纳入文件名语义收敛范围。
  - [ ] 明确本轮仅处理文件名与 import 路径迁移，不改导出名、query key、API 路径、权限 ID。
  - [ ] 将执行范围、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 84. 实施 hooks 文件名迁移
  - [ ] 将 `use-experimental.ts` 重命名为更符合当前语义的文件名。
  - [ ] 同步更新所有内部 import 路径，确保调用方全部切换。

- [ ] 85. 验证并整理文档
  - [ ] 执行 `pnpm exec tsc --noEmit` 并搜索确认旧文件路径不再残留。
  - [ ] 更新 `walkthrough.md`，记录本轮文件名收敛结果与保留项。

- [ ] 86. 规划实验模块单文件 any 类型治理并暂停等待确认
  - [ ] 仅针对 `src/features/labs/experimental/hooks/use-lab-experimental.ts` 盘点 `any` 出现位置与最小替代类型方案。
  - [ ] 明确本轮不扩散到其他模块，不处理别的文件中的类型债。
  - [ ] 将执行范围、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 87. 实施 use-lab-experimental.ts 单文件 any 治理
  - [ ] 为 query 返回值、mutation 入参等位置补充最小可接受类型。
  - [ ] 保持 query key、API 路径、导出名与运行时行为不变。

- [ ] 88. 验证并整理文档
  - [ ] 执行 `pnpm exec tsc --noEmit`，必要时补充定向 lint 或搜索校验。
  - [ ] 更新 `walkthrough.md`，记录本轮单文件类型治理结果与保留项。

- [ ] 89. 规划“生产上线主链技术债治理”并暂停等待确认
  - [ ] 明确本轮主线仅覆盖正式生产链路中的认证 / 身份快照 / 用户 / 角色 / 权限链。
  - [ ] 明确本轮不将实验模块、sandbox 业务线、历史兼容清理、局部文案与命名美化混入正式主战场。
  - [ ] 将治理目标、阶段划分、风险、验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 90. 第一阶段：生产主链接口契约与类型收口
  - [ ] 盘点正式生产主链中返回结构、分页契约、options 轻量契约、patch / replace / snapshot 等语义漂移点。
  - [ ] 将认证快照权威入口收敛为 `GET /auth/snapshot`，直接删除旧 `GET /profile`，不保留兼容入口。
  - [ ] 优先治理认证 / 身份 / 用户 / 角色 / 权限链的前后端契约与前端 service 类型。
  - [ ] 建立“服务层稳定 contract -> hooks 消费 -> 页面承接”的单向边界，减少页面层自行猜结构。

- [ ] 91. 第二阶段：生产权限与职责边界收口
  - [ ] 固化“服务端为最终权限裁决来源、前端仅做展示与状态承接”的正式基线。
  - [ ] 收敛 service / hook / page / component 以及 handler / service / repository 的职责边界，减少跨层混杂。
  - [ ] 清理正式主链中仍可能诱导误用的边界命名、注释或旧约定。

- [ ] 92. 第三阶段：生成链 / 配置链 / 校验链稳定化
  - [ ] 收敛权限生成、路由 catalog、action binding、默认权限清单等认证 / 用户 / 权限链相关生成输入与运行时消费边界。
  - [ ] 补强脚本校验与定向验证，避免“生成输入、生成产物、运行时消费、人工理解”再次漂移。

- [ ] 93. 第四阶段：文档基线与上线治理总结
  - [ ] 拆分“当前执行文档”和“长期架构基线文档”的职责，避免 `walkthrough.md` 继续承担全部历史语义。
  - [ ] 更新 `walkthrough.md`，记录正式生产主链治理结果、保留项、风险与验证结论。

- [ ] 94. 规划“角色矩阵 -> 新增用户 -> 登录访问范围”真实链路回归并暂停等待确认
  - [ ] 明确本轮验证主链仅覆盖：角色矩阵修改部门角色权限、用户新增时自动绑定 `org_<dept>` 部门角色、登录后真实访问范围随角色变化生效。
  - [ ] 明确本轮不扩展为前端路由守卫改造，不把前端变成权限裁决源。
  - [ ] 将涉及的前后端入口、测试补强点、风险与验证步骤同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 95. 第一阶段：角色矩阵改权限真实链路回归
  - [ ] 盘点并验证 `useRoles` / `RoleService` / `role_handlers.go` 在角色矩阵勾选权限后的保存、回读与刷新一致性。
  - [ ] 补强“修改部门角色权限后重新读取角色 contract 仍一致”的前后端回归测试。
  - [ ] 明确本阶段以“后端返回稳定 role contract”为验收标准，不允许前端静默兜底回写。

- [ ] 96. 第二阶段：新增用户绑定部门角色真实链路回归
  - [ ] 验证新增用户时，员工所属部门存在 `org_<dept>` 角色会被自动绑定；缺失时直接报错阻断保存。
  - [ ] 补强 `users-action-dialog` / `use-users-action-dialog-sync` / 用户创建 handler 的联动回归测试。
  - [ ] 确认最终写入用户记录的 role 标识与当前部门角色 contract 一致。

- [ ] 97. 第三阶段：登录后真实访问范围验证
  - [ ] 盘点登录鉴权、身份快照、有效权限解析链：`/auth/snapshot`、effective access、middleware、角色权限解析服务。
  - [ ] 补强“部门角色权限变化后，登录态读取到的新访问范围随之变化”的后端回归测试。
  - [ ] 必要时补最小前端 service 层验证，确认身份快照消费的是服务端真实权限结果而非页面本地推导。

- [ ] 98. 第四阶段：执行验证并整理文档
  - [ ] 执行本轮定向 `vitest` / `go test` / `pnpm exec tsc --noEmit`。
  - [ ] 更新 `walkthrough.md`，记录真实链路回归结果、未覆盖项与后续保留风险。

- [ ] 99. 规划“权限核心逻辑抽离专项”并暂停等待确认
  - [ ] 先确认本轮主问题不是单点 bug，而是角色解析、部门角色绑定、有效权限计算、snapshot 回填、页面显示解释在多层重复实现。
  - [ ] 明确本轮优先级从“继续补真实链路回归”切换为“先抽离底层核心逻辑，再做链路验证”。
  - [ ] 将抽离目标、职责边界、迁移阶段、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 100. 第一阶段：收口后端权限核心
  - [ ] 将“用户主角色 + 部门角色族 + 有效权限集合 + effectiveRoles”统一收口为单一后端核心服务，避免 handler / middleware 各自 fallback。
  - [ ] 约束 `auth snapshot`、middleware、角色接口与用户接口只消费该核心结果，不再各自重复解析。
  - [ ] 明确任何 `org_<dept>` 相关角色家族合并逻辑只能存在一处权威实现。

- [ ] 101. 第二阶段：收口前端角色消费边界
  - [ ] 将前端划分为“写侧”与“读侧”：
  - [ ] 写侧只负责提交角色标识与权限变更，不推导有效权限。
  - [ ] 读侧只消费后端返回的稳定 contract，不再本地二次裁决权限。
  - [ ] 约束用户新增绑定、角色矩阵、用户表显示解释分别使用同一套只读 contract / resolver 边界。

- [ ] 102. 第三阶段：清理重复 fallback / 解释层
  - [ ] 排查并删除 handler、middleware、snapshot、前端页面中重复的 fallback 逻辑与隐式兜底。
  - [ ] 将页面层残留的 role drift / role resolver 解释限制为展示用途，不再参与真实权限裁决。
  - [ ] 确认登录、用户新增、角色矩阵三条链只沿同一事实来源流动。

- [ ] 103. 第四阶段：在抽离完成后再做真实链路回归
  - [ ] 回到“角色矩阵改权限 -> 新增用户绑定部门角色 -> 登录后访问范围验证”做最终回归。
  - [ ] 用定向 `vitest` / `go test` / `pnpm exec tsc --noEmit` 验证抽离后的单源逻辑真正闭环。
  - [ ] 更新 `walkthrough.md`，记录本轮抽离结果、保留项与真实链路验证结论。

- [ ] 104. 规划 `use-roles.ts` 专项收口并暂停等待确认
  - [ ] 确认 `src/features/system-mgmt/hooks/use-roles.ts` 仍包含前端本地权限扩展 / 默认权限补齐 / admin 全量补齐等第二套解释逻辑。
  - [ ] 明确本轮目标不是改页面表现，而是把 `use-roles.ts` 拆成两层：
  - [ ] “展示树辅助层”：仅服务权限树勾选 UI、父子节点展开/联动显示。
  - [ ] “后端 contract 消费层”：仅保存和消费后端返回的真实 `role.permissions` contract，不再本地补齐为持久化事实。
  - [ ] 将方案、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 105. 第一阶段：拆分 `use-roles.ts` 的双重职责
  - [ ] 从 `use-roles.ts` 中拆出“展示树辅助”工具，承载父子节点关系、排序、勾选联动等纯 UI 辅助逻辑。
  - [ ] 保留 `use-roles.ts` 作为后端角色 contract 的消费者，不再在加载后对 `role.permissions` 做持久化语义上的二次扩展。
  - [ ] 明确哪些值属于 UI 临时显示集合，哪些值属于后端返回/提交的真实权限集合。

- [ ] 106. 第二阶段：收口角色矩阵写侧
  - [ ] 调整角色矩阵勾选保存逻辑，使提交 payload 只表达后端 contract，而不是前端补齐后的整棵权限树。
  - [ ] 保留必要的页面交互体验，但禁止默认权限补齐 / admin 全量补齐继续作为前端事实来源。
  - [ ] 复查 `RoleService`、角色矩阵 hooks / tabs，确认不再存在另一套持久化权限解释。

- [ ] 107. 第三阶段：补回归测试与验证
  - [ ] 增加 `use-roles` 专项回归测试，锁住“展示树辅助”与“后端 contract 消费”边界。
  - [ ] 验证角色加载、勾选、保存、重新加载后不再因为前端本地扩展而漂移。
  - [ ] 执行定向 `vitest` / `pnpm exec tsc --noEmit`，必要时补后端 handler 合同验证。
  - [ ] 更新 `walkthrough.md`，记录本轮 `use-roles.ts` 专项收口结果与剩余保留项。

- [ ] 108. 规划 `effectiveRoles / role` snapshot 兼容链专项收严并暂停等待确认
  - [ ] 确认当前剩余弱冗余主要集中在 snapshot contract 的兼容层：后端 `GetAuthSnapshotHandler`、前端登录写入、`effective-permission-service`、`access-snapshot` 对 `role` 的回退读取。
  - [ ] 明确本轮目标是“让前后端优先只消费 `effectiveRoles`”，并把 `role` 从兼容事实链降级为过渡字段。
  - [ ] 将方案、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户批准执行。

- [ ] 109. 第一阶段：收严后端 snapshot 输出语义
  - [ ] 复查 `server/handlers/auth.go` 中登录响应与 `/auth/snapshot` 输出，明确 `effectiveRoles` 为角色事实来源。
  - [ ] 减少 `effectiveRoles <- role` 的兼容回填，避免 snapshot 继续在 handler 层做结构修补。
  - [ ] 保留必要过渡兼容，但要求权限与页面链的主消费逻辑不再依赖 `role`。

- [ ] 120. 规划“最终全链弱冗余残留审计”并暂停等待确认
  - [ ] 基于当前已完成的后端单源、compatibility-only 边界收口与重复入口收口，重新梳理前端剩余残留项。
  - [ ] 聚焦仍可能造成误解的 compatibility / display / UX assist / legacy route 残留，不扩大到新的权限裁决改造。
  - [ ] 输出剩余项分层清单：必须处理、建议处理、可保留。
  - [ ] 将方案、范围、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户确认是否进入下一轮审计/实现。

- [ ] 121. 规划“删除未使用 legacy alias”并暂停等待确认
  - [ ] 复查 `getSnapshotRoleIds(...)` 与 `getAuthSessionRoleIds(...)` 的全局调用点，确认已无业务调用，仅剩定义本身与测试引用。
  - [ ] 明确本轮目标是删除未使用的 legacy alias，而不是继续保留兼容壳；系统内只保留显式的 compatibility-only 入口。
  - [ ] 同步调整受影响测试，移除“legacy alias 仍保留”的断言，改为锁住显式 compatibility-only 入口语义。
  - [ ] 将方案、风险与验证策略同步到 `implementation_plan.md` 后暂停，等待用户确认后实施。

- [ ] 122. 第一阶段：删除未使用 legacy alias 导出
  - [ ] 调整 `src/features/authz/core/access-snapshot.ts`，删除 `getSnapshotRoleIds(...)`。
  - [ ] 调整 `src/features/authz/utils/auth-session.ts`，删除 `getAuthSessionRoleIds(...)`。
  - [ ] 确认现有业务代码仅保留显式 compatibility-only 与 effectiveRoles 主链读取入口。

- [ ] 123. 第二阶段：补测试与文档
  - [ ] 调整 `access-snapshot.test.ts` 与 `auth-session.test.ts`，删除 legacy alias 存续断言。
  - [ ] 执行定向 `vitest` / `pnpm exec tsc --noEmit` 验证删除后无引用残留。
  - [ ] 更新 `walkthrough.md`，记录 legacy alias 删除结果与最终保留边界。

- [ ] 124. 规划“前端消费边界制度化”并暂停等待确认
  - [ ] 明确本轮目标不再是零散残留清理，而是把前端权限消费链按职责制度化分层。
  - [ ] 明确分层目标：主链 contract 消费层、compatibility-only 层、display/UX assist 层、legacy route/redirect 层。
  - [ ] 明确本轮不引入新的前端权限硬拦截；权限裁决仍以后端为准，前端只做 contract 消费边界收口。
  - [ ] 将方案、风险、涉及文件范围与验证策略同步到 `implementation_plan.md` 后暂停，等待用户确认。

- [ ] 125. 第一阶段：梳理并固化前端权限消费分层
  - [ ] 盘点 `src/features/authz/**`、`src/components/layout/**`、`src/components/layout/data/**`、`src/features/system-mgmt/**` 中的权限相关读取入口。
  - [ ] 将读取入口按“主链 contract / compatibility-only / display-only / UX assist / legacy route”分类。
  - [ ] 输出统一的边界规则，明确哪些层允许读什么字段、哪些层禁止再派生权限事实。

- [ ] 126. 第二阶段：收口共享入口与命名语义
  - [ ] 对仍存在语义混杂的 helper / service / route helper 做职责拆分或命名收严。
  - [ ] 优先把“像主链、实则只是展示/兼容”的入口改成更明确的层级表达。
  - [ ] 若发现多个模块重复承接相同消费职责，尽量收敛到单一共享入口。

- [ ] 127. 第三阶段：收口 layout / sidebar / tabs / route 配置层弱规则
  - [ ] 复查 layout、sidebar、tab、route catalog 相关配置是否仍混入权限事实解释或历史兼容歧义。
  - [ ] 清理低风险无效分支、失效配置与误导性命名。
  - [ ] 保留必要 legacy route/redirect，但要求表达上显式为 compatibility-only。

- [ ] 128. 第四阶段：补验证与制度化记录
  - [ ] 为关键 shared helper / boundary function 补最小回归测试，锁住主链与 compatibility/display 层隔离。
  - [ ] 执行定向 `vitest` / `pnpm exec tsc --noEmit`，必要时补最小 smoke 验证。
  - [ ] 更新 `walkthrough.md`，记录最终消费边界分层、已收口点与有意保留项。

- [ ] 129. 第三批专项：`route-access / route tab` 投影层语义收口（审批稿）
  - [ ] 复核 `src/features/authz/guards/route-access.ts` 的真实职责，明确其属于“权限快照投影/匹配工具”，不是前端权限事实裁决主链。
  - [ ] 梳理 `canAccessPath / getAccessibleTabs / getRequiredPermissionIdsForPath` 的业务调用面，区分哪些是 Tab 过滤、哪些是路由配置投影、哪些仍可能带有误导性命名。
  - [ ] 若确认需要重命名，只收口表达与共享入口，不新增任何新的前端硬拦截逻辑。
  - [ ] 若调用面仍依赖当前名字，则采用“新语义入口 + 过渡迁移 + 最终删除旧名”的渐进方式推进。
  - [ ] 输出第三批保留项：明确哪些 helper 仍允许存在，且只能被视为“基于快照的前端投影工具”，不能被继续当作权限裁决器。

- [ ] 130. 缺陷修复：产线拓扑保存未携带 `authCode` 且 403 提示语义混淆（审批稿）
  - [ ] 复核“手动搭建首个工段”到 `POST /production/lines` 的完整调用链，确认保存已有产线拓扑时需要携带授权码。
  - [ ] 为产线拓扑编辑/保存链路补齐前端授权码传递，确保已有产线编辑时能把 `authCode` 提交到后端。
  - [ ] 复核现有 403 错误映射，区分“权限不足”与“拓扑授权码无效”两类拒绝原因，避免统一提示误导用户。
  - [ ] 保持“后端为权限/授权事实来源”的原则，不新增前端硬裁决，仅补齐交互与错误展示。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录缺陷根因、修复点与保留项。

- [ ] 131. 缺陷修复：`/engineering/products` 页面文案单语化与中英模式对齐（审批稿）
  - [ ] 复核 `src/features/engineering/index.tsx` 与 `src/features/engineering/components/engineering-sidebar.tsx` 的可见文案来源，区分“语言包输出”“硬编码标签”“内部 token 直出”三类问题。
  - [ ] 清理 `src/locales/messages/zh-CN/engineering.ts` 与 `src/locales/messages/en-US/engineering.ts` 中 `engineering.productMgmt` 下的双语拼接文案，改为中文模式纯中文、英文模式纯英文的单语文案。
  - [ ] 去除页面组件对翻译结果的 `split(' / ')` / `split(' // ')` 依赖，避免把翻译字符串当作结构化数据再次拆分渲染。
  - [ ] 将 `OVERVIEW`、`ROUTING`、`SPEC:`、`NULL_CONSTRAINTS` 等硬编码或技术占位文本纳入 i18n，避免内部标识符直接暴露到 UI。
  - [ ] 保持页面现有结构、交互与权限链路不变，只修正文案来源与渲染策略，不扩展为视觉重构。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录根因、修复边界、验证结果与有意保留项。

- [ ] 132. 延续修复：`productMgmt` 其余表单 / 详情区中英混排残留清理（审批稿）
  - [ ] 复核 `src/locales/messages/zh-CN/engineering.ts` 与 `src/locales/messages/en-US/engineering.ts` 中 `engineering.productMgmt` 尚未收口的双语拼接字段，重点覆盖详情区、弹窗、表单、限制标签、附件区与条码区入口文案。
  - [ ] 梳理这些 key 在 `product-overview-tab`、`product-action-dialog`、相关子组件中的真实消费面，避免只改语言包而遗漏仍依赖旧双语格式的组件。
  - [ ] 将剩余面向用户可见的 `PRODUCT_*`、`EDIT_*`、`LIVE_PREVIEW`、`UPLOAD_*`、`PRINT_*` 等 token 风格文案改为真正单语，不再直接上屏内部标识符。
  - [ ] 若存在组件继续依赖旧格式（如假定文案中同时含英文与中文），则同步去除对应的结构化拆分或格式假设。
  - [ ] 保持产品详情、创建/编辑弹窗、附件与条码交互逻辑不变，只清理文案来源与渲染方式，不扩展为表单结构或视觉重构。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录本轮继续清理范围、验证结果与仍有意保留的 mixed 文案边界。

- [ ] 133. 结构收口：人事账号中心产线管理 TAB 统一为 `产线 -> 工段 -> 工序`（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/line-mgmt/**` 当前前端类型、组件 props、hook 命名与 UI 文案，确认哪些仍混用 `job / jobCategory / process / station` 抽象。
  - [ ] 明确人事账号中心产线管理 TAB 的唯一前端展示语义为 `产线 -> 工段 -> 工序`，去除当前共享页中把中间层误映射为 `工种 / 岗位类别` 的表达与命名。
  - [ ] 梳理前端保存 payload 与后端 `ProductionLine -> LineSegment -> JobCategory -> Station -> ProcessStep` 真实模型之间的差异，决定采用“前端投影适配”方式在不破坏现有后端模型的前提下收口展示与提交。
  - [ ] 统一列表统计、节点新增/重命名/删除动作与拓扑编辑器，使用户侧只能感知 `工段` 与其下 `工序`，不再暴露错层级概念。
  - [ ] 保持授权码、保存冲突、版本控制与权限链路不变，不扩展为整套生产拓扑后端重构。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录当前偏移根因、前端投影方案、验证结果与后端仍保留的深层模型边界。

- [ ] 134. 架构净化：产线拓扑三层模型彻底去兼容壳（审批稿）
  - [ ] 复核 `line-mgmt`、`topology-template`、`work-architecture`、`production-resource-service` 等共享消费面，识别当前仅为兼容旧后端五层结构而保留的 `jobCategories / stations / 投影折叠展开` 壳层。
  - [ ] 将前端共享 contract 真正统一为 `ProductionLine -> Segment -> ProcessStep`，不再让 `jobCategories` 作为前端主类型的一部分存在。
  - [ ] 将当前资源服务中的读取折叠 / 保存展开逻辑升级为显式 adapter 或 contract 层，并评估是否需要同步调整后端返回 contract，避免业务组件继续依赖隐式兼容转换。
  - [ ] 清理 `topology-template`、`work-architecture` 等共享模块中仍直接消费旧层级概念的类型与命名，确保三层模型在共享前端侧一致。
  - [ ] 明确哪些后端深层结构属于历史保留、哪些需要新增独立接口或只读 projection，避免继续让前端页面承担“猜测后端层级”的职责。
  - [ ] 完成最小验证并更新 `walkthrough.md`，记录去兼容壳边界、受影响模块、验证结果与仍明确延后的后端重构项。

- [ ] 135. 后端统一：产线拓扑 API / persistence model 收口为 `产线 -> 工段 -> 工序`（审批稿）
  - [ ] 复核 `server/models/production.go`、`server/services/production_service.go`、对应 handler / route / repository，明确当前后端五层结构中哪些属于真实持久化需求，哪些只是历史抽象残留。
  - [ ] 设计统一三层后端 contract：对前端返回与接收的产线拓扑统一为 `ProductionLine -> Segment -> ProcessStep`，不再要求前端理解 `JobCategory / Station` 中间层。
  - [ ] 明确 persistence model 的迁移策略：是直接调整数据库与模型结构，还是保留底层表结构并在服务层建立后端防腐映射，分阶段去掉五层外露 contract。
  - [ ] 评估并列出受影响的后端消费链：产线保存、回填、权限校验、拓扑模板、work architecture、wheel trace 或其它读取生产拓扑的服务。
  - [ ] 明确兼容与迁移方案：旧数据如何迁移、旧接口如何退场、是否需要新增版本化 API 或一次性替换现有 `/production/lines` contract。
  - [ ] 完成前后端最小验证并更新 `walkthrough.md`，记录 contract 变化、迁移边界、回滚思路与明确排除项。

- [ ] 136. 站点能力映射子域重命名 / 重建模，并拆除旧表旧接口（审批稿）
  - [ ] 复核 `models.Station`、`station_process_mappings`、`production_station_mapping_handlers.go`、`work-architecture` 相关调用链，明确“站点能力映射”是否应独立为新的子域，而不再挂靠旧 `JobCategory / Station` 命名体系。
  - [ ] 设计新的领域命名与模型边界：明确旧 `Station`、旧 `station_process_mappings`、旧 `/production/mappings` 接口各自将被什么新实体与新接口替代。
  - [ ] 明确数据迁移策略：旧表如何迁移到新表、旧 ID 如何保留或映射、历史能力映射如何防止丢失或重复。
  - [ ] 明确拆除清单：哪些旧表、旧模型字段、旧 repository 方法、旧 handler / route、旧前端服务接口将在本轮被删除。
  - [ ] 评估受影响消费链：`work-architecture`、产线保存回填、wheel trace、团队/班组关联、其它直接读取站点能力映射的服务。
  - [ ] 完成迁移验证并更新 `walkthrough.md`，记录新旧模型对照、迁移脚本、回滚方案与明确排除项。

- [ ] 137. 定向修复 `production-shared / scan-platform` 当前 TypeScript 编译错误（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/work-architecture/components/station-node.tsx`、`use-work-architecture.ts` 与 `station-capabilities-dialog.tsx`，确认当前 `station` 语义与 `job` 能力映射接口之间的漂移边界。
  - [ ] 复核 `src/features/scan-platform/contracts/wheel-trace-gateway-contract.ts`、`models/wheel-trace.ts` 与 `examples/wheel-trace/mock-wheel-trace-gateway.ts`，确认 `currentStage` / `timeline` mock 数据与最新三层 contract 的差异。
  - [ ] 设计最小修复方案：仅修正目标调用点与 mock/props 字段，使其重新对齐现有 contract，不在本轮扩展到更大范围的站点能力重建模。
  - [ ] 执行定向 TypeScript 验证并更新 `walkthrough.md`，记录本轮变更点、验证结果与明确未处理项。

- [ ] 138. 加固 `.gitignore`，避免本地敏感文件 / 运行时目录 / 工具缓存被误传服务器（审批稿）
  - [ ] 复核当前 `.gitignore` 已覆盖项与本地实际存在的 ignored 文件，明确哪些敏感文件、缓存目录、运行时产物仍有补充空间。
  - [ ] 设计最小加固方案：只补充高风险且明确不应入库/不应随源码上传服务器的规则，不改动已存在的业务源码跟踪策略。
  - [ ] 执行定向验证，确认新增规则能覆盖目标文件/目录，并记录仍建议通过“仅传 Git 跟踪文件”规避的部署风险。

 - [ ] 139. 定向修复 `DMPreview` 二维码渲染参数透传 `undefined` 导致 bwip-js 报错（审批稿）
  - [ ] 复核 `src/features/basic-settings/components/dm-preview.tsx` 当前 `bwipjs.toCanvas(...)` 参数构造方式，确认 `qrcode` 与 `datamatrix` 分支是否显式透传了 `height: undefined`、`eclevel: undefined` 等非法 option。
  - [ ] 将条码渲染配置改为“按码制条件追加字段”的显式构造方式：公共字段与 `code128` 专属字段、`qrcode` 专属字段分离，避免把 `undefined` 作为 option 值传给 `bwip-js`。
  - [ ] 保持 `DMPreview` 现有 UI、canvas 尺寸、短码展示、后缀标签与视觉布局不变，不扩展为组件重构或条码样式重设计。
  - [ ] 重点验证 `qrcode`、`datamatrix`、`code128` 三类预览都能正常渲染，且控制台不再出现 `bwipp.invalidOptionType` / `height: not a realtype: undefined`。
  - [ ] 补充最小静态验证并更新 `walkthrough.md`，记录本轮根因、修复方式、验证结果与明确未处理项。

- [ ] 140. 架构大瘦身：产线拓扑唯一合法层级收口为 `产线 -> 工段 -> 工序`（审批稿）
  - [ ] 复核 `server/models/production.go`、`server/repositories/production_repository.go`、`server/services/production_service.go`、`server/services/production_line_contract.go` 与前端 `src/features/production-shared/**`，确认当前仍残留的 `JobCategory` / `Station` 定义、预加载、DTO 回退与 UI 错层级命名。
  - [ ] 以“只有产线-工段-工序，其他层级均为冗余且错误”为单一事实来源，重写本轮边界：`JobCategory`、`Station` 不再作为主产线拓扑链的合法层级存在。
  - [ ] 将本轮执行拆成两段：一段收口主产线拓扑后端 contract / 持久化链，另一段评估旧 `Station` 能力映射是否应独立成新子域，而不是继续挂在主拓扑模型下。
  - [ ] 明确本轮高风险点：历史数据降维、旧接口退场、模板/工艺架构消费面联动、隐藏依赖排查不足导致的静默回归。
  - [ ] 在用户审批前不修改业务代码，只输出经过代码证据验证后的中文实施清单、风险、验证方案与确认点。

- [ ] 141. 后端主链收口：删除产线拓扑中的 `JobCategory / Station` 冗余层（审批稿）
  - [ ] 复核 `LineSegment.JobCategories`、`JobCategory`、`Station` 在 GORM 模型、预加载、保存事务、关联清理与 DTO 映射中的真实职责，区分“主拓扑冗余”与“其它子域借用”的边界。
  - [ ] 设计主产线拓扑唯一 contract：`ProductionLine -> LineSegment -> ProcessStep`，对外返回与保存均不再暴露 `jobCategories`、`stations`、折叠回退或兼容壳。
  - [ ] 规划后端代码改动：移除 `LineSegment` 上对 `JobCategory` 的主链依赖，删除产线保存链中 `DeleteJobCategoriesNotIn`、`DeleteProductionStationsNotIn`、相关 ID 收集与 DTO fallback 逻辑。
  - [ ] 评估数据库/持久化策略：若本轮不直接删表，也要明确这些表已退出主拓扑；若直接删表/删模型，则必须给出迁移、回滚与历史数据落点方案。
  - [ ] 识别所有受影响消费方：`/production/lines` 相关 handler/service/repository、前端 `line-mgmt`、`topology-template`、`work-architecture`、以及任何直接依赖旧层级字段的测试与适配代码。
  - [ ] 明确验证方案：后端定向 `go test`、前端 `pnpm exec tsc --noEmit`、目标文件 `eslint`、以及保存/回填/空树/历史数据读取场景验证。

- [ ] 142. 旧站点能力映射去耦：`Station` 不再挂靠主产线拓扑（审批稿）
  - [ ] 复核 `AssignProcessToStation`、`RemoveProcessFromStation`、`ListStationMappings`、`station_process_mappings`、`work-architecture` 等链路，确认哪些能力确实仍需要“站点/能力映射”子域，哪些只是历史命名残留。
  - [ ] 明确架构原则：即使保留某种“能力映射”实体，它也不能再作为主产线拓扑的中间层解释 `工段 -> 工序` 关系。
  - [ ] 设计下一步子域策略：独立重命名、独立接口、独立表/映射关系，或在确认无人消费后彻底删除旧 `Station` 链路。
  - [ ] 列出本轮暂不执行但必须预警的破坏性动作：删旧表、删旧 handler / route、删旧前端能力映射 UI、迁移历史映射数据。
  - [ ] 在 `walkthrough.md` 中预留验证与迁移记录位置，确保后续真正执行时可追溯主拓扑收口与子域拆分的边界。

- [ ] 143. 未消费历史壳归档：清理 `line-mgmt` 下遗留 `station-node` 文件（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/line-mgmt/components/topology/station-node.tsx` 与 `topology-editor/station-node.tsx` 的真实消费情况，确认不存在静态 import、barrel 再导出、测试引用或动态装配依赖。
  - [ ] 将本轮范围严格限定为“未消费历史壳归档”，不触碰 `work-architecture/components/station-node.tsx` 与后端 `Station` 能力映射子域。
  - [ ] 设计归档式清理策略：优先直接删除两份无人消费文件；若发现仍有隐式依赖，则退回为“去入口暴露 + 文档标注待删”，避免误删活跃链路。
  - [ ] 明确风险点：路径删除可能影响 IDE 历史引用、未来未提交分支的旧 import、以及人肉回忆式复用；需通过全仓检索与 TypeScript 编译共同兜底。
  - [ ] 明确验证方案：执行 `grep_search` 复核 `station-node` 引用、执行 `pnpm exec tsc --noEmit` 验证删除后无编译回归，并更新 `walkthrough.md` 记录归档结果。
  - [ ] 在用户审批前不删除业务文件，只输出归档范围、执行策略、风险与确认点。

- [ ] 144. 活跃链路净化：收口 `work-architecture` 中 `station / job` 命名漂移（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/work-architecture/components/station-node.tsx`、`station-capabilities-dialog.tsx`、`process-capability-node.tsx`、`hooks/use-work-architecture.ts` 与 `production-resource-service.ts` 的当前职责，区分“独立能力映射节点”与“旧主拓扑层级残留命名”。
  - [ ] 将本轮范围限定为前端活跃链路命名净化：统一节点 props、回调名、局部变量名与用户可见文案，避免继续混用 `station / job / process` 误导语义。
  - [ ] 明确接口边界：若后端 `/production/mappings` 当前请求体仍使用 `stationId`，则本轮仅在前端通过中性命名或 adapter 隔离该字段，不直接扩展为后端接口重命名。
  - [ ] 优先处理活跃调用面中的误导命名，如 `jobId / jobName`、`StationCapabilitiesDialog`、`assignProcessToJob / removeProcessFromJob` 与相关 props/局部变量，使其与“能力映射节点”语义一致。
  - [ ] 明确风险点：`work-architecture` 为活跃页面，命名调整若边界不清，可能引发 props 错传、能力映射弹窗失效或 TypeScript 联动错误。
  - [ ] 明确验证方案：执行 `pnpm exec tsc --noEmit`，并补充全仓检索确认 `work-architecture` 活跃链路中的目标旧命名已被收口，同时更新 `walkthrough.md` 记录本轮边界与保留项。
  - [ ] 在用户审批前不修改业务代码，只输出执行范围、改名策略、风险与确认点。

 - [ ] 145. 活跃文件名收口：重命名 `work-architecture/components/station-node.tsx`（审批稿）
  - [ ] 复核 `src/features/production-shared/tabs/work-architecture/components/station-node.tsx` 的真实消费面，确认静态 import、路径引用与导出名已经可安全切换到新的中性文件名。
  - [ ] 将本轮范围限定为“文件名与引用入口收口”，不借机扩展到其它组件批量更名或后端 `Station` 子域改造。
  - [ ] 拟定目标文件名为能力映射中性语义，例如 `capability-mapping-node.tsx`，并保持文件内部导出名与文件名一致，避免继续出现“文件名仍叫 station、导出已叫 capability” 的语义断裂。
  - [ ] 明确风险点：文件重命名会影响 import 路径、IDE 打开历史、未提交分支上的旧引用以及大小写/路径缓存问题，需要通过全仓检索与 TypeScript 编译共同兜底。
  - [ ] 明确验证方案：更新所有引用后执行 `pnpm exec tsc --noEmit`，并检索确认 `work-architecture` 活跃链路中不再残留 `./station-node` 的真实引用。
  - [ ] 在用户审批前不执行文件重命名，只输出目标文件名、引用调整范围、风险与确认点。