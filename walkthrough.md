# 变更记录与验证（walkthrough.md）

## 2026-04-22 `业务编号` 残留入口最小清理

- **变更概述**
  - 删除 `src/components/layout/data/search-data.ts` 中指向 `'/basic-settings/sequences'` 的失效命令搜索入口，避免用户再从命令搜索进入不存在的旧页面。
  - 追踪并确认 `src/features/authz/data/authenticated-route-catalog.ts` 的来源链来自 `scripts/generate-authenticated-route-catalog.mjs`，其扫描源为 `src/routes/_authenticated`。
  - 由于当前 `src/routes/_authenticated/basic-settings/` 下已不存在 `sequences` route 文件，因此通过重新执行生成脚本刷新 `authenticated-route-catalog.ts`，清除其中残留的 `'/basic-settings/sequences'` 条目。
  - 本轮未改动 `SequenceMgmt` 页面实现、`basicSettings.sequences.*` 文案命名空间，也未推进 `业务编号` 承载层迁移。

- **收口结果**
  - 命令搜索不再暴露失效旧入口 `'/basic-settings/sequences'`。
  - `authenticated-route-catalog.ts` 已与当前真实路由树重新对齐，旧路径残留已清除。
  - 当前 `业务编号` 的唯一真实入口继续收口为 `'/code-center/linear-barcode/numbering'`。

- **验证结果**
  - `node scripts/generate-authenticated-route-catalog.mjs`：通过。
  - 全局检索 `'/basic-settings/sequences'`：无匹配，确认旧入口残留已消失。
  - `pnpm exec eslint src/components/layout/data/search-data.ts src/features/authz/data/authenticated-route-catalog.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-22 `业务编号` 历史残留入口盘点清单（重点：`/basic-settings/sequences`）

- **盘点结论**
  - 当前 `业务编号` 的**真实可访问入口**是 `'/code-center/linear-barcode/numbering'`。
  - `'/basic-settings/sequences'` 在当前代码树中**没有对应 route 文件，也没有发现 redirect/兼容跳转实现**，因此更接近“失效旧入口残留”，而不是可继续访问的历史兼容入口。

- **分类清单**
  - **真实有效入口**
    - `src/routes/_authenticated/code-center/linear-barcode/numbering.tsx`
    - `src/features/code-center/tabs.ts` 中的 `'/code-center/linear-barcode/numbering'`
    - `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx` 中从协议页跳转到该新入口的按钮
  - **失效旧入口残留**
    - `src/components/layout/data/search-data.ts` 仍保留 `href: '/basic-settings/sequences'`
    - `src/features/authz/data/authenticated-route-catalog.ts` 仍保留 `'/basic-settings/sequences'`
    - `src/routes/_authenticated/basic-settings/` 目录下未发现 `sequences.tsx` 或相关兼容路由文件
    - `src/routes/_authenticated/basic-settings/index.tsx` 与 `route.tsx` 的默认收口已指向 `'/basic-settings/units'`，不是 `sequences`
  - **说明级 / 实现级引用（不应当作为“残留入口”直接清理）**
    - `src/features/basic-settings/tabs/sequence-mgmt.tsx`：页面实现本体，当前被新路由复用
    - `src/features/basic-settings/services/numbering-service.ts`：通用发号服务
    - `src/features/trading/hooks/use-sales-order-form.ts` / `use-sales-order-init.ts`：消费 `numberingService`
    - `src/locales/messages/zh-CN/basicSettings.ts` 中的 `basicSettings.sequences.*`：当前仍为页面文案命名空间，不等于旧路由入口

- **影响判断**
  - 当前最大可见残留是**命令搜索会继续把用户带到一个不存在的旧路径**，这是最优先应清理的问题。
  - `authenticated-route-catalog.ts` 的旧路径残留说明路由目录或生成产物与现状存在漂移，后续应在正式实施清理时同步核查生成脚本来源，而不是只改一处字符串。
  - 侧边栏当前未暴露 `'/basic-settings/sequences'`，因此主导航风险低于命令搜索风险。

- **建议清理顺序**
  1. 先处理 `search-data.ts` 中的旧命令入口，避免继续把用户导向失效链接。
  2. 再核查并修正 `authenticated-route-catalog.ts` 的旧路径来源，确认是否需要重新生成相关目录。
  3. 保留 `SequenceMgmt` 组件与 `basicSettings.sequences` 文案命名空间，除非后续决定做更大范围的语义重命名。
  4. 若后续再做“业务编号承载层迁移”，应基于当前真实入口 `'/code-center/linear-barcode/numbering'` 规划，不要再把 `'/basic-settings/sequences'` 视为有效兼容路径。

- **本轮收口**
  - 本轮只完成了残留入口只读盘点，没有修改任何路由、搜索入口或生成目录文件。

## 2026-04-22 `一维码 > 业务编号` TAB 迁移到 `共享编码源` 的安全性分析

- **分析结论**
  - 以当前代码现状来看，`一维码 > 业务编号` **不建议直接判定为“可以安全移动到共享编码源”**。
  - 更准确地说：它**具备被抽离到共享承载层的产品潜力**，但当前实现仍存在入口语义、路由挂载、旧链接残留与跨业务消费者等问题；如果现在直接搬迁，风险高于“纯路由搬家”。

- **关键依据**
  - `业务编号` 当前并不是 `共享编码源` 下的页面，而是独立挂在 `一维码` 子路由下：
    - `src/routes/_authenticated/code-center/linear-barcode/numbering.tsx`
    - `src/features/code-center/tabs.ts`
    - `src/features/code-center/linear-barcode-layout.tsx`
  - `共享编码源` 当前只承载 `孔型孔数`，tabs 与默认重定向都只围绕该能力组织：
    - `src/features/code-center/shared-code-source-layout.tsx`
    - `src/routes/_authenticated/code-center/shared-code-source/hole-codes.tsx`
    - `src/routes/_authenticated/code-center/shared-code-source/index.tsx`
  - `一维码协议` 页面中存在显式跳转到 `业务编号` 页的动作入口，说明它当前被当作 `一维码` 配置流程的一部分来使用，而不是单纯的共享字典页：
    - `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
  - `一维码协议` 的默认配置直接绑定 `LINEAR_BARCODE_SEQUENCE_RULE_KEY = LINEAR_BARCODE_WHEEL`，并依赖 `numberingService.generateNumber(sequenceRuleKey)` 获取流水号，因此 `业务编号` 与 `一维码协议` 至少存在清晰的流程级耦合。
  - `SequenceMgmt` 本身管理的是通用 `/numbering/rules` 后端资源，而非 `共享编码源` 当前这种“局部字典 bundle + query key + storage key”形态：
    - `src/features/basic-settings/tabs/sequence-mgmt.tsx`
    - `src/features/basic-settings/services/numbering-service.ts`
  - `numberingService` 还被销售订单条码生成逻辑复用，不只服务于一维码：
    - `src/features/trading/hooks/use-sales-order-form.ts`
    - `src/features/trading/hooks/use-sales-order-init.ts`
  - 系统内还存在 `'/basic-settings/sequences'` 的命令搜索残留与 authenticated route catalog 记录，但当前未找到对应 route 文件，说明该能力周边存在入口漂移 / 残留问题，当前并不适合再直接做第二次搬迁而不先清理边界：
    - `src/components/layout/data/search-data.ts`
    - `src/features/authz/data/authenticated-route-catalog.ts`

- **风险判断**
  - 当前如果直接迁到 `共享编码源`，至少有以下风险：
    - `一维码协议` 页上的跳转入口、tabs 心智与页面语义会发生断裂
    - 旧深链接 / 旧命令搜索入口 / 既有书签可能失效或漂移
    - 用户会误以为“业务编号”只服务共享编码源字典，但实际上它承载的是通用发号规则中心
    - `共享编码源` 当前承载的是静态/主数据类来源项，而 `业务编号` 是后端发号规则配置，两类能力模型并不完全同构

- **推荐路径**
  - 若后续产品上仍希望统一收口到 `编码中心 > 共享编码源`，建议不要直接迁现页，而是按以下顺序分步推进：
    1. 先明确产品语义：`业务编号` 是否真的要被定义为“共享编码源”，还是应定义为“共享发号规则中心”。
    2. 清理旧入口漂移：确认 `/basic-settings/sequences` 是否已废弃，并同步修正命令搜索 / route catalog / 任何残留入口。
    3. 盘点消费者：至少覆盖 `一维码协议` 与销售订单条码相关消费方，明确迁移后的入口与说明文案。
    4. 若确认迁移，再新增 `shared-code-source` 下的新 tab，并保留旧地址兼容跳转一段时间，而不是一步删除旧路径。

- **本轮收口**
  - 本轮只完成了代码级只读分析，没有修改路由、tabs、菜单或业务实现。
  - 结论偏向：**当前不建议直接移动；若要迁移，应视为独立迁移项目而不是小范围安全搬家。**

## 2026-04-22 页面容器层测试补强：`engineering-master-weaving-mode-tab.tsx` / `drilling-tab.tsx`

- **变更概述**
  - 新增 `src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.test.tsx`，为 `编织方式` 页面容器补充薄层编排回归测试。
  - 新增 `src/features/engineering-db/tabs/drilling-tab.test.tsx`，为 `drilling` 页面入口补充薄层容器测试。
  - `engineering-master-weaving-mode-tab.tsx` 测试覆盖了关键 contract：
    - 指标卡是否基于 `filteredData` 正确透传并展示 `total / active / presets`
    - `WeavingModeToolbar` 的 `searchTerm / onSearchTermChange / onCreate` 是否正确桥接到页面状态
    - `WeavingModeListCard` 的 `onRetry / onEdit / onDelete` 是否正确桥接到 hook 动作与页级状态
    - `WeavingModeActionDialog` 的 `open / currentRow / onSave / isLoading` 是否按容器职责挂载
    - 删除路径是否继续受 `window.confirm` 守卫，避免容器层编排回归后绕过确认
  - `drilling-tab.tsx` 测试覆盖了关键 contract：
    - `DrillingToolbar` 的 `searchTerm / onSearchTermChange / onCreate` 是否正确桥接
    - `DrillingTableCard` 与 `DrillingMobileList` 是否接收到同一组 `rows / preview / edit / delete` 编排动作
    - `DrillingActionDialog` 的 `open / currentRow / onSave / isLoading / onOpenChange` 是否正确挂载
    - `CADViewerDialog / PDFViewerDialog / ExcelViewerDialog` 是否接收到正确的 `open / onOpenChange / fileUrl / fileName / sku`
  - 本轮仅新增页面容器层测试文件，没有扩散改动页面实现或子组件实现。

- **收口结果**
  - `engineering-master-weaving-mode-tab.tsx` 与 `drilling-tab.tsx` 现在都具备“容器只负责编排与透传”的薄层回归保护，后续继续调整 props 结构或页面壳时更容易发现连线漂移。
  - 本轮测试与此前已补齐的 hooks 测试形成上下两层保护：hooks 锁定业务编排语义，页面容器测试锁定子组件挂载 contract。
  - 在补测过程中未暴露新的业务缺陷，因此没有继续改动页面业务实现。

- **验证结果**
  - `pnpm exec vitest run src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.test.tsx src/features/engineering-db/tabs/drilling-tab.test.tsx`：通过（`4` 个测试）。
  - `pnpm exec eslint src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.test.tsx src/features/engineering-db/tabs/drilling-tab.test.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-22 drilling hooks 测试补强：`use-drilling-page-state.ts` / `use-drilling-action-dialog-state.ts`

- **变更概述**
  - 新增 `src/features/engineering-db/hooks/use-drilling-page-state.test.tsx`，为 `drilling` 页面容器状态 hook 补充独立回归测试。
  - 新增 `src/features/engineering-db/hooks/use-drilling-action-dialog-state.test.tsx`，为 `drilling` 表单状态 hook 补充独立回归测试。
  - `use-drilling-page-state.ts` 测试覆盖了关键 contract：
    - 基于产品映射与搜索词生成 `filteredRows`
    - `handleCreate / handleEdit` 对弹窗状态与当前行的影响
    - `handlePreview` 在 `no file / unresolved / cad / excel / pdf` 场景下的分支
    - `handleDelete` 对确认流与删除 mutation 的桥接
    - `handleSave` 在新增 / patch 场景下对 `ProductionDBService` 的调用与成功收口
  - `use-drilling-action-dialog-state.ts` 测试覆盖了关键 contract：
    - 新建 / 编辑场景下的初始表单状态构建
    - `weavingModeItems` 对可用编织方式的过滤规则
    - `handleWeavingModeChange` 同步回写 `weavingModeId / weavingModeLabel`
    - 主数据加载失败、无可用编织方式、schema 校验失败时的阻断提示
    - `buildSaveParams()` 在新增 / patch / 无变更场景下的返回语义
  - 在补测过程中未发现新的业务缺陷；仅有一处测试预期需要与 `drillingPlanInputSchema` 的默认 `version` 字段对齐，已在测试中收口。

- **收口结果**
  - `drilling` 页面拆分后新增的两个核心 hooks 现在都具备独立测试保护，后续继续调整预览、删除、patch 保存或主数据阻断逻辑时更容易发现回归。
  - 本轮只新增测试文件并校准测试预期，没有扩散改动 `drilling` 业务实现。

- **验证结果**
  - `pnpm exec vitest run src/features/engineering-db/hooks/use-drilling-page-state.test.tsx src/features/engineering-db/hooks/use-drilling-action-dialog-state.test.tsx`：通过（`12` 个测试）。
  - `pnpm exec eslint src/features/engineering-db/hooks/use-drilling-page-state.test.tsx src/features/engineering-db/hooks/use-drilling-action-dialog-state.test.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-22 编织方式 hooks 测试补强：`use-weaving-mode-query-state.ts` / `use-weaving-mode-filter-state.ts`

- **变更概述**
  - 新增 `src/features/engineering-db/hooks/use-weaving-mode-query-state.test.tsx`，为 `编织方式` 主数据远端编排 hook 补充独立回归测试。
  - 新增 `src/features/engineering-db/hooks/use-weaving-mode-filter-state.test.tsx`，为本地搜索过滤 hook 补充纯输入输出测试。
  - 测试覆盖了 `use-weaving-mode-query-state.ts` 的关键 contract：
    - 空数据时触发一次预置补种
    - 保存 / 删除成功后触发查询失效与 success toast
    - 重复比例保存错误映射到 duplicate toast
    - 预置不可删、被打孔方案引用删除受阻时映射到正确错误提示
    - `refetchWeavingModes()` 手动重试路径
  - 在补测过程中暴露出一个真实缺陷：`refetchWeavingModes()` 之前只重置了内部 ref，但当查询结果仍为空数组时，由于 effect 依赖未变化，不会再次触发预置补种。为此调整 `src/features/engineering-db/hooks/use-weaving-mode-query-state.ts`，增加显式 retry signal，让手动重试后能重新评估预置初始化。
  - `use-weaving-mode-filter-state.ts` 测试覆盖了默认不过滤、`label / normalizedRatioKey / description / system preset / custom` 命中和 `trim + toLowerCase` 搜索语义。

- **收口结果**
  - 新拆出的 `编织方式` hooks 现在已具备独立测试保护，后续继续演进主数据查询编排或过滤规则时更容易发现回归。
  - `refetchWeavingModes()` 的手动重试路径现已真正可重新触发预置补种，不再只是重置内部标记却没有后续 effect 响应。
  - 本轮只补测试与修正测试暴露出的真实缺陷，没有扩散到其它主数据页面或 service 逻辑。

- **验证结果**
  - `pnpm exec vitest run src/features/engineering-db/hooks/use-weaving-mode-query-state.test.tsx src/features/engineering-db/hooks/use-weaving-mode-filter-state.test.tsx`：通过（`8` 个测试）。
  - `pnpm exec eslint src/features/engineering-db/hooks/use-weaving-mode-query-state.ts src/features/engineering-db/hooks/use-weaving-mode-filter-state.ts src/features/engineering-db/hooks/use-weaving-mode-query-state.test.tsx src/features/engineering-db/hooks/use-weaving-mode-filter-state.test.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-22 `use-weaving-mode-mgmt.ts` 边界收口

- **变更概述**
  - 新增 `src/features/engineering-db/hooks/use-weaving-mode-query-state.ts`，将 `编织方式` 主数据页的远端数据编排单独收口，承接 `useQuery` 取数、显式预置补种、保存/删除 mutation、查询失效与错误 toast 映射。
  - 新增 `src/features/engineering-db/hooks/use-weaving-mode-filter-state.ts`，将本地 `searchTerm / filteredData` 过滤派生单独收口，避免一个 hook 同时承担远端状态和本地视图状态。
  - 调整 `src/features/engineering-db/hooks/use-weaving-mode-mgmt.ts`，收口为组合入口，仅负责拼装 `query state + filter state`，继续维持页面侧单入口消费方式。

- **收口结果**
  - `use-weaving-mode-mgmt.ts` 已不再直接承载查询、预置初始化、mutation、toast 映射和过滤派生的全部实现，后续继续扩展主数据页时更容易沿边界演进。
  - `engineering-master-weaving-mode-tab.tsx` 仍然沿用单一 hook 入口，不需要为本轮收口改成同时消费多个碎片 hook。
  - 本轮没有改变查询 key、预置初始化策略、删除/重复错误提示和主数据页对外行为，仅做内部职责收口。

- **验证结果**
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - `pnpm exec eslint src/features/engineering-db/hooks/use-weaving-mode-mgmt.ts src/features/engineering-db/hooks/use-weaving-mode-query-state.ts src/features/engineering-db/hooks/use-weaving-mode-filter-state.ts src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.tsx`：通过。

## 2026-04-22 工程主数据相关文件结构拆分：drilling 页面容器化与 weaving-mode 页面收口

- **变更概述**
  - 将 `src/features/engineering-db/tabs/drilling-tab.tsx` 收口为页面容器，新增 `src/features/engineering-db/hooks/use-drilling-page-state.ts` 统一承接搜索词、当前编辑行、预览弹窗状态、save/delete mutation 编排与行级交互逻辑。
  - 新增 `src/features/engineering-db/components/drilling-toolbar.tsx`、`src/features/engineering-db/components/drilling-table-card.tsx`、`src/features/engineering-db/components/drilling-mobile-list.tsx`，把 `drilling-tab.tsx` 中原先混杂的顶部工具栏、桌面表格区和移动端列表区拆成薄层组件。
  - 将 `src/features/engineering-db/components/drilling-action-dialog.tsx` 收口为薄容器，新增 `src/features/engineering-db/hooks/use-drilling-action-dialog-state.ts`，统一承接初始表单数据构建、`useDeltaTracker` 对接、编织方式选项映射与保存前阻断判断。
  - 新增 `src/features/engineering-db/components/drilling-basic-info-section.tsx`、`src/features/engineering-db/components/drilling-spec-section.tsx`、`src/features/engineering-db/components/drilling-attachment-section.tsx`、`src/features/engineering-db/components/drilling-meta-section.tsx`，把弹窗内部表单区块从大文件中拆开。
  - 为 `编织方式` 主数据页新增 `src/features/engineering-db/components/weaving-mode-toolbar.tsx` 与 `src/features/engineering-db/components/weaving-mode-list-card.tsx`，并将 `src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.tsx` 收口为页面容器，避免继续在单文件中同时承载工具栏、错误态、空态、列表映射与动作按钮实现。

- **收口结果**
  - `drilling-tab.tsx` 已不再同时承载数据请求、搜索派生、预览状态、桌面表格和移动端列表的全部实现，后续扩展筛选、更多动作或更多展示态时可按边界继续演进。
  - `drilling-action-dialog.tsx` 现在主要负责 `ActionDialogShell` 挂载与保存按钮触发，表单状态和表单区块已被拆开，后续继续补字段或补测试时不必再直接堆叠在单文件中。
  - `engineering-master-weaving-mode-tab.tsx` 已进一步收口为容器层，`weaving-mode` 页面结构与此前 `drilling` 页面保持更一致的“页面容器 + 列表区块”形态。
  - 本轮仅做结构拆分，没有回退此前已完成的删除保护、唯一性保护、读取去副作用与失败语义整改结果。

- **验证结果**
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - `pnpm exec eslint src/features/engineering-db/tabs/drilling-tab.tsx src/features/engineering-db/components/drilling-action-dialog.tsx src/features/engineering-db/hooks/use-drilling-page-state.ts src/features/engineering-db/hooks/use-drilling-action-dialog-state.ts src/features/engineering-db/components/drilling-toolbar.tsx src/features/engineering-db/components/drilling-table-card.tsx src/features/engineering-db/components/drilling-mobile-list.tsx src/features/engineering-db/components/drilling-basic-info-section.tsx src/features/engineering-db/components/drilling-spec-section.tsx src/features/engineering-db/components/drilling-attachment-section.tsx src/features/engineering-db/components/drilling-meta-section.tsx src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.tsx src/features/engineering-db/components/weaving-mode-toolbar.tsx src/features/engineering-db/components/weaving-mode-list-card.tsx`：通过（存在 `useReactTable()` 的 React Compiler 兼容性 warning，为 TanStack Table 既有 warning，非本次阻塞错误）。

## 2026-04-22 工程主数据稳定性整改：删除保护、唯一性约束与读取去副作用

- **变更概述**
  - 调整 `server/services/engineering_master_service.go`，为 `ENGINEERING_MASTER_WEAVING_MODE` 下沉后端唯一性保护：保存与批量同步 `EngineeringSpec` 时，统一检查 `specData.normalizedRatioKey`，阻止重复归一化比例写入。
  - 调整同一后端服务与 `server/handlers/engineering.go`，新增 `编织方式` 被 `DRILLING_PLAN` 引用时的删除保护，并将“重复比例 / 被打孔方案引用”映射为明确的 `409 / 403` 业务错误，而不是通用 `500`。
  - 新增 `server/services/engineering_master_service_test.go`，补充两条定向回归测试，锁定“重复比例拒绝保存”与“被打孔方案引用时拒绝删除”两类核心约束。
  - 新增 `src/features/engineering-db/data/weaving-mode-utils.ts`，抽离比例归一化与排序纯函数；同步收口 `weaving-mode-service.ts` 与 `weaving-mode-action-dialog.tsx` 中重复的归一化逻辑。
  - 调整 `src/features/engineering-db/services/weaving-mode-service.ts`，移除 `getWeavingModes()` 读时隐式补种副作用，改为纯读；预置补种收口为显式 `ensureWeavingModePresets()`，并对单条脏记录做隔离解析，避免整批读取因单条坏数据失败。
  - 调整 `src/features/engineering-db/hooks/use-weaving-mode-mgmt.ts` 与 `src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.tsx`，由主数据页显式触发预置补种，并补充明确的加载失败 / 重试状态，不再把读取失败伪装成空列表。
  - 调整 `src/features/engineering-db/components/drilling-action-dialog.tsx`，当编织方式主数据加载失败或当前无可用编织方式时，明确阻断保存并给出可见提示，避免消费侧继续在空下拉上提交错误数据。
  - 调整 `src/features/engineering-db/services/production-db-service.ts`，让 `drilling / labeling` 两条读取链路对单条脏记录做隔离解析，避免一条坏数据拖垮整个列表。
  - 更新 `src/locales/messages/zh-CN/engineering.ts` 与 `src/locales/messages/en-US/engineering.ts`，补充与本轮整改相关的提示文案。

- **收口结果**
  - `编织方式` 的归一化唯一性约束已同时存在于前端与后端，前端校验不再是唯一防线，批量接口也不能绕过该约束。
  - `编织方式` 被 `打孔方案` 引用时，后端现在会拒绝删除，从根上阻断“主数据被删、消费数据悬挂”的完整性风险。
  - `weavingModeService.getWeavingModes()` 已恢复为纯读取语义；预置补种被显式化到主数据管理链路，读取失败与真正的“空数据”已被区分开。
  - `打孔方案` 消费侧在主数据不可用时会明确阻断提交，不再用空下拉和默认空数组掩盖上游故障。
  - `生产数据库` 的 drilling / labeling 读取现在对单条脏记录具备容错能力，列表稳定性比此前更高。

- **验证结果**
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - `pnpm exec eslint src/features/engineering-db/data/weaving-mode-utils.ts src/features/engineering-db/services/weaving-mode-service.ts src/features/engineering-db/hooks/use-weaving-mode-mgmt.ts src/features/engineering-db/components/weaving-mode-action-dialog.tsx src/features/engineering-db/components/drilling-action-dialog.tsx src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.tsx src/features/engineering-db/services/production-db-service.ts src/locales/messages/zh-CN/engineering.ts src/locales/messages/en-US/engineering.ts`：通过。
  - `pnpm run verify:i18n`：通过。
  - `go test ./services -run "EngineeringMasterService|EngineeringSpec" -count=1`：通过。
  - `go test ./handlers -run ^$`：通过，确认 handlers 包在新增错误映射后可正常编译。

## 2026-04-22 打孔方案切换为引用 `工程主数据 > 编织方式`

- **变更概述**
  - 调整 `src/features/engineering-db/data/schema.ts`，将 `DrillingPlan` 的编织字段从旧的自由文本 `lacingPattern` 直接切换为 `weavingModeId`，并补充 `weavingModeLabel` 用于列表展示与搜索。
  - 调整 `src/features/engineering-db/components/drilling-action-dialog.tsx`，打孔方案弹窗不再使用模块内固定编织比例选项，而是通过 `weavingModeService` 拉取 `工程主数据 > 编织方式` 作为下拉来源；保存时同步写入 `weavingModeId / weavingModeLabel`。
  - 调整 `src/features/engineering-db/tabs/drilling-tab.tsx`，将列表搜索、表格列与移动端卡片展示统一切换为 `weavingModeLabel`，彻底移除前端对 `lacingPattern` 的消费。
  - 清理 `src/features/engineering-db/data/drilling-options.ts` 中已废弃的 `LACING_PATTERN_OPTIONS`，并更新 `src/locales/messages/zh-CN/engineering.ts`、`src/locales/messages/en-US/engineering.ts`，将相关文案统一为 `编织方式 / Weaving Mode`。
  - 收紧 `src/features/engineering-db/services/production-db-service.ts` 中的 patch 映射类型，确保 `drillingData` 字段切换后新增与 patch 两条链路都能稳定工作。

- **收口结果**
  - `打孔方案` 现已直接引用 `工程主数据 > 编织方式`，不再维护本地硬编码编织比例选项。
  - 由于当前系统尚未上线，本轮未保留旧 `lacingPattern` 兼容层，字段契约已直接切换为 `weavingModeId` 主引用链路。
  - 打孔方案的搜索、表格、移动端摘要和弹窗选择现已围绕 `编织方式` 主数据运行，与你确认的第二阶段边界一致。

- **验证结果**
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - `pnpm exec eslint src/features/engineering-db/data/schema.ts src/features/engineering-db/services/production-db-service.ts src/features/engineering-db/components/drilling-action-dialog.tsx src/features/engineering-db/tabs/drilling-tab.tsx src/features/engineering-db/data/drilling-options.ts src/locales/messages/zh-CN/engineering.ts src/locales/messages/en-US/engineering.ts`：通过（存在 `useReactTable()` 的 React Compiler 兼容性 warning，为 TanStack Table 既有警告，非本次阻塞错误）。
  - `pnpm run verify:i18n`：通过。

## 2026-04-21 工程数据库新增 `工程主数据 > 编织方式` MVP

- **变更概述**
  - 在 `src/features/engineering-db/tab-config.ts` 中为 `工程数据库` 新增一级入口 `工程主数据`，并新增 `src/features/engineering-db/engineering-master-layout.tsx`、`src/features/engineering-db/engineering-master-tabs.ts` 与对应路由 `src/routes/_authenticated/engineering-db/engineering-master/*`，形成独立承载层与内部首个 `编织方式` 子页签。
  - 新增 `src/features/engineering-db/data/weaving-mode-schema.ts`、`src/features/engineering-db/services/weaving-mode-service.ts`、`src/features/engineering-db/hooks/use-weaving-mode-mgmt.ts`，基于既有 `engineeringSpecService` 复用后端 `EngineeringSpec` 通道，以 `ENGINEERING_MASTER_WEAVING_MODE` 作为新类型，将编织方式主数据存入 `specData`。
  - 在服务层实现编织比例归一化与唯一性约束：自动约分、统一生成 `normalizedRatioKey`、`label`、`code` 与自动排序；并补入系统预置值 `1:1`、`2:1`。
  - 新增 `src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.tsx` 与 `src/features/engineering-db/components/weaving-mode-action-dialog.tsx`，提供列表检索、新增、编辑、删除及系统预置保护能力。
  - 更新 `src/features/engineering-db/query-keys.ts` 与中英文文案 `src/locales/messages/zh-CN/engineering.ts`、`src/locales/messages/en-US/engineering.ts`，补齐 `工程主数据 / 编织方式` 所需查询键与 UI 文案。

- **收口结果**
  - `工程数据库` 下已新增独立的 `工程主数据` 承载层，`编织方式` 作为首个内部 TAB 落地，未继续混挂到编码中心或既有共享编码源页面。
  - 编织方式主数据现支持系统预置与自定义扩展，并由系统自动生成标准化比例与排序，用户不再维护自由文本比例或手工排序。
  - 本轮范围严格控制在主数据本体闭环，未接入打孔图纸引用、上传识别或共享编码源消费改造，保持与你确认的 MVP 边界一致。

- **验证结果**
  - `pnpm run gen:route-tree`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - `pnpm exec eslint src/features/engineering-db/data/weaving-mode-schema.ts src/features/engineering-db/services/weaving-mode-service.ts src/features/engineering-db/engineering-master-layout.tsx src/features/engineering-db/hooks/use-weaving-mode-mgmt.ts src/features/engineering-db/components/weaving-mode-action-dialog.tsx src/features/engineering-db/tabs/engineering-master-weaving-mode-tab.tsx src/features/engineering-db/engineering-master-tabs.ts src/features/engineering-db/query-keys.ts src/features/engineering-db/tab-config.ts src/routes/_authenticated/engineering-db/engineering-master/route.tsx src/routes/_authenticated/engineering-db/engineering-master/index.tsx src/routes/_authenticated/engineering-db/engineering-master/weaving-mode.tsx`：通过。
  - `pnpm run verify:i18n`：通过。

## 2026-04-20 删除结算方式字典中的两个预付内置项

- **变更概述**
  - 调整 `server/services/finance_master_service.go`，从默认结算方式字典中移除 `PREPAY100` 与 `PREPAY30_BAL70` 两个系统内置项。
  - 在同一文件补充强制移除逻辑，确保默认结算方式补种时，这两个预付系统项不会被保留或重新写回系统。
  - 调整 `server/services/finance_master_service_test.go`，补充默认字典与强制移除逻辑的回归测试。
  - 调整 `src/locales/messages/zh-CN/finance.ts` 与 `src/locales/messages/en-US/finance.ts`，删除这两个预付内置项的本地化标签与描述残留。

- **收口结果**
  - 财务中心结算方式字典不再提供“预付 100%”与“预付 30% 尾款 70%”这两个系统选项。
  - 因为订单结算方式下拉自动读取该字典，删除后下游新建单入口会自然同步消失，无需额外在订单侧写死处理。
  - 默认结算方式补种时，这两个预付系统项也不会被重新写回，保证它们在系统里持续消失。

- **验证结果**
  - `cmd /c pnpm exec eslint src/locales/messages/zh-CN/finance.ts src/locales/messages/en-US/finance.ts`：通过。
  - `cmd /c pnpm exec tsc --noEmit --pretty false`：通过。
  - `go test ./services -run "PaymentTerms|FinanceDictionary"`：通过。

## 2026-04-20 应收侧收款登记完善与订单侧轻入口

- **变更概述**
  - 后端扩展 `server/models/ar_ap_ledger.go`、`server/services/ar_ap_dto.go`、`server/services/ar_ap_query_service.go`、`server/handlers/query_params.go`、`server/handlers/ar_ap_handlers.go`，为 `ReceiptRecord` 补充 `receivedAt / receiptAccount` 字段，并让应收列表支持按 `sourceType / sourceRefId` 做订单来源过滤。
  - 前端扩展 `settlement-record-api-dto.ts`、`settlement-record-payload.ts`、`use-settlement-record-dialog-state.ts`、`use-settlement-ledger-detail-dialog-view-model.ts`、`settlement-record-form-section.tsx`、`settlement-records-table-section.tsx`、`settlement-ledger-detail-dialog.tsx`，让应收收款登记支持 `收款方式 / 收款时间 / 收款账号` 录入与历史回显。
  - 新增 `src/features/trading/receivables/utils/receivable-route-search.ts`，并更新 `src/routes/_authenticated/trading/receivables.tsx`、`use-receivables.ts`、`receivables-query-service.ts`、`sales-receivables-tab.tsx`，支持订单侧跳转后按来源过滤并按需自动打开对应应收台账。
  - 更新 `src/features/trading/components/parts/sales-order-detail-summary.tsx`，在销售订单详情摘要中补充“查看应收 / 登记收款”轻入口，不在订单侧引入完整财务表单。
  - 补充并更新相关前后端测试：`server/handlers/ar_ap_handlers_test.go`、`src/features/trading/contracts/settlement-record-api-dto.test.ts`、`src/features/trading/services/settlement-record-payload.test.ts`、`src/features/trading/receivables/contracts/receivable-api-dto.test.ts`、`src/features/trading/receivables/services/receivable-ledger-detail-service.test.ts`、`src/features/trading/receivables/services/receivables-query-service.test.ts`。

- **收口结果**
  - 收款详细录入继续统一归属在应收台账详情，不把收款账号、收款时间、凭证等财务录入塞回销售订单界面。
  - 销售订单详情现可通过轻入口跳到应收页；“查看应收”负责过滤定位，“登记收款”会在过滤后自动打开对应应收台账。
  - 应收收款记录历史现在可回显收款方式、收款时间、收款账号，便于后续核对。
  - 来源定位现已收口为单锚点：`sourceRefId = 订单 ID`，不再携带订单号兜底参数。

- **验证结果**
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - `pnpm exec eslint src/features/trading/contracts/shared/ledger-contract-schema.ts src/features/trading/contracts/settlement-record-api-dto.ts src/features/trading/services/settlement-record-payload.ts src/features/trading/hooks/use-settlement-record-dialog-state.ts src/features/trading/hooks/use-settlement-ledger-detail-dialog-view-model.ts src/features/trading/components/settlement-record-form-section.tsx src/features/trading/components/settlement-records-table-section.tsx src/features/trading/components/settlement-ledger-detail-dialog.tsx src/features/trading/receivables/services/receivables-query-service.ts src/features/trading/receivables/hooks/use-receivables.ts src/features/trading/receivables/tabs/sales-receivables-tab.tsx src/features/trading/receivables/components/sales-receivable-detail-dialog.tsx src/features/trading/receivables/config/sales-receivable-detail-dialog.config.ts src/features/trading/receivables/utils/receivable-route-search.ts src/features/trading/payables/components/purchase-payable-detail-dialog.tsx src/features/trading/payables/config/purchase-payable-detail-dialog.config.ts src/features/trading/components/parts/sales-order-detail-summary.tsx src/routes/_authenticated/trading/receivables.tsx`：通过。
  - `pnpm exec vitest run src/features/trading/contracts/settlement-record-api-dto.test.ts src/features/trading/services/settlement-record-payload.test.ts src/features/trading/receivables/contracts/receivable-api-dto.test.ts src/features/trading/receivables/services/receivable-ledger-detail-service.test.ts src/features/trading/receivables/services/receivables-query-service.test.ts`：通过（`23` 个测试）。
  - `go test ./handlers -run 'Test(GetReceivableLedgersHandler|CreateReceiptRecordHandler)' -count=1`：通过。
  - `go test ./handlers -count=1`：未全量通过；失败项来自同目录既有其它处理器测试，不是本次应收收款登记改动直接引入的定向失败。

## 2026-04-20 应收事实源重构：订单即应收

- **变更概述**
  - 新增 `server/services/sales_order_receivable_service.go`，把 `/receivables` 列表、搜索、详情、收款创建改为直接基于 `sales_orders` 聚合应收视图。
  - 调整 `server/models/ar_ap_ledger.go`，为 `receipt_records`、`settlement_allocations` 增加 `sales_order_id`，让新收款与新分摊直接归属订单主体，并删除 `ReceivableLedger` 旧模型。
  - 删除 `server/services/ar_ap_query_service.go` 中旧应收台账 helper、`server/db/db.go` 中旧表自动迁移，以及 `server/handlers/query_params.go` / `ar_ap_handlers.go` 里的 `sourceDocumentNo` 兼容入口。
  - 更新 `server/handlers/ar_ap_handlers_test.go` 测试夹具，使应收测试数据只依赖销售订单主链，不再维护 `receivable_ledgers` 测试数据。
  - 更新前端 receivables 路由、查询参数、缓存键与详情弹窗状态命名，只保留订单主键链路。

- **收口结果**
  - 应收页不再依赖 `receivable_ledgers` 作为主真相，现有销售订单可直接进入应收列表。
  - 应收详情、收款登记、列表刷新与订单详情跳转现在都只接受订单聚合 ID。
  - 系统内已不再保留 `receivable_ledgers` 主链依赖、`ledger_id` fallback 映射和 `sourceDocumentNo` 兜底过滤。
  - 测试夹具和自动迁移已切到订单主链，旧台账结构不会再被新代码继续创建或消费。

- **验证结果**
  - `go test ./handlers -run "Receivable|Payable"`：通过。
  - `pnpm exec vitest run src/features/trading/receivables/services/receivables-query-service.test.ts src/features/trading/receivables/services/receivable-ledger-detail-service.test.ts`：通过（`8` 个测试）。
  - 全局搜索确认：业务代码内已无 `receivable_ledgers`、`SourceDocumentNo`、`sourceDocumentNo` 的主链依赖，仅文档历史记录保留更新说明。

## 2026-04-20 应收详情弹窗第一批结构拆分

- **变更概述**
  - 将 `src/features/trading/hooks/use-settlement-ledger-detail-dialog-view-model.ts` 收口为编排层，拆出 `use-settlement-ledger-search.ts`、`use-settlement-allocation-history.ts`、`use-settlement-summary-items.ts`、`use-settlement-submit.ts` 四个职责单一的 hooks，分别承接台账搜索、历史派生、摘要派生与提交编排。
  - 将 `src/features/trading/components/settlement-ledger-detail-dialog.tsx` 收口为薄容器，新增 `settlement-ledger-detail-dialog-body.tsx`、`settlement-ledger-detail-dialog-footer.tsx`、`settlement-ledger-search-dialog-container.tsx`，把主体布局、底部按钮区与搜索弹窗映射拆开。
  - 本轮仅做结构治理，不改动对外 props、view-model 返回契约、收款登记业务语义与交互流程。

- **收口结果**
  - 详情弹窗主组件不再内嵌大段表单编排、历史渲染与搜索映射逻辑，后续扩展子区域时可按文件独立演进。
  - ViewModel 内部的搜索、历史、汇总、提交逻辑已拆成独立 hooks，后续新增筛选项、摘要项或提交流程时无需继续堆叠在单文件中。
  - 本次拆分保持现有对外契约不变，仍沿用原有 `SettlementLedgerDetailDialog` 与 `useSettlementLedgerDetailDialogViewModel` 的调用方式。

- **验证结果**
  - `pnpm exec eslint src/features/trading/hooks/use-settlement-ledger-detail-dialog-view-model.ts src/features/trading/hooks/use-settlement-ledger-search.ts src/features/trading/hooks/use-settlement-allocation-history.ts src/features/trading/hooks/use-settlement-summary-items.ts src/features/trading/hooks/use-settlement-submit.ts src/features/trading/components/settlement-ledger-detail-dialog.tsx src/features/trading/components/settlement-ledger-detail-dialog-body.tsx src/features/trading/components/settlement-ledger-detail-dialog-footer.tsx src/features/trading/components/settlement-ledger-search-dialog-container.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 应收详情弹窗 view-model / 容器层前端测试补强

- **变更概述**
  - 扩展 `src/features/trading/hooks/use-settlement-ledger-detail-dialog-view-model.test.tsx`，在保留原有派生结果与提交行为测试的基础上，新增对 `useSettlementRecordDialogState`、`useSettlementLedgerSearch`、`useSettlementSummaryItems`、`useSettlementAllocationHistory`、`useSettlementSubmit` 五个拆分 hooks 的编排委派断言。
  - 扩展 `src/features/trading/components/settlement-ledger-detail-dialog.test.tsx`，将 mock 边界切换到 `settlement-ledger-detail-dialog-body.tsx`、`settlement-ledger-detail-dialog-footer.tsx`、`settlement-ledger-search-dialog-container.tsx` 三个薄层子组件，验证容器只负责 props 透传与开关连线。
  - 本轮不新增子组件独立测试文件，不回退去绑定更深层 section 实现，仅为后续继续拆分提供当前结构边界的稳定回归保护。

- **收口结果**
  - `view-model` 测试现已覆盖“本地状态 -> 子 hook 入参 -> 最终返回结果”的关键编排链路，能及时发现后续拆分时的参数拼装漂移。
  - 详情弹窗容器测试现已覆盖 `showDetailedFields`、`allocationHistoryCount`、`actionLabel`、`ledgerKindLabel / partnerLabel / amountLabel` 以及 `Dialog.onOpenChange` 到 `vm.handleOpenChange` 的透传关系。
  - 前端测试边界已和当前拆分后的文件结构对齐，后续继续拆 body / footer / search 映射时，可优先保持这层 contract 稳定。

- **验证结果**
  - `pnpm exec vitest run src/features/trading/hooks/use-settlement-ledger-detail-dialog-view-model.test.tsx src/features/trading/components/settlement-ledger-detail-dialog.test.tsx`：通过（`6` 个测试）。
  - `pnpm exec eslint src/features/trading/hooks/use-settlement-ledger-detail-dialog-view-model.test.tsx src/features/trading/components/settlement-ledger-detail-dialog.test.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 第二批结构拆分起步：应收页 `sales-receivables-tab.tsx`

- **变更概述**
  - 将 `src/features/trading/receivables/tabs/sales-receivables-tab.tsx` 收口为页面容器，仅保留路由查询读取、应收列表取数、props 拼装与详情弹窗挂载。
  - 新增 `src/features/trading/receivables/components/sales-receivables-summary-cards.tsx`，承接应收汇总三张统计卡片渲染。
  - 新增 `src/features/trading/receivables/components/sales-receivables-table-card.tsx`，承接应收列表表格卡片、列头与点击行打开详情的 UI 映射。
  - 新增 `src/features/trading/receivables/hooks/use-sales-receivables-page-state.ts`，收口 `selectedReceivableId / dismissedAutoOpenKey / autoOpenReceivableId / activeReceivableId` 及详情弹窗关闭后的状态回收逻辑。
  - 新增 `src/features/trading/receivables/hooks/use-sales-receivables-page-state.test.tsx`，为自动打开与关闭回收逻辑补充轻量 hook 测试。

- **收口结果**
  - 应收页 tab 文件不再同时承载页面壳、摘要卡片、表格区和自动打开状态的全部实现，后续扩展筛选栏、批量动作或更多统计卡片时可按文件继续演进。
  - 自动打开详情、手动选择详情、关闭后抑制同一 `autoOpenKey` 重复自动打开的行为已从页面组件中抽离，页面主文件职责更聚焦。
  - 本轮未改动应收页现有业务语义、路由参数、取数方式与详情弹窗契约，仍保持点击行打开详情与来源过滤自动定位逻辑不变。

- **验证结果**
  - `pnpm exec vitest run src/features/trading/receivables/hooks/use-sales-receivables-page-state.test.tsx`：通过（`3` 个测试）。
  - `pnpm exec eslint src/features/trading/receivables/tabs/sales-receivables-tab.tsx src/features/trading/receivables/components/sales-receivables-summary-cards.tsx src/features/trading/receivables/components/sales-receivables-table-card.tsx src/features/trading/receivables/hooks/use-sales-receivables-page-state.ts src/features/trading/receivables/hooks/use-sales-receivables-page-state.test.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 第二批结构拆分继续：应收 query keys 独立

- **变更概述**
  - 新增 `src/features/trading/receivables/query-keys.ts`，将应收链路使用的 `receivableDetail / receivableList / receivableSearch / receivables` 四个 query key builders 收口到 receivables 本地模块。
  - 调整 `src/features/trading/receivables/hooks/use-receivables.ts`，改为从本地 `receivableQueryKeys` 获取列表与搜索 query key。
  - 调整 `src/features/trading/receivables/hooks/use-receivable-ledger-detail.ts`，改为从本地 `receivableQueryKeys` 获取详情 query key，并维持 receipt 创建后的 `invalidateQueries` 行为不变。
  - 调整 `src/features/trading/query-keys.ts`，删除应收相关 key，仅保留其它 trading 域的全局 query keys。

- **收口结果**
  - 应收前端缓存键不再继续混放在全局 `tradingQueryKeys` 中，receivables 目录内部的 hook 与缓存契约边界更清晰。
  - 本轮保持 query key tuple 结构不变，没有改动 `receivables` 根 key、详情 key 或列表/搜索 key 的值语义，因此现有缓存命中与失效语义保持不变。
  - 全局搜索确认：`src` 内已无 `tradingQueryKeys.receivable*` 残留调用点，应收 query keys 已收口到单一入口。

- **验证结果**
  - 全局搜索 `tradingQueryKeys.receivable`：无残留结果。
  - `pnpm exec eslint src/features/trading/query-keys.ts src/features/trading/receivables/query-keys.ts src/features/trading/receivables/hooks/use-receivables.ts src/features/trading/receivables/hooks/use-receivable-ledger-detail.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 第二批后端入口拆分：`server/handlers/ar_ap_handlers.go`

- **变更概述**
  - 将 `server/handlers/ar_ap_handlers.go` 收薄为稳定导出层，仅保留既有导出 handler 名称，并转调新拆出的实现函数。
  - 新增 `server/handlers/ar_ap_receivable_handlers.go`，承接应收列表、搜索、详情与收款登记 handler。
  - 新增 `server/handlers/ar_ap_payable_handlers.go`，承接应付列表、搜索、详情与付款登记 handler。
  - 新增 `server/handlers/ar_ap_settlement_helpers.go`，收口收款/付款请求绑定与错误映射 helper，避免两侧 `switch` 分支继续平行膨胀。

- **收口结果**
  - 路由文件 `server/routes/routes_ar_ap.go` 仍继续引用原导出函数名，无需修改注册路径或注册写法。
  - `ar_ap_handlers.go` 不再承载全部 AR/AP 入口实现，后续继续扩展应收/应付或结算动作时可以按职责文件演进。
  - 本轮未改动状态码、中文错误文案、服务层调用参数与响应契约，只做 handler 文件级重组。

- **验证结果**
  - `go test ./handlers -run ^$ -count=1`：通过，确认 handlers 包拆分后可正常编译。
  - `go test ./routes -run ^$ -count=1`：通过，确认 routes 仍能引用原导出 handler 名称。
  - `go test ./handlers -run 'GetReceivable|GetPayable|SearchReceivable|SearchPayable|CreateReceiptRecord|CreatePaymentRecordHandlerRejectsSettledLedgerAllocation' -count=1`：通过，确认本轮拆分覆盖到的主要应收/应付列表、搜索、详情与关键结算错误分支未漂移。
  - `go test ./handlers -run "Receivable|Payable|Receipt|Payment" -count=1`：未全量通过；失败项为既有 `TestCreatePaymentRecordHandlerReturnsLockedCreateResponseContract`，当前断言不接受 `receivedAt / receiptAccount` 字段，但实际返回 payload 含这两个字段。由于本轮仅做 handler 结构搬运且未改动支付创建业务实现，先记录为与本次结构拆分正交的既有契约问题，未在本轮扩散修复。

## 2026-04-21 既有测试契约收口：修 `TestCreatePaymentRecordHandlerReturnsLockedCreateResponseContract`

- **变更概述**
  - 调整 `server/handlers/ar_ap_handlers_test.go`，将原先同时服务收款/付款创建返回断言的 `requireSettlementRecordJSONContract` 拆为更明确的两类契约断言：收款记录断言与付款记录断言。
  - 收款创建返回测试继续校验 `receivedAt / receiptAccount`，与 `ReceiptRecordResponse` 对齐。
  - 付款创建返回测试改为只校验 `PaymentRecordResponse` 的真实字段集合，不再错误要求收款专属字段。

- **收口结果**
  - 当前失败根因已确认并收口在测试层：共享 helper 之前使用“超集字段”断言，错误地把收款字段施加到了付款记录契约上。
  - 本轮未改动 `PaymentRecordResponse`、`CreatePaymentRecordHandler` 返回 payload 或任何收款/付款业务实现，只修测试契约，使测试与真实 DTO 一致。
  - 收款契约断言与付款契约断言现已分离，后续任一侧字段继续演进时，不会再轻易误伤另一侧。

- **验证结果**
  - `go test ./handlers -run "CreateReceiptRecordHandlerReturnsLockedCreateResponseContract|CreatePaymentRecordHandlerReturnsLockedCreateResponseContract" -count=1`：通过。
  - `go test ./handlers -run "Receipt|Payment" -count=1`：通过。

## 2026-04-21 修复 authz 权限目录构建错误：`action-permission-catalog.ts`

- **变更概述**
  - 修复 `src/features/authz/data/action-permission-catalog.ts` 中同文件内多处受损的 `label / desc / routeBindings` 文本，清理因编码污染产生的替代字符与未闭合字符串。
  - 保持所有权限 `id`、`category`、`parentId`、数组结构与路由绑定结构不变，仅恢复受损中文文案与 `user_view` 的路由备注说明。
  - 本轮修复范围严格限制在该单文件内，没有扩散到其它 authz 目录文件做批量清洗。

- **收口结果**
  - `action-permission-catalog.ts` 已恢复可被 TS / SWC 正常解析，不再因 `Unterminated string constant` 阻塞前端构建。
  - `system / warehouse / trading / equipment / approval` 几组中已定位到的乱码条目已在同一文件内一并收口，避免修完第一处后又被下一处同类损坏继续卡住。
  - 权限目录的结构语义未变，仍保持原有权限 ID、父级关系与 route binding 结构。

- **验证结果**
  - 全局搜索确认：`action-permission-catalog.ts` 中替代字符 `�`：未再发现残留受损行。
  - `pnpm exec eslint src/features/authz/data/action-permission-catalog.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 排查其它高风险目录中的同类文本污染

- **排查范围**
  - 按确认顺序完成只读巡检：`src/features/trading` → `src/features/scan-platform` → `src/features/org-personnel`。
  - 由于前三个目录未发现业务源码中的新增污染，再补查 `src/data/seed` 作为兜底范围。

- **排查方法**
  - 对目标目录中的 `.ts / .tsx / .js / .jsx / .json / .md` 文件执行严格 UTF-8 解码检查。
  - 扫描替代字符 `�`，识别已发生文本损坏的文件。
  - 扫描常见 mojibake 片段，例如 `鏈€ / 鍙拌处 / 鎼滅储 / 甯佺 / 鐘舵€ / 纭 / 閫夋嫨 / 姝ｅ湪 / 璇疯緭鍏 / 鏈寚瀹 / 闄嶅簭 / 鍗囧簭 / 锟`。
  - 对 `trading` 目录额外参考现有 `copy-encoding-guard.test.ts` 与 `copy-encoding-checklist.md` 中已有的护栏 token，避免与既有口径不一致。

- **排查结果**
  - `src/features/trading`
    - 共扫描 254 个文件，`invalidUtf8=0`。
    - 命中的 2 个文件均为护栏文件：`copy-encoding-guard.test.ts` 与 `copy-encoding-checklist.md`，它们包含可疑 token 属于预期测试/清单内容，不是业务源码污染。
    - 结论：未发现新的业务文件编码污染。
  - `src/features/scan-platform`
    - 共扫描 41 个文件，`invalidUtf8=0`、`replacement=0`、`suspicious=0`。
    - 结论：未发现同类文本污染。
  - `src/features/org-personnel`
    - 共扫描 53 个文件，`invalidUtf8=0`、`replacement=0`、`suspicious=0`。
    - 结论：未发现同类文本污染。
  - `src/data/seed`
    - 共扫描 7 个文件，`invalidUtf8=0`、`replacement=0`、`suspicious=0`。
    - 结论：未发现同类文本污染。

- **收口结论**
  - 当前前端高风险目录中，除已修复的 `src/features/authz/data/action-permission-catalog.ts` 外，未继续发现新的同类编码污染文件。
  - `trading` 目录中命中的可疑 token 仅存在于护栏测试和巡检清单本身，符合预期，无需作为业务污染处理。

## 2026-04-21 收窄快捷扫描侧边栏卡片内容

- **变更概述**
  - 调整 `src/features/quick-actions/components/quick-action-drawer.tsx` 中的快捷扫描卡片渲染，移除每个快捷动作卡片标题下方的简短描述文本。
  - 保留卡片标题、图标、箭头、安装按钮、点击跳转/拍照/录像行为，以及抽屉头部说明文案不变。
  - 本轮按最小变更处理，没有改 `quick-action-registry` 中的 `descriptionKey`，也没有清理多语言文案字段。

- **收口结果**
  - 快捷扫描侧边栏卡片由“标题 + 描述”收窄为仅展示标题，降低移动端抽屉被少量卡片占满的情况。
  - 权限过滤、卡片排序、安装入口、扫码触发和跳转逻辑未发生变化。

 - **验证结果**
   - `pnpm exec eslint src/features/quick-actions/components/quick-action-drawer.tsx`：通过。
   - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 一维码协议拆分“孔型前缀 + 孔数”并兼容旧配置

- **变更概述**
  - 将一维码协议中的原单段 `孔型孔数` 拆分为两个独立段位：`孔型前缀` 1 位、`孔数` 2 位；最终编码仍连续输出 3 位，不改变整串长度。
  - 更新 `src/features/basic-settings/data/linear-barcode-rules-config.ts`，将原 `holes` 三位段拆为 `holePrefix(09)` 与 `holes(10-11)` 两段，并同步默认示例与字段说明。
  - 更新一维码页面中文/英文文案，使页面标题副文案、规则表描述、仿真副标题和实施说明统一改为 `孔型前缀 + 孔数` 表达。

- **旧配置兼容与归一化**
  - 在 `src/features/basic-settings/data/linear-barcode-protocol.ts` 中新增规则归一化工具：
    - 识别旧版 `09-11` 三位 `holes` 规则；
    - 自动补齐缺失的 `holePrefix`；
    - 将旧结构统一映射回新的默认段位定义。
  - 在 `src/features/basic-settings/services/linear-barcode-protocol-service.ts` 中接入归一化判定：
    - 读取协议时若发现仍是旧结构，会先转换为新结构；
    - 随后自动持久化回写，确保历史已保存配置真正升级，而不是仅在当前前端会话中临时兼容。
  - 同步保证协议保存接口始终以归一化后的新结构提交，避免再次写回旧格式。

- **涉及文件**
  - `src/features/basic-settings/data/linear-barcode-rules-config.ts`
  - `src/features/basic-settings/data/linear-barcode-protocol.ts`
  - `src/features/basic-settings/services/linear-barcode-protocol-service.ts`
  - `src/locales/overrides/basic-settings.zh-CN.ts`
  - `src/locales/messages/en-US/basicSettings.ts`

- **收口结果**
  - 一维码协议层已完成 `孔型前缀 1 位 + 孔数 2 位` 拆分，后续共享编码源页面可在此基础上继续做更细粒度的数据治理，而不会再被旧的三位组合字段绑定。
  - 历史协议配置在首次读取时即可被识别并自动升级为新结构，降低后续规则编辑、仿真展示和持久化时的错配风险。
  - 本轮未扩展到共享编码源页面的拆 tab 或更复杂组合约束，仍保持在你确认的“仅先处理协议层拆分”范围内。

- **验证结果**
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - `pnpm exec eslint src/features/basic-settings/data/linear-barcode-rules-config.ts src/features/basic-settings/data/linear-barcode-protocol.ts src/features/basic-settings/services/linear-barcode-protocol-service.ts src/locales/overrides/basic-settings.zh-CN.ts src/locales/messages/en-US/basicSettings.ts`：通过。

## 2026-04-22 `编码中心 > 共享编码源 > 孔型孔数`

- **变更概述**
  - 新增 `编码中心 > 共享编码源` 入口，并在该模块下先落地 `孔型孔数` TAB。
  - 本轮只处理 `孔型孔数` 页面与一维码读取接入，按边界保持其它现有入口、外观能力和已有页面不动。

- **前端落地内容**
  - 新增 `共享编码源` 路由层：
    - `/code-center/shared-code-source`
    - `/code-center/shared-code-source/hole-codes`
  - 新增 `共享编码源` 模块布局与 TAB 定义。
  - 侧边栏 `编码中心` 下新增 `共享编码源` 菜单项。
  - 新增孔型孔数数据层：
    - `src/features/code-center/data/hole-code-source.ts`
    - `src/features/code-center/services/hole-code-source-service.ts`
    - `src/features/code-center/hooks/use-hole-code-source.ts`
  - `孔型孔数` 页面支持：
    - 默认种子数据初始化
    - 新增 / 编辑 / 删除
    - 启用状态控制
    - 排序与描述维护
  - 数据当前先使用前端 `StorageService` 持久化，作为共享编码源首版承接点。

- **一维码接入内容**
  - `LinearBarcodeMgmt` 已读取 `共享编码源 > 孔型孔数` 的活动数据，并传入仿真区与解析器。
  - `linear-barcode-simulation-section.tsx` 中原本硬编码的：
    - `holePrefix` 前缀按钮来源
    - `holes` 孔数下拉来源
    已切换为读取共享孔型孔数数据源。
  - `linear-barcode-parser.ts` 中孔型孔数展示不再依赖固定 `R/D` 文案映射，而是优先读取共享组合标签映射。
  - 一维码页面中的“业务编号”按钮已改为跳转到 `编码中心 > 一维码 > 业务编号`，不再依赖旧的 `basic-settings` 路径。

- **涉及文件**
  - `src/components/layout/data/sidebar-data.ts`
  - `src/features/code-center/tabs.ts`
  - `src/features/code-center/shared-code-source-layout.tsx`
  - `src/features/code-center/shared-hole-code-source-mgmt.tsx`
  - `src/features/code-center/data/hole-code-source.ts`
  - `src/features/code-center/services/hole-code-source-service.ts`
  - `src/features/code-center/hooks/use-hole-code-source.ts`
  - `src/routes/_authenticated/code-center/shared-code-source/route.tsx`
  - `src/routes/_authenticated/code-center/shared-code-source/index.tsx`
  - `src/routes/_authenticated/code-center/shared-code-source/hole-codes.tsx`
  - `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
  - `src/features/basic-settings/components/linear-barcode-simulation-section.tsx`
  - `src/features/basic-settings/utils/linear-barcode-parser.ts`
  - `src/locales/messages/zh-CN/codeCenter.ts`
  - `src/locales/messages/en-US/codeCenter.ts`
  - `src/locales/messages/zh-CN/sidebar.ts`
  - `src/locales/messages/en-US/sidebar.ts`

- **收口结果**
  - `共享编码源` 已具备独立入口和首个可用 TAB。
  - `孔型孔数` 已从一维码页面内的本地硬编码选项，升级为可维护的共享编码来源。
  - 其它现有能力（尤其 `外观`）未迁移、未改归属，保持当前边界不变。

- **验证结果**
  - `pnpm run gen:route-tree`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - `pnpm exec eslint src/features/code-center/data/hole-code-source.ts src/features/code-center/services/hole-code-source-service.ts src/features/code-center/hooks/use-hole-code-source.ts src/features/code-center/shared-code-source-layout.tsx src/features/code-center/shared-hole-code-source-mgmt.tsx src/features/code-center/tabs.ts src/features/basic-settings/tabs/linear-barcode-mgmt.tsx src/features/basic-settings/utils/linear-barcode-parser.ts src/features/basic-settings/components/linear-barcode-simulation-section.tsx src/components/layout/data/sidebar-data.ts src/locales/messages/zh-CN/codeCenter.ts src/locales/messages/en-US/codeCenter.ts src/locales/messages/zh-CN/sidebar.ts src/locales/messages/en-US/sidebar.ts src/routes/_authenticated/code-center/shared-code-source/route.tsx src/routes/_authenticated/code-center/shared-code-source/index.tsx src/routes/_authenticated/code-center/shared-code-source/hole-codes.tsx`：通过。

## 2026-04-22 `编码中心 > 共享编码源 > 孔型前缀 / 孔数` 拆分维护

- **变更概述**
  - 将原先 `共享编码源 > 孔型孔数` 的组合维护方式，重构为 `孔型前缀` 与 `孔数` 两个独立维护区块。
  - 保持一维码最终输出仍然是连续的 `1 位孔型前缀 + 2 位孔数` 三位段，不改变协议长度，只调整共享编码源的数据治理方式。
  - 本轮继续保持边界在共享编码源与一维码消费侧，不扩展到其它编码源页面或更复杂的组合约束。

- **数据结构与迁移**
  - `src/features/code-center/data/hole-code-source.ts`
    - 将共享源主结构从“组合项数组”改为 `prefixes + counts` 双集合结构。
    - 新增前缀项、孔数项、草稿类型及对应的活动项 / 标签映射 / 组合标签映射派生函数。
  - `src/features/code-center/services/hole-code-source-service.ts`
    - 重构为独立提供 `saveHoleCodePrefix` / `saveHoleCodeCount` / `deleteHoleCodePrefix` / `deleteHoleCodeCount`。
    - 读取本地存储时兼容旧版组合数组结构；若识别到旧数据，会自动迁移为新结构并持久化回写。
  - `src/features/code-center/hooks/use-hole-code-source.ts`
    - 查询结果改为返回双集合 bundle。
    - 对外提供活动前缀、活动孔数、孔型前缀选项、孔数组合标签映射等派生结果，供页面与一维码消费侧统一使用。

- **页面与文案落地**
  - `src/features/code-center/shared-hole-code-source-mgmt.tsx`
    - 页面主体重构为左右两个独立维护卡片：`孔型前缀` 与 `孔数`。
    - 两侧各自支持新增 / 编辑 / 删除 / 启停 / 排序 / 描述维护。
    - 弹窗表单也拆为两个独立弹窗，避免在单个表单中同时维护前缀和孔数导致组合膨胀。
  - `src/locales/messages/zh-CN/codeCenter.ts`
  - `src/locales/messages/en-US/codeCenter.ts`
    - 补齐双区块标题、空状态、独立弹窗标题、独立保存/删除提示文案。

- **一维码消费侧调整**
  - `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
    - 一维码管理页改为分别读取活动 `holePrefixSources` 与 `holeCountSources`。
    - 继续通过组合标签映射供解析器展示使用。
  - `src/features/basic-settings/components/linear-barcode-simulation-section.tsx`
    - 仿真区的孔型前缀按钮改为读取共享前缀列表。
    - 仿真区的孔数下拉改为读取共享孔数列表，不再依赖组合项筛选。
  - `src/features/basic-settings/data/linear-barcode-protocol.ts`
    - 将 `mockInput.holePrefix` 类型放宽为字符串，适配共享前缀源的独立维护结果。

- **收口结果**
  - 共享编码源页不再需要维护 `R14 / D18 / ...` 这类组合条目，数据维护粒度与协议结构对齐。
  - 老数据首次读取时会自动迁移到新结构，减少历史本地配置导致的页面异常。
  - 一维码仿真、解析展示与共享源页面已统一基于拆分后的 `孔型前缀 + 孔数` 模型工作。

- **验证结果**
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - `pnpm exec eslint src/features/code-center/data/hole-code-source.ts src/features/code-center/services/hole-code-source-service.ts src/features/code-center/hooks/use-hole-code-source.ts src/features/code-center/shared-hole-code-source-mgmt.tsx src/features/basic-settings/components/linear-barcode-simulation-section.tsx src/features/basic-settings/tabs/linear-barcode-mgmt.tsx src/locales/messages/zh-CN/codeCenter.ts src/locales/messages/en-US/codeCenter.ts`：通过。

## 2026-04-22 `共享编码源 > 孔型前缀 / 孔数` 取消旧版兼容

- **变更概述**
  - 根据最新边界，系统尚未发布，因此不再保留 `共享编码源` 的旧组合结构兼容逻辑。
  - 当前 `prefixes + counts` 双集合结构作为唯一合法存储结构。

- **本轮清理内容**
  - `src/features/code-center/data/hole-code-source.ts`
    - 删除仅用于旧组合结构兼容的遗留类型定义。
  - `src/features/code-center/services/hole-code-source-service.ts`
    - 删除旧结构识别、迁移、归一化、回写逻辑。
    - 读取共享编码源时仅接受当前 bundle 结构；否则直接初始化默认数据。

- **收口结果**
  - 共享编码源数据层复杂度进一步降低，不再为未发布阶段的旧测试数据承担兼容成本。
  - 若本地仍残留旧测试数据，将不会被自动识别；需要按新结构重新生成默认数据或重新维护。

- **验证结果**
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - `pnpm exec eslint src/features/code-center/data/hole-code-source.ts src/features/code-center/services/hole-code-source-service.ts`：通过。

## 2026-04-22 `共享编码源 > 孔型前缀 / 孔数` 页面高度优化

- **变更概述**
  - 优化 `共享编码源 > 孔型前缀 / 孔数` 页面布局，让双卡片尽量占满主内容区高度。
  - 当卡片内容增长时，优先在卡片内部滚动，减少整页反复下翻。

- **本轮调整内容**
  - `src/features/code-center/shared-hole-code-source-mgmt.tsx`
    - 页面根容器增加最小高度约束，使内容区尽量吃满当前可视主区域。
    - 双卡片容器改为可拉伸布局，桌面端左右卡片尽量等高。
    - 两张卡片均改为 `头部固定区 + 内容滚动区` 结构。
    - 列表非空时在卡片内部滚动；空状态与加载态也按卡片高度居中铺满显示。

- **收口结果**
  - 当前只有两张卡片时，页面纵向空白利用率更高，不必靠自然内容高度撑开页面。
  - 后续即使卡片内容继续增多，也会优先消耗卡片内部滚动空间，而不是先让整页变得很长。
  - 移动端仍保持自然堆叠，重点优化桌面主工作区浏览体验。

- **验证结果**
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - `pnpm exec eslint src/features/code-center/shared-hole-code-source-mgmt.tsx`：通过。

## 2026-04-22 `共享编码源 > 孔型前缀 / 孔数` 紧凑高密度布局

- **变更概述**
  - 将前一版的“大详情卡片”项展示压缩为紧凑高密度列表行。
  - 目标是让 `R / D / 14 / 16 / 18` 这类简单数据按合理密度展示，而不是一项占据整块大卡片空间。

- **本轮调整内容**
  - `src/features/code-center/shared-hole-code-source-mgmt.tsx`
    - 前缀项、孔数项统一改为紧凑行式结构。
    - 单项优先展示：编码 / 标签 / 排序 / 状态 / 操作。
    - 删除原先每项底部三块字段卡片式信息区，减少重复视觉容器与大面积留白。
    - 说明字段为空时不再额外占用明显垂直空间。

- **收口结果**
  - 同屏可见条目数明显提升，孔数列表不再出现“两个简单项就吃掉整页”的问题。
  - 页面仍保留顶部统计、创建按钮、编辑/删除能力，但项级信息密度更接近实际业务数据形态。
  - 卡片内部滚动策略仍保留，后续数量继续增长时也更可控。

- **验证结果**
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - `pnpm exec eslint src/features/code-center/shared-hole-code-source-mgmt.tsx`：通过。

## 2026-04-22 `共享编码源 > 孔型前缀 / 孔数` 排序自动化

- **变更概述**
  - 移除孔型前缀、孔数弹窗中的 `排序` 手工输入。
  - 排序改为由系统自动分配，编辑时保持原顺序，避免用户承担内部排序规则的认知负担。

- **本轮调整内容**
  - `src/features/code-center/services/hole-code-source-service.ts`
    - 新增项保存时自动计算当前同类集合的下一个 `sortOrder`。
    - 编辑已有项时保留原有 `sortOrder`，不因普通字段编辑而改序。
  - `src/features/code-center/shared-hole-code-source-mgmt.tsx`
    - 移除前缀弹窗、孔数弹窗中的排序输入框。
    - 创建流程不再显式预填排序值，由 service 统一处理。
    - 弹窗只保留业务字段与启用开关，减少无关输入项。

- **收口结果**
  - 新增或编辑孔型前缀、孔数时，用户不再需要理解“排序”这一内部控制字段。
  - 列表顺序仍保持稳定，且新增项会自动追加到当前同类列表尾部。

- **验证结果**
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - `pnpm exec eslint src/features/code-center/services/hole-code-source-service.ts src/features/code-center/shared-hole-code-source-mgmt.tsx`：通过。

## 2026-04-21 将原材料管理升格为资源管理下的一级菜单模块

- **变更概述**
  - 复用现有独立模块 `/materials`，将其从原先的仓储分组入口迁移到“资源管理”分组下，作为与“采购管理”同级的一级菜单入口。
  - 本轮不新造第二套材料模块，继续沿用现有独立路由、独立模块壳和独立 tabs 结构。
  - 保持 `/materials` 现有 tabs 机制不变，继续承载“全部 / 拼装规则 / 动态分类”结构。

- **入口与文案收口**
  - 侧边栏：将 `materials` 从“仓储”分组迁出，放入“资源管理”分组。
  - 静态侧边栏数据与国际化侧边栏配置同步收口为“原材料管理”。
  - 命令搜索：将 `/materials` 导航项和新增物料动作的归属改到“资源管理”，并调整关键词与拼音。
  - 页面头部：将 `materialArchive.layout.title` / `description` 收口为“原材料管理”语义。

- **收口结果**
  - 原材料模块现在在信息架构上与采购管理同域显示，入口更直观。
  - 现有 `/materials` 继续作为独立模块存在，没有产生第二套重复文件夹或重复路由。
  - 仓储分组不再同时承载原材料入口，避免同一模块出现在错误业务分组中。

- **验证结果**
  - `pnpm exec eslint src/components/layout/data/sidebar-data.ts src/components/layout/data/search-data.ts src/locales/messages/zh-CN/sidebar.ts src/locales/messages/en-US/sidebar.ts src/locales/messages/zh-CN/commandMenu.ts src/locales/messages/en-US/commandMenu.ts src/locales/messages/zh-CN/materialArchive.ts src/locales/messages/en-US/materialArchive.ts src/routes/_authenticated/materials/route.tsx`：通过（仅 `src/routes/_authenticated/materials/route.tsx` 存在既有 `react-refresh/only-export-components` warning，无新增 error）。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 阶段一：恢复 `/materials` 为仓储下的原始物料管理入口

- **变更概述**
  - 暂停新增 `raw-materials` 模块，优先把前一轮误改恢复回原始状态。
  - 将现有 `/materials` 入口从“资源管理”分组迁回“仓储”分组。
  - 恢复 `/materials` 相关用户可见文案为原始“物料档案 / 物料资源中心 / 物料主数据档案”语义。

- **收口结果**
  - 当前 `物料管理` 已恢复到仓储分组下显示，路径仍为 `/materials`。
  - 资源管理分组下不再错误地把 `/materials` 当作“原材料管理”入口。
  - `/materials` 的命令搜索归属、关键词和页面头部标题已恢复到原始语义。

- **验证结果**
  - `pnpm exec eslint src/components/layout/data/sidebar-data.ts src/components/layout/data/search-data.ts src/locales/messages/zh-CN/sidebar.ts src/locales/messages/en-US/sidebar.ts src/locales/messages/zh-CN/commandMenu.ts src/locales/messages/en-US/commandMenu.ts src/locales/messages/zh-CN/materialArchive.ts src/locales/messages/en-US/materialArchive.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 阶段二：新增独立 `/raw-materials` 原材料管理模块

- **变更概述**
  - 在保留仓储下 `/materials` 物料管理不变的前提下，新增独立 `/raw-materials` 模块。
  - 新模块采用独立目录 `src/features/raw-materials`、独立路由根、独立模块壳与独立 tabs。
  - 当前首个 tab 为 `catalog`，页面承载原材料档案视图，内部先复用现有 `MaterialMgmt` 组件并限定 `RAW_MATERIAL` 分类。

- **新增文件**
  - `src/features/raw-materials/index.tsx`
  - `src/features/raw-materials/tabs.ts`
  - `src/features/raw-materials/pages/raw-materials-catalog-page.tsx`
  - `src/routes/_authenticated/raw-materials.tsx`
  - `src/routes/_authenticated/raw-materials.lazy.tsx`
  - `src/routes/_authenticated/raw-materials/index.tsx`
  - `src/routes/_authenticated/raw-materials/catalog.tsx`
  - `src/routes/_authenticated/raw-materials/catalog.lazy.tsx`
  - `src/locales/messages/zh-CN/rawMaterials.ts`
  - `src/locales/messages/en-US/rawMaterials.ts`

- **系统接入**
  - 侧边栏：在“资源管理”分组下新增“原材料管理”入口，路径为 `/raw-materials`。
  - 命令搜索：新增 `/raw-materials` 模块入口，归属“资源管理”。
  - 多语言：新增 `rawMaterials` 中英文文案并注册到消息聚合。
  - 权限映射：为 `/raw-materials` 增加顶层路径映射，当前先复用现有 `menu_trading` 权限域。
  - 自动生成：已刷新路由树、认证路由清单与权限契约生成文件。

- **收口结果**
  - 当前系统中形成两个边界清晰的入口：
    - 仓储下 `物料管理` -> `/materials`
    - 资源管理下 `原材料管理` -> `/raw-materials`
  - 新模块已具备后续继续扩展原材料分析、供应协同、来源管理等 tabs 的结构基础。

- **验证结果**
  - `pnpm run gen:route-tree`：通过。
  - `pnpm run gen:auth-routes`：通过。
  - `pnpm run gen:permission-contract`：通过。
  - `pnpm exec eslint src/features/raw-materials/index.tsx src/features/raw-materials/tabs.ts src/features/raw-materials/pages/raw-materials-catalog-page.tsx src/routes/_authenticated/raw-materials.tsx src/routes/_authenticated/raw-materials.lazy.tsx src/routes/_authenticated/raw-materials/index.tsx src/routes/_authenticated/raw-materials/catalog.tsx src/routes/_authenticated/raw-materials/catalog.lazy.tsx src/components/layout/data/sidebar-data.ts src/components/layout/data/search-data.ts src/features/authz/data/permission-catalog.ts src/locales/messages/zh-CN/index.ts src/locales/messages/en-US/index.ts src/locales/messages/zh-CN/sidebar.ts src/locales/messages/en-US/sidebar.ts src/locales/messages/zh-CN/commandMenu.ts src/locales/messages/en-US/commandMenu.ts src/locales/messages/zh-CN/rawMaterials.ts src/locales/messages/en-US/rawMaterials.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 清理销售分析模块的旧兼容路径

- **变更概述**
  - 按“系统未上线，不保留双路径并存歧义”的要求，删除旧订单分析兼容路径 `/trading/orders-analysis`，不再保留跳转过渡层。
  - 删除旧路由文件：
    - `src/routes/_authenticated/trading/orders-analysis.tsx`
    - `src/routes/_authenticated/trading/orders-analysis.lazy.tsx`
  - 系统内订单分析只保留唯一新路径：`/sales-analysis/orders-analysis`。

- **收口结果**
  - 旧 `Trading` 下的订单分析入口已从路由层彻底移除，不再存在“旧路径可访问但会跳转到新路径”的兼容行为。
  - 自动生成的认证路由清单已收敛为只保留 `sales-analysis` 相关新路径。
  - `src/routes/_authenticated/trading` 目录下已不再存在 `orders-analysis` 路由文件。

- **自动生成文件刷新**
  - `pnpm run gen:route-tree`
  - `pnpm run gen:auth-routes`
  - `pnpm run gen:permission-contract`

- **验证结果**
  - `pnpm exec eslint src/features/trading/tabs.ts src/features/trading/sales-analysis/index.tsx src/features/trading/sales-analysis/tabs.ts src/components/layout/data/sidebar-data.ts src/components/layout/data/search-data.ts src/features/authz/data/permission-catalog.ts src/routes/_authenticated/sales-analysis.tsx src/routes/_authenticated/sales-analysis.lazy.tsx src/routes/_authenticated/sales-analysis/index.tsx src/routes/_authenticated/sales-analysis/orders-analysis.tsx src/routes/_authenticated/sales-analysis/orders-analysis.lazy.tsx src/locales/messages/zh-CN/sidebar.ts src/locales/messages/en-US/sidebar.ts src/locales/messages/zh-CN/commandMenu.ts src/locales/messages/en-US/commandMenu.ts src/locales/messages/zh-CN/trading.ts src/locales/messages/en-US/trading.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 新增工程管理下独立 `产品外观` TAB（仅本体）

- **变更概述**
  - 按最新确认，本轮先只实现工程管理下的独立 `产品外观` TAB，本体先做出来，不在本轮同步接入销售订单与一维码页面。
  - `产品外观` 被定义为独立主数据入口，用于维护后续订单选配和条码外观位值所需的基础档案。

- **新增文件**
  - `src/features/engineering/data/product-appearance.ts`
  - `src/features/engineering/services/product-appearance-service.ts`
  - `src/features/engineering/tabs/product-appearance-mgmt.tsx`
  - `src/routes/_authenticated/engineering/product-appearance.tsx`
  - `src/routes/_authenticated/engineering/product-appearance.lazy.tsx`

- **模块接入**
  - 在工程管理 tabs 中新增 `产品外观` 入口，路径为 `/engineering/product-appearance`。
  - 在工程模块 query keys 中新增 `PRODUCT_APPEARANCES_QUERY_KEY`。
  - 在中英文 `engineering` 多语言消息中补充 `产品外观` tab 与页面文案。

- **数据实现**
  - 新建 `ProductAppearance` 主数据结构，包含：
    - `id`
    - `name`
    - `barcodeCode`
    - `description`
    - `active`
    - `sortOrder`
    - `createdAt`
    - `updatedAt`
  - 使用 `StorageService` 作为本轮最小可用存储。
  - 首次读取时支持从旧 `xdfc_appearance_mapping` 做一次性迁移映射；若旧数据不存在，则使用内置默认外观种子。

- **本轮能力边界**
  - 已完成：
    - 产品外观列表展示
    - 新增 / 编辑 / 删除
    - 启用状态切换
    - 条码位值唯一性校验（限制为 1-9 单位数字）
  - 未纳入本轮：
    - 一维码页面改为读取 `产品外观`
    - 销售订单弹窗改为读取 `产品外观`
    - 打印任务与订单规格绑定重构

- **自动生成文件刷新**
  - `pnpm run gen:route-tree`
  - `pnpm run gen:auth-routes`
  - `pnpm run gen:permission-contract`

- **验证结果**
  - `pnpm run gen:route-tree`：通过。
  - `pnpm run gen:auth-routes`：通过。
  - `pnpm run gen:permission-contract`：通过。
  - `pnpm exec eslint src/features/engineering/data/product-appearance.ts src/features/engineering/services/product-appearance-service.ts src/features/engineering/tabs/product-appearance-mgmt.tsx src/features/engineering/query-keys.ts src/features/engineering/tab-config.ts src/routes/_authenticated/engineering/product-appearance.tsx src/routes/_authenticated/engineering/product-appearance.lazy.tsx src/locales/messages/zh-CN/engineering.ts src/locales/messages/en-US/engineering.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 压缩 `产品外观` 页面高度与卡片密度

- **变更概述**
  - 按新确认，本轮只优化 `产品外观` 页面布局密度，不改业务字段和交互逻辑。
  - 目标是减少在仅有 6 张外观卡片时仍需滚动查看完整页面的问题。

- **布局优化内容**
  - 压缩页面顶部说明区：减小标题区间距、容器内边距与按钮高度。
  - 压缩统计卡区：减小卡片上下内边距、图标尺寸与数字字号。
  - 压缩外观卡片：
    - 减小卡片 header/content 留白
    - 收紧 badge 高度
    - 缩小说明文本占高
    - 压缩启用状态区与按钮区高度
  - 大屏下新增 `2xl` 四列布局，进一步提高单屏可见卡片数量。

- **涉及文件**
  - `src/features/engineering/tabs/product-appearance-mgmt.tsx`

- **收口结果**
  - `产品外观` 页面在桌面场景下的可视密度更高，6 张卡片更接近单屏完整展示。
  - 本轮未改动任何产品外观的数据结构、校验规则与增删改启停逻辑。

- **验证结果**
  - `pnpm exec eslint src/features/engineering/tabs/product-appearance-mgmt.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-22 `产品外观` 图片原型与销售订单外观选择预览（阶段 1）

- **变更概述**
  - 按最新确认的分阶段方案，先完成前端原型阶段：
    - `产品外观` 主数据支持图片字段
    - `产品外观` 编辑弹窗支持本地原型图片选择、预览与移除
    - 销售订单明细可直接选择外观并同步查看图片/说明预览

- **主数据结构调整**
  - `ProductAppearance` / `ProductAppearanceDraft` 增加：
    - `imageUrl`
    - `imageThumbnailUrl`
    - `imageName`
  - 旧本地数据在读取时会自动补齐默认图片字段，避免历史数据因结构变化出现空字段异常。

- **产品外观页面调整**
  - `产品外观` 编辑弹窗新增图片区：
    - 选择本地图片
    - 弹窗内预览
    - 更换图片
    - 移除图片
  - 当前阶段图片仍按本地原型方式保存，用于先验证主数据字段与交互。
  - 列表卡片增加外观缩略图显示，便于后续订单选择时形成统一识别体验。

- **销售订单原型接入**
  - 销售订单弹窗已查询 `产品外观` 主数据，并传入订单明细编辑器。
  - `SalesOrderLine` 增加外观关联与快照字段：
    - `appearanceId`
    - `appearanceNameSnapshot`
    - `appearanceBarcodeCodeSnapshot`
    - `appearanceDescriptionSnapshot`
    - `appearanceImageUrlSnapshot`
  - 订单明细编辑器新增外观选择区：
    - 选择外观
    - 即时显示缩略图
    - 即时显示名称、条码位值与说明快照

- **涉及文件**
  - `src/features/engineering/data/product-appearance.ts`
  - `src/features/engineering/services/product-appearance-service.ts`
  - `src/features/engineering/tabs/product-appearance-mgmt.tsx`
  - `src/features/trading/data/schema.ts`
  - `src/features/trading/hooks/use-sales-order-lines-editor-view-model.ts`
  - `src/features/trading/components/sales-order-action-dialog.tsx`
  - `src/features/sales-document/components/document-lines-editor.tsx`
  - `src/locales/messages/zh-CN/engineering.ts`
  - `src/locales/messages/en-US/engineering.ts`
  - `src/locales/overrides/sales/zh-CN/linesEditor.ts`
  - `src/locales/overrides/sales/en-US/linesEditor.ts`

- **收口结果**
  - `产品外观` 已从“仅文字主数据”扩展为“带图片原型能力的主数据”。
  - 销售订单侧已经具备“选择外观即能查看图片与说明”的最小前端原型闭环。
  - 当前仍未接入服务端数据库与统一文件存储，保留为前端原型阶段实现。

- **验证结果**
  - `pnpm exec eslint src/features/engineering/data/product-appearance.ts src/features/engineering/services/product-appearance-service.ts src/features/engineering/tabs/product-appearance-mgmt.tsx src/features/trading/data/schema.ts src/features/trading/hooks/use-sales-order-lines-editor-view-model.ts src/features/trading/components/sales-order-action-dialog.tsx src/features/sales-document/components/document-lines-editor.tsx src/locales/messages/zh-CN/engineering.ts src/locales/messages/en-US/engineering.ts src/locales/overrides/sales/zh-CN/linesEditor.ts src/locales/overrides/sales/en-US/linesEditor.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-22 `销售订单` 建立弹窗宽度扩大到页面宽度 95%

- **变更概述**
  - 调整 `销售订单` 建立 / 编辑弹窗宽度，使其接近页面宽度的 `95%`，优先减少弹窗内部横向滚动条。
  - 实施中发现单纯设置 `95vw` 仍会被 `DialogContent` 默认尺寸策略覆盖，因此一并修正了默认尺寸干扰问题。

- **具体调整**
  - 调整文件：`src/features/trading/components/sales-order-action-dialog.tsx`
  - 将订单弹窗 `DialogContent` 切换为 `size='full'`。
  - 将弹窗宽度统一设置为：
    - `w-[95vw]`
    - `max-w-[95vw]`
    - 并在 `sm / md / lg / xl` 断点显式保持 `max-w-[95vw]`
  - 修复根因：去掉 `DialogContent` 默认 `lg` 尺寸带来的 `sm:max-w-lg` 覆盖效果，避免桌面端仍被压成窄弹窗。

- **顺手收口**
  - 对齐了销售订单表头相关组件的 `setFormData` 类型，消除了该文件附近暴露出的类型不兼容问题：
    - `src/features/sales-document/components/document-header-fields.tsx`
    - `src/features/trading/hooks/use-sales-order-header-fields-view-model.ts`

- **收口结果**
  - `销售订单` 弹窗宽度已按页面宽度约 `95%` 放大。
  - 已避免被 `DialogContent` 默认尺寸重新压回窄宽度。
  - 本轮未修改订单字段、保存逻辑、接口与业务规则。

- **验证结果**
  - `pnpm exec eslint src/features/trading/components/sales-order-action-dialog.tsx src/features/sales-document/components/document-header-fields.tsx src/features/trading/hooks/use-sales-order-header-fields-view-model.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-22 `/basic-settings/linear-barcode` 外观映射弹窗只读化并收口编辑入口

- **变更概述**
  - 将 `/basic-settings/linear-barcode` 中的外观映射弹窗改为只读查看，不再允许在条码页直接编辑外观映射。
  - 外观编辑入口统一收口到产品工程管理下的 `产品外观` TAB，避免条码页与工程主数据页并行维护导致数据漂移。
  - 共享弹窗 `AppearanceActionDialog` 被同步改为只读，因此 `DM 编码` 页面复用该弹窗时也一并完成入口收口。

- **具体调整**
  - `src/features/basic-settings/hooks/use-appearance-mapping.ts`
    - 不再从本地 `xdfc_appearance_mapping` 读取数据。
    - 改为从 `productAppearanceService.getProductAppearances()` 获取 `产品外观` 主数据，并派生为只读 `appearance mapping` 视图。
  - `src/features/basic-settings/data/appearance-mapping.ts`
    - 新增 `buildAppearanceMappingFromProductAppearances()`，确保 1-9 位值始终可生成稳定映射视图。
  - `src/features/basic-settings/components/appearance-action-dialog.tsx`
    - 移除输入框编辑、保存、重置、本地存储写入逻辑。
    - 改为只读卡片展示“编码 / 名称 / 说明”。
    - 保留“前往产品外观”按钮，统一跳转到 `/engineering/product-appearance`。
  - `src/features/basic-settings/components/dm-rules-table.tsx`
    - 外观段位动作图标从“编辑”语义调整为“查看”语义。
  - `src/features/basic-settings/components/dm-simulation-section.tsx`
    - 外观映射类型来源改为数据层，解除对可编辑弹窗组件的类型耦合。
  - `src/locales/messages/zh-CN/basicSettings.ts`
  - `src/locales/messages/en-US/basicSettings.ts`
    - 更新为只读查看场景文案，并增加“前往产品外观”按钮文案。

- **收口结果**
  - 条码页现在只消费 `产品外观` 主数据派生出来的映射结果，不再维护第二套外观主数据。
  - `linear-barcode` 与 `DM 编码` 两侧复用的外观映射弹窗都已变为只读查看入口。
  - 外观修改入口已统一收口到 `产品外观` TAB。

- **验证结果**
  - `pnpm exec eslint src/features/basic-settings/data/appearance-mapping.ts src/features/basic-settings/hooks/use-appearance-mapping.ts src/features/basic-settings/components/appearance-action-dialog.tsx src/features/basic-settings/components/dm-rules-table.tsx src/locales/messages/zh-CN/basicSettings.ts src/locales/messages/en-US/basicSettings.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - 说明：`src/features/basic-settings/hooks/use-dm-numbering-mgmt.ts` 与 `src/features/basic-settings/components/dm-simulation-section.tsx` 内仍存在仓库历史遗留 lint 规则告警/报错（如 `set-state-in-effect`、`no-explicit-any`），未作为本轮阻塞项，也非本次只读化改动引入。

## 2026-04-22 外观映射弹窗只显示真实外观条目，并在无数据时显示空态

- **变更概述**
  - 在上一轮“外观映射弹窗只读化”基础上，进一步取消按 `1-9` 固定占位渲染的旧行为。
  - 当前规则调整为：只显示 `产品外观` 主数据中真实存在的外观条目；如果没有维护任何外观，则显示空态提示。

- **具体调整**
  - `src/features/basic-settings/data/appearance-mapping.ts`
    - `buildAppearanceMappingFromProductAppearances()` 不再以 `DEFAULT_APPEARANCE_MAPPING` 作为占位底表。
    - 仅对 `产品外观` 主数据中真实存在且条码位值合法的条目生成映射。
  - `src/features/basic-settings/components/appearance-action-dialog.tsx`
    - 列表渲染改为只遍历真实映射条目。
    - 不再展示 `7 / 8 / 9` 的 Reserved / 空白占位卡片。
    - 当一个外观条目都没有时，显示空态提示，并保留“前往产品外观”按钮。
  - `src/locales/messages/zh-CN/basicSettings.ts`
  - `src/locales/messages/en-US/basicSettings.ts`
    - 新增空态提示文案。

- **收口结果**
  - 外观映射弹窗现在不会再伪造未维护的主数据条目。
  - 只有在 `产品外观` TAB 中真实维护过的外观才会显示在弹窗里。
  - 若尚未维护任何产品外观，弹窗会直接提示当前无可展示数据。

- **验证结果**
  - `pnpm exec eslint src/features/basic-settings/data/appearance-mapping.ts src/features/basic-settings/hooks/use-appearance-mapping.ts src/features/basic-settings/components/appearance-action-dialog.tsx src/locales/messages/zh-CN/basicSettings.ts src/locales/messages/en-US/basicSettings.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-22 `AppearanceActionDialog` 对齐 UDS 1.0 视觉规范

- **变更概述**
  - 将 `查看外观编码映射` 弹窗重构为项目内统一的 UDS 1.0 风格。
  - 本轮仅做视觉层重构，不改只读逻辑、不改数据来源、不改“有才显示，没有不显示”的规则。

- **具体调整**
  - `src/features/basic-settings/components/appearance-action-dialog.tsx`
    - 从基础 `DialogContent` 结构切换为基于 `ActionDialogShell` 的统一弹窗布局。
    - 头部改为 UDS 1.0 分层标题区：
      - 图标容器
      - 标题
      - 辅助数量标签
      - 统一描述区
    - 主体改为 UDS 1.0 卡片与容器节奏：
      - 增加顶部信息卡
      - 统一滚动区域与网格卡片样式
      - 重做位值徽标、字段块、圆角、边框与阴影层次
    - 空态改为 UDS 1.0 风格容器，不再使用基础文本块。
    - 底部操作区改为统一的分隔与按钮风格。

- **保持不变**
  - 外观映射仍只显示 `产品外观` 主数据中真实存在的条目。
  - 未维护的位值（如 7 / 8 / 9）仍不显示占位卡片。
  - 无数据时仍显示空态提示。
  - “前往产品外观”跳转逻辑保持不变。

- **验证结果**
  - `pnpm exec eslint src/features/basic-settings/components/appearance-action-dialog.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-22 `@[current_problems]` 样式 warning 清理

- **变更概述**
  - 仅针对 IDE 当前列出的 Tailwind 样式 warning 做小范围清理。
  - 本轮不改业务逻辑、不改组件结构、不改交互行为。

- **具体调整**
  - `src/features/basic-settings/components/dm-simulation-section.tsx`
    - 将 `rounded-[2rem]` 调整为 `rounded-4xl`
    - 将 `break-words` 调整为 `wrap-break-word`
    - 将 `dark:bg-white/[0.02]` / `dark:bg-white/[0.03]` / `dark:bg-white/[0.04]` 调整为推荐写法
    - 将 `!h-11` / `!py-0` 调整为推荐写法 `h-11!` / `py-0!`
    - 修正 `bg-[radial-gradient(circle_at_70%_30%,_var(--tw-gradient-stops))]` 写法
    - 清理同一元素上的重复透明度组合，仅保留有效透明度表达
  - `src/features/engineering/tabs/product-appearance-mgmt.tsx`
    - 复核了 `aspect-[16/8]` 提示；当前文件中该旧写法已不存在，未再重复修改。

- **验证结果**
  - 通过 grep 复核，`dm-simulation-section.tsx` 中本轮针对的旧 class 写法已移除。
  - `pnpm exec eslint src/features/engineering/tabs/product-appearance-mgmt.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - 说明：`dm-simulation-section.tsx` 仍存在仓库历史遗留的 `no-explicit-any` 等 eslint 报错，但不属于本轮 `@[current_problems]` 中的样式 warning 范围，也不是本次 class 清理引入。

## 2026-04-22 `产品外观` 方案 B：服务端共享存储首批落地

- **变更概述**
  - 将 `产品外观` 从前端本地 `StorageService / IndexedDB` 原型，切换为基于当前项目既有 `Gin + Gorm + /assets/upload` 体系的服务端共享主数据。
  - 保持 `产品外观` 作为独立主数据中心，销售订单继续只消费该主数据，不反向维护。

- **后端落地内容**
  - 新增 `ProductAppearance` 后端模型，并加入 `AutoMigrate`。
  - 新增 `产品外观` 服务端 CRUD：
    - `GET /engineering/product-appearances`
    - `POST /engineering/product-appearances`
    - `PATCH /engineering/product-appearances/:id`
    - `DELETE /engineering/product-appearances/:id`
  - 路由权限按消费场景开放：
    - 读取允许 `工程 + 交易` 访问
    - 写操作仍要求管理权限
  - 服务端增加条码位值唯一校验、基础字段校验与版本冲突处理。
  - 当库中尚无外观数据时，服务端会自动补入默认外观种子数据，避免切换到 API 后出现空白主数据。

- **前端迁移内容**
  - `productAppearanceService` 已从本地 `StorageService` 切换为 `apiFetch('/engineering/product-appearances')`。
  - 前端 `ProductAppearance` / `ProductAppearanceDraft` 增加 `version` 字段，用于兼容服务端乐观锁。
  - `产品外观` 管理页在编辑、保存、启停切换时会带上版本号。
  - 销售订单侧仍继续通过统一 `PRODUCT_APPEARANCES_QUERY_KEY` 消费外观主数据，因此数据源已自动切换到服务端。

- **涉及文件**
  - `server/models/product_appearance.go`
  - `server/services/product_appearance_service.go`
  - `server/handlers/product_appearances.go`
  - `server/routes/routes.go`
  - `server/db/db.go`
  - `src/features/engineering/data/product-appearance.ts`
  - `src/features/engineering/services/product-appearance-service.ts`
  - `src/features/engineering/tabs/product-appearance-mgmt.tsx`

- **收口结果**
  - `产品外观` 已从“本地浏览器可见”的原型状态，进入“服务端共享主数据”首批可用状态。
  - 销售订单建立时读取到的外观数据，已与工程主数据页共享同一后端来源。
  - 当前图片上传仍复用现有 `/assets/upload`，业务表中只保存图片 URL / 缩略图 / 名称，不保存大图二进制。

- **验证结果**
  - `pnpm exec eslint src/features/engineering/data/product-appearance.ts src/features/engineering/services/product-appearance-service.ts src/features/engineering/tabs/product-appearance-mgmt.tsx src/features/trading/data/schema.ts src/features/trading/hooks/use-sales-order-lines-editor-view-model.ts src/features/trading/components/sales-order-action-dialog.tsx src/features/sales-document/components/document-lines-editor.tsx src/locales/messages/zh-CN/engineering.ts src/locales/messages/en-US/engineering.ts src/locales/overrides/sales/zh-CN/linesEditor.ts src/locales/overrides/sales/en-US/linesEditor.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。
  - `go test ./handlers ./services ./routes -run TestNonExistent`：通过（用于验证本轮后端相关包编译）。
  - `go test ./...`：未作为本轮通过标准；当前仓库仍存在既有 APS 模块编译缺口与历史测试失败，与本次 `产品外观` 改动无直接关系。

## 2026-04-21 `产品外观` 编辑弹窗对齐系统 UDS1.0 视觉

- **变更概述**
  - 将 `产品外观` 的新增 / 编辑弹窗从普通 `DialogContent` 结构调整为对齐系统既有 UDS1.0 视觉语言的弹窗样式。
  - 对齐基准参考系统中已稳定使用的 `ActionDialogShell` 风格，包括外层容器、标题区、表单区与底部按钮区。

- **具体调整**
  - 弹窗容器改为 UDS1.0 风格：大圆角、`p-0`、更强阴影、header/footer 虚线分割。
  - 标题区改为粗黑斜体标题 + 小号高字距副标识 + 大写说明文案层级。
  - 表单区拆为两个视觉分组：
    - 基础信息区：名称、条码位值、排序
    - 扩展信息区：说明、启用状态
  - 输入框、文本域、启用状态卡片统一为更接近系统 UDS1.0 表单风格的圆角与背景层次。
  - 底部按钮区改为圆角主次按钮组合，主按钮保留强调阴影。

- **涉及文件**
  - `src/features/engineering/tabs/product-appearance-mgmt.tsx`

- **收口结果**
  - `产品外观` 编辑弹窗已经与系统现有 UDS1.0 成熟弹窗样式更接近。
  - 本轮未修改任何字段结构、保存校验、保存逻辑或数据模型。

- **验证结果**
  - `pnpm exec eslint src/features/engineering/tabs/product-appearance-mgmt.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 `产品外观` 页面采用方案 B 继续压缩布局

- **变更概述**
  - 在上一轮基础压缩之上，继续按方案 B 将 `产品外观` 卡片重构为更高密度的表格式布局。
  - 目标是进一步降低单卡高度，让 6 张卡片在常见桌面窗口中更容易一屏看完。

- **布局调整内容**
  - 将卡片重排为更紧凑的“信息区 + 操作区”结构。
  - 将名称、条码位值、启停状态与排序信息集中到卡片上半区，减少纵向分层。
  - 将说明压缩为单行展示，降低说明区占高。
  - 将操作按钮收敛到底部紧凑操作行，并缩小按钮尺寸。
  - 列布局调整为 `md 2 列 / lg 3 列 / 2xl 4 列`，提升桌面场景下的单屏可见数量。

- **涉及文件**
  - `src/features/engineering/tabs/product-appearance-mgmt.tsx`

- **收口结果**
  - 页面继续向高密度信息卡样式收敛，相比上一版进一步减少了每张卡片的高度。
  - 业务字段、校验规则、启停逻辑与增删改交互保持不变。

- **验证结果**
  - `pnpm exec eslint src/features/engineering/tabs/product-appearance-mgmt.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 将订单分析抽离为销售管理下的独立“销售分析”模块

- **变更概述**
  - 将原先挂在 `Trading` 顶部 tabs 中的 `/trading/orders-analysis` 从交易流程型导航中抽离，升级为销售管理分组下的独立模块入口 `/sales-analysis`。
  - 新增独立模块壳 `src/features/trading/sales-analysis/index.tsx` 与 `src/features/trading/sales-analysis/tabs.ts`，模块内部首个 tab 为 `订单分析`，路径为 `/sales-analysis/orders-analysis`。
  - 初版实施时曾短暂保留旧路径 `/trading/orders-analysis` 的兼容跳转；但已在后续清理中彻底删除，当前仅保留新路径 `/sales-analysis/orders-analysis`。

- **入口与配套调整**
  - 侧边栏：在销售管理分组下新增“销售分析”入口，与“发货管理”同级。
  - 命令搜索：新增 `/sales-analysis/orders-analysis` 导航项。
  - 多语言：补充侧边栏、命令菜单与销售分析模块标题/说明文案。
  - 权限映射：将 `/sales-analysis` 继续映射到现有 `menu_trading`，未新增权限树。
  - Trading 顶部 tabs：移除原 `订单分析` tab，避免与独立分析模块重复。

- **自动生成文件刷新**
  - 执行 `pnpm run gen:route-tree`，同步新模块路由到路由树。
  - 执行 `pnpm run gen:auth-routes`，同步认证路由清单。
  - 执行 `pnpm run gen:permission-contract`，同步权限相关生成文件。

- **收口结果**
  - 销售管理入口被重新分层为：交易流程型页面继续留在 `/trading`，分析型页面迁出到独立的 `/sales-analysis` 模块。
  - 当前“销售分析”模块已具备继续扩展更多分析子 tab 的结构基础，后续可自然承接客户分析、产品分析、趋势分析等详细分析能力。

- **验证结果**
  - `pnpm exec eslint src/features/trading/tabs.ts src/features/trading/sales-analysis/index.tsx src/features/trading/sales-analysis/tabs.ts src/components/layout/data/sidebar-data.ts src/components/layout/data/search-data.ts src/features/authz/data/permission-catalog.ts src/routes/_authenticated/sales-analysis.tsx src/routes/_authenticated/sales-analysis.lazy.tsx src/routes/_authenticated/sales-analysis/index.tsx src/routes/_authenticated/sales-analysis/orders-analysis.tsx src/routes/_authenticated/sales-analysis/orders-analysis.lazy.tsx src/locales/messages/zh-CN/sidebar.ts src/locales/messages/en-US/sidebar.ts src/locales/messages/zh-CN/commandMenu.ts src/locales/messages/en-US/commandMenu.ts src/locales/messages/zh-CN/trading.ts src/locales/messages/en-US/trading.ts`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 修复订单分析页 `/trading/orders-analysis` 500 错误

- **问题现象**
  - 页面 `/trading/orders-analysis?timeRange=last_30_days` 在渲染 `OrdersAnalysisTab` 时触发运行时错误：`TypeError: analytics.map is not a function`。
  - 报错位置位于 `src/features/trading/sales/analytics/tabs/analytics-tab.tsx`，在构造客户筛选项和后续统计卡片时将 `analytics` / `globalRanking` 当作数组直接调用 `map`、`reduce`。

- **根因定位**
  - 追踪链路为：`OrdersAnalysisTab` -> `useSalesAnalytics` / `useGlobalProductRanking` -> `SalesAnalyticsService` -> `src/features/trading/sales/services/sales-query-service.ts` -> 后端 `server/handlers/sales_order_analytics.go`。
  - 后端两个 analytics 接口实际返回结构均为对象包裹：`{ items: [...], total: number }`。
  - 但前端查询服务此前直接把整个对象响应返回给上层，随后 `analytics-service.ts` 又将其强转为数组类型，导致页面在运行时把对象当数组使用。
  - 结论：这是订单分析页 analytics 查询的**前后端接口契约错配**，不是单纯空值问题。

- **修复内容**
  - 修改 `src/features/trading/sales/services/sales-query-service.ts`：
    - 对 `getCustomerProductStats()` 改为从响应对象中提取 `items` 数组返回。
    - 对 `getGlobalProductRanking()` 改为从响应对象中提取 `items` 数组返回。
  - 保持 `analytics-tab.tsx` 渲染层不变，继续消费稳定数组，避免把兼容补丁散落到页面组件中。

- **收口结果**
  - 订单分析页相关 analytics 查询现在与后端 `{ items, total }` 契约重新对齐。
  - `OrdersAnalysisTab` 中的 `map` / `reduce` 调用恢复为基于数组的正确使用路径，不再因对象错配触发错误边界。

- **验证结果**
  - `pnpm exec eslint src/features/trading/sales/services/sales-query-service.ts src/features/trading/sales/analytics/services/analytics-service.ts src/features/trading/sales/analytics/tabs/analytics-tab.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。

## 2026-04-21 进一步压缩快捷扫描指令卡片高度

- **变更概述**
  - 继续调整 `src/features/quick-actions/components/quick-action-drawer.tsx` 中的快捷扫描卡片样式，在已移除描述的基础上进一步收窄卡片高度。
  - 本轮仅做小幅样式压缩：将卡片外层纵向内边距从 `py-4` 收窄到 `py-3`，并同步收窄点击区 `gap` 与左侧图标容器尺寸。
  - 安装按钮尺寸、抽屉宽度、头部说明文案、权限过滤和跳转/拍照/录像行为保持不变。

- **收口结果**
  - 每个快捷扫描指令卡片的纵向占用进一步降低，同屏可见卡片数增加，移动端侧边栏空间利用率更高。
  - 卡片仍保留清晰的标题层级与足够的点击区域，没有扩大为结构性 UI 改造。

- **验证结果**
  - `pnpm exec eslint src/features/quick-actions/components/quick-action-drawer.tsx`：通过。
  - `pnpm exec tsc --noEmit --pretty false`：通过。