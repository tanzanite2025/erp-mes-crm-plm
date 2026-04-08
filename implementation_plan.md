# implementation plan

## `customer / supplier`：核心标识字段变更事务化（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `customer / supplier` 第二批主数据 TDO 接入，且验证通过：

1. 后端 `partner_transaction_service.go` 已新增：`CUSTOMER_IDENTITY_CHANGE`、`SUPPLIER_IDENTITY_CHANGE`；
2. transaction payload 已限定为 `code` / `name`；
3. transaction 已复用版本控制、存在性校验、`code` 唯一性校验与审计日志；
4. 前端 `customer-service.ts` / `supplier-service.ts` 已新增 identity transaction 请求；
5. 前端 hooks 已新增 `identityChangeMutation`；
6. `customer-list.tsx` / `supplier-list.tsx` 已在纯 `code` / `name` 变更时优先命中显式 transaction；
7. 混合档案编辑继续保留在现有 `patch` 链中；
8. 验证通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run "Customer|Supplier"`。

## `customer / supplier`：核心标识字段变更事务化（2026-04-08，待确认）

### 一、目标
在已完成 `customer.status` / `supplier.status` 第一批主数据 TDO 接入后，继续推进第二批更高语义密度的主数据动作：主体核心标识字段变更。

本轮目标不是把普通档案编辑全部事务化，而是只挑选真正代表“主体身份识别”的字段建立显式 intent，并保留现有 `patch` 作为普通维护型修改的安全兜底。

### 二、候选字段与语义边界

#### A. `customer`
建议优先只纳入：

1. `code`
2. `name`

理由：

- 二者直接影响客户主体识别、检索、展示与审计语义；
- 相比联系人、电话、邮箱、地址，更容易被稳定表达为单一业务动作；
- 更适合作为显式 transaction intent，而不是继续与普通档案字段混在通用 `patch` 中。

建议 intent 颗粒：

1. `CUSTOMER_IDENTITY_CHANGE`
   - 允许 payload 包含 `code`、`name`
   - 可覆盖纯 `code`、纯 `name`、`code + name` 三类主体标识变更

不纳入本轮：

- `contactPerson`
- `contactPhone`
- `email`
- `address`
- `creditLimit`
- `balance`
- `status`

#### B. `supplier`
建议优先只纳入：

1. `code`
2. `name`

理由：

- 二者直接影响供应商主体识别、搜索命中、下游引用与审计语义；
- 相比分类、联系人、电话、主营产品，更接近稳定的主体身份字段；
- 适合用单一 transaction intent 表达。

建议 intent 颗粒：

1. `SUPPLIER_IDENTITY_CHANGE`
   - 允许 payload 包含 `code`、`name`
   - 可覆盖纯 `code`、纯 `name`、`code + name` 三类主体标识变更

不纳入本轮：

- `category`
- `mainProducts`
- `contactPerson`
- `contactPhone`
- `email`
- `address`
- `rating`
- `status`

### 三、前端分流建议
前端建议只在以下条件命中显式 transaction：

1. 编辑对象已存在；
2. delta 仅包含 `code`、`name`；
3. 不混入其他普通档案字段；
4. 提交时仍携带版本号，由后端负责最终裁决。

其余情况：

- 新建继续走现有 create；
- 混合档案编辑继续保留在 `patch`；
- 前端不新增任何自定义唯一性猜测逻辑。

### 四、后端职责
后端若执行本轮实现，建议承担：

1. 新增 customer / supplier 身份字段变更 transaction service；
2. 明确 payload 只允许 `code`、`name`；
3. 复用现有唯一性校验、存在性校验、乐观锁、审计日志与引用约束；
4. 若 `code` 或 `name` 在下游存在额外联动要求，由后端统一裁决，不前移到前端；
5. 返回最新实体快照，保证前端缓存可直接刷新。

### 五、风险评估
本轮风险高于状态事务化，主要在于：

1. `code` 可能具备唯一性约束；
2. `name` 可能被 UI 检索、打印文案、订单快照或外部同步引用；
3. 若历史单据保存的是冗余快照字段，需确认“改主数据名称”是否允许只影响未来显示；
4. 若 `code` 被外部系统当作对接键，需确认是否允许修改；
5. 若后端当前仅在通用 save / patch 中处理唯一性，需先抽出可复用业务裁决，再接 transaction。

### 六、涉及文件（预估）
- `src/features/trading/customer/services/customer-service.ts`
- `src/features/trading/customer/hooks/use-customer.ts`
- `src/features/trading/supplier/services/supplier-service.ts`
- `src/features/trading/supplier/hooks/use-supplier.ts`
- `src/features/trading/components/customer-list.tsx`
- `src/features/trading/components/supplier-list.tsx`
- `server/services/partner_transaction_service.go`
- `server/handlers/partner_transaction_handlers.go`
- 如需复用唯一性/映射逻辑，可能涉及现有 customer / supplier save/patch 相关文件

### 七、建议确认边界
建议你确认以下边界后再进入代码阶段：

1. 本轮只处理 `customer.code` / `customer.name` / `supplier.code` / `supplier.name`；
2. 纯 `code`、纯 `name`、`code + name` 走显式 transaction；
3. 混入其他字段时继续回落 `patch`；
4. 不新增前端唯一性判断，完全以后端裁决为准；
5. 完成后通过 `pnpm exec tsc --noEmit` 与 `go test ./handlers ./routes ./services -run "Customer|Supplier"` 验证。

## `trading/customer` / `trading/supplier`：主数据 TDO 接入（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `trading/customer` / `trading/supplier` 第一批主数据 TDO 接入，且验证通过：

1. 后端新增 customer / supplier 状态变更 transaction 服务与 handler；
2. 新增交易路由：`POST /customers/:id/transactions`、`POST /suppliers/:id/transactions`；
3. 前端 `customer-service.ts` / `supplier-service.ts` 已新增状态变更 transaction 请求；
4. 前端 hooks 已新增 `statusChangeMutation`；
5. `customer-list.tsx` / `supplier-list.tsx` 已在纯 `status` 变更场景下优先走显式 transaction；
6. `customer-action-dialog.tsx` 已补最小状态编辑入口；
7. 普通 customer / supplier 混合档案编辑仍继续保留在 `patch` 链中；
8. 已补齐 `customer` 原有前端依赖但后端缺失的 `PATCH /customers/:id` 兜底链；
9. 验证通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run "Customer|Supplier"`。

## `trading/customer` / `trading/supplier`：主数据 TDO 接入（2026-04-08，待确认）

### 一、目标
在已完成 `sales` / `purchase` 订单域局部事务化后，优先回到主数据域，补齐 `trading/customer` 与 `trading/supplier` 当前仍以 CRUD + `patch` 为主的编辑链路，为高频、单语义主数据动作建立显式 TDO 入口。

本轮目标：

1. 先盘点 customer / supplier 现有编辑入口、字段与后端裁决能力；
2. 只选择稳定、单语义、可审计的主数据动作建立 transaction intent；
3. 不把普通档案混合编辑强行包装成 transaction；
4. 继续保留 `patch` 作为未覆盖维护场景的安全兜底；
5. 复用后端主数据校验，不由前端猜测启停、唯一性或状态规则。

### 二、现状判断
当前确认到：

1. `trading/customer` 当前主要暴露 `create` / `patch` / `delete`；
2. `trading/supplier` 当前主要暴露 `create` / `patch` / `delete`；
3. 两者前端尚未形成类似 `sales-transaction-service.ts` / `purchase-transaction-service.ts` 的显式 transaction service；
4. 两者当前也未形成编辑弹窗中的纯语义分流规则；
5. 因此这两块是当前全局最明确仍未接稳 TDO 的主数据模块。

### 三、建议方案
建议把本轮拆成两个并行但边界独立的子专项：

#### A. `customer` 主数据 TDO
优先候选动作：

1. 客户主体启停；
2. 客户核心标识字段变更；
3. 客户归档 / 禁用；

约束：

- 仅处理可稳定表达为单一业务动作的场景；
- 若一次编辑混入多个普通档案字段，则继续保留在 `patch`；
- 若后端已存在唯一性、引用关系、禁删限制，必须复用原规则。

#### B. `supplier` 主数据 TDO
优先候选动作：

1. 供应商主体启停；
2. 供应商核心标识字段变更；
3. 供应商归档 / 禁用；

约束：

- 仅处理可稳定表达为单一业务动作的场景；
- 若一次编辑混入多个普通档案字段，则继续保留在 `patch`；
- 若后端已存在唯一性、引用关系、禁删限制，必须复用原规则。

### 四、前后端职责

#### 后端
1. 为 customer / supplier 增补显式 transaction handler 或等价业务入口；
2. 为每个 intent 限定 payload 结构与允许字段；
3. 复用现有存在性、唯一性、启停、引用约束等主数据校验；
4. 写审计日志并返回最新实体快照。

#### 前端
1. 为 customer / supplier 增加独立 transaction service；
2. 在对应 hooks 中补充 mutation；
3. 若存在编辑对话框，则对纯语义动作做显式分流；
4. 普通混合档案编辑继续保留在现有 `patchMutation`。

### 五、涉及文件（预估）
- `src/features/trading/customer/hooks/use-customer.ts`
- `src/features/trading/customer/services/customer-service.ts`
- `src/features/trading/supplier/hooks/use-supplier.ts`
- `src/features/trading/supplier/services/supplier-service.ts`
- `server/handlers/...customer...`
- `server/handlers/...supplier...`
- `server/services/...customer...`
- `server/services/...supplier...`

### 六、风险与注意事项
1. 主数据模块常含唯一性与引用约束，必须先确认后端裁决位置，避免前端自造规则；
2. 不能把普通档案 patch 伪装成 transaction，避免 TDO 退化为空壳；
3. customer / supplier 可能已有被订单、库存、工作流引用的删除限制，本轮必须优先复用已有约束；
4. 若发现后端尚无可复用语义入口，本轮需先补后端裁决，再接前端分流。

### 七、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮优先只做 `trading/customer` 与 `trading/supplier`；
2. 只为单语义、高频主数据动作接入 TDO，不强拆普通混合档案编辑；
3. customer / supplier 的普通维护型混合修改继续保留在 `patch`；
4. 完成后通过 `tsc` 与 `Customer|Supplier` 相关 Go 测试验证，并同步 `walkthrough.md`。

## `purchase` 头部第二刀：供应商主体变更事务化（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已确认 `purchase` 头部第二刀——供应商主体变更事务化——已在当前仓库中落地并验证通过：

1. 前端 `purchase-transaction-service.ts` 已存在 `ORDER_SUPPLIER_CHANGE` 与供应商主体事务请求函数；
2. 前端 `use-purchase-orders.ts` 已存在 `supplierChangeMutation`；
3. `purchase-order-action-dialog.tsx` 已在纯 `supplierId` / `supplierName` 变更场景下优先走显式 transaction；
4. 后端 `purchase_transaction_service.go` 已存在 `PurchaseTransactionIntentSupplierChange` 与 `executePurchaseOrderSupplierChangeTx(...)`；
5. 后端已复用供应商存在性校验、版本控制、审计与快照返回；
6. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Purchase`。

## `purchase` 头部第二刀：供应商主体变更事务化（2026-04-08，待确认）

### 一、目标
在已完成 `purchase` 的 `expectedDate` 事务化与行级三类基础事务后，继续压缩采购订单编辑中的 `patchMutation` 承担面，但本轮只处理一个稳定头部语义：供应商主体切换。

本轮目标：

1. 只处理 `supplierId` / `supplierName` 的纯头部变更；
2. 不并发处理 `expectedDate`、其他头部字段、收货状态或任何行级变更；
3. 继续避免 transaction 退化为 `patch` 包装壳；
4. 保持 `patch` 作为未覆盖编辑的安全兜底。

### 二、建议方案
建议新增更窄语义 intent：

- `ORDER_SUPPLIER_CHANGE`

payload 建议仅承载：

- `supplierId`
- `supplierName`
- `operator`

语义约束为：

1. 只表达采购订单供应商主体切换；
2. 不允许混入其他头部字段修改；
3. 不允许混入任何行级修改；
4. 更新后返回最新采购订单快照并写入审计。

### 三、前后端职责

#### 后端
1. 在 `purchase_transaction_service.go` 中新增 `ORDER_SUPPLIER_CHANGE`；
2. 校验 payload 只包含供应商主体字段；
3. 复用现有供应商数据源完成存在性 / 可用性 / 名称一致性校验（如当前已有）；
4. 更新 `supplier_id` / `supplier_name`；
5. 写入审计日志并返回最新采购订单快照。

#### 前端
1. 在 `purchase-transaction-service.ts` 中新增供应商主体事务请求函数；
2. 在 `use-purchase-orders.ts` 中新增对应 mutation；
3. 在 `purchase-order-action-dialog.tsx` 中新增纯 `supplierId` / `supplierName` 变更分流；
4. 若混入其他字段，则继续保留在现有 transaction / `patchMutation`。

### 四、涉及文件
- `server/services/purchase_transaction_service.go`
- `src/features/trading/purchase/services/purchase-transaction-service.ts`
- `src/features/trading/purchase/hooks/use-purchase-orders.ts`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`

### 五、风险与注意事项
1. 若当前采购编辑中切换供应商会联动其他派生字段，本轮必须避免把附带变化误判为纯供应商主体切换；
2. 若后端当前对供应商停用、删除、名称漂移存在强校验，本轮必须复用现有规则，不得前端猜测；
3. 本轮不得破坏已落地的：
   - `ORDER_DELIVERY_DATE_CHANGE`
   - `ORDER_LINE_CONTENT_CHANGE`
   - `ORDER_LINE_ADD`
   - `ORDER_LINE_REMOVE`
4. `patch` 兜底链路必须保留。

### 六、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮只实现 `purchase` 的供应商主体变更事务化；
2. 仅当 delta 仅包含 `supplierId` / `supplierName` 时，才走该 transaction；
3. 若混入其他头部字段或行级字段，则不进入该 intent；
4. 其余采购订单编辑继续留在现有 transaction / `patch` 链中。

## `sales`：`status` / `statusNote` 联动重构（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `sales` 的 `status` / `statusNote` 联动重构：

1. 已补 `sales` 编辑弹窗中的 `statusNote` 最小编辑入口；
2. 已在 `sales-order-action-dialog.tsx` 中新增 `status` / `statusNote` 组合分流；
3. 当 delta 仅涉及 `status` / `statusNote` 时，统一优先走显式状态 transaction，而不是回落 `patchMutation`；
4. 其中目标状态为 `Canceled` 时继续走 `cancelMutation`，其余状态语义继续走 `statusTransitionMutation`；
5. 详情页状态按钮与编辑弹窗现在共享同一条状态语义主链；
6. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Sales`。

## `sales`：`status` / `statusNote` 联动重构（2026-04-08，待确认）

### 一、目标
在已完成 `sales` 的 `requirements`、`orderName`、`purchaseOrderNo` 事务化后，继续压缩 `sales` 头部 `patchMutation` 的承担面，并梳理 `status` / `statusNote` 当前混合承载的语义边界。

本轮目标：

1. 梳理并收敛 `status` / `statusNote` 的 transaction 语义；
2. 明确“纯状态切换”“纯状态备注修改”“状态与备注同时修改”三类场景的归属；
3. 不并发处理 `orderName`、`purchaseOrderNo`、`requirements`、交期、客户、分类/类型或任何行级变更；
4. 避免详情页状态按钮链路与编辑弹窗保存链路出现语义分叉；
5. 保持 `patch` 作为未覆盖编辑的安全兜底。

### 二、现状判断
当前 `statusNote` 已存在于：

1. 前端 `SalesOrder` schema；
2. 表单默认值与初始化逻辑；
3. 详情展示；
4. 后端 patch 解析；
5. 现有 `ORDER_STATUS_TRANSITION` transaction payload。

进一步确认到：

- 当前后端唯一已落地的状态语义 transaction 是 `ORDER_STATUS_TRANSITION`；
- 详情页状态按钮直接走 `ORDER_STATUS_TRANSITION`；
- 编辑弹窗当前没有对 `status` / `statusNote` 做专门分流，仍可能回落 `patch`；
- 因此本轮重点不是补字段，而是重整状态语义边界与前后端分流规则。

### 三、建议方案
建议按以下语义分层重构：

#### 方案基线
1. `纯 status` 修改：继续走 `ORDER_STATUS_TRANSITION`；
2. `status + statusNote` 同时修改：继续走 `ORDER_STATUS_TRANSITION`；
3. `纯 statusNote` 修改：二选一
   - 方案 A：新增 `ORDER_STATUS_NOTE_CHANGE`，把纯备注修改从 patch 中剥离；
   - 方案 B：仍统一走 `ORDER_STATUS_TRANSITION`，但前端显式分流到该 transaction，而非落回 patch。

#### 当前建议
优先建议 **方案 B**：

1. 保持后端状态语义入口收敛在 `ORDER_STATUS_TRANSITION`；
2. 放宽其语义，使其支持“status 不变但 statusNote 改变”的显式 transaction；
3. 前端编辑弹窗新增 `status` / `statusNote` 识别分流：
   - 纯 `statusNote` 改变时，也走 `statusTransitionMutation`；
   - 同时修改 `status` 与 `statusNote` 时，仍走 `statusTransitionMutation`；
   - 混入其他字段时，不进入本轮链路；
4. 这样可避免新建 `ORDER_STATUS_NOTE_CHANGE` 与现有状态按钮链路产生重复语义。

### 四、前后端职责

#### 后端
1. 在 `sales_transaction_service.go` 中审查并必要时调整 `ORDER_STATUS_TRANSITION` 的 payload 校验与 unchanged 判定；
2. 明确允许“status 不变但 statusNote 变化”的 transaction 语义；
3. 保持 `status_note` 更新、版本控制、审计与快照返回逻辑一致；
4. 如发现现有 `ORDER_STATUS_TRANSITION` 语义无法安全承载纯备注修改，再回退到新增 `ORDER_STATUS_NOTE_CHANGE` 的备选方案。

#### 前端
1. 在 `sales-order-action-dialog.tsx` 中新增 `status` / `statusNote` 的组合分流；
2. 纯 `statusNote` 修改时，优先走显式 transaction，而不是 `patchMutation`；
3. 同时修改 `status` 与 `statusNote` 时，继续走 `statusTransitionMutation`；
4. 复核 `sales-transaction-service.ts` 与 `use-sales-transactions.ts` 是否需要补充更清晰的调用封装；
5. 若混入其他字段，则继续保留在现有 transaction / `patchMutation`。

### 五、涉及文件
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`
- `src/features/trading/components/sales-order-detail.tsx`
- `src/features/trading/components/parts/sales-order-detail-header.tsx`

### 六、风险与注意事项
1. `statusNote` 当前已被现有状态流转 transaction 使用，本轮最核心风险是让详情页按钮链路与编辑弹窗链路出现不同语义；
2. 若引入新 intent，容易与 `ORDER_STATUS_TRANSITION` 重叠，因此优先保持单一状态入口；
3. 本轮必须验证“状态不变、仅备注变化”不会被误判为 unchanged；
4. 本轮不得破坏已落地的：
   - `ORDER_CUSTOMER_CHANGE`
   - `ORDER_CLASSIFICATION_TYPE_CHANGE`
   - `ORDER_DELIVERY_DATE_CHANGE`
   - `ORDER_REQUIREMENTS_CHANGE`
   - `ORDER_NAME_CHANGE`
   - `ORDER_PURCHASE_ORDER_NO_CHANGE`
   - `ORDER_STATUS_TRANSITION`
5. `patch` 兜底链路必须保留。

### 七、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮处理 `sales` 的 `status` / `statusNote` 联动语义重构；
2. 优先保持单一状态 transaction 入口，以 `ORDER_STATUS_TRANSITION` 为核心收敛；
3. 纯 `statusNote` 修改时，不再落回 `patch`，而是走显式状态 transaction；
4. 同时修改 `status` 与 `statusNote` 时，继续走现有状态 transaction；
5. 若混入其他头部字段或行级字段，则不进入本轮重构范围；
6. 其余销售订单编辑继续留在现有 transaction / `patch` 链中。

