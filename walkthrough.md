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
