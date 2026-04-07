# 当前各域数据流 / 副作用流 / 工作流接点拓扑图

## 一、文档目标

本文档用于沉淀当前 XDFC 在 `sales`、`purchase`、`inventory`、`workflow-core` 四个域中的真实运行拓扑，聚焦三条主线：

1. 数据流
2. 副作用流
3. 工作流接点

本文档的定位是“当前现状基线图”，用于后续 `SDRTS + Workflow + TDO` 收敛时作为对照面。

## 二、阅读方式

阅读本文档时，应重点关注以下问题：

1. 哪些域仍以“字段 patch 驱动”为主；
2. 哪些域已经具备“语义事务驱动”雏形；
3. 哪些副作用还停留在前端 Hook / Service；
4. 哪些工作流只接入了建单，而没有接入后续关键事务；
5. 当前系统为什么会呈现多种驱动方式并存的状态。

---

## 三、`sales` 域拓扑图

### 1. 数据流

```text
SalesOrderDetail.tsx
  -> useGetSalesOrderDetail(id)
    -> use-sales.ts
      -> sales-service.ts / getSalesOrderById()
        -> GET /sales-orders/:id
          -> server/handlers/sales_orders.go / GetSalesOrderHandler
            -> DB: sales_orders + preload(lines)
            -> MapSalesOrderToResponse
            -> 返回前端

SalesOrderDetail.tsx
  -> handleMutateStatus(payload)
    -> trackDelta(order)
    -> patchMutation.mutate({ id, delta, version })
      -> use-sales.ts / patchMutation
        -> sales-service.ts / patchSalesOrder()
          -> PATCH /sales-orders/:id
            -> server/handlers/sales_orders.go / PatchSalesOrderHandler
              -> 读取现有订单
              -> 解释 delta
              -> 重组 patch request
              -> tx.Model(&current).Updates(input)
              -> Association("Lines").Replace(input.Lines)
              -> RecalculateSalesOrderStatusTx()
              -> 返回更新后的订单

SalesOrderDetail.tsx
  -> handleClaimLine(lineNo) / handleClaimModel(model)
    -> claimMutation.mutate({ orderId, lineNos, operator })
      -> use-sales.ts / claimMutation
        -> sales-service.ts / claimOrderLine()
          -> getSalesOrderById(orderId)
          -> 前端本地构造 nextLines
          -> patchSalesOrder(orderId, { lines: { o, n } }, version)
            -> PatchSalesOrderHandler
```

### 2. 副作用流

```text
use-sales.ts / createMutation.onSuccess
  -> toast.success(...)
  -> 如果 status === Pending
    -> NotificationService.dispatch('ORDER_EVENT', ...)
  -> invalidateQueries(['sales-orders'])
  -> invalidateQueries(['requirements'])

use-sales.ts / claimMutation.onSuccess
  -> toast.success(...)
  -> invalidateQueries(...)

use-sales.ts / patchMutation.onSuccess
  -> toast.success(...)
  -> invalidateQueries(...)

sales-service.ts / deleteSalesOrder()
  -> DELETE /sales-orders/:id
  -> useNotificationStore.getState().archiveByOrderId(id)
```

### 3. 工作流接点

```text
创建销售单
  -> POST /sales-orders
    -> SaveSalesOrderHandler
      -> tx.Create(&input)
      -> RecalculateSalesOrderStatusTx(tx, input.ID)
      -> CreateWorkflowInstanceForDocumentTx(
           module = SALES_ORDER,
           businessType = SALES_ORDER,
           businessRefID = input.ID
         )
      -> 将 workflow_instance_id 写回 sales_order
```

### 4. 当前判断

`sales` 当前具备以下特征：

1. 已有 `delta` 传输基础；
2. 已有建单即创建 workflow instance 的能力；
3. 认领、状态推进等关键动作仍主要走“字段变更 -> patch handler”链路；
4. 业务通知等副作用仍有一部分留在前端 Hook 中。

---

## 四、`purchase` 域拓扑图

### 1. 数据流

```text
Purchase 页面/详情
  -> useGetPurchaseOrders(page, pageSize)
    -> use-purchase-orders.ts
      -> purchase-service.ts / getPurchaseOrders()
        -> GET /purchase/orders?page=&pageSize=
          -> server/handlers/purchase_orders.go
            -> DB 查询 purchase_orders
            -> 返回分页对象

Purchase 详情
  -> useGetPurchaseOrderDetail(id)
    -> purchase-service.ts / getPurchaseOrderById()
      -> GET /purchase/orders/:id
        -> 后端 handler
          -> preload(lines)
          -> 返回详情

采购单编辑
  -> patchMutation.mutate({ id, delta, version })
    -> purchase-service.ts / patchPurchaseOrder()
      -> PATCH /purchase/orders/:id
        -> 后端 purchase patch handler
          -> 解释 delta
          -> 更新主表
          -> Replace(lines)

收货确认
  -> confirmReceiptMutation.mutate({ id, payload })
    -> purchase-service.ts / confirmPurchaseReceipt()
      -> POST /purchase/orders/:id/confirm-receipt
        -> 后端 receipt handler
          -> 根据 payload 生成入库记录
          -> 更新采购单相关状态
          -> 返回 purchaseOrder + createdInboundRecords
```

### 2. 副作用流

```text
use-purchase-orders.ts / createMutation.onSuccess
  -> toast.success(...)
  -> invalidateQueries(['purchase-orders'])

use-purchase-orders.ts / patchMutation.onSuccess
  -> toast.success(...)
  -> invalidateQueries(['purchase-orders'])

use-purchase-orders.ts / deleteMutation.onSuccess
  -> toast.success(...)
  -> invalidateQueries(['purchase-orders'])

use-purchase-orders.ts / confirmReceiptMutation.onSuccess
  -> toast.success(...)
  -> invalidateQueries(['purchase-orders'])
  -> invalidateQueries(['purchase-orders', data.purchaseOrder.id])
```

### 3. 工作流接点

```text
创建采购单
  -> POST /purchase/orders
    -> SavePurchaseOrderHandler
      -> tx.Create(&order)
      -> CreateWorkflowInstanceForDocumentTx(
           module = PURCHASE_ORDER,
           businessType = PURCHASE_ORDER,
           businessRefID = order.ID
         )
      -> 将 workflow_instance_id 写回 purchase_order

workflow task 审批通过
  -> services.ApproveWorkflowTask(...)
    -> processWorkflowTaskDecisionTx(...)
      -> 某些场景推动 purchase_order 状态变化
```

### 4. 当前判断

`purchase` 当前具备以下特征：

1. 主体仍以 CRUD + patch 为主；
2. 已出现 `confirm-receipt` 这种更接近语义事务的接口；
3. workflow 不只在建单时接入，也会在审批推进后反向影响采购单状态；
4. 前端副作用较轻，主要是 toast 与 query invalidate。

---

## 五、`inventory` 域拓扑图

### 1. 前端数据流

```text
inventory 页面
  -> inventoryService.getInventoryList()
    -> GET /inventory?page=1&pageSize=1000
      -> inventory_query_handlers.go / GetInventoryHandler
        -> services.ListInventory(...)
        -> 返回分页响应

入库
  -> inventoryService.recordInbound(data)
    -> POST /inventory/inbound
      -> handlers/inventory_command_handlers.go / RecordInboundHandler
        -> MapRecordInboundRequestToModel(req)
        -> services.RecordInbound(&inbound)

出库草稿
  -> inventoryService.recordShipment(data)
    -> POST /inventory/shipment
      -> RecordShipmentHandler
        -> services.CreateShipmentDraft(&shipment)

出库提交
  -> inventoryService.commitShipment(id)
    -> POST /inventory/shipment/:id/commit
      -> CommitShipmentHandler
        -> services.CommitShipment(id)

库存调拨
  -> inventoryService.transferInventory(...)
    -> POST /inventory/transfer
      -> TransferInventoryHandler
        -> services.TransferInventory(input)

盘点/负库存修复
  -> inventoryService.reconcileInventory()
    -> POST /inventory/reconcile
      -> ReconcileInventoryHandler
        -> services.ReconcileNegativeInventory()

作废出库
  -> inventoryService.deleteShipmentRecord(id, approvalId)
    -> POST /inventory/shipment/:id/void
      -> VoidShipmentHandler
        -> CheckAndConsumeApproval(...)
        -> services.VoidShipment(...)
```

### 2. Patch 支线

```text
inventoryService.patchInventory(id, delta, version)
  -> PATCH /inventory/:id
    -> PatchInventoryHandler
      -> 解释 delta
      -> ApplyPatchInventoryRequestToModel
      -> DB Updates(...)

inventoryService.patchShipment(id, delta, version)
  -> PATCH /inventory/shipment/:id
    -> PatchShipmentHandler
      -> 解释 delta
      -> ApplyPatchShipmentRequestToModel
      -> DB Updates(...)
```

### 3. 后端副作用流

#### 3.1 入库事务链

```text
RecordInboundHandler
  -> services.RecordInbound(&inbound)
    -> db.Transaction(...)
      -> recordInboundTx(tx, inbound)
        -> 锁定 inventory 行（FOR UPDATE）
        -> 更新 / 创建 inventory
        -> applyInboundToPurchaseOrderTx(tx, inbound)
          -> 回写 purchase_order_line.received_qty
          -> recalculatePurchaseOrderStatusTx(tx, purchaseOrderID)
        -> CreateInboundVoucherTx(tx, inbound)
          -> 自动生成财务凭证
```

#### 3.2 出库事务链

```text
CommitShipmentHandler
  -> services.CommitShipment(id)
    -> 事务内扣减库存
    -> 更新 shipment 状态
    -> 回写销售履约状态
    -> CreateShipmentVoucherTx(...)
```

#### 3.3 作废事务链

```text
VoidShipmentHandler
  -> CheckAndConsumeApproval(...)
  -> services.VoidShipment(ctx, id)
    -> 回滚库存
    -> 更新 shipment 状态
    -> 处理冲突锁
```

### 4. 前端副作用流

```text
inventoryService.recordInbound()
  -> 成功后 broadcastUpdate()

inventoryService.recordShipment()
  -> 成功后 broadcastUpdate()

inventoryService.commitShipment()
  -> 成功后 broadcastUpdate()

inventoryService.transferInventory()
  -> 成功后 broadcastUpdate()

inventoryService.reconcileInventory()
  -> 成功后 broadcastUpdate()

inventoryService.deleteShipmentRecord()
  -> 成功后 broadcastUpdate()

inventoryService.patchInventory()
  -> 成功后 broadcastUpdate()

inventoryService.patchShipment()
  -> 成功后 broadcastUpdate()
```

### 5. 工作流接点

当前 `inventory` 域的关键现实是：

```text
inventory 事务链已经较强
  但尚未深度挂接 workflow instance / workflow task 编排
```

### 6. 当前判断

`inventory` 当前具备以下特征：

1. 后端已明显出现命令式事务服务；
2. 已有锁、联动、凭证、回滚等后端级副作用收敛；
3. 前端副作用相对较轻，主要通过事件广播刷新；
4. workflow 接点相对弱于 `sales / purchase`；
5. patch 与 command 两种风格并存。

---

## 六、`workflow-core` 域拓扑图

### 1. 数据流

```text
页面组件
  -> useCommands()
    -> RoutingService.getCommands()
      -> GET /system/routing/commands
        -> 后端 routing handler
          -> 返回 StandardCommand[]

页面组件
  -> addCommand(data)
    -> RoutingService.saveCommand(data)
      -> POST /system/routing/commands

页面组件
  -> updateCommand(id, updates)
    -> RoutingService.updateCommand(id, updates)
      -> PUT /system/routing/commands/:id

页面组件
  -> deleteCommand(id)
    -> RoutingService.deleteCommand(id)
      -> DELETE /system/routing/commands/:id

局部 patch
  -> RoutingService.patchCommand(id, delta, version)
    -> PATCH /system/routing/commands/:id
```

### 2. 副作用流

```text
useCommands()
  -> loadData() 失败
    -> logger.error(...)
    -> toast.error(...)

addCommand/updateCommand/deleteCommand
  -> 本地 setCommands(...)
  -> toast.success/error(...)
```

### 3. 工作流接点

```text
StandardCommand
  -> actionType: PRINT / QC / NOTIFY / OP / CLAIM
  -> bindType: SECTION / ROLE / GLOBAL
  -> title / content / targetLink / params

SalesOrderDetail.tsx
  -> useCommands()
    -> 读取 activeCommand
    -> 判断当前是否为 CLAIM 语义
```

### 4. 当前判断

`workflow-core` 当前更接近：

1. 命令模板与路由配置中心；
2. 语义提示与管理面配置层；
3. 前端辅助识别“当前命令是什么”；

而不是：

1. 统一业务事务执行入口；
2. 跨域事务编排运行时；
3. 当前系统的真正 transaction orchestrator。

---

## 七、全局跨域总拓扑图

### 1. 数据主干

```text
前端业务页面
  -> 域 hooks / 域 services
    -> API
      -> handler
        -> domain service
          -> DB
```

但各域 service 风格并不一致：

1. `sales / purchase` 更偏 CRUD + patch；
2. `inventory` 更偏 command transaction；
3. `workflow-core` 更偏 routing / config service。

### 2. 副作用主干

#### `sales`

```text
前端 hook 成功回调
  -> toast
  -> NotificationService.dispatch
  -> query invalidate
  -> notification store archive
```

#### `purchase`

```text
前端 hook 成功回调
  -> toast
  -> query invalidate
```

#### `inventory`

```text
前端轻副作用
  -> broadcastUpdate()

后端重副作用
  -> 更新库存
  -> 更新采购 / 销售状态
  -> 自动生成 voucher
  -> 作废回滚
```

#### `workflow-core`

```text
前端管理副作用
  -> toast
  -> local state mutate
```

### 3. 工作流接点主干

```text
sales create
  -> SaveSalesOrderHandler
    -> CreateWorkflowInstanceForDocumentTx(...)

purchase create
  -> SavePurchaseOrderHandler
    -> CreateWorkflowInstanceForDocumentTx(...)

workflow task approve/reject
  -> workflow_service.go
    -> processWorkflowTaskDecisionTx(...)
    -> 某些场景反向推动业务单据状态变化

inventory
  -> 当前未深度接 workflow instance
  -> 更像独立 command transaction engine
```

---

## 八、当前系统的三套并存驱动方式总结

### 1. 驱动 A：`sales / purchase` 的“单据 patch 驱动”

```text
UI 意图
  -> 组装字段变化
  -> PATCH
  -> 后端解释字段
```

### 2. 驱动 B：`inventory` 的“命令事务驱动”

```text
UI 动作
  -> POST command
  -> 后端原子事务执行
  -> 自动级联联动
```

### 3. 驱动 C：`workflow-core` 的“配置元数据驱动”

```text
管理端配置 command / rule
  -> 供页面语义识别 / 路由配置使用
```

### 4. 总结性判断

当前系统并不是一条统一的事务总线，而是三类驱动同时存在：

1. `sales / purchase` 以字段变化为主；
2. `inventory` 以后端事务命令为主；
3. `workflow-core` 以配置与模板为主。

这也是当前架构尚未完全收敛为 `SDRTS + Workflow + TDO` 闭环的直接原因。

---

## 九、后续收敛方向

本文档主体只记录当前现状，但为了给下一步专项提供入口，后续收敛方向建议如下。

### 1. 先统一事务语义，而不是先统一目录名

下一步最重要的不是继续做目录级重排，而是统一一套跨域事务表达方式，使系统从：

```text
字段变化 / 命令接口 / 配置模板
```

逐步收敛到：

```text
UI 意图
  -> TDO
    -> Workflow / Orchestrator
      -> Domain Transaction Service
        -> Delta / DB mutation / Voucher / Notification / Audit
```

### 2. `sales` 适合作为第一批样板域

原因：

1. 已有 delta 基础；
2. 已有 workflow instance 接点；
3. 认领、状态推进等动作语义清晰；
4. 风险小于直接从 `inventory` 开刀。

建议优先样板动作：

1. `ORDER_LINE_CLAIM`
2. `ORDER_STATUS_TRANSITION`

### 3. `purchase` 适合作为第二批复制域

原因：

1. 结构与 `sales` 相近；
2. 已有 `confirm-receipt` 这种天然事务接口；
3. 可复用 `sales` 形成的 TDO 协议与 orchestrator 方式。

### 4. `inventory` 更适合作为统一协议纳入阶段，而不是第一刀

原因：

1. 后端事务能力已经较强；
2. 已牵涉库存、采购、销售、凭证、回滚等核心链路；
3. 更适合在上层事务协议跑通后，再将现有命令服务纳入统一 TDO 壳。

### 5. `workflow-core` 后续需重新定位

后续需要明确它到底承担哪种职责：

1. 继续保留为命令/规则配置中心；
2. 或升级为事务编排前端入口；
3. 或由新建的 transaction/orchestrator 层承担运行时职责，而 `workflow-core` 仅保留元数据管理。

当前更稳妥的方向是：

1. 先让业务域跑出真实 TDO 样板；
2. 再反过来决定 `workflow-core` 的最终边界。

### 6. 推荐演进顺序

建议顺序：

1. `sales`：先做 `claim` 事务 TDO 化；
2. `sales`：再做状态推进事务化；
3. `purchase`：复制事务协议与收货确认样板；
4. 抽出统一 transaction 协议与审计模型；
5. `inventory`：将现有 command service 纳入统一事务协议；
6. 最后再决定 `workflow-core` 的升级方式。
