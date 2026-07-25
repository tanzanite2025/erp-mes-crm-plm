# `sales` TDO 化执行清单状态

> 文档状态：历史执行清单已关闭。
> 更新时间：2026-07-25
> 当前用途：防止后续误把已落地事项当成待办重复开发。

## 已关闭的第一阶段事项

- [x] 建立销售订单 transaction endpoint。
- [x] 支持 `ORDER_LINE_CLAIM` 语义事务。
- [x] 前端认领动作接入 transaction service。
- [x] 页面层不应再通过拼接订单行字段变化表达认领。

对应当前代码：

- `server/services/sales_transaction_service.go`
- `server/handlers/sales_transaction_handlers.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-detail.tsx`

## 当前不再保留的执行项

旧清单中的“兼容与回退口径”不再作为当前原则。项目尚未正式接入生产，关键业务动作应收口到正式 transaction 链，不保留旧 claim patch 链作为长期备用入口。

## 新的后续清单

- [ ] 拆分过大的 `sales_transaction_service.go`，按事务家族放置业务逻辑；
- [ ] 补齐 `ORDER_LINE_CLAIM` 并发、重复认领、版本冲突测试；
- [ ] 检查状态推进和取消是否都具备事务级审计；
- [ ] 检查消息中心销售订单事件是否全部由后端事务链产生；
- [ ] 清理前端关键业务动作中残留的字段级事务语义。
