# 变更记录与验证（walkthrough.md）

## 专项：`sales` / `purchase` patch 兜底压缩盘点（2026-04-08）

### 本轮目标
在 `sales` 与 `purchase` 已形成基础 transaction 骨架后，盘点双域当前仍落回 `patch` 的真实路径，区分“合理兜底”与“仍可继续事务化”的回退点，并给出唯一优先建议切口。

### 盘点范围
分析：
- `src/features/trading/components/sales-order-action-dialog.tsx`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/purchase/hooks/use-purchase-orders.ts`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `server/services/purchase_transaction_service.go`

### 盘点结论

#### `sales`
当前仍存在两层未完全收敛路径：

1. `linesChangeMutation`
   - 命中条件：`delta` 仅涉及 `lines` / `quantity` / `amount`；
   - 但既不是纯内容修改，也不是纯新增，也不是纯删除；
   - 说明其承担的是“复杂行级混合编辑”的语义兜底。

2. `patchMutation`
   - 命中条件：除 customer / classification+type+barcode / deliveryDate / 已拆行级事务 / claim / status / cancel 外的剩余编辑；
   - 主要承接头部混合字段变更或尚未语义化的头部编辑。

结论：
- `sales` 的 `linesChangeMutation` 目前仍有合理存在价值；
- `sales` 真正值得压缩的，是头部仍直接落回 `patchMutation` 的稳定单字段或窄字段组合。

#### `purchase`
当前 transaction 分流已覆盖：

1. `expectedDate`
2. `ORDER_LINE_CONTENT_CHANGE`
3. `ORDER_LINE_ADD`
4. `ORDER_LINE_REMOVE`

当前仍回退到 `patchMutation` 的路径主要是：

1. 采购头部除 `expectedDate` 外的其他字段编辑；
2. 行级混合编辑（如同时增删与修改内容）；
3. 头部字段与行级字段混合编辑。

结论：
- `purchase` 当前没有像 `sales` 那样的中间层 transaction fallback；
- 它的 patch 回退几乎全部集中在“头部未事务化字段”与“混合编辑”两类场景。

### 分类判断

#### 合理兜底
- `sales` 的复杂行级混合编辑 -> `linesChangeMutation`
- `sales` / `purchase` 的头部+行级混合编辑 -> `patchMutation`
- `purchase` 的多语义混合行级编辑 -> `patchMutation`

#### 仍可继续事务化
- `sales` 头部未事务化的稳定单字段编辑
- `purchase` 头部除 `expectedDate` 外的稳定单字段编辑

### 唯一优先建议切口
建议下一轮只做一个切口：

- **`purchase` 头部第二刀：供应商主体变更事务化**

建议原因：

1. `purchase` 当前 patch 回退高度集中在头部字段；
2. `sales` 已有 `ORDER_CUSTOMER_CHANGE` 成熟样板，可直接横向复制；
3. 相比继续拆更复杂的混合编辑，供应商主体变更边界更窄、更稳定、更容易显著压缩 patch 覆盖面。

### 本轮结论
本轮只完成 patch 兜底压缩盘点，不直接实现新 intent。

当前建议进入下一轮的唯一优先切口为：

- `purchase` 头部第二刀：**供应商主体变更事务化**

## P1：`purchase` 行级事务化第三刀：`ORDER_LINE_REMOVE`（2026-04-08）

### 本轮目标
在已完成 `purchase` 的 `ORDER_LINE_ADD` 基础上，继续复制 `sales` 行级样板，单独收口采购订单“纯删除行”这一语义动作。

### 已执行变更
更新：
- `server/services/purchase_transaction_service.go`
- `src/features/trading/purchase/services/purchase-transaction-service.ts`
- `src/features/trading/purchase/hooks/use-purchase-orders.ts`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`

### 本轮实际处理内容
- 后端新增采购订单 `ORDER_LINE_REMOVE` intent；
- `ORDER_LINE_REMOVE` 只允许处理“相较当前采购订单，仅删除行、保留行未改动”的场景；
- 保留采购物料有效性校验；
- 前端新增 `changePurchaseOrderLineRemove()` 与 `lineRemoveMutation`；
- 在采购订单编辑对话框中，当 delta 仅包含 `lines` / `amount` 且可稳定识别为“纯删除行”时，优先走 `lineRemoveMutation`；
- 若混入既有行内容修改、头部字段或其他结构性变更，则继续保留在现有 `ORDER_LINE_CONTENT_CHANGE` / `ORDER_LINE_ADD` / `patchMutation` 边界中。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Purchase
```

结果：通过。

### 本轮结论
本轮已完成 `purchase` 行级事务化第三刀：

- `purchase` 已形成“行内容修改 + 行新增 + 行删除”的三段式行级事务结构；
- 当前采购事务样板已形成：
  - `ORDER_DELIVERY_DATE_CHANGE`
  - `ORDER_LINE_CONTENT_CHANGE`
  - `ORDER_LINE_ADD`
  - `ORDER_LINE_REMOVE`
- `purchase` 已基本追平 `sales` 当前的行级事务化骨架。

## P1：`purchase` 行级事务化第二刀：`ORDER_LINE_ADD`（2026-04-08）

### 本轮目标
在已完成 `purchase` 的 `ORDER_LINE_CONTENT_CHANGE` 基础上，继续复制 `sales` 行级样板，单独收口采购订单“纯新增行”这一语义动作。

### 已执行变更
更新：
- `server/services/purchase_transaction_service.go`
- `src/features/trading/purchase/services/purchase-transaction-service.ts`
- `src/features/trading/purchase/hooks/use-purchase-orders.ts`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`

### 本轮实际处理内容
- 后端新增采购订单 `ORDER_LINE_ADD` intent；
- `ORDER_LINE_ADD` 只允许处理“相较当前采购订单，仅新增行、既有行未改动”的场景；
- 保留采购物料有效性校验；
- 前端新增 `changePurchaseOrderLineAdd()` 与 `lineAddMutation`；
- 在采购订单编辑对话框中，当 delta 仅包含 `lines` / `amount` 且可稳定识别为“纯新增行”时，优先走 `lineAddMutation`；
- 若混入既有行内容修改、头部字段或其他结构性变更，则继续保留在现有 `ORDER_LINE_CONTENT_CHANGE` / `patchMutation` 边界中。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Purchase
```

结果：通过。

### 本轮结论
本轮已完成 `purchase` 行级事务化第二刀：

- `purchase` 已从首个行级事务扩展到“行内容修改 + 行新增”双事务结构；
- 当前采购事务样板已形成：
  - `ORDER_DELIVERY_DATE_CHANGE`
  - `ORDER_LINE_CONTENT_CHANGE`
  - `ORDER_LINE_ADD`
- 为后续继续拆分 `ORDER_LINE_REMOVE` 提供了稳定边界。

## P1：`purchase` 行级事务化第一刀：`ORDER_LINE_CONTENT_CHANGE`（2026-04-08）

### 本轮目标
在已完成 `purchase` 头部 `expectedDate` 事务化的基础上，继续复制 `sales` 样板，单独收口采购订单“既有行内容修改、无增删”这一行级语义动作。

### 已执行变更
更新：
- `server/services/purchase_transaction_service.go`
- `src/features/trading/purchase/services/purchase-transaction-service.ts`
- `src/features/trading/purchase/hooks/use-purchase-orders.ts`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`

### 本轮实际处理内容
- 后端新增采购订单 `ORDER_LINE_CONTENT_CHANGE` intent；
- `ORDER_LINE_CONTENT_CHANGE` 只允许处理“既有采购行内容修改、无增删”的场景；
- 保留采购物料有效性校验；
- 前端新增 `changePurchaseOrderLineContent()` 与 `lineContentChangeMutation`；
- 在采购订单编辑对话框中，当 delta 仅包含 `lines` / `amount` 且可稳定识别为“无增删的既有行内容修改”时，优先走 `lineContentChangeMutation`；
- 若混入头部字段或出现行新增/删除，则继续保留在现有 `patchMutation` 链中。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Purchase
```

结果：通过。

### 本轮结论
本轮已完成 `purchase` 行级事务化第一刀：

- `purchase` 已从头部事务扩展到首个行级事务；
- 当前采购事务样板已形成：
  - `ORDER_DELIVERY_DATE_CHANGE`
  - `ORDER_LINE_CONTENT_CHANGE`
- 为后续继续拆分 `ORDER_LINE_ADD` / `ORDER_LINE_REMOVE` 提供了稳定边界。

## P1：`purchase` 事务化第一刀（2026-04-08）

### 本轮目标
将已在 `sales` 域验证通过的 transaction 样板横向复制到 `purchase` 域，并以最小切口先收口采购订单 `expectedDate` 的纯头部语义变更。

### 已执行变更
更新：
- `server/services/purchase_transaction_service.go`
- `server/handlers/purchase_transaction_handlers.go`
- `server/routes/routes_trading.go`
- `src/features/trading/purchase/services/purchase-transaction-service.ts`
- `src/features/trading/purchase/hooks/use-purchase-orders.ts`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`

### 本轮实际处理内容
- 后端新增 `purchase` transaction 骨架；
- 新增采购订单 `ORDER_DELIVERY_DATE_CHANGE` intent，用于 `expectedDate` 事务化；
- 新增采购事务 handler 与 `POST /purchase/orders/:id/transactions` 路由；
- 前端新增 `changePurchaseOrderExpectedDate()` 与 `expectedDateChangeMutation`；
- 在采购订单编辑对话框中，当 delta 仅包含 `expectedDate` 时，优先走 transaction；
- 其他采购订单编辑仍继续保留在现有 `patchMutation` 链中，避免把 transaction 退化为 patch 包装壳。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Purchase
```

结果：通过。

### 本轮结论
本轮已完成 `purchase` 事务化第一刀：

- `purchase` 域已具备可复用的 transaction 入口样板；
- 采购订单 `expectedDate` 已成为独立 transaction 语义；
- `sales` 样板已开始横向复制到 `purchase` 域。

## P1：`sales` 行级事务化第四刀：`ORDER_LINE_REMOVE`（2026-04-08）

### 本轮目标
在已完成 `ORDER_LINE_ADD` 的基础上，继续细化 `sales` 行级事务，单独收口“纯删除行”这一语义动作。

### 已执行变更
更新：
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`

### 本轮实际处理内容
- 后端新增 `ORDER_LINE_REMOVE` intent；
- `ORDER_LINE_REMOVE` 只允许处理“相较当前订单，仅删除行、保留行未改动”的场景；
- 前端新增 `removeSalesOrderLine()` 与 `lineRemoveMutation`；
- 在 `sales-order-action-dialog.tsx` 中，当 delta 仅包含 `lines`、`quantity`、`amount` 且可稳定识别为“纯删除行”时，优先走 `lineRemoveMutation`；
- 若纯行级变更但不是“仅删除”，仍继续保留在 `ORDER_LINES_CHANGE` / `ORDER_LINE_CONTENT_CHANGE` / `ORDER_LINE_ADD` 既有边界中；
- 继续保持头部字段与混合编辑不进入该 intent。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Sales
```

结果：通过。

### 本轮结论
本轮已完成 `sales` 行级事务化第四刀：

- “纯删除行”已从结构性行集合变更中进一步细化为独立 transaction；
- 当前 `sales` 行级事务已形成：
  - `ORDER_LINE_CONTENT_CHANGE`
  - `ORDER_LINE_ADD`
  - `ORDER_LINE_REMOVE`
  - `ORDER_LINES_CHANGE`（其余结构性变更兜底）
- `sales` 行级事务化样板已形成较完整的细粒度骨架。

## P1：`sales` 行级事务化第三刀：`ORDER_LINE_ADD`（2026-04-08）

### 本轮目标
在已完成 `ORDER_LINE_CONTENT_CHANGE` 的基础上，继续细化 `sales` 行级事务，单独收口“纯新增行”这一语义动作。

### 已执行变更
更新：
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`

### 本轮实际处理内容
- 后端新增 `ORDER_LINE_ADD` intent；
- `ORDER_LINE_ADD` 只允许处理“相较当前订单，仅新增行、既有行未改动”的场景；
- 前端新增 `addSalesOrderLine()` 与 `lineAddMutation`；
- 在 `sales-order-action-dialog.tsx` 中，当 delta 仅包含 `lines`、`quantity`、`amount` 且可稳定识别为“纯新增行”时，优先走 `lineAddMutation`；
- 若纯行级变更但不是“仅新增”，仍继续保留在 `ORDER_LINES_CHANGE` / `ORDER_LINE_CONTENT_CHANGE` 既有边界中；
- 继续保持头部字段与混合编辑不进入该 intent。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Sales
```

结果：通过。

### 本轮结论
本轮已完成 `sales` 行级事务化第三刀：

- “纯新增行”已从结构性行集合变更中进一步细化为独立 transaction；
- 当前 `sales` 行级事务已形成：
  - `ORDER_LINE_CONTENT_CHANGE`
  - `ORDER_LINE_ADD`
  - `ORDER_LINES_CHANGE`（其余结构性变更兜底）
- 为下一刀继续拆分 `ORDER_LINE_REMOVE` 提供了稳定边界。

## P1：`sales` 行级事务化第二刀（2026-04-08）

### 本轮目标
在已完成 `ORDER_LINES_CHANGE` 的基础上，把 `sales` 行级事务进一步细化，先将“既有行内容修改、无增删”的场景收敛为独立 transaction。

### 已执行变更
更新：
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`

### 本轮实际处理内容
- 后端新增 `ORDER_LINE_CONTENT_CHANGE` intent；
- `ORDER_LINE_CONTENT_CHANGE` 只允许处理既有行内容修改，不允许行新增/删除；
- 前端新增 `changeSalesOrderLineContent()` 与 `lineContentChangeMutation`；
- 在 `sales-order-action-dialog.tsx` 中，当 delta 仅包含 `lines`、`quantity`、`amount` 且行结构未变化时，优先走 `lineContentChangeMutation`；
- 若纯行级变更但发生了行结构变化（如新增/删除导致 `lineNo` 集合变化），则继续保留在 `ORDER_LINES_CHANGE`；
- 继续保持头部字段与混合编辑不进入该 intent。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Sales
```

结果：通过。

### 本轮结论
本轮已完成 `sales` 行级事务化第二刀：

- 纯“既有行内容修改”已经从 `ORDER_LINES_CHANGE` 中进一步细化出来；
- 行级事务链已形成“内容修改”与“集合增删”两层边界；
- 为后续继续拆分 `ORDER_LINE_ADD` / `ORDER_LINE_REMOVE` 提供了稳定落点。

## P1：`sales` 行级编辑事务化第一刀（2026-04-08）

### 本轮目标
将 `sales` 事务化从订单头字段进一步推进到行级编辑，先把销售订单 `lines` 的纯内容编辑收敛为独立 transaction，而不把整单编辑整体 transaction 化。

### 已执行变更
更新：
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`

### 本轮实际处理内容
- 后端新增 `ORDER_LINES_CHANGE` intent；
- payload 以 `lines` 为 authoritative source，并携带操作者信息；
- 前端新增 `changeSalesOrderLines()` 与 `linesChangeMutation`；
- 在 `sales-order-action-dialog.tsx` 中，当编辑订单提交的 delta 仅包含 `lines`、`quantity`、`amount` 时，优先走 `linesChangeMutation`；
- 其中 `quantity` / `amount` 被视为 `lines` 变化带出的派生聚合字段，避免纯行级编辑被误判回 `patchMutation`；
- 后端按 `lines` 重算并落库 `quantity` / `amount`，不把这两个聚合字段视为前端真相源；
- 其他编辑仍继续保留 `patchMutation`，避免把改单事务化退化为整单 patch 包装壳。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Sales
```

结果：通过。

### 本轮结论
本轮已完成 `sales` 行级编辑事务化第一刀：

- 销售订单纯行级编辑已成为独立 transaction 语义；
- 行编辑引起的聚合字段联动已被纳入分流边界；
- `sales` 事务化样板从“头部字段事务”进一步扩展到了“行级事务”。

## P1：`sales` 分类/模式调整事务化（2026-04-08）

### 本轮目标
将 `sales` 改单事务化第三刀收敛为“分类/模式调整”，只在编辑订单时当且仅当 `classification` / `type` 发生纯语义变化时，走独立 transaction，而不把整单编辑整体 transaction 化。

### 已执行变更
更新：
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`

### 本轮实际处理内容
- 后端新增 `ORDER_CLASSIFICATION_TYPE_CHANGE` intent；
- payload 以 `classification` / `type` 为主，并允许携带由分类变更派生的 `barcode`；
- 前端新增 `changeSalesOrderClassificationType()` 与 `classificationTypeChangeMutation`；
- 在 `sales-order-action-dialog.tsx` 中，当编辑订单提交的 delta 仅包含 `classification`、`type`、`barcode` 时，优先走 `classificationTypeChangeMutation`；
- 其中 `barcode` 被视为 `classification` 变化带出的派生副作用，避免纯分类变更被误判回 `patchMutation`；
- 其他编辑仍继续保留 `patchMutation`，避免把改单事务化退化为整单 patch 包装壳。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Sales
```

结果：通过。

### 本轮结论
本轮已完成 `sales` 改单事务化第三刀：

- 分类/模式调整已成为独立 transaction 语义；
- `classification` 引起的预览条码联动已被纳入事务分流边界；
- 整单普通编辑仍保留 `patch` 链，未被过早整体 transaction 化。

## P1：`sales` 交期调整事务化（2026-04-08）

### 本轮目标
将 `sales` 改单事务化第二刀收敛为“交期调整”，只在编辑订单时当且仅当 `deliveryDate` 发生变化时，走独立 transaction，而不把整单编辑整体 transaction 化。

### 已执行变更
更新：
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`

### 本轮实际处理内容
- 后端新增 `ORDER_DELIVERY_DATE_CHANGE` intent；
- `ORDER_DELIVERY_DATE_CHANGE` payload 只承载 `deliveryDate` 与操作者信息；
- 前端新增 `changeSalesOrderDeliveryDate()` 与 `deliveryDateChangeMutation`；
- 在 `sales-order-action-dialog.tsx` 中，当编辑订单提交的 delta 仅包含 `deliveryDate` 时，优先走 `deliveryDateChangeMutation`；
- 其他编辑仍继续保留 `patchMutation`，避免把改单事务化退化为整单 patch 包装壳。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Sales
```

结果：通过。

### 本轮结论
本轮已完成 `sales` 改单事务化第二刀：

- 交期调整已成为独立 transaction 语义；
- 整单普通编辑仍保留 `patch` 链，未被过早整体 transaction 化；
- 为下一刀继续推进“分类/模式调整事务化”提供了可复用样板。

## P1：`sales` 客户主体调整事务化（2026-04-08）

### 本轮目标
将 `sales` 改单事务化的第一刀收敛为“客户主体调整”，只在编辑订单时当且仅当 `customerId/customerName` 发生变化时，走独立 transaction，而不把整单编辑整体 transaction 化。

### 已执行变更
更新：
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`

### 本轮实际处理内容
- 后端新增 `ORDER_CUSTOMER_CHANGE` intent；
- `ORDER_CUSTOMER_CHANGE` payload 只承载 `customerId/customerName` 与操作者信息；
- 前端新增 `changeSalesOrderCustomer()` 与 `customerChangeMutation`；
- 在 `sales-order-action-dialog.tsx` 中，当编辑订单提交的 delta 仅包含 `customerId/customerName` 时，优先走 `customerChangeMutation`；
- 其他编辑仍继续保留 `patchMutation`，避免把改单事务化退化为整单 patch 包装壳。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Sales
```

结果：通过。

### 本轮结论
本轮已完成 `sales` 改单事务化第一刀：

- 客户主体调整已成为独立 transaction 语义；
- 整单普通编辑仍保留 `patch` 链，未被过早整体 transaction 化；
- 为下一刀继续推进“交期调整事务化”或“分类/模式调整事务化”提供了可复用样板。

## P1：`sales` 取消事务化（2026-04-08）

### 本轮目标
将当前混在 `DELETE /sales-orders/:id` 里的“作废/取消”语义拆出为独立 transaction intent，使取消与硬删除不再共用同一入口。

### 已执行变更
更新：
- `server/services/sales_transaction_service.go`
- `server/handlers/sales_orders.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-detail.tsx`
- `src/features/trading/components/sales-order-list-fixed.tsx`

### 本轮实际处理内容
- 后端新增 `ORDER_CANCEL` transaction intent；
- `ORDER_CANCEL` 已支持版本校验、主单状态改为 `Canceled`、明细行状态同步改为 `Canceled`，并写入最小审计记录；
- 前端新增 `cancelSalesOrder()` 与 `cancelMutation`；
- 详情页中的“作废订单”已从状态事务分流为独立取消事务；
- 列表页中的删除动作已区分：
  - 未作废订单：走 `cancelMutation`
  - 已作废订单：保留 `DELETE` 作为硬删除/清理入口；
- 后端 `DELETE /sales-orders/:id` 已收紧为只允许已作废订单执行硬删除，不再承担“取消”语义。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Sales
```

结果：通过。

### 本轮结论
本轮已完成 `sales` 第三个正式语义事务动作：

- 取消已成为独立事务，而不再混在 `DELETE` 中；
- `DELETE` 语义已收敛为已取消后的硬删除；
- `sales` 当前已具备三条正式 transaction 链：`ORDER_LINE_CLAIM`、`ORDER_STATUS_TRANSITION`、`ORDER_CANCEL`。

## P1：`use-sales.ts` 删除 + `ORDER_STATUS_TRANSITION` 事务化（2026-04-08）

### 本轮目标
在已批准的顺序下，先物理删除已退出正式入口的 `use-sales.ts`，再把 `sales-order-detail.tsx` 中的状态推进从 `patchMutation` 改造为 `ORDER_STATUS_TRANSITION` transaction。

### 已执行变更
删除：
- `src/features/trading/sales/hooks/use-sales.ts`

更新：
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-detail.tsx`
- `server/services/sales_transaction_service.go`

### 本轮实际处理内容
- 已物理删除 `use-sales.ts`，并确认其不再存在正式引用；
- 前端新增 `ORDER_STATUS_TRANSITION` transaction 调用能力；
- `use-sales-transactions.ts` 已新增 `statusTransitionMutation`；
- `sales-order-detail.tsx` 的状态推进已从 `trackDelta() + patchMutation` 切换为 `statusTransitionMutation`；
- 后端 `sales_transaction_service.go` 已支持 `ORDER_STATUS_TRANSITION` intent，完成版本校验、状态更新与最小审计写入；
- 状态推进仍沿用现有 transaction endpoint：`POST /sales-orders/:id/transactions`。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Sales
```

结果：通过。

### 本轮结论
本轮已完成 `sales` 第二个语义事务动作落地：

- `use-sales.ts` 已被物理移除；
- `ORDER_STATUS_TRANSITION` 已不再依赖字段 patch 驱动；
- `sales` 目前已至少拥有两条正式 transaction 链：`ORDER_LINE_CLAIM`、`ORDER_STATUS_TRANSITION`；
- 本轮未扩散到更多 intent，也未进入其他域改造。

## P1：`sales` query / transaction 分层拆分（2026-04-08）

### 本轮目标
在已批准的前提下，正式完成 `sales` 前端 query / transaction 分层拆分，拆出 query hooks、transaction hooks 与 query service，并让旧 `use-sales.ts` 退出正式入口。

### 已执行变更
新增：
- `src/features/trading/sales/services/sales-query-service.ts`
- `src/features/trading/sales/hooks/use-sales-queries.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`

更新：
- `src/features/trading/sales/services/sales-service.ts`
- `src/features/trading/sales/index.ts`

### 本轮实际处理内容
- 将 `getSalesOrders()`、`getSalesOrderById()`、`getSalesOrderByNo()` 从 `sales-service.ts` 拆出到 `sales-query-service.ts`；
- 新增 `use-sales-queries.ts`，承载 `useGetSalesOrders()` 与 `useGetSalesOrderDetail()`；
- 新增 `use-sales-transactions.ts`，承载 `useSalesOrderMutations()`；
- `sales-service.ts` 已收缩为 create / delete / patch / 兼容更新相关职责；
- `sales/index.ts` 已切换为从新分层文件正式导出；
- 旧 `use-sales.ts` 已退出正式导出入口，当前不再由 `sales/index.ts` 暴露，也未再发现直接引用。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
本轮已完成 `sales` 前端 query / transaction 分层拆分：

- 查询能力已独立成 query service + query hooks；
- mutation 能力已独立成 transaction hooks；
- `sales-service.ts` 的混合职责已明显收缩；
- 旧 `use-sales.ts` 已失去正式入口职责，未再作为兼容桥接层继续使用。

## P1：`sales` 第一阶段 TDO 化最小闭环（2026-04-08）

### 本轮目标
在已批准的 `sales-phase1-tdo-execution-checklist.md` 基础上，只落地第一阶段最小闭环：围绕 `claim` 建立 transaction 入口，并将前端 `claim` 从 patch 驱动切换到 transaction 驱动。

### 已执行变更
新增：
- `server/services/sales_transaction_service.go`
- `server/handlers/sales_transaction_handlers.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`

更新：
- `server/routes/routes_trading.go`
- `src/features/trading/sales/hooks/use-sales.ts`
- `src/features/trading/components/sales-order-detail.tsx`
- `src/features/trading/sales/index.ts`
- `task.md`
- `implementation_plan.md`

### 本轮实际处理内容
- 后端新增 `POST /sales-orders/:id/transactions` 路由；
- 新增 `ORDER_LINE_CLAIM` transaction service，改为后端在事务内锁定订单、校验版本、更新被认领明细并回写版本；
- 复用现有 `auditLogger`，为 `ORDER_LINE_CLAIM` 补最小事务审计记录；
- 前端新增 `sales-transaction-service.ts`，`claimMutation` 已改为提交 transaction payload；
- `sales-order-detail.tsx` 认领动作已传递 `expectedVersion` 与 `actorId`，不再依赖前端读取后拼接 `nextLines` 的旧链路；
- 保留现有 `patchSalesOrder()` 作为普通编辑兼容入口，本轮未扩散到状态推进事务化。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Sales
```

结果：通过。

### 本轮结论
本轮已完成 `sales` 第一阶段最小可运行闭环：

- `claim` 已从 patch 驱动迁移到 transaction 驱动；
- 后端已具备最小事务入口、版本校验与审计锚点；
- 前端保留的 `claim` 副作用已收敛为 toast 与 query invalidate；
- 未扩散到 `ORDER_STATUS_TRANSITION`、全量 query/transaction 分层或其他域改造。

### 第二小步收尾
- 已删除 `src/features/trading/sales/services/sales-service.ts` 中旧的 `claimOrderLine()` 兼容实现；
- 已删除 `src/features/trading/sales/index.ts` 中对 `claimOrderLine` 的导出；
- 已确认前端已无任何 `claimOrderLine` 引用残留，避免后续继续误走旧 patch 驱动入口。

### 第二小步验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

## P1：截图报错定点修复（2026-04-07）

### 本轮目标
只处理截图中已经暴露的 TypeScript/未使用变量错误，以最小修改恢复编译通过，不扩散为无关模块重构。

### 已执行变更
更新：
- `src/features/ai-assistant/components/daily-insight-modal.tsx`
- `src/features/engineering-db/components/hub-action-dialog.tsx`
- `src/features/engineering-db/components/nipple-action-dialog.tsx`
- `src/features/piecework/tabs/index.tsx`
- `src/features/piecework/components/rate-action-dialog.tsx`
- `src/features/trading/utils/sales-order-validator.ts`

### 本轮实际处理内容
- 对齐 `daily-insight-modal.tsx` 与 `AiMessageItem` 使用的动作协议，统一为 `ActionItem` 的 `label/value/type` 结构；
- 删除 `engineering-db` 与 `piecework` 中截图涉及的无效导入/未使用变量；
- 对 `hub-action-dialog.tsx` 与 `nipple-action-dialog.tsx` 一并补充类型导入、`DeltaSet` 类型收窄，以及局部 `setFormData` shim，避免直接修改 `useDeltaTracker` 返回对象；
- 将新增记录的草稿 id 生成移动到 `useState` 初始化阶段，避免渲染期 impure 调用；
- 将 `sales-order-validator.ts` 的 `errorKey` 收窄为显式联合翻译 key，消除 `t(errorKey)` 的 TS2345；
- 将 `piecework` 相关对话框/列表的 `delta` 参数从 `any` 收窄为 `DeltaSet`。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
本轮已完成截图中可见编译错误的定点修复：

- 编译已恢复通过；
- 未扩散为跨模块重构；
- `piecework/tabs/index.tsx` 中 `useReactTable()` 仍有 React Compiler 兼容性 warning，但不阻塞 TypeScript 编译，本轮未扩 scope 处理。

## P1：Trading 局部 warning 清理（2026-04-07）

### 本轮目标
在确认 Trading 域显式 `any` 已基本清理完成后，本轮不再扩散到跨模块类型治理，只处理 Trading 局部、低风险、无业务语义影响的规范 warning。

### 已执行变更
更新：
- `src/features/trading/components/parts/order-lines-editor.tsx`

### 本轮实际处理内容
- 将移动端行卡片中的 Tailwind 类名 `flex-shrink-0` 收口为简写 `shrink-0`；
- 未继续扩散到跨模块类型债务治理；
- 未改动任何 Trading 业务语义。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
本轮只完成了 Trading 局部 warning 的最小修正：

- 低风险规范 warning 已处理；
- 编译保持通过；
- 更深层类型债务仍建议转入新的独立专项，而不是继续挂在 Trading 局部清理尾项下推进。

## P1：Trading 相关既有 lint 欠账清理（2026-04-07）

### 本轮目标
在 Trading 子域拆分与旧入口删除完成后，本轮继续清理与本次解耦直接相关的历史 lint 欠账，但只处理低风险、可在不改变业务语义前提下收口的类型问题。

### 已执行变更
更新：
- `src/features/trading/hooks/use-sales-order-ops.ts`
- `src/features/trading/hooks/use-sales-order-form.ts`
- `src/features/trading/hooks/use-purchase-order-form.ts`
- `src/features/trading/components/parts/order-lines-editor.tsx`
- `src/features/trading/components/parts/order-header-fields.tsx`
- `src/features/trading/components/purchase/parts/purchase-order-header-fields.tsx`
- `src/features/trading/components/purchase/parts/purchase-order-lines-editor.tsx`
- `src/features/trading/components/sales-order-detail.tsx`
- `task.md`
- `implementation_plan.md`

### 本轮实际清理内容
- 将销售单/采购单行编辑器中的 `value: any` 收口为字段联合类型；
- 将表单头部组件中的 `setFormData` / `handleHeaderChange` 参数改为显式表单更新器类型；
- 将 `order-lines-editor.tsx` 中 `products`、`dictEntries` 改为显式 `Product`、`DictionaryEntry` 类型；
- 将 `sales-order-detail.tsx` 中预览链路使用的历史 `any` 收口为最小结构类型；
- 对 `useDeltaTracker` 返回值直接赋值的目标文件，改为通过局部 shim/update 方式写入，避免新的 lint 规则报错。

### 本轮说明
- 本轮没有扩散为全仓库 lint 清理；
- 本轮没有为了消除 lint 而重写 Trading 业务语义；
- 当前 `src/features/trading` 下通过简单搜索已不再存在本轮目标范围内的显式 `any` / `as any` / `: any` 残留。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
本轮完成了 Trading 域与本次解耦直接相关的低风险 lint 欠账收口：

- 历史 `any` 已被替换为显式业务类型；
- 表单更新与行编辑接口类型更加稳定；
- 未引入新的编译断裂；
- 为后续若要继续做更深层 lint/类型治理提供了更干净的基础。

## P1：Trading 4 个旧兼容代理文件物理删除（2026-04-07）

### 本轮目标
在上一轮已完成旧入口“薄代理收口”的基础上，本轮继续做最后一步：物理删除 Trading 中 4 个已失去正式实现职责的旧兼容文件，彻底移除旧 God File 文件实体。

### 已执行变更
删除：
- `src/features/trading/hooks/use-trading.ts`
- `src/features/trading/services/trading-service.ts`
- `src/features/trading/hooks/use-purchase.ts`
- `src/features/trading/services/purchase-service.ts`

结果：
- Trading 域不再保留这 4 个旧兼容代理文件；
- `sales/*` 与 `purchase/*` 继续作为唯一正式入口与唯一实现源；
- 旧 God File 已从“残余兼容层”进一步收口为“物理不存在”。

### 本轮说明
- 删除前已再次执行全局搜索，确认仓库内无正式调用方继续依赖上述旧路径；
- 本轮仍未扩散处理无关 lint 欠账；
- 若未来需要兼容回退，回退策略应是恢复薄代理，而不是恢复旧实现体。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
本轮完成了 Trading 旧 God File 清理的最后一步：

- 4 个旧兼容代理文件已物理删除；
- `sales/*` 与 `purchase/*` 成为唯一正式入口；
- Trading 域已不再保留旧总入口文件实体；
- TypeScript 编译通过，说明删除后调用链保持完整。

## P1：Trading 旧 God File 最终残余清理与双入口收口（2026-04-07）

### 本轮目标
本轮在上一轮 `customer / supplier / sales / purchase` 子域公开面建立完成的基础上，继续执行旧入口物理收口：

- 清理旧 `use-trading.ts` 的 `sales / purchase` 残余公开面；
- 清理旧 `trading-service.ts` 的 `sales / purchase` 残余实现；
- 收口旧 `use-purchase.ts` 与旧 `services/purchase-service.ts`，结束采购双入口并存；
- 在不引入隐藏回归风险的前提下，让旧文件退出“正式实现体”角色。

### 已执行变更
更新：
- `src/features/trading/hooks/use-trading.ts`
- `src/features/trading/services/trading-service.ts`
- `src/features/trading/hooks/use-purchase.ts`
- `src/features/trading/services/purchase-service.ts`
- `task.md`

#### 1) 旧 `use-trading.ts` 收口为薄代理
- 删除旧文件中的 `sales / purchase` query/mutation 实现体；
- 改为仅重导出：
  - `../sales`
  - `../purchase`

结果：
- 旧总 Hook 不再持有正式实现；
- 若仓库内仍有少量历史导入，也只会被透明转发到新子域公开面。

#### 2) 旧 `trading-service.ts` 收口为薄代理
- 删除旧文件中的 `sales` 与 `purchase` 具体 service 实现；
- 改为统一 re-export：
  - `../sales`
  - `../purchase`

结果：
- 旧 God Service 不再维护真实实现逻辑；
- `sales / purchase` 的正式实现源已统一回到各自子域目录。

#### 3) 旧 `use-purchase.ts` 收口为薄代理
- 删除旧采购 Hook 实现体；
- 改为直接重导出 `../purchase` 中的：
  - `useGetPurchaseOrders`
  - `useGetPurchaseOrderDetail`
  - `usePurchaseOrderMutations`

结果：
- 旧采购 Hook 正式退出实现角色；
- 旧 `saveMutation` 风格入口不再继续扩散。

#### 4) 旧 `services/purchase-service.ts` 收口为薄代理
- 删除旧采购 service 实现体；
- 改为重导出新 `purchase` 子域 service 公开面。

结果：
- 仓库内不再维护两套采购 service 实现；
- 采购查询/详情/收货确认/删除等能力回归单一实现源。

### 本轮说明
- 本轮采用的是“薄代理收口”，而不是直接删除旧文件；
- 这样做的目的是在保证正式实现源已统一的同时，避免潜在隐藏导入路径在本轮直接断裂；
- 旧文件当前仍存在，但已不再承担正式业务实现职责，可视为兼容过渡层。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
本轮完成了 Trading 旧 God File 最终残余清理的核心收口：

- 旧 `use-trading.ts`、旧 `trading-service.ts`、旧 `use-purchase.ts`、旧 `services/purchase-service.ts` 已全部退出正式实现体角色；
- `sales / purchase` 的正式实现源已统一收口到新子域目录；
- 双入口并存问题已从“双实现”降为“新实现 + 旧兼容薄代理”；
- TypeScript 编译通过，为下一轮若要进一步物理删除旧兼容文件提供了稳定基础。

## P1：Trading 模块 God Files Phase 1 解耦实施（2026-04-07）

### 本轮目标
本轮按已批准的 God Files Phase 1 方案执行 Trading 前端最小解耦，目标不是一次性重写交易状态流，而是优先恢复业务域边界：

- 将 `customer / supplier / sales / purchase` 建立为独立子域公开面；
- 将 `trading-service.ts` / `use-trading.ts` 从“大一统入口”收口为最小残余；
- 保持现有页面行为与 authoritative flow 语义稳定；
- 为后续继续处理更深层状态流拆分提供稳定基础。

### 已执行变更
更新：
- `src/features/trading/customer/services/customer-service.ts`
- `src/features/trading/customer/hooks/use-customer.ts`
- `src/features/trading/customer/index.ts`
- `src/features/trading/supplier/services/supplier-service.ts`
- `src/features/trading/supplier/hooks/use-supplier.ts`
- `src/features/trading/supplier/index.ts`
- `src/features/trading/sales/services/sales-service.ts`
- `src/features/trading/sales/hooks/use-sales.ts`
- `src/features/trading/sales/index.ts`
- `src/features/trading/purchase/services/purchase-service.ts`
- `src/features/trading/purchase/hooks/use-purchase-orders.ts`
- `src/features/trading/purchase/index.ts`
- `src/features/trading/services/trading-service.ts`
- `src/features/trading/hooks/use-trading.ts`
- `src/features/trading/components/customer-list.tsx`
- `src/features/trading/components/supplier-list.tsx`
- `src/features/trading/components/sales-order-action-dialog.tsx`
- `src/features/trading/components/sales-order-detail.tsx`
- `src/features/trading/components/sales-order-list-fixed.tsx`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
- `src/features/trading/components/purchase/purchase-order-list.tsx`
- `src/features/trading/components/purchase/purchase-order-detail.tsx`
- `src/features/trading/components/purchase/purchase-order-logs.tsx`
- `src/features/trading/components/purchase/purchase-receipt-confirm-dialog.tsx`
- `src/features/trading/hooks/use-requirements.ts`
- `src/features/warehouse/hooks/use-shipment.ts`
- `src/features/logistics/components/logistics-action-dialog.tsx`
- `src/features/system-mgmt/workflow-core/hooks/use-notification-rules.ts`
- `src/features/system-mgmt/notifications/components/notification-center.tsx`
- `src/features/dashboard/services/trace-service.ts`
- `task.md`

#### 1) 建立 `customer / supplier` 子域公开面
- 新增 `customer` 子域：
  - `services/customer-service.ts`
  - `hooks/use-customer.ts`
  - `index.ts`
- 新增 `supplier` 子域：
  - `services/supplier-service.ts`
  - `hooks/use-supplier.ts`
  - `index.ts`

结果：
- 客户与供应商查询/创建/PATCH/删除能力不再挂在单个 `trading-service.ts` / `use-trading.ts` 上；
- `customer-list.tsx`、`supplier-list.tsx`、销售/采购单对话框中的客户/供应商读取已切到新子域公开面。

#### 2) 建立 `sales / purchase` 子域公开面
- 新增 `sales` 子域：
  - `services/sales-service.ts`
  - `hooks/use-sales.ts`
  - `index.ts`
- 新增 `purchase` 子域：
  - `services/purchase-service.ts`
  - `hooks/use-purchase-orders.ts`
  - `index.ts`

结果：
- 销售单列表、详情、创建、PATCH、认领等入口已收口到 `sales` 子域；
- 采购单列表、详情、创建、PATCH、收货确认、已删除日志等入口已收口到 `purchase` 子域；
- `sales / purchase` 深层业务状态流语义本轮未重写，仅做公开面与调用点迁移。

#### 3) 瘦身 `trading-service.ts` 与 `use-trading.ts`
- `trading-service.ts` 已移除 `customer / supplier` 相关职责；
- `use-trading.ts` 已移除 `customer / supplier` query/mutation；
- `customer / supplier` 调用方已不再依赖旧 God Hook/God Service 入口。

结果：
- 旧 God File 的职责堆叠已明显下降；
- `src/features/trading` 现在按业务域拥有更清晰的入口边界。

#### 4) 清理跨模块对旧 sales 入口的残余依赖
本轮额外将以下跨模块读取切换到新的 `sales` 子域公开面：

- `warehouse/hooks/use-shipment.ts`
- `logistics/components/logistics-action-dialog.tsx`
- `system-mgmt/workflow-core/hooks/use-notification-rules.ts`
- `system-mgmt/notifications/components/notification-center.tsx`
- `dashboard/services/trace-service.ts`

结果：
- 旧 `trading-service.ts` / `use-trading.ts` 不再承担这些跨模块读口径；
- 交易域外部调用方也开始显式依赖具体业务子域，而不是继续走模糊总入口。

### 本轮说明
- 本轮遵循“先拆公开面、后碰深状态流”的策略，没有顺手重写 `sales / purchase` authoritative flow；
- `sales-order-detail.tsx`、`use-notification-rules.ts` 等文件中仍有既有 `any` lint 欠账，本轮未扩散治理，只处理拆分所需最小改动；
- 当前更像是“恢复边界的 Phase 1”，而不是交易模块的最终形态重构。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
本轮已完成 Trading 模块 God Files Phase 1 的最小落地：

- `customer / supplier / sales / purchase` 四个业务子域已建立公开面；
- `trading-service.ts` / `use-trading.ts` 的“大一统职责”已被明显削薄；
- 跨模块调用开始显式依赖具体业务子域；
- 在不重写深状态流的前提下，编译验证通过，为后续继续收口交易模块边界提供了稳定基础。

## P1：仓储库存视图 `getInventoryList()` 后移后端实施（2026-04-07）

### 本轮目标
本轮按已批准的缩小范围执行仓储库存聚合后移，只处理 `src/features/warehouse/services/inventory-service.ts#getInventoryList()` 主链：由后端输出权威库存视图，前端不再并行拉取物料、产品与原始库存记录做正式展示聚合。

### 已执行变更
更新：
- `server/services/inventory_query_dto.go`
- `server/services/inventory_query_mapper.go`
- `server/services/inventory_query_service.go`
- `server/handlers/inventory_query_handlers_test.go`
- `server/handlers/inventory_command_handlers_test.go`
- `src/features/warehouse/services/inventory-service.ts`

#### 1) 复用现有 `GET /api/v1/inventory`，补强为库存视图权威返回
- 未新增新路由，继续复用现有 `GET /api/v1/inventory`
- 在后端库存查询 DTO 中补齐前端 `InventoryView` 主链所需字段：
  - `lastUpdated`
  - `materialCategory`
  - `version`
- 其中：
  - `lastUpdated` 当前对齐 `inventory.updated_at`
  - `version` 本轮按最小兼容口径固定回填为 `1`

结果：
- 前端库存管理页正式展示所需字段已由后端统一返回；
- 本轮无需再额外新开 `/inventory/view` 接口，降低联动面。

#### 2) 后端补充物料类别映射，收口 `materialCategory`
- `server/services/inventory_query_service.go` 在读取库存分页结果后，额外按 `materialId` 查询 `materials` 表中的 `category`
- 若命中物料主数据，则返回对应 `materialCategory`
- 若未命中物料主数据，则按现有前端兼容口径默认回填为 `FINISHED`

结果：
- 现有库存记录中“物料 / 成品共用 `materialId` 字段”的历史口径被保留；
- `use-stock-mgmt.ts` 无需自行再从前端主数据表推导 `materialCategory`。

#### 3) 前端 `getInventoryList()` 已切换为直接消费后端分页结果
- `src/features/warehouse/services/inventory-service.ts#getInventoryList()` 已从：
  - 并行拉取 `materialService.getMaterialOptions()`
  - 并行拉取 `productService.getProducts()`
  - 拉取 `/inventory` 原始列表
  - 在浏览器内拼装 `InventoryView`
- 调整为：
  - 直接请求 `/inventory?page=1&pageSize=1000`
  - 读取后端分页响应中的 `items`
  - 将 `items` 作为正式库存视图返回

结果：
- `getInventoryList()` 已不再承担前端正式聚合职责；
- 仓储库存管理主链已改为消费后端权威库存视图。

#### 4) 保持本轮边界：`searchMasterData()` 不扩散处理
- `searchMasterData()` 仍保留当前实现
- `use-stock-mgmt.ts` 未做不必要重构
- 本轮未扩散到：
  - `use-report.ts`
  - `use-notification-rules.ts`
  - `dashboard/services/trace-service.ts`

结果：
- 本轮严格保持在用户已批准的最小范围内；
- 只收口库存视图正式事实源，不顺手处理其他聚合候选链。

### 验证
执行：
```bash
go test ./handlers -run Inventory
pnpm exec tsc --noEmit
```

结果：通过。

补充验证结论：
- 后端库存查询 handler 测试已覆盖新增字段：
  - `materialCategory`
  - `lastUpdated`
  - `version`
- 前端 TypeScript 编译通过，说明 `inventory-service.ts#getInventoryList()` 切换为分页结果消费后，`warehouse` 主链未引入新的类型错误。

### 本轮结论
本轮已完成仓储库存视图 `getInventoryList()` 的最小后移：

- 后端 `GET /inventory` 已承担库存视图权威返回职责；
- 前端不再拉取物料、产品与库存三份数据做正式视图拼装；
- `use-stock-mgmt.ts` 主消费链保持稳定；
- `searchMasterData()` 等后续候选链留待下一轮处理。

## P1：前端 MRP 大运算后移后端实施（2026-04-07）

### 本轮目标
本轮按已批准方案执行 `trading/requirements` 页的 MRP 大运算后迁：将正式 MRP 需求计算从前端 `MrpEngine` 主链迁移到后端权威聚合接口，前端只保留订单选择、结果展示与交互职责。

### 已执行变更
更新：
- `server/services/mrp_requirements.go`
- `server/services/mrp_requirements_test.go`
- `server/handlers/mrp_requirements.go`
- `server/routes/routes_trading.go`
- `server/handlers/sales_orders.go`
- `server/services/sales_order_dto.go`
- `server/services/sales_order_mapper.go`
- `src/features/trading/services/requirement-service.ts`
- `src/features/trading/hooks/use-requirements.ts`
- `src/features/trading/services/trading-service.ts`
- `src/features/trading/hooks/use-trading.ts`
- `task.md`
- `implementation_plan.md`

#### 1) 后端新增权威 MRP 聚合计算链
- 新增 `server/services/mrp_requirements.go`
- 后端统一读取：
  - 活动销售订单及明细
  - 有效 BOM 与 BOM Items
  - 物料主数据
  - 产品显示信息
  - 包装规则
  - 库存
- 后端统一完成：
  - BOM 爆炸
  - 物料需求汇总
  - 库存对冲
  - 缺口计算
  - 包装换算
  - 统计快照生成

结果：
- 正式 MRP 结果不再由浏览器本地计算；
- `requirements` 页结果改为以后端权威返回为准。

#### 2) 后端新增 `MRP requirements` 接口
- 新增 `server/handlers/mrp_requirements.go`
- 在 `server/routes/routes_trading.go` 注册：
  - `GET /api/v1/mrp/requirements`

结果：
- 前端有了单一 MRP 结果事实源；
- 后续如需导出、缓存、审计或预计算，已有正式服务端入口可扩展。

#### 3) 销售订单列表接口最小增强，支持 requirements 选择树
- `server/handlers/sales_orders.go` 增加：
  - `withLines=true`
  - `status=Pending,InProgress`
- `server/services/sales_order_dto.go` 与 `sales_order_mapper.go` 在列表项场景下支持返回 `lines`

结果：
- `requirements` 页的订单选择树仍可继续使用活动订单明细；
- 但它只承担选择与展示职责，不再承担正式业务计算。

#### 4) 前端 `useRequirements()` 改为消费后端结果
- 新增 `src/features/trading/services/requirement-service.ts`
- `src/features/trading/hooks/use-requirements.ts` 已从“拉 6 份主数据 + 本地 `MrpEngine` 运算”改为：
  - 只加载带明细的活动订单供选择树使用；
  - 点击分析时调用后端 `requirementService.getMrpRequirements(...)`；
  - 使用后端返回的 `requirements` 与 `stats` 作为正式结果。

结果：
- 前端正式退出 MRP 主计算链；
- 浏览器不再承担 BOM 爆炸、库存对冲、包装换算等领域运算。

#### 5) 交易前端调用层完成适配
- `src/features/trading/services/trading-service.ts` 的 `getSalesOrders(...)` 改为 options 形式，支持 `withLines/status`
- `src/features/trading/hooks/use-trading.ts` 已同步适配，保持现有页面调用方式稳定

结果：
- 未把本轮改动扩散成销售订单模块整体重构；
- 现有列表页与其他调用方仍可沿用原有 hook 入口。

#### 6) 前端遗留 `MrpEngine` 与 `features/mrp` 死代码已物理删除
- 新增 `src/features/trading/data/requirement-schema.ts`
- `MaterialRequirement` / `MrpStats` 已迁移到 trading 域内聚维护
- 已删除：
  - `src/features/mrp/services/mrp-engine.ts`
  - `src/features/mrp/data/schema.ts`
- `RequirementDrawer` / `RequirementList` / `RequirementExportService` / `useRequirements` / `requirement-service` 的类型引用已全部切到 `trading/data/requirement-schema.ts`

结果：
- 前端 `MRP` 历史计算实现已彻底脱离仓库主代码路径；
- `features/mrp` 不再保留孤岛类型与无主服务实现；
- `trading/requirements` 的类型边界回归到 trading 域自身维护。

### 验证
执行：
```bash
go test ./services -run Mrp
go test ./handlers ./routes -run ^$
pnpm exec tsc --noEmit
```

结果：通过。

补充验证结论：
- 后端 `MRP` service 已覆盖：
  - 空数据返回空数组与零统计；
  - 有订单/BOM/库存/包装规则时可正确产出需求结果与包装换算。
- 前端 TypeScript 编译通过，说明本轮 `getSalesOrders(...)` 签名调整与 `requirements` 主链切换未引入新的类型错误。

### 本轮结论
本轮已完成 `trading/requirements` 页 MRP 大运算的主链后迁：

- 正式 MRP 结果已以后端为准；
- 前端只保留订单选择、抽屉展示与交互；
- 原前端 `MrpEngine` 已不再参与页面正式计算主链。

这次改造满足了“前端不应该参与这种大运算”的目标，同时保持了页面交互外观与使用方式基本稳定。

## P1：AI 单入口收敛实施（2026-04-07）

### 本轮目标
本轮按已确认方案执行 AI 单入口收敛：保留中间弹窗作为唯一 AI 主容器，移除同一个按钮在 `DailyInsightModal` 与 `AiDrawer` 之间随机分流的主入口逻辑，降低交互歧义与双容器维护成本。

### 已执行变更
更新：
- `src/features/ai-assistant/components/ai-trigger.tsx`
- `src/features/ai-assistant/components/daily-insight-modal.tsx`

#### 1) `AiTrigger` 统一入口行为
- 移除对 `AiDrawer` 的主入口分流
- AI 按钮点击后统一打开 `DailyInsightModal`
- unread insight 不再决定“打开哪个容器”，只作为中间弹窗内部内容状态输入

结果：
- 同一个 AI 按钮不再出现“一次打开抽屉、一次打开中间弹窗”的随机体验；
- 主入口容器已统一为中间弹窗。

#### 2) `DailyInsightModal` 升级为统一主容器
- 保留原有简报态：有 unread insight 时继续显示经营简报与行动磁贴
- 增加普通问询态：无 unread insight 时，在同一中间弹窗内部承载 AI 聊天能力
- 复用现有：
  - `useAiChatEngine`
  - `AiMessageItem`
  - `getLatestSnapshot`

结果：
- 简报与普通问询能力已统一收编到单一中间弹窗；
- 不再需要依赖侧边抽屉承接普通问询。

#### 3) `AiDrawer` 主入口职责已降级
- 当前代码中 `AiDrawer` 已不再被主入口引用；
- 后续已完成物理删除：`src/features/ai-assistant/components/ai-drawer.tsx`。

结果：
- 双主容器并存的入口歧义已消除；
- 后续维护可围绕单一中间弹窗继续收敛。

### 验证
执行：
```bash
pnpm exec eslint src/features/ai-assistant/components/ai-trigger.tsx src/features/ai-assistant/components/daily-insight-modal.tsx src/features/ai-assistant/hooks/use-ai-permissions.ts
```

结果：通过。

补充修正：
- 已移除 `AiTrigger` 中基于前端 `isVisible` 的点击前硬拦截；
- AI 按钮现在始终可以打开统一中间弹窗；
- 实际 AI 能否使用，回归由后端请求链裁决，前端不再先行阻止。

补充说明：
- 尝试执行整仓 `pnpm build` 时，被仓库内既有的 `engineering / engineering-db` TypeScript 错误阻断；
- 当前阻断项不属于本次 AI 单入口收敛改动引入的问题，因此本轮以定向 eslint 作为前端最小验证依据。

### 本轮结论
本轮已完成 AI 单入口收敛的最小落地：

- 保留中间弹窗为唯一 AI 主容器；
- 主按钮不再分流到 `AiDrawer`；
- 普通问询能力已收编到统一中间弹窗内部；
- 为后续继续清理遗留 `AiDrawer` 组件与视觉细节提供稳定基础。

## P1：AI 治理权限口径统一（方案B，2026-04-07）

### 本轮目标
本轮按已确认方案B执行 AI 治理权限口径统一：修复前端 `useAiPermissions()` 与后端 `AIPolicyGuard()` 对当前用户 AI 可用性的判定漂移，消除“前端可见但 `/api/v1/ai/proxy` 返回 403”导致生产环境无法生成 `DailyInsightModal` 的问题。

### 已确认根因
生产环境日志已明确显示：

- `AI_PROXY_ERROR (403): Current user is not allowed by AI governance policy`

进一步排查确认：

- 前端 AI 显隐与后台任务触发，使用的是 `user.role[] / username`；
- 后端 `/api/v1/ai/proxy` 的 `AIPolicyGuard()` 只使用单个 `context.role / username`；
- 认证中间件实际上已经把 `effectiveRoles` 注入了 Gin context，但 AI guard 未使用该权威角色集合；
- 因此出现“前端判定可用、后端治理拒绝”的口径漂移，最终导致 `hasUnread` 无法置为 `true`，生产只显示 `AiDrawer` 而不会出现 `DailyInsightModal`。

### 已执行变更
更新：
- `server/middleware/ai_policy_guard.go`
- `src/features/ai-assistant/hooks/use-ai-permissions.ts`

#### 1) 后端 `AIPolicyGuard()` 改为按权威角色集合判定
- 不再只读取单个 `role`
- 改为基于认证上下文中的：
  - `effectiveRoles`
  - `role`
  - `username`
- 管理员绕过逻辑也改为对角色集合统一判断

结果：
- AI governance 裁决改为使用服务端已有的权威角色集合；
- 降低了“主角色与有效角色集合不一致”导致的误拒绝。

#### 2) 前端 `useAiPermissions()` 改为与后端同口径的角色标准化判定
- 使用 `getAuthSessionEffectiveRoleIds(user)` 读取有效角色集合
- 对 `allowedRoles / allowedUsers / username` 做统一小写与空白标准化
- 避免前端继续以未标准化的本地角色数组做宽松匹配

结果：
- 按钮显隐与后台任务可执行性更接近后端真实治理口径；
- 减少 DEV / 生产因角色大小写、字段来源不同带来的行为偏差。

### 本轮说明
- 本轮没有通过前端吞掉 `/ai/proxy` 403 来“伪修复”；
- 本轮没有伪造 `hasUnread` 或强行弹出 `DailyInsightModal`；
- 本轮只做最小收口，不扩散到 AI provider、模型选择或全量权限体系重构。

### 验证
执行：
```bash
go test ./middleware
pnpm build
```

结果：通过。

### 本轮结论
本轮完成了 AI 治理权限口径的最小统一：

- 后端 AI guard 已改为使用权威角色集合；
- 前端 AI 可见性判定已与后端口径对齐；
- 为修复生产环境“只显示 `AiDrawer`、无法生成 `DailyInsightModal`”提供了根因级收口基础。

## P1：`asset-service.ts` facade/hook 最小拆层实施（2026-04-07）

### 本轮目标
本轮按已确认的拆层专项执行最小拆层：保留 `AssetService` 作为无状态 facade，将 `useAssets()` 抽离为独立 hook，不改页面业务语义与底层领域 service API。

### 已执行变更
更新：
- `src/features/equipment-tooling/services/asset-service.ts`
- `src/features/equipment-tooling/hooks/use-assets.ts`
- `src/features/equipment-tooling/tabs/furnace-mgmt.tsx`
- `src/features/equipment-tooling/tabs/mold-mgmt.tsx`
- `src/features/equipment-tooling/hooks/use-dashboard-stats.ts`
- `src/features/dashboard/components/system-events.tsx`
- `src/features/dashboard/components/analytics.tsx`

#### 1) `asset-service.ts` 收口为纯 facade
- 移除文件内 `useAssets()` hook 实现
- 保留 `AssetService` 的静态 facade 能力：
  - 模具查询/命令
  - 炉台查询/命令
  - 借用记录查询/命令
  - 遥测更新

结果：
- `asset-service.ts` 不再混合 React 状态与 UI 协调逻辑；
- facade 职责边界更清晰。

#### 2) 新建独立 hook：`hooks/use-assets.ts`
- 将原 `useAssets()` 的以下职责迁移到独立 hook 文件：
  - 本地状态管理
  - 初始并行加载
  - 事件监听与局部刷新
  - 乐观更新与失败回滚
- 使用 `createLogger('useAssets')` 替换新文件中的 `console.error`

结果：
- React 侧状态管理从 facade 文件中解耦；
- hook 可以独立演进，不再与门面层强绑定。

#### 3) 调用方引用切换
将以下文件对 `useAssets` 的引用改为新 hook 文件：

- `equipment-tooling/tabs/furnace-mgmt.tsx`
- `equipment-tooling/tabs/mold-mgmt.tsx`
- `equipment-tooling/hooks/use-dashboard-stats.ts`
- `dashboard/components/system-events.tsx`
- `dashboard/components/analytics.tsx`

结果：
- 所有 `useAssets()` 使用点均已指向新 hook 文件；
- `AssetService` 的 facade 引用保持不变，降低联动风险。

### 本轮说明
- `analytics.tsx` 中原有 `as any` 提示为既有问题，本轮未扩散处理；
- 现有 equipment-tooling / dashboard 页面业务行为保持不变，仅调整 hook 所在位置与职责边界。

### 验证
执行：
```bash
pnpm build
```

结果：通过。

### 本轮结论
本轮完成了 `asset-service.ts` 的最小拆层：

- `AssetService` 保留为无状态 facade；
- `useAssets()` 已迁移为独立 hook；
- 调用方已完成联动切换；
- 在不扩散到底层 service 和页面重写的前提下，职责边界已明显收清。

## P1：DTO 第二阶段第二批整改（`equipment-tooling/services`，2026-04-07）

### 本轮目标
本轮按第二阶段审批稿继续处理 `equipment-tooling/services` 中已明确的 DTO 缺口，仅收口响应校验与类型边界，不修改接口路径与业务状态流。

本轮目标：

- 为炉台、模具借用、模具资产主干读取链路补齐显式 DTO guard；
- 去掉已确认链路中的裸 `any`；
- 对 `mold-service.ts` 仅做最小类型收口，保持现有兼容返回形状不变。

### 已执行变更
更新：
- `src/features/equipment-tooling/services/furnace-service.ts`
- `src/features/equipment-tooling/services/mold-loan-service.ts`
- `src/features/equipment-tooling/services/mold-service.ts`

#### 1) `furnace-service.ts`
- `getFurnaces()`：增加 `ensureArrayResponse<Furnace>(...)`

结果：
- 炉台列表读取不再依赖裸 `apiFetch` 返回值；
- 与其他列表型 service 的 DTO guard 风格保持一致。

#### 2) `mold-loan-service.ts`
- `getLoans()`：增加 `ensureArrayResponse<MoldLoan>(...)`
- `createBorrowRecord()`：移除 `apiFetch<any>`，明确返回 `MoldBorrowRecordResponse`，并增加 `ensureObjectResponse(...)`

结果：
- 模具借用记录列表具备明确数组响应边界；
- 借入聚合接口不再直接返回裸 `any` 结果。

#### 3) `mold-service.ts`
- `getMoldsWithVersion()`：引入 `MoldListResponse`，在保持“数组或对象兼容分支”不变的前提下，收口对象路径的 DTO 类型边界
- `getMoldById()`：增加 `ensureObjectResponse<Mold>(...)`
- `isSnDuplicate()`：增加对象响应校验后再读取 `duplicate`
- `checkLinkIntegrity()`：增加 `ensureObjectResponse(...)`

结果：
- 模具详情、重复检查、链路完整性检查的对象返回都具备显式 guard；
- `getMoldsWithVersion()` 保留现有兼容形状，没有贸然重写为新 DTO 语义，降低了回归风险。

### 本轮说明
- `mold-service.ts` 中存在既有 `console` 语句 lint，本轮未处理，避免将 DTO 整改扩散为日志风格治理；
- `archive-service.ts` 与 `asset-service.ts` 仍待后续函数级核对，不在本轮实施范围内。

### 验证
执行：
```bash
pnpm build
```

结果：通过。

### 本轮结论
本轮完成了 DTO 第二阶段第二批的主干收口：

- 炉台、模具借用、模具资产主链路的 DTO guard 更完整；
- 去除了明确的裸 `any` 返回；
- 保持了模具模块现有兼容返回语义，不做业务层重写。

## P1：DTO 第二阶段第一批整改（`basic-settings/services`，2026-04-07）

### 本轮目标
本轮按已确认的第二阶段审批稿，先处理 `basic-settings/services` 中风险边界最清晰、最适合做 DTO guard 收口的一批文件。

本轮目标：

- 为系统配置、企业配置、线性条码协议、编号服务补齐显式响应校验；
- 保持现有接口路径与 fallback 语义不变；
- 不扩散到 `equipment-tooling/services`。

### 已执行变更
更新：
- `src/features/basic-settings/services/system-config-service.ts`
- `src/features/basic-settings/services/enterprise-service.ts`
- `src/features/basic-settings/services/linear-barcode-protocol-service.ts`
- `src/features/basic-settings/services/numbering-service.ts`

#### 1) `system-config-service.ts`
- `getConfigs()`：增加 `ensureArrayResponse<SystemConfig>(...)`
- `updateConfig()`：增加 `ensureObjectResponse<SystemConfig>(...)`

结果：
- 系统配置列表与保存返回不再直接信任裸 `apiFetch` 结果；
- 与第一阶段已治理模块的 DTO guard 风格对齐。

#### 2) `enterprise-service.ts`
- `getConfig()`：成功路径增加 `ensureObjectResponse<EnterpriseConfig>(...)`
- `saveConfig()`：增加 `ensureObjectResponse<EnterpriseConfig>(...)`
- 保留现有 `404 -> DEFAULT_ENTERPRISE_CONFIG` fallback 语义

结果：
- 企业配置在成功路径具备明确对象响应校验；
- 未改变当前“未配置时回退默认值”的前端兼容策略。

#### 3) `linear-barcode-protocol-service.ts`
- `getConfig()`：成功路径增加 `ensureObjectResponse<LinearBarcodeProtocolConfig>(...)`
- `updateConfig()`：增加 `ensureObjectResponse<LinearBarcodeProtocolConfig>(...)`
- 保留异常 fallback 默认协议配置

结果：
- 协议配置读取与保存具有一致的 DTO 对象边界；
- 不影响当前异常时回退默认配置的语义。

#### 4) `numbering-service.ts`
- `generateNumber()`：先对响应做 `ensureObjectResponse(...)`，再读取 `number` 字段

结果：
- 编号生成链路不再直接读取未校验对象；
- 继续保留现有的错误日志与抛错语义。

### 验证
执行：
```bash
pnpm build
```

结果：通过。

### 本轮结论
本轮完成了 DTO 第二阶段第一批的 `basic-settings/services` 收口：

- 只补显式 DTO guard；
- 不改后端协议与接口路径；
- 不改变既有 fallback 行为；
- 为下一批 `equipment-tooling/services` 整改提供稳定基线。

## P1：DTO 接入缺口第一阶段整改（2026-04-07）

### 本轮目标
本轮根据已确认的 DTO 整改审批稿，先执行高风险与中风险中最明确、最小扩散的一批前端 service 收口工作。

本轮目标：

- 为高风险读取链路补齐显式数组响应校验；
- 为 trading 与 users 模块的 create/read/patch 返回补齐显式对象响应校验；
- 不修改后端 DTO 定义；
- 不重写全局 `apiFetch` 解包机制；
- 不一次性横扫所有 service。

### 已执行变更
更新：
- `src/features/engineering/services/product-service.ts`
- `src/features/warehouse/services/category-service.ts`
- `src/features/trading/services/trading-service.ts`
- `src/features/users/services/user-api.ts`

#### 1) `product-service.ts` 补齐读取链路数组响应校验
- `getProducts()`：从 `apiFetch<any>` + 裸类型断言改为 `ensureArrayResponse<Product>(...)`
- `getProductTypes()`：从 `apiFetch<any>` + 裸类型断言改为 `ensureArrayResponse<ProductType>(...)`

结果：
- 收口产品与产品类型读取链路的 DTO 边界；
- 降低后续再次出现数组/对象响应契约漂移的概率。

#### 2) `category-service.ts` 补齐仓库分类列表读取校验
- `getCategories()`：增加 `ensureArrayResponse<WarehouseCategory>(...)`

结果：
- 仓库分类列表不再直接信任裸 `apiFetch` 返回值；
- 与其他已治理模块的列表读取风格对齐。

#### 3) `trading-service.ts` 统一 create/read/patch 对象响应校验
本轮补齐以下函数的显式对象响应校验：

- `saveCustomer()`
- `patchCustomer()`
- `saveSupplier()`
- `patchSupplier()`
- `getSalesOrderById()`
- `getSalesOrderByNo()`
- `saveSalesOrder()`
- `patchSalesOrder()`
- `patchPurchaseOrder()`
- `savePurchaseOrder()`

结果：
- trading service 内 customer / supplier / order 的 create/read/patch 风格更统一；
- 不改变现有 API 路径与 payload 结构，仅收口 DTO guard。

#### 4) `user-api.ts` 补齐 users 模块 DTO guard
本轮补齐以下函数：

- `fetchUsers()`：增加对象响应校验
- `fetchUserOptions()`：增加数组响应校验
- `createUser()`：增加对象响应校验
- `patchUser()`：增加对象响应校验
- `replaceUser()`：增加对象响应校验

结果：
- users 模块的列表、选项、创建、局部更新、全量替换链路具备一致的响应校验边界；
- 降低用户管理页因响应结构漂移出现运行时异常的风险。

### 本轮未处理项
- `equipment-tooling/services/*.ts`
- `basic-settings/services/*.ts`
- `engineering-db/services/*.ts`
- `finance/services/*.ts`
- `approval/services/*.ts`

这些目录仍属于待二次审计范围，本轮未扩散处理。

### 验证
执行：
```bash
pnpm build
```

结果：通过。

### 本轮结论
本轮完成了 DTO 整改的第一阶段落地：

- 补齐了产品、仓库分类、交易、用户等主干 service 的显式响应校验；
- 没有修改接口语义与后端协议；
- 保持了“先收口 DTO guard，再考虑后续目录级二次审计”的最小扩散策略。

## P0：`/purchase/logistics` 页面 500 修复（2026-04-07）

### 本轮目标
本轮只修复采购物流页当前已定位的两处前端故障，不扩散到采购模块整体重构或全局 store 抽象改造。

目标是消除：

- `/purchase/logistics` 页面初始化 500
- `The result of getSnapshot should be cached to avoid an infinite loop`
- `Maximum update depth exceeded`
- `GET /purchase-orders?status=Approved` 的 404

### 根因结论
本轮确认该页故障由两个前端问题叠加触发：

1. 采购订单查询路径错误
   - 前端请求写成了：`/purchase-orders?status=Approved`
   - 后端真实路由是：`/purchase/orders`
   - 因此前端在弹窗初始化时稳定触发 404。

2. 离线草稿 store 的 `getSnapshot` 不稳定
   - `PurchaseLogisticsPage` 使用 `useSyncExternalStore(...)` 订阅离线草稿。
   - `getPurchaseLogisticsOfflineDraftsSnapshot()` 之前每次都会重新构造数组并返回新引用。
   - 即使 localStorage 数据未变化，React 仍会判定快照变化，最终引发无限更新警告与崩溃。

### 已执行变更
更新：
- `src/features/purchase-logistics/purchase-logistics-dialog.tsx`
- `src/features/purchase-logistics/services/purchase-logistics-offline-draft-service.ts`

调整内容：

#### 1) 修正采购订单查询路径
- 将采购物流弹窗中的采购订单查询从：
  - `/purchase-orders?status=Approved`
- 调整为：
  - `/purchase/orders?status=Approved`

结果：
- 前端请求路径与后端真实采购路由保持一致；
- 消除该页弹窗初始化阶段的错误 404 来源。

#### 2) 为离线草稿订阅增加稳定快照
- 在离线草稿服务中引入模块级 `draftsSnapshot` 缓存；
- `writeDrafts()` 写入后同步更新快照；
- `getPurchaseLogisticsOfflineDraftsSnapshot()` 在数据未变化时返回同一引用，仅在存储内容变化时替换快照。

结果：
- 满足 `useSyncExternalStore` 对稳定 `getSnapshot` 的要求；
- 避免因未变化却返回新数组引用而触发无限更新。

#### 3) 收口采购物流弹窗页自身阻塞 lint
- 将弹窗表单改为本地 `useState` 管理；
- 移除该页对 `useDeltaTracker(... as any)` 的依赖；
- 将关闭弹窗后的表单重置逻辑收口到 `onOpenChange` 回调中。

结果：
- 避免当前页面继续被 `any` 与“不可修改 hook 返回值”的规则阻塞；
- 不扩散到其他页面或全局 hook 实现。

### 验证
执行：
```bash
pnpm build
```

结果：通过。

### 本轮结论
本轮修复的是采购物流页内部两个直接前端根因：

- 错误的采购订单接口路径；
- 不稳定的 `useSyncExternalStore` 快照实现。

修复后，该页应恢复正常打开，并消除当前已定位的无限更新链路。

## P0：MaterialService.getMaterialOptions 响应契约冲突修复（2026-04-07）

### 本轮目标
本轮只修复材料组装页的材料选项加载失败问题，不扩散到后端接口或全局 API 客户端重构。

目标是消除：

- `MaterialService.getMaterialOptions expected an object response`

导致的材料组装页初始化失败。

### 根因结论
本轮确认问题根因不是后端 `/materials?options=true` 返回错误，而是前端内部响应契约冲突：

1. 后端返回：
   - `{ data: Material[], version: string }`
2. 全局 `apiFetch` 会将 `{ data: [] }` 包装自动解包为数组
3. `getMaterialOptions()` 却仍然调用 `ensureObjectResponse(...)`
4. 因此前端在本地把已经解包后的数组误判为非法对象响应，并抛出 `[INVALID_RESPONSE]`

### 已执行变更
更新：
- `src/features/material-archive/services/material-service.ts`

调整内容：
- `getMaterialOptions()` 不再按对象响应处理
- 改为直接按数组响应校验 `apiFetch('/materials?options=true')` 的返回值
- 保持函数对外签名不变，仍返回 `Promise<Material[]>`

结果：
- 与当前 `apiFetch` 的自动解包语义重新对齐
- `MaterialAssemblyManager` 无需联动修改

### 验证
执行：
```bash
pnpm build
```

结果：通过。

### 本轮结论
本轮修复的是前端响应契约漂移，而不是后端接口本身。

修复后，材料选项接口与全局 `apiFetch` 语义保持一致，材料组装页不应再因该 `[INVALID_RESPONSE]` 错误而初始化失败。

## P0：生产部署脚本二阶段优化：默认只重建 `app`，`watchdog` 按需重建（2026-04-07）

### 本轮目标
上一轮已经把生产部署从“默认 fast path”修正成“默认会 build 后端”，解决了前后端版本错位的高风险问题。

但实际执行中发现默认全量 build 会把 `watchdog` 也一并重编译，导致常规发布耗时过长。

因此本轮继续做二阶段优化：

- 默认无参部署改为只重建 `app`
- `watchdog` 只在确有需要时按需重建
- 保留全量重建与快路径，兼顾安全性与效率

### 已执行变更

#### 1) `server/deploy-prod.sh` 新增更细的构建模式
更新：
- `server/deploy-prod.sh`

调整后参数矩阵：

- 默认：
  - `./deploy-prod.sh`
  - 仅重建 `app`
- 全量重建：
  - `./deploy-prod.sh --full-build`
  - 重建 `app + watchdog`
- watchdog 按需重建：
  - `./deploy-prod.sh --watchdog-build`
  - 保持默认服务集运行，并显式重建 `watchdog`
- 快路径：
  - `./deploy-prod.sh --no-build`
  - 不执行镜像重建

实现方式：
- 引入 `BUILD_MODE` 取代单一 `WITH_BUILD` 布尔开关
- 将服务集拆分为：
  - 默认服务集：`db redis app nginx_lb`
  - 全量重建服务集：`db redis app watchdog nginx_lb`
- 日志文案按当前路径分别输出：
  - `default app rebuild path`
  - `--full-build path: app + watchdog`
  - `--watchdog-build path`
  - `--no-build fast path`

结果：
- 默认路径更贴近常规发布习惯，后续可以直接使用；
- 不再要求每次部署都等待 Rust `watchdog` 全量重编译；
- 仍保留显式全量刷新能力。

#### 2) 根目录 `deploy.sh` 同步默认路径语义
更新：
- `deploy.sh`

调整内容：
- 将后端部署阶段提示文案改为：
  - `Run backend deploy script (default app rebuild path)...`

结果：
- 统一入口的提示与新默认行为保持一致；
- 降低运维误判默认仍为全量重建的概率。

### 推荐使用方式

#### 常规生产发布
```bash
cd /var/www/erp/server
./deploy-prod.sh
```

适用场景：
- 大多数 Go 后端变更
- 新增 handler / route / service
- 常规前后端联动发布

#### 需要连同 watchdog 一起刷新
```bash
cd /var/www/erp/server
./deploy-prod.sh --full-build
```

适用场景：
- watchdog 代码有改动
- 需要做完整辅助服务刷新

#### 仅 watchdog 变更
```bash
cd /var/www/erp/server
./deploy-prod.sh --watchdog-build
```

#### 明确确认可以跳过构建
```bash
cd /var/www/erp/server
./deploy-prod.sh --no-build
```

### 验证口径
实施后至少应验证：

1. 默认执行 `./deploy-prod.sh` 时，日志应显示：
   - `Build mode: enabled (default app rebuild path)`
2. `docker compose ps` 中：
   - `app` 创建时间更新
   - `watchdog` 不必每次变化
3. 执行：
   ```bash
   curl -i http://127.0.0.1:8000/api/v1/auth/snapshot
   ```
   默认路径部署后结果不应因旧 `app` 镜像而返回 `404`

### 本轮结论
本轮完成了部署脚本的二阶段优化：

- 默认路径更适合高频使用
- 安全性没有回退
- 重型 `watchdog` 构建改为按需触发

这样下次常规生产发布时，可以优先直接使用默认命令，而不必每次都承担全量 Rust 重编译成本。

## P0：生产部署脚本默认重建后端固化修复（2026-04-07）

### 本轮目标
本轮不改业务代码，而是修补导致生产前后端版本错位的部署脚本默认策略。

目标是把“生产默认可能不重建后端”改为“生产默认重建后端”，避免再次出现：

- 前端已更新
- 后端仍沿用旧镜像
- 新 API / 新路由在线上返回 404

### 根因结论
本轮生产故障已确认高概率根因是部署默认策略问题：

1. 仓库代码中后端已存在 `/api/v1/auth/snapshot`
2. 线上实际请求仍返回 404
3. 部署日志显示：
   - `Build mode: disabled (fast path)`
4. `server-app-*` 容器创建时间停留在数天前

这说明生产部署时，前端已更新，但后端未重建，导致前后端版本错位。

### 已执行变更

#### 1) `server/deploy-prod.sh` 改为默认启用 build
更新：
- `server/deploy-prod.sh`

调整内容：
- 默认值从：
  - `WITH_BUILD=false`
  改为：
  - `WITH_BUILD=true`
- 保留 `--build` 参数兼容
- 新增显式快路径参数：
  - `--no-build`
- 日志文案同步调整：
  - 默认输出为 `Build mode: enabled (default rebuild path)`
  - 显式快路径输出为 `Build mode: disabled (--no-build fast path)`

结果：
- 生产部署默认会重建后端镜像；
- fast path 不再是隐式默认行为。

#### 2) 根目录 `deploy.sh` 最小联动
更新：
- `deploy.sh`

调整内容：
- 后端部署阶段提示文案改为：
  - `Run backend deploy script (default rebuild path)...`

结果：
- 统一入口的语义与新脚本默认行为保持一致；
- 减少运维误判“仍然是老 fast path 逻辑”。

### 线上验证口径
修复后，线上至少应验证：

```bash
cd /var/www/erp/server
./deploy-prod.sh
```

验证点：

1. 部署日志中应看到：
   - `Build mode: enabled (default rebuild path)`
2. `docker compose ps` 中 `server-app-*` 的创建时间应更新
3. 执行：
   ```bash
   curl -i http://127.0.0.1:8000/api/v1/auth/snapshot
   ```
   结果不应再是 `404`
4. 浏览器重新登录后，应不再出现“登录成功但循环回登录页”的现象

### 本轮结论
本轮不是修具体业务，而是修复导致生产版本错位的部署默认策略。

这条修复完成后，生产环境默认将更偏向“慢一点但一致”，避免再次因为忘记 `--build` 触发高优先级线上故障。

## P0：已治理真相边界链路的最小后端回归测试补强（2026-04-07）

### 本轮目标
本轮不继续扩散业务改造，而是给已完成治理的三条链补最小后端自动化护栏，防止后续迭代把前端状态机、前端状态扩散或错误提交流程重新引回。

本轮关注对象：

- `sales-order`
- `shipment`
- `purchase-order`

### 已执行变更

#### 1) 为 `sales-order` 新增最小后端状态规则测试
新增：
- `server/services/sales_order_flow_test.go`

覆盖内容：
- `Pending + all claimed -> InProgress`
- `Canceled` 状态不被普通重算覆盖
- `RecalculateSalesOrderStatusTx(...)` 事务内重算后，持久化主状态更新为正式结果

结果：
- 刚刚后迁到后端的 `sales-order` authoritative status flow 有了第一道自动化护栏。

#### 2) 为 `shipment` 补 commit 拒绝路径测试
更新：
- `server/services/inventory_command_service_test.go`

新增用例：
- `TestCommitShipmentRejectsNonDraftShipment`

覆盖内容：
- 非 `DRAFT` 的 shipment 记录不能再次执行 `CommitShipment(...)`
- 被拒绝后记录状态保持不变

结果：
- shipment 后端 authoritative commit 边界获得最小拒绝路径保护。

#### 3) 复核 `purchase-order` 测试基线，确认当前无需额外补位
复核内容：
- `server/services/purchase_receipt_service_test.go`
- `server/services/purchase_receipt_confirm_service_test.go`
- `server/services/workflow_service_test.go`

结论：
- purchase-order 当前已经覆盖：
  - `Draft / Sent / Awaiting / Received / Canceled` 状态规则
  - workflow 批准后 `Draft -> Sent`
  - receipt 后 `Awaiting / Received`
- 因此本轮不再额外扩散测试补位。

### 验证
执行：
```bash
go test ./services -run "SalesOrder|Shipment|PurchaseOrder"
```

执行目录：
```bash
server/
```

结果：通过。

随后执行：
```bash
pnpm build
```

结果：通过。

### 本轮结论
本轮已为最近完成治理的真相边界补上最小后端回归测试护栏：

- `sales-order`：补了 authoritative status flow 测试
- `shipment`：补了 commit 拒绝路径测试
- `purchase-order`：确认现有测试基线已足以承接本轮清理结果

这意味着当前不仅完成了边界治理本身，也为这些边界建立了第一层自动化防回弹机制。

## P0：`purchase-service.ts` 前端状态扩散清理专项（2026-04-07）

### 本轮目标
本轮针对 `src/features/trading/services/purchase-service.ts` 中残留的前端状态扩散逻辑，做一次小范围真相边界清理。

目标不是发起新的大专项，而是先移除一段已经与后端 authoritative flow 重复定义的前端补丁，验证 purchase-order 链是否已经具备足够的后端承接能力。

### 根因结论

#### 1) 前端残留主表到明细的状态扩散补丁
原实现中：

- `savePurchaseOrder(...)`
  - 当主表状态为 `Canceled / Received` 时，前端会主动执行：
    - `order.lines = order.lines.map(line => ({ ...line, status: targetStatus }))`

这意味着前端并非只提交采购单数据，而是残留了一段“主表状态 -> 明细正式状态”的补丁式派生。

#### 2) purchase-order 的正式状态主干已在后端
本轮复核确认：

- `workflow_document_sync_service.go`
  - 工作流批准后负责 `Draft -> Sent`
- `purchase_order_flow.go`
  - 负责 `Draft / Sent / Awaiting / Received / Canceled` 的正式主状态规则
- `purchase_receipt_confirm_service.go` / `purchase_receipt_service.go`
  - 负责 receipt 确认、`received_qty` 更新与收货后的状态重算

因此 purchase-order 的正式状态流转主干并不在前端，这段前端扩散属于历史残留，应优先清理。

### 已执行变更

#### 1) 移除前端 `Canceled / Received -> lines.status` 扩散
更新：
- `src/features/trading/services/purchase-service.ts`

调整内容：
- 从 `savePurchaseOrder(...)` 删除：
  - `Canceled / Received` 时，将主表状态本地同步到每个 line 的状态扩散逻辑

结果：
- 前端回到“提交采购单数据”的职责；
- 不再本地派生明细正式状态。

#### 2) 清理目标文件中的遗留未使用类型
更新：
- `src/features/trading/services/purchase-service.ts`

调整内容：
- 删除因状态扩散清理后不再使用的 `PurchaseOrderStatus` 类型导入

结果：
- 保证本轮小专项验证不被无关 lint 噪音干扰。

### 验证
执行：
```bash
pnpm build
```

结果：通过。

### 本轮结论
本轮确认了 purchase-order 链当前的问题不是完整前端状态机，而是一段局部前端状态扩散残留。

在移除该补丁后，`pnpm build` 仍通过，说明当前后端 authoritative flow 已足以承接 purchase-order 主状态主干，不需要在本轮追加后端补位。

## P0：`warehouse / shipment` 真相边界后迁专项（2026-04-07）

### 本轮目标
本轮针对 `src/features/warehouse/hooks/use-shipment.ts` 中前端承担库存裁决与状态推进的问题，继续推进真相边界治理。

目标不是让前端继续用本地库存快照和前端 patch 决定提交结果，而是把 shipment 的 commit 主链切回后端 authoritative command。

### 根因结论

#### 1) 前端在 shipment 链中承担了库存裁决
原实现中：

- `submitShipment('COMMITTED')`
  - 当前端发现 `formData.quantity > categoryStock` 时，会直接阻断提交；

这意味着前端把“当前可见库存快照”当成了最终裁决依据。

但对工业 ERP 来说，库存是否足够应由后端事务内校验决定，前端最多只能给出风险提示。

#### 2) 前端在 draft commit 链中直接推进状态
原实现中：

- `commitDraft(...)`
  - 通过 `patchShipment(...)` 直接提交 `status: DRAFT -> COMMITTED`

这意味着前端不是提交“我要 commit 这笔出库”，而是在前端先决定“状态已经切到 COMMITTED 了”。

而仓库中其实已经存在正式后端入口：

- `inventoryService.commitShipment(id)`
- 后端 `CommitShipment(...)`

因此这类前端状态推进属于越界，应切回现有 authoritative command。

### 已执行变更

#### 1) `commitDraft(...)` 切回后端 authoritative command
更新：
- `src/features/warehouse/hooks/use-shipment.ts`

调整内容：
- `commitDraft(...)` 不再调用：
  - `inventoryService.patchShipment(id, { status: { o: 'DRAFT', n: 'COMMITTED' } }, record.version)`
- 改为直接调用：
  - `inventoryService.commitShipment(id)`

结果：
- shipment 的正式 commit 重新回到后端 command 主链；
- 前端不再直接推进 `DRAFT -> COMMITTED` 状态。

#### 2) 前端库存不足判断从最终裁决降级为预警提示
更新：
- `src/features/warehouse/hooks/use-shipment.ts`

调整内容：
- `submitShipment(...)` 中，当 `quantity > categoryStock` 时：
  - 从 `toast.error + return` 的阻断裁决
  - 改为 `toast.warning` 的风险提示

结果：
- 前端仍可基于快照给出操作风险提示；
- 但最终 commit 成败以后端事务内库存校验为准。

#### 3) 复核 `removeRecord(...)` 当前职责边界
复核结果：
- `removeRecord(...)` 当前调用的是：
  - `inventoryService.deleteShipmentRecord(id, approvalId)`
- 其底层已接到后端 `/inventory/shipment/:id/void`

结论：
- 当前这段逻辑主要是基于记录状态切换确认文案与成功提示；
- 不再属于“前端直接推进业务状态”的同类问题；
- 因此本轮保持不扩散修改。

#### 4) 顺手清理目标文件中的遗留弱类型
更新：
- `src/features/warehouse/hooks/use-shipment.ts`

调整内容：
- 将 `setFormData` 兼容 shim 的 `any` 改为显式表单更新联合类型：
  - `ShipmentFormData`
  - `ShipmentFormUpdater`

结果：
- 避免本轮专项被无关弱类型问题污染验证结果。

### 验证
执行：
```bash
pnpm build
```

结果：通过。

### 本轮结论
本轮已将 shipment 链中最明显的两处真相边界问题切回后端 authoritative path：

- 前端不再直接推进 `DRAFT -> COMMITTED`
- 前端不再把库存快照当成最终裁决

这意味着仓库出库链正在进一步回到“前端提交意图、后端负责最终裁决”的工业级分层。

## P0：`trading-service.ts` 前端状态机后迁专项（2026-04-07）

### 本轮目标
本轮针对真相边界体检中识别出的最高风险点，处理 `src/features/trading/services/trading-service.ts` 中前端 service 越界承担销售订单状态机的问题。

目标不是继续让前端“先算状态、后端再兜底”，而是把销售订单主表/明细状态推进与取消/删除语义收口到后端 authoritative path。

### 根因结论

#### 1) 前端 service 已承担销售订单主状态机
`trading-service.ts` 中原本存在以下前端本地业务状态推进：

- `saveSalesOrder(...)`
  - 根据主表状态批量推导明细状态；
- `claimOrderLine(...)`
  - 根据 claim 完成度推进主表状态；
- `updateOrderDelivery(...)`
  - 根据 `deliveredQty` 推进行状态，再进一步推导主表状态；
- `deleteSalesOrder(...)`
  - 在前端决定“取消单据”还是“逻辑删除”。

这意味着前端 service 已从传输层越界成了业务状态机与语义裁决层。

#### 2) 后端已有状态重算内核，但未统一挂到 sales order 主写入链
仓库中实际已经存在：

- `server/services/sales_order_flow.go`
- `server/services/sales_fulfillment_service.go`

其中后端已经具备销售订单主状态重算能力，并且库存出库链也已调用该能力；但 `sales_orders` 的 `save/patch/delete` 主写入路径尚未统一接入这条 authoritative flow。

### 已执行变更

#### 1) 后端补齐 sales order authoritative flow
更新：
- `server/services/sales_order_flow.go`
- `server/services/sales_fulfillment_service.go`
- `server/services/inventory_command_service.go`
- `server/handlers/sales_orders.go`

调整内容：
- 将 claim 完成度纳入后端销售订单状态重算规则：
  - `Pending + all claimed -> InProgress`
- 将事务内状态重算入口正式导出为：
  - `RecalculateSalesOrderStatusTx(...)`
- 该入口现在统一接管：
  - 行状态派生（`Draft` / `Pending` / `InProgress` / `Done` / `Canceled`）
  - 主表状态派生
- `SaveSalesOrderHandler` 与 `PatchSalesOrderHandler` 在明细同步后统一调用后端状态重算
- `DeleteSalesOrderHandler` 接管“取消 vs 删除”语义：
  - 若当前不是 `Canceled`，DELETE 首次转为 `Canceled` 并同步行状态
  - 若已是 `Canceled`，DELETE 再执行逻辑删除
- 出库提交/回滚链同步切换为调用新的导出函数名

结果：
- 销售订单的 authoritative state transition 回到后端；
- sales order 主写入链不再绕开后端状态重算内核。

#### 2) 前端 `trading-service.ts` 去状态机化
更新：
- `src/features/trading/services/trading-service.ts`

调整内容：
- `saveSalesOrder(...)`
  - 移除主表状态向明细状态的本地扩散逻辑
- `deleteSalesOrder(...)`
  - 不再前端决定 cancel/delete 分流，统一直接调用后端 DELETE
- `claimOrderLine(...)`
  - 仅提交 `lines` 字段变化（`claimedBy` / `claimedAt`）
  - 不再本地推进主表状态
- `updateOrderDelivery(...)`
  - 仅提交 `deliveredQty` 变化
  - 不再本地推进行状态和主表状态

结果：
- 前端 service 回到“提交意图 / 字段变化 + 消费 authoritative result”的职责；
- 不再本地跑销售订单主状态机。

#### 3) 顺手收口本轮改造带出的类型/引用问题
调整内容：
- 同步 `inventory_command_service.go` 对导出函数名的调用
- 清理 `trading-service.ts` 中因去状态机产生的未使用 import
- 将 supplier 列表分页元信息的局部读取改为显式局部类型，避免遗留 `any`

### 验证
执行：
```bash
pnpm build
```

结果：通过。

### 本轮结论
本轮已将销售订单链中最典型的一段“前端状态机”后迁到后端 authoritative path：

- 后端负责主表/行状态的正式派生与删除/取消语义
- 前端仅提交字段变化与意图，不再本地裁决最终状态

这标志着真相边界治理已从分析阶段进入实际落地阶段。

## P0：三类共享根因的可复用约束沉淀试点（2026-04-07）

### 本轮目标
在确认三类共享根因之后，本轮不再停留在“修完这次 build”层面，而是做最小可闭环试点，把以下三类问题沉淀成可复用约束：

- 默认值 builder
- 表单子组件字段级 contract
- 第三方 adapter

本轮只做首批试点，不扩散成全仓库重构。

### 已执行变更

#### 1) 默认值 builder / draft factory 首批试点
新增：
- `src/features/engineering/utils/default-builders.ts`

首批承接对象：
- `Product`
- `ProductTemplate`
- `ChangeOrder`
- `ProductProcessRouting`

提供方法：
- `createProductDraft(...)`
- `createProductTemplateDraft(...)`
- `createChangeOrderDraft(...)`
- `createProductRoutingDraft(...)`

已接入位置：
- `src/features/engineering/tabs/change-orders.tsx`
  - `EMPTY_ORDER` 改为复用 `createChangeOrderDraft()`
- `src/features/engineering/tabs/template-mgmt.tsx`
  - 新建模板默认值改为复用 `createProductTemplateDraft()`
- `src/features/engineering/components/product/product-routing-view.tsx`
  - 初始 routing 状态改为复用 `createProductRoutingDraft(...)`

结果：
- `engineering` 域首批默认值来源从“页面裸写”改为“builder 单源”；
- 后续 schema 再演进时，默认字段不必在多个页面重复追补。

#### 2) 表单子组件字段级 contract 首批试点
更新：
- `src/features/engineering/components/product/production-restrictions.tsx`
- `src/features/engineering/components/product-action-dialog.tsx`

调整内容：
- `ProductionRestrictions` 不再接收整份 `UseFormReturn`
- 改为仅接收：
  - `restrictions`
  - `setRestrictions(...)`
- `ProductActionDialog` 在父层负责：
  - `form.watch('restrictions')`
  - `form.setValue('restrictions', ...)`

结果：
- 子组件不再自行窄化整份表单泛型；
- 字段级 contract 模式完成了首个稳定试点。

#### 3) 第三方 adapter 首批试点
新增：
- `src/lib/bwip-renderer.ts`

提供能力：
- `renderBwipBarcode(...)`

更新：
- `src/features/basic-settings/components/dm-preview.tsx`

调整内容：
- `dm-preview.tsx` 不再直接构造 vendor 原始 options；
- 改为只向 `renderBwipBarcode(...)` 传递：
  - `canvas`
  - `code`
  - `type`

结果：
- 业务组件与 `bwip-js` 原始 options 解耦；
- vendor 类型演进风险被收敛到项目内 adapter。

### 验证
执行：
```bash
pnpm build
```

结果：通过。

### 本轮结论
本轮已完成三类共享根因的首批机制化试点：

- 默认值 builder：已在 `engineering` 域建立单源试点
- 表单字段级 contract：已在 `ProductionRestrictions` 链落地
- 第三方 adapter：已在条码/二维码渲染链落地

这意味着当前不仅修复了本次 build 阻塞，也为后续同类问题提供了可复用约束起点。

## P0：`pnpm build` 多点报错的共享根因分析与收口（2026-04-07）

### 本轮目标
本轮目标不是逐条消除新冒出来的 TypeScript 报错，而是先判断这些错误究竟是：

- 多轮迭代后在 `tsc -b` / `pnpm build` 下被集中揭开的历史欠账；
- 还是共享架构边界缺口已经扩散到多个模块。

在确认根因后，再按根因类型分批修复，而不是继续补丁式逐条消红。

### 根因结论

#### 1) schema 演进后，消费层缺少单一事实来源
本轮已经确认，`engineering/data/schema.ts` 中多个实体正式要求 `version`，但以下消费层并没有统一从一个 authoritative builder 出发：

- 页面初始化对象
- 样例常量
- 默认值工厂
- 局部 normalize 逻辑

因此会持续表现为：
- `version` 缺失
- `_v` 残留
- 样例常量推断过窄，后续映射时出现 `never`

这不是单个文件忘记补字段，而是 `schema -> default builder -> sample data -> page state` 没有形成单向收口链。

#### 2) 表单体系缺少统一的泛型 contract
本轮还确认，`react-hook-form + zodResolver + 子组件 form props` 的问题已经不是局部偶发，而是共性模式：

- 父层使用完整领域模型创建 `form`
- 子组件却自行声明更窄的 `UseFormReturn<X>`
- 在 `tsc -b` 下，`watch/control/handleSubmit` 的泛型边界被完整展开后，就会集中报错

因此真正根因不是某个字段名，而是子组件依赖了过宽且不稳定的整份 `form` contract。

#### 3) 第三方库边界未封装
`dm-preview.tsx` 暴露出的问题说明：

- 业务组件直接面向 vendor options 写配置；
- 使用的是经验字段，而不是当前正式类型允许字段；
- 一旦进入严格 build，就会暴露为第三方类型边界不一致。

这说明第三方库缺少本地 adapter / wrapper 收口层。

### 已执行变更

#### 1) 收口 `engineering` 域 `version/_v` 漂移的第一批直接症状
更新：
- `src/features/engineering/components/product/product-routing-view.tsx`
- `src/features/engineering/components/specs/index.ts`
- `src/features/engineering/tabs/template-mgmt.tsx`
- `src/features/engineering/tabs/change-orders.tsx`
- `src/features/engineering/utils/product-form-utils.ts`

调整内容：
- 为 `ProductProcessRouting` 默认对象补齐 `version`
- 为 `INITIAL_TEMPLATES` 补齐 `version`
- 为 `INITIAL_TEMPLATES` 提供正式 `ProductTemplate[]` 类型来源，避免 `as const` 过窄推断
- 为模板新建默认值补齐 `version`
- 将 `ChangeOrder` 与 `Product` 默认值工厂中的 `_v` 正式切回 `version`

结果：
- `engineering` 域围绕 `version/_v` 的第一批 build 阻塞被切断；
- 默认值工厂与样例常量不再继续向页面层传播旧字段。

#### 2) 将 `ProductionRestrictions` 从整份 `form` 依赖改为字段级 contract
更新：
- `src/features/engineering/components/product/production-restrictions.tsx`
- `src/features/engineering/components/product-action-dialog.tsx`

调整内容：
- `ProductionRestrictions` 不再接收整份 `UseFormReturn`
- 改为只接收：
  - `restrictions`
  - `setRestrictions(...)`
- `ProductActionDialog` 改为在父层读取 `form.watch('restrictions')` 并显式回传字段级 setter

结果：
- 子组件不再自行声明更窄的整份表单 contract；
- 表单问题从“泛型协变失败”收口为“字段级数据流”，更符合后续统一策略。

#### 3) 收口 `dm-preview.tsx` 的 vendor options 边界
更新：
- `src/features/basic-settings/components/dm-preview.tsx`

调整内容：
- 移除当前正式 `RenderOptions` 中不存在的字段：
  - `textencoding`
  - `eclevel`
- 保留当前 build 可接受、且不影响主要渲染链的正式配置字段

结果：
- 第三方 `bwip-js` 的 options 使用回到正式类型边界内；
- build 不再因经验字段与正式类型脱节而中断。

### 验证
执行：
```bash
pnpm build
```

结果：通过。

### 本轮结论
本轮已确认：

- 报错批量出现并不只是随机巧合；
- 其上游可归并为三类共享根因：
  - schema consumer 单源缺失
  - form contract 未统一
  - vendor adapter 缺位

同时，本轮已按这三类根因完成第一批收口，并恢复 `pnpm build` 通过。

## P0：`mold-loan` 页面层契约漂移修复（2026-04-07）

### 本轮目标
本轮针对 `src/features/equipment-tooling/tabs/mold-loan-mgmt.tsx` 集中爆出的 TS2339 / TS2322 报错做根因修复。

目标不是把旧字段补回 hook 或 dialog，而是让页面层重新对齐到当前正式契约。

### 根因结论

#### 1) `useMoldLoanMgmt` 已完成新版收口，但页面仍停留在旧消费方式
当前 hook 正式返回的是：
- `isOpen`
- `setIsOpen`
- `mode`
- `currentRow`
- `handleAddClick`
- `handleEditClick`
- `handleDialogSubmit`

但页面仍在解构旧字段：
- `isDialogOpen`
- `setIsDialogOpen`
- `resetDraft`
- `newLoan`
- `setNewLoan`
- `handleCreateRecord`

因此页面层出现一整组“property does not exist”错误。

#### 2) `MoldLoanActionDialog` 已改成正式 props，但页面仍按旧 props 接线
当前 dialog 正式 props 已收口为：
- `isOpen`
- `onOpenChange`
- `initialMode`
- `currentRow`
- `molds`
- `partners`
- `onSubmit`

页面仍在传：
- `mode`
- `onModeChange`
- `newLoan`
- `onLoanChange`

因此继续触发 props 类型断裂。

### 已执行变更

#### 1) 页面层改为消费新版 `useMoldLoanMgmt` 返回契约
更新：
- `src/features/equipment-tooling/tabs/mold-loan-mgmt.tsx`

调整内容：
- 将页面解构从旧字段切到新版正式返回值：
  - `isOpen`
  - `setIsOpen`
  - `currentRow`
  - `handleAddClick`
  - `handleDialogSubmit`
- 工具栏新增入口不再手动 `resetDraft(...) + open dialog`
- 改为直接走 `handleAddClick('LEND')`

结果：
- 页面层不再持有旧草稿驱动接口；
- hook 成为页面层唯一事实来源。

#### 2) 页面层按新版 `MoldLoanActionDialog` 正式 props 接线
更新：
- `src/features/equipment-tooling/tabs/mold-loan-mgmt.tsx`

调整内容：
- 移除旧 props：
  - `mode`
  - `onModeChange`
  - `newLoan`
  - `onLoanChange`
- 改为传递正式 props：
  - `isOpen`
  - `onOpenChange`
  - `initialMode`
  - `currentRow`
  - `molds`
  - `partners`
  - `onSubmit`

结果：
- 页面与 dialog 重新对齐到当前正式边界；
- 不再依赖已废弃的页面草稿接口。

#### 3) 顺带清理目标链中的 ESLint 债务
更新：
- `src/features/equipment-tooling/hooks/use-mold-loan-mgmt.ts`
- `src/features/equipment-tooling/components/mold-loan-action-dialog.tsx`

调整内容：
- `use-mold-loan-mgmt.ts`
  - `onError(error: any)` 改为 `unknown + Error` 兼容读取
- `mold-loan-action-dialog.tsx`
  - 合并重复 `react` import
  - 清理 `any`
  - 将新增态草稿 ID 生成与模式切换整理为更稳定的本地状态/派生模式实现
  - 保持编辑态优先、创建态可切换借出/借入的业务语义不变

### 验证
执行：
```bash
pnpm exec eslint src/features/equipment-tooling/tabs/mold-loan-mgmt.tsx src/features/equipment-tooling/hooks/use-mold-loan-mgmt.ts src/features/equipment-tooling/components/mold-loan-action-dialog.tsx
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
本轮不是回退 hook / dialog 到旧接口，而是把 `mold-loan-mgmt.tsx` 页面层重新接回当前正式契约：

- `useMoldLoanMgmt` 新版返回边界
- `MoldLoanActionDialog` 新版 props 边界

结果是：
- 原截图中的 `mold-loan-mgmt.tsx` 报错链已被根因级切断；
- 目标文件 ESLint 通过；
- `pnpm exec tsc --noEmit` 继续通过。
