# implementation plan

## 生产环境 `/auth/snapshot` 404 与登录页循环重定向故障修复（2026-04-07，待确认）

### 一、当前现象
生产环境当前存在高优先级登录阻塞故障：

1. 用户输入账号后前端提示登录成功；
2. 随后前端背景请求 `/auth/snapshot` 返回 404；
3. `AuthenticatedLayout` 将该错误视为身份同步失败，强制跳回 `/sign-in`；
4. 用户表现为反复回到登录页，无法进入系统。

伴随日志还包括 WebSocket 连接失败，但当前首要问题不是通知链，而是登录成功后无法进入页面。

### 二、已确认事实
当前代码中已确认：

1. 前端 `effective-permission-service.ts`
   - `syncIdentitySnapshotFromProfile()` 会调用：
     - `GET /auth/snapshot`
2. 前端 `authenticated-layout.tsx`
   - 背景身份同步失败后当前会直接：
     - `navigate({ to: '/sign-in', replace: true })`
3. 前端 `user-auth-form.tsx`
   - 登录成功后也会尝试 background profile sync；
4. 后端 `server/routes/routes.go`
   - 代码中确实注册了：
     - `GET /api/v1/auth/snapshot`
5. 后端 `server/handlers/auth.go`
   - 存在 `GetAuthSnapshotHandler`

这说明当前问题不是“代码仓库里完全没有这个路由”，而更可能是：

- 生产前端请求路径与实际后端路由前缀不一致；
- 生产网关/反代没有把该路由转发到 API；
- 生产后端部署版本落后，未包含该路由；
- 或前端把 snapshot 404 过度解释成“必须重新登录”，导致可恢复问题被放大成登录死循环。

### 三、本轮目标
本轮目标按优先级排序如下：

1. 先恢复“登录成功后可进入页面”的最小可用性；
2. 明确 `/auth/snapshot` 404 的真实根因；
3. 修复生产环境前后端或部署不一致；
4. 避免背景身份同步失败再次演化成登录死循环。

### 四、拟调整的职责边界

#### 前端应负责
- 在登录成功后尝试做背景身份同步；
- 对 snapshot 失败做分级处理；
- 只在明确认证失效（401/403/token invalid）时强制退出登录；
- 对 404/网络异常等非认证失效场景避免无限回登录页。

#### 后端 / 部署应负责
- 正式提供 `GET /api/v1/auth/snapshot`；
- 确保生产环境路由注册与部署版本一致；
- 确保网关/反代对 `/api/v1/auth/snapshot` 转发正确。

### 五、最小修复路径建议

#### Path A：先确认生产路由是否真实缺失
优先检查：

- `src/lib/api-client.ts` 的 base URL 拼接行为
- 生产环境 API 前缀与反代配置
- 当前线上后端版本是否包含 `GetAuthSnapshotHandler`

若确认是后端/部署缺失，应优先修复后端路由可达性。

#### Path B：补前端登录链的降级保护
即便后端路由有问题，前端也不应在 404 时形成无限重定向死循环。

建议最小策略：

- 401/403：视为认证失败，可回登录页
- 404/网络错误/5xx：
  - 记录错误
  - 保留已登录态的最小进入能力
  - 将身份同步标记为失败或降级，而不是立即踢回登录页

#### Path C：若需要，补 auth snapshot 回归测试
在修复完成后，可补最小前后端回归测试，防止未来再次删除或绕过该路由。

### 六、预计改动范围（待确认后实施）

#### 前端
- `src/lib/api-client.ts`
- `src/features/authz/services/effective-permission-service.ts`
- `src/components/layout/authenticated-layout.tsx`
- `src/features/auth/sign-in/components/user-auth-form.tsx`

#### 后端
- `server/routes/routes.go`
- `server/handlers/auth.go`
- 如确认是部署/反代问题，再检查部署脚本或 nginx 配置

### 七、风险与注意事项
1. 若只在前端 suppress 404，但真实后端路由仍缺失，会留下身份同步不完整的隐患。
2. 若继续维持“任何 snapshot 失败都强制回登录页”，生产可用性会持续受影响。
3. 若不区分 401/403 与 404/网络异常，前端会把部署问题误判成认证问题。

### 八、验证要求
待实施阶段至少执行：

```bash
pnpm build
```

并做最小登录回归验证：

- 登录成功后可进入受保护页面
- `/auth/snapshot` 正常返回时权限同步成功
- `/auth/snapshot` 返回 404 时不再陷入登录死循环
- 真正 token 失效时仍会正确退出登录

### 九、明确不做事项
- 不在本轮同时重构整个权限同步架构；
- 不将 WebSocket/通知链问题与登录死循环问题混为一个大专项；
- 不在未确认根因前直接大改登录表单或全局路由守卫。

## 已治理真相边界链路的最小后端回归测试补强（2026-04-07，待确认）

### 一、当前结论
当前已完成三条真相边界治理：

1. `sales-order`
   - 前端状态机已后迁到后端 authoritative path；
2. `shipment`
   - 前端 commit 状态推进与库存裁决已切回后端 command；
3. `purchase-order`
   - 局部前端状态扩散残留已删除。

这些改动都已通过 `pnpm build`，但目前仍缺少针对新边界的最小后端回归测试，存在后续迭代中被无意回退的风险。

### 二、本轮目标
本轮不扩散成测试体系重构，只补最小且高价值的后端回归测试，目标是：

1. 锁住新建立的 authoritative boundary；
2. 防止前端状态机/状态扩散逻辑在未来被变相引回；
3. 让关键状态流转在后端有最小自动化护栏。

### 三、测试范围

#### 1) `sales-order`
建议优先补：

- `server/services/sales_order_flow.go`
- `server/services/sales_fulfillment_service.go`
- 如有必要，`server/handlers/sales_orders.go`

最小断言建议：

- `Pending + all claimed -> InProgress`
- delivery 进度变化后：
  - `Pending -> InProgress`
  - `InProgress -> Done`
- `Canceled` 不被普通重算覆盖
- delete 首次进入 `Canceled`、再次 delete 才逻辑删除的语义保持稳定

#### 2) `shipment`
建议优先补：

- `server/services/inventory_command_service.go`
- 已存在的 shipment / inventory command 相关测试文件

最小断言建议：

- `CommitShipment(...)` 成功提交 DRAFT 记录
- 非 DRAFT 状态拒绝 commit
- 库存不足/非法数量的拒绝路径
- commit 后：
  - 库存扣减
  - sales order deliveredQty 更新
  - sales order 状态重算

#### 3) `purchase-order`
建议优先补：

- `server/services/purchase_order_flow.go`
- `server/services/purchase_receipt_service.go`
- `server/services/workflow_document_sync_service.go`

最小断言建议：

- `Draft / Sent / Awaiting / Received / Canceled` 状态规则稳定
- workflow 批准后 `Draft -> Sent`
- receipt 后 `Awaiting / Received`
- 移除前端状态扩散后，后端仍能提供正式主状态来源

### 四、预计改动文件（待确认后实施）
优先改测试文件，不碰业务实现，除非为补测试可达性必须做最小导出或最小可测性调整。

预估涉及：

- `server/services/*_test.go`
- 视情况少量补充：
  - `server/handlers/*_test.go`

### 五、实施顺序建议

#### Phase A：先补 services 层纯规则测试
- 先锁住状态规则本身；
- 这类测试最稳定、最便宜。

#### Phase B：再补关键事务联动测试
- `shipment commit -> inventory + sales-order`
- `purchase receipt -> received_qty + purchase-order status`

#### Phase C：仅在必要时补 handler 语义测试
- 例如 delete/取消的 handler 语义
- 不默认扩散到所有 handler。

### 六、风险与注意事项
1. 若一次性追求“测试全覆盖”，范围会迅速失控。
2. 若为了写测试而大改业务实现，会偏离本轮“最小护栏”的目标。
3. 应优先锁住 authoritative 规则与关键事务联动，而不是 UI 无关的普通 CRUD。

### 七、验证要求
待实施阶段至少执行：

```bash
pnpm build
```

并补充最小后端测试验证，例如：

```bash
go test ./server/services ./server/handlers -run "SalesOrder|Shipment|PurchaseOrder"
```

如测试命令需按现有测试组织微调，再以最小真实可运行命令为准。

### 八、明确不做事项
- 不在本轮发起全仓库测试重构；
- 不补与本轮真相边界治理无关的大量 handler 测试；
- 不为了测试方便反向修改业务边界设计。

## `purchase-service.ts` 前端状态扩散清理专项（2026-04-07，待确认）

### 一、当前结论
当前 purchase-order 真相边界体检确认：`src/features/trading/services/purchase-service.ts` 中存在一段局部前端状态扩散残留。

当前已确认的前端越界点：

1. `savePurchaseOrder(...)`
   - 当前会在前端对 `Canceled / Received` 状态执行主表到明细的状态扩散：
     - `order.lines = order.lines.map(line => ({ ...line, status: targetStatus }))`

这说明 purchase-order 虽未发展成完整前端状态机，但前端仍残留一段对正式明细状态的补丁式派生逻辑。

### 二、当前后端承接现状
purchase-order 链的后端 authoritative flow 已基本存在：

1. `workflow_document_sync_service.go`
   - 工作流审批通过后负责：
     - `Draft -> Sent`
2. `purchase_order_flow.go`
   - 负责采购单正式主状态重算：
     - `Draft / Sent / Awaiting / Received / Canceled`
3. `purchase_receipt_confirm_service.go` / `purchase_receipt_service.go`
   - 负责收货确认、`received_qty` 更新与收货后的状态重算。

这意味着 purchase-order 的正式状态规则主干并不在前端，前端残留的状态扩散更像历史补丁，应优先清理而不是继续保留双轨定义。

### 三、本轮目标
本轮不做大专项，只做一个小范围清理：

1. 去掉前端 `Canceled / Received -> lines.status` 的本地扩散；
2. 确认后端现有 authoritative flow 是否已足以承接；
3. 仅在发现后端缺少明细状态同步时，做最小补位。

### 四、拟调整的职责边界

#### 前端保留
- 提交采购单表单数据；
- 显示状态与工作流结果；
- 提交 receipt / delete 等用户意图。

#### 后端接管
- 工作流审批后的正式状态推进；
- 收货后主状态重算；
- 如有需要，明细正式状态的统一派生。

### 五、预计改动范围（待确认后实施）

#### 前端
- `src/features/trading/services/purchase-service.ts`

#### 后端
- 默认不改
- 仅在确认 purchase-order 明细状态在后端没有正式派生来源时，最小补：
  - `server/services/purchase_receipt_service.go`
  - 或 `server/handlers/purchase_orders.go` 的保存/更新路径

### 六、实施顺序建议

#### Phase A：先移除前端状态扩散
- 从 `purchase-service.ts` 删除：
  - `Canceled / Received -> lines.status` 的前端同步逻辑。

#### Phase B：验证后端 authoritative flow 是否足够
- 检查：
  - workflow 批准后 `Draft -> Sent`
  - receipt 后 `Awaiting / Received`
  - delete / cancel 场景下是否已有正式后端来源。

#### Phase C：仅在必要时补最小后端派生
- 如果去掉前端扩散后，发现明细正式状态缺少 authoritative source，再做最小补位；
- 不扩大为 purchase 全链重构。

### 七、风险与注意事项
1. 若直接删掉前端状态扩散，而后端又没有正式明细状态派生，可能会暴露历史依赖。
2. 若把本轮扩散到 purchase 页面、receipt UI、workflow UI，会超出“小专项清理”的边界。
3. 若继续保留前端补丁式扩散，后续后端规则演进时仍会发生双轨漂移。

### 八、验证要求
待实施阶段至少执行：

```bash
pnpm build
```

并补充 purchase-order 定向验证：

- 保存 Draft
- workflow 审批后状态变化
- confirm receipt 后 `Awaiting / Received` 变化
- 前端不再本地扩散明细状态后，列表/详情展示仍正确

### 九、明确不做事项
- 不在本轮同时重构全部 purchase-order 页面与 hooks；
- 不把本轮扩大成 purchase / inbound / finance 联动全链重写；
- 不在没有证据时引入新的 command 路由或大范围后端改造。

## `warehouse / shipment` 真相边界后迁专项（2026-04-07，待确认）

### 一、当前结论
当前真相边界体检已确认：`src/features/warehouse/hooks/use-shipment.ts` 中仍存在前端承担库存裁决与状态推进的问题。

当前高风险越界点包括：

1. `submitShipment(...)`
   - 在前端使用 `categoryStock` 快照判断 `COMMITTED` 是否允许提交；
2. `commitDraft(...)`
   - 前端直接通过 patch 推进 `status: DRAFT -> COMMITTED`；
3. `removeRecord(...)`
   - 前端对 draft / committed 记录执行不同语义路径，需确认是否应进一步后迁。

这说明 shipment 链中，前端仍在用本地快照和前端 patch 参与最终业务裁决。

### 二、本轮目标
本轮不扩散到全部 warehouse 域，只聚焦 shipment 链，将：

1. commit 前库存裁决从前端后迁到后端；
2. `DRAFT -> COMMITTED` 状态推进从前端 patch 改为后端 authoritative command；
3. 前端降级为提交意图、显示提示与消费 authoritative result。

### 三、拟调整的职责边界

#### 前端保留
- 填写出库表单；
- 基于当前快照给出风险提示；
- 提交 commit/void 意图；
- 显示后端返回的成功/失败结果。

#### 后端接管
- 最终库存是否足够的事务内校验；
- `CommitShipment(...)` 的正式状态推进；
- 扣库存、联动销售订单、更新交付进度与状态回写；
- 冲突、库存不足、非法状态的正式拒绝理由。

### 四、当前后端承接现状
当前后端并非空白，已存在较好的 authoritative 基础：

- `inventory_command_service.go` 中已有 `CommitShipment(...)`
- 提交出库后，后端会：
  - 更新出库记录状态
  - 扣减库存
  - 联动销售订单交付数量
  - 重算销售订单状态

这说明本轮重点不是新发明后端状态机，而是把前端调用链切回现有 authoritative command。

### 五、预计改动范围（待确认后实施）

#### 前端
- `src/features/warehouse/hooks/use-shipment.ts`
- 如有必要，联动：
  - `src/features/warehouse/services/inventory-service.ts`
  - `src/features/warehouse/tabs/product-shipment.tsx`

#### 后端
- 仅在发现 `CommitShipment(...)` 的错误返回、状态校验或 void 语义存在缺口时，做最小补齐

### 六、实施顺序建议

#### Phase A：切断前端状态推进
- `commitDraft(...)` 改为直接调用 `inventoryService.commitShipment(id)`；
- 不再由前端 patch `status: DRAFT -> COMMITTED`。

#### Phase B：收口前端库存裁决
- `submitShipment(...)` 中 `quantity > categoryStock` 从阻断裁决降级为风险提示；
- 最终 commit 成败以后端事务内库存校验为准。

#### Phase C：复核 void/remove 语义
- 判断 `removeRecord(...)` 是否仍存在前端语义分流；
- 如有必要，进一步收口到后端 authoritative action。

### 七、风险与注意事项
1. 若前端仍保留“本地阻断 + 后端再校验”的双轨模式，真相边界问题不会完全消失。
2. 若后端 `CommitShipment(...)` 的错误返回不够清晰，前端切回 authoritative command 后用户体验可能退化，需补清晰错误提示。
3. 若一次性扩散到 inbound / stocktake / adjustment，范围会失控。

### 八、验证要求
待实施阶段至少执行：

```bash
pnpm build
```

并补充 shipment 定向验证：

- draft 提交 commit
- 库存不足时后端正式拒绝
- committed 记录联动库存与 sales order 交付进度
- void/remove 在 draft / committed 两种状态下的行为

### 九、明确不做事项
- 不在本轮同时重构全部 warehouse 模块；
- 不保留“前端 patch 状态 + 后端 authoritative command”长期双轨模式；
- 不把本轮扩大成 Redis / 实时链 / 分布式库存锁改造。

## `trading-service.ts` 前端状态机后迁专项（2026-04-07，待确认）

### 一、当前结论
当前真相边界体检已确认：`src/features/trading/services/trading-service.ts` 中存在前端 service 越界承担业务状态机的问题。

当前前端仍在本地执行的高风险逻辑包括：

1. `saveSalesOrder(...)`
   - 根据主表状态批量推导明细状态；
2. `deleteSalesOrder(...)`
   - 在前端决定“物理删除”还是“取消单据”；
3. `claimOrderLine(...)`
   - 在前端根据 claim 完成度推进主表状态；
4. `updateOrderDelivery(...)`
   - 在前端根据 deliveredQty 推进行状态，再进一步推导主表状态。

这说明当前 trading 前端 service 已不是单纯传输层，而是承担了 authoritative business state transition 的一部分。

### 二、本轮目标
本轮不直接扩散到整个 trading 域，只聚焦把 `trading-service.ts` 中越界的前端状态机逻辑识别并后迁到后端 authoritative path。

目标如下：

1. 前端不再决定销售订单主表/明细状态如何推进；
2. 前端不再决定“删除 vs 取消”最终语义；
3. 前端保留输入意图、delta 提交与展示反馈；
4. 后端成为销售订单状态流转的单一事实来源。

### 三、拟调整的职责边界

#### 前端保留
- 收集用户操作意图；
- 提交显式 command 或 SDRTS delta；
- 做 UI 级提示、表单校验与结果展示；
- 根据后端返回结果刷新缓存与页面状态。

#### 后端接管
- 主表状态与明细状态的最终推进；
- 删除/取消语义裁决；
- claim / delivery 等动作触发后的状态机流转；
- 版本冲突后的正式拒绝或合并策略。

### 四、预计改动范围（待确认后实施）

#### 前端
- `src/features/trading/services/trading-service.ts`
- 视后端 contract 变化，可能联动：
  - `src/features/trading/hooks/use-trading.ts`
  - 个别 trading 页面/弹窗调用点

#### 后端
- 对应 sales order 的 handler / service / route
- 如当前缺少正式 command / action route，最小范围补齐 authoritative endpoint

### 五、实施顺序建议

#### Phase A：先切断前端状态机
- 从 `trading-service.ts` 中识别所有“本地推导最终状态”的逻辑；
- 改为提交 command 或最小必要 delta，而不是在前端先完成状态演算。

#### Phase B：后端补 authoritative action
- 让后端 service/handler 成为：
  - claim action
  - cancel/delete action
  - delivery update action
  的单一执行入口。

#### Phase C：前端改为消费 authoritative result
- 前端拿后端返回的正式订单状态刷新页面；
- 不再用本地 service 拼出最终状态再写回。

### 六、风险与注意事项
1. 若一次性扩散到 purchase / supplier / shipment 等全部链路，范围会失控。
2. 若后端还没有对应 command 入口，前端切掉本地状态机后需同步补 authoritative action，不能形成能力真空。
3. 若保留“前端先算状态、后端再兜底”的双轨模式，真相边界问题不会真正消失。

### 七、验证要求
待实施阶段至少执行：

```bash
pnpm build
```

并补充对应 trading 定向验证：

- 销售订单 claim
- 销售订单取消/删除
- delivery 更新后主表/明细状态变化
- 版本冲突与失败提示

### 八、明确不做事项
- 不在本轮同时重构全部 trading 模块；
- 不保留“前端状态机 + 后端再兜底”的长期双轨模式；
- 不把本轮扩大成全域微服务拆分或事件总线改造。

## 三类共享根因的可复用约束沉淀方案（2026-04-07，待确认）

### 一、目标判断
当前 `pnpm build` 已恢复通过，但这并不意味着三类共享根因已经从机制上被消除。

如果不进一步沉淀可复用约束，后续仍会反复出现：

1. schema 新增正式字段后，默认值工厂/样例常量/页面初始化继续分叉；
2. 表单子组件继续自行声明局部 `UseFormReturn<X>`，在 build 模式下再次爆出泛型断裂；
3. 业务组件继续直接散写 vendor options，随着依赖或类型边界变化再次暴露不一致。

因此下一阶段目标不是“继续修眼前错误”，而是把这三类根因沉淀为团队内可复用约束。

### 二、约束一：统一默认值 builder

#### 目标
为领域对象建立明确的默认值 builder / draft factory，承接：

- 新建态初始对象
- 样例常量初始对象
- 必要正式默认字段（如 `version`、`createdAt`）
- 局部 `normalizeXxx(...)` 的共同基础形态

#### 拟落地方式
优先从已暴露问题的 `engineering` 域开始：

- `src/features/engineering/utils/`
  - 继续收口或拆分 `buildDefaultProductValues(...)`
  - 新增/整理 `ProductTemplate`、`ChangeOrder`、`Routing` 的 builder / draft factory
- 样例常量与页面初始化对象优先改为复用 builder，而不是各自裸写。

#### 约束原则
- schema 演进后，正式字段默认值不允许再分散定义在页面、样例、局部 normalize 中；
- 页面层允许补业务特有临时字段，但核心正式字段必须来自 builder。

### 三、约束二：统一表单子组件 contract 模式

#### 目标
避免子组件继续依赖整份 `UseFormReturn` 并自行窄化成局部模型。

#### 推荐模式
默认采用字段级 contract：

- `value`
- `onChange`
- 或最小必要字段集合

只有真正的通用表单容器/布局组件，才允许依赖整份 `form`，且必须与父层共享同一正式泛型边界。

#### 拟落地方式
优先从已出现问题的链路开始整理规范：

- `src/features/engineering/components/product/production-restrictions.tsx`
- 继续抽查同类 `*-form-section` / `*-restrictions` / `*-tags` 组件
- 总结出“字段级 contract 优先、整份 form 为例外”的约束模板

#### 约束原则
- 子组件不应再自行发明一个更窄的整份 `UseFormReturn<X>`；
- `react-hook-form + zodResolver` 的正式泛型边界应在父层统一收口。

### 四、约束三：统一第三方 adapter 模式

#### 目标
让业务组件不再直接面向 vendor 原始 options / config，而是依赖项目内部稳定适配层。

#### 拟落地方式
优先从本轮已暴露问题的条码/二维码链开始：

- 在 `src/lib/` 或相关 feature 的 `services/utils` 中建立最小 adapter/helper；
- 对外暴露项目内稳定配置面；
- 对内对齐第三方正式类型与能力边界。

后续其他易受第三方类型变化影响的能力（如导出、图表、二维码等）也按相同模式推进。

#### 约束原则
- vendor 原始 options 不应在业务 UI 组件里散写；
- 业务层只依赖项目内稳定参数，不直接承担第三方 contract 演进风险。

### 五、实施批次建议

#### Phase A：先在 `engineering` 域做默认值 builder 试点
- 以当前已暴露问题的 `Product` / `ProductTemplate` / `ChangeOrder` / `Routing` 为第一批。

#### Phase B：整理字段级 form contract 模板
- 先沉淀一个可复用模式，再按需替换其它同类子组件。

#### Phase C：建立最小 vendor adapter 试点
- 先做条码/二维码渲染链；
- 不一次性扩散到所有第三方库。

### 六、风险与注意事项
1. 若默认值 builder 抽象过度，可能把不同对象的业务差异硬塞进同一个工厂，反而增加维护复杂度。
2. 若表单 contract 治理范围失控，容易扩散成全项目表单重构。
3. 若 vendor adapter 一次性包太多能力，会把“边界收口”演变成“基础设施重写”。
4. 本阶段目标是沉淀约束与首批试点，不是一次性改造全仓库。

### 七、明确不做事项
- 不在本轮直接扩散修改所有 feature 的默认值来源；
- 不把全部表单子组件统一重写成单一模式；
- 不对所有第三方依赖一次性建立大而全 adapter 层；
- 不脱离本轮已验证问题去做纯理论重构。

## 本轮 `pnpm build` 多点报错的共享根因分析（2026-04-07，待确认）

### 一、当前判断
本轮 `pnpm build` 新暴露的报错，并非完全随机的单点故障，而是两类因素叠加后的结果：

1. **历史欠账集中显形**
   - 根目录日常检查与 `tsc -b` / `pnpm build` 口径不一致；
   - 多轮迭代中未被完全覆盖的边界问题，在真实 build 模式下被统一展开。

2. **共享架构边界缺口持续外溢**
   - 当前错误虽然分布在 `basic-settings`、`engineering`、表单组件与样例常量中，但可归并为少数几类共享根因，而不是彼此无关的巧合。

### 二、三类主根因

#### 根因 A：schema 演进后，消费层缺少单一事实来源
表现为：
- schema 已新增/正式化 `version`；
- 默认值工厂、页面初始化对象、样例常量、局部 normalize 逻辑仍各自手写；
- 最终出现：
  - `version` 缺失
  - `_v` 残留
  - 推断过窄/`never`

这说明当前问题并不只是字段没补，而是**schema -> default builder -> sample data -> page state** 没有形成单向 authoritative 链路。

#### 根因 B：`react-hook-form + zodResolver + 子组件 form props` 缺少统一 contract 策略
表现为：
- 父组件使用完整领域模型创建 `form`；
- 子组件自行声明更窄的 `UseFormReturn<X>`；
- 局部还存在 `zodResolver(...) as any` 之类历史写法；
- 一旦切到 `tsc -b`，就集中暴露为：
  - `UseFormReturn` 不兼容
  - `watch/control/handleSubmit` 泛型错位

这说明当前真正问题不是单个表单字段，而是**表单体系没有统一的泛型收口规则**。

#### 根因 C：第三方库边界未封装，业务层直接写 vendor options
表现为：
- 业务组件直接面向第三方 `RenderOptions` 写配置；
- 实际使用的是经验字段，而不是当前正式类型支持字段；
- 最终在严格 build 下暴露为 vendor type mismatch。

这说明项目对第三方库缺少本地 adapter / wrapper，导致“运行经验写法”与“正式类型 contract”脱节。

### 三、哪些是症状，不是根因
以下现象应视为表层症状，而非最终根因：

- `version` 缺失
- `_v` 残留
- `never` 推断
- `UseFormReturn<大对象>` 不能传给 `UseFormReturn<小对象>`
- 第三方 options 上个别字段不存在

这些错误会不断换文件出现，但如果不先收口上游模式，修一处还会在别处继续冒出。

### 四、后续修复顺序建议

#### Phase A：schema consumer 收口
目标：
- 默认值工厂
- 样例常量
- 页面初始化对象

原则：
- 尽量从统一 builder / draft factory 出发；
- 不再让核心字段在多个页面裸写。

#### Phase B：form contract 收口
目标：
- 为 `useForm`、`zodResolver`、子组件 `form` props 建立统一泛型策略；
- 子组件尽量依赖字段级 contract，而不是自行声明更窄 `UseFormReturn<X>`。

#### Phase C：vendor adapter 收口
目标：
- 第三方 options 不直接散落在业务组件中；
- 通过本地 wrapper 或正式配置帮助函数固化合法字段。

### 五、明确不做事项
- 不把当前所有 build 报错当作随机孤立 bug 逐条补丁式修复；
- 不在未归类根因前继续扩散到全仓库重构；
- 不以 `as any`、`as unknown as` 继续压制表单或第三方类型边界；
- 不把本轮分析误扩成全项目架构重写。

## `engineering` 域 `version/_v` 契约漂移修复方案（2026-04-07，已确认）

### 一、当前结论
`pnpm build` 已确认不再停在 `mold-loan-action-dialog.tsx`，新的真实阻塞已经转移到 `src/features/engineering` 域。


1. `engineering` 相关 schema 已将 `version` 作为正式字段；
2. 页面初始化对象、样例数据与编辑默认值仍存在：
   - 缺失 `version`
   - 残留旧 `_v`

这说明当前问题不是单个页面拼写错误，而是 `engineering` 域在 `version` 契约统一后仍未完成消费层同步收口。

### 二、本轮目标
本轮只处理 `engineering` 域当前 `pnpm build` 暴露的真实阻塞：

1. 为缺失 `version` 的初始化对象与样例数据补齐正式字段；
2. 清退 `change-orders.tsx` 中残留的 `_v` 旧字段；
3. 保持 `engineering` 当前业务语义不变；
4. 以 `pnpm build` 作为最终验收标准。

### 三、实施顺序

#### Phase A：补齐缺失 `version` 的初始化对象/样例数据
涉及重点：
- `src/features/engineering/components/product/product-routing-view.tsx`
- `src/features/engineering/tabs/template-mgmt.tsx`

处理原则：
- 不新增兼容壳；
- 直接对齐正式 schema 要求；
- 保持默认对象现有业务语义不变，仅补齐正式字段。

#### Phase B：清退 `_v` 旧字段
涉及重点：
- `src/features/engineering/tabs/change-orders.tsx`

处理原则：
- 统一改回 `version`；
- 不保留 `_v` / `version` 双轨长期兼容；
- 保持原有创建/编辑流程不变。

### 四、关键风险
1. 若默认对象 `version` 补值位置不一致，可能导致局部编辑/新建初始值语义漂移。
2. 若 `_v` 直接替换为 `version` 时遗漏旧读取点，可能继续触发构建错误。
3. 本轮只处理 build 当前真实阻塞，不扩散为 `engineering` 全域重构。

### 五、验证要求
本轮至少执行：

```bash
pnpm build
```

必要时补充：

```bash
pnpm exec eslint src/features/engineering/components/product/product-routing-view.tsx src/features/engineering/tabs/template-mgmt.tsx src/features/engineering/tabs/change-orders.tsx
```

### 六、明确不做事项
- 不将本轮扩展成 `engineering` 域全量重构；
- 不重新引入 `_v` 兼容字段；
- 不因为 schema 要求而改动页面业务流程与默认交互语义。
