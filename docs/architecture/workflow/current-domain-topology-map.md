# 各域数据流、副作用与审批通知接点拓扑

> 核查日期：2026-10-20。
> 文档状态：已更新销售、采购、库存、规则执行和品质标准的入口及审批通知边界。
> 本文描述当前代码；跨设备收件箱的运行契约见[消息中心长期契约](system-notification-inbox-cross-device-synchronization-and-delivery-contract.md)，本轮统一收件与投递已于2026-10-20部署到生产，验收边界见[生产发布记录](../../quality-standard-approval-transaction-and-notification-delivery-contract.md#2026-10-20-生产发布记录)。

## 1. 重要现状校正

旧版拓扑中的以下链路已过期，不再作为开发依据：

- 销售认领由浏览器拼接订单行再发送字段 Patch。当前认领、状态推进、取消已有语义事务入口。
- 销售新建成功 Hook 通过 `NotificationService.dispatch` 作为销售状态通知主入口。当前已存在后端销售状态事件服务，前端变更 Hook 主要负责反馈和查询刷新。
- 销售、采购建单创建 Workflow 实例，随后由 Workflow 任务推进单据。当前仓库没有这些运行服务；`server/db/db.go` 的 `dropLegacyWorkflowArtifacts` 明确删除旧定义、实例、任务表及单据 `workflow_instance_id` 字段。
- 浏览器执行正式规则、扫描补发并维护本地消息。当前这些执行器与 Store 已移除，`workflow-core` 保留配置和查询。

真实审批模型为 `server/models/approval.go` 的 `ApprovalRequest`，服务入口为 `server/services/approval_service.go`。品质标准通过业务事务关联当前申请。业务通知、规则日志与真实审批申请分别保存，不能相互替代。

## 2. 销售域

```text
SalesOrderDetail
  -> sales/hooks/use-sales-queries.ts
  -> sales/services/sales-query-service.ts
  -> GET /sales-orders/:id

普通保存
  -> sales/hooks/use-sales-transactions.ts
  -> sales/services/sales-service.ts / patchSalesOrder
  -> PATCH /sales-orders/:id

认领 / 状态推进 / 取消等语义动作
  -> sales/hooks/use-sales-transactions.ts
  -> sales/services/sales-transaction-service.ts
  -> POST /sales-orders/:id/transactions
  -> server/handlers/sales_transaction_handlers.go
  -> server/services/sales_transaction_service.go
  -> 业务数据库事务与审计
```

以上前端路径均相对于 `src/features/trading/`。销售阶段记录见[sales TDO 现状](sales-phase1-tdo-alignment-plan.md)，不应再把建立认领事务接口列为未完成事项。本文 API 路径均相对于 `/api/v1`。

当前销售状态通知链路：

```text
销售状态事务 / 履约状态联动
  -> DispatchSalesOrderStatusChangedTx
  -> sales_order_business_event_service.go
  -> 实际启用规则 / 段 / 命令 / 接收人
  -> 同事务收件快照、执行记录和刷新投递队列
  -> 提交后 worker
  -> Redis / WebSocket
  -> 客户端重新查询服务端收件
```

销售通知已与业务事务同时入箱，提交后发布刷新提示。删除订单在后端同事务解除对应收件，前端不再归档本地消息。

## 3. 采购域

```text
采购页面与 Hook
  -> src/features/purchase/orders/services/purchase-service.ts
  -> 采购查询 / 新建 / 普通保存接口

采购语义动作
  -> purchase-transaction-service.ts
  -> POST /purchase/orders/:id/transactions
  -> server/services/purchase_transaction_service.go

收货确认接口
  -> POST /purchase/orders/:id/confirm-receipt
  -> 后端收货确认与库存事务

采购状态变化
  -> purchase_order_business_event_service.go
  -> DispatchBusinessStatusChangedTx
  -> business_status_event_service.go
  -> 规则匹配、执行记录、收件和提交后刷新队列
```

交易路由注册于 `server/routes/routes_trading.go`。采购已有语义事务，不能再概括为只有 CRUD/Patch，也不能描述为依靠已移除的 Workflow 实例自动推进。

## 4. 库存域

当前库存真实出入库由后端命令事务负责，前端服务已按查询、库存事务、出库事务和维护职责拆分。主要入口为：

| 操作                 | 前端服务                                                        | 后端入口                                    |
| -------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| 库存读取             | `warehouse/inventory/services/inventory-core-service.ts`        | 库存查询 Handler                            |
| 入库、调拨           | `warehouse/inventory/services/inventory-transaction-service.ts` | `/inventory/inbound`、`/inventory/transfer` |
| 出库草稿、提交、作废 | `warehouse/shipment/services/shipment-transaction-service.ts`   | 库存出库命令接口                            |
| 库存维护             | `warehouse/inventory/services/inventory-maintenance-service.ts` | 维护与版本校验接口                          |

前端路径相对于 `src/features/`。后端 `inventory_command_service.go` 承担入库、出库提交、作废等事务，库存数量、采购/销售履约联动和凭证处理必须遵循各命令的真实事务边界。

库存刷新广播属于界面同步；不能把刷新广播当成持久化用户通知。历史拓扑中 `VoidShipmentHandler -> CheckAndConsumeApproval` 的调用不符合当前 Handler，审批要求必须以当前动作接口和服务校验为准，不能从历史图推断。

`/shipping-management/vehicle-match` 与 `/logistics-config/vehicle-loading` 是模拟推荐入口，不承担真实库存发货确认，也不因接入消息中心而获得过账职责。

## 5. 生产与委外事件

```text
生产计划 / 任务 / 委外执行事实
  -> production_business_event_service.go
  -> DispatchBusinessStatusChangedTx
  -> business_status_event_service.go
  -> 规则执行记录、收件和提交后刷新队列
```

委外事件源为 `PRODUCTION_OUTSOURCE`，事件事实区分订单状态、转移和检验记录。该域业务定义见[委外执行链路设计](../生产委外执行链路设计.md)。委外根订单是收件业务目标；转移/检验事实 ID 保存在元数据并参与事件键，关闭时按规则段精确解除。恢复操作只安排原任务；委外失败诊断读取同一条原日志的当前状态，不查询另一份重试日志。

## 6. 品质标准

```text
标准编辑 / 提审 / 审批决定 / 发布 / 归档
  -> 品质标准或公共审批接口
  -> 对应后端数据库事务
     -> 标准与版本
     -> 当前 ApprovalRequest（提审或审批决定时）
     -> 审计与规则执行记录
     -> system_notification_inbox_entries
     -> workflow_notification_outbox_entries
  -> 提交后队列工作器
  -> Redis / WebSocket
  -> 客户端重新查询服务端收件
```

品质标准已有事务内入队和提交后重试，浏览器已不再创建品质标准审批或自行派发品质标准规则。品质路由负责规则匹配、模板校验和人员字段适配，账号解析、去重、逐账号日志与收件创建由 `business_rule_notification_inbox_creation_service.go` 与销售、通用业务共用。解除同事务持久化，离线恢复重查即可校准。详细状态和文件职责见[品质标准专项契约](../../quality-standard-approval-transaction-and-notification-delivery-contract.md)。

## 7. BOM、规则配置和消息读取

BOM 保存、状态提升、派生和修订由 `bom_service.go` 调用 `bom_lifecycle_notification_routing_service.go`，在同事务内走通用规则服务。MBOM 派生保留实际 DRAFT，真实发布才映射 EFFECTIVE；模板中的研发优化标志动作尚未接入触发，不能因为模板存在就声称全覆盖。

```text
规则配置页面 -> RoutingService -> /message-center 配置及诊断接口
业务事务 -> 共用收件服务 -> inbox + outbox + 执行记录
提交后 worker -> Redis -> ws.go -> use-notifications.ts
  -> 当前账号 Query 失效 -> GET /message-center/inbox
已读/归档 -> POST /message-center/inbox/state -> 同事务状态 + 刷新队列
```

前端正式执行器、周期扫描器及两套本地消息 Store 已删除。账号/权限变化清理个人查询缓存；重连、重新联网、窗口聚焦及每30秒对账。分页游标只用于浏览历史，不承担增量同步。

## 8. 审批、通知与重试边界

真实待办来自 `approval_requests`；审批决定由当前节点实际审批人提交。品质标准提审读取独立的 `business_approval_policy_configurations`，在审批中心的审批配置维护；通知源和监听开关不控制提审。公共审批引擎通过注入的业务事务契约回写标准，同事务失败整体回滚。配置变更只影响新申请，在途申请保留原审批人。其他来源的规则内审批动作尚未迁移，接入需逐域提供真实业务契约。消息已读、归档、解除不代替业务完成，审批角标不等于消息未读数。

所有已接入口共用提交后队列。工作器负责唯一自动重试，失败12次暂停。管理队列与执行日志恢复入口都操作原任务，并保留审计；旧无关联日志拒绝直投。Redis 发布成功不等于设备送达。

告警 webhook 的账号收件与轮次解除持久化；运行监控 active/history 列表仍是内存投影。缓存失效、扫码动态及权限刷新仍是临时信号，不写正式用户收件。

## 9. 后续接入边界

销售、采购语义事务和共用收件已存在，无需重复建立。新来源应提供真实事务入口、业务事件键、生成时收件账号和解除条件；物流记录已沿真实事务接入，承运商 DeliveryOrder 回调通知及未调用的 BOM 标志动作仍需专项接入。模型、保留、接口、文件职责及切换策略统一维护在[消息中心长期契约](system-notification-inbox-cross-device-synchronization-and-delivery-contract.md)。
