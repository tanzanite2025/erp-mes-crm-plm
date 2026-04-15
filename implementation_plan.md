### 1. plan：修复侧边栏权限清单映射缺失导致的页面崩溃（/shipping-management）
 
 日期：2026-04-15  
 状态：待批准
 
 #### 1.1 背景与目标
 
 当前侧边栏在渲染过程中会基于菜单项的 `url` 计算其所属的 `menu_*` 权限 ID。由于 `/shipping-management` 顶层 path 未被纳入 `permission-catalog` 的映射表，导致 `getMenuPermissionForPath()` 直接抛错：
 
 - `[permission-catalog] Unmapped top-level path: /shipping-management`
 
 该异常发生在侧边栏数据构建阶段，最终由 React ErrorBoundary 重建 `<Lazy>` 组件树，表现为页面崩溃/白屏。
 
 本轮目标：
 
 1. 补齐 `/shipping-management` 的菜单权限映射，使侧边栏不再因为缺失映射而崩溃
 2. 保持权限裁决仍以服务端为准，不引入新的前端路由硬拦截逻辑
 3. 修复应为“根因级”：让新增顶层模块不会再因为漏配映射造成运行时崩溃
 
 #### 1.2 已确认根因链路
 
 1. `src/components/layout/data/sidebar-data.ts` 新增菜单项 `url: '/shipping-management'`
 2. `permissionIdForPath('/shipping-management')` 调用 `getMenuPermissionForPath(path)`
 3. `src/features/authz/data/permission-catalog.ts` 的 `ROUTE_TO_MENU_MAPPING` 缺少 `'/shipping-management'`
 4. `getMenuPermissionForPath()` 因缺少映射直接 `throw`
 
 同时已确认路由文件存在：`src/routes/_authenticated/shipping-management.tsx`
 
 #### 1.3 修复策略
 
 1. 为 `ROUTE_TO_MENU_MAPPING` 增加：
    - `'/shipping-management': <某个 menu key>`
 2. 决策点：`/shipping-management` 应归属哪个顶层菜单权限（`MENU_PERMISSIONS`）
    - 若该模块语义仍属于“购销/销售”域，则可映射到 `menu_trading`
    - 若后续会独立为“出货管理”顶层模块，则需要新增一个新的 `MENU_PERMISSIONS.shipping`（对应新的 `menu_shipping`）并同步后端权限契约（本轮倾向先走最小修复，避免引入新菜单权限再联动一整条迁移）
 3. 保持 `authenticated-route-catalog.ts` 仅作为“路由收录清单”，不在本轮增加前端守卫逻辑
 
 #### 1.4 预计涉及文件
 
 1. `src/features/authz/data/permission-catalog.ts`（新增 `/shipping-management` 映射）
 2. （仅核对，无需改动时不动）`src/components/layout/data/sidebar-data.ts`
 3. （仅核对）`src/routes/_authenticated/shipping-management.tsx`
 4. （仅核对）`src/features/authz/data/authenticated-route-catalog.ts`
 
 #### 1.5 风险与注意事项
 1. 若映射到错误的 `menu_*`，可能导致“菜单权限语义漂移”（例如出货管理被错误归到 settings 或 pda）
 2. 若后续决定新增 `menu_shipping`，则必须与后端 permission contract 同步，避免再次漂移

 #### 1.6 验证策略

 1. 进入任意已登录页面，侧边栏可正常渲染，不再抛出 unmapped 错误
 2. 执行 `pnpm exec tsc --noEmit`（或最小定向 TS 校验）通过
 3. 在 `walkthrough.md` 记录：根因、修复点、验证结果

### 2. plan：发货管理页面接入统一搜索顶栏与模块级多 TAB 结构

日期：2026-04-15  
状态：待批准

#### 2.1 背景与问题

虽然我们已经在 `logistics-config` 完成了“统一 Header + 全局 Search + ModuleTabs”的第一批样板，但 `发货管理` 页面并没有接入这套结构，因此你看到它仍然没有搜索顶栏，也没有一致的模块级多 TAB 栏。

实查当前链路：

1. `src/routes/_authenticated/shipping-management.lazy.tsx` 直接渲染 `ShippingManagement`
2. `src/features/trading/tabs/index.tsx` 中的 `ShippingManagement` 仅渲染 `ShippingManagementTab`
3. `src/features/trading/tabs/shipping-management.tsx` 当前是单页直出，内部使用 `PageHeader + 本地 Tabs`

因此它仍是“页面内局部组织”，而不是“模块级布局”。

#### 2.2 本轮目标

1. 让 `/shipping-management` 接入统一 `Header + Search + ModuleTabs` 结构
2. 让“发货管理”从单页直出提升为模块级布局
3. 避免出现“模块级 Tabs + 页面内 Tabs”双层重复导航

#### 2.3 关键设计点

本轮需要先明确：`发货管理` 的多 TAB 到底承载什么。

推荐的第一批策略是：

1. 先把当前页面中的局部 Tabs 上升为模块级 Tabs
2. 将当前单页里的主要分区按信息架构拆成 2-3 个模块级子页（示例：待发货 / 发货记录 / 配车与确认）
3. 或者如果当前业务尚不足以支撑拆页，则先只接入统一 Header，并暂缓真正的多路由 TAB 拆分
4. 子页页眉不自造新样式，直接复用现有 `src/components/layout/page-header.tsx`，与项目中其它页面保持一致

#### 2.4 预计涉及文件

1. `src/routes/_authenticated/shipping-management.tsx`
2. `src/routes/_authenticated/shipping-management.lazy.tsx`
3. `src/features/trading/tabs/index.tsx`
4. `src/features/trading/tabs/shipping-management.tsx`
5. 视设计结果，可能新增 `src/routes/_authenticated/shipping-management/*` 子路由文件
6. 视设计结果，可能新增 `src/features/shipping-management` 或 `src/features/trading/shipping-management/*` 目录承载拆分后的模块内容

#### 2.5 风险与注意事项

1. 若不先确认 TAB 划分，直接硬套模块级多 TAB，容易造出“为了有 Tabs 而有 Tabs”的空结构。
2. 若保留现有页面内 Tabs 又新增模块级 Tabs，会出现双层导航冲突。
3. 需要控制第一批范围，避免把发货管理顺手扩成整个 trading 域重构。

#### 2.6 需要你确认的决策点

1. 已确认：采用方案 B，本轮直接拆成模块级多 TAB

2. 已确认第一批 TAB 划分：
   - `车型匹配`
   - `联系人`
   - `发货记录`

#### 2.7 验证策略

1. `/shipping-management` 页面具备统一 Header 与 Search 入口
2. 若接入模块级 Tabs，导航结构不重复、不冲突
3. `车型匹配` / `联系人` / `发货记录` 三个子页均使用 `PageHeader`，标题/描述与项目现有页眉风格一致
4. `pnpm exec tsc --noEmit` 通过
5. `walkthrough.md` 记录：结构调整、TAB 划分、验证结果

### 3. plan：通用搜索顶栏 + 一致 TAB 栏（渐进式收口）

日期：2026-04-15  
状态：待批准

#### 2.1 背景与问题

你反馈“页面目前还没有通用搜索顶栏，也没有一致的 TAB 栏”。实查当前代码：

1. **通用顶栏/搜索入口并非不存在**：全局 `Header`（`src/components/layout/header.tsx`）已内置 `Search`（`src/components/search.tsx`，通过 `useSearch()` 打开搜索弹层）。
2. **TAB 体系存在分裂**：
   - 模块级（路由级）多 TAB：已存在 `ModuleTabbedLayout + ModuleTabs`（固定二级 TabBar，支持横向滚动、actions slot）。
   - 页面内（组件级）TAB：大量页面直接用 `TabsList/TabsTrigger` 并手写 class，导致视觉与交互不一致。

因此问题更准确是：

- 顶栏与搜索入口的“统一使用口径”未形成（哪些模块一定要展示、是否需要 page title slot 等）。
- TAB 栏样式与行为没有形成“单一事实源”，而是散落在各业务页面。

#### 2.2 本轮目标

1. **形成统一规范**：明确通用 Header 的使用策略 + TAB 的分类与统一承载方式。
2. **渐进式落地**：先选定 1-2 个模块完成收口，验证可行后再扩。
3. **避免破坏性改动**：不全站一次性替换；不引入新的前端硬拦截权限守卫语义。

#### 2.3 统一对象拆分（关键）

本轮把 TAB 明确拆为两类，避免“同一个组件想同时满足两类需求”导致再次混乱：

1. **模块级路由 TAB（Module Tabs）**
   - 定义：与路由绑定、切换即 `navigate`，通常位于 Header 下方固定位置。
   - 统一目标：收口到 `src/components/layout/module-tabbed-layout.tsx` 与 `src/components/module-tabs.tsx`。

2. **页面内局部 TAB（Page Tabs）**
   - 定义：同一路由内切换视图（例如报表分类切换），不必固定在顶部。
   - 统一目标：提供统一的样式 variant（尺寸/圆角/字重/滚动/active 色），减少各页面自由手写 class。

#### 2.4 技术策略（建议）

1. **通用搜索顶栏**
   - 复用既有 `Header` + `Search`（不要新造第二套搜索入口）。
   - 明确 Header 的可配置项：`showGlobalSearch`、`children` slot（用于 page title / breadcrumb），并制定“默认开启”的模块列表。

2. **一致 TAB 栏**
   - 模块级：对已有多 TAB 模块优先迁移到 `ModuleTabbedLayout`（避免出现多套 fixed tabbar）。
   - 页面内：抽一个 `TabsList/TabsTrigger` 的样式收口点（例如在 `ui/tabs.tsx` 增加可复用 variant，或新增 `components/page-tabs.tsx` 作为薄封装）。

#### 2.5 需要你确认的决策点

1. “通用搜索”语义确认：
   - 是否仅作为“全局命令面板/页面跳转搜索”入口（当前实现倾向）
   - 还是要在顶栏直接提供“全局关键字搜索业务数据”（单据/主数据）的第一阶段能力

2. 第一批落地范围（建议只选 1-2 个）：
   - 候选 A：`warehouse`（页面内 TAB 较多，适合作为 Page Tabs 统一样式样板）
   - 候选 B：`logistics-config`（模块级多 TAB，适合作为 Module Tabs 收口样板）
   - 候选 C：你指定的最常用/最刺眼的模块

#### 2.6 风险与注意事项

1. 全站统一容易引发大量 UI 细节回归，本轮必须控制范围。
2. Module Tabs 固定定位与 Header fixed 的叠层/z-index 需要小心，避免出现遮挡与滚动穿透问题。

#### 2.7 验证策略

1. 选定模块在桌面/移动端均可正常展示 Header + Search 入口，交互不被遮挡。
2. 选定模块 TAB 样式一致，且切换不影响路由/状态。
3. `pnpm exec tsc --noEmit` 通过。
4. `walkthrough.md` 记录：统一策略、落地范围、验证结果。

### 5. plan：车型规格库独立 TAB + 后端 authority 化

日期：2026-04-15  
状态：待批准

#### 5.1 背景与问题

当前 `/logistics-config/vehicle-loading` 页面同时承担了两类职责：

1. 装载/配车计算
2. 车型规格库展示

这在早期用 mock 打通交互是合理的，但如果后续要支持：

- 自定义车型
- 自定义内部空间
- 联系人绑定车型
- 多页面复用车型库

那么车型库就不应继续作为“装载计算页里的附属列表”，而应提升为独立主数据中心。

同时，当前 `VehicleSpec` 模型仍是理想化模型：

1. 只有名义内尺寸与体积
2. 默认内部空间可满铺
3. 没有表达安全间隙、操作余量、门洞约束、轮包/立柱侵占等真实装载限制

因此如果直接基于当前模型做后续绑定与推荐，得到的结果会偏离真实业务。

#### 5.2 推荐目标

1. 在 `logistics-config` 下新增独立 `车型规格库` TAB
2. 将车型库从前端 mock / 页面附属数据提升为后端 authoritative 主数据
3. 让 `装载/配车计算` 页面只负责计算与展示，不再承担车型主数据维护职责
4. 将当前 `VehicleSpec` 升级为更贴近实际装载约束的数据模型

#### 5.3 推荐的数据模型升级方向

建议至少拆分以下几类字段：

1. **物理尺寸字段**
   - 真实内长 / 内宽 / 内高
   - 名义载重
   - 名义载方

2. **可用装载空间字段**
   - 可用装载长 / 宽 / 高
   - 可用装载体积

3. **装载约束字段**
   - 安全间隙 / 顶部预留 / 侧边预留
   - 门洞尺寸
   - 轮包侵占
   - 立柱/异形空间干涉

4. **业务附加字段**
   - 启用状态
   - 备注
   - 适用场景/区域（如有）

#### 5.4 为什么建议独立 TAB

1. 车型库是可维护主数据，不是临时计算输入
2. 后续会被：
   - 装载/配车计算
   - 发货管理联系人绑定
   - 调车/承运商选择
   - 可能的物流成本估算
   共用
3. 若继续挂在 `vehicle-loading` 页面内部，后续维护入口、权限语义与复用边界都会混乱

#### 5.5 为什么建议转后端 authority

1. 主数据需要可维护、可校验、可审计
2. 多页面共享时，前端 mock / 常量无法长期成立
3. 自定义车型、空间参数与装载约束显然属于应持久化的数据，而非前端局部状态

#### 5.6 预计涉及文件/层

前端预计涉及：

1. `src/features/logistics-config/*`
2. `src/routes/_authenticated/logistics-config/*`
3. `src/features/logistics-config/vehicle-loading/data/vehicle-loading.types.ts`
4. 共享车型库 query / service / adapter 层
5. 依赖车型库的消费页（如 `shipping-management/contacts`）

后端预计涉及：

1. 车型库主数据模型
2. 车型库 CRUD / list 接口
3. 与前端 contract 对齐的 DTO / validation

#### 5.7 风险与注意事项

1. 若继续沿用当前理想化体积模型，后续推荐结果会持续偏乐观
2. 若把“可用空间”与“物理空间”混成一套字段，后续维护会失真
3. 若车型库不独立，发货管理、装载计算与主数据维护职责会继续缠在一起

#### 5.8 需要你确认的决策点

1. 是否确认在 `logistics-config` 下新增独立 `车型规格库` TAB
2. 是否确认车型库进入后端 authority 化阶段
3. 是否确认后续推荐计算优先基于“可用装载空间”而不是单纯名义体积

#### 5.9 验证策略

1. 前端存在独立 `车型规格库` 入口
2. 车型库主数据可被 `vehicle-loading` / `shipping-management` 复用
3. 数据模型能表达可用装载空间与装载约束
4. `pnpm exec tsc --noEmit` 通过，若涉及后端则补对应后端校验
5. `walkthrough.md` 记录：架构调整、模型升级、验证结果

### 6. plan：物流侧边栏独立一级分类

日期：2026-04-15  
状态：待批准

#### 6.1 背景与问题

当前侧边栏中的物流相关能力仍主要挂在 `logistics-config` 语义下，这在早期可以理解为“物流配置中心”，但随着能力增长，这个定位已经开始失真。

当前模块下已经包含：

1. 物流供应商
2. 装载/配车
3. 车型规格库
4. 包装规则
5. 扫描配置
6. 接口平台

其中相当一部分已不再只是“系统参数配置”，而是：

- 主数据中心
- 业务支撑中心
- 物流域能力入口

继续挂在“系统配置/基础配置”语义下面，会让侧边栏的信息架构越来越不符合真实业务边界。

#### 6.2 推荐目标

1. 在侧边栏中新增一级分类：`物流`
2. 让当前 `logistics-config` 演进为物流域下的模块入口，而不是继续作为 settings 语义下的子项
3. 为后续物流扩展能力预留稳定导航位置

#### 6.3 为什么建议独立一级分类

1. 物流能力已经开始形成独立业务域，而不是零散配置项
2. 后续极可能继续增加：
   - 路线/区域
   - 承运商联系人体系
   - 配送/发货策略
   - 物流报价/费用规则
   - 平台对接能力
3. 若继续放在“系统配置”语义下，后续每新增一个物流能力，都会继续污染导航边界

#### 6.4 规划中的关键决策点

1. **侧边栏信息架构**
   - 是将 `物流` 做成一级菜单直达模块主页
   - 还是做成一级菜单 + 二级子入口集合

2. **路由策略**
   - 方案 A：保留现有 `/logistics-config/*` 路径，仅调整侧边栏语义
   - 方案 B：逐步演进到 `/logistics/*`，并保留旧路径重定向/兼容

3. **权限策略**
   - 方案 A：短期内继续复用现有 `settings/trading` 相关权限，先完成导航语义纠偏
   - 方案 B：新增独立 `menu_logistics`，让物流域成为权限契约中的一等模块

#### 6.5 推荐实施顺序

建议分两步，而不是一次性硬切：

1. **第一步：导航语义纠偏**
   - 先把侧边栏中的 `物流` 独立出来
   - 保持主要路由兼容，降低迁移风险

2. **第二步：域边界收口**
   - 视后续物流能力增长，再决定是否升级为独立路由前缀与独立权限菜单

#### 6.6 预计涉及文件/层

前端预计涉及：

1. `src/components/layout/data/sidebar-data.ts`
2. `src/features/authz/data/permission-catalog.ts`
3. `src/features/authz/data/authenticated-route-catalog.ts`
4. `src/features/logistics-config/*` 与可能新增的 `src/features/logistics/*`
5. 相关路由文件与模块入口

后端/权限预计涉及：

1. `server/authz/permissions.go`（若决定新增独立物流菜单权限）
2. 对应前端 permission contract 生成链

#### 6.7 风险与注意事项

1. 若直接改成独立一级分类但不考虑旧路径兼容，可能影响既有书签与入口跳转
2. 若导航语义先拆、权限语义不拆，需要明确这是过渡态，避免长期漂移
3. 若立即新增独立 `menu_logistics`，会牵动权限契约与角色矩阵，需要控制范围

#### 6.8 需要你确认的决策点

1. 是否确认将侧边栏中的物流独立为一级分类 `物流`
2. 是否优先采用“先调整导航语义，暂不立即重做全部路由”的渐进策略
3. 是否本轮只做导航结构规划，权限语义独立留待下一阶段确认

#### 6.9 验证策略

1. 侧边栏中存在清晰独立的 `物流` 一级分类
2. 物流相关能力入口不再继续压在系统配置语义下
3. 旧入口在过渡期仍可兼容访问（若采用兼容策略）
4. `pnpm exec tsc --noEmit` 通过
5. `walkthrough.md` 记录：导航调整、路由/权限决策、验证结果

### 7. plan：物流 TAB 拆分为多个侧边菜单（第一阶段：新增“物流配置”）

日期：2026-04-15  
状态：待批准

#### 7.1 背景与问题

当前 `物流` 侧边栏下仍主要只有一个总入口：`logistics-config`。

而该入口内部已经集中承载了多组不同性质的 TAB：

1. 物流供应商
2. 装载/配车
3. 车型规格库
4. 包装规则
5. 扫描配置
6. 接口平台

虽然这些 TAB 当前已经是“独立文件承接”，但导航层级上仍然过于集中：

- 入口过重
- 模块边界不清晰
- 随着物流域持续扩展，会越来越难在侧边栏上表达不同能力簇

因此下一步问题不再是“TAB 是否独立文件”，而是“哪些 TAB 应继续留在同一模块，哪些应上升为并列侧边菜单”。

#### 7.2 第一阶段推荐目标

先做最小可控拆分，而不是一次性把物流域全部打散：

1. 在 `物流` 一级分类下新增一个并列侧边菜单：`物流配置`
2. 将当前 `扫描配置`、`接口平台` 两个 TAB 收入 `物流配置`
3. 当前 `物流供应商`、`装载/配车`、`车型规格库`、`包装规则` 暂保留在现有物流入口中

#### 7.3 为什么先拆“物流配置”

`扫描配置` 与 `接口平台` 两个 TAB 的共同点非常明确：

1. 都更偏向“配置与集成能力”
2. 都不像 `物流供应商 / 车型规格库 / 包装规则` 这类主数据中心
3. 都适合作为单独的“物流配置”子模块集合

因此先把这两个 TAB 收口到 `物流配置`，是最低风险、也最符合语义的一步。

#### 7.4 第一阶段后的推荐信息架构

建议先调整为：

1. **物流**
   - 物流供应商
   - 装载/配车
   - 车型规格库
   - 包装规则

2. **物流配置**
   - 扫描配置
   - 接口平台

后续若物流域继续变大，再考虑把主数据中心进一步拆散成更多并列侧边菜单。

#### 7.5 路由策略建议

建议仍采用渐进迁移，而不是一次性硬切：

1. **方案 A（推荐）**
   - 新增 `物流配置` 入口与模块壳
   - 为 `扫描配置`、`接口平台` 提供新路由入口
   - 旧的 `/logistics-config/scanning`、`/logistics-config/platforms` 保留兼容跳转或过渡入口

2. **方案 B（不推荐当前直接做）**
   - 立即重构全部物流子路由归属
   - 风险更高，影响更大

#### 7.6 预计涉及文件/层

前端预计涉及：

1. `src/components/layout/data/sidebar-data.ts`
2. `src/features/logistics-config/tabs.ts`
3. 新增 `src/features/logistics-settings/*` 或同等独立模块目录
4. 新增对应路由文件（如 `src/routes/_authenticated/logistics-settings/*`）
5. 旧 `scanning/platforms` TAB 的迁移与兼容入口

权限/映射预计涉及：

1. `src/features/authz/data/permission-catalog.ts`
2. `src/features/authz/data/authenticated-route-catalog.ts`

#### 7.7 风险与注意事项

1. 若直接迁移 `scanning/platforms` 而不做旧路由兼容，会影响现有书签与内部跳转
2. 若“物流”与“物流配置”边界不清晰，后续仍会继续膨胀成新的大杂烩
3. 本轮不建议同步做独立 `menu_logistics_settings` 等新权限菜单，避免扩大范围

#### 7.8 需要你确认的决策点

1. 是否确认第一阶段先只拆出 `物流配置`
2. 是否确认 `扫描配置`、`接口平台` 先移入 `物流配置`
3. 是否确认其余四个 TAB 暂保留在现有物流入口中，后续再评估继续拆分

#### 7.9 验证策略

1. 侧边栏中存在并列入口：`物流` 与 `物流配置`
2. `扫描配置`、`接口平台` 可从 `物流配置` 访问
3. 旧入口在过渡期仍兼容可访问（若采用兼容策略）
4. `pnpm exec tsc --noEmit` 通过
5. `walkthrough.md` 记录：导航拆分、兼容策略、验证结果

### 8. plan：销售订单 fulfillmentRate 缺失修复 + 详情抽屉化承接

日期：2026-04-15  
状态：待批准

#### 8.1 背景与问题

当前销售订单页面存在两类问题叠加：

1. 点击销售单后，`SalesOrderMaster` 持续抛出：`[CRITICAL] Missing fulfillmentRate from sales order DTO`
2. 详情展示采用“列表左侧 + 详情右侧内嵌面板”方式，导致主列表被明显压缩，影响正常预览

从当前前端代码看：

- `src/features/trading/sales/contracts/sales-order-api-dto.ts` 已声明 `fulfillmentRate?: number`
- `src/features/trading/sales/adapters/sales-order-api-adapter.ts` 已将 `dto.fulfillmentRate` 透传到前端领域模型
- `src/features/trading/components/sales-order-master.tsx` 在订单非 `Draft` 时将 `fulfillmentRate` 视为关键字段，并在缺失时 fail loudly

因此当前更像是**后端实际返回漏了 `fulfillmentRate`**，而不是前端漏映射。

同时，`src/features/trading/components/sales-order-list-fixed.tsx` 当前在存在 `selectedId` 时，会把列表缩到 `w-1/3`，剩余区域渲染内嵌 `SalesOrderDetail`。这种布局在高频点选详情场景下会直接破坏主列表可读性。

#### 8.2 推荐目标

1. 从根因修复销售单 DTO 中缺失 `fulfillmentRate` 的问题
2. 将销售单详情从“右侧内嵌挤压”改为独立抽屉式承接
3. 保持现有 `SalesOrderDetail` 业务内容组件可复用，避免把展示容器和业务逻辑继续耦合

#### 8.3 为什么不能只做前端兜底

不建议简单把 `fulfillmentRate` 缺失时渲染成 `--` 就结束：

1. 当前页面已经把该字段视为关键业务指标
2. fail loudly 暴露的是 DTO 契约漂移，不是单纯 UI 容错问题
3. 若前端静默兜底，会掩盖后端返回不完整数据的真实问题

因此应优先保证：**后端 authoritative DTO 与前端契约一致**。

#### 8.4 为什么建议改为抽屉承接

当前详情不是弹窗，也不是覆盖层，而是直接把主列表挤成 `1/3` 宽度。这会带来：

1. 列表列宽被压缩，主信息不可读
2. 用户在查看详情时失去对列表上下文的稳定浏览能力
3. 详情内容越来越复杂时，右侧内嵌面板会继续膨胀

因此更适合改成：

1. 独立 `SalesOrderDetailDrawer`（或同等命名）容器组件
2. 采用底部滑出式 / Drawer 样式承接详情
3. 复用现有 `SalesOrderDetail` 作为抽屉内部内容

#### 8.5 推荐实施方式

1. **Phase A：修 DTO 根因**
   - 排查销售单列表与详情后端返回
   - 补齐 `fulfillmentRate`
   - 确保前端列表与详情读取一致

2. **Phase B：抽屉化承接**
   - 新增独立抽屉容器组件
   - 让 `SalesOrderList` 保持主列表宽度，不再因选中详情而缩成 `w-1/3`
   - 抽屉打开状态仍沿用当前 `detailId` 路由搜索参数

#### 8.6 预计涉及文件/层

前端预计涉及：

1. `src/features/trading/components/sales-order-list-fixed.tsx`
2. `src/features/trading/components/sales-order-detail.tsx`
3. 新增详情抽屉容器组件（如 `sales-order-detail-drawer.tsx`）
4. 相关详情子组件与样式容器

后端预计涉及：

1. 销售订单列表/详情 handler
2. 销售订单 DTO / service / repository 映射链中 `fulfillmentRate` 的生成与返回

#### 8.7 风险与注意事项

1. 若只改前端详情容器而不修 DTO，日志风暴与指标缺失仍会持续
2. 抽屉改造需要保证编辑/删除/文件预览等动作仍正常工作
3. 若使用底部抽屉，需要关注桌面端高度、滚动容器与嵌套预览弹窗之间的交互

#### 8.8 需要你确认的决策点

1. 是否确认先从后端根因修复 `fulfillmentRate` 缺失
2. 是否确认把销售单详情改为独立抽屉组件承接
3. 是否确认优先采用“底部滑出式”而不是继续右侧内嵌面板

#### 8.9 验证策略

1. 销售订单页不再出现 `Missing fulfillmentRate from sales order DTO`
2. 点击销售单后主列表不再被压缩到难以预览
3. 抽屉中的详情、删除、预览、状态动作均可正常使用
4. `pnpm exec tsc --noEmit` 通过；若涉及后端则补对应 Go 校验
5. `walkthrough.md` 记录：根因、交互调整、验证结果

#### 8.10 第二轮收口建议（当前待批准）

在第一轮修复完成后，当前结构已经比原来清晰很多，但还有两个收口点值得继续做：

1. **详情删除 / 作废回流链仍不够稳**
   - 当前 `SalesOrderList` 中的删除动作仍依赖列表页 `orders.find()` 来找回 `status/version`
   - 若详情是通过 URL 直达、当前分页不含该订单、或筛选条件已将其排除，则可能出现详情中点击删除/作废但无法闭环执行的风险
   - 推荐改为：详情侧直接使用 authoritative `order` 数据完成删除/作废命令参数组装，不再依赖列表快照

2. **`sales-order-detail.tsx` 仍略偏厚**
   - 当前文件同时负责：详情查询、权限获取、mutation 组装、预览状态、内容编排
   - 这使它更像 detail orchestrator，而不是纯内容组件
   - 推荐进一步拆为：
     - `sales-order-detail.tsx`（或 `sales-order-detail-container.tsx`）：保留容器 / orchestration
     - `sales-order-detail-content.tsx`：保留纯内容编排与展示

#### 8.11 第二轮推荐目标

1. 让详情删除 / 作废链在详情上下文内闭环，不依赖外层列表快照
2. 继续强化“抽屉容器 / 详情容器 / 详情内容”三层职责分离
3. 保持现有抽屉交互与详情业务内容不变，只做结构收口，不再扩大到额外 UI 重做

#### 8.12 第二轮预计涉及文件

前端预计涉及：

1. `src/features/trading/components/sales-order-list-fixed.tsx`
2. `src/features/trading/components/sales-order-detail-sheet.tsx`
3. `src/features/trading/components/sales-order-detail.tsx`
4. 新增 `src/features/trading/components/sales-order-detail-content.tsx`
5. 视情况新增 `use-sales-order-detail-view-model.ts`（仅当容器仍显著偏厚时）

#### 8.13 第二轮风险与注意事项

1. 删除/作废链改到详情 authoritative 数据闭环时，要确保 `version` 使用的是详情最新值，避免乐观锁误用旧列表快照
2. 拆分 `sales-order-detail.tsx` 时要保证预览弹窗、权限动作、状态迁移与硬删除入口不退化
3. 本轮建议只做结构收口，不再继续叠加新的 UI 形态变化

#### 8.14 第二轮需要你确认的决策点

1. 是否确认继续修复详情删除/作废回流链，不再依赖列表页 `orders.find()`
2. 是否确认继续将 `sales-order-detail.tsx` 拆为容器层与内容层文件
3. 是否确认本轮只做结构收口，不再扩大到更多 UI 改造

### 9. plan：前端临时切到本地 Go 开发服务

日期：2026-04-15  
状态：待批准

#### 9.1 背景与目标

当前前端开发环境运行于 `127.0.0.1:5173`。根据现有配置，`/api` 请求默认经由 Vite 代理转发到 `localhost:8080`。已确认当前 `8080` 端口并非你刚修改源码后重新启动的本地 Go 开发服务，而是 Docker / nginx 承接的旧链路，因此销售订单页面仍拿到旧版 DTO，继续触发 `Missing fulfillmentRate from sales order DTO`。

本轮目标不是继续修改销售订单业务代码，而是将前端开发环境的 API 请求**临时切换到你本地真正的 Go 开发服务端口**，以便联调最新后端源码，并保留清晰的回退方式。

#### 9.2 关键约束（已确认）

1. 优先做“临时联调切换”，不破坏现有 Docker / nginx 的 `8080` 服务链路
2. 优先采用环境变量或开发代理配置实现，不在业务组件中硬编码 API 地址
3. 切换后必须可快速回退，避免影响你继续使用原容器链路

#### 9.3 推荐实施策略

1. 先识别你本地 Go 开发服务的实际监听端口
   - 若本地 Go 服务准备监听 `8081` / `18080` 等非 `8080` 端口，则前端开发代理应显式指向该端口
   - 若你计划停掉 Docker 占用并让 Go 服务接管 `8080`，则只需验证端口归属切换成功，无需改前端配置

2. 以前端开发配置为单一切换点
   - 优先检查并使用 `VITE_PROXY_TARGET`
   - 仅在确有需要时才使用 `VITE_API_BASE_URL`
   - 原则：本地开发模式下尽量保留 `/api` 相对路径，通过代理切换目标，避免引入跨域与环境分裂

3. 保持回退路径显式可见
   - 若新增/修改本地环境变量文件，应注明默认值与回退值
   - 若修改 `vite.config.ts`，必须保证不影响未设置环境变量时的默认链路

#### 9.4 预计涉及文件

1. `vite.config.ts`
2. 视现有环境文件情况，可能涉及：`.env.local`、`.env.development.local` 或其他本地开发环境变量文件
3. `walkthrough.md`

#### 9.5 风险与注意事项

1. 若直接改成绝对地址 `VITE_API_BASE_URL`，可能绕开现有代理语义并引入额外跨域差异，因此不作为首选
2. 若误改默认代理目标，可能影响你继续使用 Docker 链路进行其他功能联调
3. 若本地 Go 服务未实际启动或端口判断错误，前端切换后会从“旧数据错误”变成“连接失败”，因此必须先确认真实监听端口

#### 9.5.1 执行中发现的新增阻塞

1. 项目实际上已经提供了 Host Go 热调模式：
   - `pnpm run dev:server:debug`：将 Go 服务运行在 `18080`
   - `pnpm run dev:frontend:debug`：将前端代理指向 `http://localhost:18080`
2. 当前并不需要先修改前端配置文件，理论上可以直接利用上述脚本完成临时切换
3. 但执行 `pnpm run dev:server:debug` 时，Go 编译失败：
   - 文件：`server/services/logistics_vehicle_specs_service.go`
   - 问题：`VehicleSpecResponse` 已移除 `InnerLengthMm` / `InnerWidthMm` / `InnerHeightMm`，但 `buildVehicleSpecResponse()` 仍在 struct literal 中写入这 3 个旧字段
4. 该问题会直接阻断 Host Go 热调服务启动，因此必须先修复，才能继续本计划

#### 9.5.2 新增阻塞的处理策略

1. 本轮仅做最小兼容性修复：移除 `logistics_vehicle_specs_service.go` 中对已删除 `inner*` 字段的旧引用
2. 不在本轮扩大到物流车型前后端结构重构；仅恢复当前类型契约一致性与 Go 启动能力
3. 修复后重新执行 `pnpm run dev:server:debug`，确认 `18080` 成功监听，再继续前端切换验证

#### 9.6 验证方案

1. 启动前端后确认开发请求已命中目标本地 Go 服务端口
2. 打开销售订单列表，确认接口返回的 DTO 中存在 `fulfillmentRate`
3. 确认 `SalesOrderMaster` 不再触发 `Missing fulfillmentRate from sales order DTO`
4. 如需回退，恢复环境变量或代理目标后重新启动前端并验证旧链路恢复

#### 9.7 需要你确认的决策点

1. 是否确认本轮只做“前端 API 指向切换”，不继续修改销售订单业务代码
2. 是否确认优先采用 `VITE_PROXY_TARGET` 作为临时切换入口，而不是在业务代码里硬编码地址
3. 是否确认实施后会把具体回退方式同步记录到 `walkthrough.md`
4. 是否确认先插入一个最小后端兼容性修复，解除 `dev:server:debug` 的 Go 编译阻塞，再继续本轮前端联调切换

### 9. plan：物流模块新增“装载/配车计算”TAB（与物流供应商同级，先MOCK）

日期：2026-04-15  
状态：待批准
 

#### 3.1 背景与目标

在“物流”模块内新增一个与“物流供应商”同级的 TAB，用于展示“本批出货”的装箱汇总（箱数/体积/可选毛重），并基于车型规格库给出配车推荐。

当前阶段不具备完整车型库数据与真实算法，因此先使用 MOCK 数据与 MOCK 约束输出，目标是把页面结构、数据流和交互跑通，为后续接入真实数据与算法打基础。

#### 1.2 关键决策（已确认）

1. TAB 位置：物流模块内，与“物流供应商”同级
2. 车型规格数据：暂无真实数据，先 MOCK
3. 配车约束/计算：先 MOCK（占位）

#### 1.3 页面信息架构（MVP）

1. 出货汇总区（Summary）
   - 展示：总箱数、总体积、总毛重（如当前链路能拿到）
   - 数据来源：优先复用现有“物流规格/包装预览”汇总结果；若当前页面上下文拿不到，则先 MOCK 一个输入面板/示例数据（仅用于占位）

2. 车型规格区（Vehicle Specs）
   - 展示：车型列表（面包车/厢货/小货车/中货车等）
   - 字段（MOCK 即可）：载方(体积)、载重、内长宽高、厢式标记
   - 支持简单筛选：类别/最小载方/最小载重

3. 推荐结果区（Recommendation）
   - 当前先以 MOCK 结果占位：推荐车型、建议车辆数、推荐说明
   - 后续可替换为真实算法输出

#### 1.4 技术实现策略

1. 新增 TAB 入口
   - 在 `src/features/logistics-config`（或物流模块对应目录）内新增 Tab 页面组件
   - 与现有“物流供应商”并列挂载（复用同一 Tabs 容器/路由结构）

2. MOCK 数据组织
   - 前端新增常量 `MOCK_VEHICLE_SPECS`（数组）
   - 计算输出新增 `mockRecommendVehicles(summary, specs)`（先返回固定/规则化结果，便于替换）

3. 约束/算法占位
   - 页面上明确标注为“预估/占位”，避免误导
   - 代码结构上把“汇总输入 / 车型数据 / 计算”拆开，确保后续替换真实数据不会重写 UI

#### 1.5 预计涉及文件（待进一步结合现有物流模块结构细化）

1. `src/features/logistics-config/index.tsx`（Tab 容器/入口，新增一个 Tab）
2. `src/features/logistics-config/**`（新增一个 tab 页面组件，例如 `vehicle-loading-tab.tsx`）
3. （可能新增）`src/features/logistics-config/data/mock-vehicle-specs.ts`
4. （可能新增）`src/features/logistics-config/utils/vehicle-recommendation-mock.ts`

#### 1.6 风险与注意事项

1. 需要避免把 MOCK 逻辑散落在 JSX 中，后续替换会痛苦
2. 需要保证新增 TAB 不影响现有物流供应商 TAB 的行为
3. 需要避免“看起来像真实推荐”引发业务误用，文案/标识要明确为占位或预估

#### 1.7 非目标边界

1. 不做后端数据表/接口
2. 不做真实 3D 装载算法
3. 不做承运商报价/下单联动

### 10. plan：车型实拍图旁路弹窗（统一复用）

日期：2026-04-15  
状态：待批准

#### 10.1 背景与目标

当前物流侧已存在多个“展示车型”的位置，但都以文字规格为主：

1. `vehicle-specs-library-tab.tsx`：车型规格卡片
2. `vehicle-specs-table.tsx`：装载/配车页车型表格
3. `vehicle-recommendation-panel.tsx`：推荐车型结果卡片

你希望增加一个“旁路”的真实车型图片查看能力：不改主业务流程，不把图片塞进每个列表主体，而是通过一个统一按钮打开独立弹窗，查看某个车型对应的真实图片。

本轮目标是：建立一个**按 `vehicle.id` 绑定的可复用图片弹窗能力**，让所有展示车型的页面都能以统一入口打开“真实车型图片查看”。

#### 10.2 设计结论

1. 采用独立业务弹窗组件
   - 不复用现有“装载示意图弹窗”等业务弹窗实现
   - 可以继续使用底层 `Dialog` 基础设施，但业务层组件、布局和状态应独立维护
   - 原因：真实车型图片查看属于旁路媒体浏览，不应与装载示意逻辑耦合

2. 采用“图片清单 + 弹窗组件 + 触发入口”三层结构
   - 图片清单：按 `vehicle.id` 维护真实图片元数据
   - 弹窗组件：只负责展示标题、说明、图片列表/大图
   - 触发入口：在车型卡片、表格、推荐卡中复用统一按钮

3. 不把“真实图片”塞进车型主数据接口
   - 当前车型规格主数据负责尺寸/载方/约束等结构化字段
   - 图片属于富媒体展示层，先在前端做旁路映射，避免把本轮扩大成主数据接口重构

#### 10.3 推荐信息架构

建议为每个车型维护如下前端展示元数据：

1. `vehicleId`
2. `displayTitle`
3. `coverImageUrl`
4. `images[]`
   - `url`
   - `alt`
   - `viewType`（例如 `exterior` / `sideDoorOpen` / `rearDoorInterior`）
   - `caption`（可选）
   - `annotations[]`（可选）
     - `id`
     - `xPercent`
     - `yPercent`
     - `title`
     - `description`
     - `tag`（可选，例如“轮包”“尾门”“侧门”）
5. `description`（可选）
6. `tags`（可选，如“面包车/厢货/高栏/尾板”等）

这层数据建议与车型规格接口返回值保持松耦合，仅通过 `vehicle.id` 做关联。

同时建议每个车型至少准备 3 类图片：

1. 外观图
2. 侧门开启状态图
3. 尾门 / 内部空间图

#### 10.4 推荐实施策略

1. 新增图片清单文件
   - 例如：`src/features/logistics-config/vehicle-loading/data/vehicle-photo-manifest.ts`
   - 只导出按 `vehicle.id` 检索的图片与标注元数据，不承载 UI 状态

2. 新增独立弹窗组件
   - 例如：`src/features/logistics-config/vehicle-loading/components/vehicle-photo-dialog.tsx`
   - Props 建议：`open`、`onOpenChange`、`vehicle`、`photoEntry`
   - 支持：标题、说明、主图、缩略图/图片列表、当前图片标注层、空态提示

3. 新增统一触发按钮组件（可选但推荐）
   - 例如：`vehicle-photo-trigger-button.tsx`
   - 统一文案、图标和空图禁用/提示逻辑

4. 在以下入口接线
   - `vehicle-specs-library-tab.tsx`：每张车型卡增加“查看实车图”按钮
   - `vehicle-specs-table.tsx`：每行增加操作列或名称旁按钮
   - `vehicle-recommendation-panel.tsx`：与“查看示意图”并列增加“查看实车图”按钮

5. 状态收口建议
   - 在各自页面容器层维护 `selectedVehicle` 与 `photoDialogOpen`
   - 尽量避免在每个列表项内部各自维护一套弹窗状态

#### 10.5 预计涉及文件

1. `src/features/logistics-config/vehicle-specs-library-tab.tsx`
2. `src/features/logistics-config/vehicle-loading/components/vehicle-specs-table.tsx`
3. `src/features/logistics-config/vehicle-loading/components/vehicle-recommendation-panel.tsx`
4. 新增 `src/features/logistics-config/vehicle-loading/components/vehicle-photo-dialog.tsx`
5. （推荐新增）`src/features/logistics-config/vehicle-loading/components/vehicle-photo-trigger-button.tsx`
6. 新增 `src/features/logistics-config/vehicle-loading/data/vehicle-photo-manifest.ts`
7. 视需要补充 `locales/messages/zh-CN/logisticsConfig.ts` 与 `en-US/logisticsConfig.ts`

#### 10.6 资源组织建议

真实图片建议统一放在 `public/images/logistics/vehicles/` 下，再由前端图片清单显式引用：

1. 路径集中，便于后续替换/补图
2. 不与业务源码混放
3. 后续若切到后端可维护图片源，也能保留当前清单层作为适配器
4. 建议以 `vehicle.id/view-type-index` 形式做命名，便于同一车型维护多张视角图

#### 10.7 风险与注意事项

1. 若某车型暂时没有图片，弹窗应展示明确空态，而不是直接报错或隐藏车型
2. 当前 `vehicle-loading-tab.tsx` 与 `vehicle-specs.mock.ts` 仍存在旧 `inner*` 字段收口问题，本轮实施应尽量聚焦图片弹窗，不把多个结构修补混成大改
3. 表格列数增加后要注意移动端/窄屏表现，必要时优先采用“名称旁按钮”而不是新增独立宽操作列
4. 标注层坐标建议采用相对百分比而不是固定像素，避免图片在弹窗缩放时标注错位

#### 10.8 非目标边界

1. 不做车型图片上传后台
2. 不做后端图片管理接口
3. 不把图片字段写入当前车辆规格主数据 API
4. 不替代现有“查看示意图”弹窗
5. 不在本轮实现复杂图片标注编辑器；仅先支持静态 Metadata 标注展示

#### 10.9 需要你确认的决策点

1. 是否确认本轮先采用“前端静态图片清单 + `vehicle.id` 绑定”的旁路方案
2. 是否确认弹窗必须是独立业务弹窗，不复用现有“装载示意图弹窗”的业务实现
3. 是否确认优先接入 3 个入口：车型规格库卡片、车型规格表格、推荐结果卡片
4. 是否确认每个车型优先按“外观 / 侧门开启 / 尾门或内部空间”至少 3 类图片组织
5. 是否确认本轮先展示静态 Metadata 标注，不实现后台上传与在线编辑标注

#### 10.10 新增需求修订：车型规格库卡片内上传入口

在当前“只读查看 + 静态清单”方案基础上，你进一步明确：车型图片不应仅依赖手工修改清单文件来决定放在哪里，而应在**车型规格库页面的每个车型卡片内提供明确上传入口**。

你指定的交互约束为：

1. 上传入口放在每个车型卡片左侧
2. 用户在车型卡片上下文里直接上传，避免脱离车型语境再去选择归属位置
3. 上传结果仍然归属当前 `vehicle.id`，继续复用现有的“查看实车图”独立弹窗能力

#### 10.11 修订后的推荐实施策略

1. 在 `vehicle-specs-library-tab.tsx` 的车型卡片布局中预留左侧媒体操作区
   - 左侧：上传按钮 / 当前封面缩略图 / 图片数量摘要（如有）
   - 右侧：保留现有规格文字区与“查看实车图”按钮

2. 上传入口与查看弹窗分离
   - 上传入口负责“把图片挂到当前车型名下”
   - 查看弹窗继续负责“浏览多张图片与标注信息”
   - 两者共享同一 `vehicle.id` 归属模型，但不混成一个组件

3. 上传后的图片组织仍保持多视角模型
   - 外观图
   - 侧门开启图
   - 尾门 / 内部空间图
   - 必要时可在上传时要求选择 `viewType`，避免图片归类混乱

4. 存储与数据链需要进一步确认
   - 若仅做前端临时选择，本地刷新后会丢失，不满足“以后不用再想放哪里”的目标
   - 因此更合理的方向是：上传动作至少要落到可持久化的图片存储与映射层
   - 这意味着本轮很可能不再只是纯前端旁路，而需要补后端图片归属/保存链设计

#### 10.11.1 现有上传基础设施调研结论

1. 前端已存在通用资产上传服务：`src/services/asset-service.ts`
   - 调用：`POST /api/v1/assets/upload`
   - 返回：`url`、`fileName`、`size`

2. 后端已存在通用上传处理：`server/handlers/assets_upload.go`
   - 白名单允许图片后缀（jpg / jpeg / png / gif）
   - 文件落到服务器磁盘 `uploads/`
   - 返回 `/uploads/<uuid>.<ext>` 形式的访问 URL

3. 因此，本轮不需要重复发明“文件二进制上传”链路；更合理的是：
   - 继续复用通用资产上传完成物理文件保存
   - 新增“车型图片业务映射层”负责把 URL 绑定到具体 `vehicle.id`
   - 同时保存 `viewType`、排序、标题、标注元数据等业务字段

#### 10.11.2 修订后的推荐实施策略（更可落地）

1. 前端交互层
   - 在 `vehicle-specs-library-tab.tsx` 的每个车型卡片左侧新增媒体操作区
   - 左侧区至少包含：上传按钮、当前封面/占位缩略图、已挂图片数
   - 上传时要求选择或确定 `viewType`（外观 / 侧门开启 / 尾门或内部空间）

2. 文件上传层
   - 前端复用 `AssetService.uploadFile(file)` 完成真实图片上传
   - 不重复造第二套图片上传 transport

3. 业务归属层
   - 需要新增“车型图片记录”持久化结构，至少包含：
     - `vehicle_id`
     - `url`
     - `view_type`
     - `sort_order`
     - `title` / `caption`（可选）
     - `annotations_json`（静态标注数组）
   - 读取时返回给前端，继续喂给现有独立 `vehicle-photo-dialog.tsx`

4. 查看联动层
   - 上传成功后，当前车型卡片应能立即刷新图片状态
   - “查看实车图”弹窗应直接读取最新持久化结果，而不是继续只依赖本地静态清单

#### 10.11.3 推荐涉及文件（修订后）

除现有前端图片弹窗文件外，预计还会新增/修改：

1. 前端：
   - `src/features/logistics-config/vehicle-specs-library-tab.tsx`
   - `src/services/asset-service.ts`（大概率复用，无需大改）
   - 新增车型图片业务 service / query / mutation 文件（建议拆分独立文件）

2. 后端：
   - 新增车型图片模型 / DTO / handler / service / route
   - 读取与保存 `vehicle.id -> 图片集合` 的业务归属记录

3. 文档：
   - `task.md`
   - `walkthrough.md`

#### 10.12 由新增需求带来的风险与边界变化

1. 需求已从“只读图片查看”升级为“图片上传 + 归属绑定”，复杂度明显提升
2. 若没有后端持久化，仅在前端挂上传按钮会造成伪能力，不能满足长期使用目标
3. 若引入上传，需要明确：
   - 图片存储位置
   - `vehicle.id -> 图片集合` 的持久化结构
   - 上传后如何在查看弹窗中即时可见

#### 10.13 修订后的待确认决策点

1. 是否确认上传入口必须优先落在 `vehicle-specs-library-tab.tsx` 的每个车型卡片左侧
2. 是否确认本轮目标已从“只读旁路查看”扩大为“上传 + 归属绑定 + 查看联动”
3. 是否确认文件二进制上传复用现有 `AssetService` + `/assets/upload`，而不是另造一套上传 transport
4. 是否确认要补一层车型图片业务持久化结构，用于保存 `vehicle.id`、`viewType`、排序与 `annotations`
5. 是否确认本轮优先把上传入口放在车型规格库卡片左侧，其他页面先消费结果、不重复提供上传入口

### 12. plan：车型图片链路按 `GEMINI.md` 规范收口

日期：2026-04-15  
状态：待批准

#### 12.1 当前背景

车型图片上传/查看主链已经打通：

1. 后端已持久化 `LogisticsVehiclePhoto`
2. `GET /api/v1/logistics-config/vehicle-specs` 已返回 `photoEntry`
3. 前端已经通过 React Query 读取车型规格并在上传后失效刷新

但按 `GEMINI.md` 重新审视后，这条链路仍有几处规范偏差，主要集中在“后端权威”与 “Fail Loudly” 两个维度。

#### 12.2 当前问题归纳

##### 12.2.1 第二真相源仍然存在

当前 `use-vehicle-photo-dialog-state.ts` 仍有如下行为：

1. 优先读取 `selectedVehicle.photoEntry`
2. 若缺失，再回退到 `vehicle-photo-manifest.ts`

这会导致：

1. 前端保留第二套车型图片业务数据源
2. 当后端缺字段或漏返回时，UI 不会直接暴露契约问题，而会被本地 manifest 遮盖

这不符合 `GEMINI.md` 中“后端权威”与“禁止用空对象/空数组掩盖错误”的要求。

##### 12.2.2 响应 DTO 仍在静默补缺

当前 `vehicle-loading.schema.ts` 中：

1. `annotations` 使用 `.default([])`
2. `tags` 使用 `.default([])`
3. `images` 使用 `.default([])`

这意味着后端如果漏发这些字段，前端不会将其视为 contract drift，而会自动补成空数组。该行为与 `Fail Loudly` 直接冲突。

##### 12.2.3 `photoEntry` 契约仍偏宽松

当前前端把 `vehicleSpec.photoEntry` 定义为可选字段，但后端 `GetVehicleSpecsCatalog()` 实际上已经对每个车型都返回 `photoEntry`。这种“后端必返、前端可选”的不对齐会继续放大 fallback 逻辑的存在空间。

##### 12.2.4 图片实体缺少版本语义

当前 `LogisticsVehiclePhoto` 使用 `BaseModel`，但没有独立 `version` 字段。若后续扩展到：

1. 删除图片
2. 编辑 caption
3. 调整 sortOrder
4. 标注编辑

则会进入真正的可变主实体场景，与 `GEMINI.md` 中对主实体版本控制的约束不完全一致。

#### 12.3 推荐实施策略

本轮建议按 4 个修正规范点收口：

1. **移除车型图片业务数据 fallback**
   - 保留 `vehicle-photo-manifest.ts` 中共享类型与视角常量
   - 取消其作为图片业务数据提供者的职责
   - `use-vehicle-photo-dialog-state.ts` 只消费后端返回的 `photoEntry`

2. **移除响应 DTO 上的默认空数组兜底**
   - 将 `vehiclePhotoImageSchema` / `vehiclePhotoEntrySchema` 中的 `.default([])` 去掉
   - 让后端漏字段直接在 Zod parse 时暴露错误

3. **将 `photoEntry` 收紧为必返字段**
   - 后端继续保证每个车型返回完整 `photoEntry`
   - 前端 `vehicleSpecSchema`、`VehicleSpec` 类型改为 required
   - UI 对“有 `photoEntry` 但 `images` 为空”展示显式空态，而不是通过缺字段区分

4. **为车型图片实体补 `version`**
   - 在 `server/models/logistics_vehicle_photo.go` 增加 `Version int`
   - 在保存/映射响应时带出 `version`
   - 同步更新前端 `vehiclePhotoImageSchema` / DTO / type
   - 为后续排序、编辑、删除的并发控制预留契约基础

#### 12.4 预计涉及文件

预计优先涉及：

1. 后端：
   - `server/models/logistics_vehicle_photo.go`
   - `server/services/logistics_vehicle_photo_service.go`
   - `server/services/logistics_vehicle_specs_service.go`
   - `server/db/db.go`

2. 前端：
   - `src/features/logistics-config/vehicle-loading/data/vehicle-photo-manifest.ts`
   - `src/features/logistics-config/vehicle-loading/hooks/use-vehicle-photo-dialog-state.ts`
   - `src/features/logistics-config/vehicle-loading/services/vehicle-loading.schema.ts`
   - `src/features/logistics-config/vehicle-loading/data/vehicle-loading.types.ts`
   - `src/features/logistics-config/vehicle-loading/services/vehicle-photo-service.ts`
   - `src/features/logistics-config/vehicle-loading/services/vehicle-loading-service.ts`
   - 必要时：`src/features/logistics-config/vehicle-loading/components/vehicle-photo-dialog.tsx`
   - 必要时：`src/features/logistics-config/vehicle-loading/components/vehicle-photo-upload-panel.tsx`

3. 文档：
   - `task.md`
   - `walkthrough.md`

#### 12.5 风险与破坏性评估

本轮风险中等，主要在于：

1. 去掉 fallback 后，若后端响应不完整，前端会更早暴露错误；这是符合规范的有意收紧，但需要接受页面在契约漂移时 fail loudly
2. 为图片实体补 `version` 需要同步改模型、响应 DTO、前端 schema 与数据库迁移，不能只改其中一层
3. 若同时调整 `vehicle-loading-service.ts` 的 DTO 解析行为，需要确保不误伤车型推荐其它已有 mock/engine 逻辑

#### 12.6 非目标边界

本轮不做：

1. 不新增图片删除接口
2. 不新增图片排序或标注编辑 UI
3. 不重构车型规格主数据来源
4. 不将车型图片链路改造成 SDRTS / 离线写模型

#### 12.7 验证策略

建议按以下顺序验证：

1. `pnpm exec eslint` 针对车型图片相关前端文件
2. `pnpm exec tsc --noEmit`
3. `go test ./db ./handlers ./models ./routes ./services -run ^$`
4. 必要时补跑与车型规格/图片链路直接相关的后端定向测试

#### 12.8 当前阶段结论

车型图片主链已经具备持久化与 React Query 刷新能力，但还没有完全达到 `GEMINI.md` 对“后端权威”和“Fail Loudly”的要求。下一步应优先移除 manifest 数据兜底、收紧 DTO/schema 契约，并为图片实体补 `version`，把整条链路从“能用”收口到“契约严格一致”。

### 11. plan：清理 `server/scripts` 多 `main` 冲突与既有 Go 测试基座漂移

日期：2026-04-15  
状态：待批准

#### 11.1 当前背景

在车型图片接入完成后，定向编译已通过，但仓库级 `go test ./...` 仍暴露出两类既有问题：

1. `server/scripts` 目录下集中放置多个独立可执行脚本，每个文件都定义了 `main()`，导致 Go 在按包编译 `server/scripts` 时直接报重复入口。
2. 若干服务测试仍依赖手写 SQLite 表结构或公共 test schema helper，这些测试表定义没有完全跟上当前模型字段与 JSON 列约定，导致测试数据写入或扫描失败。

#### 11.2 当前问题归纳

##### 11.2.1 `server/scripts` 包冲突

当前目录中至少包含以下独立脚本：

1. `backfill_blank_product_skus.go`
2. `cleanup_cashier.go`
3. `cleanup_packaging_rules.go`
4. `diag_500.go`
5. `gen_db_pass.go`
6. `migrate_finance_dictionaries.go`
7. `purge_all.go`
8. `route_snapshot.go`

这些文件全部位于 `server/scripts` 同一包目录且都定义 `func main()`，因此：

1. 平时单文件运行也许可行
2. 但一旦执行 `go test ./...` 或包级编译，Go 会把它们视为同一个 package，直接触发 `main redeclared in this block`

##### 11.2.2 测试 schema / 字段漂移

目前已明确暴露的漂移点包括：

1. `server/services/purchase_transaction_service_test.go`
   - 该测试手写的 `suppliers` 表缺少 `we_chat / whats_app / facebook / instagram / telegram` 等列
   - 但 `models.Supplier` 与 `partner_transaction_service.go` 的保存逻辑已经会更新这些列
   - 结果是测试在 `Create(&models.Supplier{})` 或事务更新时直接报 `table suppliers has no column named we_chat`

2. `server/services/trading_test_schema_helper_test.go`
   - 其中 `sales_orders.evidences`、`purchase_orders.evidences` 目前使用的是历史兼容写法
   - `sales_order_flow_test.go` 在读取 `models.SalesOrder` 时触发 `unsupported Scan, storing driver.Value type string into type *json.RawMessage`
   - 说明 SQLite 测试列类型/默认值/扫描结果与当前模型 `json.RawMessage` 的读取预期并未完全对齐

#### 11.3 推荐实施策略

本轮建议分两条线清理，但保持“小步收口、优先修公共基座”：

1. **脚本目录线**
   - 将 `server/scripts` 下的各个独立脚本拆分到各自子目录，例如 `server/scripts/<script-name>/main.go`
   - 保持脚本内容与执行语义不变，仅解决包级编译冲突
   - 避免继续通过 build tags 或忽略测试来掩盖结构问题，优先让目录天然符合 Go 多二进制项目组织方式

2. **测试基座线**
   - 优先修 `purchase_transaction_service_test.go` 中手写 `suppliers` 表定义，使其与 `models.Supplier` 当前字段保持一致
   - 优先修 `trading_test_schema_helper_test.go` 中 `sales_orders` / `purchase_orders` 的 `evidences` 列定义与默认值
   - 若发现同类 helper 还存在 `json.RawMessage` / 新增字段漂移，按“测试表结构向真实模型契约看齐”的原则一并补齐
   - 尽量优先改公共 helper，而不是在单个测试里做更多局部例外

#### 11.4 预计涉及文件

预计优先涉及：

1. `server/scripts/*`
2. `server/services/purchase_transaction_service_test.go`
3. `server/services/trading_test_schema_helper_test.go`
4. 必要时：`server/services/sales_order_flow_test.go`
5. 必要时：其它直接手写 `CREATE TABLE suppliers` / `CREATE TABLE sales_orders` 的测试文件

#### 11.5 风险与破坏性评估

本轮属于仓库基座清理，风险中等，主要在于：

1. `server/scripts` 调整目录后，已有人工执行方式可能需要同步改成新的文件路径
2. 若只修一处测试但不收口公共 helper，仓库里仍可能留有同类隐患
3. 若测试依赖历史 SQLite 行为，简单改列类型后可能暴露更多隐藏的扫描/默认值问题

#### 11.6 非目标边界

本轮不做：

1. 不重写这些脚本的业务逻辑
2. 不顺手清理与本次失败无关的全部历史测试问题
3. 不把现有测试体系整体替换成另一套迁移/fixture 框架

#### 11.7 验证策略

建议按以下顺序验证：

1. `go test ./db ./handlers ./models ./routes ./services -run ^$`
2. `go test ./services -run 'Purchase|SalesOrder|Partner|Trading'`
3. `go test ./...`

若第 3 步仍有失败，需要在结果中明确区分：

1. 已被本轮修复的问题
2. 本轮清理后新增暴露但尚未纳入范围的问题
3. 与本轮目标无关的独立历史失败

### 1. plan：模板弹窗自适应高度与滚动策略优化

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

模板弹窗目前已经完成三列布局与头尾固定，但纵向空间分配仍然偏刚性。当前桌面端主体区域存在固定高度倾向，导致内容较少时也会出现冗余留白和无意义滚动条。

#### 1.2 当前问题归纳

##### 1.2.1 直接问题

当前问题不是横向布局，而是纵向高度策略过于固定：

1. 主体区和三列 grid 在桌面端使用了固定高度约束
2. 列容器采用 `overflow-y-auto`，在内容很少时也可能留下滚动上下文
3. 弹窗在轻内容场景下不够紧凑，仍显得过高

##### 1.2.2 目标体验

模板弹窗应体现为：

1. 内容少时自然收缩，不额外出现垂直滚动条
2. 内容多时仍有最大高度约束，避免超出屏幕
3. 头部和底部保持稳定，主体区仅在必要时滚动

#### 1.3 推荐实施策略

本轮建议从布局组件优先收口：

1. 重新检查 `DialogContent` 的 `max-h` 与主体区 `flex-1`、`overflow-y-auto` 配合
2. 将当前 `lg:h-[72vh]` 一类硬高度改为 `max-h` 或更柔性的自适应策略
3. 只在内容实际超过阈值时启用滚动，而不是默认创建高滚动容器
4. 必要时同步调整三列内层 `overflow-y-auto` 的启用条件

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/components/template-mgmt/template-editor-dialog-layout.tsx`
2. 必要时微调 `src/features/engineering/components/template-mgmt/template-editor-dialog.tsx`

#### 1.5 风险与破坏性评估

本轮风险较低，但需注意：

1. 不能让内容较多时丢失滚动能力
2. 不能导致头部或底部再次被主体区挤出可视范围
3. 不能因为取消固定高度而使三列对齐性明显变差

#### 1.6 非目标边界

本轮不做：

1. 不重排模板弹窗三列内容结构
2. 不调整模板主页卡片
3. 不修改模板保存、删除等业务逻辑

#### 1.7 当前阶段结论

模板弹窗已经具备稳定的横向结构，但纵向高度策略仍需继续收口。下一步应将固定高度改为更自适应的最大高度约束，避免轻内容场景下仍出现冗余垂直滚动条。

### 1. plan：模板主页预置模板禁止删除

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

模板主页会展示系统预置模板与普通模板卡片，但当前卡片上的删除按钮未区分模板类型，导致系统预置模板也暴露出可删除入口。

#### 1.2 当前问题归纳

##### 1.2.1 直接问题

当前问题不是布局，而是模板主页的删除权限表达错误：

1. 三个系统预置模板从业务上不应允许被随意删除
2. 卡片上仍显示可点击删除按钮，会误导用户
3. 如果不在页面层先限制，容易造成误操作预期

##### 1.2.2 目标体验

模板主页应明确区分：

1. 系统预置模板：可查看、可编辑，但不可删除
2. 用户自定义模板：可按原有流程删除

用户在预置模板卡片上应一眼看出“该模板不能删除”，而不是点下去才发现异常。

#### 1.3 推荐实施策略

本轮建议优先在模板主页卡片层做收口：

1. 在 `template-mgmt.tsx` 中判断模板是否属于系统预置模板
2. 对预置模板删除按钮改为禁用态或仅展示不可删提示
3. 对普通模板维持当前删除逻辑不变
4. 必要时补充 tooltip / 文案说明“系统预置模板不可删除”

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/tabs/template-mgmt.tsx`
2. 必要时补充本页使用的文案配置

#### 1.5 风险与破坏性评估

本轮风险较低，但需要注意：

1. 不能误伤普通模板的删除能力
2. 预置模板判断逻辑必须可维护，不能靠脆弱的临时字符串硬编码散落多处
3. 页面层禁用后仍需保持交互反馈清晰，避免用户误以为按钮失效是 bug

#### 1.6 非目标边界

本轮不做：

1. 不修改模板保存与创建逻辑
2. 不重构模板主页卡片整体样式
3. 不扩展到其它主数据页面的删除权限收口

#### 1.7 当前阶段结论

模板主页应明确保护系统预置模板，避免删除入口给出错误预期。下一步应在模板卡片层实现“预置模板不可删除”的禁用与提示策略。

### 1. plan：模板弹窗内部信息架构与三列内容重排

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

模板弹窗已经完成宽度放大、固定三列与布局/内容拆分，但当前列内信息组织仍然不够稳定：

1. 基础信息、装配说明、装配列表、预览内容的区块边界不够鲜明
2. 视觉上更像把原有内容横向摊开，而不是经过规划的编辑器结构
3. 继续只调尺寸已经不能解决“内容摆放杂乱”的问题

#### 1.2 当前问题归纳

##### 1.2.1 直接问题

当前问题不是宽度或裁切本身，而是模板弹窗三列内部的信息架构还没有收口：

1. 左列缺少“模板基础信息 / 模板身份摘要”的清晰层次
2. 中列缺少“装配操作区”与“装配结果区”的明确分离
3. 右列缺少“模板组件预览摘要”与“已装配属性预览”的稳定区块结构

##### 1.2.2 目标体验

模板弹窗应体现为一个结构明确的编辑器：

1. 左列：模板是什么
2. 中列：模板装配了什么、如何继续装配
3. 右列：当前模板最终会长成什么样

用户应能一眼分辨：

1. 哪里改基础信息
2. 哪里加/删属性分类
3. 哪里看最终结果

#### 1.3 推荐实施策略

本轮建议在已完成拆分的组件边界上继续做内容重排：

1. 在 `template-editor-dialog.tsx` 中为三列各自建立清晰的 section 分区
2. 左列增加模板身份摘要与基础字段分组
3. 中列拆成“装配操作条”与“已装配列表”两段
4. 右列拆成“模板规格摘要”与“装配结果预览”两段
5. 通过标题、说明、间距和容器层级统一视觉结构

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/components/template-mgmt/template-editor-dialog.tsx`
2. 必要时微调 `src/features/engineering/components/template-mgmt/template-editor-dialog-layout.tsx`

#### 1.5 风险与破坏性评估

本轮风险较低，主要是信息架构与前端展示重排，但需注意：

1. 不得破坏现有模板保存、装配、删除、required 切换行为
2. 不得把列内容重排成新的滚动陷阱或裁切问题
3. 必须维持当前已收口的固定三列布局稳定性

#### 1.6 非目标边界

本轮不做：

1. 不修改模板数据模型
2. 不新增拖拽排序或批量操作
3. 不调整产品类型页或产品编辑页布局
4. 不扩散到其它工程管理弹窗

#### 1.7 当前阶段结论

当前模板弹窗已经具备稳定的外层布局，但内部信息架构还未完成最后收口。下一步应对三列内部区块重新分组与排序，让弹窗真正成为可读、可用的模板编辑器。

### 1. plan：模板弹窗布局与内容解耦、固定三列重构

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

模板管理页已经支持模板属性装配与预览，但弹窗目前仍存在两个问题：

1. 预览列在当前固定布局尝试下仍然被裁切，显示不完整
2. `template-mgmt.tsx` 同时承载大量布局样式、三列 DOM 和编辑逻辑，导致每次调布局都在原文件上反复打补丁，稳定性差

#### 1.2 当前问题归纳

##### 1.2.1 直接问题

当前问题不是数据或保存逻辑异常，而是模板弹窗前端结构还没有完成布局与内容职责分离：

1. 弹窗容器宽度、三列比例、内部滚动策略和列内容都堆在同一个文件中
2. 预览列最小宽度与整体三列分配没有稳定收口，导致右侧内容被裁切
3. 属性装配项数量变化时，布局调优容易反复牵动整个弹窗结构

##### 1.2.2 目标体验

桌面端模板弹窗应收口为稳定的三列编辑器：

1. 左列：基础信息
2. 中列：属性装配
3. 右列：模板预览

并满足：

1. 外层宽度固定
2. 三列比例固定
3. 各列必要时独立滚动
4. 添加属性不会导致整体布局抖动或右列被裁切

#### 1.3 推荐实施策略

本轮建议停止在 `template-mgmt.tsx` 原地堆叠布局补丁，改为结构性收口：

1. 抽出模板弹窗专用布局组件文件，只负责 `DialogContent`、三列 grid、滚动区与尺寸策略
2. 将基础信息列、属性装配列、预览列通过明确 props/slots 挂入布局组件
3. `template-mgmt.tsx` 保留状态、查询、保存与事件编排，不再承载整段三列布局细节
4. 固定桌面端宽度与三列比例，同时为预览列设置稳定最小宽度，彻底消除裁切问题

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/tabs/template-mgmt.tsx`
2. 新增模板弹窗专用布局文件
3. 必要时新增模板弹窗内容片段文件

#### 1.5 风险与破坏性评估

本轮风险中低，主要是前端组件拆分与布局重构，但需注意：

1. 不得破坏模板保存、删除、装配增删与 required 切换语义
2. 拆分后 props 边界必须清晰，避免将状态管理重复散落到多个文件
3. 必须保留移动端/窄屏单列兜底，不让固定三列直接压坏小屏

#### 1.6 非目标边界

本轮不做：

1. 不修改模板数据模型
2. 不新增拖拽排序、折叠分组等新交互
3. 不重构产品类型页或产品编辑页
4. 不顺手处理无关工程页面样式

#### 1.7 当前阶段结论

当前模板弹窗问题已经不适合继续在单文件中局部调 class。下一步应先完成布局/内容职责拆分，再固定桌面端三列比例与预览列最小宽度，从结构上稳定模板弹窗表现。

### 1. plan：模板编辑弹窗桌面端宽度与布局修正

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前模板管理页已经支持模板属性装配与右侧基础预览，但弹窗在桌面端仍采用偏窄的容器宽度，导致：

1. 左侧基础字段区被压缩过窄
2. 中部属性装配区与右侧预览区可用宽度不足
3. 整体观感更接近“手机竖向长条弹层”，与桌面大屏使用场景不匹配

#### 1.2 当前问题归纳

##### 1.2.1 直接问题

当前问题不是数据错误，而是模板弹窗的桌面端布局没有针对大屏展开：

1. 弹窗整体 `max-width` 偏小
2. 内部列宽分配不合理，导致装配区与预览区都被压缩
3. 说明文本、按钮和预览卡片在同一窄列中竞争空间，造成拥挤和阅读负担

##### 1.2.2 预期体验

桌面端应优先体现“横向编辑器”体验：

1. 左侧放基础信息
2. 右侧放属性装配与模板预览
3. 让装配区和预览区拥有足够宽度，不再出现大段留白却内容区很窄的情况

#### 1.3 推荐实施策略

本轮建议做最小但直接有效的布局修正：

1. 放大模板编辑弹窗桌面端宽度，优先使用 `xl / 2xl` 级别容器
2. 将弹窗主体改为更明确的横向分栏布局，可采用 `1:2` 或 `2:3` 分栏
3. 为属性装配区和预览区设置合理最小宽度，必要时分别允许内部滚动
4. 保持移动端仍可回落为单列，不破坏小屏体验

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/tabs/template-mgmt.tsx`
2. 若出现文案密度问题，再评估是否调整少量 locale 文案

#### 1.5 风险与破坏性评估

本轮风险较低，主要是前端布局层调整，但需注意：

1. 不能破坏现有模板保存、删除、属性装配交互
2. 不能让移动端弹窗直接继承桌面宽度导致溢出
3. 若引入内部滚动，需要避免 footer 按钮被遮挡

#### 1.6 非目标边界

本轮不做：

1. 不新增模板装配排序与拖拽
2. 不修改模板数据模型或保存语义
3. 不扩散到产品类型页或产品编辑页布局
4. 不处理无关页面的样式问题

#### 1.7 当前阶段结论

当前问题本质是模板编辑弹窗未按桌面端编辑器场景设计宽度与分栏。下一步应先放大弹窗容器并重排内部分栏，让模板基础信息、属性装配与右侧预览在大屏下同时具备可读性。 

### 1. plan：产品型号编辑弹窗规格模板不回显修复

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

当前用户反馈：

1. 已存在的产品型号在“编辑产品规格”弹窗中，顶部“规格模板”字段为空
2. 中部规格区域未渲染模板表单，而是停留在“待选择规格模板”占位态
3. 产品模板管理页中的模板记录实际存在，且过程无任何报错提示

这说明问题更像是“编辑态模板绑定解析链路失效”，而不是“模板主数据不存在”。

#### 1.2 当前排查结论

##### 1.2.1 当前模板回显依赖链

当前前端链路如下：

1. `ProductPartsMgmt` 通过 `useProductMgmt()` 查询 `productTypes`
2. `ProductActionDialog` 在编辑时根据表单 `typeId`，从 `productTypes` 中找到 `selectedType`
3. 只有当 `selectedType.templateId` 存在时，才会调用 `getEffectiveTemplate(selectedType)`
4. 模板解析成功后：
   - 顶部“规格模板”输入框显示 `templateLabel`
   - 中部规格表单按 `componentKey` 渲染对应模板组件

##### 1.2.2 当前主要缺口

当前真实缺口不是模板数据缺失，而是弹窗上下文里的分类对象一旦缺少 `templateId`，界面就会静默退化：

1. `ProductActionDialog` 对 `selectedType.templateId` 为空的场景直接执行：
   - `setBoundTemplate(null)`
   - `setTemplateResolveError(null)`
2. 这会让 UI 看起来像“没有模板”，但不会暴露任何异常信息
3. 因此只要 `useProductMgmt -> ProductTypeService -> adapter/cache` 这条链中任一环节返回的是“缺少 `templateId` 的分类对象”，编辑态模板必然不回显

##### 1.2.3 当前高概率根因方向

高概率根因集中在以下链路：

1. `productTypes` 查询结果在进入编辑弹窗前，没有稳定保留 `templateId`
2. 可能存在 list/options DTO、归一化、缓存或树拍平过程中模板绑定字段被裁掉或覆盖
3. 当前组件对该异常缺少最小可观测性，导致页面仅表现为静默空白

#### 1.3 推荐实施策略

本轮建议最小且直达根因地处理：

1. 先修复 `productTypes` 进入编辑弹窗时的模板绑定完整性，确保 `selectedType.templateId` 可稳定获取
2. 复核 `ProductTypeService`、`product-type-api-adapter`、调用点查询方式，避免 list/options 查询口径不一致
3. 在 `ProductActionDialog` 中补充最小必要的容错/告警，避免再次无提示退化为“待选择规格模板”
4. 不改模板管理页，不重做规格表单组件结构，只修产品编辑回显链路

#### 1.4 预计涉及文件

预计优先涉及：

1. `src/features/engineering/hooks/use-product-mgmt.ts`
2. `src/features/engineering/components/product-action-dialog.tsx`
3. `src/features/engineering/services/product-type-service.ts`
4. `src/features/engineering/adapters/product-type-api-adapter.ts`
5. 必要时复核 `src/features/engineering/tabs/product-parts-mgmt.tsx`

#### 1.5 风险与破坏性评估

本轮风险较低，主要是前端查询与回显链路修复，但仍需注意：

1. 若 `productTypes` 同时被列表筛选、分类树、编辑弹窗共用，调整查询口径时不能破坏现有分类展示
2. 若模板绑定字段问题来自后端返回口径差异，需要避免前端只做表面补丁而掩盖契约问题
3. 若增加容错提示，需要保持编辑弹窗当前交互结构不被打乱

#### 1.6 非目标边界

本轮不做：

1. 不改产品模板管理页 UI 或录入逻辑
2. 不顺手重构产品规格模板组件
3. 不扩散到 BOM / Routing / 权限等无关模块
4. 不处理无关样式 warning

#### 1.7 当前阶段结论

当前问题更像是“产品编辑态读取到的分类对象缺少模板绑定信息”，而不是模板页没有数据。下一步应优先修复 `productTypes -> selectedType.templateId -> getEffectiveTemplate(...)` 这条链路，并补足最小可观测性，防止同类问题继续以静默空白方式出现。
日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

在 `engineering` 主线已经完成：

1. `718` Product / ChangeOrder 控制字段收口
2. `719` BOM / ECO 控制字段收口
3. `720` BOM 剩余控制字段收口
4. `721` ProductProcessRouting 版本控制字段收口
5. `722` BOM 剩余枚举/日期控制字段收口

之后，下一组更自然、且仍然属于同类“字段规范化收口”的模块，是 `production-shared` 中的机器码字段：

1. `ProductionLine.code`
2. `ProductionProcessStep.code`

#### 1.2 当前排查结论

##### 1.2.1 当前已经存在的规则

当前并不是完全没有规则，`production-shared` 域内已经具备：

1. `normalizeProductionLineCode(...)`
2. `normalizeProductionProcessStepCode(...)`
3. `normalizeProductionLineEntity(...)`
4. `normalizeProductionProcessStepEntity(...)`

并且已有局部接入：

1. `production-lines-service.ts` 保存边界已复用 `normalizeProductionLineEntity(...)`
2. `production-processes-service.ts` 保存边界已复用 `normalizeProductionProcessStepEntity(...)`
3. `production-resource-api-adapter.ts` DTO 边界已复用 `normalizeProductionLineCode / normalizeProductionProcessStepCode`

##### 1.2.2 当前主要缺口

当前真实问题不是缺少 helper，而是 line / process 页面边界仍有局部散落处理：

1. `line-dialog.tsx` 的输入边界、自动生成编号边界仍在局部处理
2. `process-library-panel.tsx` 提交前仍直接散落调用 `normalizeProductionProcessStepCode / normalizeProductionProcessStepEntity`
3. service / adapter 虽已接入 helper，但页面层与保存层之间还没有形成更清晰的单一入口语义

#### 1.3 推荐实施策略

本轮建议：

1. 保持 `production-code-normalization.ts` 作为 `production-shared` 机器码单一入口
2. 收口 line / process 的输入边界、提交前 payload 组装边界、service 保存边界、adapter DTO 边界
3. 去掉页面层重复散落的 code 规范化调用，让页面更多只表达用户输入与提交意图

#### 1.4 涉及文件

预计优先涉及：

1. `src/features/production-shared/utils/production-code-normalization.ts`
2. `src/features/production-shared/tabs/line-mgmt/components/line-dialog.tsx`
3. `src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx`
4. `src/features/production-shared/services/production-lines-service.ts`
5. `src/features/production-shared/services/production-processes-service.ts`
6. `src/features/production-shared/adapters/production-resource-api-adapter.ts`

#### 1.5 非目标边界

本轮不做：

1. 不扩到 `segments / jobCategories / attributes`
2. 不重做 line / process 页面 UI 结构
3. 不顺手改无关 `version / authCode / delta` 逻辑
4. 不处理无关样式 warning

#### 1.6 当前阶段结论

`production-shared` 的 `ProductionLine.code / ProductionProcessStep.code` 已经有域内 helper 和部分 service / adapter 接入，但页面输入与提交前边界仍然存在局部散落的规范化调用。下一步最合理的方式，是把这两个字段继续收口到 `production-code-normalization.ts` 统一入口，让 line / process 的输入、提交、保存、DTO 边界共享同一套口径，作为 `engineering` 主线之后最自然的相邻字段治理模块。

### 1. plan：BOM 剩余枚举/日期控制字段接入统一 helper

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

在已经完成：

1. `718` Product / ChangeOrder 控制字段收口
2. `719` BOM / ECO 控制字段 `bomNo / bomVersion` 收口
3. `720` BOM 剩余控制字段 `revisionNo / siteCode / changeOrderNo` 收口
4. `721` ProductProcessRouting 版本控制字段收口

之后，engineering 主线里下一组仍然自然留在 BOM 内、且规则已存在但边界未统一的字段，是：

1. `changeType`
2. `status`
3. `effectiveFrom`
4. `effectiveTo`

#### 1.2 当前排查结论

##### 1.2.1 当前已经存在的规则

当前并不是完全没有规则，底层已经具备：

1. `normalizeBomChangeType(...)`
2. `normalizeBomStatus(...)`
3. `normalizeBomEffectiveDate(...)`

并且 BOM 侧已有局部接入：

1. `bom-table.tsx` 展示列已使用这些 helper
2. `bom-preview.tsx` 预览视图已使用这些 helper
3. `schema.ts` 已对 `changeType / status / effectiveFrom / effectiveTo` 定义约束或默认值

##### 1.2.2 当前主要缺口

当前真实问题不是缺少规则，而是这组字段仍未接回 BOM 统一输入/保存入口：

1. `use-bom-form.ts` 默认值仍直接写死 `changeType: 'MANUAL' / status: 'active'`
2. `bom-form-header.tsx` 的 `changeType` 与日期输入还没有统一通过 BOM helper 收口
3. `normalizeBOMInput(...)` 当前尚未纳入这组字段
4. `bom-service.ts` 保存边界当前仍以 `trimToNull` 为主，没有明确复用 BOM 枚举/日期 helper

#### 1.3 推荐实施策略

本轮建议继续沿用 `719 / 720` 的收口方式：

1. 为 BOM 剩余枚举/日期控制字段补统一 helper 入口
2. 收口 BOM 默认值、输入边界、提交前 payload、service 保存边界
3. 保留表格/预览展示层继续复用底层 helper，但不再让表单与保存边界各自散落处理

#### 1.4 涉及文件

预计优先涉及：

1. `src/features/engineering/utils/product-code-normalization.ts`
2. `src/features/engineering/hooks/use-bom-form.ts`
3. `src/features/engineering/components/bom-editor/bom-form-header.tsx`
4. `src/features/engineering/tabs/bom-mgmt.tsx`
5. `src/features/engineering/services/bom-service.ts`

#### 1.5 非目标边界

本轮不做：

1. 不扩到 `items / substitutes`
2. 不改 BOM 表格/预览 UI 结构
3. 不顺手扩成 routing 或 Product 主线调整
4. 不处理无关样式 warning

#### 1.6 当前阶段结论

`BOM` 当前已经先后收口了 `bomNo / bomVersion` 以及 `revisionNo / siteCode / changeOrderNo`，但 `changeType / status / effectiveFrom / effectiveTo` 仍主要停留在“schema 有约束、展示层有 helper、表单与保存边界各自处理”的状态。下一步最合理的方式，就是把这组剩余枚举/日期字段也接回 `normalizeBOMInput(...)` 或相邻 BOM helper，让默认值、输入、提交、保存边界共享同一套口径，完成 BOM 控制字段主线的最后一段收口。

### 1. plan：ProductProcessRouting 版本控制字段接入统一 helper

日期：2026-04-13  
状态：待批准

#### 1.1 当前背景

在已经完成：

1. `718` Product / ChangeOrder 控制字段收口
2. `719` BOM / ECO 控制字段收口
3. `720` BOM 剩余控制字段收口

之后，engineering 中下一组较自然的版本/控制语义字段，是 `ProductProcessRouting` 里的：

1. `versionControlTag`
2. `isCurrentlyActiveBlueprint`

#### 1.2 当前排查结论

##### 1.2.1 当前已经存在的规则

当前并不是完全没有规则，至少已有：

1. `schema.ts` 中 `versionControlTag` 默认值为 `V1.0`
2. `schema.ts` 中 `isCurrentlyActiveBlueprint` 默认值为 `true`
3. `default-builders.ts` 中 `createProductRoutingDraft(...)` 默认值为：
   - `versionControlTag: 'V1.0.0.Draft'`
   - `isCurrentlyActiveBlueprint: true`

##### 1.2.2 当前主要缺口

当前真实问题不是字段缺少定义，而是 `ProductProcessRouting` 这条链路还没有像前几轮那样形成完整的 service / adapter / write hook 收口点：

1. 当前主要只有 `createProductRoutingDraft(...)` 在管理默认值
2. `product-routing-view.tsx` 仍是本地 state / mock 风格视图
3. 当前未找到明确的 routing save service、DTO adapter、write hook
4. 因此如果直接套用 `718/719/720` 那种“全链路保存边界收口”模板，容易过度假设现状

#### 1.3 推荐实施策略

本轮建议更保守地推进：

1. 先为 `ProductProcessRouting` 抽取版本控制字段统一 helper
2. 优先收口当前已经真实存在的边界：
   - schema/default draft
   - 当前视图 state
   - 显示口径
3. 不假设当前已经存在完整 routing 保存链路
4. 在后续真正出现 routing save service / adapter 之后，再继续往更完整的边界推进

#### 1.4 涉及文件

预计优先涉及：

1. `src/features/engineering/utils/product-code-normalization.ts` 或相邻 engineering helper 文件
2. `src/features/engineering/utils/default-builders.ts`
3. `src/features/engineering/components/product/product-routing-view.tsx`
4. 必要时复核 `src/features/engineering/data/schema.ts`

#### 1.5 非目标边界

本轮不做：

1. 不假造后端 routing save service
2. 不扩成 `routeNodes` 深层治理
3. 不把当前 mock 视图直接重构成完整编辑器
4. 不处理无关样式 warning

#### 1.6 当前阶段结论

`ProductProcessRouting` 的 `versionControlTag / isCurrentlyActiveBlueprint` 已经有零散默认值和展示位，但还没有形成像 `Product / ChangeOrder / BOM` 那样完整的输入-提交-保存链路。因此下一步最合理的方式，不是硬套完整收口模板，而是先把这两个字段提升成 engineering 域里的统一 helper，先收口 draft 默认值与当前视图 state 口径，再视后续真实保存链路是否出现决定下一层治理范围。

### 1. plan：`mold-core-service.ts#getGroupNames` 聚合下沉到后端接口

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前 `src/features/equipment-tooling/services/mold-core-service.ts` 中的 `getGroupNames()` 不是走后端聚合接口，而是：

1. 先调用 `getMolds()`
2. 全量拉取模具列表
3. 在前端执行 `map(groupName) + filter(Boolean) + Set 去重`

这意味着在大数据量场景下，组名聚合的计算重心错误地停留在前端，额外放大了网络传输与浏览器内存负担。

#### 1.2 当前排查结论

当前实查结果如下：

1. `MoldCoreService.getGroupNames()` 当前直接依赖 `getMolds()`，不是单独的聚合查询
2. `getMolds()` 最终调用的是后端 `GET /molds`
3. 后端 `server/handlers/molds.go` 当前提供：
   - `GET /molds`
   - `GET /molds/:id`
   - `GET /molds/check-sn`
   - `GET /molds/capacity`
   - 但没有“模具组名聚合”只读接口
4. `GET /molds?options=true` 仍返回全量模具记录，只是换成 options 口径，并未下推组名聚合
5. 当前至少有两个前端消费点依赖 `AssetService.getGroupNames()`：
   - `src/features/equipment-tooling/components/mold-action-dialog.tsx`
   - `src/features/engineering/hooks/use-product-form-init.ts`

#### 1.3 本轮目标

1. 让模具组名列表的 authority 回到后端
2. 避免前端为了拿组名而全量拉取所有模具记录
3. 保持前端消费 `string[]` 的契约尽量不变，降低调用点改造成本

#### 1.4 推荐实施方向

1. 在后端新增模具组名聚合只读接口，例如 `GET /molds/group-names`
2. 在 handler 中直接基于数据库做去重查询：
   - 只返回非空 `group_name`
   - 去重
   - 视情况排序，保证返回稳定
3. 前端 `MoldCoreService.getGroupNames()` 改为直接调用新接口
4. `AssetService.getGroupNames()` 保持现有导出形态，避免上层调用点大面积改签名

#### 1.5 预计涉及文件

预计优先涉及：

1. `server/handlers/molds.go`
2. `server/routes/routes_equipment.go`
3. 如需解耦，新增 `server/services` 下模具组名聚合查询文件
4. `src/features/equipment-tooling/services/mold-core-service.ts`
5. 必要时复核 `src/features/equipment-tooling/services/asset-service.ts`
6. 复核消费点：
   - `src/features/equipment-tooling/components/mold-action-dialog.tsx`
   - `src/features/engineering/hooks/use-product-form-init.ts`

#### 1.6 风险与注意点

1. 新接口必须保持 menu/equipment 权限口径与现有 `/molds` 一致，避免读权限漂移
2. 返回值应保持 `string[]` 或等价极简结构，避免把简单聚合又做成重 DTO
3. 若数据库中存在空字符串、空白字符串、大小写差异组名，需要明确是否在后端统一 trim / 过滤 / 排序
4. 不应继续复用 `/molds?options=true` 做“伪聚合”，否则只是换皮不换根因

#### 1.7 非目标边界

本轮不做：

1. 不重构整套模具列表分页接口
2. 不顺手改模具弹窗的数据加载方式
3. 不扩散到 drawing / capacity / loan 等无关 equipment 子模块
4. 不处理无关样式 warning

#### 1.8 验证策略

若进入实现，至少验证：

1. 后端新增组名聚合接口可返回去重后的模具组名列表
2. 前端 `getGroupNames()` 不再依赖全量 `getMolds()`
3. 模具弹窗与工程产品表单仍可正常读取组名选项
4. `go test ./handlers ./routes -run Mold` 或等价定向校验通过
5. `pnpm exec tsc --noEmit` 通过

#### 1.9 结论

这项问题的根因不在于“前端去重写法不够优雅”，而在于组名聚合 authority 放错了层。下一步应把模具组名去重与筛选收口到后端只读接口，让前端回归消费聚合结果，而不是继续承担全量取数后的二次计算。

### 1. plan：`mold-action-dialog.tsx` 读取链切换到 React Query

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前 `src/features/equipment-tooling/components/mold-action-dialog.tsx` 在弹窗打开时，仍通过 `useEffect` 手动读取服务端数据：

1. `AssetService.getGroupNames()`
2. `DrawingService.getDrawingsByMold(editData.sn)`

并把结果分别塞入本地 `useState`：

1. `groupNames`
2. `linkedDrawings`

这与“服务端真相归属于 React Query”的约束不一致，也让远端读链与表单本地 reset 副作用混在同一个 effect 中。

#### 1.2 当前排查结论

当前实查结果如下：

1. `mold-action-dialog.tsx` 的 `useEffect` 当前同时承担三类职责：
   - 远端读取 group names
   - 远端读取 linked drawings
   - 本地 `form.reset(...) / tracker.reset(...)`
2. `groupNames` 与 `linkedDrawings` 当前都以本地 state 形式存在，而不是 Query data
3. `DrawingService.getDrawingsByMold(moldSn)` 已经是稳定的服务层入口，适合直接接入 React Query
4. `AssetService.getGroupNames()` 现在也已切换到后端聚合接口，适合继续上接 React Query
5. 当前 equipment-tooling 域内虽然已有若干 `useQuery` 用法，但尚未为 mold dialog 抽出专门的 query hook

#### 1.3 本轮目标

1. 让 `groupNames` 与 `linkedDrawings` 的服务端真相归属于 React Query
2. 让 `mold-action-dialog.tsx` 不再在 `useEffect` 中手动 fetch 远端数据
3. 保留表单 reset / tracker reset 的本地副作用，但与远端读链解耦

#### 1.4 推荐实施方向

1. 新增 `useMoldGroupsQuery(open)`：
   - `enabled: open`
   - `queryFn: AssetService.getGroupNames`
2. 新增 `useMoldDrawingsQuery(open, moldSn)`：
   - `enabled: open && !!moldSn`
   - `queryFn: () => DrawingService.getDrawingsByMold(moldSn)`
   - 新建态直接返回空数组口径，不再手工 `Promise.resolve([])`
3. `mold-action-dialog.tsx` 去掉 `groupNames` / `linkedDrawings` 本地 state
4. 保留单独的 `useEffect` 只负责：
   - 根据 `editData` / `open` 执行 `form.reset(...)`
   - 执行 `tracker.reset(...)`

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/features/equipment-tooling/components/mold-action-dialog.tsx`
2. 新增 `src/features/equipment-tooling/hooks/use-mold-groups-query.ts`
3. 新增 `src/features/equipment-tooling/hooks/use-mold-drawings-query.ts`
4. 如需统一 key，复核 `src/features/equipment-tooling/hooks` 下现有 query key 组织
5. 必要时复核 `src/features/equipment-tooling/services/asset-service.ts`
6. 必要时复核 `src/features/equipment-tooling/services/drawing-service.ts`

#### 1.6 风险与注意点

1. 不要把表单 reset 逻辑也误并入 query hook，避免远端读链和本地表单生命周期再次耦合
2. 编辑态 / 新建态的 drawings 查询启用条件必须明确，避免空 `sn` 时发无效请求
3. 若 query 在关闭弹窗后保留缓存，要确保 reopened 时 UI 口径仍正确，不影响 reset 语义
4. 不把这次整改扩成整套 mold dialog 状态机重构

#### 1.7 非目标边界

本轮不做：

1. 不重构模具弹窗 UI 结构
2. 不顺手改保存 / duplicate check / onConfirm 写链
3. 不扩散到 drawing 管理页或 mold 管理页其它读链
4. 不处理无关样式 warning

#### 1.8 验证策略

若进入实现，至少验证：

1. `mold-action-dialog.tsx` 不再在 `useEffect` 中手动 fetch `groupNames` / `linkedDrawings`
2. `groupNames` 与 `linkedDrawings` 改由 query hook 提供
3. 新建态不请求 drawings，编辑态在有 `sn` 时正常读取 drawings
4. `pnpm exec tsc --noEmit` 通过
5. 定向 eslint 通过，若仅剩既有 warning 需在 `walkthrough.md` 记录

#### 1.9 结论

这项问题的根因不是“`useEffect` 里请求写得太长”，而是服务端真相的归属层级错误。下一步应把模具组名和关联图纸读取都收口到 React Query，让弹窗组件只负责消费 query 结果与管理本地表单重置，而不是继续手动编排远端读取。

### 1. plan：`linear-barcode-mgmt.tsx` fail loudly 与 UI 状态显式化

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前 `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx` 虽然已经用 `useQuery` 读取 `protocolConfig`，但组件本身仍保留了“默认配置先渲染、远端配置后水合”的结构：

1. `rules` 初始值为 `[]`
2. `mockInputs` 初始值为 `createDefaultLinearBarcodeMockInputs()`
3. 通过 `useEffect` 在 `protocolConfig` 返回后再执行 `setRules / setMockInputs`

这会让 UI 在 query 未就绪时先展示一套本地默认配置，形成 masking。

#### 1.2 当前排查结论

当前实查结果如下：

1. 当前问题不只是“API 失败时是否 fallback”，还包括加载阶段先用本地默认 `mockInputs / rules` 渲染
2. 文件里虽然已有 `if (error) return ...` 错误态，但主体渲染对加载阶段并没有严格 fail loudly，而是继续消费本地默认 state
3. `handleResetRules` 使用 `createDefaultLinearBarcodeProtocolConfig()` 作为“显式用户重置”是合理的，但它不应再承担远端加载失败或未加载时的伪 authority
4. 当前需要收口的是“配置读取真相归属”，不是删除所有 default builder

#### 1.3 本轮目标

1. 让线性条码配置真相直接归属于 React Query
2. UI 明确区分 loading / error / ready 三态
3. 移除加载链中的 masking，不再让默认配置伪装成远端已可用配置

#### 1.4 推荐实施方向

1. 去掉 `rules` / `mockInputs` 作为“远端配置镜像”的默认 hydration state
2. 由 query 数据派生 ready 态下的展示输入，或将本地可编辑草稿与 query 初值明确分层
3. 在 query 未就绪时显示明确 loading UI，而不是直接渲染模拟区默认配置
4. 在 query 失败时继续显示显式错误态，不再保留任何伪可用 fallback

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
2. `src/features/basic-settings/services/linear-barcode-protocol-service.ts`
3. 必要时复核 `src/features/basic-settings/data/linear-barcode-protocol.ts`
4. 必要时复核相关 simulation / rules 组件的入参契约

#### 1.6 风险与注意点

1. 不要误删“用户主动重置协议”为默认配置的能力，需区分 reset 与 load fallback
2. 若引入 ready 态后才渲染编辑区，要确保保存、重置、模拟链仍能正常工作
3. 不把这次整改扩成整套 linear-barcode 模块重构

#### 1.7 非目标边界

本轮不做：

1. 不重做 numberingService 或 protocol 后端接口
2. 不顺手改 appearance mapping / products 查询链
3. 不扩散到 dm-numbering 模块
4. 不处理无关样式 warning

#### 1.8 验证策略

若进入实现，至少验证：

1. query 未就绪时不再以默认 `mockInputs / rules` 伪装 ready UI
2. query 失败时显示显式错误态，而不是 fallback 配置
3. query 成功后编辑、保存、重置流程仍可正常工作
4. `pnpm exec tsc --noEmit` 通过
5. 定向 eslint 通过

#### 1.9 结论

这项问题的根因不在于“有没有 error 分支”，而在于加载阶段仍然让本地默认配置充当了远端 authority。下一步应把线性条码配置的 ready 条件严格绑定到 query 状态，由 UI 层显式展示 loading / error，而不是继续用默认配置做 masking。

### 1. plan：构建失败修复（`linear-barcode-mgmt.tsx` TS 收口 + `terminal-resource-service.ts` 引用漂移）

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前部署截图显示前端构建被 TypeScript 直接阻断，至少涉及两组明确问题：

1. `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
   - 存在未使用导入 `cn`
   - 存在未使用变量 `refetchProtocolConfig`
   - 渲染处 `protocolConfig.sequenceRuleKey` 的可空类型尚未完全收口
2. `src/features/terminal-config/services/terminal-resource-service.ts`
   - 当前引用 `@/lib/api-fetch`
   - 但仓库内不存在 `src/lib/api-fetch`
   - 实际 `apiFetch` 导出位于 `src/lib/api-client.ts`

这说明当前问题不是部署环境偶发，而是仓库内已经存在可稳定复现的编译级断点。

#### 1.2 当前排查结论

##### 1.2.1 `linear-barcode-mgmt.tsx` 的问题性质

当前 `linear-barcode-mgmt.tsx` 已处于“React Query 承担远端 authority，本地 state 承担编辑草稿”的方向上；本次报错更像是上一轮整改后的残留 TS 收口问题，而不是新的业务逻辑错误：

1. 未使用符号应直接移除，不能为了消警再伪造调用
2. `protocolConfig` 的 ready 语义虽已在 loading 分支中体现，但渲染点上的类型仍未完全让 TS 信服
3. 本轮修复必须保持“query 真相归属”方向不回退

##### 1.2.2 `terminal-resource-service.ts` 的问题性质

当前 `terminal-resource-service.ts` 的模块解析失败不是类型推断问题，而是明确的导入路径漂移：

1. 仓库内无 `src/lib/api-fetch`
2. 全局搜索可见 `apiFetch` 的真实导出位于 `src/lib/api-client.ts`
3. 因此正确方向应是修正引用口径，而不是额外补一个 `api-fetch` 别名文件遮盖漂移

##### 1.2.3 route tree 提示的处理口径

截图中还出现 route tree 生成提示：

1. `capture-route-component.tsx` “does not contain any route piece”
2. 当前截图里真正导致退出码为 2 的仍是后续 TypeScript error 汇总
3. 因此本轮先将其视为需复核的旁路告警，不在未证实阻断性的前提下顺手改路由结构

#### 1.3 本轮目标

1. 消除当前截图中的确定性 TypeScript 构建阻断项
2. 保持 `linear-barcode-mgmt.tsx` 已建立的 React Query authority 方向不回退
3. 修正 `terminal-resource-service.ts` 的模块引用漂移，而不是增加兼容层掩盖根因

#### 1.4 推荐实施方向

1. 在 `linear-barcode-mgmt.tsx` 中移除未使用符号
2. 在不改变现有 ready / loading / reset 语义的前提下，显式收紧 `protocolConfig` 的可空类型边界
3. 将 `terminal-resource-service.ts` 的 `apiFetch` 导入修正为真实导出位置
4. 实施后执行定向 `tsc` 或等价构建校验，确认截图中的 4 个编译错误全部消失

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/features/basic-settings/tabs/linear-barcode-mgmt.tsx`
2. `src/features/terminal-config/services/terminal-resource-service.ts`
3. 必要时复核 `src/lib/api-client.ts`
4. 必要时复核 route 生成提示对应文件，但仅限确认是否仍阻断构建

#### 1.6 风险与注意点

1. 不能为绕过 TS 报错而把 `linear-barcode-mgmt.tsx` 再改回默认配置 hydration 或 masking 结构
2. 不能通过新增 `src/lib/api-fetch` 转发文件来掩盖真实漂移，否则会继续扩散错误引用口径
3. 若 route tree 提示在修复 TS 后仍阻断构建，需要重新回到规划阶段补充影响范围

#### 1.7 非目标边界

本轮不做：

1. 不重构线性条码模块整体交互
2. 不顺手改 numbering / appearance / product 查询链
3. 不扩散到 terminal-config 其它 service 重写
4. 不处理与当前构建失败无关的历史 warning

#### 1.8 验证策略

若进入实现，至少验证：

1. `linear-barcode-mgmt.tsx` 不再出现未使用符号与可空类型报错
2. `terminal-resource-service.ts` 不再出现 `@/lib/api-fetch` 模块解析失败
3. `pnpm exec tsc --noEmit` 或等价前端构建校验通过
4. 如 route tree 提示仍存在，确认其是否仅为告警并在 `walkthrough.md` 记录

#### 1.9 结论

这次部署失败的根因不是“服务器构建机偶发异常”，而是仓库内已经存在稳定的编译断点：一部分来自 `linear-barcode-mgmt.tsx` 的整改后 TS 收口未完成，另一部分来自 `terminal-resource-service.ts` 的导入路径漂移。下一步应先完成这两处根因修复，再复核 route tree 提示是否仍需单独处理。

### 1. plan：`useSalesOrderInit` 水合迁移到 query + 稳定 defaultValues 边界

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前 `src/features/trading/hooks/use-sales-order-init.ts` 通过 `useEffect` 执行销售订单初始化：

1. 编辑态：直接 `setFormData(initialOrder)`
2. 新建态：异步调用 `numberingService.previewContractBarcode(...)`
3. 然后再批量 `setFormData(...)`

同时 `useSalesOrderForm` 里还通过 `useDeltaTracker` 持有 `formData`，再暴露一个 `setFormData` shim 给 `useSalesOrderInit` 回填。

#### 1.2 当前排查结论

当前实查结果如下：

1. `useSalesOrderInit` 当前是典型的 effect hydration：远端/异步初值在渲染后再补写进表单状态
2. `useSalesOrderForm` 的初始化真相目前分散在：
   - `DEFAULT_ORDER`
   - `memoizedInitial`
   - `useDeltaTracker(...)`
   - `useSalesOrderInit(...)`
3. 新建态条码预览属于服务端/异步读取，更适合交给 query authority，而不是 effect 直接改表单 state
4. 当前风险不一定已经表现为 bug，但边界不稳定，后续容易引发 hydration/reset/脏状态判断问题

#### 1.3 本轮目标

1. 让销售订单初始化的异步读取归属于 query
2. 让表单默认值边界更稳定，减少 effect hydration
3. 保持现有保存、校验、行编辑逻辑语义不变

#### 1.4 推荐实施方向

1. 为新建态默认条码预览引入 `useQuery`
2. 根据 `initialOrder` / preview barcode / 默认分类 派生更稳定的初始表单值
3. 让 `useSalesOrderForm` 直接消费稳定初始值，尽量移除 `useSalesOrderInit` 的 effect 水合职责
4. 如确需保留局部 reset，也应仅在明确边界下执行，而不是承担主初始化 authority

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/features/trading/hooks/use-sales-order-init.ts`
2. `src/features/trading/hooks/use-sales-order-form.ts`
3. 如需拆分，新增 trading hooks 下的 sales-order init query 文件
4. 必要时复核 `src/features/basic-settings/services/numbering-service.ts`

#### 1.6 风险与注意点

1. 不要破坏 `useDeltaTracker` 当前的脏状态判断语义
2. 编辑态不能被新建态条码预览 query 误伤
3. 若改 defaultValues 边界，要确保 dialog reopen / initialOrder 切换时口径稳定
4. 不把这次整改扩成整套 sales order form 重构

#### 1.7 非目标边界

本轮不做：

1. 不重写销售订单保存链
2. 不顺手改 `useSalesOrderOps` 行编辑逻辑
3. 不扩散到 purchase order 初始化链
4. 不处理无关样式 warning

#### 1.8 验证策略

若进入实现，至少验证：

1. 新建态初始化不再依赖 `useEffect` 异步补写主表单 state
2. 编辑态仍能稳定回填既有订单数据
3. 条码预览、分类切换、保存前正式生成条码流程仍保持正确
4. `pnpm exec tsc --noEmit` 通过
5. 定向 eslint 通过

#### 1.9 结论

这项问题的根因不是“`useSalesOrderInit` 代码短不短”，而是初始化 authority 被分散到了 effect、tracker 和默认对象之间。下一步应把异步初值收回 query，把表单主初值收口到更稳定的 defaultValues 边界，减少 hydration 风险。

### 1. plan：快捷扫描“个人拍照 / 个人录视频”入口改为更接近直开摄像头

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前右侧快捷扫描面板里的“个人拍照 / 个人录视频”入口，表面上属于“快捷采集”，但点击后用户仍会明显感知到先进入个人缓冲区采集页，而不是像原生相机一样直接拉起摄像头或录制能力。

#### 1.2 当前排查结论

当前实查结果如下：

1. `src/features/quick-actions/data/quick-action-registry.ts` 中两条入口当前都指向 `/personal-workbench/capture`，只通过 `search.mode=photo|video` 区分模式
2. `src/features/quick-actions/components/quick-action-drawer.tsx` 点击时只执行 `navigate(...)`，并没有在用户点击当次直接桥接采集动作
3. `src/features/personal-workbench/capture/index.tsx` 当前是“个人缓冲区快捷采集页”，页面内包含草稿队列、整理动作、清理动作与缓冲区说明文案，心智上属于中间工作台
4. `src/features/personal-workbench/components/personal-workbench-image-picker.tsx` 当前拍照入口通过 `useEffect + setTimeout + input.click()` 尝试自动拉起文件选择；录视频入口则通过 effect 自动进入录制准备态，但不直接开始录制
5. 由于真正调用 `input.click()` 或 `getUserMedia()` 的时机发生在路由跳转后的页面 effect 中，移动端浏览器通常不会把这视为“同一次用户手势”，因此体验上不会是“点了就直接打开相机”

#### 1.3 本轮目标

1. 让“个人拍照 / 个人录视频”入口更接近用户预期的直开摄像头体验
2. 减少 capture 页作为缓冲区工作台的中间页感知
3. 保留个人缓冲区草稿链与后续整理能力，不破坏现有数据流

#### 1.4 推荐实施方向

1. 收敛 `/personal-workbench/capture` 页的职责，使其更偏“采集壳层”而不是“缓冲区工作台”
2. 优先把拍照/录像拉起动作绑定到页面首屏可执行的直接采集 UI，减少依赖异步 effect 的自动点击
3. 对拍照与录视频分别评估：
   - 拍照是否应优先使用更直接的相机 input / capture 方案
   - 录视频是否应在进入页后立即进入可录制相机态，并弱化缓冲区整理文案
4. 若浏览器安全策略无法保证“导航后自动拉起”，则应显式优化为更纯粹的采集页，并尽量减少“像进入缓冲区页面”的认知噪音

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/features/quick-actions/components/quick-action-drawer.tsx`
2. `src/features/quick-actions/data/quick-action-registry.ts`
3. `src/features/personal-workbench/capture/index.tsx`
4. `src/features/personal-workbench/components/personal-workbench-image-picker.tsx`
5. 必要时复核 `src/routes/_authenticated/personal-workbench/capture-route-component.tsx`

#### 1.6 风险与注意点

1. 不要承诺超出 Web 平台能力边界的“绝对直接调起原生相机”，尤其是在 iOS / Android WebView / 非 PWA 场景
2. 不要为了追求直开而破坏当前个人缓冲区草稿保存链
3. 录视频能力受 `MediaRecorder`、HTTPS、浏览器权限策略影响，需要保留能力检测与降级
4. 不把这次整改扩成整套个人缓冲区重构

#### 1.7 非目标边界

本轮不做：

1. 不重写个人缓冲区后端协议
2. 不扩展多端同步、草稿中心或批量管理
3. 不承诺直接写入手机桌面文件系统
4. 不重做快捷扫描面板全部交互

#### 1.8 验证策略

若进入实现，至少验证：

1. 点击“个人拍照”后，移动端体验不再先显著落到缓冲区工作台心智页面
2. 点击“个人录视频”后，进入的是明确的录制采集态，而不是缓冲区整理态
3. 采集成功后仍能进入个人缓冲区草稿/记录整理链
4. `pnpm exec tsc --noEmit` 通过
5. 定向 eslint 通过

#### 1.9 结论

这项问题的根因不是“快捷入口文案写错了”，而是入口点击与真正采集动作被路由跳转分隔开了，导致移动端用户手势丢失；同时 `capture` 页又承担了缓冲区工作台职责，进一步放大了“不是直拍”的感知。下一步应优先收敛 capture 页为采集壳层，并把直拍/直录体验尽量绑定在更接近用户点击的链路上。

#### 1.10 根据最新确认补充的产品边界

用户已进一步明确：

1. “个人拍照” = 独立新建入口
2. “个人录视频” = 独立新建入口
3. “个人缓冲区” = 单独查看 / 整理历史草稿入口

这意味着：

1. `个人拍照 / 个人录视频` 不应读取或消费历史 `queuedDrafts`
2. `capture` 页不应继续展示“待整理草稿、稍后处理、清理已整理”等缓冲区工作台语义
3. 底层允许继续使用临时本地草稿作为技术桥接，但这只能服务“本次新建采集 -> 打开编辑器”，不能把“个人缓冲区”产品心智混入新建入口

#### 1.11 最新实施收口方向

基于上述边界，本轮应继续收口为：

1. `src/components/layout/nav-group.tsx` 中，分类标题通过 `SidebarGroupLabel className='... text-inherit'` 继承了外层按钮的文字色
2. 外层按钮当前使用 `text-sidebar-foreground/85`、`hover:text-sidebar-accent-foreground`、`isExpanded && text-sidebar-accent-foreground` 等颜色，因此分类文字会和菜单级文字过于接近
3. `src/components/ui/sidebar.tsx` 的 `SidebarGroupLabel` 默认样式本身已经使用 `text-sidebar-foreground/50`，说明 sidebar 组件体系已经具备主题化层级色能力
4. 因此更合理的方向不是硬编码新颜色，而是基于 `sidebar-*` token 为分类容器和标题重新建立一层与菜单项可区分的视觉层级

#### 1.3 本轮目标

1. 让侧边栏分类一眼可被识别为“分类层”
2. 保持具体菜单项维持当前可读性与 active 语义
3. 确保亮色 / 暗色模式都自动对齐现有 sidebar 主题体系

#### 1.4 推荐实施方向

1. 调整 `src/components/layout/nav-group.tsx` 中分类按钮容器样式，使其拥有独立但克制的层级底色
2. 去掉分类标题的 `text-inherit`，改为使用 `text-sidebar-foreground/*` 或等价 sidebar token
3. 保留 hover / expanded 态，但避免分类标题色与菜单项文字色完全一致
4. 优先在现有 `sidebar-*` 主题变量体系内完成，不增加脱离主题系统的硬编码色值

#### 1.5 预计涉及文件

预计优先涉及：

1. `src/components/layout/nav-group.tsx`
2. 若确有必要，再复核 `src/components/ui/sidebar.tsx`

#### 1.6 风险与注意点

1. 不要为了区分层级而破坏当前 active 可读性
2. 不要引入只适配亮色模式的硬编码颜色
3. 不要顺手重做整个 sidebar 视觉体系

#### 1.7 非目标边界

本轮不做：

1. 不修改路由或 active 逻辑
2. 不调整菜单项图标语义
3. 不改 sidebar 数据结构

#### 1.8 验证策略

若进入实现，至少验证：

1. 全部分组展开时，分类卡片与菜单项层级一眼可分
2. 暗色 / 亮色模式下分类卡片与文字仍与 sidebar 主题一致
3. `pnpm exec tsc --noEmit` 通过
4. 定向 eslint 通过

#### 1.9 结论

这项需求的关键不是“换一个更花的颜色”，而是给侧边栏分类建立稳定的主题化层级视觉。下一步应优先在 `nav-group.tsx` 中利用现有 `sidebar-*` token 收口分类容器与标题的层级色，让分类与菜单项在亮暗模式下都清晰分层。

### 1. plan：`/terminal-config/scanners` 扫码能力模组与物流配置边界分析

日期：2026-04-14  
状态：分析中

#### 1.1 当前背景

用户提出的问题不是单点 UI 文案，而是信息架构与模块边界问题：

1. `/terminal-config/scanners` 页面中的“扫码能力模组”当前显示“已接入”
2. 需要确认该“已接入”是否真实对应采购/销售里的物流链路
3. 若物流相关能力和设置已经散落在多个页面/模块，需评估是否应独立成“物流”分类，并以多 TAB 壳层统一承载

#### 1.2 当前排查重点

本轮重点不在于直接改页面，而在于先查清真实结构：

1. `scanner-devices.tsx` 中“扫码能力模组”实际挂载了哪些插件与 catalog 项
2. `logistics-inbound` 当前的宿主究竟是采购物流、销售物流，还是仅 catalog 层面的展示
3. 现有物流能力是否已经分散在：
   - `purchase-logistics`
   - `features/logistics`
   - `scan-platform`
   - `sandbox/logistics-api`
4. 当前“物流设置”究竟是业务操作页、终端扫码接入页，还是供应商/API 配置页混杂

#### 1.3 分析目标

1. 明确 `/terminal-config/scanners` 的扫码能力模组与真实业务宿主的映射关系
2. 明确采购物流与销售/交易物流当前是否共用一套能力模型
3. 判断“物流是否应独立为分类 + 多 TAB 模块”是否有充分结构依据

#### 1.4 预期输出

分析完成后应给出：

1. 当前真实结构图（终端资源 / 扫码能力 / 采购物流 / 交易物流 / 配置 sandbox）
2. 当前最大问题是“展示已接入但业务边界未统一”、还是“模块本身就不该放在 scanners”
3. 推荐方向：
   - 保持现状
   - 在 terminal-config 下新增物流分类
   - 或将物流独立成正式模块并以多 TAB 承载配置/扫码/供应商/API 接入

#### 1.5 非目标边界

本轮不做：

1. 不直接修改 `/terminal-config/scanners` UI
2. 不直接迁移现有物流路由
3. 不顺手合并采购物流与交易物流代码

#### 1.6 当前阶段结论（待分析完成后补充）

当前初步迹象表明：`/terminal-config/scanners` 的“扫码能力模组”已经不仅是设备资源展示，而是开始承载 `scan-platform` 插件目录；其中 `logistics-inbound` 很可能只绑定采购物流宿主，而非覆盖采购/销售统一物流。下一步需要继续核对 `purchase-logistics` 的实际接入深度，以及 `features/logistics` 与 `sandbox/logistics-api` 的配置职责，才能决定是否应收口为独立“物流”分类或多 TAB 模块。

### 1. plan：侧边栏独立“物流”分类（集合信息与扫描配置中心）

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

基于本轮分析与用户最新确认，当前问题已经不是“`/terminal-config/scanners` 文案是否准确”，而是物流相关的配置型信息缺少一个稳定、清晰、可交接的统一入口。

用户明确要求：

1. 新增一个侧边栏独立分类承载“物流”
2. 该分类主要用于放“集合信息与配置”，而不是新的业务操作流
3. 重点承载：
   - 物流供应商/承运商信息
   - 国内/国际物流网站或平台入口
   - 联系人、电话、备注
   - 扫描配置/扫码模组接入说明
4. 保持现有 `/purchase/logistics` 与 `/trading/logistics` 业务页不动

#### 1.2 当前排查结论

当前实查结果可归纳为：

1. `/terminal-config/scanners` 当前混合了两类语义：
   - 扫码设备/终端资源
   - `scan-platform` 业务扫码能力目录
2. `scan-platform` 中的 `logistics-inbound` 当前只明确指向采购物流宿主（`/purchase/logistics`），并不能代表采购/销售物流统一接入完成
3. 物流配置型信息当前已分散在多个位置：
   - `purchase-logistics`：采购物流绑定与离线草稿
   - `features/logistics`：交易/销售物流管理
   - `scan-platform`：扫码插件与宿主说明
   - `sandbox/logistics-api`：物流 provider / endpoint / 模板配置
4. 继续把这类信息挂在 `terminal-config/scanners` 下，会使“终端资源”和“物流配置中心”边界持续混淆

#### 1.3 本轮目标

1. 为物流配置型信息建立一个独立、稳定、易交接的侧边栏分类
2. 让物流供应商资料、平台入口、联系人信息与扫描配置不再散落各处
3. 不影响现有采购物流、销售/交易物流的业务流程页面

#### 1.4 推荐信息架构

建议新增侧边栏独立分类：`物流`

该分类下建议先承载一个正式模块页，并采用多 TAB 壳层，初步建议如下：

1. `物流供应商`
   - 承运商/服务商名称
   - 国内/国际分类
   - 官网/平台入口
   - 联系人
   - 电话
   - 对接备注
2. `扫描配置`
   - 物流相关扫码模组目录
   - 当前宿主说明（采购物流宿主、后续销售物流宿主等）
   - 权限、接入状态、推荐终端
   - 是否已真实接线、是否仅骨架就位
3. `接口/平台`
   - API endpoint
   - 平台账号/凭证占位
   - 模板/供应商接入参数
   - 后续国际物流平台扩展位

#### 1.5 模块边界约束

本轮必须严格保持以下边界：

1. 不迁移或重构 `/purchase/logistics`
2. 不迁移或重构 `/trading/logistics`
3. 不把新模块做成“新的物流业务操作中心”
4. 新模块只承载：
   - 集合信息
   - 配置
   - 扫描接入说明
   - 平台/供应商资料

#### 1.6 预计涉及文件（若进入实现）

预计优先涉及：

1. `src/components/layout/data/sidebar-data.ts`
2. 侧边栏/路由挂载相关文件
3. 新增 `src/features/logistics-config` 或等价目录承载独立模块
4. 新增该模块下的多 TAB 页面、数据契约与展示组件
5. 必要时复用/迁移 `sandbox/logistics-api` 的 provider 配置能力，但不改原有采购/销售物流业务页

#### 1.7 风险与注意点

1. 不要把“物流配置中心”误做成“物流业务页第二套入口”
2. 不要把采购物流与交易物流的业务状态、时间线、绑定动作硬塞入该模块
3. 若要复用 `sandbox/logistics-api`，需先明确它是实验页、过渡页还是正式配置源，避免双入口并存
4. 扫描配置 TAB 中必须清楚区分：
   - 已真实接入
   - 仅骨架就位
   - 尚未接线

#### 1.8 非目标边界

本轮不做：

1. 不修改现有采购物流提交流程
2. 不修改现有交易/销售物流提交流程
3. 不顺手统一采购物流与交易物流的数据模型
4. 不重构 `scan-platform` 全部插件体系

#### 1.9 验证策略

若进入实现，至少验证：

1. 侧边栏已出现独立的“物流”分类入口
2. 新模块的 TAB 能清晰区分“供应商资料 / 扫描配置 / 接口平台”三类信息
3. 现有 `/purchase/logistics` 与 `/trading/logistics` 路由和业务行为保持不变
4. `pnpm exec tsc --noEmit` 通过

#### 1.10 当前阶段结论

结合用户最新确认，当前最合理的方向不是继续把物流相关信息挂在 `terminal-config/scanners` 下，也不是去动现有采购/销售物流业务页，而是新增一个侧边栏独立“物流”分类，作为“集合信息与扫描配置中心”。该模块应采用多 TAB 结构统一承载物流供应商、网站/联系人/电话、接口平台与扫描配置说明，让后续接手者能在一个清晰的域入口中看全物流配置资产。

### 1. plan：物流模块新增“包装规则”TAB（先做包装规则主数据）

日期：2026-04-14  
状态：待批准

#### 1.1 当前背景

当前物流相关诉求中，已经明确需要一套可复用的包装规则真相来源，用于描述：

1. 包装尺寸有多大
2. 包装净重/毛重是多少
3. 单个包装可装多少产品/物料
4. 哪些产品/规格适用该包装规则

当前这部分需求应先沉淀为“包装规则主数据中心”，而不是直接联动销售订单、出货单或物流费用估算。否则会在基础定义尚未稳定前，把预算、执行、费用三个层级混在一起。

#### 1.2 当前约束与排查结论

##### 1.2.1 单位口径

本轮已确认：

1. 包装规则模块不自建单位体系
2. 尺寸单位、重量单位、容量单位统一复用系统现有单位引擎
3. 包装规则记录只保存单位标识，显示名称与换算逻辑由单位引擎提供

##### 1.2.2 拼装口径

本轮已确认：

1. 包装规则模块不重复维护第二套拼装/BOM 关系
2. 包装组成与拼装关系统一调用物料管理中的拼装引擎
3. 包装规则模块只承担“规则编排层”，不复制底层物料拼装结构

##### 1.2.3 当前建议的模块职责

当前更合理的模块定位不是“物流预算”，而是“包装规则”主数据 TAB：

1. 负责维护包装尺寸、净重、毛重、容量、适用范围等规则
2. 负责维护一条规则可适用哪些产品/物料/规格
3. 为后续销售、出货、物流预算、装箱单等链路提供统一读取来源
4. 当前不承担订单聚合、出货执行、承运商管理与物流费用估算

#### 1.3 本轮目标

1. 在物流模块下新增“包装规则”TAB 的规划与实现方案
2. 建立包装规则主数据模型，统一承载包装尺寸、净重、毛重、单包装容量与适用物料配置
3. 明确后续链路统一通过“包装规则 + 单位引擎 + 物料拼装引擎”组合取数
4. 不在本轮引入销售订单、出货单、物流费用的业务联动

#### 1.4 推荐实施方向

1. 前端新增“包装规则”TAB，作为物流模块下的独立主数据页
2. 后端新增包装规则头与包装规则适用明细的数据模型/接口边界
3. 规则头维护：
   - 规则编码
   - 规则名称
   - 包装类型
   - 长/宽/高及对应单位标识
   - 净重/毛重及对应单位标识
   - 启用状态
   - 备注
4. 规则适用明细维护：
   - 产品/物料
   - 规格/型号
   - 单包装容量值
   - 容量单位标识
   - 默认规则标记
   - 排序
5. 体积不作为手工主录字段，统一由长宽高计算，避免与尺寸字段不一致
6. 页面能力先聚焦：
   - 规则列表
   - 新增/编辑规则
   - 启停规则
   - 复制规则
   - 在规则内动态增删适用产品/物料配置行

#### 1.5 预计涉及文件

预计优先涉及：

1. 物流模块对应的前端 tab 注册与页面文件
2. 新增 `src/features/...` 下包装规则相关 contracts / services / hooks / components
3. 现有单位引擎调用入口
4. 现有物料管理拼装引擎调用入口
5. `server/models` 下包装规则相关模型文件
6. `server/services` 下包装规则 service / dto / mapper
7. `server/handlers` 下包装规则 handler
8. `server/routes` 下包装规则 route

#### 1.6 风险与注意点

1. 一个产品/规格在同一时刻若允许多条默认启用规则，后续读取会产生歧义，因此需明确默认规则唯一性约束
2. 毛重与净重定义必须统一，否则后续包装预算、出货与物流估算会出现语义漂移
3. 不能使用自由文本单位或自由文本包装描述代替结构化字段，否则后续无法稳定聚合与换算
4. 不能在包装规则模块内部复制单位体系或拼装体系，否则会形成第二套 authority

#### 1.7 非目标边界

本轮不做：

1. 不联动销售订单
2. 不联动出货单
3. 不做物流费用估算
4. 不做实际装箱执行
5. 不顺手扩成承运商、柜型、运输策略等完整物流管理模块

#### 1.8 验证策略

若进入实现，至少验证：

1. 包装规则可以稳定维护尺寸、净重、毛重、容量与适用物料范围
2. 单位字段均来自系统现有单位引擎，而不是本地自由输入
3. 包装规则模块没有重复维护第二套拼装结构，而是通过既有物料拼装引擎获取能力
4. 一个产品/规格的默认启用规则口径明确、可校验
5. 文档、实现与 `walkthrough.md` 保持同步

#### 1.9 结论

当前最合理的推进方式，不是直接做物流预算或销售/出货联动，而是先把“包装规则”做成清晰的主数据中心：包装规则模块负责规则编排，单位统一复用现有单位引擎，拼装统一复用物料管理拼装引擎。待这层真相来源稳定后，再由后续链路按统一口径读取并扩展。

---

## 2. 包装纯计算模块（多箱规边缘计算）规划（中文）

### 2.1 目标

新增一个独立的前端纯计算模块，负责处理“同一产品存在多个包装规格”时的装箱方案推导问题。典型场景包括：

1. 一个产品同时存在 `5` 个装、`10` 个装等多个包装定义
2. 订单数量不是单一箱规的整倍数，例如 `505`
3. 订单页、出货页、打印预览都需要读取同一套装箱推导结果

该模块本轮只负责“计算真相”，不直接耦合销售订单 UI、不直接持久化计算结果。

### 2.2 实施原则

1. 必须是纯函数模块，不依赖 React hooks、组件状态、请求副作用或浏览器环境
2. 必须接收结构化输入，而不是在函数内部自行拉取包装规则或产品信息
3. 必须可被多个消费方复用，包括包装规则页预览、销售订单卡片、出货页、打印预览
4. 必须先定义默认策略，再预留未来扩展策略位，避免把算法写死在页面事件里

### 2.3 建议落点

建议新增独立文件，优先放在物流包装规则同域下，例如：

1. `src/features/logistics-config/packaging-calculator.ts`

后续若包装成为独立域模块，再考虑迁移到更通用的位置；本轮先以“低迁移成本 + 高复用纯函数”优先。

### 2.4 输入与输出建议

#### 输入

建议至少包含：

1. `orderedQuantity`：订单数量
2. `productWeight`：产品单重
3. `profiles`：当前产品可选包装规则列表
4. 每条规则至少含：
   - `profileId`
   - `profileName`
   - `capacity`
   - `netWeight`
   - `length`
   - `width`
   - `height`
   - `dimensionUnitCode`
   - `weightUnitCode`

#### 输出

建议输出统一结果对象，包括：

1. `strategy`：本次使用的策略标识
2. `lines`：每种箱规被分配的箱数、承载件数、尾箱信息
3. `packedQuantity`：已装箱数量
4. `remainderQuantity`：剩余未装数量
5. `boxCount`：总箱数
6. `totalVolume`：总体积
7. `totalGrossWeight`：总毛重
8. `isExactMatch`：是否恰好无余数
9. `warnings`：如无规则、容量非法、单位不一致等告警

### 2.5 默认算法建议

本轮建议先采用“优先减少总箱数”的默认策略：

1. 按容量从大到小排序候选包装规则
2. 优先使用大箱规进行整除拆分
3. 若无法完全整除，再继续向下尝试更小箱规
4. 若仍有余数，则输出剩余未装数量，或按后续业务规则标记为尾箱/待人工处理

以 `505` 件、存在 `10` 个装和 `5` 个装为例：

1. 先使用 `10` 个装：得到 `50` 箱，余 `5`
2. 再使用 `5` 个装：得到 `1` 箱，余 `0`
3. 输出 `51` 箱、无未装余数

### 2.6 风险与边界

1. 若多个包装规则单位不一致，体积与重量汇总会失真，因此计算前需校验单位口径
2. 若存在容量为 `0` 或非法负数的规则，必须显式过滤并输出告警，不能静默参与计算
3. 若未来出现多个策略（最少箱数、最低包装重、最低体积、指定优先级），必须避免直接破坏当前函数签名
4. 本轮不做组合爆搜优化器；若后续箱规很多，再评估更复杂的最优解算法

### 2.7 非目标

本轮不做：

1. 不把结果直接写回订单数据库
2. 不在销售订单页直接接入 UI
3. 不做出货执行落库快照
4. 不做后端同步算法实现
5. 不做人工装箱拖拽或手动覆写交互

### 2.8 验证策略

若进入实现，至少验证：

1. 单一箱规可正确计算整箱数、余数、毛重、体积
2. 多箱规组合场景下可正确输出如 `505 = 50 * 10 + 1 * 5`
3. 无匹配规则、容量非法、数量为 `0` 等异常输入可稳定返回显式结果而非崩溃
  4. 纯函数模块不依赖 React/请求副作用，可单独被测试与复用
  5. 执行定向 TypeScript 校验，并在实现后同步更新 `walkthrough.md`

  ### 2.9 结论

  在真正联动销售订单或出货页面之前，先抽离“包装纯计算模块”是合理的。这样可以先稳定“多箱规边缘计算”的算法真相，再让订单卡片、出货页和打印预览统一消费，避免每个页面各写一套 `505` 件如何拆成 `10` 个装 + `5` 个装的重复逻辑。

---

## 3. 订单侧独立包装预览卡片能力规划（中文）

### 3.1 目标

订单侧后续不只会展示包装预览，还可能持续挂接更多协同动作，例如缺料提醒、指定账号通知、外部触达能力。因此本轮不应把包装展示逻辑直接揉进销售订单明细表格，而应把它抽象成一个可独立挂载的卡片能力。

该能力的核心目标是：

1. 让订单详情页、订单列表卡片、后续出货页都可以复用同一套包装预览消费层
2. 让包装计算、数据适配、展示外壳三层分离，避免未来继续把订单侧能力堆进单一组件
3. 为后续动作型扩展保留统一承载位，而不是每新增一个动作就侵入改造订单主表格

### 3.2 建议分层

建议拆成以下三层：

1. `calculator` 层：继续复用现有纯函数 `packaging-calculator.ts`，只负责装箱真相计算
2. `adapter / hook` 层：把订单行、产品重量、包装规则映射成卡片可消费的轻量视图模型
3. `card / panel` 层：只负责展示与动作插槽，不持有包装计算细节

这样订单详情页或订单列表只负责传入订单上下文并挂载卡片，而不直接参与包装规则过滤、箱规拆分或重量体积计算。

### 3.3 建议落点

为保持后续可扩展与可解耦，建议采用独立文件组织：

1. `src/features/trading/hooks/use-sales-order-packaging-preview.ts`
2. `src/features/trading/components/parts/sales-order-packaging-preview-card.tsx`
3. 如需进一步解耦，可追加 `src/features/trading/adapters/sales-order-packaging-preview-adapter.ts`

其中：

1. `hook` 负责 React Query 聚合包装规则与产品基础数据，并调用纯计算模块
2. `adapter` 负责把原始计算结果整理成适合订单卡片显示的字段
3. `card` 负责 UI 呈现，并预留未来动作区插槽

### 3.4 数据边界

订单侧独立卡片建议只依赖以下输入：

1. 订单或订单行基础数据：`productId`、`productModel`、`qty`、`uom`
2. 产品基础数据：至少包含产品单重
3. 包装规则主数据：当前产品所绑定的候选包装定义

卡片层不应直接请求微信发送、消息推送或缺料判断结果。本轮只处理包装预览真相与展示适配；后续动作能力应作为并列扩展位接入。

### 3.5 展示模型建议

建议卡片层统一消费如下信息：

1. 每个订单行的推荐箱规组合
2. 预估总箱数
3. 余数 / 尾箱信息
4. 预估总体积
5. 预估总毛重
6. 告警信息，例如无包装规则、单位不一致、无法整除

同时可再汇总一层订单级摘要，用于订单卡片或详情页概览展示。

### 3.6 后续动作扩展位

为满足后续扩展，建议卡片组件预留独立动作区域，但本轮只做结构预留，不接入真实业务动作：

1. 缺物料时发送给指定账号
2. 拉起微信或其他外部触达动作
3. 生成待办、通知、提醒或协同任务

这些动作未来应作为“订单侧独立卡片能力”的并列扩展，不应反向侵入包装计算模块。

### 3.7 风险与约束

1. 若直接把包装 UI 塞回订单表格，未来新增动作会导致表格持续膨胀，维护成本高
2. 若 `hook` 同时承担展示和动作编排，会再次形成新的耦合中心，因此应控制其职责边界
3. 若订单列表与订单详情直接复制两套卡片逻辑，后续扩展会出现行为漂移，因此必须共用同一消费层

### 3.8 本轮非目标

本轮不做：

1. 不接入真实微信发送
2. 不实现账号通知派发链路
3. 不做缺料判断引擎
4. 不改订单数据库持久化结构

### 3.9 结论

订单侧包装能力应被设计成“可独立挂载的卡片能力”，包装预览只是第一种消费者。这样后续无论接缺料提醒、账号通知还是微信触达，都可以沿着同一扩展槽位演进，而不必持续侵入销售订单列表或详情主表格。

---

## 4. 订单列表卡片挂载独立包装预览能力规划（中文）

### 4.1 目标

在已完成订单详情页首挂载的基础上，将独立包装预览能力继续挂到订单列表卡片中，但保持“列表只看摘要、详情看展开”的职责分层。

### 4.2 实施原则

1. 列表卡片必须复用现有订单侧包装预览 `hook / adapter`
2. 列表场景不复制详情页完整卡片结构，只展示高价值摘要
3. 不把包装计算逻辑回塞进订单列表主卡片内部

### 4.3 建议展示收口

订单列表卡片建议优先展示：

1. 预估总箱数
2. 预估总体积
3. 预估总毛重
4. 告警数 / 未匹配行数

如需完整箱规组合与逐行拆分明细，仍由订单详情页承载。

### 4.4 风险与约束

1. 若列表页直接复刻详情页卡片，会导致卡片过高、信息噪音过大
2. 若为列表页单独再写一套包装聚合逻辑，会造成后续详情/列表结果漂移
3. 列表卡片只应挂载摘要消费者，不应成为新的逻辑拼装中心

### 4.5 结论

订单列表卡片接入包装预览时，应只挂载独立能力的轻量摘要视图；包装真相与详细展示仍统一收口到现有消费层与详情页卡片，避免再次产生双轨实现。

---

## 5. 产品型号模板字段丢失链路排查规划（中文）

### 5.1 目标

针对当前产品编辑弹窗中出现的模板绑定异常与“至少 3 个字段缺失”问题，沿着后端到前端的完整链路排查根因，明确到底是字段本身没有被读取、接口没有返回、前端 adapter 没映射，还是此前重构把字段在初始化链路中覆盖掉了。

### 5.2 排查范围

本轮重点核对以下几层：

1. 后端产品模型与查询预加载是否包含模板绑定相关字段
2. 产品详情接口 DTO 是否把模板字段完整输出
3. 前端 `product-api-adapter` 是否把模板字段完整映射进 `Product`
4. 产品编辑弹窗 / init hook / form hook 是否在 reset 或派生阶段把字段丢失
5. 模板解析 fallback 逻辑是否只是暴露了上游字段缺失，而不是问题本体

### 5.3 关注字段

本轮至少核对以下模板相关字段在各层是否完整存在：

1. `templateId`
2. `templateKey`
3. `resolvedTemplateId`
4. `resolvedTemplateKey`
5. `templateResolutionSource`
6. `templateResolutionError`

如排查中发现“胎型”等业务字段实际是通过模板解析链派生出来，也需把其上游字段口径一并梳理清楚。

### 5.4 实施原则

1. 优先确认 authoritative source 在哪一层丢失，不做 UI 层猜测性回填
2. 若后端接口已返回而前端丢失，则修前端适配/初始化链
3. 若后端接口本身未返回，则优先修后端 DTO/查询链，而不是在前端拼装伪状态
4. 最终结论必须能指出“字段首次丢失的位置”

### 5.5 产出要求

排查完成后，至少输出：

1. 受影响字段清单
2. 每个字段在“模型 / DTO / adapter / form init / dialog”各层的存在情况
3. 首次丢失位置
4. 建议修复点与最小修复面

### 5.6 结论

这类模板绑定问题不能只看弹窗 warning。本轮应先把产品模板字段从后端到前端的完整链路跑通，确认字段首次丢失点，再决定修复落在查询、DTO、adapter 还是表单初始化阶段。

## 6. 产品属性脏数据治理与模板接线方案

### 6.1 背景

当前“产品属性配置”页维护的是全局属性分类与属性项字典，本身不带模板绑定语义；而产品编辑弹窗中的模板规格区又依赖 `product type -> template` 解析链。与此同时，属性项表中已出现同一分类下仅大小写不同、但归一后等价的历史重复机器值，导致下拉候选项重复、中文显示一致，放大了用户对“模板字段/型号字段整体丢失”的感知。

基于当前排查结果，本轮修复优先级调整为：先做属性脏数据治理（P2），在属性字典恢复单一机器值口径后，再设计模板与产品属性之间的接线方案。

### 6.2 第一阶段目标：产品属性脏数据治理

1. 盘点 `product_attribute_options` 中所有归一后冲突的数据组，至少覆盖：
   - 同一 `categoryKey` 下 `Hooked / hooked`、`Tubular / tubular`、`Lightweight / lightweight` 这一类仅大小写不同的重复项
   - 归一化后值相同、但中文/英文标签存在轻微差异的候选项
2. 明确每组冲突项的治理策略：
   - 保留哪一条作为 canonical option
   - 哪些旧值需要迁移引用或软删除/删除
   - 是否需要补齐统一的英文标签命名
3. 防止复发：
   - 继续沿用前后端已有的机器值归一化逻辑
   - 评估是否需要增加数据库级唯一性保护或治理脚本，避免历史脏数据再次写入
4. 验证结果：
   - 属性配置页不再出现仅大小写不同的重复项
   - 产品表单属性下拉不再展示重复选项

### 6.3 第二阶段目标：模板与产品属性接线方案

在脏数据治理完成后，再收口模板与属性的职责边界，避免带着脏数据直接做新绑定，导致错误被固化。

接线方案需优先回答以下问题：

1. 目标关系应落在哪一层：
   - 方案 A：模板直接绑定属性分类/属性项
   - 方案 B：保留现有“模板 -> 产品类型 -> 属性绑定”链，只增强类型绑定生成/继承机制
2. “模板规格组件”与“产品属性字典/类型属性绑定”的职责如何划分：
   - 模板规格组件负责结构化规格 UI 与模板专属字段
   - 属性字典负责标准下拉候选项
   - 类型属性绑定负责某个产品类型启用哪些标准属性分类
3. 是否需要模板层生成或校验产品类型属性绑定：
   - 若模板是 authoritative source，则需说明绑定同步时机与覆盖策略
   - 若产品类型仍是 authoritative source，则模板只负责规格渲染，不直接改写属性字典

### 6.4 推荐方向

推荐优先考虑方案 B：

1. 不把“产品属性配置页”直接改造成模板页，继续保持其作为全局字典维护入口
2. 不让模板直接持有属性项数据，避免模板层与属性字典层形成双向重复维护
3. 若模板确实需要约束某类产品应暴露哪些属性分类，应让模板影响“产品类型属性绑定”的生成或校验，而不是绕开产品类型直接接属性项表
4. 模板解析失败时，应显式暴露“模板链问题”；属性字典重复时，应显式暴露“数据治理问题”，避免两个问题在 UI 层混成一个现象

### 6.4.1 接线设计结论

本轮修订后的关系定义为：

1. `产品属性配置页`：维护全局属性分类与选项，定位为“标准属性素材库”
2. `产品模板页`：负责模板结构装配，可从全局属性素材库中选择性接入属性分类，并提供模板实时预览
3. `产品类型页`：选择模板，并将模板装配结构落地为“最终生效绑定”，允许少量人工覆写
4. `产品编辑页`：只消费所属产品类型的最终生效结构，并填写 `attributeValues`

换言之，模板不应再是黑盒。模板页本身必须成为“结构编辑器 + 属性装配器 + 预览器”；而运行时动态属性区的直接 authority 仍然是产品类型最终生效绑定。

### 6.4.2 推荐的数据模型扩展

建议新增一层“模板属性装配结构”，而不是只存一个抽象建议数组：

1. 可选实现 A：
   - 新增 `product_template_attribute_bindings`
   - 字段建议至少包括：`template_id`、`category_key`、`sort_order`、`required`、`active`
   - 预留扩展字段：`section_key` / `group_key`、`display_mode`
2. 可选实现 B：
   - 在模板表或模板扩展字段中保存 `assembledAttributeCategoryKeys`
   - 更轻量，但后续若要支持预览分区、必填、排序、展示模式，会较快失去结构化能力

推荐优先使用实现 A，因为它既能支撑模板页实时预览，也与现有 `product_type_attribute_bindings` 结构同构，后续便于做“模板装配结构 -> 类型最终生效绑定”的 diff、同步、审计与提示。

### 6.4.3 Authority 与覆盖规则

建议采用如下 authority 规则：

1. `属性字典` 是“素材库真相源”，负责维护标准分类与 option
2. `模板属性装配结构` 是“模板结构真相源”，负责定义模板在预览中长什么样，以及接入哪些属性分类
3. `产品类型属性绑定` 是“运行时真相源”，负责决定产品编辑页到底显示哪些动态属性

覆盖规则建议如下：

1. 模板装配变更后，不自动静默覆盖所有使用该模板的产品类型绑定
2. 产品类型页应提供显式动作，例如“按模板重建绑定”或“从模板补齐缺失项”
3. 若产品类型绑定与模板装配结构不一致，UI 只提示“已偏离模板定义”，但不阻止保存
4. 若产品类型尚未做任何人工调整，可允许一次性全量采用模板装配结构

### 6.4.4 读取链设计

读取链保持以下边界：

1. 模板读取链：
   - `模板自身字段 + 模板属性装配结构 + 全局属性素材库`
   - 用于模板页左侧配置区与右侧预览区实时渲染
2. 动态属性读取链：
   - `产品 -> 产品类型 -> 产品类型属性绑定 -> 属性分类/属性选项`
   - 用于产品编辑弹窗动态属性区渲染
3. 一致性提示链：
   - `产品类型 -> 模板属性装配结构`
   - 与 `产品类型属性绑定` 做 diff
   - 生成“缺少哪些模板装配项 / 多了哪些人工扩展项”的只读提示

这样可以避免“模板不可预览”与“运行时绑定缺失”再次被混成同一个问题。

### 6.4.5 写入链设计

写入链建议拆开处理：

1. 模板页：
   - 保存模板自身字段
   - 保存模板属性装配结构
   - 不直接写 `product_type_attribute_bindings`
2. 产品类型页：
   - 保存 `templateId`
   - 保存产品类型最终属性绑定
   - 可触发“从模板装配结构同步”动作，将模板结构复制为当前类型绑定草稿
3. 产品编辑页：
   - 仅保存 `attributeValues`
   - 不直接修改模板或产品类型绑定

### 6.4.6 UI / 交互建议

1. 模板管理页：
   - 增加“属性装配区”与“实时预览区”
   - 选择对象是 `ProductAttributeCategory`
   - 不直接选择具体 option 值，而是装配分类级结构
   - 允许调整排序、必填、分区（分区可先留接口后实现）
2. 产品类型管理页：
   - 显示当前模板解析结果
   - 显示“模板装配结构”与“当前类型属性绑定”的差异
   - 提供“按模板覆盖同步”与“仅补齐缺失项”两种显式动作（二选一即可先做其一）
3. 产品编辑弹窗：
   - 若模板存在但产品类型绑定为空，可提示“当前类型尚未同步模板结构”
   - 若绑定已偏离模板定义，可显示只读 badge 或提示文案，不阻断编辑

### 6.5 风险与约束

### 6.5 风险与约束

1. 若直接删除重复属性项，必须先确认是否已有产品 `attributeValues.optionValue` 引用了旧值；否则会造成历史产品数据悬挂
2. 若引入模板到属性的自动同步，必须避免覆盖人工维护的类型属性绑定，防止大面积破坏既有配置
3. 若后续需要数据修复脚本，应优先以可回放、可审计方式执行，避免在应用层做一次性不可追踪清洗
4. 若模板装配结构与产品类型最终绑定都能编辑，必须在 UI 上明确区分“模板定义”和“最终生效值”，避免再次形成双真相误解
5. 若后续需要支持模板继承链，需额外定义模板建议属性的继承/覆盖规则；本阶段先不引入模板层级继承扩散

### 6.6 实施顺序

1. 先输出属性脏数据盘点与 canonical 规则
2. 经确认后实施属性数据治理与防复发约束
3. 完成回归验证后，再输出模板与产品属性接线设计
4. 经二次确认后，先落模板属性装配结构的数据模型、DTO 与 adapter
5. 再落模板管理页的“装配区 + 预览区”能力
6. 再落产品类型页的“继承模板 / 偏离提示”能力
7. 最后落产品编辑弹窗的只读提示与定向 TypeScript 校验

### 6.7 结论

当前更合适的处理顺序不是立刻把模板和属性强行接起来，而是先消除属性字典中的历史重复值，让产品属性候选项恢复单一真相来源；随后再基于干净数据设计模板与产品属性的关系，优先通过“模板 -> 产品类型 -> 属性绑定”链路收口，而不是把模板页、属性页和类型绑定页揉成一个新的混合真相来源。

## 13. plan：`/shipping-management/contacts` 切到真实后端联系人页，并收紧车型规格加载状态判定

日期：2026-04-15  
状态：待批准

#### 13.1 当前背景

围绕“删除 `/shipping-management/contacts` 中的演示联系人数据”继续追查后，当前已确认：

1. 生产路由 `src/routes/_authenticated/shipping-management/contacts.lazy.tsx` 仍然导入 `src/features/trading/shipping-management/contacts-page.tsx`
2. 该页面直接消费 `src/features/trading/shipping-management/contact-bindings.mock.ts`，并未接入后端联系人 CRUD 页面
3. 用户已将 `contact-bindings.mock.ts` 清空，这可以让演示联系人立即消失，但页面本质仍是 mock 链路，只是从“有演示数据”变成了“空 mock 数据”
4. 仓库中已存在更符合生产目标的真实页面 `src/features/shipping-management/contacts-page.tsx`，其联系人列表、新增、启停、删除均走后端接口

#### 13.2 当前问题归纳

##### 13.2.1 生产路由仍挂在 mock 页面

当前 `contacts.lazy.tsx`：

1. 指向 `@/features/trading/shipping-management/contacts-page`
2. 该页面只把车型规格作为辅助数据来源
3. 联系人本体仍来自前端静态数组 `SHIPPING_VEHICLE_CONTACT_BINDINGS`

这导致：

1. 页面展示结果与数据库无关
2. 删除或修改后端联系人记录不会反映到当前生产路由
3. 即使 mock 清空，仍不能说明页面已经满足“后端权威”

##### 13.2.2 `specsStatus` 目前依赖错误文案猜测权限态

`src/features/logistics-config/vehicle-loading/hooks/use-vehicle-specs-query.ts` 已新增 `specsStatus`，方向正确，但当前实现仍通过错误 message 是否包含 `403` / `forbidden` 来判定权限不足。

这存在以下问题：

1. 过度依赖错误文案格式，后续错误包装一变就可能失效
2. 状态判定不是结构化的 HTTP status 判断，不利于在更多页面复用
3. 仓库已有 `src/lib/error-status.ts` 中的 `getErrorStatus()` / `isForbiddenError()`，继续使用字符串匹配会形成重复且脆弱的约定

#### 13.3 推荐实施策略

本轮建议只做两项收口，保持范围清晰：

1. **路由切换到真实联系人页**
   - 将 `src/routes/_authenticated/shipping-management/contacts.lazy.tsx` 的页面导入改为 `@/features/shipping-management/contacts-page`
   - 使 `/shipping-management/contacts` 直接落到真实的联系人管理页
   - 保持真实页继续通过 `useVehicleContactBindings()` / `useVehicleContactActions()` 调用后端接口，不再消费前端联系人 mock

2. **将车型规格加载状态改为结构化判断**
   - 在 `use-vehicle-specs-query.ts` 中复用 `src/lib/error-status.ts`
   - 使用 `isForbiddenError(query.error)` 或 `getErrorStatus(query.error) === 403` 识别权限不足
   - 其它异常统一归类为 `failed`
   - 当接口成功但返回 0 条数据时归类为 `empty`
   - 保持 `vehicleSpecs` 仍由 React Query 管理，不引入本地 fallback

3. **复核真实页的空态与禁用态语义**
   - 确保 `ContactsListPanel` 在 `forbidden / failed / empty / ok` 下展示的标题、说明与按钮禁用逻辑一致
   - 若仅需微调文案或条件判断，作为同一轮收口一并处理

#### 13.4 预计涉及文件

预计优先涉及：

1. `src/routes/_authenticated/shipping-management/contacts.lazy.tsx`
2. `src/features/logistics-config/vehicle-loading/hooks/use-vehicle-specs-query.ts`
3. `src/lib/error-status.ts`（大概率只读复用；如确有缺口再评估是否补充）
4. `src/features/shipping-management/contacts-page.tsx`
5. `src/features/shipping-management/contacts-list-panel.tsx`
6. 文档：`task.md`、`walkthrough.md`

#### 13.5 风险与破坏性评估

本轮风险中等，主要在于：

1. 路由切换后，用户进入 `/shipping-management/contacts` 看到的将不再是旧的静态联系人卡片，而是完整的后端联系人管理页；这是有意的生产化切换
2. 若当前账号没有车型规格读取权限，真实页会显式显示权限不足或无法创建绑定，这会暴露原本被 mock 掩盖的问题，但符合 `GEMINI.md` 的 fail loudly 思路
3. 若 `useVehicleSpecsQuery()` 的状态语义被其它页面间接消费，需要确认新增的结构化判断不会误伤现有使用场景；从当前调用点看风险可控

#### 13.6 非目标边界

本轮不做：

1. 不重构联系人后端接口
2. 不把联系人查询进一步改造成新的 React Query hook 体系
3. 不顺手删除 `src/features/trading/shipping-management/contact-bindings.mock.ts` 文件本身，除非验证后确认已完全无用且需单独清理
4. 不修改车型规格接口返回契约本身，只收紧前端的状态识别方式

#### 13.7 验证策略

建议按以下顺序验证：

1. `pnpm exec eslint` 针对 `contacts.lazy.tsx`、`use-vehicle-specs-query.ts`、`contacts-page.tsx`、`contacts-list-panel.tsx`
2. `pnpm exec tsc --noEmit`
3. 手动验证 `/shipping-management/contacts`：
   - 能看到真实后端联系人列表或真实空态
   - 删除前端 mock 不再影响页面结果
   - 车型权限不足 / 接口失败 / 空目录时空态文案和按钮禁用符合预期

#### 13.8 当前阶段结论

当前最小且正确的生产化收口方式，不是继续维护一个“已清空 demo 数据的 mock 页面”，而是把生产路由直接切到真实后端联系人管理页，并将 `specsStatus` 从字符串猜测改为结构化状态判断。这样既能移除演示数据残留，也能让联系人页真正回到“后端权威 + 显式失败”的规范轨道。

### 14. plan：修复 `/shipping-management/contacts` 真实列表返回 `null` 导致的过滤崩溃

日期：2026-04-15  
状态：待批准

#### 14.1 当前背景

在将 `/shipping-management/contacts` 切到真实后端联系人页后，页面进入即出现：

1. `TypeError: Cannot read properties of null (reading 'filter')`
2. 堆栈落在 `src/features/shipping-management/hooks/use-vehicle-contact-filters.ts`
3. 由于错误发生在组件渲染期，React ErrorBoundary 会反复接管并重建页面，表现为明显抖动

同时控制台还存在：

1. `/system/status/alerts/active` 的 `502 Bad Gateway`
2. 通知 WebSocket `1006`

但从当前堆栈和数据链看，这两项并不是联系人页 `bindings.filter(...)` 崩溃的直接根因。

#### 14.2 当前问题归纳

##### 14.2.1 前端联系人列表链缺少数组契约校验

当前 `src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts`：

1. 使用 `src/lib/api.ts` 请求 `/shipping-management/vehicle-contacts`
2. 直接把返回值赋给 `bindings`
3. 没有验证响应是否真的是数组

随后 `useVehicleContactFilters(bindings)` 会直接调用：

1. `bindings.filter(...)`

因此只要接口成功返回 `null`，页面就会在渲染期直接崩掉。

##### 14.2.2 后端成功响应与失败响应没有清晰区分“空数组”与“异常”

当前 `server/services/vehicle_contact_binding_service.go` 中：

1. `ListVehicleContactBindings()` 在 `db.DB == nil` 时返回 `nil`
2. 查询 `Find(&items)` 失败时同样返回 `nil`
3. handler 再把这个 `nil` 直接 `c.JSON(http.StatusOK, items)` 返回给前端

这会导致：

1. 成功但空列表 与 内部失败 都可能表现成 JSON `null`
2. 前端无法区分“没有联系人”还是“后端未初始化/查询失败”
3. 真实页会把后端契约漂移直接放大成渲染期崩溃

#### 14.3 推荐实施策略

本轮建议沿“后端先收紧契约，前端再显式校验”的顺序修复：

1. **后端列表服务改为显式错误返回**
   - 将 `ListVehicleContactBindings()` 签名改为返回 `([]models.VehicleContactBinding, error)`
   - `db.DB == nil` 时返回明确错误，而不是 `nil`
   - 查询失败时把 GORM error 向上返回
   - 查询成功但无数据时返回非 `nil` 空切片 `[]`

2. **handler 区分成功空列表与内部错误**
   - `GetVehicleContactBindingsHandler` 调用新签名
   - 若 service 返回 error，则 `500` + 错误消息
   - 若成功，则始终返回数组 JSON

3. **前端联系人列表 hook 做 fail loudly 校验**
   - 在 `useVehicleContactBindings()` 中校验接口返回是否为数组
   - 如果不是数组，抛出明确 contract error 并走现有 `error + toast` 流程
   - 请求失败时维持 `bindings` 为安全空数组，避免渲染期再次崩溃
   - 不在 `useVehicleContactFilters()` 中简单做 `bindings ?? []` 静默兜底，以免掩盖契约问题

#### 14.4 预计涉及文件

预计优先涉及：

1. `server/services/vehicle_contact_binding_service.go`
2. `server/handlers/vehicle_contact_binding_handler.go`
3. `src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts`
4. 必要时：`src/features/shipping-management/hooks/use-vehicle-contact-filters.ts`（仅在需要补开发期断言或类型收紧时评估）
5. 文档：`task.md`、`walkthrough.md`

#### 14.5 风险与破坏性评估

本轮风险较低到中等，主要在于：

1. 若后端当前确实经常落到 `db.DB == nil`，修复后前端会稳定显示 500 错误态，而不是继续“看似有数据但偶发崩溃”
2. 若其它调用方也依赖 `ListVehicleContactBindings()` 的旧签名，需要同步修正编译错误，但当前已知主要入口仅为该 handler
3. 前端数组校验会让返回形状错误更早暴露，这是有意的 fail loudly 收紧，不应再降级为隐式空态

#### 14.6 非目标边界

本轮不做：

1. 不处理 `/system/status/alerts/active` 的 502
2. 不处理通知 WebSocket 1006
3. 不将联系人列表链整体重构成新的 React Query query 层
4. 不改变联系人编辑、新增、删除的现有接口语义

#### 14.7 验证策略

建议按以下顺序验证：

1. 前端定向校验：
   - `pnpm exec eslint src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts src/features/shipping-management/hooks/use-vehicle-contact-filters.ts src/features/shipping-management/contacts-page.tsx`
   - `pnpm exec tsc --noEmit`
2. 后端定向编译校验：
   - `go test ./handlers ./services -run ^$`
3. 页面验证：
   - `/shipping-management/contacts` 不再出现 `bindings.filter` 崩溃
   - 接口返回空列表时显示真实空态
   - 接口内部失败时显示错误态，不再抖动

#### 14.8 当前阶段结论

这次问题的根因不是“真实页本身不能用”，而是联系人列表链当前没有把“空数组”和“内部失败”分开表达，导致后端 `nil -> JSON null` 直接污染前端状态。最小正确修复应该是：后端成功时固定返回数组、失败时显式报错，前端再对数组契约做 fail loudly 校验，从根上阻断 `null` 进入过滤链。

### 15. plan：修复 `/shipping-management/contacts` 默认 filters 对象 identity 导致的 effect 死循环，并补后续重构预案

日期：2026-04-15  
状态：待批准

#### 15.1 当前背景

在修复联系人列表 `null -> filter` 崩溃后，页面不再跳到 500，但仍然持续抖动，并报：

1. `Maximum update depth exceeded`
2. 堆栈落在 `use-vehicle-contact-bindings.ts` 中 `setState` 与 `useEffect(() => void reload(), [reload])`

复查当前调用链后，已确认问题不在后端响应形状，而在前端 render 期构造默认 filters 对象的方式。

#### 15.2 当前问题归纳

##### 15.2.1 render 中临时创建默认 filters 导致依赖持续变化

当前 `src/features/shipping-management/contacts-page.tsx`：

1. 在组件 render 中直接调用 `useVehicleContactBindings(createDefaultContactFilters())`
2. `createDefaultContactFilters()` 每次执行都会返回一个新对象引用

而 `src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts`：

1. `reload` 通过 `useCallback(..., [filters, showToast])` 依赖 `filters`
2. `useEffect(() => void reload(), [reload])` 依赖 `reload`

因此每次 render 都会出现：

1. 新的 `filters`
2. 新的 `reload`
3. effect 再次执行
4. `setState`
5. 再次 render

最终形成无限重渲染闭环。

#### 15.3 推荐实施策略

本轮建议拆成“两层方案”，避免把止血修复和架构重构混在一次提交里：

1. **第一阶段：最小止血修复**
   - 在 `ContactsPage` 中通过 `useMemo` 或等价稳定初始化方式持有默认 filters
   - 仅将稳定引用传给 `useVehicleContactBindings()`
   - 保证当前页面立刻停止 `Maximum update depth exceeded` 循环

2. **第一阶段：保留真实依赖关系**
   - 继续保留 `reload` 对 `filters` 的依赖
   - 继续保留 `useEffect` 对 `reload` 的依赖
   - 这样当远端筛选参数未来真的变化时，仍能正确重拉

3. **第二阶段预案：拆清远端 filters 与本地 UI filters**
   - 当前联系人页同时存在“远端请求默认 filters”和“本地界面筛选 filters”两层概念
   - 后续建议把这两层状态来源彻底拆开，避免再次通过 render 期临时对象拼装数据流
   - 若后续联系人列表继续演进，可评估迁到 React Query 读取层，使远端数据与本地筛选职责边界更清楚

4. **避免错误修法**
   - 不删 `useEffect` 依赖数组
   - 不把 `reload` 改成无依赖闭包
   - 不通过禁用 lint 规则或强行忽略依赖来“止血”

#### 15.4 预计涉及文件

预计优先涉及：

1. 第一阶段优先：`src/features/shipping-management/contacts-page.tsx`
2. 第一阶段必要时：`src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts`
3. 第二阶段预案参考：`src/features/shipping-management/hooks/use-vehicle-contact-filters.ts`
4. 文档：`task.md`、`walkthrough.md`

#### 15.5 风险与破坏性评估

本轮执行阶段风险较低，预案层风险中等，主要在于：

1. 若后续联系人列表真正需要跟随远端 filters 变化自动重拉，必须保证稳定的是“默认对象 identity”，而不是误删真正依赖
2. 当前联系人页同时存在“远端请求默认 filters”和“本地 UI filters”两层概念，本轮执行只做最小止血，不进一步重构这两层边界
3. 若未来推进 React Query 迁移，需要重新梳理联系人编辑/删除后的刷新与失效策略；这不应混入当前止血修复

#### 15.6 非目标边界

本轮不做：

1. 本轮执行不重构联系人列表筛选架构
2. 本轮执行不将联系人列表链整体迁移到 React Query（仅作为后续预案记录）
3. 不处理 `/system/status/alerts/active` 的 502 与通知 WebSocket 1006

#### 15.7 验证策略

建议按以下顺序验证：

1. `pnpm exec eslint src/features/shipping-management/contacts-page.tsx src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts`
2. `pnpm exec tsc --noEmit`
3. 手动验证 `/shipping-management/contacts`：
   - 不再出现 `Maximum update depth exceeded`
   - 页面不再持续抖动
   - 联系人列表与错误态保持原有行为

#### 15.8 当前阶段结论

这次剩余问题不是接口形状错误，而是默认 filters 在 render 期反复创建，导致 hook 依赖链持续变化。当前阶段应先稳定默认 filters 的对象引用，并保留 `reload` / `useEffect` 的真实依赖关系；更进一步的“远端 filters / 本地 UI filters”边界收口与 React Query 迁移，作为后续预案单独推进，而不与本轮止血修复混做。

### 16. plan：联系人页第二阶段 2B —— 读取层迁到 React Query，并收口 invalidateQueries 刷新链

日期：2026-04-15  
状态：待批准

#### 16.1 当前背景

联系人页第二阶段 2A 已完成：

1. `VehicleContactRemoteFilters` 与 `VehicleContactUiFilters` 已拆分
2. `ContactsPage` 已显式区分 `defaultRemoteFilters` 与 `uiFilters`
3. 当前剩余的“服务端状态读取”仍在 `useVehicleContactBindings()` 中通过 `useEffect + useState + reload` 手工管理

结合当前仓库既有方向与约束，下一步应把联系人列表读取层正式迁到 React Query，让服务端真相、缓存和失效刷新统一归属到 query 层，而不是继续由页面手工拉取和手工 `reload()` 协调。

#### 16.2 当前问题归纳

##### 16.2.1 联系人列表读取层仍然是手工状态管理

当前 `src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts`：

1. 使用 `useState` 管理 `bindings / loading / error`
2. 使用 `useEffect` 触发初次读取
3. 暴露 `reload()` 给页面与动作链手工调用

这带来的问题是：

1. 服务端状态缓存和失效策略散落在自定义 hook 内部
2. 保存 / 删除后必须显式传递 `reload`，动作链和读取链耦合较重
3. 后续如果远端 filters 变化，需要持续手工维护依赖与刷新行为

##### 16.2.2 保存 / 删除后的刷新链仍是命令式 reload

当前 `src/features/shipping-management/hooks/use-vehicle-contact-actions.ts`：

1. 保存成功后 `await reload()`
2. 删除成功后 `await reload()`

这会导致：

1. 动作 hook 必须知道读取 hook 的刷新实现细节
2. 难以与后续缓存层、分页层或更多 query key 规则协同
3. 无法自然复用 React Query 的失效 / refetch 机制

#### 16.3 推荐实施策略

本轮 2B 建议聚焦“读取层迁移 + 动作失效收口”，不一次性扩成完整 mutation 体系重构：

1. **建立联系人列表 query keys**
   - 新增 `src/features/shipping-management/query-keys.ts`
   - 设计 `vehicleContactQueryKeys`，至少包含：
     - `all()` -> `['vehicle-contact-bindings']`
     - `lists()` -> `['vehicle-contact-bindings', 'list']`
     - `list(filters)` -> `['vehicle-contact-bindings', 'list', filters]`
   - 确保只使用稳定、可序列化的 `VehicleContactRemoteFilters`

2. **将 `useVehicleContactBindings()` 改造成 React Query 读取 hook**
   - 使用 `useQuery()` 承担联系人列表读取
   - `queryFn` 中继续通过 `apiFetch` + `ensureArrayResponse()` 做 fail loudly 校验
   - 对外暴露的数据形态保持尽量平滑，例如：
     - `bindings`
     - `loading`
     - `error`
     - `reload`（内部改为 `query.refetch()` 包装）
   - 移除读取层内部的手工 `useEffect` 和列表状态 `useState`

3. **将动作链从 `reload()` 收口为 `invalidateQueries()`**
   - 在 `useVehicleContactActions()` 中引入 `useQueryClient()`
   - 保存 / 删除成功后调用：
     - `queryClient.invalidateQueries({ queryKey: vehicleContactQueryKeys.all() })`
   - 让动作链不再依赖外部传入的 `reload`
   - 继续保留成功 / 失败 toast 语义

4. **保持 2A 的边界成果，不回退混用**
   - 本地 `uiFilters` 继续只负责前端显示过滤
   - `ContactsPage` 仍只把 `defaultRemoteFilters` 传给列表读取层
   - 本轮不把本地筛选重新回并到远端请求参数

#### 16.4 预计涉及文件

预计优先涉及：

1. `src/features/shipping-management/query-keys.ts`（新增）
2. `src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts`
3. `src/features/shipping-management/hooks/use-vehicle-contact-actions.ts`
4. `src/features/shipping-management/contacts-page.tsx`
5. 必要时：`src/features/shipping-management/contact-filters.shared.ts`
6. 文档：`task.md`、`walkthrough.md`

#### 16.5 风险与破坏性评估

本轮风险中等，主要在于：

1. 若 query key 设计不稳定，仍可能造成重复请求或缓存命中异常
2. 若 invalidate 范围过宽，可能产生不必要的列表重拉；若范围过窄，则保存 / 删除后列表不同步
3. 若读取 hook 的对外接口变化过大，页面与动作链会同时受影响，因此本轮应尽量保持返回 shape 平滑演进
4. React Query 迁移后，错误与加载态的节奏会更接近 query 生命周期，需要确认当前页面空态 / 错误态不会因此误闪

#### 16.6 非目标边界

本轮不做：

1. 不把保存 / 删除整体迁到 `useMutation`
2. 不引入分页、无限滚动或服务端搜索的新交互语义
3. 不把本地 `uiFilters` 全量同步到后端请求层
4. 不处理 `/system/status/alerts/active` 的 502 与通知 WebSocket 1006

#### 16.7 验证策略

建议按以下顺序验证：

1. `pnpm exec eslint src/features/shipping-management/query-keys.ts src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts src/features/shipping-management/hooks/use-vehicle-contact-actions.ts src/features/shipping-management/contacts-page.tsx`
2. `pnpm exec tsc --noEmit`
3. 手动验证 `/shipping-management/contacts`：
   - 页面正常加载联系人列表
   - 保存联系人后列表自动刷新
   - 删除联系人后列表自动刷新
   - 接口失败时仍进入显式错误态
   - 本地 `uiFilters` 仍只影响前端显示，不破坏列表读取链

#### 16.8 当前阶段结论

联系人页第二阶段 2B 的正确方向，不是继续扩写手工 `reload()`，而是把联系人列表读取层正式迁到 React Query，并让保存 / 删除动作通过 `invalidateQueries()` 与 query key 体系协同。这样可以把服务端真相、缓存和刷新策略统一收口到 query 层，同时保留当前 2A 已拆清的“远端请求 filters / 本地 UI filters”边界。

### 17. 联系人页自动化测试补齐规划（待批准）

日期：2026-04-15  
状态：待批准

#### 17.1 背景与问题

联系人页刚完成第二阶段 2B：

1. 列表读取层已迁到 React Query
2. 保存 / 删除成功后已改为依赖 `invalidateQueries()` 刷新列表
3. 本地 `uiFilters` 与远端请求 filters 的边界已拆清

当前虽然已经通过定向 `eslint` 与 `tsc`，但还缺一条能覆盖“页面交互 + 接口 mock + React Query 刷新链”的自动化回归测试。仅靠静态校验无法确保以下关键行为长期稳定：

1. 页面首屏能否正确加载联系人列表
2. 保存 / 启停后列表是否真的因 query invalidation 而重拉
3. 删除后列表是否依据最新服务端状态刷新

#### 17.2 推荐测试层级

建议本轮优先补 **Playwright e2e**，而不是先补 hook / 组件单测。

原因：

1. 当前仓库 `e2e/dictionary-save-no-rollback.spec.ts` 已提供成熟样板：登录、统一拦截 `/api/v1/**`、在前端真实路由下断言界面结果
2. 联系人页的核心价值不只是某个纯函数，而是“接口返回 -> React Query 缓存 -> 页面刷新 -> 列表展示”的联动链路
3. 若先做 hook 单测，需要额外搭建 `QueryClientProvider`、组件桩、弹窗交互桩与 fetch mock，投入更大但对当前风险点命中反而不如 e2e 直接

#### 17.3 建议覆盖范围

建议新增：

1. `e2e/shipping-management-contacts.spec.ts`

首条用例建议覆盖以下主路径：

1. 模拟登录并进入 `/shipping-management/contacts`
2. mock 车型库接口，返回可绑定车型列表
3. mock 联系人列表 GET，返回 1-2 条联系人数据
4. 断言联系人姓名 / 车型 / 状态在页面可见，确认首屏加载成功
5. 点击现有列表项的“启用 / 停用”按钮，mock POST 后更新内存数据
6. 让后续 GET 返回变更后的启停状态，断言界面从“启用”切到“停用”或反之
7. 点击“删除”，在确认弹窗执行删除，mock DELETE 后移除内存数据
8. 让后续 GET 返回删除后的列表，断言对应联系人从界面消失

这样可以在一条测试里同时覆盖：

1. 首屏读取
2. 保存后刷新
3. 删除后刷新
4. React Query invalidation 驱动的列表重拉

#### 17.4 涉及文件

预计涉及：

1. 新增 `e2e/shipping-management-contacts.spec.ts`
2. 更新 `task.md`
3. 更新 `walkthrough.md`

本轮原则上 **不修改业务代码**。只有在测试无法稳定定位交互元素、且确有必要时，才回退提出“为关键按钮补最小可测性标识”的二次规划，而不是直接扩改页面。

#### 17.5 Mock 策略

建议沿用现有 Playwright 方式，在 `page.route('**/api/v1/**')` 内维护内存态：

1. `POST /api/v1/auth/login`：返回登录成功信息
2. `GET /api/v1/auth/snapshot`：返回具备访问联系人页所需权限的用户快照
3. `GET /api/v1/logistics/vehicle-specs` 或实际车型接口：返回至少 1 条可绑定车型
4. `GET /api/v1/shipping-management/vehicle-contacts`：返回内存中的联系人列表
5. `POST /api/v1/shipping-management/vehicle-contacts/:id`：更新内存中对应联系人的 `enabled` 等字段
6. `DELETE /api/v1/shipping-management/vehicle-contacts/:id`：从内存列表移除对应记录

关键点：

1. GET 返回必须读取同一份可变内存数据，确保保存 / 删除后的下一次重拉拿到最新结果
2. 不能只断言 toast 成功文案，必须断言列表状态真的变化

#### 17.6 风险与注意事项

1. 联系人页当前缺少稳定 `data-testid`，测试选择器应优先使用按钮文字、对话框 role、联系人姓名等稳定语义点
2. 若测试直接走“新增联系人完整表单”路径，字段较多且与车型库下拉强耦合，首条测试容易过重；建议先聚焦现有列表项的启停与删除
3. 若路由进入联系人页需要额外权限 catalog / auth snapshot 字段，mock 用户对象必须一次补齐，避免把权限问题误判成页面刷新失败
4. 若车型接口实际路径与预期不一致，需要先以现有服务实现为准补 mock，避免出现 contacts 已成功但车型库空态遮挡列表

#### 17.7 非目标边界

本轮不做：

1. 不把联系人页整体拆成更多组件只为测试服务
2. 不引入新的测试库或 fetch mock 框架
3. 不把保存 / 删除改造成 `useMutation`
4. 不覆盖所有筛选组合与编辑弹窗字段校验

#### 17.8 验证策略

建议按以下顺序验证：

1. `pnpm exec eslint e2e/shipping-management-contacts.spec.ts`
2. `pnpm exec playwright test e2e/shipping-management-contacts.spec.ts`
3. 观察测试产物，确认以下断言成立：
   - 联系人页首屏能显示 mock 列表
   - 点击启用 / 停用后，列表状态发生变化
   - 删除后，对应联系人从界面消失

#### 17.9 当前阶段结论

联系人页下一步最值得补上的，不是继续扩大业务重构，而是一条能锁定“React Query 读取 + invalidation 刷新链”行为的 Playwright 回归测试。这样后续无论继续演进 `useMutation`，还是补更多联系人交互，都有一条可执行的页面级防回归基线。

### 18. 最近修改生产文件的冗余清理与修复规划（待批准）

日期：2026-04-15  
状态：待批准

#### 18.1 背景与问题

基于对最近修改生产文件的回溯，当前存在三类需要清理的问题：

1. `src/features/trading/shipping-management/contacts-page.tsx` 及其 `contact-bindings.mock.ts` 仍保留旧联系人页实现，但真实路由入口已经切到 `src/features/shipping-management/contacts-page.tsx`
2. 新联系人读取链已完成 React Query 迁移，但仍残留少量“平滑迁移期”的轻冗余返回值与 query key 预留项
3. `vehicle-photo-*` 组件拆分本身没有问题，但图片视角标签解析逻辑在多个文件中重复出现，存在进一步收口空间

本轮目标不是做新功能，而是把最近这一轮重构后留下的冗余出口和并行残留清掉，避免后续继续在旧链路上误维护。

#### 18.2 核心目标

1. 移除旧联系人页并行实现，确保生产代码中只保留一套联系人页主链
2. 精简新联系人读取层中当前无人消费或语义重复的接口
3. 收口图片视角标签的重复逻辑，同时保留已拆好的组件结构

#### 18.3 建议处理范围

建议本轮处理：

1. `src/features/trading/shipping-management/contacts-page.tsx`
2. `src/features/trading/shipping-management/contact-bindings.mock.ts`
3. 视引用情况，可能连带处理旧联系人页仅使用的边界组件
4. `src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts`
5. `src/features/shipping-management/query-keys.ts`
6. `src/features/logistics-config/vehicle-loading/components/vehicle-photo-dialog.tsx`
7. `src/features/logistics-config/vehicle-loading/components/vehicle-photo-upload-panel.tsx`
8. 如有需要，新增一个轻量共享 util / 常量文件用于承载 `VehiclePhotoViewType` 标签解析

#### 18.4 建议实施顺序

1. **先清理旧联系人页残留**
   - 先确认旧 `trading/shipping-management` 联系人页确无生产入口引用
   - 删除旧联系人页文件，以及仅供其使用的 mock / boundary 残留

2. **再精简新联系人读取层轻冗余**
   - 删除 `useVehicleContactBindings()` 中当前无消费价值的 `filteredBindings`
   - 评估并删除 `vehicleContactQueryKeys.lists()` 这类当前未使用的预留项
   - 保留 `reload`，因为页面显式错误态仍通过它执行手工重试

3. **最后收口图片视角标签重复逻辑**
   - 将 `vehicle-photo-dialog.tsx` 与 `vehicle-photo-upload-panel.tsx` 中重复的 `viewType -> label` 解析逻辑抽到共享出口
   - 保持 `vehicle-photo-dialog-header/preview/sidebar/footer` 这类拆分文件不回并

#### 18.5 风险与注意事项

1. 旧联系人页文件删除前，必须确认没有隐藏入口、路由 fallback 或模块 tabs 仍间接依赖它
2. 若旧联系人页相关的 `contacts-boundary` 被其他页共用，则只能删旧页专属部分，不能整组粗删
3. `useVehicleContactBindings()` 返回 shape 发生变化时，要同步确认唯一消费方 `ContactsPage` 不受影响
4. 图片视角标签收口应仅做逻辑去重，不改动既有国际化 key 和展示文案，避免引入 UI 回归

#### 18.6 非目标边界

本轮不做：

1. 不继续推进联系人页新的交互重构
2. 不把 `vehicle-photo-*` 重新合并回单文件
3. 不顺手重构 `api-client` / `api` 体系
4. 不扩大到 docs / locale 文案润色之外的无关模块清理

#### 18.7 验证策略

建议按以下顺序验证：

1. `pnpm exec eslint src/features/shipping-management/hooks/use-vehicle-contact-bindings.ts src/features/shipping-management/query-keys.ts src/features/logistics-config/vehicle-loading/components/vehicle-photo-dialog.tsx src/features/logistics-config/vehicle-loading/components/vehicle-photo-upload-panel.tsx`
2. 若删除旧联系人页残留，则补充对相应删除/改动文件的定向 `eslint`
3. `pnpm exec tsc --noEmit`
4. 如联系人页链路受影响，补跑 `pnpm exec playwright test e2e/shipping-management-contacts.spec.ts`

#### 18.8 当前阶段结论

最近这一轮真正需要清理的，不是 `vehicle-photo-*` 这种已被多入口消费的有效拆分，而是旧联系人页并行残留，以及新联系人读取层里迁移后留下的少量轻冗余。优先把这些点清掉，可以减少后续维护歧义，同时保持当前重构成果不被回退。

### 19. packaging-rules 页面车型规格卡片国际化崩溃修复规划（待批准）

日期：2026-04-15  
状态：待批准

#### 19.1 背景与问题

在 `/logistics-config/packaging-rules` 页面打开过程中，控制台出现：

1. `TypeError: Cannot read properties of undefined (reading 'split')`
2. 调用栈定位到 `translate()` -> `VehicleSpecCardHeader`

进一步核对后可确认：

1. `VehicleSpecCardHeader` 正在调用 `t(spec.nameKey)`
2. `VehicleSpecCardNotes` 正在调用 `t(spec.notesKey)`
3. 但车辆规格接口 schema 当前定义的是 `name` 与 `notes` 字段，而不是 `nameKey` 与 `notesKey`

因此这不是单纯的文案缺失，而是**前端 `VehicleSpec` 类型约定与真实接口 DTO 结构漂移**。页面一旦消费接口返回的 DTO，`nameKey / notesKey` 就是 `undefined`，最终把 `undefined` 传入 `translate()`，在 `key.split('.')` 处崩溃。

#### 19.2 核心目标

1. 对齐 `VehicleSpec` 前端类型与接口 DTO 的真实结构
2. 修复车型规格卡片头部与备注区对旧字段的错误读取
3. 确保 packaging-rules / vehicle-specs-library / 其他复用车型规格数据的页面不再因 i18n key 漂移崩溃

#### 19.3 建议处理范围

建议本轮处理：

1. `src/features/logistics-config/vehicle-loading/data/vehicle-loading.types.ts`
2. `src/features/logistics-config/vehicle-loading/data/vehicle-specs.mock.ts`
3. `src/features/logistics-config/vehicle-specs-library/components/vehicle-spec-card-header.tsx`
4. `src/features/logistics-config/vehicle-specs-library/components/vehicle-spec-card-notes.tsx`
5. 视引用情况，复核其它使用 `VehicleSpec` 的组件是否仍读取 `nameKey / notesKey`

#### 19.4 建议实施方式

1. **先统一数据契约**
   - 以当前接口 DTO 为准，把 `VehicleSpec` 类型从 `nameKey / notesKey` 收口到 `name / notes`
   - 保证 mock 数据与运行时接口返回结构一致，不再并存两套字段定义

2. **再修正消费组件**
   - `VehicleSpecCardHeader` 直接展示 `spec.name`
   - `VehicleSpecCardNotes` 直接展示 `spec.notes`
   - 仅保留类别等真正仍由 i18n key 驱动的字段翻译

3. **最后补最小防御校验**
   - 若还有翻译 key 来源不稳定的调用点，再视情况增加显式 guard
   - 但本轮优先通过统一契约解决根因，而不是到处加 `?? ''` 掩盖错误

#### 19.5 风险与注意事项

1. 若 `VehicleSpec` 类型变更后，仍有其它组件读取 `nameKey / notesKey`，会产生连锁类型错误；这正是本轮需要主动暴露并一并修正的点
2. mock 数据不能继续保留旧字段，否则会形成“mock 可用、接口崩溃”的双轨语义
3. 本轮不处理浏览器扩展导致的 `runtime.lastError`，也不处理通知 WebSocket 1006，避免将无关噪音与当前根因混在一起

#### 19.6 非目标边界

本轮不做：

1. 不处理 `useNotifications` 的 WebSocket 重连策略
2. 不处理浏览器扩展消息通道报错
3. 不改 packaging-rules 页面无关的视觉样式或布局

#### 19.7 验证策略

建议按以下顺序验证：

1. `pnpm exec eslint src/features/logistics-config/vehicle-loading/data/vehicle-loading.types.ts src/features/logistics-config/vehicle-loading/data/vehicle-specs.mock.ts src/features/logistics-config/vehicle-specs-library/components/vehicle-spec-card-header.tsx src/features/logistics-config/vehicle-specs-library/components/vehicle-spec-card-notes.tsx`
2. `pnpm exec tsc --noEmit`
3. 手动验证 `/logistics-config/packaging-rules` 与 `/logistics-config/vehicle-specs-library`：
   - 页面不再因 `t(undefined)` 崩溃
   - 车型名称与备注能正常显示
   - 其它车型规格展示区域不受影响

#### 19.8 当前阶段结论

这次崩溃的正确修复方式，不是给 `translate()` 临时兜空，而是收口 `VehicleSpec` 的前端数据契约，停止让页面组件把后端 DTO 当成 i18n key 容器来读取。只有把 `name / notes` 与 `nameKey / notesKey` 的漂移彻底消掉，才能避免同类问题在其它车型规格页面再次出现。

### 20. logistics-config 剩余 mock 链路清单与推荐真接口收口规划（待批准）

日期：2026-04-15  
状态：待批准

#### 20.1 当前 mock 链路清单

基于本轮梳理，`logistics-config` 当前并不是“全链路都已对齐真数据”，而是存在以下分层状态：

1. **已对齐真数据**
   - `useVehicleSpecsQuery()` -> `getVehicleSpecs()` -> `/api/v1/logistics-config/vehicle-specs`
   - `packagingRulesService.getProfiles()` -> `/packaging/profiles`

2. **仍在生产逻辑中生效的 mock / 本地引擎分支**
   - `src/features/logistics-config/vehicle-loading/services/vehicle-loading-service.ts`
   - 其中 `USE_MOCK_RECOMMENDATIONS = true` 使 `getVehicleRecommendations()` 继续走本地 `buildRecommendationFromEngine()`，而不是后端 `/api/v1/logistics/vehicle-loading/recommendations`
   - `src/features/logistics-config/vehicle-loading/data/vehicle-specs.mock.ts` 仍会作为推荐请求构造时的本地兜底输入参与运行路径

3. **当前未见生产主链消费的 mock 残留**
   - `src/features/logistics-config/utils/vehicle-recommendation-mock.ts`

4. **仍是占位语义、未真正形成数据链的来源切换**
   - `vehicle-loading-tab.tsx` 中 `source === 'packing-rule'` 与 `source === 'api'` 当前主要展示提示文案，尚未形成真实差异化数据源

#### 20.2 背景与问题

当前风险不在于“仓库里还留有某个 mock 文件”，而在于：

1. 推荐结果主链仍由本地引擎驱动，用户界面却已经暴露 `manual / packing-rule / api` 多来源语义
2. 车型规格列表已是真数据，但推荐结果不是真后端结果，形成“半真半 mock”状态
3. 如果只看列表页，很容易误以为 `logistics-config` 已全部 authority 化；实际上推荐链尚未收口

#### 20.3 下一轮核心目标

1. 将 `USE_MOCK_RECOMMENDATIONS` 收口到真接口
2. 移除推荐运行链中仍参与逻辑决策的本地 mock 兜底
3. 明确 `manual / packing-rule / api` 三种来源在推荐请求上的真实语义边界

#### 20.4 建议处理范围

建议下一轮重点处理：

1. `src/features/logistics-config/vehicle-loading/services/vehicle-loading-service.ts`
2. `src/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-recommendations.ts`
3. `src/features/logistics-config/vehicle-loading/vehicle-loading-tab.tsx`
4. `src/features/logistics-config/vehicle-loading/data/vehicle-specs.mock.ts`
5. `src/features/logistics-config/utils/vehicle-recommendation-mock.ts`
6. 如有需要，联动后端推荐接口 contract 对齐文件

#### 20.5 建议实施方式

1. **先核对推荐接口契约**
   - 确认后端 `/api/v1/logistics/vehicle-loading/recommendations` 是否已稳定提供当前前端 `vehicleRecommendationRequestSchema` / `vehicleRecommendationResponseSchema` 所要求的字段
   - 若 contract 存在漂移，先对齐 schema，再切运行链

2. **再收口运行链**
   - 移除 `USE_MOCK_RECOMMENDATIONS` 分支
   - 让 `getVehicleRecommendations()` 始终走真实接口
   - 移除 `MOCK_VEHICLE_SPECS` 在推荐主链中的运行时兜底角色，避免接口失败时继续本地静默代算

3. **最后清理残留与来源语义**
   - 评估 `vehicle-recommendation-mock.ts` 是否还能转为测试专用，否则删除
   - 重新审视 `manual / packing-rule / api`：
     - 若暂时都走同一推荐接口，应在 UI/文案上明确说明
     - 若 `packing-rule` / `api` 已有不同输入来源，就同步接入真实数据链，不再停留在占位提示

#### 20.6 风险与注意事项

1. 不能只把开关改成 `false` 就视为完成；若后端 contract 尚未稳定，页面会直接暴露真实错误，这虽然符合 fail loudly，但需要提前评估影响面
2. 若 `packing-rule` / `api` 仍无真实差异化来源，而 UI 继续强调“不同来源”，会造成语义误导
3. 若移除 `MOCK_VEHICLE_SPECS` 后仍有任何推荐链路在 `vehicleSpecs` 为空时运行，需要明确进入显式错误或空态，而不是再引入新的静默兜底
4. 最新核对 `server/routes/routes.go` 后，尚未发现 `/api/v1/logistics/vehicle-loading/recommendations` 的后端路由注册；这意味着本轮已从“前端切真接口”升级为“前后端联动补齐接口 + 前端收口”

#### 20.7 非目标边界

本轮不做：

1. 不处理通知 WebSocket 1006
2. 不处理浏览器扩展 `runtime.lastError`
3. 不扩大到 `logistics-config` 其它无关模块重构

#### 20.8 验证策略

建议按以下顺序验证：

1. `pnpm exec eslint` 针对 vehicle-loading recommendation 相关文件
2. `pnpm exec tsc --noEmit`
3. 手动验证 `/logistics-config/vehicle-loading`：
   - 推荐结果通过真实接口返回
   - 接口失败时进入显式错误态
   - 不再因为本地 mock 分支而掩盖真实问题

#### 20.9 当前阶段结论

`logistics-config` 当前已经完成“车型规格主数据列表 -> 真接口”的收口，但“推荐计算链 -> 真接口”还没有完成。下一轮正确方向，不是继续保留 `USE_MOCK_RECOMMENDATIONS` 当作安全垫，而是先核对后端推荐接口契约，再把推荐主链真正切到真实接口，并将剩余 mock 明确降级为测试/样板用途或直接清理。

#### 20.10 新发现的执行阻塞点

继续核对后发现，前端虽然已经定义了 `VEHICLE_RECOMMENDATIONS_ENDPOINT = '/api/v1/logistics/vehicle-loading/recommendations'`，但后端当前并未在 `server/routes/routes.go` 中注册对应 recommendations 路由。已确认的相关事实如下：

1. 后端已注册 `/api/v1/logistics-config/vehicle-specs`
2. 后端已注册 `/api/v1/packaging/profiles`
3. 后端尚未发现 `/api/v1/logistics/vehicle-loading/recommendations` 对应注册项、handler 或 service 入口

因此原计划需要升级为：

1. **先落地后端 recommendations 接口**
   - 注册路由
   - 增加 handler
   - 视情况复用现有车型规格数据与装载推荐引擎，输出与前端 `vehicleRecommendationResponseSchema` 对齐的响应

2. **再切前端到真接口**
   - 移除 `USE_MOCK_RECOMMENDATIONS`
   - 移除推荐主链的运行时 mock 兜底
   - 保持失败显式暴露，不再本地静默代算

3. **最后做前后端联动验证**
   - Go 路由/handler 定向测试（如适用）
   - 前端 `eslint` / `tsc`
   - 手动验证 `/logistics-config/vehicle-loading` 推荐结果链

在用户重新确认该扩大范围前，不应继续进入业务代码修改阶段。

#### 20.11 下一轮目标：清理脱链 mock/helper + 推进三来源差异化真实输入

上一轮完成 recommendations 真接口收口后，仓库里仍残留几类“已经不在生产运行链中，但会继续误导后续维护”的前端文件；同时 `manual / packing-rule / api` 三种来源虽然已经出现在 UI 与 request contract 中，但实际输入仍未真正分化。因此下一轮建议拆为两条并行目标：

1. **清理脱链 mock/helper 文件**
2. **把三种来源从“标签差异”推进到“输入差异”**

#### 20.12 已确认的脱链文件边界

通过引用核对，目前可纳入清理范围的文件如下：

1. `src/features/logistics-config/vehicle-loading/data/vehicle-specs.mock.ts`
2. `src/features/logistics-config/utils/vehicle-recommendation-mock.ts`
3. `src/features/logistics-config/vehicle-loading/services/vehicle-loading-package-adapters.ts`
4. `src/features/logistics-config/vehicle-loading/services/vehicle-loading-result-mapper.ts`

这些文件当前已无生产消费点；继续保留只会让人误判 recommendations 仍依赖前端本地代算或 mock 兜底。

另有一组文件需要谨慎处理：

1. `src/features/logistics-config/vehicle-loading/engine/load-planning/*`
2. `src/features/logistics-config/vehicle-loading/engine/load-planning/vehicle-loading-engine.test.ts`

这组前端装载引擎实现目前主要被测试引用。虽然生产链已切到后端，但它仍可暂时作为后端 recommendations 算法的对照/spec。建议本轮**先不直接删除**，待确认是否要把测试一并迁移到后端或保留为前端算法回归样本后再处理。

#### 20.13 三来源当前真实缺口

##### 20.13.1 manual

`manual` 当前仍只依赖页面内 `boxes / totalVolumeM3 / totalWeightKg` 三个 summary 字段。这条链是现有唯一真正可用的用户输入来源。

##### 20.13.2 packing-rule

仓库内已经存在可复用能力：

1. `packagingRulesService.getProfiles()` 可读取 `/packaging/profiles`
2. `calculatePackagingPlan()` 可基于包装定义推导装箱结果

这意味着 `packing-rule` 并不需要继续占位；可以在 `vehicle-loading` 页面引入包装定义选择/推导逻辑，并把真实箱规结果映射为 recommendations 所需的 package input。

##### 20.13.3 api

当前仓库里**没有发现独立 authoritative 的 API 结果源**。现状是：

1. 前端把 `source='api'` 传给 `/api/v1/logistics/vehicle-loading/recommendations`
2. 后端 `BuildVehicleLoadingRecommendations()` 会识别 `source` 标签
3. 但后端仍统一使用固定默认箱型 `660x660x800`

也就是说，`api` 现在还不是“真实 API 结果来源”，只是“同一算法下的另一个标签”。

因此若要在本轮继续推进 `api` 差异化输入，最稳妥的方式是：

1. **扩展当前 recommendations request contract**，允许前端显式传入 package input（例如 `packageDimension`、`unitWeightKg`、`profileRef`、`canRotate`、`canInvert` 等）
2. 在 `source='api'` 时由页面展示独立输入位，显式驱动后端推荐
3. 不再让后端在 `api` 来源下回落到默认箱型冒充“真实来源”

若用户坚持 `api` 必须代表“另一个后端系统/上游系统已经算好的 authoritative 结果”，则范围需进一步扩大为新增 upstream endpoint 或新增适配层；这不属于当前仓库内已存在能力的直接复用。

#### 20.14 建议执行顺序

1. **先做仓库清理**
   - 删除已脱链 mock/helper 文件
   - 跑 `eslint` / `tsc` 确保无残余引用

2. **再做 contract 扩展**
   - 前端 schema 与 types 增加 source-specific package input
   - 后端 request payload 与推荐 service 对应支持显式 package input

3. **接入 packing-rule 真实输入**
   - 页面新增包装定义选择或映射层
   - 从 `/packaging/profiles` 读取真实定义
   - 将包装定义映射为 recommendations 计算输入

4. **接入 api 显式输入**
   - 页面为 `api` 来源提供独立输入位
   - 不再依赖默认箱型

5. **最后做联动验证**
   - 前端 `eslint` / `tsc`
   - 后端 recommendations 定向测试
   - 手动验证三种来源的推荐结果确实随输入来源变化

#### 20.15 风险与边界

1. 当前 `vehicle-loading` 页面 state 只有 summary 与筛选条件；要支持真正不同的来源输入，必须新增 source-specific state 与 UI 区块
2. `packing-rule` 若直接复用包装定义，需要明确“箱数/重量/体积”由谁提供，避免同一来源里又混入 manual 语义
3. `api` 在没有上游 authoritative 结果源的前提下，只能先收口为“显式 API contract 输入”，不能对用户宣称已经接上另一套真实系统
4. 本轮仍不扩大到无关的 logistics-config 重构

在用户确认这份新规划前，不应开始删除文件或修改业务代码。

#### 20.16 本轮执行结果（2026-04-15）

本轮已在用户批准后完成执行，实际落地结果如下：

1. **清理脱链 mock/helper 文件**
   - 已删除：
     - `src/features/logistics-config/vehicle-loading/data/vehicle-specs.mock.ts`
     - `src/features/logistics-config/utils/vehicle-recommendation-mock.ts`
     - `src/features/logistics-config/vehicle-loading/services/vehicle-loading-package-adapters.ts`
     - `src/features/logistics-config/vehicle-loading/services/vehicle-loading-result-mapper.ts`
   - 删除前已先核对无生产引用，删除后再次确认文件不存在。

2. **扩展 recommendations contract**
   - 前端 `vehicle-loading.types.ts`、`vehicle-loading.schema.ts`、`vehicle-loading-service.ts` 已新增显式 `packageInput` 契约。
   - 后端 `VehicleLoadingRecommendationsRequest` 已新增 `packageInput` payload；当存在显式输入时，推荐服务优先采用该输入而不是默认箱型。

3. **落地三来源真实输入差异**
   - `manual`：继续由 summary 驱动，并显式构造默认手动 package input。
   - `packing-rule`：新增独立 hook 读取 `/packaging/profiles`，从活动包装定义生成 recommendations 所需箱型输入。
   - `api`：页面新增独立输入面板，显式维护箱型名称、单箱重量、长宽高、`canRotate`、`canInvert`。

4. **单位与失败策略**
   - `packing-rule` 当前支持 `mm / cm / m` 长度单位与 `kg / g` 重量单位映射。
   - 遇到未知单位或非正数输入时直接显式报错，保持 fail loudly，不做静默兜底。

5. **验证结果**
   - `pnpm exec tsc --noEmit`：通过。
   - `pnpm exec eslint`（定向针对本轮变更文件）：通过。
   - `go test ./handlers -run TestGetVehicleLoadingRecommendationsHandlerReturnsRecommendations -count=1`：通过。

#### 20.17 回溯审查后的风险排序修正方案（2026-04-15）

在完成三来源输入接入后，对实现做了一轮回溯审查。结论不是“需要回滚”，而是“需要围绕语义一致性再做一轮收口”。按风险排序如下：

1. **P1：`canInvert` 语义漏洞**
   - 当前 `canInvert` 已存在于前端 state、前端 request contract 与后端 payload 中。
   - 但现有前后端朝向生成逻辑只看 `canRotate`，没有真正消费 `canInvert`。
   - 这会导致 UI 暴露了一个看似生效、实际不参与算法的控制项，属于 contract/行为不一致。
   - 修正方向：
     - 先明确 `canRotate=false / canInvert=true`、`canRotate=true / canInvert=false` 等组合语义。
     - 再同步修改前后端 orientation 生成逻辑，避免再次漂移。

2. **P1：`packing-rule` authority 仍未完全收口**
   - 当前 `packing-rule` 已接入 `/packaging/profiles`，但尚未真正接入 `calculatePackagingPlan()`。
   - 目前它更接近“包装定义驱动试算”，而不是“真实装箱结果驱动试算”。
   - 同时箱数仍来自 `summary.boxes`，存在“箱型来自箱规、箱数来自手输”的混合语义。
   - 修正方向：
     - 若本轮只做最小收口，应在 UI 文案中明确当前 authority 边界，避免误导。
     - 若本轮继续扩大，则需引入足够的业务输入上下文，真正调用 `calculatePackagingPlan()` 并决定箱数 authority。

3. **P2：提示文案滞后**
   - `vehicle-loading-tab.tsx` 中关于 `packing-rule / api` “后续再接入”的提示，已落后于当前实现。
   - 修正方向：更新提示文案，只描述当前真实状态，不提前宣称尚未实现的差异。

4. **P2：默认箱型常量重复定义**
   - 前端 `DEFAULT_PACKAGE_DIMENSION` 与后端 `defaultVehiclePackageDimension` 当前是重复常量。
   - 修正方向：本轮至少在计划内明确为“共享默认语义”，若改动成本可控则进一步合并或加一致性测试。

5. **P3：单位映射 authority 化**
   - 当前 `mm / cm / m` 与 `kg / g` 的换算逻辑是硬编码白名单，fail loudly 策略是正确的。
   - 但长期看仍可能与单位主数据漂移。
   - 修正方向：后续再评估是否升级为基于单位主数据或后端 authority 的换算层；本轮不建议无边界扩大。

#### 20.18 建议执行顺序（待确认）

1. 先修 **P1**：`canInvert` 语义一致性
2. 再修 **P1/P2 边界项**：明确 `packing-rule` 当前 authority，并决定本轮是否只收口文案，还是继续扩大到真实装箱结果
3. 最后修 **P2**：页面提示文案与默认常量漂移
4. **P3** 单位 authority 化默认暂缓，除非本轮执行中发现真实阻塞

#### 20.19 本轮边界（待确认）

1. 若选择最小修正，本轮应聚焦：
   - `canInvert` 真正参与算法
   - `packing-rule` 文案与 authority 边界说清楚
   - 文案与默认常量收口
2. 若选择扩大修正，本轮将继续引入 `calculatePackagingPlan()`，这意味着：
   - 需要补齐业务输入上下文
   - 需要重新定义箱数 authority
   - 复杂度与验证范围都会明显上升

在你确认本轮修正边界前，不应继续进入业务代码修改阶段。

#### 20.20 中等收口执行结果（2026-04-15）

用户已确认按“中等收口”执行，本轮实际完成如下：

1. **修正 `canRotate / canInvert` 组合语义**
   - 明确收口为：
     - `canRotate`：只允许底面旋转，长宽可互换，保持高度方向不变
     - `canInvert`：允许改变竖直方向，将箱体侧放或翻面参与计算
   - 前端 `vehicle-orientation.ts` 与后端 `getVehiclePackageOrientations()` 已同步对齐该语义。
   - 同时暴露并修复了前端旧朝向枚举中的对象简写错误，避免“看似 6 个朝向、实际只返回 1 个”的历史 bug 继续潜伏。

2. **收口 `packing-rule` authority 边界**
   - 本轮刻意不扩大到 `calculatePackagingPlan()`。
   - 页面已明确说明当前 `packing-rule` 是“包装定义驱动试算”：
     - 包装定义提供尺寸与单箱重量
     - 箱数仍由本页 `summary.boxes` 提供

3. **收口 UI 文案与交互**
   - `vehicle-loading-tab.tsx` 已移除“待后续接入”的滞后文案，改为描述当前真实状态。
   - `vehicle-loading-source-input-panel.tsx` 已将 `canRotate / canInvert` 的提示与算法一致。
   - 当 `canRotate=false` 时，`canInvert` 会自动复位为 `false` 并在 UI 上禁用，避免暴露无效组合。

4. **降低默认箱型漂移风险**
   - 前端默认箱型已收口到 `DEFAULT_VEHICLE_LOADING_PACKAGE_DIMENSION` 单点常量。
   - 本轮不继续扩大到跨前后端共享常量，但至少消除了前端内部重复定义的漂移风险。

5. **验证结果**
   - `pnpm exec vitest run src/features/logistics-config/vehicle-loading/engine/load-planning/vehicle-loading-engine.test.ts`：通过。
   - `go test ./handlers -run "TestGetVehicleLoadingRecommendationsHandler(ReturnsRecommendations|ConsumesCanInvert)" -count=1`：通过。
   - `pnpm exec eslint src/features/logistics-config/vehicle-loading/engine/load-planning/vehicle-orientation.ts src/features/logistics-config/vehicle-loading/engine/load-planning/vehicle-loading-engine.test.ts src/features/logistics-config/vehicle-loading/services/vehicle-loading-package-input.ts src/features/logistics-config/vehicle-loading/components/vehicle-loading-source-input-panel.tsx src/features/logistics-config/vehicle-loading/vehicle-loading-tab.tsx`：通过。
   - `pnpm exec tsc --noEmit`：通过。

#### 20.21 P3 阶段：单位映射 Authority 化改造 (2026-04-16)

**背景与目标**
在 `vehicle-loading` 模块中，从 `packing-rule` 提取长宽高与重量时，当前直接通过硬编码的 `toMillimeters` 和 `toKilograms` 匹配单位字符串（如 'mm', 'cm', 'kg'）。这种模式与系统的单位主数据（Unit Authority）脱节。
经过调研，现有 `Unit` 模型包含 `code, name, category` 等属性，但不自带换算系数。因此本轮的改造目标不是“动态支持任意自动换算”，而是**通过单位主数据做严谨校验**，提升容错性。

**执行方案**

1. **上游挂载**：
   - 在前端 hook (`use-vehicle-loading-source-package-input.ts` 或相关容器) 中接入 `useUnitsQuery` 获取活跃单位表 `units`。
2. **逻辑升级**：
   - 修改 `vehicle-loading-package-input.ts`：
     - `buildVehicleLoadingPackageInputFromProfile` 需要增加 `units: Unit[]` 参数。
     - 在转换前，必须在 `units` 中通过 `profile.dimensionUnitCode` 和 `profile.weightUnitCode` 查找到对应的合法单位实体。
     - 校验找出的单位 `category` 必须分别是 `LENGTH` 和 `WEIGHT`，否则显式报错（fail loudly）。
     - 继续沿用原有的基准单位换算率，但依托于权威的 `unit.code` 进行。
3. **向后兼容**：
   - 若遇到未注册或停用单位，明确抛出包含 `unitCode` 的异常，拦截错误试算。
   
**风险与验证**
- **风险**：需要确保 React 渲染树中调用的 hook 不会引发过度渲染，且正确处理加载态 `isLoading`。
- **验证**：静态编译 `pnpm exec tsc --noEmit` 检查接口变更；Eslint 检查规范；在 UI 测试或观察是否正常渲染 `packing-rule` 模式。

#### 20.22 P4 阶段：重构车型联系人数据链路 (2026-04-16)

**背景与目标**
在 `/shipping-management/contacts` 新增联系人时出现隐蔽的 `400 Bad Request` 报错。经排查发现，问题根源在于前后端对 `channels`（联系方式）的处理逻辑存在严重的“双向复杂化”：前端为了拆分 UI 视图将数据打散再重组，后端为了“容错”又做了极深的归一化（Normalization）和自动补齐。两套复杂的黑盒逻辑导致契约漂移和难以排查的边界报错。
重构目标：**化繁为简，所见即所得**。

**执行方案**

1. **后端验证降级**：
   - 彻底删除 `normalizeVehicleContactChannels` 的“自作主张补主电话”和数组重排序逻辑。
   - `validateVehicleContactBindingUpsert` 仅作最基础的非空判断（必含 `vehicleId`、`contactName`，且传入的 `channels` 中必须仅有一个 `type="phone"` 且 `primary=true` 的项）。如果错误则返回清晰直白的校验信息。
2. **前端 Payload 直传**：
   - 废弃 `use-vehicle-contact-actions.ts` 里的 `buildContactPayload`。
   - 前端向后端的 `POST` payload 结构必须直接映射 `VehicleContactBindingUpsert`。
3. **Editor Dialog 状态精简**：
   - 移除 `phoneChannels` 与 `nonPhoneChannels` 的分离状态。
   - 移除保存时复杂的 `.filter().map()` 重组行为。
   - UI 维护唯一的一份 `channels: ContactChannel[]`，主电话的值直接在保存前通过 `.find(c => c.primary && c.type === 'phone')?.value` 提取赋给 `primaryPhone` 并一并发送。

**验证策略**
直接在 UI 新增联系人并测试联调，确认能够顺畅落库并不再出现因格式不对称导致的 `400`。

#### 20.23 P5 阶段：车型联系人编辑弹窗 UDS 1.0 样式对齐 (Task 759)

**背景与目标**
当前 `VehicleContactEditorDialog` 仍使用旧版的自定义 fixed Modal 背景和普通 Card 组合，未对齐项目中最新的 UDS 1.0 `ActionDialogShell` 规范。这导致该弹窗在视觉层级、关闭交互、头部标题样式和底部按钮区布局上与项目中其他标准弹窗（如基础设置模块的弹窗）不一致。

本轮目标：
1. 将 `VehicleContactEditorDialog` 重构为使用标准的 `ActionDialogShell` 组件
2. 使用 `buildActionDialogShellClasses` 统一弹窗各区域的样式类
3. 对齐内部表单控件的 UDS 1.0 样式（如 Label 的 `text-[10px] font-black uppercase`，Input/Select 的 `h-10 rounded-xl` 等）
4. 优化“联系方式”列表及对应行的视觉层级与操作按钮样式，保持整体一致性

**执行方案**

1. **替换弹窗容器**
   - 移除外层的 `fixed inset-0` div 和内层 `Card`
   - 引入 `ActionDialogShell` 和 `buildActionDialogShellClasses`
   - 提取底部按钮区为 `footer` prop
   - 标题区域加入 `Users` 图标并统一 class

2. **表单控件样式对齐**
   - 所有的 `<label>` 内部文本使用 `<Label className='text-[10px] font-black uppercase ml-1'>`
   - `<Input>`、`<select>` 和模拟的 div 输入框统一加上 `h-10 rounded-xl`
   - 所有的 `<textarea>` 加上 `rounded-xl`

3. **联系方式列表样式对齐**
   - 调整“添加联系方式”按钮和每一行的删除、类型切换等操作的样式
   - `VehicleContactChannelRow` 内部控件同样对齐 `h-10 rounded-xl`

**验证策略**
1. 打开“新增联系人”或“编辑”弹窗，确认整体显示为标准 UDS 1.0 圆角弹窗
2. 标题区带有图标、全大写加粗等样式，底部按钮区固定且样式正确
3. 内部表单项间距、字体大小和边框样式与其他基础设置弹窗保持一致
4. 联系方式动态增删行功能正常，样式无破损
5. `pnpm exec tsc --noEmit` 通过，更新 `walkthrough.md`

**第二轮补充范围（待你确认后执行）**
1. 将 `VehicleContactEditorDialog` 中仍保留的原生 `<select>`（车型、启用状态）替换为项目现有 `Select / SelectTrigger / SelectContent / SelectItem` 体系。
2. 将 `vehicle-contact-channel-row.tsx` 中联系方式类型选择从原生 `<select>` 替换为同一套 UDS 下拉组件。
3. 统一下拉触发器的圆角、边框、字体、占位样式，以及弹层的圆角、阴影、hover/selected 态，消除浏览器原生下拉菜单观感。
4. 保持现有字段值、保存 payload 和 `channels` 状态结构不变，本轮只调整交互承接与视觉实现。

**第二轮执行结果（2026-04-16）**
1. `VehicleContactEditorDialog` 中的车型、启用状态已切到项目统一 `Select` 体系。
2. `vehicle-contact-channel-row.tsx` 中的联系方式类型选择与只读电话类型展示已同步切到同一套 `Select` 体系。
3. 下拉触发器与弹层已统一为圆角、阴影、hover/selected 态一致的 UDS 浮层菜单，不再使用浏览器原生下拉。
4. 本轮未改动字段值、保存 payload 或 `channels` 状态结构，仅收口交互承接与视觉实现。

#### 20.24 P6 阶段：修复 `/logistics-config/vehicle-loading` 页面 `categoryLabel` 导入漂移导致的模块加载 500

**背景与目标**
当前 `/logistics-config/vehicle-loading` 页面在前端模块加载阶段直接失败，浏览器报错：
`The requested module '.../vehicle-loading.utils.ts' does not provide an export named 'categoryLabel'`。

经核对，当前问题不是接口数据异常，也不是页面运行时状态错误，而是一个明确的 ESM 命名导出漂移：
1. `src/features/logistics-config/vehicle-loading/hooks/use-vehicle-loading-page.ts` 仍导入 `categoryLabel`
2. `src/features/logistics-config/vehicle-loading/data/vehicle-loading.utils.ts` 当前只导出 `categoryLabelKey`

这会导致页面在模块解析阶段就报错，React 尚未进入正常渲染链，因此表现为页面直接 500 / ErrorBoundary 重建。

**执行方案**
1. 先对齐 `use-vehicle-loading-page.ts` 与 `vehicle-loading.utils.ts` 的导出契约，优先采用最小修复，避免把本轮扩大成整条 vehicle-loading 文案/工具层重构。
2. 复核 `vehicle-loading` 域内是否还有其它调用点仍沿用旧的 `categoryLabel` 命名，避免修一处后仍残留同类模块导入错误。
3. 保持当前 `vehicle-loading.utils.ts` 中分类 label key 的 authority 边界清晰；若页面侧需要 label 文本，应明确通过现有 key 映射链消费，而不是再制造新的命名漂移。

**验证策略**
1. `/logistics-config/vehicle-loading` 页面可恢复正常进入，不再在浏览器控制台出现 `does not provide an export named 'categoryLabel'`。
2. 执行定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false`。
3. 更新 `walkthrough.md` 记录根因、修复点与验证结果。

#### 20.25 P6 阶段：简化 `/logistics-config/packaging-rules` 弹窗“包装名称”为物料库搜索选择

**背景与目标**
当前 `src/features/logistics-config/packaging-rules-tab.tsx` 中，“包装名称”字段仍是自由输入的 `Input`，这会导致包装定义的名称来源脱离物料档案。你已经明确要求本轮不要引入“包装无物料”等额外复杂机制，而是直接读取物料库即可。

结合现有代码，当前可以复用的最小实现条件已经具备：
1. 物料档案存在 `MaterialCoreService.getMaterialOptions()`
2. 物料分类中已存在 `PACKAGING`
3. 项目内已有可复用的搜索型选择组件 `src/components/ui/combobox.tsx`

**最小实施方案**
1. 在 `packaging-rules-tab.tsx` 中新增包装物料 options 查询，直接复用 `MaterialCoreService.getMaterialOptions()`。
2. 在前端将 options 过滤为 `category === 'PACKAGING'`，只向“包装名称”字段暴露包装类物料。
3. 将当前“包装名称”输入框替换为可搜索选择组件；选中后将物料名称回填到 `draft.name`。
4. 保持当前“产品”字段继续代表适用产品，不与包装物料选择混用。
5. 保持当前 `packagingRulesService.saveProfile()` 与后端 `PackagingProfile` 保存契约不扩展，本轮只调整名称来源，不增加新的后端字段。

**风险与边界**
1. 该最小方案可以把包装名称的录入入口收口到物料档案，但当前后端结构仍只保存 `name`，不会额外持久化包装物料 ID。
2. 因此它是“前端来源闭环”而不是“后端强关系闭环”；如果未来需要真正按包装物料反查包装定义，需要再补 `packagingMaterialId` 级别的数据模型扩展。
3. 本轮按你的要求不做该扩展，以保持实现简单、改动面小。

**验证策略**
1. 弹窗中“包装名称”不再是自由输入，而是只读于物料库 `PACKAGING` 类选项的可搜索选择。
2. 选中包装物料后，保存链仍可正常提交，列表展示的 `profile.name` 与所选包装物料名称一致。
3. 执行定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false`。
4. 更新 `walkthrough.md` 记录本轮简化方案与验证结果。

**执行结果（2026-04-16）**
1. `src/features/logistics-config/packaging-rules-tab.tsx` 已接入 `MaterialCoreService.getMaterialOptions()`，并复用 `MATERIAL_OPTIONS_QUERY_KEY` 读取物料库 options。
2. 弹窗“包装名称”已从自由输入切换为项目现有 `Combobox` 搜索选择，只暴露 `category === 'PACKAGING'` 的物料选项。
3. 选中包装物料后，当前草稿通过物料名称回填 `draft.name`，保存时继续沿用现有 `PackagingProfile` payload，没有扩展后端字段。
4. 同步补上包装物料查询的 fail loudly 校验，避免物料 options 缺失时静默退化为不可追踪状态。
5. 已完成定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false` 校验。

#### 20.26 P6 阶段：调整 `/logistics-config/packaging-rules` 编辑弹窗宽度与响应式布局，减少无意义滚动

**背景与目标**
当前 `src/features/logistics-config/packaging-rules-tab.tsx` 的编辑弹窗虽然字段数量并不算多，但在常见桌面尺寸下已经需要纵向滚动才能看到完整内容。根因主要有三点：
1. 外层宽度当前只有 `w-[min(1120px,calc(100vw-2rem))]`
2. 基础信息区最多仅展开到 `2xl:4` 列
3. 尺寸与装箱区要到 `xl` 才进入 4 列，再叠加汇总卡片与备注区，垂直空间被过早拉长

你的目标很明确：增加整个弹窗宽度，并优化内部响应式布局，让这类中等复杂度表单在桌面端尽量首屏可见，不要“内容不多却还得滚动下拉才能看完”。

**最小实施方案**
1. 增加 `DialogContent` 的外层宽度上限，优先通过宽度和大屏内边距释放横向空间，而不是继续依赖纵向滚动承接。
2. 调整“基础信息”区的响应式栅格，让包装名称、产品、状态、单位类字段在 `xl` / `2xl` 尺寸下能够容纳更多列。
3. 调整“尺寸与装箱”区的响应式列数，使长度、宽度、高度、单箱装数尽早横向并排，而不是在中屏下过度换行。
4. 保持汇总卡片与备注区的现有语义不变，只优化其在中大屏幕下与上方表单的空间关系。
5. 不改任何字段含义、交互契约、保存链或后端数据结构。

**验证策略**
1. 在常见桌面窗口宽度下，弹窗主体内容应明显减少无意义纵向滚动。
2. 移动端与窄屏下布局仍需自然回落，不出现横向溢出或遮挡。
3. 执行定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false`。
4. 更新 `walkthrough.md` 记录本轮布局收口内容与验证结果。

**执行结果（2026-04-16）**
1. `DialogContent` 外层宽度已从 `w-[min(1120px,calc(100vw-2rem))]` 提升为 `w-[min(1360px,calc(100vw-1.5rem))]`，优先释放桌面端横向空间。
2. “基础信息”区栅格已调整为 `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5`，让包装名称、产品、状态、单位类字段更早横向展开。
3. “尺寸与装箱”区栅格已调整为 `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`，长度、宽度、高度、单箱装数在中大屏幕下更早并排显示。
4. 本轮未调整字段语义、保存链、汇总逻辑或后端契约，仅通过容器宽度与栅格密度减少无意义纵向滚动。
5. 已完成定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false` 校验。

#### 20.27 P6 阶段：继续压缩 `/logistics-config/packaging-rules` 编辑弹窗内部垂直高度

**背景与目标**
虽然上一轮已经增宽弹窗并提高了栅格密度，但当前编辑弹窗内部仍存在较明显的纵向留白，导致整体高度还是偏大。主要落点包括：
1. 外层可滚动内容容器当前为 `space-y-7`
2. 区块容器当前为 `space-y-5`
3. section 标题区当前为 `mb-5`
4. 汇总卡片当前为 `gap-4 p-6`
5. 备注输入框当前为 `min-h-[132px]` 且 `rows={4}`

你的要求很明确：继续压缩内部内容之间的高度，并把备注输入框高度砍掉一半左右，让弹窗在桌面端尽量把主要字段完整露出来。

**最小实施方案**
1. 收口外层滚动容器与主体区块的纵向 `space-y`，减少 section 之间的空白。
2. 收口两个 section 标题区的底部 margin 与汇总卡片的 padding / gap，降低非输入内容对垂直空间的占用。
3. 将备注输入框从当前约 `132px` 高度压缩到接近一半的可用高度，并同步下调 `rows`。
4. 保持表单可读性、点击热区和视觉层级，不把压缩做成拥挤堆叠。
5. 不改任何字段语义、交互契约、保存链或后端数据结构。

**验证策略**
1. 桌面端弹窗整体纵向高度继续下降，主要字段区域尽量减少滚动。
2. 备注区仍保留基本录入能力，不因压缩导致输入体验明显退化。
3. 执行定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false`。
4. 更新 `walkthrough.md` 记录本轮内部间距收口内容与验证结果。

**执行结果（2026-04-16）**
1. 外层滚动容器已从 `space-y-7` 收口为 `space-y-5`，并将 `py-7/lg:py-8` 收口为 `py-6/lg:py-6`，降低整体纵向留白。
2. 主体区块容器已从 `space-y-5` 收口为 `space-y-4`，两个 section 标题区已从 `mb-5` 收口为 `mb-4`。
3. section 容器 padding 已从 `p-5 md:p-6` 收口为 `p-4 md:p-5`；汇总卡片也从 `gap-4 p-6` 收口为 `gap-3 p-4`。
4. 备注输入框已从 `min-h-[132px] rows={4}` 压缩为 `min-h-[72px] rows={2}`，并同步下调内边距。
5. Footer 顶部留白已从 `pt-4` 收口为 `pt-2`，进一步减少无意义垂直占高。
6. 本轮未改动字段语义、保存链或后端契约；已完成定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false` 校验。

#### 20.28 P6 阶段：收口 `shipping-management` 车型联系人写入链的分层越界

**背景与目标**
当前 `src/features/shipping-management/hooks/use-vehicle-contact-actions.ts` 在一个 Hook 内同时承担了三类职责：
1. 直接调用 `apiFetch(...)` 发起保存 / 删除请求
2. 调用 `queryClient.invalidateQueries(...)` 承接 Query 失效
3. 调用 `showToast(...)` 承接 UI 提示

这与 `GEMINI.md` 中 `5.2 服务层的去副作用化` 与 `5.5 前端状态治理边界` 的要求不一致：
- `services/` 应只负责请求与 DTO 适配
- Hook 层负责 `invalidateQueries`、toast 等副作用编排

此外，当前 `shipping-management` 域并没有对应的 `services/` 目录承接车型联系人请求；读取链 `use-vehicle-contact-bindings.ts` 也仍在 Hook 内直接 `apiFetch(...)`，并通过 `normalizeVehicleContactBindingsResponse()` 将异常响应静默兜底成空数组，这与当前项目更偏向的 fail loudly 方向也存在漂移。

**最小实施方案**
1. 新增 `src/features/shipping-management/services/vehicle-contact-service.ts`，承接车型联系人的保存 / 删除请求，并补齐基础 DTO / 响应契约处理。
2. 让 `use-vehicle-contact-actions.ts` 只负责调用 service、执行 `invalidateQueries`，以及通过 `showToast` 收口成功 / 失败提示。
3. 评估是否同步把 `use-vehicle-contact-bindings.ts` 的读取链迁移到 service：
   - 若本轮一并处理，则去掉静默 `[]` 兜底，改为更明确的契约校验 / fail loudly
   - 若本轮不处理，则至少在规划与文档中显式记录该遗留风险
4. 不改变现有联系人保存 payload 语义，不扩大到联系人表单结构重构。

**风险与边界**
1. 该问题不只是“把 `apiFetch` 移文件”这么简单；如果引入 service，就要明确 DTO 契约和响应校验边界，避免只是做物理搬运。
2. 读取链 `use-vehicle-contact-bindings.ts` 也有相似越层问题，但本轮主修复应优先聚焦写链；是否联动读取链，需根据改动面控制做最小判断。
3. 本轮不触碰联系人表单 payload 语义，只处理分层边界与请求承接位置。

**验证策略**
1. `use-vehicle-contact-actions.ts` 不再直接持有 `apiFetch(...)` 请求细节。
2. 车型联系人保存 / 删除流程仍可正常触发刷新与 Toast。
3. 若联动读取链，则确认不再静默把异常响应吞成 `[]`。
4. 执行定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false`。
5. 更新 `walkthrough.md` 记录本轮分层收口与验证结果。

**执行结果（2026-04-16）**
1. 已新增 `src/features/shipping-management/services/vehicle-contact-service.ts`，统一承接车型联系人的 `list / save / delete` 请求。
2. service 内已显式对后端返回做契约校验：
   - 列表接口按数组响应校验
   - 保存接口按对象响应校验
   - `channelsJson` 已统一适配为前端消费所需的 `channels`
3. `use-vehicle-contact-actions.ts` 已移除直接 `apiFetch(...)`，当前只保留 service 调用、`invalidateQueries` 与 `showToast` 编排。
4. `use-vehicle-contact-bindings.ts` 已移除 Hook 内直接请求和静默 `[]` 兜底，读取链统一改走 `vehicleContactService.listBindings()`。
5. 本轮按你选择的“写读一起收口”范围执行，但仍未扩大到联系人表单 payload 语义重构，仅处理请求承接层和 DTO 边界。
6. 已完成定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false` 校验。

#### 20.29 P6 阶段：收口 `vehicle-contact-editor-dialog.tsx` 中基于 `Partial<T>` 的本地补丁更新表达

**背景与目标**
当前 `src/features/shipping-management/vehicle-contact-editor-dialog.tsx` 仍存在两处以 `Partial<T>` 表达本地更新的写法：
1. `updateForm(patch: Partial<VehicleContactBindingForm>)`
2. `updateChannel(index, patch: Partial<ContactChannel>)`

这些 `Partial` 目前主要用于本地表单状态更新，而不是直接作为后端 PATCH / SDRTS 载荷提交；但 `GEMINI.md` `2.2 SDRTS 差量更新协议` 已明确要求“禁止手动构造 `Partial<T>`”，因此这类业务层局部补丁写法仍然需要收口。

同时，这个场景也有明确边界：你此前已经强调过 `vehicle-contacts` 的 `channels` 处理不要再被过度复杂化。因此本轮目标不是把本地表单编辑器重构成重型 SDRTS 提交器，而是把当前 `Partial<...>` 改成更明确、结构化、可读的本地更新语义。

**最小实施方案**
1. 将 `updateForm` 替换为更明确的字段级更新入口，例如按字段名 / 值更新，或拆成小型结构化 helper，避免继续使用 `Partial<VehicleContactBindingForm>`。
2. 将 `updateChannel` 替换为更明确的 channel 更新语义，避免以 `Partial<ContactChannel>` 合并方式表达本地修改。
3. 保持 `setPrimaryChannel`、`addChannel`、`removeChannel`、表单校验和最终保存 payload 语义不变，不扩大到联系人 payload 结构重构。
4. 若需要引入本地增量结构，应保持轻量，仅服务于本地表单状态表达，不把它误升级为完整的远端 SDRTS 提交协议。

**风险与边界**
1. 不能为了满足“去 `Partial`”而把本地 UI 更新语义做得比当前更难维护。
2. 需要继续维持 `channels` 与 `primaryPhone` 的联动关系，避免在重写局部更新函数时引入主电话同步回归。
3. 本轮只处理本地状态更新表达，不改后端接口，不改当前保存 payload 语义。

**验证策略**
1. `vehicle-contact-editor-dialog.tsx` 不再出现 `Partial<VehicleContactBindingForm>` 与 `Partial<ContactChannel>`。
2. 表单字段编辑、联系方式类型切换、主电话联动、删除 / 新增渠道逻辑保持正常。
3. 执行定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false`。
4. 更新 `walkthrough.md` 记录本轮本地增量表达收口与验证结果。

**执行结果（2026-04-16）**
1. `vehicle-contact-editor-dialog.tsx` 已移除 `updateForm(patch: Partial<VehicleContactBindingForm>)`，改为更明确的 `updateFormField(field, value)` 字段级更新入口。
2. 已移除 `updateChannel(index, patch: Partial<ContactChannel>)`，改为 `updateChannels(...)` + `setChannelType(...)` + `setChannelValue(...)` 等结构化本地更新语义。
3. `setPrimaryChannel`、`addChannel`、`removeChannel` 继续复用统一的 channel 更新承接，并保持 `primaryPhone` 自动联动逻辑不变。
4. 本轮没有把本地编辑器硬升级成重型 SDRTS 提交器，只收口了业务层 `Partial<T>` 表达方式，同时保留当前交互和最终保存 payload 语义。
5. 已完成定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false` 校验。

#### 20.30 P6 阶段：收口 `vehicle-contact-service.ts` 中未使用 Zod Schema 的 DTO 解析

**背景与目标**
当前 `src/features/shipping-management/services/vehicle-contact-service.ts` 虽然已经把请求职责从 Hook 中抽离出来，但 DTO 层仍然没有对齐 `GEMINI.md` 的要求。现状包括：
1. service 内手写了 `VehicleContactBindingApiDTO`
2. 通过 `ensureObjectResponse()` / `ensureArrayResponse()` 自行做运行时校验
3. 直接在 service 内对后端 `channelsJson` 做 `JSON.parse(...)` 再映射为前端 `channels`

这与 `GEMINI.md` `2.1 全量 DTO 模型` 的要求不一致：`services` 返回值必须基于 Zod Schema 定义的 DTO 模型，不能继续依赖散落的手写运行时解析逻辑。

**当前项目可复用模式**
1. `src/features/logistics-config/vehicle-loading/services/vehicle-loading.schema.ts` 已采用 feature 内 schema 文件承接 DTO。
2. `src/features/material-archive/contracts/material-api-contract.ts` 已采用 `*ApiDTOSchema` + `z.infer` 组织 API 契约。
3. 因此本轮应优先复用现有 Zod DTO 组织方式，而不是继续在 service 内散落手写 JSON 适配与校验逻辑。

**最小实施方案**
1. 为 `shipping-management / vehicle-contact` 新增对应的 Zod schema 文件，承接联系人列表项、联系人渠道、以及列表 / 单项响应 DTO 契约。
2. 将 `channelsJson` 的解析与转换收口到 schema / adapter 边界：
   - schema 负责定义原始 API DTO 形态
   - adapter 或 transform 负责将 `channelsJson` 转成前端消费所需的 `channels`
3. 将 `vehicle-contact-service.ts` 中手写 `VehicleContactBindingApiDTO`、`ensure*Response()` 调用与散落的 JSON 解析逻辑替换为基于 Zod schema 的解析流程。
4. 保持当前 hook / service 分层不回退，不改联系人业务交互、不改保存语义。

**风险与边界**
1. 本轮目标是 DTO 契约与解析方式对齐，不扩大到联系人业务流程改造。
2. `channelsJson` 是后端当前真实返回字段，因此前端仍需要适配，但适配点应收口在 schema / adapter，而不是继续散落在 service 主逻辑里。
3. 需要避免为了“上 Zod”而把当前简单 DTO 链路拆得过碎；在满足 schema 约束的前提下仍保持可维护性。

**验证策略**
1. `vehicle-contact-service.ts` 不再手写 `VehicleContactBindingApiDTO` 与散落的运行时解析逻辑。
2. 联系人列表读取、保存返回与 `channelsJson -> channels` 适配仍保持正确。
3. 执行定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false`。
4. 更新 `walkthrough.md` 记录本轮 DTO schema 收口与验证结果。

**执行结果（2026-04-16）**
1. 已新增 `src/features/shipping-management/services/vehicle-contact.schema.ts`，用 Zod schema 承接车型联系人的渠道 DTO、原始联系人 DTO 与转换后联系人 DTO。
2. `channelsJson` 的解析已收口到 schema transform 边界，不再由 service 主逻辑手写 `JSON.parse(...)` 和逐字段运行时校验。
3. `vehicle-contact-service.ts` 已移除手写 `VehicleContactBindingApiDTO`、`ensureObjectResponse()` / `ensureArrayResponse()` 解析流程，改为统一基于 schema `safeParse()` 验证列表与单项返回。
4. 当前 hook / service 分层没有回退，联系人读取 / 保存返回语义保持不变。
5. 已完成定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false` 校验。

#### 20.31 P6 阶段：收口 `use-vehicle-contact-actions.ts` 的副作用编排职责

**背景与目标**
当前 `src/features/shipping-management/hooks/use-vehicle-contact-actions.ts` 虽然已经不再直接持有请求细节，但职责仍然偏宽：
1. 通过 `vehicleContactService` 发起写入动作
2. 统一执行 `queryClient.invalidateQueries(...)`
3. 直接调用 `showToast(...)`
4. 同时负责成功 / 失败文案与错误转译

相比项目内其它写动作 hook（如 `useProductWriteActions()`、`useProductAttributeWriteActions()`），它已经更接近一个通用动作编排层。`GEMINI.md` 虽然允许副作用位于 Hook / `onSuccess` 层，但从职责分离上看，更稳妥的边界通常是：
- `service` 只管请求与 DTO
- 写动作 hook 主要承接 mutation 与 query invalidation
- UI 层或更具体的页面交互层决定 toast 展示与提示文案

**最小实施方案**
1. 收口 `use-vehicle-contact-actions.ts`，移除对 `showToast` 的直接依赖和内置文案转译逻辑。
2. 保留写动作调用与 `invalidateQueries`，让 hook 返回更纯粹的结果或抛错行为。
3. 将成功 / 失败 toast 的展示上浮到 `contacts-page.tsx` 或更具体的 UI 调用点（如删除确认、编辑保存回调）。
4. 不改当前联系人写入 service，不改联系人业务语义与 DTO 层。

**风险与边界**
1. 本轮目标是缩窄 Hook 责任，不是把 query invalidation 也全部推回 UI；否则页面层容易重新堆叠重复刷新逻辑。
2. toast 展示上浮后，需要避免在多个 UI 调用点复制粘贴完全相同的错误处理样板。
3. 本轮不扩大到新的 dispatcher / workflow 抽象，仅做最小边界收口。

**验证策略**
1. `use-vehicle-contact-actions.ts` 不再直接接收 `showToast` 或负责提示文案转译。
2. 保存 / 删除后仍可正常触发列表刷新。
3. UI 层仍能展示成功 / 失败提示，且用户可见行为不回退。
4. 执行定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false`。
5. 更新 `walkthrough.md` 记录本轮副作用边界收口与验证结果。

**执行结果（2026-04-16）**
1. `use-vehicle-contact-actions.ts` 已移除对 `showToast` 的依赖和内置成功 / 失败文案处理，当前仅保留 `vehicleContactService` 调用与 `invalidateQueries`。
2. `contacts-page.tsx` 已承接保存、删除和启停切换场景的成功 / 失败提示展示，并在失败时保留错误上抛或用户可见反馈。
3. 当前 query invalidation 没有散回 UI 层，Hook 仍保持写动作与刷新编排职责，避免页面层重复堆叠刷新逻辑。
4. 当前 service / hook 分层没有回退，联系人业务语义保持不变。
5. 已完成定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false` 校验。

#### 20.32 P6 阶段：继续收口 `use-vehicle-contact-actions.ts` 中领域操作与缓存失效策略的绑定

**背景与目标**
上一轮已经把 toast 展示从 `use-vehicle-contact-actions.ts` 上浮到页面层，但当前该 hook 仍然把“领域写操作”与“缓存失效策略”绑定在一起：
1. 通过 `vehicleContactService` 执行保存 / 删除
2. 在同一个通用动作 hook 内固定执行 `queryClient.invalidateQueries({ queryKey: vehicleContactQueryKeys.all() })`

这种写法短期可用，但从边界上看仍然偏强：如果后续联系人写动作被不同页面、不同查询真相源或不同刷新策略复用，这个 hook 会继续承担越来越多“面向当前页面缓存结构”的知识，逐步演变成业务中枢。

**最小实施方案**
1. 收口 `use-vehicle-contact-actions.ts`，移除其内部固定的 `invalidateQueries(...)` 策略绑定，让它只负责调用写入 service 并返回结果 / 抛错。
2. 将缓存失效策略上浮到 `contacts-page.tsx` 或更具体的页面管理层，由页面根据当前消费的 query key 明确决定刷新策略。
3. 若页面层出现重复的失效策略样板，再评估是否需要新增更具体的管理 hook（例如 `useVehicleContactPageActions`），而不是继续把策略塞回通用动作 hook。
4. 不改 `vehicleContactService`，不改联系人业务语义与当前交互。

**风险与边界**
1. 本轮目标是让通用动作层不再绑定当前缓存结构，不是否定 React Query invalidation 本身。
2. 页面层上浮后要注意避免把刷新逻辑复制到过多调用点；若样板过多，应继续上浮到“页面级管理 hook”，而不是回退到通用动作 hook。
3. 本轮不扩大到 dispatcher / workflow 抽象，只做最小边界收口。

**验证策略**
1. `use-vehicle-contact-actions.ts` 不再固定持有 `queryClient.invalidateQueries(...)` 策略。
2. `contacts-page.tsx` 仍能在保存 / 删除 / 启停后正确刷新联系人列表。
3. 用户侧可见行为不回退，错误与成功提示继续正常展示。
4. 执行定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false`。
5. 更新 `walkthrough.md` 记录本轮缓存策略解耦与验证结果。

**执行结果（2026-04-16）**
1. `use-vehicle-contact-actions.ts` 已移除固定的 `queryClient.invalidateQueries(...)` 绑定，当前仅保留保存 / 删除请求动作。
2. `contacts-page.tsx` 已新增页面级 `refreshVehicleContacts()`，由当前页面决定保存、删除、启停切换后的刷新时机与目标 query key。
3. 当前联系人列表刷新、成功 / 失败提示与用户可见行为均保持不变。
4. `vehicleContactService` 的纯请求边界没有回退，联系人业务语义与交互保持不变。
5. 已完成定向 `eslint` 与 `pnpm exec tsc --noEmit --pretty false` 校验。
