# 消息中心业务覆盖地图

更新时间：2026-04-20

这份文档只回答三件事：

1. 消息中心当前有哪些业务事件源。
2. 哪些事件源已经业务接入，哪些只是技术预接入。
3. 后续新增业务时，应该先确认哪些状态字典和业务入口，避免“能配置但不能跑”。

## 当前覆盖分层

### A. 模板预置层

模板预置只代表前端有可导入的事件源骨架，不代表业务模块已经接入真实触发链。

| 业务事件源 | Source Code | 模块 | 实体 | 当前状态 |
| --- | --- | --- | --- | --- |
| 销售订单 | `SALES_ORDER` | `Trading` | `ORDER` | 已接入执行链 |
| 采购订单 | `PURCHASE_ORDER` | `Trading` | `ORDER` | 已接入执行链 |
| 生产计划 | `PRODUCTION_PLAN` | `Production` | `SYSTEM` | 预接入，待 APS 确认 |
| 生产任务 | `PRODUCTION_TASK` | `Production` | `SYSTEM` | 预接入，待 APS 确认 |
| 物流单 | `LOGISTICS_RECORD` | `Trading` | `ORDER` | 仅模板预置 |

模板定义来源：

- `src/features/system-mgmt/workflow-core/data/business-event-source-templates.ts`
- `src/features/system-mgmt/workflow-core/data/business-event-source-templates/`

### B. 后端默认种子层

系统启动后会按 `code` 确保默认事件源存在。

| 业务事件源 | Source Code | 默认落库 |
| --- | --- | --- |
| 销售订单 | `SALES_ORDER` | 是 |
| 采购订单 | `PURCHASE_ORDER` | 是 |
| 生产计划 | `PRODUCTION_PLAN` | 是 |
| 生产任务 | `PRODUCTION_TASK` | 是 |
| 物流单 | `LOGISTICS_RECORD` | 否 |

### C. 执行链状态层

这层分两类：

- 业务已接入：业务状态、写入口、规则触发都已经按当前业务模块确认。
- 技术预接入：事件源、状态字典、追溯/实时技术入口已经准备好，但 APS 或生产业务定义还没最终确认，不能当作生产业务已闭环。

| 业务事件源 | 实时入口 | 追溯扫描 | 审批创建 | 结论 |
| --- | --- | --- | --- | --- |
| 销售订单 `SALES_ORDER` | 是 | 是 | 是 | 已闭环 |
| 采购订单 `PURCHASE_ORDER` | 是 | 是 | 是 | 已闭环 |
| 生产计划 `PRODUCTION_PLAN` | 技术入口已准备，页面调用待接 | 技术入口已准备 | 技术入口已准备 | 预接入，待 APS 确认 |
| 生产任务 `PRODUCTION_TASK` | 技术入口已准备，页面调用待接 | 技术入口已准备 | 技术入口已准备 | 预接入，待 APS 确认 |
| 物流单 `LOGISTICS_RECORD` | 否 | 否 | 否 | 仅模板预置 |

关键入口：

- 实时入口
  - `src/features/system-mgmt/notifications/notification-service.ts`
  - `src/features/trading/sales/hooks/use-sales-transactions.ts`
  - `src/features/trading/purchase/hooks/use-purchase-orders.ts`
  - `src/features/production-calendar/services/production-plan-command-service.ts`
- 追溯扫描
  - `src/features/system-mgmt/workflow-core/hooks/use-notification-rules.ts`
  - `src/features/system-mgmt/workflow-core/services/dispatch-service.ts`
  - `src/features/system-mgmt/workflow-core/services/rule-execution-event-builder.ts`
  - `src/features/system-mgmt/workflow-core/services/production-task-query-service.ts`

## 1. 销售订单 `SALES_ORDER`

动作：

- `CREATED`
- `STATUS_CHANGED`
- `UPDATED`

状态字典：

- `Draft`
- `Pending`
- `InProgress`
- `Done`
- `Canceled`

当前能力：

- 可创建通知规则：是
- 可创建审批规则：是
- 可实时触发：是
- 可追溯扫描：是
- 可写执行日志：是

## 2. 采购订单 `PURCHASE_ORDER`

动作：

- `CREATED`
- `STATUS_CHANGED`
- `RECEIVED`

唯一状态字典：

- `Draft`
- `Sent`
- `Awaiting`
- `Received`
- `Canceled`

关键字段：

- `purchaseOrderId`
- `purchaseOrderNo`
- `supplierName`
- `purchaser`

当前能力：

- 默认后端种子：是
- 可创建通知规则：是
- 可创建审批规则：是
- 可实时触发：是
- 可追溯扫描：是
- 可写执行日志：是

旧值如 `Pending`、`PendingApproval`、`Approved`、`Completed`、`Cancelled` 都是非法值，不做兼容。

## 3. 生产任务 `PRODUCTION_TASK`

动作：

- `CREATED`
- `STATUS_CHANGED`
- `QUALITY_HOLD`

唯一状态字典：

- `PENDING`
- `RUNNING`
- `HOLD`
- `DONE`

关键字段与当前真实后端任务数据对齐：

- `taskId`
- `planId`
- `orderNo`
- `productName`
- `batchNo`
- `processName`
- `operator`

当前能力：

- 默认后端种子：是
- 可创建通知规则：是
- 可创建审批规则：是
- 可实时触发：技术入口已准备
- 生产页面保存入口是否已调用：待接
- 可追溯扫描：技术入口已准备
- 可写执行日志：技术入口已准备
- 业务接入状态：待 APS / 生产任务模型确认

说明：

- 生产任务真实数据来自 `/production/plans` 里的 `tasks` 明细。
- 追溯扫描会把计划下的任务扁平化成 `PRODUCTION_TASK` 事件，再进入同一套 rule execution core。
- 实时入口已经收敛到 `ProductionPlanCommandService.saveProductionPlan()`，后续生产计划页面保存 / 状态推进必须改用这个服务，不能各自直接 `POST /production/plans`。
- 这只是技术预接入；APS 排程、任务拆分、工序状态推进还没确认前，不应把它视为生产业务已闭环。

以下词不进入 `PRODUCTION_TASK` 事件源和规则配置层：

- `SCHEDULED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELED`

这些是生产计划状态，不是任务状态。

## 4. 生产计划 `PRODUCTION_PLAN`

结论：已经作为独立事件源预接入，不能塞回 `PRODUCTION_TASK`。

原因：

- `PRODUCTION_PLAN` 表达“排产单 / 主计划”生命周期。
- `PRODUCTION_TASK` 表达计划下面每一道任务或工序的执行生命周期。
- “已排产 / 已取消 / 已完结计划”不是某一道任务的状态，混进去会导致规则语义失真。

建议动作：

- `CREATED`
- `STATUS_CHANGED`
- `CANCELED`
- `COMPLETED`

唯一状态字典：

- `SCHEDULED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELED`

关键字段建议：

- `planId`
- `orderNo`
- `productName`
- `quantity`
- `startDate`
- `endDate`

当前状态：

- 状态字典已单独锁定：`src/features/system-mgmt/workflow-core/data/production-plan-status.ts`
- 后端保存入口已校验计划状态和任务状态，非法值会在 `/production/plans` 直接返回 400。
- 默认后端种子：是。
- 可创建通知规则：是。
- 可创建审批规则：是。
- 可实时触发：技术入口已准备。
- 生产页面保存入口是否已调用：待接。
- 可追溯扫描：技术入口已准备。
- 可写执行日志：技术入口已准备。
- 业务接入状态：待 APS / 排产结果模型确认。

## 5. 物流单 `LOGISTICS_RECORD`

当前能力：

- 可导入模板并创建规则：是
- 可保存事件源和规则配置：是
- 有实时触发入口：否
- 有追溯扫描入口：否
- 有真实执行闭环：否

物流单还停留在模板层。后续需要先确认真实状态字典和业务入口，再接入执行链。

## 当前产品判断

1. 当前业务已接入的链路有两条：`SALES_ORDER`、`PURCHASE_ORDER`。
2. `PRODUCTION_PLAN` 和 `PRODUCTION_TASK` 是技术预接入：状态字典、种子、实时/追溯入口已经准备，但 APS 和生产业务定义尚未确认。
3. `PRODUCTION_PLAN` 已独立成事件源骨架，承载排产单状态，不污染任务状态；正式启用要等 APS 口径确定。
4. 规则执行 core 已经通用，后续瓶颈主要是业务模块是否能稳定提供唯一状态字典和唯一写入口。

## 下一步优先级

### P1：生产任务 UI 保存入口接入

找到生产计划页面的保存 / 状态推进入口，改为调用 `ProductionPlanCommandService.saveProductionPlan()`，并传入 `previousPlan`，这样只有新增任务和状态变化会实时触发规则。

### P2：生产计划页面

当后续补生产计划编辑页或状态推进按钮时，必须走 `ProductionPlanCommandService.saveProductionPlan()`，不要直接 `apiFetch('/production/plans')`。

### P3：物流单 `LOGISTICS_RECORD`

先确认物流真实状态来源、实时写入口和追溯查询入口，再决定是否升级为已接入执行链。
