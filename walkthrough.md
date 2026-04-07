# 变更记录与验证（walkthrough.md）

## P0：`trading` 下一批 DTO 补齐（2026-04-07）

### 本轮目标
本轮聚焦 `trading` 域中已经由前端采用 SDRTS PATCH 语义、但后端仍存在隐式 contract 或 route 缺失的三条链路：

1. `supplier`
2. `purchase-order`
3. `sales-order`

本轮原则：

1. 不修改前端已有 `patchSupplier(...)` / `patchPurchaseOrder(...)` / `patchSalesOrder(...)` 的 URL 与 `DeltaPayload` 结构；
2. 不另起第二套保存主链；
3. 仅把后端从“前端已 patch、后端未正式接入 / 仍隐式绑定模型”的状态收口到正式 DTO 边界。

### 本轮前的问题

#### 1) `supplier`
- 前端已经存在 `patchSupplier(...)`
- 后端此前未正式暴露 `PATCH /suppliers/:id`
- `SaveSupplierHandler` 仍直接绑定 `models.Supplier`

这意味着供应商模块同时存在：
- PATCH route 断链
- handler 直接暴露数据库模型边界

#### 2) `purchase-order`
- 前端已经存在 `patchPurchaseOrder(...)`
- 后端此前未正式暴露 `PATCH /purchase/orders/:id`
- 仅有 `SavePurchaseOrderRequest`，没有正式 patch request DTO

#### 3) `sales-order`
- 后端已经存在 `PatchSalesOrderRequest`
- 已存在 `MapPatchSalesOrderRequestToModel(...)`
- 但此前 route 层未正式接入 `PATCH /sales-orders/:id`

这说明 sales-order 更像“DTO 有一半，正式 PATCH 入口没接完”。

### 已执行变更

#### 1) 为 `supplier` 建立正式 save / patch DTO 边界
更新：
- `server/services/purchase_order_dto.go`
- `server/services/purchase_order_mapper.go`
- `server/handlers/suppliers.go`

新增 / 调整：
- `SaveSupplierRequest`
- `PatchSupplierRequest`
- `PatchDeltaHandlerRequest`
- `MapSaveSupplierRequestToModel(...)`
- `ApplyPatchSupplierRequestToModel(...)`

并将：
- `SaveSupplierHandler`
  - 从直接绑定 `models.Supplier`
  - 改为绑定显式 `SaveSupplierRequest`

- `PatchSupplierHandler`
  - 正式承接前端 `DeltaPayload`
  - 解析 `metadata.version`
  - 显式按允许字段应用 patch

结果：
- `supplier` 不再把数据库模型直接暴露为 handler request 边界；
- 前端 `patchSupplier(...)` 现在有正式 PATCH 路由与 DTO 入口。

#### 2) 为 `purchase-order` 补正式 patch DTO 与 handler
更新：
- `server/services/purchase_order_dto.go`
- `server/services/purchase_order_mapper.go`
- `server/handlers/purchase_orders.go`

新增：
- `PatchPurchaseOrderRequest`
- `MapPatchPurchaseOrderRequestToModel(...)`
- `PatchPurchaseOrderHandler`

处理方式：
- 先读取当前采购单及其 `Lines`
- 将当前对象映射为正式 patch request
- 应用前端传入的 delta 字段
- 继续复用既有采购单保存主链与版本冲突语义

保持不变：
- 收货确认逻辑
- 工作流实例关联逻辑
- 采购单保存的事务主链

#### 3) 为 `sales-order` 正式接入 PATCH handler
更新：
- `server/handlers/sales_orders.go`

新增：
- `PatchSalesOrderHandler`

处理方式：
- 复用已有：
  - `PatchSalesOrderRequest`
  - `MapPatchSalesOrderRequestToModel(...)`
- 从当前订单详情生成 patch request 基线
- 应用 delta 后沿既有更新链保存

结果：
- `sales-order` 从“已有 patch DTO，但 route/handler 未正式接入”收口为完整 PATCH contract。

#### 4) 注册三条正式 PATCH route
更新：
- `server/routes/routes_trading.go`

新增：
- `PATCH /suppliers/:id`
- `PATCH /purchase/orders/:id`
- `PATCH /sales-orders/:id`

结果：
- 与前端已有 `patchSupplier(...)` / `patchPurchaseOrder(...)` / `patchSalesOrder(...)` 请求路径正式对齐。

### 本轮保持不变的边界
- 未修改前端 trading service 的 PATCH URL 与 payload；
- 未改动 purchase / sales workflow 的业务语义；
- 未将本轮扩散为 trading 全域重构；
- 未额外引入“兼容旧 map 更新”的长期双轨实现。

### 验证
执行：
```bash
go test ./handlers ./routes -run "Supplier|PurchaseOrder|SalesOrder|Trading"
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
本轮已完成 `trading` 下一批 DTO 补齐，重点收口：

- `supplier`
- `purchase-order`
- `sales-order`

并修复了三条真实 PATCH 断链：

- `PATCH /suppliers/:id`
- `PATCH /purchase/orders/:id`
- `PATCH /sales-orders/:id`

这使 `trading` 域从“前端已 patch、后端入口不一致”的状态，推进到“正式 PATCH route + DTO + handler 边界已接通”的状态。

## P0：`production line topology` 二次 DTO 收口（2026-04-07）

### 本轮目标
在已经补通 `PATCH /production/lines/:id` 正式 contract 的基础上，继续把 production topology patch 链从“可运行但仍依赖裸 map / raw message”的状态，收口到更明确的 DTO / mapper 边界。

本轮要求：

1. 不改变前端现有 `DeltaPayload` 提交结构；
2. 不改变后端现有路由与 API path；
3. 不另起第二套 topology 持久化逻辑；
4. 继续复用 `SaveProductionLine(...)` 主链。

### 本轮前的问题
上一轮虽然已经补齐 production line PATCH contract，但中间层仍存在两个遗留问题：

1. `server/services/production_dto.go`
   - `PatchProductionLineHandlerRequest.Delta` 仍是 `map[string]json.RawMessage`

2. `server/services/production_service.go`
   - `PatchProductionLineRequest.Delta` 仍是 `map[string]json.RawMessage`
   - `applyProductionLineDelta(...)` 仍依赖 `switch key` + 手写字段解释

这意味着：
- 当前链路虽然能工作；
- 但 topology 字段一旦继续演进，仍容易退回“隐式 contract + 运行时解析”的漂移模式。

### 已执行变更

#### 1) 为 production patch 新增显式 delta DTO
更新：
- `server/services/production_dto.go`

新增：
- `DeltaItemDTO`
- `PatchProductionLineDeltaDTO`

当前 patch delta 字段明确为：
- `code`
- `name`
- `description`
- `isActive`
- `segments`

作用：
- 将 production topology patch 的允许字段从裸 `map` 收口成显式 DTO；
- 保持对前端 SDRTS `DeltaItem { o, n }` 结构的正式承接。

#### 2) 收口 service 层 patch request 与 delta 应用逻辑
更新：
- `server/services/production_service.go`

调整：
- `PatchProductionLineRequest.Delta` 改为 `PatchProductionLineDeltaDTO`
- `applyProductionLineDelta(...)` 改为面向显式 delta DTO，而非 `switch key`
- 新增/保留统一 helper：
  - `unmarshalDeltaItemNewValue(...)`

结果：
- patch 入口不再依赖 service 层裸 `map[string]json.RawMessage`；
- topology patch 字段解释边界更明确；
- 仍保持“先读取完整现状，再应用 delta，再复用 `SaveProductionLine(...)` 主链”的策略不变。

#### 3) 对齐 handler / service 回归测试
更新：
- `server/handlers/production_topology_handlers_test.go`
- `server/services/production_service_test.go`

调整：
- handler binding 测试改为构造 `PatchProductionLineDeltaDTO`
- service patch 回归测试改为构造 `DeltaItemDTO` + `PatchProductionLineDeltaDTO`

作用：
- 锁住 production topology patch contract 的显式 DTO 形状；
- 防止未来又回退到裸 `map/raw message` 的测试构造方式。

### 保持不变的边界
- 未修改前端 `productionResourceService.patchLine(...)` 提交格式；
- 未修改 `PATCH /production/lines/:id` 路由与路径；
- 未改变拓扑授权码、版本冲突、事务保存的主逻辑；
- 未引入第二套 production topology 保存实现。

### 验证
执行：
```bash
go test ./handlers ./services ./routes -run "Production|Topology"
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
production line topology patch 链已从：

- `map[string]json.RawMessage`
- `switch key`
- 运行时隐式字段解释

进一步收口为：

- `PatchProductionLineDeltaDTO`
- `DeltaItemDTO`
- 显式的 delta 应用边界

这使 production topology 在 DTO 补齐专项中，从“PATCH contract 已补通”进一步提升到“patch DTO 边界已正式化”的状态。

## P0：`use-users-action-dialog-sync` 测试工厂重建（2026-04-07）

### 根因结论
本轮不是给 `use-users-action-dialog-sync.test.ts` 中每个报错对象逐处补 `version: 1`，而是修复一类更底层的测试数据构造问题：**测试仍在直接手写正式 `Employee` / `Role` 对象，已经脱离正式 schema 演进。**

已确认事实：

1. `src/features/org-personnel/data/schema.ts`
   - 正式 `Employee` schema 已要求 `version`

2. `src/features/system-mgmt/data/role-schema.ts`
   - 正式 `Role` schema 已要求 `version`

3. `src/features/users/components/users-action-dialog.shared.ts`
   - `EmployeeOption.raw` 明确要求正式 `Employee`

4. `src/features/users/hooks/use-users-action-dialog-sync.test.ts`
   - 仍在直接手写：
     - `employees[].raw`
     - `dynamicRoles[]`
   - 导致 schema 演进后，测试在严格模式下集中报错。

### 需要纠正的误判
本轮并不是“项目里没有测试工厂”。

当前已存在：

- `src/features/users/test-factories.ts`
  - `createTestUser`
- `src/features/system-mgmt/test-factories.ts`
  - `createTestRole`

因此真正缺的不是第二套 User / Role mock 体系，而是：

1. 缺少 `Employee` 共享测试工厂；
2. 目标测试文件没有复用已有 `createTestRole`；
3. 测试仍在直接手写正式对象。

### 已执行变更

#### 1) 新增 Employee 共享测试工厂
新增：
- `src/features/org-personnel/test-factories.ts`

新增：
- `createTestEmployee(overrides?: Partial<Employee>)`

默认补齐：
- `id`
- `staffId`
- `name`
- `phone`
- `status`
- `deptId`
- `lineId`
- `processId`
- `version`

作用：
- 让测试层通过单一入口构造正式 `Employee`；
- 后续如 `Employee` schema 再扩字段，只需修改工厂一处。

#### 2) 改造 `use-users-action-dialog-sync.test.ts`
更新：
- `src/features/users/hooks/use-users-action-dialog-sync.test.ts`

调整：
- 引入 `createTestEmployee`
- 引入现有 `createTestRole`
- 补 `createEmployeeOption(...)` 轻量装配函数
- 移除原始 `employees[].raw` / `dynamicRoles[]` 字面量

作用：
- 让测试数据重新对齐正式类型边界；
- 保持测试业务语义不变，不改 hook 本身逻辑。

### 明确不做事项
- 未逐处手工补 `version: 1`；
- 未新建第二套 `Role` mock 工厂；
- 未修改 `use-users-action-dialog-sync.ts` 的业务逻辑；
- 未扩散到 `User` / `Role` 正式 schema 改造。

### 验证
执行：
```bash
pnpm exec vitest run src/features/users/hooks/use-users-action-dialog-sync.test.ts
pnpm exec tsc --noEmit
```

结果：通过。

### 本轮结论
本轮已经把 `use-users-action-dialog-sync.test.ts` 从“硬编码正式对象、随 schema 演进脆裂”的状态，收口到“共享工厂 + 正式类型对齐”的稳定边界。

## P0：DTO 边界补齐专项 Phase A（2026-04-07）

### 本批目标
按已批准规划，优先处理 `equipment-tooling` 第一批高风险模块：

1. `molds`
2. `furnaces`
3. `partners`
4. `drawings`

目标不是继续“前端加字段、后端补 switch-case”，而是把这批模块的保存/更新入口从隐式 JSON map 收口为显式 DTO 边界。

### 本批前的主要问题
1. 多个 handler 仍依赖 `decodeJSONBodyMap(...)` + `map[string]json.RawMessage`；
2. `SaveXxxHandler` 同时承担创建与更新语义，导致 contract 边界含混；
3. 前端已使用 SDRTS `DeltaPayload`，但后端 patch 入口并未统一按 `DeltaItem { o, n }` 解析；
4. `partners` 与 `drawings` 前端已有 PATCH 调用，但后端 equipment routes 未完整注册对应 PATCH 路由；
5. `drawings` 同时承载图纸元数据与日志语义，如果继续靠 raw map 更新，后续字段演进容易再次漂移。

### 已执行变更

#### 1) 新增 equipment assets DTO 文件
新增：
- `server/services/equipment_assets_dto.go`

包含：
- `DeltaMetadata`
- `DeltaHandlerRequest`
- `SaveMoldRequest`
- `SaveFurnaceRequest`
- `SaveEquipmentPartnerRequest`
- `SaveMoldDrawingRequest`

作用：
- 为 equipment-tooling 第一批模块建立统一 request DTO 入口；
- 不再让 handler 直接面向任意 JSON body 做字段解释。

#### 2) 抽出通用 SDRTS DeltaItem 解包 helper
更新：
- `server/handlers/json_utils.go`

新增：
- `extractDeltaNewValue(raw)`
- `parseOptionalTimeValue(raw)`

作用：
- 统一解析 `DeltaItem { o, n }`；
- 统一处理可空时间字段；
- 避免 `molds/furnaces/partners/drawings` 各自重复手写 `json.RawMessage` 解包逻辑。

#### 3) 收口 `molds` handler
更新：
- `server/handlers/molds.go`

调整：
- `SaveMoldHandler` 改为绑定 `services.SaveMoldRequest`
- `PatchMoldHandler` 改为绑定 `services.DeltaHandlerRequest`
- 新增 `buildMoldPatchUpdates(...)`
- PATCH 更新后返回完整对象，不再只返回简单 message

结果：
- `molds` 不再依赖裸 `map[string]interface{}` 作为主 patch 入口；
- `lastCheckedAt` 等字段现在沿统一 helper 解析。

#### 4) 收口 `furnaces` handler
更新：
- `server/handlers/furnaces.go`

调整：
- `SaveFurnaceHandler` 改为绑定 `services.SaveFurnaceRequest`
- `PatchFurnaceHandler` 改为绑定 `services.DeltaHandlerRequest`
- 新增 `buildFurnacePatchUpdates(...)`
- PATCH 更新后返回完整对象

结果：
- `furnaces` 的 save/patch 语义不再依赖 raw map 入口；
- 前端现有 `patchFurnace(...)` 的 `DeltaPayload` 能沿正式 DTO 边界进入后端。

#### 5) 收口 `partners` handler 并补正式 PATCH route
更新：
- `server/handlers/partners.go`
- `server/routes/routes_equipment.go`

调整：
- `SaveEquipmentPartnerHandler` 改为绑定 `services.SaveEquipmentPartnerRequest`
- 新增 `PatchEquipmentPartnerHandler`
- 新增 `buildPartnerPatchUpdates(...)`
- equipment routes 注册：`PATCH /equipment-partners/:id`

结果：
- 修复了“前端已调用 patchPartner，但后端路由未完整对齐”的断链；
- `partners` 从保存/更新混用的隐式实现收口到正式 POST/PATCH 分离入口。

#### 6) 收口 `drawings` handler 并补正式 PATCH route
更新：
- `server/handlers/drawings.go`
- `server/routes/routes_equipment.go`

调整：
- `SaveDrawingHandler` 改为绑定 `services.SaveMoldDrawingRequest`
- 新增 `PatchDrawingHandler`
- 新增 `buildDrawingPatchUpdates(...)`
- equipment routes 注册：`PATCH /drawings/:id`
- 保持既有图纸日志写入行为不变

结果：
- 修复了“前端已调用 patchDrawing，但后端路由未完整对齐”的断链；
- `drawings` 的元数据更新与日志写入边界更清晰。

#### 7) 补最小 binding 回归测试
更新：
- `server/handlers/production_topology_handlers_test.go`

新增：
- `TestSaveEquipmentPartnerRequestBinding`
- `TestPatchDrawingDeltaRequestBinding`

作用：
- 锁住新增 DTO 的 request binding 行为；
- 锁住 equipment patch 入口对 `DeltaPayload` / `metadata` 的基本结构承接。

### 验证
执行：
```bash
go test ./handlers ./routes -run "Production|Equipment|Mold|Furnace|Partner|Drawing"
pnpm exec tsc --noEmit
```

结果：通过。

### 本批结论
Phase A 已完成 equipment-tooling 第一批 DTO 收口：

- `molds`
- `furnaces`
- `partners`
- `drawings`

并额外修复了两处前后端 PATCH route 断链：

- `PATCH /equipment-partners/:id`
- `PATCH /drawings/:id`

### 下一步建议
按既定规划继续进入：

1. `production line topology` 二次收口
   - 从当前 `map[string]json.RawMessage` 继续收口到显式 delta DTO / metadata DTO

2. `warehouse` / `trading` 第一批 patch 模块
   - 优先 `inventory` / `shipment`
   - 以及 `supplier` / `purchase-order`

## P0：`production line topology` 更新 contract 断链修复（2026-04-07）

### 根因结论
本轮 `/personnel/line` 工段/工序拓扑更新失败，最终确认不是单个前端按钮或密码框问题，而是**前后端对 production line topology 更新的正式 contract 漂移**。

已确认的断链如下：

1. 前端
   - `src/features/production-shared/services/production-resource-service.ts`
   - 当前 topology 敏感操作已按 SDRTS 设计提交：`PATCH /production/lines/:id + DeltaPayload + version + authCode`

2. 后端
   - 原 `server/routes/routes_production.go` 仅暴露 `GET /production/lines`、`POST /production/lines`、`DELETE /production/lines/:id`
   - 原后端**不存在** `PATCH /production/lines/:id`

3. 直接后果
   - 工段/工序删除在前端授权后会真正发起 PATCH 请求；
   - 但后端路由不存在，直接返回 404；
   - 用户侧表现为“密码框出现后保存失败 / 不生效”。

### 同轮一起确认并修复的底层问题
1. 节点层授权分叉
   - `segment-node.tsx` / `process-node.tsx` 之前各自维护授权弹框，已收口回外层统一 topology 保存边界。

2. SDRTS `ProxyTracker` 根因
   - `src/lib/delta/proxy-tracker.ts` 原实现把原始快照与工作副本混用，导致 delta 可能被算空；
   - 已修正为 `baseline`（只读基准）+ `workingCopy`（可变副本）模型，恢复正确的 delta 计算。

### 已执行变更
1. 为 production line 补正式 PATCH request DTO
   - `server/services/production_dto.go`
   - 新增：
     - `PatchProductionLineMetadata`
     - `PatchProductionLineHandlerRequest`

2. 为 production line 注册正式 PATCH 路由
   - `server/routes/routes_production.go`
   - 新增：
     - `PATCH /production/lines/:id`

3. 为 production topology 新增 PATCH handler
   - `server/handlers/production_topology_handlers.go`
   - 新增 `PatchProductionLineHandler`
   - 明确承接：
     - `delta`
     - `metadata.version`
     - `metadata.authCode`
   - 并保持既有：
     - 版本冲突 -> `409`
     - 授权码错误 -> `403`

4. 为 production service 新增 PATCH 正式主链
   - `server/services/production_service.go`
   - 新增：
     - `PatchProductionLineRequest`
     - `PatchProductionLine(...)`
     - `applyProductionLineDelta(...)`
   - PATCH 策略为：
     - 先读取当前完整产线拓扑；
     - 将前端 `delta` 应用到完整 `ProductionLineDTO`；
     - 再复用既有 `SaveProductionLine(...)` 主链处理版本校验、授权码校验与拓扑事务保存。

5. 为 repository 补完整拓扑读取
   - `server/repositories/production_repository.go`
   - `GetProductionLineByID(...)` 改为 preload：
     - `Segments`
     - `Segments.Processes`
   - 保证 PATCH 时是基于完整现状还原，而不是只拿主表字段。

6. 补最小回归测试
   - `server/handlers/production_topology_handlers_test.go`
     - 新增 PATCH request binding 测试，锁住 `delta / version / authCode` 结构
   - `server/services/production_service_test.go`
     - 新增 `PatchProductionLine(...)` 回归测试，锁住“delta -> 完整 DTO -> Save 主链”行为

### 保留边界
- 未让前端回退为 `POST /production/lines` 全量保存；
- 未在节点层重新发明自己的提交协议；
- 未把 404 当成普通 toast 问题处理；
- PATCH 仍复用既有 `SaveProductionLine(...)` 主链，没有再发明第二套 topology 持久化逻辑。

### 验证
执行：
```bash
go test ./handlers ./services -run "Production|Topology"
pnpm exec tsc --noEmit
```

结果：通过。

### 当前结果
- production line topology 更新 contract 已从“前端 PATCH / 后端无路由”的断链状态恢复为正式闭环；
- 工段/工序拓扑敏感操作现在可沿统一授权链进入正式 PATCH 持久化；
- 本轮从根因层同时修复了节点层授权分叉、ProxyTracker delta 失真、以及 production PATCH contract 缺失三处断点。

## P0：`users` 测试数据构造边界收口（2026-04-07）

### 根因结论
本轮不是给单个测试散点补 `version`，而是收口一类共享根因：**正式 `User` / `Role` schema 已演进，但测试层仍在直接手写正式对象，缺少统一测试工厂入口。**

已确认的根因链如下：

1. `User`
   - `src/features/users/data/schema.ts` 中正式 `User` contract 已要求 `version`，并承接 `createdAt / updatedAt / resolvedRole / roleInfo` 等字段；
   - `role-resolver.test.ts`、`user-api.test.ts` 仍直接手写正式 `User` 字面量；
   - 一旦 schema 演进，测试会成片漂移。

2. `Role`
   - `src/features/system-mgmt/data/role-schema.ts` 中正式 `Role` contract 同样已要求 `version`；
   - `role-resolver.test.ts` 中的角色对象也仍直接手写；
   - 这说明测试层“正式对象裸写”问题并不只存在于 `User`。

3. `PATCH` contract
   - `user-api.test.ts` 中 `patchUser(...)` 的测试不仅对象字面量陈旧，连调用签名与 SDRTS `DeltaPayload` 结构也停留在旧 contract；
   - 问题根因同样是测试未跟随真实 service contract 一起收口。

### 已执行变更
1. 为正式 `User` 建立共享测试工厂
   - `src/features/users/test-factories.ts`
   - 已新增 `createTestUser(overrides)`，统一承接 `User` 的正式默认值、`version` 与时间字段。

2. 为正式 `Role` 建立共享测试工厂
   - `src/features/system-mgmt/test-factories.ts`
   - 已新增 `createTestRole(overrides)`，统一承接 `Role` 的正式默认值与 `version`。

3. `role-resolver.test.ts` 已切到共享测试工厂
   - `src/features/users/utils/role-resolver.test.ts`
   - 正式 `User` 对象改为消费 `createTestUser(...)`
   - 正式 `Role` 对象改为消费 `createTestRole(...)`
   - 不再在测试里直接手写旧版正式对象字面量。

4. `user-api.test.ts` 已对齐正式 `User` 与真实 PATCH contract
   - `src/features/users/services/user-api.test.ts`
   - 分页返回中的正式 `User` 列表项改为消费 `createTestUser(...)`
   - `patchUser(...)` 测试已对齐真实签名：`patchUser(id, delta, version)`
   - `delta` 断言已改为真实 SDRTS `DeltaSet/DeltaPayload` 结构。

### 保留边界
- 未放宽 `User` 或 `Role` 正式 schema；
- 未通过 `as User` / `as Role` 或宽断言掩盖问题；
- 未把 `CreateUserPayload` / `UserOption` / `UserReplacePayload` 等 API payload 误塞进正式实体测试工厂；
- 未扩展为整个 `users` 域测试体系重构。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

### 当前结果
- 正式 `User` / `Role` 在目标测试链中的构造入口已收口到共享测试工厂；
- `users` 相关测试对真实 `PATCH` contract 的调用方式已重新对齐；
- 本轮以根因整改而非补丁方式恢复了前端 TypeScript 构建。

## P0：正式对象单一构造入口第二轮（`Furnace` 推广）（2026-04-07）

### 排查结论
本轮继续搜索 `equipment-tooling` 中同类“直接手写正式对象默认值”的残留点后，确认：

1. `Furnace`
   - `src/features/equipment-tooling/components/furnace-action-dialog.tsx` 仍在 `defaultValues` 与 `form.reset(...)` 中手写两套 `Furnace` 正式对象默认值；
   - 与第一轮 `Mold` 的根因完全同构，适合继续推广单一构造入口。

2. `LoanDraft`
   - `src/features/equipment-tooling/hooks/use-mold-loan-mgmt.ts` 中的 `createLoanDraft(...)` 属于本地 UI 草稿模型；
   - 当前不属于正式 `MoldLoan` contract 的默认值漂移问题，因此未并入本轮整改。

### 已执行变更
1. 为 `Furnace` 建立统一草稿构造入口
   - `src/features/equipment-tooling/data/schema.ts`
   - 已新增 `createFurnaceDraft(defaultType, overrides)`，统一承接 `Furnace` 默认值、`version`、`createdAt` 与基础字段初值。

2. `FurnaceActionDialog` 已切到统一构造入口
   - `src/features/equipment-tooling/components/furnace-action-dialog.tsx`
   - 表单 `defaultValues` 改为消费 `createFurnaceDraft(defaultFurnaceType, editData ?? {})`
   - 新建/编辑态 `form.reset(...)` 改为统一消费 `createFurnaceDraft(...)`
   - 不再在弹窗内维护第二套手写 `Furnace` 默认对象。

### 保留边界
- 未把 `LoanDraft` 错归为正式对象整改目标；
- 未扩展为借还管理表单重构；
- 未改 `Furnace` 业务语义，仅收口其正式默认值构造入口；
- 未扩大为 `equipment-tooling` 全域对象工厂体系重写。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

补充核对：
- `createFurnaceDraft(...)` 已成为本轮目标链中的统一默认值入口；
- 当前 `equipment-tooling` 目标链中已无第二套 `Furnace` 默认值手写残留。

### 当前结果
- 单一构造入口已从 `Mold` 稳定推广到 `Furnace`；
- `equipment-tooling` 中正式对象默认值漂移的同类风险进一步下降；
- `LoanDraft` 等 UI 草稿模型保持独立，没有被错误并入正式对象治理。

## P0：TypeScript 构建错误收口（共享 contract 边界整改）（2026-04-07）

### 根因结论
本轮不是对两个独立报错做补丁，而是收口一类共同根因：**共享 contract 已演进，但页面层仍可直接手写正式对象、直接猜共享结构，缺少单一构造入口与稳定消费边界。**

已确认的两条根因链如下：

1. `equipment-tooling`
   - `Mold` 已是正式领域类型，但 `mold-mgmt.tsx` 与 `mold-action-dialog.tsx` 仍分别手写新增草稿/默认值；
   - 当 `Mold` 正式字段包含 `version` 后，页面层字面量对象立刻发生 contract 漂移。

2. `org-personnel`
   - 员工管理列表的名称映射消费边界与同域实现不一致；
   - 同域已有实现按 `line -> segment -> processes` 消费当前权威拓扑，但员工列表仍停留在较旧、更宽松的 segment 级读取方式；
   - 这类不一致在共享类型演进时容易再次触发漂移。

### 已执行变更
1. 为 `Mold` 建立统一草稿构造入口
   - `src/features/equipment-tooling/data/schema.ts`
   - 已新增 `createMoldDraft(overrides)`，统一承接 `Mold` 默认值、`version` 与基础字段初值。

2. `MoldActionDialog` 已切到统一草稿入口
   - `src/features/equipment-tooling/components/mold-action-dialog.tsx`
   - 表单 `defaultValues` 改为消费 `createMoldDraft(editData ?? {})`
   - 新建态 `form.reset(...)` 改为消费 `createMoldDraft()`
   - 不再在弹窗内维护第二套手写默认值。

3. `MoldMgmt` 已移除页面层手写 `Mold` 字面量
   - `src/features/equipment-tooling/tabs/mold-mgmt.tsx`
   - 分组内“新增模具”入口改为消费 `createMoldDraft(...)`
   - 页面层不再直接手写正式 `Mold` 对象。

4. `EmployeeManagementList` 已对齐权威产线/工序映射结构
   - `src/features/org-personnel/tabs/employee-management-list.tsx`
   - 名称映射从仅遍历 `segment` 改为对齐当前权威的 `segment -> processes`
   - 同步移除了目标文件中的显式 `any`，改用 `Row<Employee>`。

### 保留边界
- 未放宽 `Mold` 正式类型约束；
- 未通过临时断言或可选字段规避 contract 问题；
- 未重构 `equipment-tooling` 或产线拓扑整体架构；
- 未改变模具新增/编辑交互语义；
- 未改变员工管理业务逻辑，仅收口其名称映射消费边界。

### 验证
执行：
```bash
pnpm exec tsc --noEmit
```

结果：通过。

补充核对：
- `createMoldDraft(...)` 已成为本轮目标链中的统一草稿入口；
- 当前工作区已无 `jobCategories` 旧字段读取残留。

### 当前结果
- `equipment-tooling` 的正式 `Mold` 草稿构造已收口到单一入口，后续新增正式字段时不再需要在页面多处同步手写默认对象；
- `org-personnel` 的员工管理名称映射已对齐当前权威拓扑消费方式，减少同域实现不一致导致的再次漂移；
- 本轮以边界整改而非补丁方式恢复了前端 TypeScript 构建。

## P0：`purchase_orders` 再开一条最小闭环（错误响应 contract 统一）（2026-04-07）

### 已执行变更
1. 为 `purchase_orders` 补独立错误响应 contract
   - `server/handlers/purchase_order_error_response.go`
   - 已新增：
     - `purchaseOrderErrorResponse`
     - `respondPurchaseOrderError(...)`

2. `purchase_orders` handler 错误分支已统一切到正式错误响应
   - `server/handlers/purchase_orders.go`
   - 已覆盖：
     - 列表查询失败
     - 详情不存在
     - 保存参数绑定失败 / workflow definition 缺失 / 通用失败
     - 收货确认参数错误 / 单据不存在 / 业务校验失败
     - 删除失败
     - 已删除列表查询失败

3. 已补定向防回退测试
   - `server/handlers/purchase_orders_handler_test.go`
   - 已新增 `TestGetPurchaseOrderHandlerReturnsNamedErrorResponseWhenMissing`
   - `server/handlers/purchase_receipt_confirm_handler_test.go` 已补错误响应 shape 断言
   - `server/handlers/trading_workflow_e2e_test.go` 已补 `SavePurchaseOrderHandler` 缺失 workflow definition 的错误响应 shape 断言

### 保留边界
- 未改采购单业务逻辑；
- 未改收货事务逻辑；
- 未改 workflow 挂接与状态重算语义；
- 未改错误消息语义，仅统一错误响应 contract。

### 验证
执行：
```bash
go test ./handlers ./services -run "PurchaseOrder|Workflow"
```

结果：通过。

### 当前结果
- `purchase_orders` 主链错误响应已从裸 `gin.H` 收口为正式命名错误响应；
- 成功响应与错误响应的 contract 风格更一致；
- 后续若 `purchase_orders` 错误分支再回退为散乱裸响应，更容易被定向测试及时拦住。

## P0：第二批 `inventory` 防回退测试（2026-04-07）

### 已执行测试补强
1. `bulk sync` 负向测试
   - `server/handlers/inventory_command_handlers_test.go`
   - 已覆盖：
     - 非 admin 角色请求返回 `403`
     - 非法 payload 返回 `400`

2. `transfer request` 负向测试
   - `server/handlers/inventory_command_handlers_test.go`
   - 已覆盖：
     - 非法 payload 返回 `400`

3. `void` success / request shape 测试
   - `server/handlers/inventory_command_handlers_test.go`
   - 已覆盖：
     - success 响应保持 `InventoryCommandStatusResponse`
     - 启用审批配置且缺少 `approvalId` 时返回 `403`
     - `INVENTORY_VOID_FORBIDDEN` 错误码与审批字段错误语义保持稳定

### 保留边界
- 未改 inventory 业务代码；
- 未改库存事务逻辑；
- 未改权限裁决逻辑；
- 未改错误状态码与中文错误语义。

### 验证
执行：
```bash
go test ./handlers ./services -run "Inventory"
```

结果：通过。

### 当前结果
- `inventory` 第二批防回退测试已覆盖 bulk sync、transfer、void 的关键负向/shape 边界；
- 近期连续收口的 request / response / success status contract 已有更完整的测试保护；
- 后续若这些链路回退为权限绕过、请求绑定漂移或 success / request shape 漂移，更容易被定向测试及时拦住。

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

