# 变更记录与验证（walkthrough.md）

## 2026-04-11 采购合同弹窗接入图片上传并补齐交易订单附件闭环

### 本轮目标

在不重复造轮子的前提下，为 `创建物资采购合同` 弹窗补齐图片上传能力，并避免把销售订单现有“前端有字段、后端未完整落库”的半闭环问题直接复制到采购链路。

本轮目标拆成两部分：

1. 复用现有交易域图片上传组件与上传底座。
2. 同步补齐销售/采购订单的附件字段 contract 与后端持久化链，形成真实闭环。

### 已执行变更

#### 1. 复用现有上传组件，不新增采购专用上传实现

调整：

- `src/features/trading/components/purchase/parts/purchase-order-header-fields.tsx`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
- `src/features/trading/hooks/use-purchase-order-form.ts`

结果：

1. 采购订单表单默认值新增 `evidences: []`。
2. 采购头部表单直接复用现有 `OrderEvidenceManager`。
3. 上传结果回写到 `formData.evidences`，不再只是组件临时状态。
4. 本轮没有复制一份“采购版上传组件”，继续复用现有交易域上传交互。

#### 2. 抽出共享图片展示组件，避免销售/采购详情重复实现

调整：

- 新增 `src/features/trading/components/parts/order-evidence-gallery.tsx`
- 更新 `src/features/trading/components/parts/sales-order-detail-summary.tsx`
- 更新 `src/features/trading/components/purchase/purchase-order-detail.tsx`

结果：

1. 把订单图片展示抽成共享组件。
2. 销售详情改为复用共享展示组件。
3. 采购详情新增图片凭据回显区块。
4. 避免销售/采购各自维护一套几乎相同的图片画廊 UI。

#### 3. 前端销售/采购订单 contract 正式接入附件字段

调整：

- `src/features/trading/data/schema.ts`
- `src/features/trading/sales/contracts/sales-order-api-dto.ts`
- `src/features/trading/sales/adapters/sales-order-api-adapter.ts`
- `src/features/trading/purchase/contracts/purchase-order-api-dto.ts`
- `src/features/trading/purchase/adapters/purchase-order-api-adapter.ts`

结果：

1. `SalesOrder` 与 `PurchaseOrder` 统一使用 `evidences?: OrderEvidence[]`。
2. 销售/采购 API DTO 都新增 `evidences`。
3. sales / purchase adapter 已支持前后端 DTO <-> contract 的 `evidences` 双向透传。

#### 4. 后端销售/采购订单主单补齐附件持久化字段

调整：

- `server/models/trading.go`
- 新增 `server/services/order_evidence.go`
- `server/services/sales_order_dto.go`
- `server/services/purchase_order_dto.go`
- `server/services/sales_order_mapper.go`
- `server/services/purchase_order_mapper.go`
- `server/services/sales_order_command_service.go`
- `server/services/purchase_order_command_service.go`
- `server/services/sales_transaction_service.go`
- `server/services/purchase_transaction_service.go`

结果：

1. 销售订单与采购订单模型均新增 `evidences` JSONB 字段。
2. 新增共享 `OrderEvidencePayload` 与 JSON 编解码 helper。
3. 销售/采购保存 DTO、快照 DTO、响应 DTO、列表 DTO 均已支持 `evidences`。
4. 销售/采购 mapper 已支持 `evidences` 在请求、模型、响应之间转换。
5. 销售/采购 `PATCH` / `ORDER_SAVE` 白名单都已纳入 `evidences`。
6. 采购订单统一保存事务已把 `evidences` 写入更新 map。
7. 销售订单统一保存事务已允许 `evidences` 随主单一起更新。

#### 5. 采购详情文案补齐

调整：

- `src/locales/messages/zh-CN/purchase.ts`
- `src/locales/messages/en-US/purchase.ts`

结果：

1. 新增 `purchase.orders.detailEvidenceTitle` 文案。
2. 采购详情中的图片凭据区块可使用采购域自己的标题，而不是借用销售文案。

### 本轮未做

1. 未重做上传接口路由语义，仍复用现有上传底座。
2. 未把 `evidences` 统一重命名为 `attachments`，本轮优先保证最小闭环落地。
3. 未新增采购专用图片处理、压缩、查重或存储服务。

### 验证

已执行：

- `pnpm exec tsc --noEmit`
- `go test ./handlers ./routes ./services -run ^$`
- `pnpm exec eslint src/features/trading/components/purchase/purchase-order-action-dialog.tsx src/features/trading/components/purchase/parts/purchase-order-header-fields.tsx src/features/trading/components/purchase/purchase-order-detail.tsx src/features/trading/components/parts/sales-order-detail-summary.tsx src/features/trading/components/parts/order-evidence-gallery.tsx src/features/trading/hooks/use-purchase-order-form.ts src/features/trading/data/schema.ts src/features/trading/purchase/contracts/purchase-order-api-dto.ts src/features/trading/purchase/adapters/purchase-order-api-adapter.ts src/features/trading/sales/contracts/sales-order-api-dto.ts src/features/trading/sales/adapters/sales-order-api-adapter.ts`

结果：

1. 前端类型检查通过。
2. 后端 `handlers / routes / services` 定向校验通过。
3. 目标前端文件 `eslint` 退出码为 0。
4. 另：`go test ./... -run ^$` 仍会命中 `server/scripts` 目录已有的重复 `main` 历史问题，不属于本轮交易附件改动直接引入的问题。

### 当前阶段结论

本轮已完成采购合同图片上传的最小闭环改造：

1. 采购弹窗已复用现有订单图片上传组件。
2. 采购订单已具备附件字段的前后端 contract 与持久化链。
3. 采购详情已支持图片凭据回显。
4. 销售订单原有 `evidences` 也同步接入了后端主单持久化链，避免旧的半闭环实现继续扩散。

## 2026-04-11 优先补齐“差一点”的低风险架构对齐项

### 本轮目标

本轮不是做 `purchase / labs / logistics` 的整体重构，而是优先补齐几类**已经接近目标架构、但仍容易因漏审继续扩散**的轻量漏口：

1. `warehouse` 中 service 层残留的副作用边界问题。
2. `logistics` 中最典型的旧式弱边界写法。
3. `print-mgmt` 前端内部仍直接把 `_v` 当领域字段使用的历史兼容壳。

### 已执行变更

#### 1. `warehouse`：移除 service 层跨模块刷新副作用

调整：

- `src/features/warehouse/services/inventory-core-service.ts`
- `src/features/warehouse/services/inventory-transaction-service.ts`
- `src/features/warehouse/services/inventory-maintenance-service.ts`

结果：

1. 删除 `InventoryCoreService.broadcastUpdate()`。
2. 删除 transaction / maintenance service 中对该广播的调用。
3. 现在 `warehouse` service 更符合 `GEMINI.md` 的“只负责请求与协议封装”的边界要求。
4. 查询刷新责任继续留在 Hook / Query 层，而不是下沉到 service。

#### 2. `warehouse`：补齐 Hook 稳定性细节

调整：

- `src/features/warehouse/hooks/use-shipment.ts`
- `src/features/warehouse/hooks/use-report.ts`

结果：

1. `use-shipment.ts` 为 `salesOrders` 增加 `useMemo` 包装，消除 Hook 依赖不稳定告警。
2. `use-report.ts` 合并重复导入，消除 lint 问题。

#### 3. `logistics`：收紧最危险的旧式弱边界

调整：

- `src/features/logistics/services/logistics-service.ts`

结果：

1. `getRecordById()` 不再吞错后返回 `undefined`，改为保持显式失败。
2. 为 `saveRecord()` 引入显式 `SaveLogisticsRecordPayload`，不再继续扩散 `Partial<LogisticsRecord>` 作为 service 保存边界。
3. `getRecords()`、`saveRecord()`、`updateStatus()` 等主链接口增加 `ensureObjectResponse` 校验，减少 service 直传原始 JSON 的旧写法。
4. 本轮未整体重构 `logistics` 为完整 DTO / adapter 域模型，只做最小止血。

#### 4. `print-mgmt`：前端内部版本字段收口到 `version`

调整：

- `src/features/print-mgmt/services/print-record-service.ts`
- `src/features/print-mgmt/tabs/print-records.tsx`

结果：

1. `PrintBatch` 前端内部模型改为使用 `version`，不再把 `_v` 当作前端领域字段直接到处传播。
2. service 层新增 `PrintBatchApiDTO -> PrintBatch` 适配，兼容后端仍返回 `_v` 的现实情况。
3. 激活请求仍向后端发送 `_v`，因此没有破坏现有后端契约。
4. `print-records.tsx` 的消费点已切换到 `selectedBatch.version`。

### 本轮未做

1. 未把 `customer / supplier / sales / purchase` 等仍由后端正式输出 `_v` 的链路强行切到 `version`，避免前后端契约先断裂。
2. 未对 `logistics` 做完整 DTO / adapter / workflow 化改造。
3. 未整体重做 `warehouse` 的大 Hook，只先清理最明显的 service 边界越界点。

### 验证

已执行：

- `pnpm exec eslint src/features/print-mgmt/services/print-record-service.ts src/features/print-mgmt/tabs/print-records.tsx src/features/logistics/services/logistics-service.ts src/features/logistics/hooks/use-logistics.ts src/features/warehouse/services/inventory-core-service.ts src/features/warehouse/services/inventory-transaction-service.ts src/features/warehouse/services/inventory-maintenance-service.ts src/features/warehouse/hooks/use-shipment.ts src/features/warehouse/hooks/use-stock-mgmt.ts src/features/warehouse/hooks/use-report.ts`
- `pnpm exec tsc --noEmit`

结果：

1. 目标前端文件 `eslint` 通过。
2. 前端类型检查通过。

### 当前阶段结论

本轮已完成一批“差一点”的低风险架构补齐：

1. `warehouse` service 去副作用化进一步收口。
2. `logistics` 的最危险弱边界已做最小止血。
3. `print-mgmt` 前端内部 `_v` 历史兼容壳已开始收口到 `version`。
4. 当前未冒进扩大为高风险模块整体重构，符合“先补漏、再大改”的执行策略。

## 2026-04-11 logistics 收敛到 DTO + adapter + service + hook 单一稳定链

### 本轮目标

本轮不是继续对旧 `logistics` 结构打补丁，而是直接把它收敛到一条稳定主链，并且**不保留兼容双轨**。

目标如下：

1. 建立 `data -> contracts -> adapters -> services -> hooks -> components` 的单一前端链路。
2. 退出旧 `types.ts` 对 service / hook / components 的主链地位。
3. 去掉 `Partial<LogisticsRecord>` 作为保存边界。
4. service 只负责请求、DTO 校验与适配映射。
5. hook 只消费 contract，并承接 query invalidation / toast / 错误处理。

### 已执行变更

#### 1. 建立新骨架文件

新增：

- `src/features/logistics/data/schema.ts`
- `src/features/logistics/contracts/logistics-api-dto.ts`
- `src/features/logistics/adapters/logistics-api-adapter.ts`

结果：

1. `data/schema.ts` 成为 logistics 前端领域 contract 的唯一事实源，承载：
   - `LogisticsRecord`
   - `LogisticsEvent`
   - `LogisticsStatus`
   - `LogisticsType`
   - `SaveLogisticsRecordInput`
   - `UpdateLogisticsStatusInput`
2. `contracts/logistics-api-dto.ts` 承载后端 API DTO。
3. `adapters/logistics-api-adapter.ts` 负责 DTO <-> contract 映射，以及显式 command payload 转换。

#### 2. 重写 service

调整：

- `src/features/logistics/services/logistics-service.ts`

结果：

1. service 不再直接以旧 `types.ts` 作为 API 输入/输出主链。
2. 列表、详情、保存、Patch、状态更新统一改为：
   - `apiFetch`
   - `ensureObjectResponse`
   - adapter 映射
3. service 不再承担旧式本地事件拼装逻辑，状态更新 payload 由上层显式构造后传入。

#### 3. 重写 hook

调整：

- `src/features/logistics/hooks/use-logistics.ts`

结果：

1. 删除 `Partial<LogisticsRecord>` 作为 mutation 输入。
2. 保存链路改为显式：
   - `mode: 'create'`
   - `mode: 'patch'`
3. 状态更新 mutation 改为显式输入：
   - `id`
   - `status`
   - `location`
   - `description`
   - `currentVersion`
   - `currentEvents`
4. 由 hook 调用 adapter 生成状态更新 payload，再交给 service 发请求。

#### 4. 切换 components 与 utils 消费链

调整：

- `src/features/logistics/components/logistics-action-dialog.tsx`
- `src/features/logistics/components/logistics-mgmt.tsx`
- `src/features/logistics/components/logistics-timeline.tsx`
- `src/features/logistics/utils/carriers.ts`
- `src/features/logistics/utils/tracking-no.ts`

结果：

1. 组件已统一改为从 `data/schema.ts` 消费 contract、状态枚举与展示常量。
2. `logistics-action-dialog.tsx` 的保存逻辑已改为显式 create / patch mutation 输入。
3. `logistics-mgmt.tsx` 的快速状态更新已显式传入当前 `version` 与 `events`。
4. `utils` 不再依赖旧 `types.ts`。

#### 5. 旧主链退出结果

结果：

1. 当前 `src/features/logistics/` 中已无任何文件继续通过 `../types` 参与主数据链。
2. 当前已无 `Partial<LogisticsRecord>` 与旧 `SaveLogisticsRecordPayload` 继续残留在 logistics 主链中。
3. 原 `src/features/logistics/types.ts` 已完成物理移除，不再只是“退出主链”，而是已经退出目录本身。
4. 这意味着 logistics 当前已经只剩下一条稳定链在被消费。

### 验证

已执行：

- `pnpm exec eslint src/features/logistics/**/*.ts src/features/logistics/**/*.tsx`
- `pnpm exec tsc --noEmit`

结果：

1. `logistics` 目标文件 `eslint` 通过。
2. 前端类型检查通过。

### 当前阶段结论

本轮 `logistics` 已从旧式轻模块形态，收敛为更符合 `GEMINI.md` 的稳定单链结构：

1. 已具备清晰的 `data / contracts / adapters / services / hooks / components` 分层。
2. 旧 `types.ts` 已退出主链。
3. 保存与状态更新边界已从弱类型输入改为显式 command 输入。
4. 本轮没有保留兼容双轨，符合“只允许一条稳定链”的要求。

## 2026-04-11 logistics 低风险整洁化：根导出收口 + 状态更新 payload 命名化

### 本轮目标

在不改动 `logistics` 业务行为、不继续扩大为第二轮重构的前提下，对当前已经稳定的前端结构做一轮小范围整洁化：

1. 增加 feature 根导出文件，收口外部入口。
2. 为状态更新请求 payload 提供明确命名类型，替代 service 中的内联对象类型。

### 已执行变更

#### 1. 根导出收口

新增：

- `src/features/logistics/index.ts`

结果：

1. 当前 `logistics` 已具备统一的 feature 根导出入口。
2. 已导出 `LogisticsMgmt`、hooks 与核心 schema 类型，方便后续外部消费逐步收口。
3. 本轮未批量替换全模块导入路径，保持修改面最小。

#### 2. 状态更新 payload 命名化

调整：

- `src/features/logistics/data/schema.ts`
- `src/features/logistics/services/logistics-service.ts`

结果：

1. 在 `schema.ts` 中新增 `UpdateLogisticsStatusPayload`。
2. `logisticsService.updateStatus` 已改为使用命名类型，而不再直接使用内联对象类型。
3. 字段结构保持不变，未修改接口协议与调用行为。

### 验证

已执行：

- `pnpm exec eslint src/features/logistics/data/schema.ts src/features/logistics/services/logistics-service.ts src/features/logistics/index.ts`
- `pnpm exec tsc --noEmit`

结果：

1. 目标文件 `eslint` 通过。
2. 前端类型检查通过。

### 当前阶段结论

本轮 `logistics` 低风险整洁化已完成：

1. feature 根导出已建立。
2. 状态更新 payload 已具备明确命名类型。
3. 未引入新的结构扩张，也未改变原有业务行为。

## 2026-04-11 customer / supplier 的 `_v` 历史契约收口到 `version`

### 本轮目标

本轮目标不是继续在前端 adapter 里保留 `_v <-> version` 兼容映射，而是把 `customer / supplier` 的前后端正式契约统一收口到 `version`。

### 已执行变更

#### 1. 后端模型与 handler DTO 收口为 `version`

调整：

- `server/models/trading.go`
- `server/handlers/customer_dto.go`
- `server/handlers/supplier_dto.go`
- `server/services/partner_list_dto.go`

结果：

1. `Customer.Version` / `Supplier.Version` 的 JSON tag 已从 `_v` 改为 `version`。
2. `CustomerRequest` / `CustomerResponse` / `BulkSyncCustomerRequest` 已统一改为 `version`。
3. `SupplierResponse` / `BulkSyncSupplierRequest` 已统一改为 `version`。
4. services 层的 `SaveCustomerRequest` / `CustomerResponse` / `SupplierResponse` 也已同步到 `version`，避免 handler 与 service 之间仍残留旧口径。

#### 2. 前端 DTO 与 adapter 收口为 `version`

调整：

- `src/features/trading/customer/contracts/customer-api-dto.ts`
- `src/features/trading/customer/adapters/customer-api-adapter.ts`
- `src/features/trading/supplier/contracts/supplier-api-dto.ts`
- `src/features/trading/supplier/adapters/supplier-api-adapter.ts`

结果：

1. `CustomerApiDTO` / `SupplierApiDTO` 已不再暴露 `_v`，改为只暴露 `version`。
2. `customer / supplier` adapter 不再做 `_v -> version` 与 `version -> _v` 的兼容映射。
3. 当前 `customer / supplier` 的前后端主链都只剩 `version` 一种版本语义。

#### 3. 残留检查结果

结果：

1. 当前 `customer / supplier` 相关后端文件中，已无 `json:"_v"` 残留。
2. 当前 `customer / supplier` 相关前端文件中，已无 `_v` DTO 字段与 adapter 兼容映射残留。
3. `sales / purchase` 仍保留 `_v`，本轮未扩大范围去动它们。

### 验证

已执行：

- `pnpm exec eslint src/features/trading/customer/contracts/customer-api-dto.ts src/features/trading/customer/adapters/customer-api-adapter.ts src/features/trading/supplier/contracts/supplier-api-dto.ts src/features/trading/supplier/adapters/supplier-api-adapter.ts`
- `pnpm exec tsc --noEmit`
- `go test ./handlers ./routes -run "Customer|Supplier"`

结果：

1. 前端目标文件 `eslint` 通过。
2. 前端类型检查通过。
3. 后端 `handlers / routes` 针对 `Customer|Supplier` 的定向测试通过。

### 当前阶段结论

本轮已完成 `customer / supplier` 的 `_v` 历史契约退出：

1. 前后端正式口径已统一为 `version`。
2. 未保留 `_v / version` 双轨兼容壳。
3. 当前 `customer / supplier` 已与前面完成的 `logistics` 一样，进一步靠近统一的稳定版本字段语义。

## 2026-04-11 sales / purchase 的 `_v` 历史契约收口到 `version`

### 本轮目标

本轮目标不是把 `sales / purchase` 扩展为交易域整体重构，而是在保持订单工作流、明细、附件语义不变的前提下，把正式前后端契约中的 `_v` 统一收口到 `version`。

### 已执行变更

#### 1. 后端模型与 DTO 收口为 `version`

调整：

- `server/models/trading.go`
- `server/services/sales_order_dto.go`
- `server/services/purchase_order_dto.go`

结果：

1. `SalesOrder.Version` / `PurchaseOrder.Version` 的 JSON tag 已从 `_v` 改为 `version`。
2. `SaveSalesOrderRequest` / `SalesOrderSnapshotRequest` / `SalesOrderResponse` / `SalesOrderListItemResponse` 已统一改为 `version`。
3. `SavePurchaseOrderRequest` / `PatchPurchaseOrderRequest` / `PurchaseOrderResponse` / `PurchaseOrderListItemResponse` 已统一改为 `version`。
4. 采购确认收货与退货响应链未单独定义版本字段，因此未额外引入改动。

#### 2. 前端 DTO 与 adapter 收口为 `version`

调整：

- `src/features/trading/sales/contracts/sales-order-api-dto.ts`
- `src/features/trading/sales/adapters/sales-order-api-adapter.ts`
- `src/features/trading/purchase/contracts/purchase-order-api-dto.ts`
- `src/features/trading/purchase/adapters/purchase-order-api-adapter.ts`

结果：

1. `SalesOrderApiDTO` / `PurchaseOrderApiDTO` 已不再暴露 `_v`，改为只暴露 `version`。
2. `sales / purchase` adapter 不再做 `_v -> version` 与 `version -> _v` 的兼容映射。
3. 当前销售订单与采购订单的前后端主链都只保留 `version` 一种版本语义。

#### 3. 命令服务 delta 清理逻辑同步收口

调整：

- `server/services/sales_order_command_service.go`
- `server/services/purchase_order_command_service.go`

结果：

1. `buildSalesOrderSaveDelta` 已从删除 `_v` 改为删除 `version`。
2. `buildPurchaseOrderSaveDelta` / `buildPurchaseOrderPatchDelta` 已从删除 `_v` 改为删除 `version`。
3. 避免版本字段在统一更名后错误进入 delta 比较链，保持保存事务语义稳定。

#### 4. 残留检查结果

结果：

1. 当前 `sales / purchase` 相关后端文件中，已无 `json:"_v"` 残留。
2. 当前 `sales / purchase` 相关前端文件中，已无 `_v` DTO 字段与 adapter 兼容映射残留。
3. 当前 `sales / purchase` 命令服务中，已无 `delete(raw, "_v")` 残留。

### 验证

已执行：

- `pnpm exec eslint src/features/trading/sales/contracts/sales-order-api-dto.ts src/features/trading/sales/adapters/sales-order-api-adapter.ts src/features/trading/purchase/contracts/purchase-order-api-dto.ts src/features/trading/purchase/adapters/purchase-order-api-adapter.ts`
- `pnpm exec tsc --noEmit`
- `go test ./handlers ./routes ./services -run "Sales|Purchase"`

结果：

1. 前端目标文件 `eslint` 通过。
2. 前端类型检查通过。
3. 后端定向测试未完全通过，但失败点为既有 SQLite 测试表结构问题：
   - `sales_orders` / `purchase_orders` 缺少 `payment_method` 列
   - 采购事务测试仍存在 `evidences` 列缺失问题
4. 当前失败信息未指向 `_v / version` 契约收口本身。

### 当前阶段结论

本轮已完成 `sales / purchase` 的 `_v` 历史契约退出：

1. 前后端正式口径已统一为 `version`。
2. 未保留 `_v / version` 双轨兼容壳。
3. 命令服务的 delta 清理逻辑也已同步到 `version`。
4. 现阶段剩余的后端测试失败属于既有测试基座问题，不属于本轮版本字段收口回归。

## 2026-04-11 warehouse 第一阶段：拆出 `warehouse-category` 子域模板

### 本轮目标

本轮不是直接重构整个 `warehouse`，而是按已确认的子域拆分规划，先从最独立的 `warehouse-category` 子域开始，建立第一阶段可复用模板。

### 已执行变更

#### 1. 建立独立子域目录

新增：

- `src/features/warehouse/category/data/schema.ts`
- `src/features/warehouse/category/contracts/warehouse-category-api-dto.ts`
- `src/features/warehouse/category/adapters/warehouse-category-api-adapter.ts`
- `src/features/warehouse/category/services/warehouse-category-core-service.ts`
- `src/features/warehouse/category/services/warehouse-category-maintenance-service.ts`
- `src/features/warehouse/category/hooks/use-warehouse-category.ts`
- `src/features/warehouse/category/index.ts`

结果：

1. `WarehouseCategory` / `WarehouseCategoryOption` 已从仓储大 adapter 中抽出独立子域定义。
2. `warehouse-category` 已具备独立的 `data / contracts / adapters / services / hooks` 分层。
3. 当前已形成仓储子域拆分的第一阶段模板。

#### 2. 旧入口收口为兼容转发层

调整：

- `src/features/warehouse/services/warehouse-category-core-service.ts`
- `src/features/warehouse/services/warehouse-category-maintenance-service.ts`
- `src/features/warehouse/hooks/use-warehouse-category.ts`

结果：

1. 旧 `service / hook` 入口未被直接删除，而是改为转发到新子域实现。
2. 现有调用方无需一次性全部迁移，降低第一阶段改动风险。
3. 后续每推进一个子域，都可以沿用“新实现 + 旧入口薄转发”的策略。

#### 3. 少量直接消费方切到新子域

调整：

- `src/features/warehouse/tabs/warehouse-category.tsx`
- `src/features/warehouse/tabs/product-inbound.tsx`
- `src/features/warehouse/hooks/use-stock-mgmt.ts`
- `src/features/warehouse/hooks/use-shipment-bootstrap.ts`
- `src/features/warehouse/hooks/shipment-hook-types.ts`
- `src/features/warehouse/utils/warehouse-category-config.ts`

结果：

1. `warehouse-category` 页面已直接使用新子域入口。
2. `product-inbound`、`stock`、`shipment` 相关少量消费方已切到新子域类型或 service 入口。
3. 当前新子域目录不是“空壳”，而是已经承接实际调用链。

### 验证

已执行：

- `pnpm exec eslint`（目标 `warehouse-category` 新旧相关文件）
- `pnpm exec tsc --noEmit`

结果：

1. 目标文件 `eslint` 通过。
2. 前端类型检查通过。

### 当前阶段结论

`warehouse-category` 第一阶段拆分已完成：

1. 成功从 `warehouse` 大聚合结构中拆出独立子域骨架。
2. 旧入口仍可继续工作，降低了迁移风险。
3. 当前已具备继续推进 `shipment` 或后续子域拆分的模板基础。

## 2026-04-11 warehouse 第二阶段：拆出 `shipment` 子域骨架

### 本轮目标

在 `warehouse-category` 第一阶段模板稳定后，继续推进 `warehouse` 第二阶段，优先把与 `sales / logistics` 耦合最强的 `shipment` 相关领域类型、事务入口与 hooks 收口到独立子域。

### 已执行变更

#### 1. 建立独立子域目录

新增：

- `src/features/warehouse/shipment/data/schema.ts`
- `src/features/warehouse/shipment/contracts/shipment-api-dto.ts`
- `src/features/warehouse/shipment/adapters/shipment-api-adapter.ts`
- `src/features/warehouse/shipment/services/shipment-transaction-service.ts`
- `src/features/warehouse/shipment/hooks/use-shipment.ts`
- `src/features/warehouse/shipment/hooks/use-shipment-bootstrap.ts`
- `src/features/warehouse/shipment/hooks/use-shipment-form-state.ts`
- `src/features/warehouse/shipment/hooks/use-shipment-search.ts`
- `src/features/warehouse/shipment/hooks/use-shipment-inventory-context.ts`
- `src/features/warehouse/shipment/index.ts`

结果：

1. `ShipmentRecord`、`ShipmentStatus`、发货表单状态与发货事务入口已从仓储大模块中抽出独立子域骨架。
2. `shipment` 已具备独立的 `data / contracts / adapters / services / hooks` 分层。
3. 当前 `shipment` 已成为 `warehouse` 第二阶段的真实承接目录，而非空目录。

#### 2. 旧入口收口为兼容转发层

调整：

- `src/features/warehouse/services/inventory-transaction-service.ts`
- `src/features/warehouse/hooks/use-shipment.ts`
- `src/features/warehouse/hooks/use-shipment-bootstrap.ts`
- `src/features/warehouse/hooks/use-shipment-form-state.ts`
- `src/features/warehouse/hooks/use-shipment-search.ts`
- `src/features/warehouse/hooks/use-shipment-inventory-context.ts`
- `src/features/warehouse/hooks/shipment-hook-types.ts`

结果：

1. 旧 `shipment` hooks 与事务入口未被直接删除，而是改为转发或复用新子域实现。
2. `inventory-transaction-service.ts` 仍保留入库能力，同时将发货相关正式入口转给 `ShipmentTransactionService`。
3. 当前迁移仍保持低风险、可回退，不需要一次性改完所有消费方。

### 验证

已执行：

- `pnpm exec eslint`（目标 `shipment` 新旧相关文件）
- `pnpm exec tsc --noEmit`

结果：

1. 目标文件 `eslint` 通过。
2. 前端类型检查通过。

### 当前阶段结论

`shipment` 第二阶段拆分已完成到当前计划范围：

1. 新子域目录已承接核心领域类型、事务入口与 hooks。
2. 旧入口仍可继续工作，降低了迁移成本。
3. 当前尚未大规模搬迁 `shipment` 组件，保持了阶段边界清晰。

## 2026-04-11 warehouse 第二阶段补充：收口 `shipment` UI 消费面

### 本轮目标

在 `shipment` 子域已承接领域类型、事务入口与 hooks 的基础上，继续将 `shipment` 的 UI 消费面收口到 `warehouse/shipment`，但仍保持低风险渐进迁移。

### 已执行变更

#### 1. 建立 `shipment` 子域组件目录

新增：

- `src/features/warehouse/shipment/components/shipment-search.tsx`
- `src/features/warehouse/shipment/components/shipment-history.tsx`
- `src/features/warehouse/shipment/components/shipment-dialog.tsx`

结果：

1. `shipment-search / shipment-history / shipment-dialog` 的真实实现已迁入 `warehouse/shipment/components`。
2. `shipment-dialog.tsx` 已补齐显式 props 类型，不再使用 `any` 作为表单与分类 props。
3. 新组件实现继续复用既有视觉样式与交互，不改 UI 行为。

#### 2. 旧组件入口改为兼容转发层

调整：

- `src/features/warehouse/components/shipment-search.tsx`
- `src/features/warehouse/components/shipment-history.tsx`
- `src/features/warehouse/components/shipment-dialog.tsx`

结果：

1. 旧 `warehouse/components/shipment-*` 入口未被删除，而是转发到新子域组件。
2. 兼容层保留后，后续可继续渐进迁移其余调用点。

#### 3. 页面消费面切换到新子域入口

调整：

- `src/features/warehouse/shipment/index.ts`
- `src/features/warehouse/tabs/product-shipment.tsx`

结果：

1. `shipment/index.ts` 新增组件导出，形成统一子域入口。
2. `product-shipment.tsx` 已改为直接从 `warehouse/shipment` 消费 `useShipment / ShipmentSearch / ShipmentHistory / ShipmentDialog`。
3. 页面层已不再依赖旧平面组件实现细节。

### 验证

已执行：

- `pnpm exec eslint`（目标 `shipment` 组件与 `product-shipment.tsx`）
- `pnpm exec tsc --noEmit`

结果：

1. 目标文件 `eslint` 通过。
2. 前端类型检查通过。

### 当前阶段结论

`shipment` 第二阶段补充收口已完成：

1. `shipment` 子域已同时承接 `data / contracts / adapters / services / hooks / components`。
2. `product-shipment.tsx` 已切到新子域统一入口。
3. 旧 hooks、旧 services、旧 components 仍保留兼容转发层，继续满足低风险迁移要求。

## 2026-04-11 warehouse 第二阶段补充：`shipment` 第二批消费方排查

### 本轮目标

在第一批 UI 消费面迁移完成后，继续排查仓库模块内部是否仍有页面、组件或服务直接引用旧 `shipment` 平面入口，并在存在低风险直接消费方时进行第二批切换。

### 已执行排查

本轮重点检索了以下入口的剩余调用点：

1. 旧 hooks 平面入口：
   - `use-shipment`
   - `use-shipment-bootstrap`
   - `use-shipment-form-state`
   - `use-shipment-search`
   - `use-shipment-inventory-context`
2. 旧组件平面入口：
   - `shipment-search`
   - `shipment-history`
   - `shipment-dialog`
3. 旧事务入口调用：
   - `InventoryTransactionService.recordShipment`
   - `InventoryTransactionService.commitShipment`
4. 绝对路径与别名路径引用：
   - `@/features/warehouse/hooks/use-shipment...`
   - `@/features/warehouse/components/shipment-...`

### 排查结果

1. 未发现仍直接引用旧 `shipment` 组件平面入口的额外页面或组件。
2. 未发现仍直接调用 `InventoryTransactionService.recordShipment` 或 `InventoryTransactionService.commitShipment` 的额外消费方。
3. 未发现通过绝对路径或别名路径继续引用旧 `shipment` hooks / components 平面入口的额外调用点。
4. 当前搜索命中的旧 hooks 文件主要仅剩：
   - 新子域内部的正常相互引用
   - 旧平面兼容转发文件本身

### 结论

本轮未发现新的低风险直接消费方，因此**没有新增业务代码切换**。这说明：

1. `shipment` 当前可见的直接消费面已基本完成收口。
2. 旧平面入口目前主要承担兼容层职责，而非继续被业务页面直接消费。
3. 后续若继续推进，可转向更深层的间接依赖清理，或进入 `inventory` 第三阶段规划。

## 2026-04-11 warehouse 第二阶段补充：`shipment` 间接依赖清理

### 本轮目标

在直接消费面已完成收口后，继续检查 `warehouse` 范围内是否仍有聚合 helper / service / barrel 通过中间层间接依赖旧 `shipment` 兼容链路，并在低风险范围内完成清理。

### 实际命中点

本轮未发现继续通过旧 hooks / 旧组件兼容层进行中间转发的聚合 barrel 或 helper，但发现一类更深层的一跳间接依赖：

1. `src/features/warehouse/hooks/use-report.ts`
2. `src/features/warehouse/components/report-tables.tsx`
3. `src/features/warehouse/services/warehouse-export-service.ts`

这些文件并未直接调用旧 `shipment` hooks / components，但仍通过 `inventory-transaction-service` 间接取得 `ShipmentRecord` 类型。

### 已执行清理

调整如下：

1. `use-report.ts`
   - `InboundRecord` 继续从 `inventory-transaction-service` 获取
   - `ShipmentRecord` 改为直接从 `warehouse/shipment` 子域获取
2. `report-tables.tsx`
   - `ShipmentRecord` 类型改为直接从 `warehouse/shipment` 导入
3. `warehouse-export-service.ts`
   - `ShipmentRecord` 类型改为直接从 `warehouse/shipment` 导入
   - 同时顺手修正本轮新增的 `import type` 问题

结果：

1. 报表链路不再通过聚合事务服务间接拿发货类型。
2. `ShipmentRecord` 的类型来源已更贴近真实子域边界。
3. `InboundRecord` 仍保留原链路，避免本轮扩大修改范围。

### 验证

已执行：

- `pnpm exec eslint src/features/warehouse/hooks/use-report.ts src/features/warehouse/components/report-tables.tsx src/features/warehouse/services/warehouse-export-service.ts`
- `pnpm exec tsc --noEmit`

结果：

1. `tsc --noEmit` 通过。
2. `eslint` 未全绿，但失败项集中于 `warehouse-export-service.ts` 的既有历史问题：
   - `no-console`
   - `@typescript-eslint/no-explicit-any`
3. 这些问题在本轮修改前已存在，本轮未扩大范围去顺手重构导出下载服务实现。

### 当前阶段结论

`shipment` 的一跳间接依赖已进一步收口：

1. 报表相关链路已不再通过 `inventory-transaction-service` 间接持有 `ShipmentRecord` 类型。
2. 当前剩余的历史耦合更偏向共享库存导出/维护服务本身，而不是 `shipment` 子域入口边界。
3. 若继续推进，下一步应单独评估是否处理 `warehouse-export-service.ts` 的历史 lint 与导出职责边界，而不是在本轮顺带扩大重构。

## 2026-04-11 warehouse 第二阶段补充：清理 `warehouse-export-service.ts` 历史 lint

### 本轮目标

在不改变报表导出行为的前提下，单独清理 `warehouse-export-service.ts` 中已暴露出的历史 lint，解决 `console` 与 `any`，并收紧最小必要类型。

### 已执行变更

调整文件：

- `src/features/warehouse/services/warehouse-export-service.ts`

具体变更：

1. 新增 `createLogger('WarehouseExportService')`，替代原有 `console.error`。
2. 为下载环节补充 `WorkbookBufferWriter` 最小接口类型，移除 `download(workbook: any, ...)` 中的 `any`。
3. 保持导出文件名、工作表名称、列结构与下载行为不变。

结果：

1. `warehouse-export-service.ts` 不再包含本轮目标范围内的 `console` 与 `any`。
2. 导出完整性异常与下载失败异常已改为通过项目日志设施上报。
3. 本轮没有扩展到导出基础设施重写，仍保持低风险收口。

### 验证

已执行：

- `pnpm exec eslint src/features/warehouse/services/warehouse-export-service.ts src/features/warehouse/hooks/use-report.ts src/features/warehouse/components/report-tables.tsx`
- `pnpm exec tsc --noEmit`

结果：

1. 定向 `eslint` 通过。
2. 前端类型检查通过。

### 当前阶段结论

`shipment` 子域清理所暴露出的导出服务历史 lint 已完成收口：

1. `warehouse-export-service.ts` 的明显质量问题已被独立收口。
2. 当前 `shipment` 子域拆分相关的直接依赖、间接依赖与导出服务历史 lint 均已处理到当前低风险边界。
3. 后续若继续推进，已更适合切换到 `inventory` 第三阶段规划，而不是继续在 `shipment` 范围内做零散收尾。

## 2026-04-11 warehouse 第三阶段：`inventory` 首批子域拆分落地

### 本轮目标

在 `warehouse-category` 与 `shipment` 已完成拆分和收口后，开始推进 `inventory` 第三阶段，并优先落地共享数据链与基础服务边界，而不是一次性迁移页面组件层。

### 已执行变更

#### 1. 建立 `inventory` 子域骨架

新增：

- `src/features/warehouse/inventory/data/schema.ts`
- `src/features/warehouse/inventory/contracts/inventory-api-dto.ts`
- `src/features/warehouse/inventory/adapters/inventory-api-adapter.ts`
- `src/features/warehouse/inventory/services/inventory-core-service.ts`
- `src/features/warehouse/inventory/services/inventory-maintenance-service.ts`
- `src/features/warehouse/inventory/services/inventory-transaction-service.ts`
- `src/features/warehouse/inventory/index.ts`

结果：

1. `InventoryRecord / InventoryView / MasterDataSearchResult / InboundRecord / InventoryAlertSummary` 已从旧聚合 adapter 中拆出到 `inventory` 子域。
2. `inventory` 已具备独立的 `data / contracts / adapters / services / index` 结构。
3. 第一批迁移仍只聚焦共享数据链与基础服务，没有扩展到 `inventory` 组件层。

#### 2. 旧 `inventory-*` 服务收口为兼容层

调整：

- `src/features/warehouse/services/inventory-core-service.ts`
- `src/features/warehouse/services/inventory-maintenance-service.ts`
- `src/features/warehouse/services/inventory-transaction-service.ts`

结果：

1. 旧 `inventory` 服务入口继续保留，但核心库存基础能力已转发到新 `warehouse/inventory` 子域。
2. `inventory-transaction-service.ts` 继续保持兼容聚合层角色：
   - 入库与库存事务转发到新 `inventory` 子域
   - 发货事务继续转发到 `shipment` 子域
3. `inventory-maintenance-service.ts` 中库存基础维护能力已挂到新 `inventory` 子域，而发货作废与盘点审批相关兼容逻辑暂时保留在旧层。

#### 3. 第一批低风险消费方切换

调整：

- `src/features/warehouse/tabs/product-inbound.tsx`
- `src/features/warehouse/hooks/use-stock-mgmt.ts`
- `src/features/warehouse/hooks/use-report.ts`
- `src/features/warehouse/components/report-tables.tsx`
- `src/features/warehouse/shipment/data/schema.ts`
- `src/features/warehouse/shipment/components/shipment-search.tsx`
- `src/features/warehouse/shipment/components/shipment-history.tsx`
- `src/features/warehouse/shipment/components/shipment-dialog.tsx`
- `src/features/warehouse/shipment/hooks/use-shipment-form-state.ts`
- `src/features/warehouse/shipment/hooks/use-shipment-search.ts`
- `src/features/warehouse/shipment/hooks/use-shipment-inventory-context.ts`
- `src/features/warehouse/shipment/hooks/use-shipment-bootstrap.ts`

结果：

1. 入库页面、库存管理、报表链路与 `shipment` 子域内部的库存基础能力消费，已开始直接指向新 `inventory` 入口。
2. `shipment` 对 `inventory` 的依赖链进一步缩短，不再继续依赖旧 `inventory-*` 平面服务入口。
3. 当前消费方切换仍然保持在低风险范围，未扩大到全量清理。

### 验证

已执行：

- `pnpm exec eslint`（目标 `inventory` 新旧相关文件与第一批切换消费方）
- `pnpm exec tsc --noEmit`

结果：

1. 定向 `eslint` 通过。
2. 前端类型检查通过。

### 当前阶段结论

`inventory` 第三阶段已完成第一批可运行落地：

1. 新 `inventory` 子域目录已经承接核心共享数据链和基础服务。
2. 旧 `inventory-*` 服务已开始退化为兼容转发层。
3. 第一批低风险消费方已切到新 `inventory` 子域入口。
4. 后续可继续推进 `inventory-maintenance-service` 的进一步收口，以及更多消费方切换。

## 2026-04-11 warehouse 第三阶段补充：`inventory-maintenance-service` 继续收口

### 本轮目标

继续按方法粒度检查旧 `inventory-maintenance-service` 的调用点，确认库存基础维护能力是否还有剩余低风险消费方未切到新 `inventory` 子域入口。

### 已执行排查

本轮重点检查了以下方法的调用点：

1. `InventoryMaintenanceService.reconcileInventory`
2. `InventoryMaintenanceService.patchInventory`
3. `InventoryMaintenanceService.setAlertThreshold`
4. `InventoryMaintenanceService.getAlertThresholds`

同时补查了以下兼容职责的剩余调用点：

1. `InventoryMaintenanceService.deleteShipmentRecord`
2. `InventoryMaintenanceService.submitAdjustmentForApproval`

### 排查结果

1. `reconcileInventory / setAlertThreshold / getAlertThresholds` 的低风险消费方已经在上一轮切到新 `inventory` 入口。
2. 本轮未发现新的库存基础维护消费方仍通过旧 `inventory-maintenance-service` 路径访问这些能力。
3. 当前仍保留在旧 `inventory-maintenance-service` 路径上的主要调用点包括：
   - `shipment` 对 `deleteShipmentRecord` 的调用
   - `stocktake` 对 `submitAdjustmentForApproval` 的调用
   - `adjustment-history / adjustment-print` 对调整相关类型与流程的依赖

### 当前阶段结论

`inventory-maintenance-service` 在当前低风险边界下已经基本完成收口：

1. 库存基础维护能力已基本由新 `inventory` 子域承接。
2. 旧 `inventory-maintenance-service` 当前主要保留非库存基础的兼容职责。
3. 若继续推进，下一步应转向：
   - `stocktake` 后续拆分时再处理调整审批与历史链路
   - 或继续扩大 `inventory` 的第二批消费方切换，而不是在当前文件上做过度重排

## 2026-04-11 warehouse 第三阶段补充：`inventory` 第二批消费方切换

### 本轮目标

继续排查仍直接引用旧 `inventory-*` 平面入口的低风险调用点，并按最小范围切到新 `warehouse/inventory` 子域统一入口。

### 已执行排查

本轮重点搜索了以下旧平面入口：

1. `inventory-core-service`
2. `inventory-maintenance-service`
3. `inventory-transaction-service`

### 实际命中点与处理

#### A. 已完成切换的低风险调用点

1. `src/features/warehouse/shipment/hooks/use-shipment.ts`
   - 将 `MasterDataSearchResult` 类型来源切到新 `inventory` 子域入口
   - 保留 `InventoryMaintenanceService.deleteShipmentRecord` 旧兼容层调用不变
2. `src/features/warehouse/components/stock-mgmt-category-section.tsx`
   - 将 `InventoryView` 类型来源切到新 `inventory` 子域入口

#### B. 本轮明确保留在旧兼容层的调用点

1. `shipment` 对 `InventoryMaintenanceService.deleteShipmentRecord` 的调用
2. `stocktake-mgmt.tsx` 对 `InventoryMaintenanceService.submitAdjustmentForApproval` 的调用
3. `adjustment-history.tsx` / `adjustment-print.tsx` 对调整相关类型与流程的依赖

这些调用点仍属于兼容职责或后续 `stocktake` 范围，不适合在本轮低风险消费方切换中直接改动。

### 验证

已执行：

- `pnpm exec eslint src/features/warehouse/shipment/hooks/use-shipment.ts src/features/warehouse/components/stock-mgmt-category-section.tsx`
- `pnpm exec tsc --noEmit`

结果：

1. 定向 `eslint` 通过。
2. 前端类型检查通过。

### 当前阶段结论

`inventory` 第二批消费方切换已完成当前低风险范围：

1. 剩余可直接切换的低风险旧 `inventory-*` 平面入口调用点已进一步减少。
2. 当前保留在旧层的主要是兼容职责，而非库存基础能力消费方。
3. 若继续推进，下一步更适合转向 `stocktake` 子域规划，或再做一次更保守的深层间接依赖排查。

## 2026-04-11 warehouse 第三阶段补充：`inventory` 第一批兜底一致性清理

### 本轮目标

对 `inventory` 第一批拆分后的兜底与过渡层做一致性收口，固定“新入口默认、旧入口兜底”的口径，避免后续继续出现新旧两路混写。

### 已执行排查

本轮重点检查了以下一致性问题：

1. 是否仍有基础类型继续从旧 `inventory-core-service / inventory-transaction-service` 获取
2. 是否存在同时混用新 `../inventory` 与旧 `../services/inventory-*` 的双路写法
3. 是否有本应作为兼容层保留的调用被误判为可切换对象

### 已执行统一

本轮实际统一点：

1. `src/features/warehouse/services/warehouse-export-service.ts`
   - 将 `InboundRecord / MasterDataSearchResult` 的类型来源统一到新 `warehouse/inventory` 入口
   - 不再通过旧 `inventory-core-service / inventory-transaction-service` 获取基础类型

### 当前保留策略

本轮继续明确：

1. 新 `warehouse/inventory` 是库存基础能力与基础类型的默认入口。
2. 旧 `inventory-core-service / inventory-maintenance-service / inventory-transaction-service` 继续仅承担兼容兜底职责。
3. 与发货作废、盘点审批、调整历史相关的旧层调用，仍保留在兼容层，不做误切。

### 验证

已执行：

- `pnpm exec eslint src/features/warehouse/services/warehouse-export-service.ts src/features/warehouse/shipment/hooks/use-shipment.ts src/features/warehouse/components/stock-mgmt-category-section.tsx`
- `pnpm exec tsc --noEmit`

结果：

1. 定向 `eslint` 通过。
2. 前端类型检查通过。

### 当前阶段结论

`inventory` 第一批兜底一致性清理已完成当前低风险范围：

1. 基础类型来源进一步统一到新 `warehouse/inventory` 入口。
2. 旧 `inventory-*` 服务文件的角色已进一步明确为兼容兜底层。
3. 后续新增库存基础能力调用，应默认走新 `warehouse/inventory`，避免再写回双路结构。

## 2026-04-11 实验中心侧边栏收敛为单入口

### 本轮目标

在不改动实验中心页面、TAB 与数据链的前提下，收敛实验中心侧边栏入口，解决以下问题：

1. `实验设备 / 实验测试 / 实验报告` 已经属于同一个实验中心模块，但侧边栏仍以 3 条菜单重复暴露。
2. 导航层级与页面真实结构不一致，导致侧边栏视觉臃肿。
3. 菜单入口与模块内部 TAB 的权限语义边界不够清晰。

### 已执行变更

#### 1. 收敛实验中心侧边栏入口

调整：

- `src/components/layout/data/sidebar-data.ts`

结果：

1. 将实验中心侧边栏从 `实验设备 / 实验测试 / 实验报告` 3 条菜单收敛为 1 条统一入口。
2. 统一入口名称复用现有文案：`实验中心`。
3. 统一入口 URL 改为 `/labs/experimental`。
4. 点击后继续沿用既有根路由重定向逻辑，默认进入 `实验设备` TAB。

#### 2. 保持实验中心内部结构不变

本轮未改动：

1. `src/features/labs/experimental/pages/layout.tsx`
2. `src/features/labs/experimental/tabs.ts`
3. `/labs/experimental/equipment`
4. `/labs/experimental/tests`
5. `/labs/experimental/reports`

结果：

1. 实验中心仍然保持原有 3 个 TAB。
2. 页面内容、数据链、路由结构均未被扩大修改。
3. 本轮仅收敛导航入口，不把导航调整扩大成业务重构。

### 本轮未做

1. 未改动实验中心 3 个 TAB 的页面内容与交互。
2. 未改动实验中心任何接口、service 或状态管理。
3. 未顺手改造 `labs` 域的其他导航或权限实现。

### 验证

已执行：

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/components/layout/data/sidebar-data.ts`

结果：

1. 前端类型检查通过。
2. 目标文件 `eslint` 通过。

### 当前阶段结论

实验中心侧边栏收敛已完成：

1. 侧边栏中的实验中心已从 3 条重复菜单收敛为 1 条统一入口。
2. 点击入口后进入现有实验中心容器，并保留原来的 3 个 TAB。
3. 菜单入口与内部 TAB 的语义边界比改动前更清晰。
4. 本轮未扩大影响到实验中心业务页面与数据链。

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

1. 将 `ProductionLine / ProductionSegment / ProductionJobCategory` 从 `tabs/line-mgmt/types.ts` 迁出，并统一到当前嵌套 `jobCategory.processes` 结构。
2. 将 `ProductionProcessStep` 从 `tabs/work-architecture/components/process-utils.ts` 迁出。
3. 使正式领域类型不再寄生在页面/tabs 目录。

#### 2. 拆分大一统 service

新增：

- `src/features/production-shared/services/production-lines-service.ts`
- `src/features/production-shared/services/production-processes-service.ts`
- `src/features/production-shared/services/production-job-category-capabilities-service.ts`

调整：

- `src/features/production-shared/services/production-resource-service.ts`

结果：

1. 产线资源读写收口到 `productionLinesService`。
2. 工序资源读写收口到 `productionProcessesService`。
3. 岗位 / 工序能力写入收口到 `productionJobCategoryCapabilitiesService`。
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

1. `productionLinesService / productionProcessesService / productionJobCategoryCapabilitiesService` 内部仍直接执行 `window.dispatchEvent(...)`。
2. 第一批消费者仍直接监听裸事件字符串完成刷新。
3. 生产资源更新同步缺少单一协调层，不利于后续接入 React Query invalidation 或更明确的 mutation orchestration。

### 已执行变更

#### 1. 新增统一 sync 协调层

新增：

- `src/features/production-shared/services/production-resource-sync.ts`

作用：

1. 提供 `ProductionResourceKind = 'lines' | 'processes'` typed event 模型。
2. 提供 `productionResourceSync.subscribe(...)` 统一订阅入口。
3. 提供 `emitLinesUpdated() / emitProcessesUpdated()` 单点广播入口，并允许按需控制是否触发 invalidate。
4. 兼容保留旧 `window` 事件桥接，但桥接逻辑已收口到单文件单点。

#### 2. 三类子域 service 去副作用化

调整：

- `src/features/production-shared/services/production-lines-service.ts`
- `src/features/production-shared/services/production-processes-service.ts`
- `src/features/production-shared/services/production-job-category-capabilities-service.ts`

结果：

1. 三类 service 内部已移除 `dispatchEvent`。
2. 三类 service 现在只保留 API 请求、DTO 校验、contract 转换等纯数据职责。
3. 旧事件常量导出改由 `production-resource-sync.ts` 统一承接，再由兼容入口继续导出。

#### 3. 兼容入口事件常量收口

调整：

- `src/features/production-shared/services/production-resource-service.ts`

结果：

1. `PRODUCTION_LINES_UPDATED_EVENT / PRODUCTION_PROCESSES_UPDATED_EVENT` 统一从 sync 层导出。
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

1. 为 `lines / processes` 提供统一读取配置。
2. `queryFn` 继续复用现有纯 service。
3. 读取层正式与第三阶段的 query key 命名约定闭环。

#### 2. 新增最小读取 hooks

新增：

- `src/features/production-shared/hooks/use-production-resources.ts`

作用：

1. 提供：
   - `useProductionLinesQuery()`
   - `useProductionProcessesQuery()`
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

## 2026-04-11 `line-mgmt` 第三阶段：mutation orchestration 抽离到 domain hook

### 本轮目标

在第二阶段 `Query cache + optimistic overlay` 模型稳定后，继续收口 `line-mgmt` 的 mutation orchestration，重点解决以下问题：

1. `line-mgmt/index.tsx` 仍同时持有 Query cache 写回、overlay、toast、sync emit 与错误处理，页面组件职责过重。
2. `LineList` 在 dialog 确认时会提前弹成功 toast，而页面层在服务端成功后又会再弹一次，存在成功提示过早与重复提示风险。
3. `line-mgmt` 成功分支虽然已优先 `setQueryData`，但 `emitLinesUpdated()` 仍会默认触发同一 query 的 invalidate，形成冗余重拉。

### 已执行变更

#### 1. 新增 `line-mgmt` domain hook

新增：

- `src/features/production-shared/tabs/line-mgmt/hooks/use-line-mgmt-lines.ts`

作用：

1. 将 `useProductionLinesQuery()`、overlay 状态、`displayedLines` 组装、create / update / delete mutation orchestration 收口到单一 hook。
2. 统一管理：
   - `pendingCreates`
   - `pendingUpdates`
   - `pendingDeletes`
3. 将 `setQueryData`、成功/失败清理、toast、sync emit 从页面组件中前移到领域 hook。

#### 2. 页面入口降回渲染层

调整：

- `src/features/production-shared/tabs/line-mgmt/index.tsx`

结果：

1. 页面入口现在只负责：
   - `ForbiddenState`
   - loading 态
   - `LineList` 渲染
2. 页面组件不再直接持有 mutation 细节与 overlay 编排。

#### 3. 修正成功 toast 的归位

调整：

- `src/features/production-shared/tabs/line-mgmt/components/line-list.tsx`

结果：

1. `LineList` 不再在 dialog 确认瞬间直接弹 create / update 成功 toast。
2. create / update 成功提示统一改为以服务端成功返回为准。
3. 避免“请求失败但 UI 已先宣布成功”的假象。

#### 4. 为 sync 层补充“跳过 invalidate”能力

调整：

- `src/features/production-shared/services/production-resource-sync.ts`

结果：

1. `productionResourceSync.emit(...)` 新增可选 `invalidate` 开关。
2. `line-mgmt` 在 create / update / delete 成功后，当前改为：
   - 先 `setQueryData`
   - 再 `emitLinesUpdated({ invalidate: false })`
3. 由于当前 line 相关 Query 消费方已经共享同一个 `lines` query cache，`setQueryData(lines)` 已足以同步这些页面，无需立刻对同一 query 再做一次 invalidate。
4. legacy window 兼容广播仍然保留，没有回退到散落事件实现。

### 本轮未做

1. 未扩展 `skip invalidate` 规则到 `process-library-panel` 等其他 mutation 页面。
2. 未对复杂嵌套 patch 场景补充更细的“按需 invalidate”判定规则。
3. 未新增 line-mgmt 自动化测试，仅完成类型与 lint 验证。

### 验证

已执行：

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/production-shared/services/production-resource-sync.ts src/features/production-shared/tabs/line-mgmt/index.tsx src/features/production-shared/tabs/line-mgmt/components/line-list.tsx src/features/production-shared/tabs/line-mgmt/hooks/use-line-mgmt-lines.ts`

结果：

1. `tsc --noEmit` 通过。
2. 本轮目标文件 `eslint` 通过。

### 当前阶段结论

`line-mgmt` 第三阶段 mutation orchestration 收口已完成：

1. 页面组件已从“状态 + 副作用中心”降回渲染入口。
2. create / update / delete 的 optimistic overlay、Query cache 写回与错误清理已收口到独立 domain hook。
3. create / update 成功 toast 已回归服务端确认边界，不再提前宣布成功。
4. `line-mgmt` 已避免对同一 `lines` query 执行默认 `setQueryData + invalidate` 双做。
5. 为下一步继续定义复杂 patch 场景的按需 invalidate 规则，留下了更清晰的挂点。

## 2026-04-11 `line-mgmt` 第四阶段：复杂嵌套 patch 的按需 invalidate 规则

### 本轮目标

在第三阶段 hook 化基础上，继续补齐 `line-mgmt` update 场景里的“按需 invalidate”规则，重点解决以下问题：

1. 当前是否属于复杂 patch，仍主要靠“路径里有没有 `.`”间接判断，无法覆盖顶层结构化字段更新。
2. 拓扑编辑这类更新虽然业务上属于复杂嵌套变更，但实际提交时可能表现为顶层 `segments` 字段整体替换。
3. 若继续把这类更新与简单标量字段一视同仁，就会混淆 optimistic overlay 与成功后重校正边界。

### 已执行变更

#### 1. 将复杂 patch 判定收口为显式规则

调整：

- `src/features/production-shared/tabs/line-mgmt/hooks/use-line-mgmt-lines.ts`

结果：

1. 新增 `isStructuredValue(...)`。
2. 新增 `isComplexLineDeltaEntry(...)`。
3. 新增 `shouldInvalidateAfterUpdate(...)`。
4. 当前 line update 的“复杂 patch”定义为：
   - delta path 含 `.` 的深层路径
   - `o / n` 任一侧为对象或数组等结构化值

#### 2. 让 optimistic overlay 与 invalidate 使用同一判定源

结果：

1. `canApplyOptimisticDelta(...)` 现在改为复用复杂 patch 判定。
2. 简单标量字段更新：
   - 允许 optimistic overlay
   - 成功后默认 `setQueryData`
   - 默认不额外 invalidate
3. 复杂嵌套 patch 更新：
   - 不再走 optimistic overlay
   - 仍先用服务端返回值 `setQueryData`
   - 再通过 `emitLinesUpdated({ invalidate: true })` 触发按需重校正

#### 3. 将 `segments` 这类顶层结构化 patch 纳入规则

结果：

1. 即使 patch 路径本身只是顶层 `segments`，只要值为数组/对象，也会被识别为复杂 patch。
2. 这使拓扑编辑、模板应用、层级增删改等结构化更新不再误落到“简单字段更新”分支。
3. 规则不依赖具体字段名白名单，后续若 line 顶层继续引入结构化字段，也能沿用同一套判定。

### 本轮未做

1. 未把同类按需 invalidate 规则扩展到 `process-library-panel` 等其他资源 mutation。
2. 未对复杂 patch 再做更细的资源级局部 invalidation，当前仍使用 lines 域级重校正。
3. 未新增自动化测试，仅完成类型与 lint 验证。

### 验证

已执行：

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/production-shared/tabs/line-mgmt/hooks/use-line-mgmt-lines.ts`

结果：

1. `tsc --noEmit` 通过。
2. 目标文件 `eslint` 通过。

### 当前阶段结论

`line-mgmt` 复杂嵌套 patch 的按需 invalidate 规则已落地：

1. 简单标量字段更新继续走“overlay + `setQueryData`”的轻量路径。
2. 复杂结构化更新现在会自动切换到“`setQueryData` + 按需 invalidate”路径。
3. `segments` 这类顶层结构化 patch 已不再被误判为简单更新。
4. optimistic overlay 与 invalidate 现在共享同一套复杂度判定来源。
5. 为后续继续把同类规则推广到其他资源域留下了稳定模式。

## 2026-04-11 将同类按需 invalidate 规则推广到 `process-library-panel`

### 本轮目标

将 `line-mgmt` 已建立的“先 `setQueryData`，复杂结构再按需 invalidate”模式推广到 `process-library-panel` 这条 mutation 链，重点解决以下问题：

1. `process-library-panel.tsx` 之前直接在组件内持有 `saveStep / deleteStep / emitProcessesUpdated / toast`，副作用边界分散。
2. 保存成功后总是 `emitProcessesUpdated()`，没有区分是否真的需要再做一次 query 重校正。
3. `process-library-panel` 已经使用 `useProductionProcessesQuery()` 作为主读取入口，但 mutation 成功后还没有正式接入统一的 Query cache patch 策略。

### 已执行变更

#### 1. 新增 process library domain hook

新增：

- `src/features/production-shared/tabs/work-architecture/hooks/use-process-library-processes.ts`

作用：

1. 统一承接：
   - `useProductionProcessesQuery()`
   - `setQueryData(processes)`
   - `saveProcess(...)`
   - `deleteProcess(...)`
2. 将保存/删除成功后的 toast、logger、sync emit 从面板组件中前移到 hook。
3. 让 `process-library-panel` 自身只保留表单、搜索、弹窗与 loading UI。

#### 2. 引入 process 实体级“复杂度判定”

结果：

1. 新增 `shouldInvalidateAfterProcessSave(step)`。
2. 当前规则定义为：只要 process 实体上存在结构化字段值（对象/数组），就视为复杂保存场景。
3. 当前 `process-library-panel` 编辑的字段基本都是标量，因此大多数保存会命中轻量路径。
4. 若后续 process 资源重新引入 `attributes` 等结构化字段，这套规则可直接复用。

#### 3. 保存成功后的同步策略改为显式分流

结果：

1. `saveProcess(...)` 成功后先用返回实体执行 `setQueryData`。
2. 简单 process save：
   - `emitProcessesUpdated({ invalidate: false })`
3. 复杂 process save：
   - `emitProcessesUpdated({ invalidate: true })`
4. 由于当前 process 相关页面已共享同一 `processes` query cache，简单场景无需再立刻重拉同一 query。

#### 4. 删除链路同步接入 Query cache patch

结果：

1. 删除成功后会先从 Query cache 中移除对应 process。
2. 然后再执行 `emitProcessesUpdated({ invalidate: false })`。
3. `process-library-panel` 不再依赖“删除成功后一定整页重拉”来完成当前视图同步。

#### 5. 面板组件降回 UI 编排层

调整：

- `src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx`

结果：

1. 面板组件不再直接调用 `productionProcessesService`。
2. 面板组件不再直接决定何时 `emitProcessesUpdated()`。
3. 当前组件只负责：
   - 搜索过滤
   - 表单状态
   - dialog / delete confirm UI
   - 调用 hook 暴露的 save/delete 动作

### 本轮未做

1. 未将 `process-library-panel` 进一步改造成 optimistic overlay 模式。
2. 未扩展到岗位内部 process mutation 或 mappings 相关链路。
3. 未新增自动化测试，仅完成类型与 lint 验证。

### 验证

已执行：

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx src/features/production-shared/tabs/work-architecture/hooks/use-process-library-processes.ts`

结果：

1. `tsc --noEmit` 通过。
2. 目标文件 `eslint` 通过。

### 当前阶段结论

`process-library-panel` 已接入与 `line-mgmt` 同类的按需 invalidate 规则：

1. process save/delete 已不再把 mutation 副作用散落在面板组件中。
2. 简单 process 保存现在默认走 `setQueryData` 优先路径。
3. 结构化 process 保存已预留“按需 invalidate”分支。
4. 删除链路已改为 `setQueryData + emitProcessesUpdated({ invalidate: false })`。
5. 为后续继续把同类规则推广到岗位 process / mappings 链路留下了稳定模式。

## 2026-04-11 将同类规则推广到岗位内部 process 能力映射 mutation 链

### 本轮目标

继续把同类 cache patch / 按需 invalidate 规则推广到岗位内部 process 编辑链。排查后确认：

1. 当前仓库里还没有独立落地的岗位-process 编辑 UI 组件。
2. 真实的写入链路在 `productionJobCategoryCapabilitiesService.assignProcessCapability()` 与 `removeProcessCapability()`。
3. 这条链路会直接影响 `lines` query 中岗位下嵌套的 `processes`。

### 已执行变更

#### 1. 新增岗位-process capability domain hook

新增：

- `src/features/production-shared/tabs/work-architecture/hooks/use-job-category-process-capabilities.ts`

作用：

1. 提供：
   - `assignProcessCapability(jobCategoryId, processId)`
   - `removeProcessCapability(jobCategoryId, processId)`
2. 统一承接：
   - lines cache patch
   - toast
   - logger
   - `emitLinesUpdated(...)`

#### 2. 明确这条链路属于“跨资源嵌套写入”

结果：

1. 岗位-process 能力分配/移除不会只影响单个平面资源。
2. 它会改岗位->process 的嵌套拓扑展示，并以 `lines` 资源作为前端主视图同步载体。
3. 因此当前默认规则明确为：
   - 先 patch 当前可定位的 `lines` cache
   - 再 `emitLinesUpdated({ invalidate: true })`

#### 3. 本地优先 patch `lines` cache

结果：

1. assign 时会：
   - 若能从 `processes` query cache 解析出完整 process 实体，则补入对应岗位的 `line.segments[*].jobCategories[*].processes`
2. remove 时会：
   - 从目标岗位的嵌套 `processes` 中移除对应 process
3. 这样即使后续仍要 invalidate，当前已加载页面也能先拿到一份即时更新后的本地结果。

#### 4. 对“本地无法完整 patch”的情况显式记录

结果：

1. 若 assign 时找不到：
   - 目标 process 的全局实体
   - 目标岗位在当前 lines cache 中的位置
2. hook 会记录 `warn`，并依赖后续 invalidate 回到服务端最终态。
3. 这避免了静默失败或假装本地 patch 已完整成功。

### 本轮未做

1. 未新增岗位-process 编辑 UI，本轮只先把真实 mutation 链收口成可复用 hook。
2. 未把 `work-architecture` 当前展示层扩展为独立的岗位-process 能力资源读取模型。
3. 未新增自动化测试，仅完成类型与 lint 验证。

### 验证

已执行：

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint src/features/production-shared/tabs/work-architecture/hooks/use-job-category-process-capabilities.ts`

结果：

1. `tsc --noEmit` 通过。
2. 目标文件 `eslint` 通过。

### 当前阶段结论

岗位内部 process 能力映射 mutation 链已具备与前两条链路一致的收口模式：

1. 真实 mutation 边界已从 service 直接调用提升为独立 domain hook。
2. 当前写入被明确归类为跨资源嵌套变更，而不是简单平面更新。
3. hook 会优先 patch `lines` cache，再统一触发 `emitLinesUpdated({ invalidate: true })`。
4. 即时 UI 响应与服务端最终重校正两层边界已经同时具备。
5. 后续若接入岗位-process 编辑 UI，可直接复用这条已收口的 mutation 链。
