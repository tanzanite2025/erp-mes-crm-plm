# `sales` TDO 化现状记录

> 文档状态：历史方案已落地，本文只保留当前事实和后续边界。
> 更新时间：2026-07-25
> 适用范围：销售订单语义事务、认领动作、后续销售事务收敛。

## 当前结论

`sales` 第一阶段的核心目标已经不再是“是否要建立 transaction 入口”，因为当前代码已经具备销售订单语义事务链：

- 后端事务服务：`server/services/sales_transaction_service.go`
- 后端事务 Handler：`server/handlers/sales_transaction_handlers.go`
- 前端事务 service：`src/features/trading/sales/services/sales-transaction-service.ts`
- 前端事务 hook：`src/features/trading/sales/hooks/use-sales-transactions.ts`
- 页面调用方：`src/features/trading/components/sales-order-detail.tsx`

其中 `ORDER_LINE_CLAIM` 已作为语义事务存在，不应再按旧方案重复实施。

## 当前已落地事实

- `POST /sales-orders/:id/transactions` 已作为销售订单事务入口。
- `ORDER_LINE_CLAIM` 已进入后端事务服务。
- 前端已经通过 `claimSalesOrderLines(...)` 提交认领事务。
- `SalesOrderDetail` 不再应直接拼接订单行后调用旧字段 patch 来表达认领意图。
- 事务服务已开始承接状态推进、取消、订单字段变化等更多销售语义。

## 当前仍需后续确认的边界

1. 普通编辑与语义事务的边界要继续压清楚。
   - 普通字段编辑可以有明确编辑入口。
   - 认领、状态推进、取消这类业务动作必须走语义事务。
2. 前端保留的副作用只应是 UI 反馈和 Query 失效。
   - 通知、审计、业务事件应优先由后端事务链产生。
3. `sales_transaction_service.go` 已经变大，后续继续加动作前应按事务家族拆分。
4. 项目尚未正式接入生产，不为旧业务入口、旧路由或旧调用方保留兼容跳转。

## 不再采用的旧口径

以下历史方案表述不再作为当前开发依据：

- “transaction endpoint 仍待确认后再新增”；
- “第一阶段先只准备骨架，前端暂不切换”；
- “临时回退到旧 claim patch 链作为长期策略”；
- “为了兼容保留旧入口并继续扩展旧调用方”。

如果出现问题，应修正当前正式事务链，而不是恢复旧字段拼装链路。

## 后续建议

下一步如果继续整理销售域，优先顺序是：

1. 给 `sales_transaction_service.go` 按事务类型拆分内部文件；
2. 补齐事务级测试，覆盖认领、状态推进、取消和版本冲突；
3. 检查前端是否仍有关键业务动作绕过 transaction service；
4. 更新消息中心/审计文档中销售事件的真实触发链。
