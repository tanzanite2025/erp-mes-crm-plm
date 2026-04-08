# implementation plan

## `sales` 头部下一刀：`purchaseOrderNo` 事务化（2026-04-08，待确认）

### 一、目标
在已完成 `sales` 的 `orderName` 编辑入口 + 事务化后，继续压缩 `sales` 头部 `patchMutation` 的承担面，并选择另一个仍直接落回 patch 的稳定单字段切口：`purchaseOrderNo`。

本轮目标：

1. 只处理 `purchaseOrderNo` 的纯头部变更；
2. 不并发处理 `orderName`、`requirements`、交期、客户、分类/类型或任何行级变更；
3. 继续避免 transaction 退化为 patch 包装壳；
4. 保持 `patch` 作为未覆盖编辑的安全兜底。

### 二、建议方案
建议新增更窄语义 intent：

- `ORDER_PURCHASE_ORDER_NO_CHANGE`

payload 建议包含：

- `purchaseOrderNo`
- `operator`

语义约束为：

1. 只表达销售订单客户采购单号更新；
2. 不允许混入其他头部字段修改；
3. 不允许混入任何行级修改；
4. 更新后返回最新销售订单快照并写入审计。

### 三、前后端职责

#### 后端
1. 在 `sales_transaction_service.go` 中新增 `ORDER_PURCHASE_ORDER_NO_CHANGE`；
2. 校验 payload 只包含 `purchaseOrderNo`；
3. 更新 `purchase_order_no`；
4. 写入审计日志并返回最新销售订单快照。

#### 前端
1. 在 `sales-transaction-service.ts` 中新增 `changeSalesOrderPurchaseOrderNo()`；
2. 在 `use-sales-transactions.ts` 中新增对应 mutation；
3. 在 `sales-order-action-dialog.tsx` 中新增纯 `purchaseOrderNo` 分流；
4. 若混入其他字段，则继续保留在现有 transaction / `patchMutation`。

### 四、涉及文件
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`

### 五、风险与注意事项
1. 若 `purchaseOrderNo` 当前有格式约束或与其他字段存在隐性联动，本轮必须先复用现有规则，不得猜测；
2. 本轮不得破坏已落地的：
   - `ORDER_CUSTOMER_CHANGE`
   - `ORDER_CLASSIFICATION_TYPE_CHANGE`
   - `ORDER_DELIVERY_DATE_CHANGE`
   - `ORDER_REQUIREMENTS_CHANGE`
   - `ORDER_NAME_CHANGE`
3. `patch` 兜底链路必须保留。

### 六、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮只实现 `sales` 的 `purchaseOrderNo` 事务化；
2. 仅当 delta 仅包含 `purchaseOrderNo` 时，才走该 transaction；
3. 若混入其他头部字段或行级字段，则不进入该 intent；
4. 其余销售订单编辑继续留在现有 transaction / `patch` 链中。

## `sales` 头部下一刀：`orderName` 编辑入口 + 事务化（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `sales` 头部下一刀：

1. 已补 `sales` 的 `orderName` 最小编辑入口；
2. 后端在 `sales_transaction_service.go` 中新增 `ORDER_NAME_CHANGE`；
3. 前端新增 `orderNameChangeMutation` 与纯 `orderName` 分流；
4. 当且仅当销售订单 delta 仅涉及 `orderName` 时，编辑订单走 `ORDER_NAME_CHANGE`；
5. 若混入其他头部字段或行级字段，则继续保留在现有 `patchMutation` 或其他已落地 transaction 中；
6. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Sales`。

## `sales` 头部下一刀：`orderName` 事务化（2026-04-08，待确认）

### 一、目标
在已完成 `sales` 的 `requirements` 事务化后，继续压缩 `sales` 头部 `patchMutation` 的承担面，并选择另一个仍直接落回 patch 的稳定单字段切口：`orderName`。由于当前 UI 尚无 `orderName` 编辑入口，本轮需先补编辑入口，再接事务链。

本轮目标：

1. 只处理 `orderName` 的纯头部变更；
2. 先补 `orderName` 编辑入口，确保前端能真实产生该 delta；
3. 不并发处理 `requirements`、交期、客户、分类/类型或任何行级变更；
4. 继续避免 transaction 退化为 patch 包装壳；
5. 保持 `patch` 作为未覆盖编辑的安全兜底。

### 二、建议方案
建议新增更窄语义 intent：

- `ORDER_NAME_CHANGE`

payload 建议包含：

- `orderName`
- `operator`

语义约束为：

1. 只表达销售订单名称更新；
2. 不允许混入其他头部字段修改；
3. 不允许混入任何行级修改；
4. 更新后返回最新销售订单快照并写入审计。

### 三、前后端职责

#### 后端
1. 在 `sales_transaction_service.go` 中新增 `ORDER_NAME_CHANGE`；
2. 校验 payload 只包含 `orderName`；
3. 更新 `order_name`；
4. 写入审计日志并返回最新销售订单快照。

#### 前端
1. 在 `OrderHeaderFields` 或等价头部区域新增 `orderName` 编辑输入；
2. 在 `sales-transaction-service.ts` 中新增 `changeSalesOrderName()`；
3. 在 `use-sales-transactions.ts` 中新增对应 mutation；
4. 在 `sales-order-action-dialog.tsx` 中新增纯 `orderName` 分流；
5. 若混入其他字段，则继续保留在现有 transaction / `patchMutation`。

### 四、涉及文件
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`
- `src/features/trading/components/parts/order-header-fields.tsx`

### 五、风险与注意事项
1. 若 `orderName` 当前有派生命名或格式约束，本轮必须先复用现有规则，不得猜测；
2. 新增编辑入口时不得影响现有 header 布局与已落地 transaction 分流；
3. 本轮不得破坏已落地的：
   - `ORDER_CUSTOMER_CHANGE`
   - `ORDER_CLASSIFICATION_TYPE_CHANGE`
   - `ORDER_DELIVERY_DATE_CHANGE`
   - `ORDER_REQUIREMENTS_CHANGE`
4. `patch` 兜底链路必须保留。

### 六、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮只实现 `sales` 的 `orderName` 事务化；
2. 本轮允许先补 `orderName` 编辑入口；
3. 仅当 delta 仅包含 `orderName` 时，才走该 transaction；
4. 若混入其他头部字段或行级字段，则不进入该 intent；
5. 其余销售订单编辑继续留在现有 transaction / `patch` 链中。

## `sales` 头部 patch 压缩本轮切口：`requirements` 事务化（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `sales` 头部 patch 压缩本轮切口：

1. 已确认 `requirements` 为本轮唯一稳定头部字段切口；
2. 后端在 `sales_transaction_service.go` 中新增 `ORDER_REQUIREMENTS_CHANGE`；
3. 前端新增 `requirementsChangeMutation` 与纯 `requirements` 分流；
4. 当且仅当销售订单 delta 仅涉及 `requirements` 时，编辑订单走 `ORDER_REQUIREMENTS_CHANGE`；
5. 若混入其他头部字段或行级字段，则继续保留在现有 `patchMutation` 或其他已落地 transaction 中；
6. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Sales`。

## `sales` 头部 patch 压缩下一稳定切口（2026-04-08，待确认）

### 一、目标
在已完成 `sales` 的客户主体、分类/类型、交期等头部事务后，继续压缩 `sales` 头部 `patchMutation` 的承担面，但本轮只挑一个仍直接落回 `patch` 的稳定字段切口进入实现。

本轮目标：

1. 只选一个 `sales` 头部稳定字段；
2. 不并发实现多个头部新 intent；
3. 不进入 `sales` 行级混合编辑压缩；
4. 保持 `patch` 作为未覆盖编辑的安全兜底。

### 二、选点原则
候选字段需要同时满足：

1. 当前仍直接落回 `patchMutation`；
2. 语义单一、边界清晰；
3. 预期不会联动太多其他字段；
4. 能明显缩小 `sales` 头部 patch 覆盖面；
5. 最好可复用既有 transaction 样板。

### 三、预期输出
本轮规划完成后，需要给出：

1. `sales` 当前仍直落 `patch` 的头部字段候选清单；
2. 唯一推荐切口；
3. 对应 intent 命名建议；
4. 前后端分流条件；
5. 风险与回退策略。

### 四、涉及文件（规划阶段）
- `src/features/trading/components/sales-order-action-dialog.tsx`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `server/services/sales_transaction_service.go`

### 五、风险与注意事项
1. 不得为了压缩 patch 覆盖面而硬拆非稳定头部混合语义；
2. 若候选字段会天然联动多个字段，则应谨慎排除；
3. 不得破坏现有 `ORDER_CUSTOMER_CHANGE`、`ORDER_CLASSIFICATION_TYPE_CHANGE`、`ORDER_DELIVERY_DATE_CHANGE` 等已落地 intent；
4. `patch` 兜底链路必须保留。

### 六、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮只从 `sales` 头部仍直落 `patch` 的字段里挑一个稳定切口；
2. 不并发实现多个新 intent；
3. 不进入 `sales` 行级混合编辑压缩；
4. 其余 `sales` 头部编辑继续保留在现有 `patch` 链中。

## `purchase` 头部第二刀：供应商主体变更事务化（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `purchase` 头部第二刀：

1. 后端在 `purchase_transaction_service.go` 中新增 `ORDER_SUPPLIER_CHANGE`；
2. 前端新增采购供应商主体变更事务请求函数与 `supplierChangeMutation`；
3. 当且仅当采购订单 delta 仅涉及 `supplierId` / `supplierName` 时，编辑订单走 `ORDER_SUPPLIER_CHANGE`；
4. 若混入其他头部字段或行级字段，则继续保留在现有 `patchMutation`；
5. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Purchase`。

## `purchase` 头部第二刀：供应商主体变更事务化（2026-04-08，待确认）

### 一、目标
在已完成 `purchase` 头部 `expectedDate` 事务化与三类基础行级事务化后，继续压缩 `purchase` 的 patch 覆盖面，单独收口采购订单“供应商主体变更”这一稳定头部语义动作。

本轮目标：

1. 只处理 `supplierId` / `supplierName` 的供应商主体变更；
2. 不并发处理 `expectedDate`、其他头部字段或任何行级变更；
3. 继续避免 transaction 退化为 patch 包装壳；
4. 保持 `patch` 作为未覆盖编辑的安全兜底。

### 二、建议方案
建议新增更窄语义 intent：

- `ORDER_SUPPLIER_CHANGE`

payload 建议包含：

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
2. 校验 payload 只包含供应商主体信息；
3. 视当前采购单数据规则，补充供应商存在性或名称一致性校验；
4. 更新 `supplier_id` / `supplier_name`；
5. 写入审计日志并返回最新采购订单快照。

#### 前端
1. 在 `purchase-transaction-service.ts` 中新增 `changePurchaseOrderSupplier()`；
2. 在 `use-purchase-orders.ts` 中新增对应 mutation；
3. 在 `purchase-order-action-dialog.tsx` 中新增纯 `supplierId` / `supplierName` 变更分流；
4. 若混入其他字段，则继续保留在现有 `patchMutation`。

### 四、涉及文件
- `server/services/purchase_transaction_service.go`
- `server/handlers/purchase_transaction_handlers.go`
- `src/features/trading/purchase/services/purchase-transaction-service.ts`
- `src/features/trading/purchase/hooks/use-purchase-orders.ts`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`

### 五、风险与注意事项
1. 若当前前端供应商切换会同步影响其他派生字段，本轮必须避免把附带变化误判为纯供应商主体变更；
2. 若供应商数据需要后端强校验，必须先复用现有 supplier 数据源，不得猜测；
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
4. 其余采购订单编辑继续留在现有 `patch` 链中。

## `sales` / `purchase` patch 兜底压缩专项（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成双域 patch 回退盘点，结论如下：

1. `sales` 当前仍存在两层剩余承担面：
   - `linesChangeMutation`：承接复杂行级混合编辑；
   - `patchMutation`：承接剩余头部未事务化编辑与混合编辑。
2. `purchase` 当前 transaction 已覆盖头部 `expectedDate` 与三类基础行级动作，剩余 `patchMutation` 主要集中在：
   - 头部未事务化字段；
   - 头部+行级混合编辑；
   - 多语义混合行级编辑。
3. 分类判断：
   - 复杂混合编辑继续保留为合理兜底；
   - 双域头部稳定单字段编辑仍值得继续事务化。
4. 唯一优先建议切口：
   - `purchase` 头部第二刀：供应商主体变更事务化。

## `sales` / `purchase` patch 兜底压缩专项（2026-04-08，待确认）

### 一、目标
在 `sales` 与 `purchase` 已形成头部事务 + 行级事务基础骨架后，进入“patch 兜底压缩”阶段，明确双域当前仍落回 `patch` 的真实路径，并判断哪些应继续语义化、哪些应保留为合理兜底。

本轮目标：

1. 不盲目继续新增 intent；
2. 先完成双域 patch 回退路径盘点；
3. 明确每一类 patch 回退的成因、边界与必要性；
4. 仅在分析完成后，选择一个最高价值切口进入下一轮实现。

### 二、专项输出
本轮希望输出三类结论：

1. **双域 patch 回退清单**
   - 哪些 `sales` 编辑仍落回 `patchMutation`
   - 哪些 `purchase` 编辑仍落回 `patchMutation`

2. **分类结论**
   - 合理兜底：混合语义、暂不值得拆分、结构复杂度过高
   - 值得继续事务化：边界清晰、调用频繁、可显著减少 patch 覆盖面

3. **下一轮唯一推荐切口**
   - 只挑一个最高价值回退点进入实现，避免多点并发造成边界漂移

### 三、分析重点

#### `sales`
1. 头部字段是否仍存在未事务化的单字段编辑；
2. 行级混合编辑里是否还有稳定可拆分路径；
3. `ORDER_LINES_CHANGE` 与 `patchMutation` 的剩余承担面是否过大。

#### `purchase`
1. 头部字段除 `expectedDate` 外，还有哪些仍走 `patchMutation`；
2. 行级混合场景是否存在下一个最自然切口；
3. 当前 `patchMutation` 是否承担了本可收敛为单 intent 的稳定路径。

### 四、涉及文件（分析阶段）
- `src/features/trading/components/sales-order-action-dialog.tsx`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/purchase/hooks/use-purchase-orders.ts`
- `server/services/sales_transaction_service.go`
- `server/services/purchase_transaction_service.go`

### 五、风险与注意事项
1. 不得为了压缩 patch 覆盖面而硬拆不稳定语义；
2. 不得删除 `patch` 兜底链路；
3. 若某条回退路径本质上是“混合编辑”，应如实保留为 patch，而不是伪造新 intent；
4. 本轮分析必须基于现有代码逻辑，不依赖猜测。

### 六、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮先做 `sales` / `purchase` 双域 patch 回退盘点；
2. 先不直接并发实现多个新 intent；
3. 仅在盘点完成后，选择一个最高价值回退点进入下一轮；
4. 继续保留 `patch` 作为安全兜底。

## `purchase` 行级事务化第三刀：`ORDER_LINE_REMOVE`（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `purchase` 行级事务化第三刀：

1. 后端在 `purchase_transaction_service.go` 中新增 `ORDER_LINE_REMOVE`；
2. 前端新增采购纯删除行事务请求函数与 `lineRemoveMutation`；
3. 当且仅当采购订单 delta 仅涉及 `lines` / `amount` 且可稳定识别为“纯删除行”时，编辑订单走 `ORDER_LINE_REMOVE`；
4. 若混入既有行内容修改、头部字段或其他结构性变更，则继续保留在现有 `ORDER_LINE_CONTENT_CHANGE` / `ORDER_LINE_ADD` / `patchMutation`；
5. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Purchase`。

## `purchase` 行级事务化第三刀：`ORDER_LINE_REMOVE`（2026-04-08，待确认）

### 一、目标
在已完成 `purchase` 的 `ORDER_LINE_ADD` 基础上，继续复制 `sales` 行级样板，单独收口采购订单“纯删除行”这一语义动作。

本轮目标：

1. 只处理采购订单纯删除行；
2. 不并发处理采购订单行新增；
3. 不把既有行内容修改和删除行混在同一条 intent 中；
4. 继续避免 transaction 退化为整单 patch 包装壳。

### 二、建议方案
建议新增更窄语义 intent：

- `ORDER_LINE_REMOVE`

payload 建议仅包含：

- `lines`
- `operator`

其中：

1. `lines` 仍作为提交后的最新采购行集合快照；
2. 但 intent 语义约束为“相较当前采购订单，仅发生删除行”；
3. 后端负责验证：
   - 原有行中存在被删除目标；
   - 保留行内容未被顺带修改；
   - 不存在新增行；
   - 订单金额由后端重算。

### 三、前后端职责

#### 后端
1. 在 `purchase_transaction_service.go` 中新增 `ORDER_LINE_REMOVE`；
2. 校验本次变更确实属于“仅删除行”；
3. 保留物料完整性校验；
4. 保存剩余行集合；
5. 重算 `amount`；
6. 写入审计日志并返回最新采购订单快照。

#### 前端
1. 在 `purchase-transaction-service.ts` 中新增 `changePurchaseOrderLineRemove()`；
2. 在 `use-purchase-orders.ts` 中新增 `lineRemoveMutation`；
3. 在 `purchase-order-action-dialog.tsx` 中识别“纯删除行”场景，优先走 `lineRemoveMutation`；
4. 若无法稳定识别为“仅删除”，则继续保留在现有 `patchMutation` / `ORDER_LINE_CONTENT_CHANGE` / `ORDER_LINE_ADD` 边界中。

### 四、涉及文件
- `server/services/purchase_transaction_service.go`
- `src/features/trading/purchase/services/purchase-transaction-service.ts`
- `src/features/trading/purchase/hooks/use-purchase-orders.ts`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
- 视需要补充：`src/features/trading/hooks/use-purchase-order-form.ts`

### 五、风险与注意事项
1. 当前采购表单删除行时会重排 `lineNo`，本轮必须只在“纯删除行”场景下分流，避免把结构重排误判成内容修改或新增；
2. 如果前端删除行时同时编辑了既有行内容，本轮不应错误归入 `ORDER_LINE_REMOVE`；
3. 删除行会联动 `amount`，必须明确这是派生聚合字段，而非 intent 真相源；
4. 本轮不得破坏已落地的：
   - `ORDER_DELIVERY_DATE_CHANGE`
   - `ORDER_LINE_CONTENT_CHANGE`
   - `ORDER_LINE_ADD`

### 六、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮只实现 `purchase` 的 `ORDER_LINE_REMOVE`；
2. 仅当可稳定识别为“纯删除行”时，才走该 transaction；
3. 若混入既有行内容修改或头部字段，则不进入该 intent；
4. `ORDER_LINE_ADD` 暂不进入本轮。

## `purchase` 行级事务化第二刀：`ORDER_LINE_ADD`（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `purchase` 行级事务化第二刀：

1. 后端在 `purchase_transaction_service.go` 中新增 `ORDER_LINE_ADD`；
2. 前端新增采购纯新增行事务请求函数与 `lineAddMutation`；
3. 当且仅当采购订单 delta 仅涉及 `lines` / `amount` 且可稳定识别为“纯新增行”时，编辑订单走 `ORDER_LINE_ADD`；
4. 若混入既有行内容修改、头部字段或其他结构性变更，则继续保留在现有 `ORDER_LINE_CONTENT_CHANGE` / `patchMutation`；
5. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Purchase`。

## `purchase` 行级事务化第二刀：`ORDER_LINE_ADD`（2026-04-08，待确认）

### 一、目标
在已完成 `purchase` 的 `ORDER_LINE_CONTENT_CHANGE` 基础上，继续复制 `sales` 行级样板，单独收口采购订单“纯新增行”这一语义动作。

本轮目标：

1. 只处理采购订单纯新增行；
2. 不并发处理采购订单行删除；
3. 不把既有行内容修改和新增行混在同一条 intent 中；
4. 继续避免 transaction 退化为整单 patch 包装壳。

### 二、建议方案
建议新增更窄语义 intent：

- `ORDER_LINE_ADD`

payload 建议仅包含：

- `lines`
- `operator`

其中：

1. `lines` 仍作为提交后的最新采购行集合快照；
2. 但 intent 语义约束为“相较当前采购订单，仅发生新增行”；
3. 后端负责验证：
   - 原有行未被删除；
   - 原有 `lineNo` 集合仍保留；
   - 既有行内容未被顺带修改；
   - 新行数量大于 0；
   - 订单金额由后端重算。

### 三、前后端职责

#### 后端
1. 在 `purchase_transaction_service.go` 中新增 `ORDER_LINE_ADD`；
2. 校验本次变更确实属于“仅新增行”；
3. 保留物料完整性校验；
4. 保存新行集合；
5. 重算 `amount`；
6. 写入审计日志并返回最新采购订单快照。

#### 前端
1. 在 `purchase-transaction-service.ts` 中新增 `changePurchaseOrderLineAdd()`；
2. 在 `use-purchase-orders.ts` 中新增 `lineAddMutation`；
3. 在 `purchase-order-action-dialog.tsx` 中识别“纯新增行”场景，优先走 `lineAddMutation`；
4. 若无法稳定识别为“仅新增”，则继续保留在现有 `patchMutation` / `ORDER_LINE_CONTENT_CHANGE` 边界中。

### 四、涉及文件
- `server/services/purchase_transaction_service.go`
- `src/features/trading/purchase/services/purchase-transaction-service.ts`
- `src/features/trading/purchase/hooks/use-purchase-orders.ts`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
- 视需要补充：`src/features/trading/hooks/use-purchase-order-form.ts`

### 五、风险与注意事项
1. 当前采购表单新增行使用 `lineNo = length + 1`，删除行时还会重排 `lineNo`，本轮必须只收口“纯新增”场景，避免和结构重排混淆；
2. 如果前端新增行时同时编辑了既有行内容，本轮不应错误归入 `ORDER_LINE_ADD`；
3. 新增行会联动 `amount`，必须明确这是派生聚合字段，而非 intent 真相源；
4. 本轮不得破坏已落地的：
   - `ORDER_DELIVERY_DATE_CHANGE`
   - `ORDER_LINE_CONTENT_CHANGE`

### 六、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮只实现 `purchase` 的 `ORDER_LINE_ADD`；
2. 仅当可稳定识别为“纯新增行”时，才走该 transaction；
3. 若混入既有行内容修改或头部字段，则不进入该 intent；
4. `ORDER_LINE_REMOVE` 暂不进入本轮。

## `purchase` 行级事务化第一刀：`ORDER_LINE_CONTENT_CHANGE`（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `purchase` 行级事务化第一刀：

1. 后端在 `purchase_transaction_service.go` 中新增 `ORDER_LINE_CONTENT_CHANGE`；
2. 前端新增采购行内容事务请求函数与 `lineContentChangeMutation`；
3. 当且仅当采购订单 delta 仅涉及 `lines` / `amount` 且无增删时，编辑订单走 `ORDER_LINE_CONTENT_CHANGE`；
4. 若混入头部字段或结构性行变更，则继续保留在现有 `patchMutation`；
5. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Purchase`。

## `purchase` 行级事务化第一刀：`ORDER_LINE_CONTENT_CHANGE`（2026-04-08，待确认）

### 一、目标
在已完成 `purchase` 头部 `expectedDate` 事务化的基础上，继续复制 `sales` 样板，单独收口采购订单“既有行内容修改、无增删”这一行级语义动作。

本轮目标：

1. 只处理采购订单既有行内容修改；
2. 不并发处理采购订单行新增/行删除；
3. 不把头部字段和行内容编辑混在同一条 intent 中；
4. 继续避免 transaction 退化为整单 patch 包装壳。

### 二、建议方案
建议新增更窄语义 intent：

- `ORDER_LINE_CONTENT_CHANGE`

在 `purchase` 域中，payload 仍仅包含：

- `lines`
- `operator`

但 intent 语义约束为：

1. 不允许行新增；
2. 不允许行删除；
3. 只允许既有采购行内容修改；
4. `amount` 等聚合结果由后端重算或以后端校验为准。

### 三、前后端职责

#### 后端
1. 在 `purchase_transaction_service.go` 中新增 `ORDER_LINE_CONTENT_CHANGE`；
2. 校验本次变更确实属于“无增删的既有行内容修改”；
3. 保留物料完整性校验；
4. 更新采购单明细行；
5. 重算并落库订单金额；
6. 写入审计日志并返回最新采购订单快照。

#### 前端
1. 在 `purchase-transaction-service.ts` 中新增行内容事务请求函数；
2. 在 `use-purchase-orders.ts` 中新增对应 mutation；
3. 在 `purchase-order-action-dialog.tsx` 中增加分流：
   - 若 delta 仅涉及 `lines` / `amount` 且无增删，走 transaction；
   - 若混入头部字段或出现行集合增删，继续保留在现有 `patchMutation`。

### 四、涉及文件
- `server/services/purchase_transaction_service.go`
- `server/handlers/purchase_transaction_handlers.go`
- `server/routes/routes_trading.go`
- `src/features/trading/purchase/services/purchase-transaction-service.ts`
- `src/features/trading/purchase/hooks/use-purchase-orders.ts`
- `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`

### 五、风险与注意事项
1. 当前采购表单删除行时会重排 `lineNo`，新增行时也会生成新 `lineNo`，本轮必须避免把这些结构性变化误判为内容修改；
2. 采购行内容修改会联动 `amount`，需要明确它是派生聚合字段，不应单独成为 intent 真相源；
3. 若采购行编辑天然会顺带混入头部字段，则本轮应回退为规划调整，而不是强行编码；
4. 本轮不得破坏已落地的采购头部事务：`ORDER_DELIVERY_DATE_CHANGE`。

### 六、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮只实现 `purchase` 的 `ORDER_LINE_CONTENT_CHANGE`；
2. 仅当可稳定识别为“既有行内容修改、无增删”时，才走该 transaction；
3. 若混入 `expectedDate` 或其他头部字段，则不进入该 intent；
4. `ORDER_LINE_ADD` / `ORDER_LINE_REMOVE` 暂不进入本轮。

## `purchase` 事务化第一刀（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `purchase` 事务化第一刀：

1. 后端新增 `purchase` transaction service 与 transaction handler；
2. 路由新增 `POST /purchase/orders/:id/transactions`；
3. 采购订单 `ORDER_DELIVERY_DATE_CHANGE` 已落地，对应 `expectedDate` 事务化；
4. 前端新增 `expectedDateChangeMutation` 并接入采购订单编辑对话框；
5. 当且仅当 `expectedDate` 构成纯头部语义变更时，采购订单编辑走 transaction；
6. 其他采购订单编辑仍继续保留在现有 `patchMutation`；
7. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Purchase`。

## `purchase` 事务化第一刀（2026-04-08，待确认）

### 一、目标
将已在 `sales` 域验证通过的 transaction 样板，开始横向复制到 `purchase` 域，并以最小切口验证该模式可复用。

本轮目标：

1. 只复制一个最小、稳定、可验证的 intent；
2. 优先从采购订单头部语义动作入手，而不是直接切整套行级事务；
3. 保持 `patch` 作为兜底，不把 transaction 做成 patch 包装壳；
4. 为后续 `purchase` 行级事务化与其他头部事务迁移建立样板。

### 二、建议切口
建议本轮优先做：

- `ORDER_DELIVERY_DATE_CHANGE`

在 `purchase` 域中，对应采购订单：

- `expectedDate` 调整事务化

原因：

1. 与 `sales` 已完成的交期事务最接近，迁移成本最低；
2. 语义边界清晰，通常只涉及单一头部字段；
3. 能优先验证 `purchase` 的 transaction endpoint、前端分流、版本校验、审计链是否完整复制成功。

### 三、建议方案

#### 后端
1. 在 `purchase` transaction service 中新增 `ORDER_DELIVERY_DATE_CHANGE`（或保持采购域同名 intent）；
2. payload 仅包含：
   - `expectedDate`
   - `operator`
3. 处理逻辑包含：
   - `expectedVersion` 校验；
   - 更新 `expectedDate`；
   - 写入审计；
   - 返回最新采购订单快照。

#### 前端
1. 在 `purchase` transaction service 中新增对应请求函数；
2. 在 `purchase` hooks 中新增 mutation；
3. 在采购订单编辑对话框中增加分流：
   - 若 delta 仅包含 `expectedDate`，走 transaction；
   - 其他编辑继续走 `patchMutation`。

### 四、涉及文件（待实际核对）
- `server/services/purchase_transaction_service.go` 或现有采购 transaction 相关文件
- `src/features/trading/purchase/services/*`
- `src/features/trading/purchase/hooks/*`
- `src/features/trading/components/purchase-order-action-dialog.tsx` 或等价采购编辑组件

### 五、风险与注意事项
1. 需要先确认 `purchase` 当前是否已有 transaction service 基础设施；若无，则本轮可能需先补 transaction 入口样板；
2. 需要确认采购订单编辑 UI 的 delta 形态，避免误把多字段编辑一并送进 transaction；
3. 不得把 `purchase` 第一刀做成“大范围追平 `sales` 全量 intent”；
4. 本轮若发现采购端尚无可复用 transaction 基础设施，应先收窄为“补齐 transaction 骨架 + 一个头部 intent”。

### 六、待你确认的实施边界
请确认是否按以下边界执行：

1. `purchase` 第一刀只做采购订单 `expectedDate` 事务化；
2. 仅当 delta 仅包含 `expectedDate` 时，才走 transaction；
3. 其余采购订单编辑继续保留在现有 `patch` 链中；
4. 本轮不进入采购订单行级事务化。

## `sales` 行级事务化第四刀：`ORDER_LINE_REMOVE`（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `sales` 行级事务化第四刀：

1. 后端新增 `ORDER_LINE_REMOVE` intent；
2. 前端新增 `lineRemoveMutation` 并接入销售订单编辑对话框；
3. 当且仅当 `lines`、`quantity`、`amount` 构成纯行级变更且可稳定识别为“纯删除行”时，编辑订单走 `ORDER_LINE_REMOVE`；
4. 若纯行级变更但不是“仅删除”，则继续保留在 `ORDER_LINES_CHANGE` / `ORDER_LINE_CONTENT_CHANGE` / `ORDER_LINE_ADD`；
5. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Sales`。

## `sales` 行级事务化第四刀：`ORDER_LINE_REMOVE`（2026-04-08，待确认）

### 一、目标
在已完成 `ORDER_LINE_ADD` 的基础上，继续将 `sales` 行级事务细化，单独收口“删除一行”这一语义动作。

本轮目标：

1. 只处理单一语义：`ORDER_LINE_REMOVE`；
2. 不并发处理 `ORDER_LINE_ADD`；
3. 不把既有行内容编辑和行删除混在同一个 intent 中；
4. 继续避免 transaction 退化为整单 patch 包装壳。

### 二、建议方案
建议新增一个更窄语义 intent：

- `ORDER_LINE_REMOVE`

payload 建议仅包含：

- `lines`
- `operator`

其中：

1. `lines` 仍可作为提交后的最新行集合快照；
2. 但 intent 语义约束为“相较当前订单，仅发生删除行”；
3. 后端负责验证：
   - 原有行中存在被删除目标；
   - 保留行内容未被顺带修改；
   - 不存在新增行；
   - 聚合字段由后端重算。

### 三、前后端职责

#### 后端
1. 在 `sales_transaction_service.go` 中新增 `ORDER_LINE_REMOVE`；
2. 校验本次变更确实属于“仅删除行”；
3. 保存剩余行集合；
4. 重算 `quantity` / `amount`；
5. 写入审计日志；
6. 返回最新订单快照。

#### 前端
1. 在 `sales-transaction-service.ts` 中新增 `removeSalesOrderLine()`；
2. 在 `use-sales-transactions.ts` 中新增 `lineRemoveMutation`；
3. 在 `sales-order-action-dialog.tsx` 中识别“纯删除行”场景，优先走 `lineRemoveMutation`；
4. 若无法稳定识别为“仅删除”，则继续留在现有 `ORDER_LINES_CHANGE`。

### 四、涉及文件
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`
- 视需要补充：`src/features/trading/hooks/use-sales-order-ops.ts`

### 五、风险与注意事项
1. 当前删除行会联动 `quantity`、`amount`，必须明确这些都是派生结果，而非 intent 真相源；
2. 如果前端删除行时同时修改了既有行内容，本轮不应错误归入 `ORDER_LINE_REMOVE`；
3. 删除后若前端未来引入 `lineNo` 重排策略，需要防范前后端识别条件漂移；
4. 本轮不得破坏已落地的：
   - `ORDER_LINES_CHANGE`
   - `ORDER_LINE_CONTENT_CHANGE`
   - `ORDER_LINE_ADD`

### 六、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮只实现 `ORDER_LINE_REMOVE`；
2. 仅当可稳定识别为“纯删除行”时，才走该 transaction；
3. 若混入既有行内容修改，则不进入该 intent；
4. `ORDER_LINE_ADD` 暂不进入本轮。

## `sales` 行级事务化第三刀：`ORDER_LINE_ADD`（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `sales` 行级事务化第三刀：

1. 后端新增 `ORDER_LINE_ADD` intent；
2. 前端新增 `lineAddMutation` 并接入销售订单编辑对话框；
3. 当且仅当 `lines`、`quantity`、`amount` 构成纯行级变更且可稳定识别为“纯新增行”时，编辑订单走 `ORDER_LINE_ADD`；
4. 若纯行级变更但不是“仅新增”，则继续保留在 `ORDER_LINES_CHANGE` / `ORDER_LINE_CONTENT_CHANGE`；
5. 本轮未进入 `ORDER_LINE_REMOVE`；
6. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Sales`。

## `sales` 行级事务化第三刀：`ORDER_LINE_ADD`（2026-04-08，待确认）

### 一、目标
在已完成 `ORDER_LINE_CONTENT_CHANGE` 的基础上，继续将 `sales` 行级事务细化，单独收口“新增一行”这一语义动作。

本轮目标：

1. 只处理单一语义：`ORDER_LINE_ADD`；
2. 不并发处理 `ORDER_LINE_REMOVE`；
3. 不把既有行内容编辑和行新增混在同一个 intent 中；
4. 继续避免 transaction 退化为整单 patch 包装壳。

### 二、建议方案
建议新增一个更窄语义 intent：

- `ORDER_LINE_ADD`

payload 建议仅包含：

- `lines`
- `operator`

其中：

1. `lines` 仍可作为提交后的最新行集合快照；
2. 但 intent 语义约束为“相较当前订单，仅发生新增行”；
3. 后端负责验证：
   - 原有行未被删除；
   - 原有 `lineNo` 集合仍保留；
   - 新行数量大于 0；
   - 聚合字段由后端重算。

### 三、前后端职责

#### 后端
1. 在 `sales_transaction_service.go` 中新增 `ORDER_LINE_ADD`；
2. 校验本次变更确实属于“仅新增行”；
3. 替换/保存新行集合；
4. 重算 `quantity` / `amount`；
5. 写入审计日志；
6. 返回最新订单快照。

#### 前端
1. 在 `sales-transaction-service.ts` 中新增 `changeSalesOrderLineAdd()`；
2. 在 `use-sales-transactions.ts` 中新增 `lineAddMutation`；
3. 在 `sales-order-action-dialog.tsx` 中识别“纯新增行”场景，优先走 `lineAddMutation`；
4. 若无法稳定识别为“仅新增”，则继续留在现有 `ORDER_LINES_CHANGE`。

### 四、涉及文件
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`
- 视需要补充：`src/features/trading/hooks/use-sales-order-ops.ts`

### 五、风险与注意事项
1. 当前新增行会联动 `lineNo`、`quantity`、`amount`，必须明确这些都是派生结果，而非 intent 真相源；
2. 如果前端新增行时同时修改了既有行内容，本轮不应错误归入 `ORDER_LINE_ADD`；
3. 新增行后 `lineNo` 生成规则必须保持稳定，避免前后端编号口径漂移；
4. 本轮不得破坏已落地的：
   - `ORDER_LINES_CHANGE`
   - `ORDER_LINE_CONTENT_CHANGE`

### 六、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮只实现 `ORDER_LINE_ADD`；
2. 仅当可稳定识别为“纯新增行”时，才走该 transaction；
3. 若混入既有行内容修改，则不进入该 intent；
4. `ORDER_LINE_REMOVE` 暂不进入本轮。

## `sales` 行级事务化第二刀（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `sales` 行级事务化第二刀：

1. 后端新增 `ORDER_LINE_CONTENT_CHANGE` intent；
2. 前端新增 `lineContentChangeMutation` 并接入销售订单编辑对话框；
3. 当且仅当 `lines`、`quantity`、`amount` 构成纯行级变更且行结构未变化时，编辑订单走 `ORDER_LINE_CONTENT_CHANGE`；
4. 若纯行级变更但存在增删，则继续保留在 `ORDER_LINES_CHANGE`；
5. 本轮未进入 `ORDER_LINE_ADD` / `ORDER_LINE_REMOVE`；
6. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Sales`。

## `sales` 行级事务化第二刀（2026-04-08，待确认）

### 一、目标
在已完成 `ORDER_LINES_CHANGE` 的基础上，将 `sales` 行级事务继续细化，从“纯行集合变更”向“更窄语义的单类行操作”推进。

本轮目标：

1. 只处理行级语义，不回到订单头字段；
2. 只选择一个最稳妥的细化切口实施；
3. 不一次性并发推进行新增、行删除、行内容编辑三条链；
4. 继续避免 transaction 退化为整单 patch 包装壳。

### 二、候选切口分析

#### 方案 A：`ORDER_LINE_CONTENT_CHANGE`
适用语义：

- 修改既有行内容；
- 不新增行；
- 不删除行。

适合承载的字段：

- `productId`
- `productModel`
- `productCode`
- `specification`
- `qty`
- `price`
- `amount`
- `uom`
- `drillingPlanId`
- `labelingPlanId`
- `holeCount`
- `customerPartNo`
- `jobNo`
- `note`

优点：

1. 与现有 `ORDER_LINES_CHANGE` 最接近，落地风险最低；
2. 语义边界清晰，易于从当前编辑器事件抽取；
3. 不需要同时处理行号重排与集合增删。

#### 方案 B：`ORDER_LINE_ADD`
适用语义：

- 新增一行。

风险：

1. 当前前端新增行会联动 `lineNo`、`quantity`、`amount`；
2. 需要确认后端是否统一负责新行编号与聚合字段重算；
3. 若实现不慎，容易再次退化为整组 `lines` replace。

#### 方案 C：`ORDER_LINE_REMOVE`
适用语义：

- 删除一行。

风险：

1. 删除后 `lineNo` 可能需要重排；
2. 同样会联动 `quantity`、`amount`；
3. 需要处理“目标行不存在”的幂等语义。

### 三、建议优先顺序
建议本轮优先做：

- `ORDER_LINE_CONTENT_CHANGE`

原因：

1. 与当前 UI 编辑行为最贴近；
2. 风险低于“新增/删除”这类集合结构变更；
3. 更容易从 `ORDER_LINES_CHANGE` 过渡到更窄 intent，而不破坏现有链路。

### 四、涉及文件
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`
- 视需要补充：`src/features/trading/hooks/use-sales-order-ops.ts`

### 五、风险与注意事项
1. 当前编辑器是“整组 lines 状态更新”，若要细化为单类 intent，必须确认能稳定识别“只改内容、不增删行”的场景；
2. 若 line 内容编辑天然伴随整组重算，后端仍应以更窄语义落库，不能只换名字不换本质；
3. `ORDER_LINES_CHANGE` 作为上一刀已落地，本轮需避免与其职责重叠失控；
4. 若当前 delta 无法稳定区分“内容编辑”和“新增/删除”，则本轮应优先回到规划层，不强行编码。

### 六、待你确认的实施边界
请确认是否按以下边界执行：

1. 本轮只实现 `ORDER_LINE_CONTENT_CHANGE`；
2. `ORDER_LINE_ADD` / `ORDER_LINE_REMOVE` 暂不进入本轮；
3. 仅当可稳定识别为“既有行内容修改、无增删”时，才走该 transaction；
4. 其余行集合变更继续保留在现有 `ORDER_LINES_CHANGE` 或 `patchMutation` 路径中。

## `sales` 行级编辑事务化第一刀（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `sales` 行级编辑事务化第一刀：

1. 后端新增 `ORDER_LINES_CHANGE` intent；
2. 前端新增 `linesChangeMutation` 并接入销售订单编辑对话框；
3. 当且仅当 `lines`、`quantity`、`amount` 构成纯行级语义变更时，编辑订单走 transaction；
4. 其中 `quantity` / `amount` 被视为 `lines` 变化带出的派生聚合字段；
5. 后端按 `lines` authoritative source 重算并落库聚合字段；
6. 其他编辑仍继续保留 `patchMutation`；
7. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Sales`。

## `sales` 行级编辑事务化第一刀（2026-04-08，待确认）

### 一、目标
在 `sales` 订单编辑场景中，把销售订单 `lines` 的纯内容编辑，从通用 `patchMutation` 中抽离为独立 transaction intent。

本轮目标：

1. 只处理**纯行级编辑**；
2. 只在 `delta` 仅包含 `lines` 时分流到 transaction；
3. 不把订单头字段混入同一条 intent；
4. 不实现泛化“改单事务”。

### 二、建议方案
建议新增一个窄语义 intent，例如：

- `ORDER_LINES_CHANGE`

payload 仅包含：

- `lines`
- `operator`

后端职责：

1. 校验 `expectedVersion`；
2. 仅替换/更新销售订单明细行；
3. 保留现有明细校验与状态重算链；
4. 写入审计日志；
5. 返回最新订单快照。

前端职责：

1. 在 `sales-transaction-service.ts` 中新增行编辑事务请求函数；
2. 在 `use-sales-transactions.ts` 中新增对应 mutation；
3. 在 `sales-order-action-dialog.tsx` 中增加分流：
   - 若 `delta` 只包含 `lines`，走新 transaction；
   - 若混入任意头部字段，继续走 `patchMutation`。

### 三、涉及文件
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`

### 四、风险与注意事项
1. 当前 `lines` 编辑可能附带 `quantity`、`amount` 等聚合字段联动，需要先确认这些字段是否由保存链自动重算，还是会进入 delta；
2. 若直接把整组 `lines` 原样替换为 transaction payload，必须避免退化为“transaction 名字 + patch 本质”；
3. 后端行替换后仍要保持现有产品/物料完整性校验；
4. 不得破坏已完成的头部事务分流链：
   - `ORDER_CUSTOMER_CHANGE`
   - `ORDER_DELIVERY_DATE_CHANGE`
   - `ORDER_CLASSIFICATION_TYPE_CHANGE`
5. 若本轮发现 `lines` 编辑天然会混入大量聚合头字段，则应先回到规划阶段重新收窄边界。

### 五、待你确认的实施边界
请确认是否按以下边界执行：

1. 新 intent 采用组合语义：`ORDER_LINES_CHANGE`；
2. 只要 `delta` 仅由 `lines` 构成，就走该 transaction；
3. 本轮允许后端以“行集合 authoritative replace”方式落库，但仍需维持其语义为“纯行级编辑事务”；
4. 一旦混入头部字段，立即回退到现有 `patchMutation`。

## `sales` 分类/模式调整事务化专项（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成改单事务化第三刀：

1. 后端新增 `ORDER_CLASSIFICATION_TYPE_CHANGE` intent；
2. 前端新增 `classificationTypeChangeMutation` 并接入销售订单编辑对话框；
3. 当且仅当 `classification`、`type`、`barcode` 构成纯头部语义变更时，编辑订单走 transaction；
4. 其中 `barcode` 被视为 `classification` 变化带出的派生副作用；
5. 其他编辑仍继续保留 `patchMutation`；
6. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Sales`。

## `sales` 分类/模式调整事务化专项（2026-04-08，待确认）

### 一、目标
在 `sales` 订单编辑场景中，把订单头字段 `classification` / `type` 的纯语义修改，从通用 `patchMutation` 中抽离为独立 transaction intent。

本轮目标与前两刀保持一致：

1. **只处理窄语义字段组合**，不做泛化“改单事务”；
2. **只在纯字段变更场景下分流**；
3. **其他普通编辑继续走 `patchMutation`**。

### 二、建议方案
建议新增一个组合型 intent，例如：

- `ORDER_CLASSIFICATION_TYPE_CHANGE`

payload 仅包含：

- `classification`
- `type`
- `operator`

后端职责：

1. 校验 `expectedVersion`；
2. 只更新订单头 `classification` / `type`；
3. 写入审计日志；
4. 返回最新订单快照。

前端职责：

1. 在 `sales-transaction-service.ts` 中新增事务请求函数；
2. 在 `use-sales-transactions.ts` 中新增对应 mutation；
3. 在 `sales-order-action-dialog.tsx` 中增加分流：
   - 若 `delta` 只包含 `classification` / `type`，走新 transaction；
   - 否则继续走 `patchMutation`。

### 三、涉及文件
- `server/services/sales_transaction_service.go`
- `src/features/trading/sales/services/sales-transaction-service.ts`
- `src/features/trading/sales/hooks/use-sales-transactions.ts`
- `src/features/trading/components/sales-order-action-dialog.tsx`

### 四、风险与注意事项
1. `classification` 与 `type` 在表单 delta 中必须确认字段名稳定，避免前端判断条件误判；
2. 若当前表单允许只改 `classification` 或只改 `type`，需明确该 intent 是否允许单字段提交；
3. 不能破坏已有两条改单事务链：
   - `ORDER_CUSTOMER_CHANGE`
   - `ORDER_DELIVERY_DATE_CHANGE`
4. 不得把本轮实现退化为“transaction 内部直接套通用 patch”。

### 五、待你确认的实施边界
请确认是否按以下边界执行：

1. 新 intent 采用组合语义：`classification/type` 共用一个 transaction；
2. 只要 `delta` 仅由 `classification`、`type` 组成，就走该 transaction；
3. 即使只改其中一个字段，也允许走该 transaction；
4. 其余字段一旦混入，立即回退到现有 `patchMutation`。

## `sales` 交期调整事务化专项（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成改单事务化第二刀：

1. 后端新增 `ORDER_DELIVERY_DATE_CHANGE` intent；
2. 前端新增 `deliveryDateChangeMutation` 并接入销售订单编辑对话框；
3. 当且仅当 `deliveryDate` 发生变更时，编辑订单走 transaction；
4. 其他编辑仍继续保留 `patchMutation`；
5. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Sales`。

### 一、当前现状
上一轮已经完成改单事务化第一刀：客户主体调整。

当前 `sales` 已具备四条正式语义事务链：

1. `ORDER_LINE_CLAIM`
2. `ORDER_STATUS_TRANSITION`
3. `ORDER_CANCEL`
4. `ORDER_CUSTOMER_CHANGE`

下一刀最合适的改单语义，是交期调整：

1. 边界比“分类/模式调整”更窄；
2. 比全量改单更不容易退化成 patch 包装壳；
3. 与客户主体调整一样，适合作为订单头关键语义修改样板继续推进。

### 二、本轮目标
本轮只做一件事：

1. 将 `deliveryDate` 的修改抽成独立 transaction；
2. 只在编辑订单时当且仅当 `deliveryDate` 发生变化时，走 transaction；
3. 其他字段编辑继续保留在普通 `patch` 链中。

### 三、本轮明确不做
1. 不混入 `classification / type`；
2. 不混入 `customerId / customerName`；
3. 不将整单编辑整体 transaction 化；
4. 不改造明细行编辑链路。

### 四、建议改动文件
本轮预期涉及：

1. `server/services/sales_transaction_service.go`
2. `src/features/trading/sales/services/sales-transaction-service.ts`
3. `src/features/trading/sales/hooks/use-sales-transactions.ts`
4. `src/features/trading/components/sales-order-action-dialog.tsx`

### 五、风险与注意事项
1. 不得把包含多字段的 delta 强塞给“交期调整 transaction”；
2. 需要保证只有纯交期修改才走 transaction；
3. 其他编辑仍需继续可用，避免 action dialog 保存行为回归；
4. 需保持前后端版本冲突、toast、invalidate 语义与现有 transaction 口径一致。

### 六、确认点
进入代码改造前，需要你确认：

1. 是否接受本轮只处理 `deliveryDate` 的改单事务化；
2. 是否确认其他字段修改继续留在 `patchMutation`；
3. 确认后我再正式开始代码改造。

## `sales` 客户主体调整事务化专项（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成改单事务化第一刀：

1. 后端新增 `ORDER_CUSTOMER_CHANGE` intent；
2. 前端新增 `customerChangeMutation` 并接入销售订单编辑对话框；
3. 当且仅当 `customerId/customerName` 发生变更时，编辑订单走 transaction；
4. 其他编辑仍继续保留 `patchMutation`；
5. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Sales`。

## `sales` 改单事务化专项（2026-04-08，待确认）

### 一、当前现状
到当前为止，`sales` 已完成三条正式语义事务链：

1. `ORDER_LINE_CLAIM`
2. `ORDER_STATUS_TRANSITION`
3. `ORDER_CANCEL`

剩余仍主要留在普通 `patch` 链中的关键能力，是“改单”。

但“改单”本身存在明显风险：

1. 如果一上来做全量改单事务化，很容易退化成把 `patchSalesOrder` 外层包一层 transaction；
2. 这会让 transaction 失去业务语义边界，重新回到“字段 patch disguised as intent”的老问题；
3. 因此第一刀必须收窄，只切最值得事务化的一小组关键改单语义。

### 二、本轮目标
本轮只做一件事：

1. 推进 `sales` 改单事务化；
2. 但第一刀只处理订单头关键语义修改，不做整单任意字段 transaction 化。

### 三、建议首刀范围
建议首刀只覆盖订单头关键语义字段，例如：

1. 客户主体调整（`customerId` / `customerName`）
2. 交期调整（`deliveryDate`）
3. 订单分类或模式调整（`classification` / `type`）

不建议首刀覆盖：

1. 全量明细行编辑；
2. 任意自由文本字段统一收编进 transaction；
3. 把整个 action dialog 的所有编辑行为直接 transaction 化。

### 四、建议改动文件
本轮预期涉及：

1. `src/features/trading/sales/services/sales-transaction-service.ts`
2. `src/features/trading/sales/hooks/use-sales-transactions.ts`
3. `src/features/trading/components/sales-order-action-dialog.tsx`
4. `server/services/sales_transaction_service.go`
5. 如需细化 payload，可能涉及前后端 `sales` transaction request/payload 定义。

### 五、风险与注意事项
1. 不得把 `DeltaSet` 原样塞进“改单 transaction”，否则会退化为 patch 包装壳；
2. 需要把 payload 严格收敛到被批准的一小组业务字段；
3. 普通表单编辑链路需暂时保留，避免首刀范围过大导致对话框整体断裂；
4. 若后续需要覆盖更多改单语义，应分第二刀、第三刀继续拆，而不是一次性全收。

### 六、确认点
进入代码改造前，需要你确认：

1. 是否接受“首刀只做订单头关键语义修改”的范围；
2. 三类候选中优先先切哪一类：客户主体调整、交期调整、订单分类/模式调整；
3. 确认后我再正式开始代码改造。

## `sales` 取消事务化专项（2026-04-08，已完成）

### 执行结果摘要（2026-04-08，已完成）
已完成 `sales` 取消事务化：

1. 后端新增 `ORDER_CANCEL` intent；
2. 前端新增 `cancelMutation` 并接入列表页、详情页；
3. 未取消订单不再通过 `DELETE` 进入取消语义；
4. `DELETE /sales-orders/:id` 已收紧为仅处理已取消后的硬删除；
5. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Sales`。

## `use-sales.ts` 删除 + `ORDER_STATUS_TRANSITION` 事务化专项（2026-04-08，待确认）

### 执行结果摘要（2026-04-08，已完成）
已按批准结果完成本轮两项动作：

1. 已物理删除 `src/features/trading/sales/hooks/use-sales.ts`；
2. 已将状态推进从 `patchMutation` 改造成 `ORDER_STATUS_TRANSITION` transaction；
3. 后端 `sales_transaction_service.go` 已支持 `ORDER_STATUS_TRANSITION`；
4. 验证已通过：`pnpm exec tsc --noEmit`、`go test ./handlers ./routes ./services -run Sales`。

### 一、当前现状
上一轮已经完成两项前置工作：

1. `claim` 已完成最小 transaction 闭环；
2. `sales` 前端已完成 query / transaction 分层拆分，`use-sales.ts` 已退出正式导出入口。

这意味着当前可以进入下一步：

1. 物理删除已失去正式职责的 `use-sales.ts`；
2. 将 `sales-order-detail.tsx` 中仍由 `trackDelta() + patchMutation` 驱动的状态推进，改造成 `ORDER_STATUS_TRANSITION` 语义事务。

### 二、本轮目标
本轮只做两件事：

1. 删除 `src/features/trading/sales/hooks/use-sales.ts`；
2. 在现有 `/sales-orders/:id/transactions` 基础上新增并接入 `ORDER_STATUS_TRANSITION`。

### 三、本轮明确不做
1. 不扩展到更多 transaction intent；
2. 不改造 `purchase / inventory`；
3. 不顺手重写 `sales-order-detail.tsx` 其他无关链路；
4. 不在本轮推进 workflow 更深层状态编排。

### 四、建议改动文件
本轮预期涉及：

1. `src/features/trading/sales/hooks/use-sales.ts`（删除）
2. `src/features/trading/components/sales-order-detail.tsx`
3. `src/features/trading/sales/services/sales-transaction-service.ts`
4. `src/features/trading/sales/hooks/use-sales-transactions.ts`
5. `server/services/sales_transaction_service.go`
6. `server/handlers/sales_transaction_handlers.go`
7. 如需补类型，可能涉及前后端 `sales` transaction request/payload 定义。

### 五、目标链路
本轮希望把当前状态推进链路从：

`handleMutateStatus -> trackDelta(order) -> patchMutation`

改造成：

`handleMutateStatus -> statusTransitionMutation -> POST /sales-orders/:id/transactions -> ORDER_STATUS_TRANSITION`

### 六、风险与注意事项
1. 若删除 `use-sales.ts` 前仍有隐藏引用，会导致编译断裂；
2. 若状态事务化后仍保留旧 patch 状态入口，容易再次出现双轨；
3. 若 `ORDER_STATUS_TRANSITION` payload 设计过宽，会再次退化成字段 patch 包装壳；
4. 需要保持版本冲突响应口径与现有 `claim` transaction 一致。

### 七、确认点
进入代码改造前，需要你确认：

1. 是否按“先删 `use-sales.ts`，再做 `ORDER_STATUS_TRANSITION` 事务化”的顺序执行；
2. 是否确认本轮只处理状态推进事务，不扩展更多动作；
3. 确认后我再正式开始代码改造。

## `sales` query / transaction 分层拆分专项（2026-04-08，待确认）

### 一、当前现状
上一轮已经完成 `sales` 第一阶段最小 `claim` transaction 闭环：

1. 后端已有 `POST /sales-orders/:id/transactions`；
2. 前端已有 `sales-transaction-service.ts`；
3. `claimMutation` 已切到 transaction 链；
4. 旧 `claimOrderLine()` 兼容残留已删除。

但当前前端 `sales` 目录仍存在一个明显结构问题：

1. `use-sales.ts` 仍同时承载 query 与 mutation；
2. `sales-service.ts` 仍同时承载 query 与 patch / 兼容更新逻辑；
3. 新增的 transaction service 还没有与 query 层完成正式分层对齐。

### 二、本轮目标
本轮只做一件事：

1. 正式完成 `sales` 前端 query / transaction 分层拆分；
2. 拆出清晰文件落点：
   - `use-sales-queries.ts`
   - `use-sales-transactions.ts`
   - `sales-query-service.ts`
3. 将现有 `use-sales.ts` / `sales-service.ts` 从混合职责收缩为更清晰的过渡或兼容结构。

### 三、本轮明确不做
1. 不新增新的 transaction intent；
2. 不推进 `ORDER_STATUS_TRANSITION`；
3. 不扩散到 `purchase / inventory`；
4. 不在本轮改动后端 `sales` transaction 语义。

### 四、建议改动文件
本轮预期涉及：

1. `src/features/trading/sales/hooks/use-sales.ts`
2. 待新增：`src/features/trading/sales/hooks/use-sales-queries.ts`
3. 待新增：`src/features/trading/sales/hooks/use-sales-transactions.ts`
4. `src/features/trading/sales/services/sales-service.ts`
5. 待新增：`src/features/trading/sales/services/sales-query-service.ts`
6. `src/features/trading/sales/services/sales-transaction-service.ts`
7. `src/features/trading/sales/index.ts`
8. 视引用情况，可能涉及 `src/features/trading/components/sales-order-detail.tsx` 与其他消费端。

### 五、风险与注意事项
1. 如果拆分时 query key 变化，会导致缓存行为回归；
2. 如果拆分时 mutation 成功回调行为漂移，会影响 toast / invalidate；
3. 如果过早删除 `use-sales.ts`，会导致现有消费端导入断裂；
4. 如果 `sales-service.ts` 与 `sales-query-service.ts` 职责边界不清，后续仍会继续回到混合结构。

### 六、建议实施策略
建议采用渐进式拆分：

1. 先新增 query hooks / query service；
2. 再新增 transaction hooks；
3. 再让 `use-sales.ts` 收缩为兼容桥接层；
4. 最后统一 `index.ts` 导出，避免双入口漂移。

### 七、确认点
进入代码拆分前，需要你确认：

1. 是否按上述前端分层拆分推进；
2. 是否允许 `use-sales.ts` 在本轮暂时保留为兼容桥接层；
3. 确认后我再正式开始代码拆分。
