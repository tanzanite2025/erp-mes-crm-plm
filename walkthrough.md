# 变更记录与验证（walkthrough.md）

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
