# 消息中心业务覆盖地图

更新时间：2026-07-22

这份文档回答三件事：

1. 消息中心现在有哪些业务事件源。
2. 哪些事件源已经接入真实执行链，哪些只是模板。
3. 后续接入新业务时，必须先确认哪些边界。

## 1. 当前事件源模板

模板唯一注册点：

- `src/features/system-mgmt/workflow-core/data/business-event-source-templates.ts`
- `src/features/system-mgmt/workflow-core/data/business-event-source-templates/*`

| 事件源   | Source Code         | Entity    | 模块          | 运行状态           |
| -------- | ------------------- | --------- | ------------- | ------------------ |
| 销售订单 | `SALES_ORDER`       | `ORDER`   | `Trading`     | 已接入执行链       |
| 采购订单 | `PURCHASE_ORDER`    | `ORDER`   | `Trading`     | 已接入执行链       |
| 物流记录 | `LOGISTICS_RECORD`  | `ORDER`   | `Trading`     | 仅模板预置         |
| 生产计划 | `PRODUCTION_PLAN`   | `SYSTEM`  | `Production`  | 预接入，待业务确认 |
| 生产任务 | `PRODUCTION_TASK`   | `SYSTEM`  | `Production`  | 预接入，待业务确认 |
| 品质标准 | `QUALITY_STANDARD`  | `QUALITY` | `Quality`     | 已接入前端执行链   |
| 研发 BOM | `BOM_ENGINEERING`   | `BOM`     | `Engineering` | 已接入前端执行链   |
| 生产 BOM | `BOM_MANUFACTURING` | `BOM`     | `Engineering` | 已接入前端执行链   |

## 2. 后端默认落库

后端启动时会确保以下默认事件源存在：

| 事件源   | Source Code         | 默认落库         |
| -------- | ------------------- | ---------------- |
| 销售订单 | `SALES_ORDER`       | 是               |
| 采购订单 | `PURCHASE_ORDER`    | 是               |
| 生产任务 | `PRODUCTION_TASK`   | 是               |
| 生产计划 | `PRODUCTION_PLAN`   | 是               |
| 物流记录 | `LOGISTICS_RECORD`  | 否               |
| 品质标准 | `QUALITY_STANDARD`  | 否，需从模板导入 |
| 研发 BOM | `BOM_ENGINEERING`   | 否，需从模板导入 |
| 生产 BOM | `BOM_MANUFACTURING` | 否，需从模板导入 |

说明：模板存在不等于默认落库。未默认落库的事件源需要在“业务事件源”TAB 中导入后，才能被规则引用。

## 3. 运行时执行链

| 执行链         | 业务范围                               | 运行位置                                  | 日志写入                                   | 通知投递                               |
| -------------- | -------------------------------------- | ----------------------------------------- | ------------------------------------------ | -------------------------------------- |
| 后端事务执行链 | 销售订单、采购订单、生产计划、生产任务 | Go service 事务内                         | 后端直接写 `rule_execution_logs`           | Redis `xdfc_notifications` → WebSocket |
| 前端实时执行链 | 品质标准、研发 BOM、生产 BOM           | 浏览器内 `NotificationService.dispatch()` | 前端 POST `/message-center/execution-logs` | 前端 notification store                |
| 前端追溯扫描链 | 采购订单、生产计划、生产任务           | 浏览器内 scheduler                        | 前端 POST `/message-center/execution-logs` | 前端 notification store                |

当前 `DispatchService.scanByRules()` 支持销售订单快照，但周期 scheduler 目前没有拉销售订单快照；不要把“函数支持”误判为“周期扫描已覆盖”。

## 4. 关键业务覆盖

### 销售订单 `SALES_ORDER`

- Entity：`ORDER`
- 默认落库：是
- 实时执行：后端事务链
- 追溯扫描：函数支持，当前周期 scheduler 未拉取销售订单
- 状态：`Draft`、`Pending`、`InProgress`、`Done`、`Canceled`

### 采购订单 `PURCHASE_ORDER`

- Entity：`ORDER`
- 默认落库：是
- 实时执行：后端事务链
- 追溯扫描：周期 scheduler 已拉取采购订单
- 状态：`Draft`、`Sent`、`Awaiting`、`Received`、`Canceled`

### 生产计划 `PRODUCTION_PLAN`

- Entity：`SYSTEM`
- 默认落库：是
- 实时执行：后端通用业务状态事件链已准备
- 追溯扫描：周期 scheduler 已拉取生产快照
- 状态：`SCHEDULED`、`IN_PROGRESS`、`COMPLETED`、`CANCELED`
- 业务说明：这是主计划生命周期，不要混入生产任务状态。

### 生产任务 `PRODUCTION_TASK`

- Entity：`SYSTEM`
- 默认落库：是
- 实时执行：后端通用业务状态事件链已准备
- 追溯扫描：周期 scheduler 已拉取生产任务快照
- 状态：`PENDING`、`RUNNING`、`HOLD`、`DONE`
- 业务说明：这是计划下的任务/工序生命周期，不要混入生产计划状态。

### 品质标准 `QUALITY_STANDARD`

- Entity：`QUALITY`
- 默认落库：否
- 实时执行：前端品质标准服务调用 `NotificationService.dispatch()`
- 追溯扫描：无
- 状态：`DRAFT`、`PENDING_APPROVAL`、`APPROVED`、`REJECTED`、`PUBLISHED`、`ARCHIVED`
- 契约要求：后端 `allowedBusinessEventEntities` 必须包含 `QUALITY`，否则模板导入和规则保存会失败。

### 研发 BOM `BOM_ENGINEERING`

- Entity：`BOM`
- 默认落库：否
- 实时执行：前端 BOM routing service 调用 `NotificationService.dispatch()`
- 追溯扫描：无
- 状态：与 `BOM_STATUS_ORDER` 对齐。

### 生产 BOM `BOM_MANUFACTURING`

- Entity：`BOM`
- 默认落库：否
- 实时执行：前端 BOM routing service 调用 `NotificationService.dispatch()`
- 追溯扫描：无
- 状态：`EFFECTIVE`、`OBSOLETE`

### 物流记录 `LOGISTICS_RECORD`

- Entity：`ORDER`
- 默认落库：否
- 实时执行：未接入
- 追溯扫描：无
- 状态：`Draft`、`Dispatched`、`Loaded`、`InTransit`、`Signed`、`Exception`、`Canceled`

## 5. 当前已确认的长期方向

- 消息中心入口固定为 `/message-center`。
- 配置读写统一走后端 `/message-center/*` API，不再保留旧页面跳转或旧 API 域名。
- 新版通知中心 store 是底部通知中心的消息沉淀入口。
- 后端 Workflow/Approval 推送必须写入新版通知中心，不应只 toast。
- 项目未正式生产，不保留旧订单链接兼容修正。

## 6. 后续接入新事件源的检查清单

1. 前端模板是否登记在 `business-event-source-templates.ts`。
2. `entity` 是否被前后端 schema 同时允许。
3. 状态字典是否登记在 `business-event-status-catalog.ts`。
4. 后端是否需要默认 seed。
5. 实时执行入口在哪里，是否在写入事务后触发。
6. 是否需要追溯扫描；如果需要，scheduler 是否真的拉了数据。
7. 执行日志由谁写，是否可信。
8. 通知是否进入新版 notification store。
