# implementation plan

## 仓储库存聚合后移后端专项（2026-04-07，待确认）

### 一、当前问题
当前 `warehouse` 域并不只是消费后端库存结果，而是仍由前端 `inventory-service.ts` 自行承担跨模块聚合。

已确认核心链路如下：

1. `src/features/warehouse/services/inventory-service.ts#getInventoryList()`
   - 并行拉取 `materialService.getMaterialOptions()`、`productService.getProducts()`、`GET /inventory` 原始库存记录；
   - 在浏览器内完成物料/产品主数据映射；
   - 在浏览器内拼装 `InventoryView`；
   - 在浏览器内执行孤儿库存完整性校验日志。

这意味着当前库存“权威展示视图”并没有收敛到后端，而是由前端临时拼装。

### 二、根因判断
本问题的根因与前一轮 `MRP` 类似，不是某个 `hook` 写得重，而是职责边界仍然放错：

#### 1. 跨模块聚合被放在前端
库存视图当前依赖：

- 库存原始记录
- 物料主数据
- 产品主数据

这些都属于后端可以统一读取、统一裁决、统一返回的事实源输入，不应长期由前端自行组装。

#### 2. 同一条业务视图依赖多份接口快照
当前前端需要一次性拉取多份主数据后再映射：

- `materialService.getMaterialOptions()`
- `productService.getProducts()`
- `GET /inventory`

这会带来：

1. 网络开销扩大；
2. 快照时间可能不一致；
3. 同样的库存视图在不同终端、不同刷新时点存在口径漂移风险。

#### 3. 展示口径与完整性校验难以复用
当前孤儿库存检查、主数据补全与视图拼装都在前端实现，导致：

- 后端无法直接复用同样的视图口径；
- 报表、搜索、导出无法天然共享统一结果；
- 问题排查时缺少后端权威结果作为对照。

### 三、本轮目标
本轮只收口 `inventory-service.ts` 这条聚合主链，目标如下：

1. 后端提供权威库存视图接口，直接返回 `InventoryView` 需要的字段；
2. 前端 `inventory-service.ts#getInventoryList()` 不再同时拉物料、产品、库存三份数据进行正式聚合；
3. `use-stock-mgmt.ts` 做最小消费层改造，页面 UI 尽量不变；
4. `searchMasterData()` 与 `use-report.ts` 暂不纳入本轮实施。

### 四、本轮明确不做
本轮暂不扩散为所有重计算统一改造，只做库存聚合主链：

1. 不在本轮处理 `use-notification-rules.ts` 的前端规则扫描；
2. 不在本轮处理 `dashboard/services/trace-service.ts` 的仪表盘统计聚合；
3. 不在本轮处理 `searchMasterData()` 的后移与 `use-report.ts` 的报表链收口；
4. 不为“统一抽象”先引入新的通用聚合框架。

### 五、推荐接口形态

#### 1. 权威库存视图接口
建议后端新增或增强类似接口：

- `GET /api/v1/inventory/view`

返回字段尽量贴近当前前端 `InventoryView`：

- `id`
- `materialId`
- `quantity`
- `totalValue`
- `averageUnitCost`
- `categoryCode`
- `lastUpdated`
- `version`
- `materialName`
- `materialCode`
- `materialCategory`
- `materialSpec`
- `uom`

这样 `use-stock-mgmt.ts` 可基本只替换数据来源，不重做页面结构。

### 六、涉及文件

#### 后端建议涉及
- `server/handlers` 下新增或增强库存聚合 handler
- `server/services` 下新增库存视图与主数据聚合 service
- `server/routes` 下注册对应仓储聚合路由
- 必要时补充 DTO / mapper 与最小测试

#### 前端建议涉及
- `src/features/warehouse/services/inventory-service.ts`
- `src/features/warehouse/hooks/use-stock-mgmt.ts`

### 七、实施步骤

#### Phase A：先补后端权威接口
1. 后端提供库存视图接口；
2. 用最小测试覆盖物料/产品混合映射、库存视图拼装、缺主数据场景。

#### Phase B：前端切换消费方式
1. `inventory-service.ts#getInventoryList()` 改为直接请求后端库存视图接口；
2. 删除 `getInventoryList()` 对应前端多源拉取与本地聚合逻辑；
3. `use-stock-mgmt.ts` 做最小适配；
4. `searchMasterData()` 保持现状，留待下一轮。

### 八、风险与注意事项

#### 1. 兼容物料与产品共用库存主键口径
当前库存记录的 `materialId` 实际可能指向物料或产品。后端实现时必须保留这一混合映射口径，避免切换后出现“库存有记录但视图找不到主数据”的回归。

#### 2. 避免把前端筛选误搬成后端复杂查询
本轮目标是后移“正式聚合”，而不是把所有页面搜索/分组都一次性做成复杂服务端查询。页面本地搜索、分组、折叠等 UI 派生可继续保留在前端。

#### 3. 控制改动范围
当前用户已确认只优先处理 `getInventoryList()` 主链，因此不应在本轮顺手扩散到 `searchMasterData()`、通知扫描、dashboard 统计或全仓储模块重构。

### 九、验证建议
执行验证时至少覆盖：

```bash
pnpm exec tsc --noEmit
```

并补充确认：

- 前端不再通过三份接口本地拼装 `InventoryView`；
- `searchMasterData()` 继续保持现状，不作为本轮阻塞项；
- `warehouse` 库存管理主链可正常编译并维持现有 UI 行为。

## 前端 MRP 大运算后移后端专项（2026-04-07，待确认）

### 一、当前问题
当前 `trading/requirements` 页面并不是简单消费后端结果，而是由前端自行承担一整套 MRP 需求运算。

已确认核心链路如下：

1. `src/features/trading/hooks/use-requirements.ts`
   - 并行拉取销售订单、BOM、物料、产品、包装规则、库存 6 份数据；
   - 在浏览器内缓存这些数据；
   - 通过 `runCalculation()` 触发本地重算。
2. `src/features/mrp/services/mrp-engine.ts`
   - 在前端完成订单过滤；
   - 完成 BOM 爆炸；
   - 汇总物料毛需求；
   - 对冲库存；
   - 计算缺口；
   - 计算包装换算；
   - 生成统计快照与排序结果。

这意味着当前浏览器实际上承担了一个领域级计算引擎，而不是只做展示层工作。

### 二、根因判断
本问题不是“某个 hook 写重了”这么简单，而是职责边界放错了：

#### 1. 领域计算被放在前端
`MrpEngine.runCalculation()` 已经属于正式业务计算，而不是 UI 辅助逻辑。

它依赖：

- 销售订单正式数据
- 有效 BOM
- 物料主数据
- 产品展示映射
- 包装规则
- 库存数据

这些都属于应由后端统一读取、统一裁决、统一返回的领域输入。

#### 2. 前端需要拼装多源数据后再本地计算
当前前端必须自己聚合多个 service 的返回：

- `getSalesOrders()`
- `bomService.getBOMs()`
- `materialService.getMaterialOptions()`
- `productService.getProducts()`
- `packagingService.getRules()`
- `inventoryService.getInventoryList()`

这会产生三个问题：

1. 网络开销大：页面一次运算要拉多份大表；
2. 一致性弱：不同接口快照时间可能不一致；
3. 结果不可审计：后端并没有一个权威的“这次 MRP 是如何算出来的”输入输出记录。

#### 3. 浏览器性能与稳定性会持续恶化
当前 `useRequirements()` 在数据加载后自动重算，数据更新事件触发后也会再重算。

随着：

- 销售订单增多
- BOM 明细增多
- 库存记录增多

浏览器侧的：

- CPU 计算成本
- 内存占用
- 首屏等待时间
- 切页/刷新抖动

都会持续变差。

### 三、为什么必须后移到后端
本专项建议将 MRP 从“前端内存计算”改为“后端权威计算 + 前端展示”。

原因如下：

#### 1. 真相边界必须收口到后端
MRP 结果会直接影响：

- 缺料判断
- 采购/备料判断
- 包装数量建议
- 运营统计口径

这种结果不能由浏览器本地拼装后临时算出，否则不同用户、不同时间、不同缓存状态都可能得到不完全一致的结果。

#### 2. 便于复算、审计与后续扩展
后端计算后，后续才能自然支持：

- 统一日志与链路追踪
- 计算参数版本化
- 结果快照缓存
- 后台定时预计算
- 导出 / API 复用

#### 3. 前端只保留交互与可视化职责
前端更适合负责：

- 筛选条件输入
- 触发刷新/重算意图
- 表格展示
- 空态/错误态
- 局部交互体验

而不是承担正式 BOM 爆炸与库存对冲。

### 四、建议的最小后迁目标
第一阶段只后移当前 `trading/requirements` 页面使用的 MRP 主链，不扩散到全系统所有计算。

#### 第一阶段目标
1. 后端提供单一 MRP 查询/计算接口；
2. 后端内部统一读取订单、BOM、物料、产品、包装规则、库存；
3. 前端不再直接依赖 6 份主数据进行正式计算；
4. 页面 UI 尽量保持现状，仅替换数据来源。

#### 本轮明确不做
1. 不顺带重做销售订单模块整体架构；
2. 不顺带重做库存模块查询模型；
3. 不一次性把所有预测/排产/报价计算都改完；
4. 不为了“统一抽象”先引入过重的计算平台框架。

### 五、推荐的后端接口形态

#### 推荐方向：新增聚合型 MRP 查询接口
建议新增类似接口：

- `GET /api/v1/mrp/requirements`

或若需要复杂筛选体，可用：

- `POST /api/v1/mrp/requirements/query`

#### 请求参数建议
第一阶段尽量只支持最小筛选：

- `orderIds`（可选）
- `status`（可选，默认活动订单）
- `shortageOnly`（可选）
- `section`（可选）
- `keyword`（可选）

#### 响应结构建议
尽量贴近当前前端页面已消费的形状，降低 UI 改动：

- `requirements`
  - `materialId`
  - `materialCode`
  - `materialName`
  - `materialSpec`
  - `section`
  - `totalRequired`
  - `inventoryQty`
  - `shortageGap`
  - `unit`
  - `sourceOrders`
  - `packaging`
- `stats`
  - `totalMaterials`
  - `missingBOMCount`
  - `activeOrderCount`
  - `analyzedModels`

这样前端表格层基本可以只替换数据来源，不需要先重做展示结构。

### 六、推荐的后端内部实现拆分
为了避免把 handler 写成大泥球，建议后端按三层拆分：

#### 1. Handler 层
职责：

- 接收筛选参数
- 做参数校验
- 调用 service
- 返回 DTO

建议文件：

- `server/handlers/mrp_requirements.go`

#### 2. Service 层
职责：

- 聚合读取订单、BOM、物料、产品、包装规则、库存
- 执行 MRP 需求计算
- 返回领域结果

建议文件：

- `server/services/mrp_requirement_service.go`

#### 3. DTO / Mapper 层
职责：

- 将领域结果映射为 API 返回结构
- 收口字段命名与响应契约

建议文件：

- `server/services/mrp_requirement_dto.go`
- 或直接在 service 较小时先内聚，避免过早拆太散

### 七、前端迁移方式

#### Phase A：新增后端接口，不先删前端引擎
第一步先让后端具备同口径输出能力：

1. 新增 MRP requirements handler/service；
2. 用后端测试覆盖 BOM 爆炸、库存对冲、包装换算、缺 BOM 场景；
3. 保留前端 `MrpEngine` 作为迁移期对照参考，不立即删除。

#### Phase B：前端页面改为消费后端结果
调整：

- `useRequirements()`

从“拉 6 份数据 + 本地运算”改为：

- 调用单一 MRP 接口
- 保存后端返回的 `requirements` 与 `stats`
- 保留 loading / error / refresh / 筛选交互

这一步完成后，前端正式不再承担权威计算。

#### Phase C：删除前端 MRP 引擎主链
在后端输出稳定后，再清理：

- `src/features/mrp/services/mrp-engine.ts`
- `useRequirements()` 中不再需要的多源主数据拉取逻辑

如果页面仍需要局部前端辅助筛选，应仅保留轻量展示级过滤，不再保留正式业务计算。

### 八、关键风险
1. **结果口径漂移风险**
   - 若后端实现与前端现有 `MrpEngine` 逻辑不完全一致，页面结果会突然变化；
   - 因此迁移初期应以当前前端逻辑为对照样本，先确保核心口径一致，再逐步优化算法。

2. **查询性能风险**
   - 后端一次性聚合订单、BOM、库存与包装规则，若直接粗暴查全表，可能把前端性能问题转移成后端慢查询问题；
   - 因此需要在 service 层明确筛选边界与必要索引使用。

3. **接口过重风险**
   - 若第一阶段就试图支持过多筛选、导出、分页、异步任务，会扩大范围；
   - 建议先交付最小可用查询接口。

4. **迁移期双逻辑并存风险**
   - 如果前后端都能算，但页面仍有部分地方读本地计算结果，容易再次产生漂移；
   - 因此 Phase B 完成后，应尽快把页面主链切到后端单一结果。

### 九、推荐验证口径
待确认后进入实施阶段时，至少验证：

#### 后端测试
1. 有活动销售订单 + 有有效 BOM 时，能正确汇总物料需求；
2. 库存对冲后 `shortageGap` 正确；
3. 包装规则正反向换算正确；
4. 缺失 BOM 的产品会进入统计，不导致整体失败；
5. 空数据时返回空数组与零统计，不崩溃。

#### 前端验证
1. `trading/requirements` 页面仍可正常打开；
2. 页面展示结果改为以后端返回为准；
3. 刷新、切页、返回后结果稳定；
4. 控制台不再出现前端大计算相关日志与长时间卡顿；
5. 前端不再并行拉取 6 份主数据用于正式 MRP 运算。

### 十、结论
当前已确认：你说的“前端 JS 大运算引擎”在本仓库里核心就是 `MRP` 链，而它确实应该后移。

建议路径不是直接粗暴删前端计算，而是：

1. 先在后端补权威 MRP 聚合接口；
2. 再把 `trading/requirements` 页面切到后端结果；
3. 最后删除前端 `MrpEngine` 主链。

这样改动面最可控，也最符合“前端不参与这种大运算”的目标。

## AI 管理员前端误拒绝回归（2026-04-07，待确认）

### 一、当前问题
当前 DEV 环境下，系统管理员点击 AI 按钮时，前端直接弹出：

- `[权限拒绝] 您当前的角色未被授予极光 AI 决策权限。`

这意味着当前前端 AI 准入判断仍存在回归，管理员在进入 AI 主容器前就被阻断，导致当前无法放心推进生产复测。

### 二、根因判断
本轮回归不是后端治理策略拒绝，而是前端准入判断比后端更严：

1. 后端 `server/middleware/ai_policy_guard.go`
   - 当前仍保留 `admin / superadmin` bypass；
2. 前端 `src/features/ai-assistant/hooks/use-ai-permissions.ts`
   - 上轮已切到基于 `effectiveRoles` 的统一口径；
   - 但没有同步保留管理员 bypass。

因此产生新的轻量漂移：

- 后端允许管理员使用 AI；
- 前端却先在按钮点击阶段把管理员误判为无权限。

### 三、最小修复目标
本轮不再扩散重构，只做最小回归修复：

1. 前端 `useAiPermissions()` 补回与后端一致的 `admin / superadmin` bypass；
2. 管理员即使未命中显式 `allowedRoles / allowedUsers`，仍可进入 AI；
3. 普通用户继续按既有 AI policy 判定，不放宽治理边界。

### 四、拟改范围（待确认后实施）

#### 必改
- `src/features/ai-assistant/hooks/use-ai-permissions.ts`

#### 不改
- `server/middleware/ai_policy_guard.go`
- AI policy 数据结构
- AI 单入口容器逻辑

### 五、推荐实施方式

#### Phase A：补回前端管理员 bypass
- 在 `useAiPermissions()` 中，基于已规范化的有效角色集合增加：
  - `admin`
  - `superadmin`
  的物理绕过逻辑；
- 让前端与后端在管理员场景保持一致。

#### Phase B：保持普通用户治理不变
- 对非管理员用户，继续按：
  - `allowedRoles`
  - `allowedUsers`
  - `enabled`
  做现有 policy 判定；
- 不做额外放宽。

### 六、验证要求
待实施阶段至少验证：

1. `admin / superadmin` 在 DEV 环境点击 AI 时不再出现前端误拒绝提示；
2. 管理员仍能进入当前统一中间弹窗；
3. 非管理员用户继续按 AI policy 正常限制；
4. 不引入新的“前端放行、后端拒绝”漂移。

### 七、风险与注意事项
1. 若前端不补回管理员 bypass，当前 DEV 验证链会一直被误拒绝阻断；
2. 若错误地把 bypass 扩大到普通角色，会破坏 AI 治理边界；
3. 本轮修复应严格限定为管理员场景回归，不扩散到整体 AI policy 重写。

## AI 单入口收敛专项（2026-04-07，待确认）

### 一、当前问题
当前 AI 入口存在明显交互与维护歧义：同一个 AI 按钮在不同状态下会打开两套完全不同的主容器。

当前已确认：

1. 有 unread insight 时，会打开 `DailyInsightModal`；
2. 无 unread insight 时，会打开 `AiDrawer`；
3. 这会让用户点击前无法预期结果；
4. 也会让前端维护同时背负两套主 UI、两套状态流、两套样式与交互语义。

### 二、为什么需要收敛为单入口
本问题不只是“样式不一致”，而是入口语义不稳定：

- 同一个按钮，却可能打开不同形态的主容器；
- 用户无法提前理解自己会进入“简报模式”还是“聊天模式”；
- 多容器并存会让权限、状态、未读、空态、移动端适配、视觉迭代都出现双份维护成本。

从维护性角度，继续保留 `DailyInsightModal + AiDrawer` 双主容器并存并不划算。

### 三、当前决策
本轮决定采用更易维护的方向：

1. 保留中间弹窗作为唯一 AI 主容器；
2. 删除 `AiDrawer` 的主入口职责；
3. 不再让同一个 AI 按钮分流到两种主弹窗形态。

### 四、最小收口目标
本轮不做大型 AI 重构，只做入口收敛：

1. AI 按钮点击后始终进入统一中间弹窗；
2. unread insight 只影响内容状态，不再决定容器类型；
3. 普通问询能力若保留，也应在同一中间弹窗内部承载；
4. 删除侧边抽屉式主入口，减少后续维护歧义。

### 五、拟改范围（待确认后实施）

#### 必改
- `src/features/ai-assistant/components/ai-trigger.tsx`
- `src/features/ai-assistant/components/daily-insight-modal.tsx`

#### 视实现情况决定
- `src/features/ai-assistant/components/ai-drawer.tsx`
- `src/features/ai-assistant/hooks/use-ai-chat-engine.ts`
- 与 AI 容器状态相关的局部组件或样式片段

### 六、推荐实施方式

#### Phase A：统一入口行为
- 调整 `AiTrigger`：点击 AI 按钮时不再分流到 `AiDrawer`；
- 始终进入中间弹窗；
- unread insight 仅决定默认展示内容，而不是决定打开哪个容器。

#### Phase B：把必要的普通问询能力收编进中间弹窗
- 如果仍需保留手动提问/发送能力，则在 `DailyInsightModal` 内承载；
- 不再保留抽屉作为第二主交互容器。

#### Phase C：移除或降级 `AiDrawer`
- 若抽屉已无主职责，则删除其触发链；
- 若短期还需保留内部复用价值，则不再由主按钮直接打开。

### 七、风险与注意事项
1. 若直接删 `AiDrawer` 而不承接普通问询能力，可能造成功能缺失；
2. 若中间弹窗继续只适配“简报展示”，则需要最小补齐输入/对话承载；
3. 若双容器逻辑残留在 `AiTrigger` 中，后续仍会产生随机体验。

### 八、验证要求
待实施阶段至少验证：

1. 点击 AI 按钮后，DEV / 生产都进入统一中间弹窗；
2. unread insight 存在时可正常展示简报；
3. unread insight 不存在时也不会再退回侧边抽屉；
4. 若保留普通问询能力，用户可在同一中间弹窗内继续发起 AI 请求。

### 九、明确不做事项
1. 不在本轮顺带重写 AI provider 调用链；
2. 不在本轮扩散成 AI 模块全量视觉重设计；
3. 不保留“双主容器长期共存”的折中状态。

## AI 治理权限口径统一专项（方案B，2026-04-07，待确认）

### 一、当前问题
当前 AI 弹窗在 DEV 与生产环境表现不一致，但根因并非 UI 组件差异，而是 AI 背景任务在生产环境被服务端治理策略拒绝，导致 `DailyInsightModal` 所需的 unread insight 无法生成。

当前已确认现象：

1. DEV 环境可进入 `DailyInsightModal`；
2. 生产环境仅进入 `AiDrawer`；
3. 生产日志明确报错：
   - `AI_PROXY_ERROR (403): Current user is not allowed by AI governance policy`

### 二、当前根因判断

#### 1) `DailyInsightModal` 缺失只是结果，不是根因
`DailyInsightModal` 是否出现，取决于 `aiAgentService.executeAgentTask()` 是否成功完成并将 `hasUnread` 置为 `true`。

生产环境中，后台任务已经触发，但在调用 `/api/v1/ai/proxy` 时被服务端 `AIPolicyGuard()` 拒绝，因此：

- 背景任务中断；
- `hasUnread` 不会变成 `true`；
- 最终只会打开普通 `AiDrawer`。

#### 2) 前后端 AI 权限判定口径存在漂移
当前前端与后端的 AI 准入逻辑并不完全一致：

- 前端 `use-ai-permissions.ts`
  - 依据：`user.role[]` 与 `username`
  - 数据源：远端 policy + 本地 IndexedDB 缓存

- 后端 `server/middleware/ai_policy_guard.go`
  - 依据：单个 `context.role` 与 `context.username`
  - 数据源：服务端 `ai_capability_policy`

这会导致一种割裂状态：

- 前端认为当前用户可见、可启动 AI；
- 后端却在 `/api/v1/ai/proxy` 处返回 403。

### 三、方案B目标
本方案不做前端吞错补丁，也不伪造 unread insight，而是统一 AI 权限裁决口径：

1. 前后端对“当前用户是否允许使用 AI”必须基于同一事实来源；
2. 不再允许前端本地角色数组与后端单角色上下文各自独立判定；
3. 让 AI 按钮显示、后台任务执行、`/ai/proxy` 调用结果三者一致。

### 四、推荐收口方向

#### 方向A：以后端权威身份上下文为准
优先将 AI 治理裁决统一到后端权威上下文：

- 后端负责根据登录态解析当前用户的权威身份信息；
- 后端 AI policy 基于同一组权威角色/用户名做裁决；
- 前端不再自己猜测“当前用户应不应该可用”，而是消费与后端一致的结果。

这是本专项推荐方向。

#### 方向B：若保留前端预判，也必须使用与后端一致的字段
如果短期内仍保留前端 `useAiPermissions()` 作为按钮显隐预判，则必须确保它与后端使用同一口径，例如：

- 使用同一份权威角色集合；
- 使用同一份标准化后的用户名；
- 避免前端 `role[]` 与后端单个 `role` 字段各自解释。

### 五、拟改范围（待确认后实施）

#### 前端
- `src/features/ai-assistant/hooks/use-ai-permissions.ts`
- `src/features/ai-assistant/components/ai-trigger.tsx`
- 必要时：`src/features/authz/services/effective-permission-service.ts` 或 auth store 身份字段映射

#### 后端
- `server/middleware/ai_policy_guard.go`
- 必要时：认证中间件/身份上下文字段注入位置（确保 AI guard 能拿到权威角色集合或标准化身份）

### 六、最小实施原则
1. 不通过前端吞掉 `/ai/proxy` 403 来掩盖治理口径不一致；
2. 不通过强行伪造 `hasUnread` 来制造 `DailyInsightModal` 假象；
3. 不在本轮扩散成全量权限体系重构；
4. 不改 AI provider 选型与模型接入链路，除非排查中确认它们同样阻断执行。

### 七、待确认后的最小实施思路

#### Phase A：统一权威身份字段
- 盘清后端 AI guard 当前读取的 `role/username` 来源；
- 明确当前认证上下文是否支持角色集合；
- 若后端本就有权威角色集合，则 AI guard 应改为基于集合判定，而不是单个主角色。

#### Phase B：前端只做与后端一致的预判
- 调整 `useAiPermissions()`，避免继续以不一致的 `user.role[]` 本地推导作为最终准入判断；
- 必要时将按钮显隐与后台任务可执行性统一收敛到同一能力判定。

#### Phase C：统一拒绝体验
- 若用户未授权：前后端都一致拒绝；
- 若用户已授权：前端不应显示可用而后端仍返回 403；
- 背景任务成功时，生产与 DEV 都应能生成 unread insight。

### 八、验证要求
待实施阶段至少验证：

1. 授权用户在 DEV / 生产均可成功触发背景任务；
2. 授权用户点击 AI 后，后台简报任务可成功完成并出现 `DailyInsightModal`；
3. 未授权用户在前后端均被一致拒绝，且拒绝原因一致；
4. `/api/v1/ai/proxy` 不再对“前端已判定可用”的同一用户返回治理 403。

### 九、风险与注意事项
1. 若只改前端显隐，不改后端 guard，仍会继续出现生产 403；
2. 若只改后端默认放开，不统一口径，会留下治理策略漂移隐患；
3. 若直接把所有用户加入白名单，只是绕过问题，不是根治。

## 仓储报表异常专项（2026-04-07，待确认）

### 一、当前目标
本专项用于收口仓储报表当前异常链路的根因判断与后续验证顺序。

本轮不直接改业务代码，只明确：

1. 当前异常实际发生在哪条调用链；
2. 哪些日志是主因，哪些只是伴随 warning；
3. 后续应优先验证运行 bundle 与仓库代码是否一致；
4. 如何避免把问题误修成补丁式 try/catch 或全局 API 魔改。

### 二、已确认调用链

#### 入口
- `src/features/warehouse/hooks/use-report.ts`

#### 主数据加载
- `inventoryService.searchMasterData()`

#### 下游依赖
- `materialService.getMaterialOptions()`
- `inventoryService.getAlertThresholds()`

### 三、当前异常现象
用户反馈的控制台信息主要有两类：

1. `MaterialService.getMaterialOptions ... expected an object response`
2. `InventoryService [MOCK_SERVICE] getAlertThresholds is returning empty initial object`

两者同时出现，容易误导为同一根因，但当前只读分析显示它们不是同级别问题。

### 四、根因判断

#### 1) `MaterialService.getMaterialOptions` 报错更像旧 bundle 漂移
当前仓库代码里，`src/features/material-archive/services/material-service.ts` 的 `getMaterialOptions()` 已经按数组响应校验收口。

也就是说，当前源码语义应更接近：

- 接受 `apiFetch` 解包后的数组结果
- 使用数组 guard，而不是对象 guard

但用户现场报错文案仍然是：

- `expected an object response`

这与当前仓库代码不一致，因此最合理的判断是：

- 运行中的前端 bundle 仍是旧版本；
- 或浏览器 / CDN / 部署缓存仍命中旧静态资源；
- 或部署产物与当前本地仓库版本不一致。

#### 2) `getAlertThresholds()` mock warning 不是主因
`inventoryService.getAlertThresholds()` 当前确实是 mock，实现为返回空对象并打 warning。

但它对应的是：

- “阈值能力尚未接后端”的事实提醒

而不是：

- `MaterialService.getMaterialOptions` 契约错误的直接原因

因此该 warning 更像伴随噪音，而非导致报表初始化失败的根因。

### 五、后续验证顺序（待确认后执行）

#### 第一步：验证运行 bundle 是否为最新产物
优先检查：

1. 重新构建前端；
2. 确认部署的静态资源 hash 是否更新；
3. 浏览器强制刷新 / 清缓存后复测仓储报表；
4. 对照运行时 source map 或打包产物，确认 `getMaterialOptions()` 是否仍包含旧对象 guard 文案。

#### 第二步：仅在运行产物已确认最新后，再判断是否仍有真实代码缺口
如果最新 bundle 下仍报错，再进入下一轮代码级排查：

1. 复核 `searchMasterData()` 的聚合返回结构；
2. 复核仓储报表页面是否有旧调用方依赖过期 shape；
3. 再判断 `getAlertThresholds()` 是否需要从 mock 升级为真实后端接口或显式空态协议。

### 六、明确不做事项
1. 不把本问题误修成“改全局 `apiFetch` 行为”；
2. 不通过前端 try/catch 吞错来掩盖 bundle 漂移；
3. 不把 `getAlertThresholds()` mock warning 当作主因处理；
4. 不在未确认运行产物版本前贸然继续改 `material-service.ts`。

### 七、建议实施方式
若后续进入执行阶段，建议先做“验证类动作”而非改代码：

1. 重建前端；
2. 确认部署结果；
3. 复测仓储报表；
4. 仅在异常仍存在时再进入代码层修复。

