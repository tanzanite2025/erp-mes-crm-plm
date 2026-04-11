# 变更记录与验证（walkthrough.md）

## 2026-04-11 `production-shared` 第一阶段拆分

### 本轮目标

按照已批准的 `implementation_plan.md` 第 12 节，先对 `src/features/production-shared` 做第一阶段最小拆分，不一次性重做整个生产域，重点收口以下问题：

1. `production-resource-service.ts` 同时混装产线、工序、能力映射三类资源读写。
2. 领域类型仍挂在 `tabs/**` 页面实现目录下，被外部模块作为正式依赖引用。
3. `engineering`、`dashboard`、`org-personnel`、`users` 等模块直接依赖 `production-shared` 的旧宿主入口。

### 已执行变更

#### 1. 抽出稳定领域类型

新增：

- `src/features/production-shared/data/production-line.ts`
- `src/features/production-shared/data/production-process.ts`

作用：

1. 将 `ProductionLine / ProductionSegment / ProductionStation / ProductionJobCategory` 从 `tabs/line-mgmt/types.ts` 迁出。
2. 将 `ProductionProcessStep` 从 `tabs/work-architecture/components/process-utils.ts` 迁出。
3. 使正式领域类型不再寄生在页面/tabs 目录。

#### 2. 拆分大一统 service

新增：

- `src/features/production-shared/services/production-lines-service.ts`
- `src/features/production-shared/services/production-processes-service.ts`
- `src/features/production-shared/services/production-mappings-service.ts`

调整：

- `src/features/production-shared/services/production-resource-service.ts`

结果：

1. 产线资源读写收口到 `productionLinesService`。
2. 工序资源读写收口到 `productionProcessesService`。
3. 工位/工序能力映射收口到 `productionMappingsService`。
4. 旧 `productionResourceService` 降级为兼容聚合转发层，仅转发到三组新 service，并保留旧事件常量导出。

#### 3. 调整 adapter 边界

调整：

- `src/features/production-shared/adapters/production-resource-api-adapter.ts`

结果：

1. adapter 不再依赖 `tabs/**` 内部类型。
2. DTO -> Contract 映射统一对接新的 `data/production-line.ts` 与 `data/production-process.ts`。
3. 新增统一的 `toProductionProcessContract()` 映射导出，避免工序存在双来源 contract 语义。

#### 4. 保留兼容壳，但移除正式依赖

调整：

- `src/features/production-shared/tabs/line-mgmt/types.ts`
- `src/features/production-shared/tabs/work-architecture/components/process-utils.ts`

结果：

1. 旧路径仍保留，避免一次性打断所有潜在引用。
2. 但这两个文件已降级为兼容 re-export / 转发壳，不再承载正式领域定义与真实实现。

#### 5. 替换第一批直接消费者

已切换到新稳定入口的文件：

- `src/features/dashboard/index.tsx`
- `src/features/dashboard/tabs/overview-tab.tsx`
- `src/features/org-personnel/components/production-selector.tsx`
- `src/features/org-personnel/tabs/employee-management-list.tsx`
- `src/features/users/hooks/use-users-action-dialog-options.ts`
- `src/features/engineering/components/product/product-routing-view.tsx`
- `src/features/production-shared/tabs/line-mgmt/index.tsx`
- `src/features/production-shared/tabs/work-architecture/index.tsx`
- `src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx`

收口结果：

1. 这些文件不再正式依赖 `production-shared/tabs/**` 内部类型文件。
2. 产线读取改优先走 `productionLinesService`。
3. 工序读取改优先走 `productionProcessesService`。
4. 用户/人员场景对产线拓扑的遍历，已按新的 `segment -> jobCategories -> stations -> processes` 结构读取。

### 本轮未做

1. 未在本轮移除 `window.dispatchEvent(...)` 事件兼容层。
2. 未顺手重做 `dashboard` 整体架构。
3. 未联动做 `engineering` 全域重构。
4. 未重做 `users / org-personnel` 业务边界，只收口了它们对 `production-shared` 的直接不合理依赖。

### 验证

已执行：

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/production-shared/adapters/production-resource-api-adapter.ts src/features/production-shared/services/production-resource-service.ts src/features/production-shared/services/production-lines-service.ts src/features/production-shared/services/production-processes-service.ts src/features/production-shared/services/production-mappings-service.ts src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx src/features/production-shared/tabs/work-architecture/index.tsx src/features/production-shared/tabs/line-mgmt/index.tsx src/features/dashboard/index.tsx src/features/dashboard/tabs/overview-tab.tsx src/features/org-personnel/components/production-selector.tsx src/features/org-personnel/tabs/employee-management-list.tsx src/features/users/hooks/use-users-action-dialog-options.ts src/features/engineering/components/product/product-routing-view.tsx`

结果：

1. `tsc --noEmit` 通过。
2. 本轮目标文件 `eslint` 通过。

### 当前阶段结论

`production-shared` 第一阶段最小拆分已完成：

1. 正式领域类型已从 `tabs/**` 页面实现层抽离。
2. 核心资源 service 已按 lines / processes / mappings 三类职责拆分。
3. 旧聚合 service 已收敛为兼容转发层。
4. 第一批跨模块直接消费者已切换到新稳定入口。
5. 为下一阶段移除 service 内副作用与替换裸事件机制留下了清晰边界。

## 2026-04-11 `production-shared` 第二阶段去副作用化 + typed bus / invalidation 收口

### 本轮目标

在第一阶段拆分基础上，继续收口 `production-shared` 的副作用边界，重点解决以下问题：

1. `productionLinesService / productionProcessesService / productionMappingsService` 内部仍直接执行 `window.dispatchEvent(...)`。
2. 第一批消费者仍直接监听裸事件字符串完成刷新。
3. 生产资源更新同步缺少单一协调层，不利于后续接入 React Query invalidation 或更明确的 mutation orchestration。

### 已执行变更

#### 1. 新增统一 sync 协调层

新增：

- `src/features/production-shared/services/production-resource-sync.ts`

作用：

1. 提供 `ProductionResourceKind = 'lines' | 'processes' | 'mappings'` typed event 模型。
2. 提供 `productionResourceSync.subscribe(...)` 统一订阅入口。
3. 提供 `emitLinesUpdated() / emitProcessesUpdated() / emitMappingsUpdated()` 单点广播入口。
4. 兼容保留旧 `window` 事件桥接，但桥接逻辑已收口到单文件单点。

#### 2. 三类子域 service 去副作用化

调整：

- `src/features/production-shared/services/production-lines-service.ts`
- `src/features/production-shared/services/production-processes-service.ts`
- `src/features/production-shared/services/production-mappings-service.ts`

结果：

1. 三类 service 内部已移除 `dispatchEvent`。
2. 三类 service 现在只保留 API 请求、DTO 校验、contract 转换等纯数据职责。
3. 旧事件常量导出改由 `production-resource-sync.ts` 统一承接，再由兼容入口继续导出。

#### 3. 兼容入口事件常量收口

调整：

- `src/features/production-shared/services/production-resource-service.ts`

结果：

1. `PRODUCTION_LINES_UPDATED_EVENT / PRODUCTION_PROCESSES_UPDATED_EVENT / PRODUCTION_MAPPINGS_UPDATED_EVENT` 统一从 sync 层导出。
2. 旧聚合入口继续存在，但不再承担事件分发实现。

#### 4. 第一批监听方迁移到统一订阅入口

已切换：

- `src/features/production-shared/tabs/work-architecture/index.tsx`
- `src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx`
- `src/features/org-personnel/components/production-selector.tsx`
- `src/features/dashboard/index.tsx`
- `src/features/engineering/components/product/product-routing-view.tsx`

结果：

1. 这些文件已不再直接 `addEventListener(PRODUCTION_...)`。
2. 已统一改为 `productionResourceSync.subscribe(...)`。
3. 监听方只依赖 typed `kind`，不再分散耦合具体裸事件字符串。

#### 5. mutation 成功后的广播职责前移

调整：

- `src/features/production-shared/tabs/line-mgmt/index.tsx`
- `src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx`

结果：

1. 产线保存 / 更新 / 删除成功后，由页面 action handler 显式 `emitLinesUpdated()`。
2. 工序保存 / 删除成功后，由页面 action handler 显式 `emitProcessesUpdated()`。
3. “谁发起更新，谁决定是否广播同步” 的边界已经建立，不再由 service 隐式偷偷广播。

### 本轮未做

1. 未把 `production-shared` 全量接入 React Query。
2. 未将 typed bus 抽象为全站事件平台。
3. 未顺手重做 `dashboard` / `engineering` / `users` / `org-personnel` 的整体状态管理方式。
4. `mappings` 由于当前未检出对应前端 mutation 调用点，本轮只先完成 service 去副作用化与 sync 能力预留，不盲目扩散修改。

### 验证

已执行：

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/production-shared/services/production-resource-sync.ts src/features/production-shared/services/production-resource-service.ts src/features/production-shared/services/production-lines-service.ts src/features/production-shared/services/production-processes-service.ts src/features/production-shared/services/production-mappings-service.ts src/features/production-shared/tabs/line-mgmt/index.tsx src/features/production-shared/tabs/work-architecture/index.tsx src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx src/features/org-personnel/components/production-selector.tsx src/features/dashboard/index.tsx src/features/engineering/components/product/product-routing-view.tsx`

结果：

1. `tsc --noEmit` 通过。
2. 本轮目标文件 `eslint` 通过。

### 当前阶段结论

`production-shared` 第二阶段最小收口已完成：

1. 三类子域 service 已完成去副作用化。
2. `production-shared` 域内已建立统一 typed bus / sync 协调层。
3. 第一批监听方已从裸事件字符串切换到统一同步入口。
4. 旧 `window` 事件已收敛为单点兼容桥，而不是分散在多个 service / 页面中。
5. 为后续引入更明确的 invalidation 规则、query key 约定和模块级 hook 编排留下了清晰边界。

## 2026-04-11 `production-shared` 第三阶段 query key / invalidation 约定

### 本轮目标

在第二阶段 typed sync 收口基础上，继续为 `production-shared` 建立正式缓存约定，重点解决以下问题：

1. `production-shared` 域内缺少统一的 query key 命名入口。
2. invalidation 没有统一 helper，后续容易出现散落的 `invalidateQueries(...)` 与多套命名。
3. typed sync 与 React Query 缓存失效之间虽然已经有边界意识，但尚未真正通过统一代码入口体现。

### 已执行变更

#### 1. 新增 query key 工厂

新增：

- `src/features/production-shared/data/production-resource-query-keys.ts`

作用：

1. 统一定义 `production-shared` 域内 query key：
   - `all()`
   - `lines()`
   - `processes()`
   - `mappings()`
2. 让后续生产资源相关 Query / invalidation 不再散落硬编码 key。

#### 2. 新增 invalidation 统一入口

新增：

- `src/features/production-shared/services/production-resource-invalidation.ts`

作用：

1. 提供 `registerProductionResourceQueryClient(queryClient)`。
2. 提供统一失效入口：
   - `invalidateAll()`
   - `invalidateLines()`
   - `invalidateProcesses()`
   - `invalidateMappings()`
3. 将 `invalidateQueries(...)` 收口到单点，而不是由页面和 action handler 自己拼 query key。

#### 3. 将 production-shared 与全局 QueryClient 接通

调整：

- `src/main.tsx`

结果：

1. 在应用启动阶段注册 `production-shared` 域的 `queryClient`。
2. 使 `production-resource-invalidation.ts` 可以拿到真实 QueryClient 实例，执行正式 invalidation。

#### 4. 将 typed sync 与 invalidation 协作关系落到单点

调整：

- `src/features/production-shared/services/production-resource-sync.ts`

结果：

1. `productionResourceSync.emit(...)` 在单点内同时承接：
   - typed bus 通知
   - 兼容旧 window 事件桥接
   - 对应 query key invalidation
2. 现在 typed sync 表达“资源变化语义”，而 invalidation 表达“缓存应失效并重拉”，两者通过统一单点协作，而不是分散耦合。

#### 5. 第一批调用点开始复用统一约定

当前直接相关调用点：

- `src/features/production-shared/tabs/line-mgmt/index.tsx`
- `src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx`

结果：

1. 这两个 action handler 继续只显式调用 `productionResourceSync.emit*Updated()`。
2. 它们不再需要自己手写 `invalidateQueries(...)` 或拼 query key。
3. query invalidation 已通过 `productionResourceSync -> productionResourceInvalidation -> productionResourceQueryKeys` 这条单一路径完成。

### 本轮未做

1. 未把 `production-shared` 全量读取迁成 `useQuery`。
2. 未扩展为全站 query key 平台。
3. 未顺手改造所有消费页面为 React Query 读取模式。
4. `mappings` 当前仍未检出明确前端 mutation 调用点，本轮先完成 query key / invalidation 约定基础设施与单点挂接，不盲目扩散修改。

### 验证

已执行：

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/production-shared/data/production-resource-query-keys.ts src/features/production-shared/services/production-resource-invalidation.ts src/features/production-shared/services/production-resource-sync.ts src/features/production-shared/tabs/line-mgmt/index.tsx src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx src/main.tsx`

结果：

1. `tsc --noEmit` 通过。
2. 本轮目标文件 `eslint` 通过。

### 当前阶段结论

`production-shared` 第三阶段最小约定已完成：

1. `production-shared` 域内已有统一 query key 工厂。
2. `production-shared` 域内已有统一 invalidation 入口。
3. typed sync 与 query invalidation 的职责边界已经通过代码结构正式体现。
4. 第一批直接相关调用点已经开始复用统一约定，而不是散落硬编码 query key。
5. 为后续将 lines / processes / mappings 逐步迁入 `useQuery` 留下了稳定的命名与失效规则基础。

## 2026-04-11 `production-shared` 第四阶段核心读取迁移到 `useQuery`

### 本轮目标

在第三阶段 query key / invalidation 约定基础上，将 `production-shared` 的首批核心读取场景迁移到 React Query，重点解决以下问题：

1. 多个页面仍通过手写 `loadData()` + `useEffect()` 拉取 production resources。
2. 即使 query key / invalidation 已经建立，读取侧仍未真正复用该约定。
3. 已迁移为 typed sync 的页面如果继续维持手动拉取 effect，会导致同步模型不统一。

### 已执行变更

#### 1. 新增统一 query options 工厂

新增：

- `src/features/production-shared/data/production-resource-query-options.ts`

作用：

1. 为 `lines / processes / mappings` 提供统一读取配置。
2. `queryFn` 继续复用现有纯 service。
3. 读取层正式与第三阶段的 query key 命名约定闭环。

#### 2. 新增最小读取 hooks

新增：

- `src/features/production-shared/hooks/use-production-resources.ts`

作用：

1. 提供：
   - `useProductionLinesQuery()`
   - `useProductionProcessesQuery()`
   - `useProductionMappingsQuery()`
2. 支持透传部分 Query 配置（例如 `enabled`），便于弹窗/延迟加载场景使用。

#### 3. 首批 4 个核心读取页面迁移到 `useQuery`

已迁移：

- `src/features/production-shared/tabs/work-architecture/index.tsx`
- `src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx`
- `src/features/org-personnel/components/production-selector.tsx`
- `src/features/engineering/components/product/product-routing-view.tsx`

结果：

1. 这 4 个页面已不再直接调用：
   - `productionLinesService.getLines()`
   - `productionProcessesService.getSteps()`
   作为页面主数据 effect 拉取入口。
2. 这 4 个页面已不再依赖 `productionResourceSync.subscribe(...)` 做同类主数据刷新。
3. 已迁移页面改由 React Query 读取，刷新由第三阶段建立的 invalidation 规则统一触发。

#### 4. 保留现有写入链路稳定

本轮未改动以下核心约定：

1. `line-mgmt` 的乐观 UI / 手动局部回写逻辑继续保留。
2. `process-library-panel` 的保存/删除仍通过 mutation 成功后 `emitProcessesUpdated()` 完成同步。
3. `production-shared` 读取迁移没有反向破坏第二阶段的 typed sync 与第三阶段的 invalidation 单点。

#### 5. 对特殊页面做最小兼容处理

1. `production-selector.tsx`
   - 使用 `useProductionLinesQuery({ enabled: open })`，避免弹窗关闭时无意义请求。
   - 本地选择态改为在弹窗开关回调中初始化，避免 effect 内同步 `setState`。

2. `product-routing-view.tsx`
   - 将默认演示 route nodes 改为派生数据而非 effect 内同步写 state。
   - 规避 React 关于 effect 内同步 `setState` 的约束，同时保持示例 UI 可运行。

### 本轮未做

1. 未迁移 `dashboard/index.tsx` 到 `useQuery`。
2. 未迁移 `line-mgmt/index.tsx` 到 `useQuery`，以避免打断现有乐观更新链路。
3. 未对 `mappings` 消费页面做全量 Query 化。
4. 未扩展为全站统一读取层改造。

### 验证

已执行：

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/production-shared/data/production-resource-query-options.ts src/features/production-shared/hooks/use-production-resources.ts src/features/production-shared/tabs/work-architecture/index.tsx src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx src/features/org-personnel/components/production-selector.tsx src/features/engineering/components/product/product-routing-view.tsx`

结果：

1. `tsc --noEmit` 通过。
2. 本轮目标文件 `eslint` 通过。

### 当前阶段结论

`production-shared` 第四阶段首批 Query 化已完成：

1. `production-shared` 域内已建立统一读取 query options / hooks 入口。
2. 首批 4 个核心读取页面已切换到 `useQuery`。
3. 已迁移页面不再依赖手写 `loadData()` + `useEffect()` 拉取同类资源主数据。
4. 已迁移页面与第三阶段的 query key / invalidation 约定形成闭环。
5. 为后续继续迁移 `dashboard`、`line-mgmt` 以及可能的 `mappings` 消费页面留下了稳定模式。

## 2026-04-11 `dashboard/index.tsx` Query 化收口

### 本轮目标

在第四阶段首批 Query 化基础上，将 `dashboard/index.tsx` 纳入 `production-shared` 读取收口，重点解决以下问题：

1. dashboard 仍通过手写拉取获取 production lines / segments。
2. dashboard 将 production resources 刷新与 storage 配置同步混在同一套 effect 中。
3. 若继续保留这种混合刷新方式，会削弱第三阶段 invalidation 与第四阶段 Query 化的价值。

### 已执行变更

#### 1. dashboard 主数据读取切换到 `useQuery`

调整：

- `src/features/dashboard/index.tsx`

结果：

1. `dashboard/index.tsx` 已改为复用 `useProductionLinesQuery()`。
2. 产线与工段主数据不再通过 `productionLinesService.getLines()` 手写拉取。
3. dashboard 对 segments 的数据来源改为从 Query 返回的 production lines 派生计算。

#### 2. storage event 与 production resources 刷新职责拆分

结果：

1. `XDFC_STORAGE_EVENT` 与 `xdfc_storage_initialized` 继续保留。
2. 这些事件现在只负责 `VISIBLE_SEGMENTS_KEY` 相关本地配置同步。
3. production resources 更新不再由 dashboard 内部手动订阅 `productionResourceSync` 并触发重拉。
4. production resources 刷新改由既有 Query invalidation 统一完成。

#### 3. dashboard 保持本地配置状态独立

结果：

1. `visibleSegmentIds` 仍然保留为本地状态。
2. `StorageService` 仍负责可见 segment 配置的持久化。
3. 本轮没有把 dashboard 的本地用户偏好错误地塞进 React Query。

### 本轮未做

1. 未改造 `dashboard` 下游 tab 组件的业务实现。
2. 未迁移 `line-mgmt/index.tsx`。
3. 未扩展为 dashboard 全量状态平台化重构。

### 验证

已执行：

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/dashboard/index.tsx`

结果：

1. `tsc --noEmit` 通过。
2. `dashboard/index.tsx` 目标文件 `eslint` 通过。

### 当前阶段结论

`dashboard/index.tsx` 已完成 Query 化收口：

1. production lines / segments 主数据读取已切换到 `useQuery`。
2. dashboard 不再手写拉取同类 production resources。
3. storage event 仅承担本地配置同步职责，不再与 production resources 刷新混用。
4. dashboard 已与 `production-shared` 第三、第四阶段建立的 query key / invalidation / hooks 约定形成闭环。

## 2026-04-11 `line-mgmt/index.tsx` 第一阶段：乐观 UI 收口

### 本轮目标

本轮只处理 `line-mgmt/index.tsx` 的第一阶段乐观 UI，不推进整页 Query 化，重点解决以下问题：

1. 创建时使用 `temp-*` 临时项，但成功替换规则不够稳定。
2. 更新时虽然做了本地局部回写，但与失败回滚、成功后二次刷新混在一起。
3. 删除时仍主要依赖成功后全量刷新，乐观边界不清。
4. 成功和失败两条分支都默认走 `loadData()`，导致“乐观 UI”更像表层效果，而不是清晰的状态切换。

### 已执行变更

#### 1. 明确创建操作的临时项规则

调整：

- `src/features/production-shared/tabs/line-mgmt/index.tsx`

结果：

1. 新增 `createOptimisticLine(...)`，统一创建本地临时产线。
2. 创建时不再临时拼一个只有 `id` 的对象，而是补齐：
   - `id`
   - `segments`
   - `version`
   - `createdAt`
   - `updatedAt`
3. 成功后通过临时 `id` 精确替换为服务端真实实体，不再依赖名字匹配。

#### 2. 明确更新操作的乐观展示边界

结果：

1. 新增 `canApplyOptimisticDelta(...)`。
2. 当前只允许**一级字段 delta**做乐观展示。
3. 对包含深层路径的 patch，不再假定可以安全做本地深度乐观回写。
4. 避免在生产线嵌套结构较深时，浅层 patch 造成错误的 UI 假象。

#### 3. 收口失败回滚为精确回滚

结果：

1. create / update / delete 在操作前保存 `previousLines` 快照。
2. 失败时直接恢复到前一份本地状态。
3. 不再把失败回滚统一寄托在 `await loadData()` 的全量刷新上。

#### 4. 删除改为真正的乐观删除

结果：

1. 删除时先本地移除对应产线。
2. 服务端删除成功后只做域级 `emitLinesUpdated()`。
3. 删除失败时精确恢复先前列表。

#### 5. 成功分支不再默认全量 reload 兜底

结果：

1. create / update 成功后直接以服务端返回实体确认本地状态。
2. 成功后不再默认 `await loadData()` 做二次全量刷新。
3. 第一阶段的乐观 UI 与“服务端确认态”边界已明显清晰。

### 本轮未做

1. 未将 `line-mgmt/index.tsx` 整体迁移到 `useQuery`。
2. 未处理更深层的 optimistic cache 与 React Query cache 协作。
3. 未扩展到 `dashboard`、`work-architecture`、`production-selector` 等其他页面。
4. 对深层 delta path，本轮采用保守策略，不做深度乐观 patch。

### 验证

已执行：

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/production-shared/tabs/line-mgmt/index.tsx`

结果：

1. `tsc --noEmit` 通过。
2. `line-mgmt/index.tsx` 目标文件 `eslint` 通过。

### 当前阶段结论

`line-mgmt/index.tsx` 第一阶段乐观 UI 已完成初步收口：

1. 创建 / 更新 / 删除三类 optimistic 行为边界更清晰。
2. 本地临时态、服务端确认态、失败回滚的切换规则已经落到代码结构中。
3. 成功/失败分支不再主要依赖模糊的全量 reload 兜底。
4. 为下一阶段再评估 `line-mgmt` 的 Query 化保留了更稳的基础。

## 2026-04-11 `line-mgmt/index.tsx` 第二阶段：Query cache 主真相 + optimistic overlay

### 本轮目标

在第一阶段乐观 UI 边界收口基础上，继续推进 `line-mgmt/index.tsx` 的第二阶段：

1. 将页面主真相来源切换为 `Query cache`。
2. 将 `optimistic overlay` 收敛为短生命周期覆盖层。
3. 将页面展示数据改为由 `query data + overlay` 派生。
4. 明确 create / update / delete 成功后默认优先 `setQueryData`，而不是一律 `invalidate` 或一律全量 reload。

### 已执行变更

#### 1. 将主真相切换到 Query cache

调整：

- `src/features/production-shared/tabs/line-mgmt/index.tsx`

结果：

1. `line-mgmt/index.tsx` 已接入 `useProductionLinesQuery()`。
2. 页面不再以本地 `lines` state 作为唯一主真相来源。
3. 确认态生产线数据现在来自 Query cache。

#### 2. 引入 optimistic overlay 结构

结果：

1. 新增三类短期覆盖层：
   - `pendingCreates`
   - `pendingUpdates`
   - `pendingDeletes`
2. overlay 只承载“尚未由服务端确认”的临时变更。
3. overlay 不再承担长期主状态职责。

#### 3. 引入展示层 `displayedLines`

结果：

1. 新增 `applyLineOverlays(...)`。
2. 页面展示数据改为：
   - `displayedLines = applyLineOverlays(queryLines, pendingCreates, pendingUpdates, pendingDeletes)`
3. `LineList` 继续只消费一个 `lines` 数组，但其来源已改为 Query data + overlay 的派生结果。

#### 4. 成功策略改为默认优先 `setQueryData`

结果：

1. **create 成功**
   - 先清理对应 `pendingCreate`
   - 再通过 `setQueryData` 将服务端真实实体插入确认态列表

2. **update 成功**
   - 先清理对应 `pendingUpdate`
   - 再通过 `setQueryData` 用服务端返回实体替换确认态目标项

3. **delete 成功**
   - 先清理对应 `pendingDelete`
   - 再通过 `setQueryData` 从确认态列表中移除对应实体

4. 当前没有默认对 create / update / delete 成功后立刻无差别 `invalidate`，避免 Query cache 与 overlay 双重刷新打架。

#### 5. 失败分支只清理 overlay，不污染 Query cache

结果：

1. mutation 失败时不再回滚整份本地主状态。
2. 失败时只撤销对应 overlay：
   - `pendingCreate`
   - `pendingUpdate`
   - `pendingDelete`
3. Query cache 继续表示“后端最后确认的数据”。

### 本轮未做

1. 未对复杂嵌套 patch 默认启用深度 optimistic overlay。
2. 未把 `line-mgmt` 的成功分支扩展为 `setQueryData + invalidate` 双做模式。
3. 未扩展到其他页面的 overlay / cache 协作优化。
4. 未修改后端接口或 SDRTS 协议。

### 验证

已执行：

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/production-shared/tabs/line-mgmt/index.tsx`

结果：

1. `tsc --noEmit` 通过。
2. `line-mgmt/index.tsx` 目标文件 `eslint` 通过。

### 当前阶段结论

`line-mgmt/index.tsx` 第二阶段已完成基础收口：

1. `Query cache` 已成为页面主真相来源。
2. `optimistic overlay` 已成为短期覆盖层，而不是长期主状态。
3. `displayedLines` 已由 Query data + overlay 派生得出。
4. create / update / delete 成功后的默认收口策略已明确为优先 `setQueryData`。
5. 为后续再评估何时对复杂场景按需 `invalidate` 留下了更稳定的结构基础。
