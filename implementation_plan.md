# implementation plan

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

