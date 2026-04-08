# 变更记录与验证（walkthrough.md）

## 专项：`trading/customer` / `trading/supplier` 主数据 TDO 接入（2026-04-08）

### 本轮目标
在订单域局部事务化后，回到主数据域，优先为 `customer` 与 `supplier` 当前仍以 CRUD + `patch` 为主的编辑链路接入最窄语义的显式 TDO，同时继续保留 `patch` 作为普通混合档案编辑的兜底。

### 本轮实际执行
本轮没有强拆普通档案混合编辑，而是先落地最稳定、最单一的主数据动作：状态变更。

已完成：

- 后端新增 `customer` / `supplier` 状态变更 transaction 服务与 handler；
- 新增路由：`POST /customers/:id/transactions`、`POST /suppliers/:id/transactions`；
- 为 `customer` 补齐了现有前端已依赖但后端缺失的 `PATCH /customers/:id` 兜底链；
- 前端 `customer-service.ts` / `supplier-service.ts` 增加状态变更 transaction 请求；
- 前端 hooks 增加 `statusChangeMutation`；
- `customer-list.tsx` / `supplier-list.tsx` 已在纯 `status` 变更时优先命中显式 transaction；
- `customer-action-dialog.tsx` 增加了最小状态编辑入口，便于触发纯状态事务；
- 若混入其他普通档案字段，仍继续保留在原有 `patch` 链中。

### 本轮边界确认
- 本轮只接入 `customer.status` / `supplier.status` 这类单语义主数据动作；
- 未把 customer / supplier 的普通档案混合编辑强行包装为 transaction；
- `patch` 仍是主数据维护场景的安全兜底；
- 主数据状态校验继续以后端裁决为准，前端不做规则猜测。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run "Customer|Supplier"
```

结果：通过。

### 本轮结论
`trading/customer` / `trading/supplier` 已完成第一批主数据 TDO 接入：

- 主数据状态变更已具备显式 transaction 语义；
- 普通混合档案编辑继续保留在 `patch`，未破坏现有兜底链；
- `customer` 原先缺失的 patch 后端入口也已补齐，现有前端链路恢复闭环。

## 专项：`purchase` 头部第二刀：供应商主体变更事务化（2026-04-08）

### 本轮目标
在已完成 `purchase` 的 `expectedDate` 事务化与三类基础行级事务后，继续压缩采购订单编辑中的 `patchMutation` 承担面，并收口采购订单供应商主体切换这一稳定头部语义。

### 本轮现状复核
本轮进入实现前复核确认到：

- 前端已存在 `ORDER_SUPPLIER_CHANGE` 常量与事务请求封装；
- `use-purchase-orders.ts` 已存在 `supplierChangeMutation`；
- `purchase-order-action-dialog.tsx` 已存在纯 `supplierId` / `supplierName` 变更分流；
- 后端 `purchase_transaction_service.go` 已存在 `PurchaseTransactionIntentSupplierChange` 与 `executePurchaseOrderSupplierChangeTx(...)`；
- 该链路已按版本控制、供应商存在性校验、审计与快照返回完成闭环。

因此本轮无需新增业务代码，重点转为确认当前仓库状态与规划边界一致，并完成验证与文档收口。

### 本轮实际确认结果
- `ORDER_SUPPLIER_CHANGE` 已落地为正式 `purchase` transaction intent；
- 仅当 delta 仅涉及 `supplierId` / `supplierName` 时，采购编辑弹窗才命中 `supplierChangeMutation`；
- 若混入其他头部字段或行级字段，仍继续保留在现有 transaction / `patch` 链中；
- 后端会复用现有供应商数据源校验供应商是否存在，并在必要时回填 `supplierName`；
- 更新后仍返回最新采购订单快照并写入审计日志。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./handlers ./routes ./services -run Purchase
```

结果：通过。

### 本轮结论
本轮确认 `purchase` 头部第二刀——供应商主体变更事务化——已在仓库中落地且验证通过：

- 采购头部供应商主体切换已具备独立 transaction 语义；
- `purchase` 编辑弹窗对纯供应商主体切换与混合编辑的分流边界清晰；
- 当前无需重复补码，可直接视为本轮治理项已完成并已完成验证收尾。

