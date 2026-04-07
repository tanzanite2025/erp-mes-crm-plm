# 变更记录与验证（walkthrough.md）

## P0：`inventory transfer request DTO` 最小闭环（2026-04-07）

### 已执行变更
1. 为 transfer 链补正式命名 request DTO
   - `server/services/inventory_command_dto.go`
   - 已新增 `TransferInventoryRequest`

2. 已补 transfer request -> service input mapper
   - `server/services/inventory_command_mapper.go`
   - 已新增 `MapTransferInventoryRequestToInput(...)`

3. transfer handler 已切到正式 request contract
   - `server/handlers/inventory_command_handlers.go`
   - `TransferInventoryHandler` 不再直接绑定 `TransferInventoryInput`

4. 已补定向防回退测试
   - `server/handlers/inventory_command_handlers_test.go`
   - 已新增 `TestTransferInventoryHandlerUsesNamedRequestContract`

### 保留边界
- 未改 transfer 数量/金额逻辑；
- 未改 transfer 事务语义；
- 未改权限校验逻辑；
- 未改错误状态码与中文错误语义。

### 验证
执行：
```bash
go test ./handlers ./services -run "Inventory"
```

结果：通过。

### 当前结果
- `inventory` transfer 链的 request 边界已从 service input 风格收口为正式 request DTO；
- handler / service 职责边界进一步清晰；
- 后续若 transfer request 再回退为直接绑定 service input，更容易被定向测试及时拦住。

## P0：`inventory` 再下一条最小闭环（bulk sync contract 收口）（2026-04-07）

### 已执行变更
1. 为 `inventory` bulk sync 补正式命名 request / response DTO
   - `server/services/inventory_command_dto.go`
   - 已新增：
     - `BulkSyncInventoryItemRequest`
     - `BulkSyncInventoryResponse`

2. 已补 bulk sync request -> model mapper
   - `server/services/inventory_command_mapper.go`
   - 已新增 `MapBulkSyncInventoryRequestsToModels(...)`

3. bulk sync service 对外已脱离直接 `models.Inventory`
   - `server/services/inventory_command_service.go`
   - `BulkSyncInventory(...)` 已改为接收 `[]BulkSyncInventoryItemRequest`

4. bulk sync handler 已切到正式 request / response contract
   - `server/handlers/inventory_command_handlers.go`
   - 不再直接绑定 `[]models.Inventory`
   - 成功响应已切到 `BulkSyncInventoryResponse`

5. 已补定向防回退测试
   - `server/handlers/inventory_command_handlers_test.go`
   - 已新增 `TestBulkSyncInventoryHandlerUsesNamedRequestAndResponseContract`
   - `server/services/inventory_command_service_test.go` 已同步到新的 bulk sync request contract

### 保留边界
- 未改 bulk sync 合并逻辑；
- 未改库存数量/金额业务语义；
- 未改权限校验逻辑；
- 未改错误状态码与既有中文错误语义。

### 验证
执行：
```bash
go test ./handlers ./services -run "Inventory"
```

结果：通过。

### 当前结果
- `inventory` bulk sync 链已补齐正式命名 request / response contract；
- handler / service 对外已不再直接暴露 `models.Inventory`；
- 后续若 bulk sync 再回退为直接绑定 model 或裸响应，更容易被定向测试及时拦住。

## P0：下一轮 `inventory` 后续最小闭环（命令成功响应统一）（2026-04-07）

### 已执行变更
1. 统一 `inventory` 命令成功响应 contract
   - `server/handlers/inventory_command_handlers.go`
   - 已完成：
     - `ReconcileInventoryHandler` 成功响应从 `gin.H` 切到 `InventoryCommandStatusResponse`
     - `VoidShipmentHandler` 成功响应从 `gin.H` 切到 `InventoryCommandStatusResponse`

2. 已补定向防回退测试
   - `server/handlers/inventory_command_handlers_test.go`
   - 已新增 `TestReconcileInventoryHandlerReturnsNamedStatusResponse`
   - 重点断言：成功响应使用正式命名 DTO，且 reconcile 后负库存被归零

### 保留边界
- 未改库存事务逻辑；
- 未改 void shipment 回滚逻辑；
- 未改 reconcile 业务语义；
- 未改错误状态码与既有中英文错误消息。

### 验证
执行：
```bash
go test ./handlers ./services -run "Inventory"
```

结果：通过。

### 当前结果
- `inventory` 命令链成功响应风格进一步统一；
- `transfer / reconcile / void` 成功响应已对齐到正式命名 status DTO；
- 后续若再次回退为裸 `gin.H`，更容易被定向测试及时拦住。

## P0：第二轮 A 级模块 contract 巡检总收尾（2026-04-07）

### 最终状态总览
- `workflow`：Green
- `production`：Green
- `voucher / finance`：Green
- `inventory`：已完成最小闭环并回到 Green
- `sales_orders`：已复核，主链基本 Green，暂不进入实现
- `purchase_orders`：已完成收货确认链最小闭环并通过定向回归

### 已完成的同轮动作
- 已完成第二轮 A 级模块 contract 回归巡检；
- 已完成 `inventory query + commit contract` 补缺口；
- 已完成 `purchase_orders` 收货确认链最小闭环；
- 已完成 `sales_orders` 旧审批稿清账；
- 已完成第一批 A 级 contract 防回退测试。

### 本轮收尾结果
- 第二轮 A 级模块巡检相关文档口径已统一；
- 当前轮次下的审批稿、执行前表述与悬空待办已完成清理；
- 后续若继续推进第二批防回退测试或新的模块闭环，应进入下一轮，不再挂在本轮名下。

## P0：A 级模块 contract 防回退测试（2026-04-07）

### 已执行测试补强
1. `inventory` query handler response shape 防回退
   - 新增 `server/handlers/inventory_query_handlers_test.go`
   - 已覆盖：
     - `GetInventoryHandler`
     - `GetInboundHistoryHandler`
     - `GetShipmentHistoryHandler`
   - 重点断言：返回正式命名 paged response，而非不稳定匿名 JSON 结构。

2. `inventory` commit shipment DTO shape 防回退
   - 更新 `server/services/inventory_command_service_test.go`
   - 已补 `CommitShipment(...)` 返回 DTO 关键字段断言：
     - `id`
     - `materialId`
     - `sourceCategory`
     - `batchNo`
     - `status`

3. `purchase_orders` 收货确认链 contract 防回退
   - 更新 `server/handlers/purchase_receipt_confirm_handler_test.go`
   - 更新 `server/services/purchase_receipt_confirm_service_test.go`
   - 已补：
     - 收货确认成功时返回 `ConfirmPurchaseReceiptResponse` 的关键字段断言
     - `receiptDate` 非 RFC3339 时的负向断言

4. `sales_orders` 保存返回 contract 防回退
   - 更新 `server/handlers/trading_workflow_e2e_test.go`
   - 已补 `SaveSalesOrderHandler` 成功返回 `SalesOrderResponse` 的关键字段断言：
     - `orderNo`
     - `orderName`
     - `workflowInstanceId`
     - `lines`

### 保留边界
- 未扩展为全量测试体系治理；
- 未改业务逻辑，只补 contract / response shape / workflow 挂接稳定性测试；
- 未新增复杂测试框架，优先复用既有 handler / service 测试文件与 SQLite 测试搭建方式。

### 验证
执行：
```bash
go test ./handlers ./services -run "Inventory|PurchaseOrder|SalesOrder|Workflow"
```

结果：通过。

### 当前结果
- 第二轮巡检已收口的 A 级 contract 关键边界已有第一批防回退测试保护；
- `inventory`、`purchase_orders`、`sales_orders` 的关键 response shape 与 workflow 挂接稳定性得到进一步固化；
- 后续再出现匿名 struct / 裸 model / 不稳定 response 回退时，更容易被定向测试及时拦住。

## P0：`sales_orders` 旧审批稿清账（主链复核结论固化）（2026-04-07）

### 复核结论
- 已对 `sales_orders` 的列表、详情、保存与 workflow 挂接面做过最小闭环级别复核；
- 当前主链外部 contract 基本稳定，判定为 **基本 Green**；
- 当前未命中值得立即进入实现阶段的明确 contract Yellow 点。

### 已确认的稳定点
- 列表接口已有 `SalesOrderListResponse`
- 详情接口已有 `SalesOrderResponse`
- 保存接口已有 `SaveSalesOrderRequest`
- 保存成功返回已走 `MapSalesOrderToResponse(...)`
- workflow 挂接已有定向 E2E 覆盖

### 收尾结论
- 将 `task.md` 中遗留的 `sales_orders` 审批稿状态整理为“已复核，暂不进入实现”；
- 避免文档中留下看似待做、实际不应继续推进的悬空条目。

## P0：`purchase_orders` 最小 contract 闭环（收货确认链）（2026-04-07）

### 已执行变更
1. 为采购收货确认链补正式命名 request DTO
   - `server/services/purchase_receipt_confirm_dto.go`
   - 已新增：
     - `ConfirmPurchaseReceiptRequest`
     - `ConfirmPurchaseReceiptLineRequest`

2. handler 已从匿名 request 切到正式命名 contract
   - `server/handlers/purchase_orders.go`
   - `ConfirmPurchaseReceiptHandler` 不再使用匿名 `struct`

3. 采购收货确认 service 对外返回值已切到正式 response DTO
   - `server/services/purchase_receipt_confirm_service.go`
   - `ConfirmPurchaseReceipt(...)` 已改为返回 `ConfirmPurchaseReceiptResponse`

4. 已补 request -> service input mapper
   - `server/services/purchase_order_mapper.go`
   - 已新增 `MapConfirmPurchaseReceiptRequestToInput(...)`

### 保留边界
- 未改采购收货确认的事务逻辑；
- 未改入库记录创建逻辑；
- 未改采购单状态重算逻辑；
- 未改 workflow 挂接语义与既有中文错误语义。

### 验证
执行：
```bash
go test ./handlers ./services -run "PurchaseOrder|Workflow"
```

结果：通过。

### 当前结果
- `purchase_orders` 主链中最明确的 Yellow 点已收口到收货确认链；
- handler / service 对外 contract 已进一步稳定；
- 当前采购单主链的 contract 一致性与防回退能力进一步增强。

## P0：A 级模块 contract 回归巡检（第二轮）正式总结（2026-04-07）

### 巡检范围
本轮优先复核了以下 A 级模块与其主链 contract：

- `workflow`
- `production`
- `inventory`
- `voucher / finance`
- `sales_orders`

### 巡检关注点
- service / handler 对外是否重新暴露 `models.*`
- 是否重新出现匿名 request / response
- handler 是否直接返回裸 model / 裸 slice / 裸 map
- 新增接口是否绕开既有 DTO / mapper / wrapper 体系

### 模块级结论
1. `workflow`
   - 结论：Green
   - 说明：审批 / 驳回 / task list 的 service / handler contract 已保持 DTO 化，对外未发现新的 `models.Workflow*` 回退。

2. `production`
   - 结论：Green
   - 说明：主配置链与核心查询链已完成 wrapper 风格统一，当前主链未发现新的裸 DTO / 裸 map / model contract 回退。

3. `voucher / finance`
   - 结论：Green
   - 说明：读接口仍稳定通过 voucher DTO / mapper 输出，对外 contract 保持稳定。

4. `inventory`
   - 初始判定：Yellow
   - 命中问题：
     - query service 对外仍返回 `[]models.*`
     - query handler 仍以 `gin.H{"items": ...}` 承载 model slice
     - `CommitShipment` service 对外仍返回 `models.ShipmentRecord`
   - 处理结果：本轮已完成 `inventory query + commit contract` 补缺口
   - 当前结论：已收口，回到 Green

5. `sales_orders`
   - 结论：主链基本 Green
   - 说明：列表 / 详情 / 保存接口已有正式命名 request / response，workflow 挂接已有定向覆盖；当前未命中值得立即开刀的明确 contract Yellow 点。

### 本轮实际改动闭环
本轮第二轮巡检期间，唯一命中的明确 Yellow 缺口为 `inventory`，并已在同轮完成修复：

- 已新增独立 inventory query DTO / mapper
- 已将 inventory query service 切到正式 DTO response
- 已将 inventory query handler 切到正式命名 paged wrapper
- 已将 `CommitShipment` 公开 service 返回值切到 `InventoryShipmentRecordResponse`

### 当前整体状态
- `workflow`：Green
- `production`：Green
- `voucher / finance`：Green
- `inventory`：本轮补缺口后已回到 Green
- `sales_orders`：当前主链基本 Green

### 收尾结论
第二轮 A 级模块 contract 回归巡检已经完成正式收尾：

- 已识别并修复本轮唯一明确 Yellow：`inventory`
- 已确认 `workflow / production / voucher / finance / sales_orders` 当前主链 contract 基本稳定
- `purchase_orders` 已在后续同轮中完成最小闭环收口并通过定向回归
- 当前 A 级已收口主链的主要风险，已从“明显 contract 回退”下降为“后续新增接口的持续防回退治理”
- 本轮后续动作已完成补齐：包括 `purchase_orders` 最小闭环、`sales_orders` 清账与第一批防回退测试

## P0：`inventory query + commit contract` 补缺口（2026-04-07）

### 已执行变更
1. 为 inventory 查询链补独立 DTO / mapper 文件
   - `server/services/inventory_query_dto.go`
   - `server/services/inventory_query_mapper.go`
   - 已新增：
     - `InventoryItemResponse`
     - `InventoryListResponse`
     - `InventoryInboundHistoryResponse`
     - `InventoryShipmentHistoryResponse`

2. inventory query service 已切到正式 DTO contract
   - `server/services/inventory_query_service.go`
   - 已完成：
     - `ListInventory` 返回 `InventoryListResponse`
     - `ListInboundHistory` 返回 `InventoryInboundHistoryResponse`
     - `ListShipmentHistory` 返回 `InventoryShipmentHistoryResponse`

3. inventory query handler 已切到正式命名 wrapper
   - `server/handlers/inventory_query_handlers.go`
   - 不再使用 `gin.H{"items": ...}` 直接承载 `[]models.*`

4. `CommitShipment` service 对外返回值已切到 DTO
   - `server/services/inventory_command_service.go`
   - `CommitShipment(...)` 已改为返回 `InventoryShipmentRecordResponse`
   - `server/handlers/inventory_command_handlers.go` 无需额外改动即可直接消费新的 DTO 返回值

### 保留边界
- 未改 inventory query 分页语义；
- 未改 commit shipment 事务逻辑、库存扣减逻辑与销售履约联动；
- 未改既有中文错误语义与状态码。

### 验证
执行：
```bash
go test ./handlers ./services -run "Inventory"
```

结果：通过。

### 当前结果
- `inventory` 查询链不再由 service 对外返回 `[]models.*`；
- query handler 已切到正式命名 paged response；
- `CommitShipment` service 的公开返回 contract 已与 inventory DTO 体系对齐；
- 第二轮 A 级巡检中命中的 `inventory` Yellow 缺口已完成收口。

## P0：`production` 核心查询链轻量风格统一化（plans / stats / order-progress）（2026-04-07）

### 已执行变更
1. 核心查询链保持既有 query DTO 不变，仅补轻量 wrapper 统一输出风格
   - `server/services/production_query_dto.go`
   - 已新增：
     - `ProductionStatsEnvelopeResponse`
     - `OrderProgressListResponse`

2. 查询接口输出风格已进一步统一
   - `server/handlers/production_plans.go`
   - 已完成：
     - `GetProductionPlansHandler` 保持 `ProductionPlansListResponse`
     - `GetProductionStatsHandler` -> `ProductionStatsEnvelopeResponse`
     - `GetOrderProgressHandler` -> `OrderProgressListResponse`

3. 保留边界
   - 未重做 `production_query_dto.go` 的既有响应字段；
   - 未改 plans / stats / order-progress 的 SQL、聚合逻辑与字段语义；
   - `order-progress` 空数组语义继续保持稳定。

### 验证
执行：
```bash
go test ./handlers ./services -run "Production|Progress|Report|Calendar|Dashboard"
```

结果：通过。

### 当前结果
- `production` 核心查询链 3 个核心入口的输出风格已统一到正式命名 response；
- plans / stats / order-progress 的 contract 可读性和防回退能力进一步增强；
- 当前 `production` Yellow 风险已基本从“风格不一致”降到“已完成主链统一化”。

## P0：`production` Yellow 缺口统一化（第一步：主配置链读接口 wrapper 统一）（2026-04-07）

### 已执行变更
1. 为 production 主配置链读接口补充正式命名 response wrapper
   - `server/services/production_dto.go`
   - `server/services/production_process_dto.go`
   - 已新增：
     - `ProductionLinesResponse`
     - `ProcessStepsResponse`
     - `StationMappingsResponse`

2. 主配置链读接口已切到统一命名 response
   - `server/handlers/production_topology_handlers.go`
     - `GetProductionLinesHandler` -> `ProductionLinesResponse`
   - `server/handlers/production_process_handlers.go`
     - `GetProcessStepsHandler` -> `ProcessStepsResponse`
   - `server/handlers/production_station_mapping_handlers.go`
     - `GetStationMappingsHandler` -> `StationMappingsResponse`

3. 保留边界
   - `production topology` / `process step` 保存逻辑未改；
   - `station mapping` 数据语义保持 `StationProcessMappingsResponse` 不变，仅在 handler 出口补统一 wrapper；
   - 主配置链字段语义与错误语义未漂移。

### 验证
执行：
```bash
go test ./handlers ./services -run "Production|Topology|Process|Station|Progress"
```

结果：通过。

### 当前结果
- `production` 主配置链读接口的 contract 风格已完成统一；
- `GetProductionLinesHandler`、`GetProcessStepsHandler`、`GetStationMappingsHandler` 不再直接返回裸 DTO slice / map；
- 当前若继续做 `production` Yellow 统一化，可把重点转向核心查询链的轻量风格统一，而不是主配置链。

## P0：`workflow` contract 补缺口（Yellow 缺口小闭环）（2026-04-07）

### 已执行变更
1. 收口 `workflow` service 对外公开返回 contract
   - `server/services/workflow_service.go`
   - 已补齐：
     - `ApproveWorkflowTask(...)` 返回 `WorkflowInstanceResponse`
     - `RejectWorkflowTask(...)` 返回 `WorkflowInstanceResponse`
     - `ListWorkflowTasks(...)` 返回 `[]WorkflowTaskResponse`

2. handler 已同步改为直接消费 service 返回的正式 DTO
   - `server/handlers/workflow.go`
   - 已完成：
     - task list handler 不再对 service 返回值做重复 mapper
     - 审批/驳回 handler 不再持有 `models.WorkflowInstance` 作为对外结构

3. 保留边界
   - workflow 审批/驳回事务逻辑未重写；
   - 状态流转、任务分配与错误语义未改动；
   - 仅修正了 service 对外 contract 与 handler response contract 的不一致。

### 验证
执行：
```bash
go test ./handlers ./services -run "Workflow"
```

结果：通过。

### 当前结果
- `workflow` 已补齐 service 对外仍收发 `models.Workflow*` 的主要 Yellow 缺口；
- service / handler / mapper 的 contract 边界继续保持一致；
- 后续新增 workflow 接口时，回退到 model-first 的风险进一步降低。

## P0：`voucher / finance` 核心读接口 DTO 加固（2026-04-07）

### 已执行变更
1. 将 voucher 读接口 DTO / mapper 拆到独立文件
   - `server/services/voucher_dto.go`
   - `server/services/voucher_mapper.go`
   - 已新增：
     - `FinancialVoucherQueryRequest`
     - `FinancialVoucherResponse`
     - `ClearingEntryResponse`

2. 核心读接口已切到正式 response contract
   - `server/handlers/voucher_handlers.go`
   - 已收口接口：
     - `GetFinancialVouchersHandler`
     - `GetFinancialVoucherHandler`

3. 保留边界
   - `sourceType / sourceRefId / status / includeEntries` 过滤语义未改；
   - list 空数据仍稳定返回 `[]`；
   - detail 仍保持预加载 `Entries` 的行为。

4. 测试已切到正式 response DTO
   - `server/handlers/voucher_handlers_test.go`
   - list/detail 断言已从 model 读取切到 `FinancialVoucherResponse`。

### 验证
执行：
```bash
go test ./handlers ./routes -run "Voucher|Finance"
```

结果：通过。

### 当前结果
- voucher / finance 核心读接口已建立稳定 DTO 边界；
- list/detail response 不再默认直出 `models.FinancialVoucher`；
- 过滤、空数组语义与 includeEntries 行为未被 DTO 加固破坏。

## P0：`inventory` 命令链 DTO 收口（第一轮：inbound / shipment / commit / void）（2026-04-07）

### 已执行变更
1. 将库存命令链 DTO / mapper 拆到独立文件
   - `server/services/inventory_command_dto.go`
   - `server/services/inventory_command_mapper.go`
   - 第一轮已新增：
     - `RecordInboundRequest`
     - `RecordShipmentRequest`
     - `InventoryInboundRecordResponse`
     - `InventoryShipmentRecordResponse`
     - `VoidShipmentRequest`
     - `InventoryCommandStatusResponse`

2. 第一批高风险命令链 handler 已切到正式 DTO contract
   - `server/handlers/inventory_command_handlers.go`
   - 已收口接口：
     - `RecordInboundHandler`
     - `RecordShipmentHandler`
     - `CommitShipmentHandler`
     - `VoidShipmentHandler`

3. 保留边界
   - `RecordInbound` / `CommitShipment` / `VoidShipment` 的事务逻辑未重写；
   - 采购收货、销售出库、库存数量/成本、凭证联动逻辑未改写；
   - 冲突语义（如 `ErrVoidInProgress`）与现有中文错误码未漂移。

### 验证
执行：
```bash
go test ./handlers ./services ./routes -run "Inventory|Inbound|Shipment|Commit|Void|PurchaseOrder|SalesOrder"
```

结果：通过。

### 当前结果
- `inventory` 命令链第一轮已完成主命令入口的 request/response contract 收口；
- 入库、出库、提交、作废相关联动与错误语义未被 DTO 收口破坏；
- 当前仍保留后续可扩范围：transfer / reconcile / bulk sync 与 inventory 查询链 contract 收口。

## P0：`production` 查询/报表类 contract 收口（第二阶段调查结论：当前 `/production` 下无新增聚合接口待收口）（2026-04-07）

### 已执行复核
1. 再次复核 `server/routes/routes_production.go`
   - 当前 `/production` 只读聚合查询入口仍只有：
     - `GET /production/plans`
     - `GET /production/stats`
     - `GET /production/order-progress`

2. 再次复核 `server/handlers`
   - 当前未发现额外挂载到 `/production` 路由组的 `report / dashboard / calendar` 聚合只读接口；
   - 相关名称相似接口已落在其它域（如 equipment / audit / experimental），不属于本轮 `production` 子链路范围。

### 结论
- 第一阶段已经完成当前 `/production` 查询聚合接口的全部 response contract 收口；
- 第二阶段继续排查后，当前后端代码中没有新的 `/production` 聚合只读接口可继续收口；
- 为避免误扩到非 production 域，本阶段不做额外业务代码修改。

### 当前状态
- `production` 查询/报表类在当前后端路由落点下，已无剩余第二阶段代码改造项；
- 若后续要继续，应重新定义范围，转入非 `/production` 域接口（例如 equipment dashboard / audit timeline / experimental reports）或前端 contract 层。

## P0：`production` 查询/报表类 contract 收口（第一阶段：plans/stats/order-progress）（2026-04-07）

### 已执行变更
1. 将 production 查询 DTO / mapper 拆到独立文件
   - `server/services/production_query_dto.go`
   - `server/services/production_query_mapper.go`
   - 已新增：
     - `ProductionPlanResponse`
     - `ProductionPlansListResponse`
     - `ProductionStatsResponse`
     - `OrderProgressItemResponse`
     - `ProductionTaskResponse`

2. 第一批只读查询接口已切到正式 response contract
   - `server/handlers/production_plans.go`
   - 已收口接口：
     - `GetProductionPlansHandler`
     - `GetProductionStatsHandler`
     - `GetOrderProgressHandler`

3. 保留边界
   - 生产计划查询、生产统计、订单进度 SQL / 聚合逻辑未重写；
   - 字段语义保持不变；
   - `GetOrderProgressHandler` 空数据继续稳定返回 `[]`，不回退到 `null`。

### 验证
执行：
```bash
go test ./handlers ./services -run "Production|Progress|Report|Calendar|Dashboard"
```

结果：通过。

### 当前结果
- production 查询/报表类第一阶段已完成 plans/stats/order-progress 的 response contract 收口；
- 匿名 response 与直出 model 的高风险入口已建立正式命名 response type；
- 历史 `[]` / `null` 稳定性问题未回归。

## P0：`production` DTO 收口（第二轮：`ProcessStep + StationProcessMapping` 最小闭环）（2026-04-07）

### 已执行变更
1. 将 `ProcessStep` / `StationProcessMapping` DTO 拆到独立文件
   - `server/services/production_process_dto.go`
   - `server/services/production_process_mapper.go`
   - 已新增：
     - `SaveProcessStepHandlerRequest`
     - `StationProcessMappingHandlerRequest`
     - `MessageResponse`
     - `StationProcessMappingsResponse`

2. `ProcessStep` 主链已切到稳定 DTO contract
   - `server/handlers/production_process_handlers.go`
   - `server/services/production_service.go`
   - 已完成：
     - `GetProcessStepsHandler` 不再返回 `models.ProcessStep`
     - `SaveProcessStepHandler` 不再绑定匿名 `models.ProcessStep` 请求体
     - `SaveProcessStepRequest` 已切到 `ProcessStepDTO`

3. `StationProcessMapping` 主链已切到正式 request/response type
   - `server/handlers/production_station_mapping_handlers.go`
   - `server/services/production_service.go`
   - 已完成：
     - 绑定请求体不再使用匿名 struct
     - `ListStationMappings` 返回已收口为正式命名 response type
     - 成功 message 返回已切到统一 `MessageResponse`

4. 补充最小 contract 测试
   - `server/handlers/production_process_handlers_test.go`
   - `server/handlers/production_station_mapping_handlers_test.go`
   - `server/services/production_service_test.go`

### 验证
执行：
```bash
go test ./services ./handlers -run "Production|Process|Station"
```

结果：通过。

### 当前结果
- `production` 配置类子链路已形成 `ProcessStep + StationProcessMapping` 的最小 DTO 闭环；
- handler / service 已不再继续把匿名请求体或原始 model 直接当成默认外部 contract；
- 保存、删除、绑定解绑与 mapping 查询相关回归未被破坏。

## P0：`production topology` DTO 收口（第一轮：主链 request contract 边界加固）（2026-04-07）

### 已执行变更
1. 将保存产线入口的匿名请求体收口为正式 DTO
   - `server/services/production_dto.go`
   - 已新增：
     - `SaveProductionLineHandlerRequest`

2. `SaveProductionLineHandler` 已切到正式 request DTO
   - `server/handlers/production_topology_handlers.go`
   - 当前不再在 handler 内部使用匿名 struct 组合 `ProductionLineDTO + authCode`。

3. 补充最小 request contract 绑定测试
   - `server/handlers/production_topology_handlers_test.go`
   - 已覆盖 `SaveProductionLineHandlerRequest` 的 JSON 绑定，固定 `ProductionLineDTO + authCode` 的入口 contract。

### 验证
执行：
```bash
go test ./services ./handlers -run "Production|Topology"
```

结果：通过。

### 当前结果
- `production topology` 主链继续复用既有 `ProductionLineDTO` / `SaveProductionLineRequest`；
- 本轮已补齐 handler 入口 request contract 的正式 DTO 边界；
- 版本冲突、授权码校验与 production topology 主链回归未被破坏。

## P0：`purchase_orders` DTO 改造（第二轮：收货确认返回 contract 收口）（2026-04-06）

### 已执行变更
1. 为采购收货确认结果补充最小 response DTO
   - `server/services/purchase_order_dto.go`
   - 已新增：
     - `InboundRecordResponse`
     - `ConfirmPurchaseReceiptResponse`

2. 为采购收货确认结果补充 mapper
   - `server/services/purchase_order_mapper.go`
   - 已新增：
     - `mapInboundRecordToResponse(...)`
     - `MapConfirmPurchaseReceiptResultToResponse(...)`

3. `ConfirmPurchaseReceiptHandler` 成功返回已统一切到稳定 contract
   - `server/handlers/purchase_orders.go`
   - `purchaseOrder` 当前统一复用第一轮 `PurchaseOrderResponse`；
   - `createdInboundRecords` 当前不再直接裸返回 `models.InboundRecord`。

### 验证
执行：
```bash
go test ./handlers ./services ./routes -run "PurchaseOrder|SalesOrder|Workflow|Trading|Receipt|Inbound"
```

结果：通过。

### 当前结果
- 采购单第二轮已完成收货确认返回 contract 与第一轮 DTO 体系对齐；
- 采购状态重算、入库记录创建与 trading/workflow 相关回归未被破坏；
- 当前采购单主链已形成“列表/详情/保存/收货确认返回”稳定 contract 边界。

## P0：`purchase_orders` DTO 改造（第一轮：保存/读接口 contract 收口）（2026-04-06）

### 已执行变更
1. 新增采购单 DTO / mapper 文件
   - `server/services/purchase_order_dto.go`
   - `server/services/purchase_order_mapper.go`
   - 第一轮已新增：
     - `SavePurchaseOrderRequest`
     - `PurchaseOrderResponse`
     - `PurchaseOrderListItemResponse`
     - `PurchaseOrderListResponse`
     - `PurchaseOrderLineRequest`
     - `PurchaseOrderLineResponse`

2. `purchase_orders` handler 第一轮已切到 DTO contract
   - `server/handlers/purchase_orders.go`
   - 已收口接口：
     - `GetPurchaseOrdersHandler`
     - `GetPurchaseOrderHandler`
     - `SavePurchaseOrderHandler`
     - `GetDeletedPurchaseOrdersHandler`
   - 当前这些接口已不再直接把 `models.PurchaseOrder` 裸作为对外 request/response contract。

3. 保留边界
   - 采购单新建自动挂接 workflow 实例的事务逻辑保持不变；
   - 明细行替换与版本冲突处理逻辑保持不变；
   - 本轮未扩展到收货/库存/凭证下游 DTO 收口。

### 验证
执行：
```bash
go test ./handlers ./services ./routes -run "PurchaseOrder|SalesOrder|Workflow|Trading"
```

结果：通过。

### 当前结果
- 采购单主链第一轮已建立独立 Save/Response contract；
- workflow 挂接、版本冲突处理与采购/销售 trading 回归未被 DTO 收口破坏；
- 当前仍保留后续可扩范围：采购单 patch/sync 进一步细化，以及收货/库存/凭证相关子链路 contract 收口。

## P0：`sales_orders` DTO 改造（第一轮：保存/批量同步/读接口 contract 收口）（2026-04-06）

### 已执行变更
1. 新增销售订单 DTO / mapper 文件
   - `server/services/sales_order_dto.go`
   - `server/services/sales_order_mapper.go`
   - 第一轮已新增：
     - `SaveSalesOrderRequest`
     - `PatchSalesOrderRequest`
     - `SalesOrderResponse`
     - `SalesOrderListItemResponse`
     - `SalesOrderListResponse`
     - `BulkSyncSalesOrdersResponse`
     - `SalesOrderLineRequest`
     - `SalesOrderLineResponse`

2. `sales_orders` handler 第一轮已切到 DTO contract
   - `server/handlers/sales_orders.go`
   - 已收口接口：
     - `GetSalesOrdersHandler`
     - `GetSalesOrderHandler`
     - `GetSalesOrderByNoHandler`
     - `SaveSalesOrderHandler`
     - `BulkSyncSalesOrdersHandler`
   - 当前这些接口已不再直接把 `models.SalesOrder` 裸作为对外 request/response contract。

3. 保留边界
   - `saveSalesOrderForBulkSync(...)` 的 sparse update 保护逻辑保持不变；
   - `requirements`、`workflow_instance_id` 的未提交字段保留语义保持不变；
   - 销售订单新建时自动挂接 workflow 实例的事务逻辑未重写。

### 验证
执行：
```bash
go test ./handlers ./services ./routes -run "PurchaseOrder|SalesOrder|Workflow|Trading"
```

结果：通过。

### 当前结果
- 销售订单主链第一轮已建立独立 Save/Patch/Response contract；
- `workflow_instance_id` 挂接与 sparse update 保护未被 DTO 收口破坏；
- 当前仍保留后续可扩范围：采购单 DTO 收口与其它 trading 子域 contract 收口。

## P0：`workflow` DTO 改造（第二轮：审批/驳回 response contract 收口）（2026-04-06）

### 已执行变更
1. 审批/驳回请求体复用既有 DTO
   - `server/handlers/workflow.go`
   - `ApproveWorkflowTaskHandler` / `RejectWorkflowTaskHandler` 当前已统一复用第一轮已有 `WorkflowTaskDecisionRequest`。

2. 审批/驳回成功返回已统一切到 `WorkflowInstanceResponse`
   - `server/handlers/workflow.go`
   - 成功分支当前不再直接返回 `models.WorkflowInstance`；
   - 已统一通过 `services.MapWorkflowInstanceToResponse(instance)` 返回。

3. 保持边界不变
   - `services.ApproveWorkflowTask(...)` / `RejectWorkflowTask(...)` 的事务推进逻辑未重写；
   - 错误分支状态码与中文错误语义保持不变。

### 验证
执行：
```bash
go test ./services ./handlers ./routes -run "Workflow|Approval|Trading"
```

结果：通过。

### 当前结果
- `workflow` 第二轮已完成审批/驳回成功返回 contract 与第一轮 DTO 体系对齐；
- workflow 审批主链、审批错误分支与采购/销售建单自动挂 workflow 回归未被破坏；
- 当前 `workflow` 第一、二轮 DTO 收口已形成完整的查询/创建/审批返回 contract 边界。

## P0：`workflow` DTO 改造（第一轮：definition / instance / task 查询与创建接口收口）（2026-04-06）

### 已执行变更
1. 新增 workflow DTO / mapper 文件
   - `server/services/workflow_dto.go`
   - `server/services/workflow_mapper.go`
   - 第一轮已新增：
     - `SaveWorkflowDefinitionRequest`
     - `PatchWorkflowDefinitionRequest`
     - `CreateWorkflowInstanceRequest`
     - `WorkflowTaskDecisionRequest`
     - `WorkflowDefinitionResponse`
     - `WorkflowInstanceResponse`
     - `WorkflowInstanceListItemResponse`
     - `WorkflowInstanceListResponse`
     - `WorkflowTaskResponse`

2. `workflow` handler 第一轮接口已切到 DTO contract
   - `server/handlers/workflow.go`
   - 已收口接口：
     - `GetWorkflowDefinitionsHandler`
     - `SaveWorkflowDefinitionHandler`
     - `GetWorkflowInstancesHandler`
     - `CreateWorkflowInstanceHandler`
     - `GetWorkflowTasksHandler`
   - 当前这些接口已不再把 `models.WorkflowDefinition / WorkflowInstance / WorkflowTask` 直接作为对外响应结构。

3. 保留边界
   - 审批/驳回任务的返回 contract (`ApproveWorkflowTaskHandler` / `RejectWorkflowTaskHandler`) 暂未纳入本轮收口；
   - workflow 核心事务推进逻辑未重写，仍保持原有业务行为。

### 验证
执行：
```bash
go test ./services ./handlers ./routes -run "Workflow|Approval|Trading"
```

结果：通过。

### 当前结果
- `workflow` 第一轮查询与创建接口已建立独立 Request / Response / mapper 边界；
- 采购/销售建单自动挂接 workflow 的既有回归未被破坏；
- 当前仍保留第二轮待做项：审批/驳回返回 contract 收口。

## P0：根因修复（`save_patch_semantics_test.go` 收口旧 `services.SalesOrderDTO` 依赖）（2026-04-06）

### 已执行变更
1. 测试已回归真实保存 contract
   - `server/handlers/save_patch_semantics_test.go`
   - 已移除对旧 `services.SalesOrderDTO` 的依赖；
   - 当前测试直接使用 `models.SalesOrder` 调用 `saveSalesOrderForBulkSync(tx, *models.SalesOrder)`。

2. PATCH / 稀疏更新语义验证保持不变
   - 当前仍验证：
     - 已提交字段 `orderName` 可以更新；
     - 未提交字段 `requirements` 保留原值；
     - 未提交字段 `workflow_instance_id` 保留原值。

### 验证
执行：
```bash
go test ./handlers -run SavePatchSemantics
```

结果：通过。

### 当前结果
- `handlers` 包内由 `services.SalesOrderDTO` 引发的这条编译断链已从根源收口；
- 未通过补回旧 DTO 制造兼容壳，而是让测试重新对齐了真实 `models.SalesOrder` 保存语义；
- `save_patch_semantics_test.go` 当前验证的是实际在运行的 PATCH 保护逻辑，而不是历史遗留中间 contract。

## P0：缺陷修复（production DTO 升级后 `production_topology_handlers.go` / `production_service.go` 断链恢复）（2026-04-06）

### 已执行变更
1. 恢复 production 领域后端 DTO / mapper 统一入口
   - `server/services/production_dto.go`
   - 已新增并恢复：
     - `ProductionLineDTO`
     - `LineSegmentDTO`
     - `ProcessStepDTO`
     - `mapProductionLineDTOToModel(...)`
     - `mapProductionLineToDTO(...)`
     - `mapProductionLinesToDTO(...)`
   - 当前 `DTO <-> models.ProductionLine / LineSegment / ProcessStep` 映射已重新连回 production service 主链。

2. `production_service.go` 旧引用链已恢复可编译
   - `SaveProductionLineRequest.Line ProductionLineDTO`
   - `ListProductionLines() -> []ProductionLineDTO`
   - `SaveProductionLine(...) -> ProductionLineDTO`
   - 以上入口当前都已重新解析到统一 DTO / mapper 文件，不再引用缺失符号。

3. `production_topology_handlers.go` 保存链已重新接回
   - `SaveProductionLineHandler` 当前继续按既有 contract 绑定 `services.ProductionLineDTO + authCode`；
   - `GetProductionLinesHandler` / `SaveProductionLineHandler` 均已能重新解析 `services` 层返回类型。

### 验证
执行：
```bash
go test ./services -run Production
```

结果：通过。

### 当前结果
- `production_service.go` 中因 DTO 升级造成的核心缺失符号已恢复；
- `production_service_test.go` 已重新通过编译与定向测试；
- `production_topology_handlers.go -> services.SaveProductionLine(...)` 这条调用链已重新接回统一 DTO contract。

### 验证阻塞说明
- 继续执行 `go test ./handlers -run Production` 时，当前被 **无关既有断链** 阻塞：
  - `handlers/save_patch_semantics_test.go:162`
  - `undefined: services.SalesOrderDTO`
- 该错误不属于本次 production 拓扑 DTO 修复引入的问题，但会阻止当前仓库的 `handlers` 包整包编译验证。

## P0：前端消费边界制度化（第三批 route-access 投影层语义收口）（2026-04-06）

### 已执行变更
1. `src/features/authz/guards/route-access.ts`
   - 已确认该文件当前无业务调用方直接导入；
   - 已将其共享导出语义收口为“权限快照投影/匹配工具”，不再使用容易被误解为前端裁决入口的 access 命名。

2. 导出命名已收紧
   - `getRequiredPermissionIdsForPath` -> `getProjectedPermissionIdsForPath`
   - `canAccessPath` -> `matchesPathPermissionProjection`
   - `getAccessibleTabs` -> `getProjectedTabsFromPermissionSnapshot`

### 当前结果
- `route-access.ts` 当前语义已明确为：基于后端权限快照的前端路由 / Tab 投影工具。
- 本次改动未把该文件升级为新的前端权限裁决器，也未新增前端硬拦截。
- 第三批收口后，前端共享层中最容易误导为“前端 guard 主入口”的命名已进一步减少。

### 备注
- 由于当前调用面搜索为空，本批不需要经历“过渡别名 -> 迁移 -> 删除旧名”的渐进阶段，直接完成共享入口收口。

## P0：前端消费边界制度化（第四阶段：定向搜索与最小验证）（2026-04-06）

### 已执行验证
1. 定向旧命名搜索
   - 搜索关键词：
     - `usePermissionPassthrough`
     - `PermissionPassthrough`
     - `useProtectedAction`
     - `canAccessRouteEntry`
     - `getAccessibleRouteEntries`
     - `getAccessibleNavGroups`
     - `canAccessPath`
     - `getAccessibleTabs`
     - `getRequiredPermissionIdsForPath`
   - 结果：业务导出与业务调用残留均已清空。
   - 唯一残留命中为 `PermissionPassthroughProps` 接口类型名；该项不再承载旧组件导出或业务消费语义。

2. 最小类型验证
   - 执行：
   ```bash
   pnpm exec tsc --noEmit
   ```
   - 结果：通过。

### 当前结果
- 前端消费边界制度化本轮涉及的三批共享入口收口，已完成最小搜索验证与类型校验。
- 当前旧语义命名在业务调用层已基本清零。

### 保留项
- 仓内仍存在若干既有 lint / 类型债（如个别 `any`、effect setState、Tailwind class 简写建议）；本轮未扩展处理。

## P0：缺陷修复（产线拓扑保存 `authCode` 缺失与 403 提示拆分）（2026-04-06）

### 已执行变更
1. 产线保存请求已补齐可选 `authCode`
   - `src/features/production-shared/services/production-resource-service.ts`
   - `saveLine(...)` 已支持第二个可选入参 `authCode`
   - 请求体会按后端既有合同补充 `{ ...line, authCode }`

2. 拓扑编辑保存链已接入授权弹窗
   - `src/features/production-shared/tabs/line-mgmt/components/line-card.tsx`
   - 对已有产线执行拓扑变更（如“手动搭建首个工段”）时，不再直接裸调保存；
   - 当前会先走 `SecurityAuthDialog`，确认后再把授权码透传给保存链。

3. 已有产线基础信息编辑链也同步补齐授权码透传
   - `src/features/production-shared/tabs/line-mgmt/components/line-list.tsx`
   - 当前编辑已有产线基础信息时，会把授权弹窗确认得到的 `authCode` 保留到对话框提交阶段，再透传到 `onUpdate(...)`。

4. 403 提示已拆分
   - `src/features/production-shared/tabs/line-mgmt/index.tsx`
   - `src/locales/messages/zh-CN/orgPersonnel.ts`
   - 当前会区分：
     - 拓扑授权码无效；
     - 当前账号缺少产线配置维护权限。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 当前结果
- 点击“手动搭建首个工段”时，已有产线拓扑保存链已能携带 `authCode`。
- 前端不再把所有 403 都统一误提示为“检查授权码”。
- 本次修复未修改后端权限/授权规则，仅补齐前端传参与错误展示。

## 产线拓扑架构收口：主拓扑强制回归 `产线 -> 工段 -> 工序`，Station 去挂靠为独立能力映射子域（2026-04-06）

### 已实施变更
1. 后端主拓扑模型 / contract / 持久化收口为三层
   - `server/models/production.go`
     - `LineSegment` 已移除 `JobCategories` 字段，主拓扑模型不再承载 `JobCategory -> Station` 中间层。
   - `server/services/production_line_contract.go`
     - 删除 `segment.Processes` 为空时回退扫描 `JobCategory / Station` 的兼容壳。
     - `ProductionLineDTO <-> models.ProductionLine` 映射已严格限定为 `ProductionLine -> LineSegment -> ProcessStep`。
   - `server/services/production_service.go`
     - `SaveProductionLine` 已删除 `jobIDs / stationIDs` 收集与清理逻辑。
     - `collectProductionAssociationIDs()` 已仅保留 `segmentIDs / processIDs`。
   - `server/repositories/production_repository.go`
     - `ProductionRepository` 已移除 `DeleteProductionStationsNotIn` / `DeleteJobCategoriesNotIn` 主链接口。
     - `ListProductionLines()` 已取消 `Segments.JobCategories.Stations.Processes` 预加载。
     - `SaveProductionLine()` 已改为显式保存主表、工段、工序映射，避免主链继续依赖旧五层与 GORM 隐式 many-to-many 自动写入。

2. 后端隐藏消费链同步收口
   - `server/services/wheel_trace_lookup_service.go`
     - 产线锚点解析已删除对 `Segments.JobCategories.Stations` 的侧读。
     - 当前仅基于 `line -> segment -> process` 生成追溯锚点，避免 `wheel_trace` 继续耦合旧拓扑层级。

3. 前端主消费面语义同步到三层拓扑
   - `src/features/production-shared/tabs/line-mgmt/components/topology-editor/segment-node.tsx`
     - 本地编辑逻辑已改为 `handleAddProcess / handleUpdateProcess / handleRemoveProcess`。
   - `src/features/production-shared/tabs/topology-template/components/template-card.tsx`
     - 模板内 `segment.processes` 的本地编辑逻辑已统一为“工序”语义。
     - 新增模板文案键：`process / addProcess / defaultProcess / deleteProcessTitle / deleteProcessDesc`。
   - `src/locales/messages/zh-CN/orgPersonnel.ts`
   - `src/locales/messages/en-US/orgPersonnel.ts`
     - 已补齐模板卡片“工序”相关中英文文案。

4. Station 旧能力映射子域去挂靠，但接口保留
   - `src/features/production-shared/services/production-resource-service.ts`
     - 新增显式接口：`getProcessCapabilityMappings()`、`assignProcessCapability()`、`removeProcessCapability()`。
     - 底层仍复用 `/production/mappings`、`/production/mappings/assign`、`/production/mappings/remove`，但前端已不再把它包装为主拓扑层级。
   - `src/features/production-shared/hooks/use-work-architecture.ts`
     - 已从 `getJobMappings / assignProcessToJob / removeProcessFromJob` 切换为显式能力映射接口。
   - `src/features/production-shared/tabs/work-architecture/types.ts`
     - `WorkArchitectureMapping` 已明确为 `processNodeId -> processIds[]`。
   - `src/features/production-shared/tabs/work-architecture/components/work-architecture-tree.tsx`
   - `src/features/production-shared/tabs/work-architecture/components/job-category-node.tsx`
   - `src/features/production-shared/tabs/work-architecture/components/station-capabilities-dialog.tsx`
   - `src/features/production-shared/tabs/work-architecture/components/station-node.tsx`
     - 已完成能力映射消费端的接口与 props 对齐，避免继续混用 `job / station` 假语义驱动主拓扑。

5. 定向测试 / 桩同步
   - `server/services/production_service_test.go`
     - 移除已废弃的 `DeleteProductionStationsNotIn` / `DeleteJobCategoriesNotIn` fake repository 桩。
   - `server/repositories/production_repository_test.go`
     - 现有三层主拓扑保存测试已通过，无需保留对旧五层主链的断言前提。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
go test ./services ./repositories
```

结果：通过。

### 当前结果
- 主产线拓扑已从后端模型、DTO、repository、service、前端主消费面统一收口为 `产线 -> 工段 -> 工序` 三层。
- `JobCategory / Station` 已退出主拓扑事实链，不再参与 `ProductionLine` 的主读取、主保存与主投影。
- 旧 `Station` 能力映射链路已保留为独立子域接口，但不再被包装成主拓扑合法层级。
- `wheel_trace` 对旧五层拓扑的侧读耦合已切断，避免后续模块继续反向拉回冗余层级。

## 产线拓扑架构收口第二轮：全仓残留命名净化（2026-04-06）

### 已实施变更
1. 主拓扑 UI 调用层 `job*` 命名清理
   - `src/features/production-shared/tabs/line-mgmt/components/topology-editor/job-category-node.tsx`
     - 已改为导出 `ProcessNode`，props 统一为 `process / onUpdate(process)`。
   - `src/features/production-shared/tabs/line-mgmt/components/topology-editor/segment-node.tsx`
     - 已切换为 `ProcessNode`、`newProcessName`、`addProcess`、`noProcesses`。
   - `src/features/production-shared/tabs/line-mgmt/components/topology/job-node.tsx`
     - 已改为导出 `ProcessNode`，内部 props / 局部变量 / 授权文案 key 统一为 `process*`。
   - `src/features/production-shared/tabs/line-mgmt/components/topology/segment-node.tsx`
     - 已切换到 `ProcessNode` 与 `addProcess`。

2. 文件级入口语义净化
   - 新增 `src/features/production-shared/tabs/line-mgmt/components/topology/process-node.tsx`
   - 新增 `src/features/production-shared/tabs/work-architecture/components/process-capability-node.tsx`
   - 调用方 import 已切换到新文件入口，避免主拓扑继续通过 `job-node`、`job-category-node` 文件名承载核心语义。

3. work-architecture 命名继续去旧壳
   - `src/features/production-shared/tabs/work-architecture/components/segment-node.tsx`
     - 已切换为 `ProcessCapabilityNode`。
   - `src/features/production-shared/tabs/work-architecture/components/process-capability-node.tsx`
     - 能力映射节点语义统一为“工序能力节点”，不再使用 `JobCategoryNode` 命名。

4. locale 中无调用的 `job*` 兼容 key 清理
   - `src/locales/messages/zh-CN/orgPersonnel.ts`
   - `src/locales/messages/en-US/orgPersonnel.ts`
   - 已删除主拓扑与模板区域中不再被调用的 `job / addJob / renameJob / removeJob / newJobName / noJobs / deleteJobTitle / defaultJob` 等兼容 key。
   - 当前仅保留 `process*` 作为主拓扑语义 key。

5. Station 残留边界复核
   - `server/**` 中 `/production/mappings` 与 `Station` 模型仍保留，作为独立能力映射子域继续存在。
   - `src/features/production-shared/tabs/work-architecture/components/station-node.tsx` 仍属于能力映射子域视图，不再视为主拓扑层级。
   - `src/features/production-shared/tabs/line-mgmt/components/topology/station-node.tsx` 与 `topology-editor/station-node.tsx` 当前未检出真实调用，判定为未消费历史壳；本轮未再扩散改动其内部实现。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 当前结果
- `production-shared` 主拓扑代码层已无 `JobCategoryNode / JobNode / addJob / defaultJob / newJobName / noJobs / renameJob / removeJob` 等真实调用残留。
- 主拓扑语义已进一步收敛为 `line / segment / process`，第二轮净化后残留的 `Station` 已明确限定在独立能力映射子域或未消费历史壳中。
- 本轮未误伤交易域 `jobNo`、人事/岗位等真实业务语义命名。

