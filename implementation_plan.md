### 1. warehouse 第四阶段：stocktake 子域拆分规划

日期：2026-04-11  
状态：待批准

#### 1.1 当前现状

在 `warehouse-category`、`shipment` 与 `inventory` 已完成规划并逐步收口后，`warehouse` 剩余未独立成子域的核心复杂部分主要集中在 `stocktake`。

当前 `stocktake` 相关能力通常分散在以下层次：

1. 盘点任务主数据与盘点明细
2. 盘点执行与差异计算
3. 调整审批、调整执行与调整历史
4. PDA 扫描上报、批量同步与离线补偿链路
5. 页面级盘点管理与盘点报表

现有关键入口通常包括：

1. `stocktake-core-service`
2. `stocktake-execution-service`
3. `stocktake-report-service`
4. `stocktake-pda-service`
5. `use-stock-maintenance` 等页面级 hooks

当前核心问题不是单点 bug，而是盘点相关能力同时横跨：

1. `inventory` 基础能力消费
2. `warehouse-category` 场景过滤
3. `approval / adjustment` 业务链路
4. PDA 终端同步链路

因此，`stocktake` 子域如果不先做边界规划，后续执行容易再次把 `inventory` 或 `shipment` 已经拆好的边界拉回去。

#### 1.2 本轮目标

本轮目标不是立即执行 `stocktake` 重构，而是先完成正式子域拆分规划，定义职责边界、优先迁移顺序与兼容策略。

本轮目标如下：

1. 明确 `stocktake` 子域的领域边界、类型归属与统一入口。
2. 明确其与 `inventory / warehouse-category / pda` 的依赖关系。
3. 明确旧 `stocktake-*` 服务与页面级 hooks 的渐进收口路径。
4. 明确第一批优先迁移对象，避免把 PDA、审批、报表一次性全部重构。

#### 1.3 建议子域边界

`stocktake` 子域建议承载以下职责：

1. 盘点任务实体
2. 盘点明细实体
3. 盘点创建、开始、完成、差异计算等任务生命周期
4. 盘点执行与扫描结果归集
5. 盘点相关报表与任务视图

建议不直接纳入 `stocktake` 子域核心边界的内容：

1. 库存基础查询与库存记录本身（继续归 `inventory`）
2. 仓库分类配置本身（继续归 `warehouse-category`）
3. 发货事务（继续归 `shipment`）

需要谨慎处理、分阶段纳入的内容：

1. 调整审批与调整执行
2. PDA 离线同步与队列补偿

#### 1.4 建议目录结构

建议新增目录：

1. `src/features/warehouse/stocktake/data/`
2. `src/features/warehouse/stocktake/contracts/`
3. `src/features/warehouse/stocktake/adapters/`
4. `src/features/warehouse/stocktake/services/`
5. `src/features/warehouse/stocktake/hooks/`
6. `src/features/warehouse/stocktake/index.ts`

建议执行初期先不迁移复杂页面组件层，优先稳定任务与执行数据链。

#### 1.5 建议第一批优先迁移对象

##### A. data / contracts / adapters

优先拆出：

1. `StocktakeTask`
2. `StocktakeItem`
3. `StocktakeCreateInput`
4. PDA 扫描载荷与同步响应类型
5. 与上述实体直接相关的 API DTO 与 adapter

理由：这是 `stocktake` 的最小领域契约，后续服务、PDA、报表与页面都依赖这些类型。

##### B. services

优先拆出：

1. `stocktake-core-service` 中的任务查询与创建能力
2. `stocktake-execution-service` 中的开始、完成、扫描写入等执行能力

建议延后处理：

1. `stocktake-report-service`
2. `stocktake-pda-service` 中更复杂的同步/容错逻辑
3. 与审批/调整执行深耦合的方法

##### C. hooks

建议第一批只迁移与任务查询、任务执行直接相关的基础 hooks；页面级组合 hooks 延后。

#### 1.6 依赖边界建议

1. **`stocktake -> inventory`**
   - 允许消费库存基础能力（库存记录、库存视图、分类库存、库存修正）
   - 不反向把盘点编排塞回 `inventory`

2. **`stocktake -> warehouse-category`**
   - 允许消费分类配置与场景过滤结果
   - 不承接分类主数据维护职责

3. **`stocktake -> pda`**
   - PDA 是 `stocktake` 的输入通道之一，但不应让终端同步基础设施反向决定盘点领域边界

4. **`stocktake -> approval`**
   - 调整审批是盘点后续业务链的一部分，但建议与盘点核心执行链分阶段处理

#### 1.7 旧入口兼容策略

建议延续前几阶段模式：

1. 新 `warehouse/stocktake` 子域承接真实实现
2. 旧 `stocktake-*` 服务文件保留兼容转发层
3. 先迁移数据链与基础服务，再切页面级消费方
4. 初期不删除旧入口

#### 1.8 风险与控制策略

1. **PDA 链路放大风险**
   - 一旦把 PDA 同步、离线补偿、终端配置一起拉进来，范围会迅速膨胀。
   - 控制策略：第一批先只处理盘点核心任务与执行数据链，延后复杂 PDA 同步逻辑。

2. **审批链路牵连风险**
   - 调整审批与执行可能横跨 approval、inventory、stocktake。
   - 控制策略：先把审批相关能力标为兼容层职责，后续单独收口。

3. **边界回流风险**
   - 若盘点继续直接依赖旧 `inventory-maintenance-service` 的兼容职责，可能再次模糊边界。
   - 控制策略：规划阶段就明确“盘点消费 inventory 基础能力，但不回写 inventory 编排职责”。

#### 1.9 预计执行顺序

若你批准后续执行，建议按以下顺序推进：

1. 先建立 `stocktake` 子域目录与统一出口。
2. 迁移 `data / contracts / adapters`。
3. 迁移盘点核心任务与执行服务。
4. 将旧 `stocktake-*` 服务收口为兼容转发层。
5. 再切换第一批低风险消费方，并执行定向验证。

#### 1.10 当前阶段结论

`stocktake` 已经成为 `warehouse` 剩余结构中下一个最合适独立的复杂子域。最合理的第四阶段策略是先拆任务与执行数据链，再分阶段处理 PDA 与审批链路，避免一次性把复杂度全部卷入。

### 2. warehouse 第三阶段补充：inventory 第一批兜底一致性清理规划

日期：2026-04-11  
状态：待批准

#### 1.1 当前现状

`inventory` 第三阶段经过第一批拆分、`inventory-maintenance-service` 收口以及第二批消费方切换后，已经具备新子域的基本结构与消费面。但当前仍存在一个典型过渡期问题：

1. 新 `warehouse/inventory` 入口已经可用
2. 旧 `inventory-core-service / inventory-maintenance-service / inventory-transaction-service` 仍保留兼容兜底
3. 局部调用点已经切到新入口，局部调用点仍因兼容职责或历史残留继续走旧入口

如果此时不做一次“第一批兜底一致性清理”，后续很容易继续出现：

1. 新代码有人继续从旧平面入口导入
2. 同一语义在不同文件里出现新旧两种写法
3. 后续批次迁移又把已经统一过的边界重新写乱

#### 1.2 本轮目标

本轮目标不是继续扩大量迁移，而是对第一批已完成的 `inventory` 拆分结果做一次一致性收口，确保后续新增代码不会重新回到“双路写法”。

本轮目标如下：

1. 明确 `warehouse/inventory` 是库存基础能力的统一新入口。
2. 明确旧 `inventory-*` 服务只保留兼容兜底职责。
3. 识别第一批遗留的“双路导入 / 双路类型来源 / 双路服务访问”点。
4. 在低风险范围内统一写法，减少后续误用空间。

#### 1.3 统一入口原则

本轮建议明确以下规则：

##### A. 应统一走新入口的内容

以下内容应默认统一从 `src/features/warehouse/inventory/index.ts` 暴露：

1. 库存基础查询服务
2. 入库与库存事务服务
3. 库存基础维护服务
4. 基础类型：
   - `InventoryRecord`
   - `InventoryView`
   - `MasterDataSearchResult`
   - `InboundRecord`
   - `InventoryAlertSummary`

##### B. 旧入口仅保留兼容兜底职责

以下旧入口可继续存在，但不应再作为新代码默认依赖：

1. `services/inventory-core-service.ts`
2. `services/inventory-maintenance-service.ts`
3. `services/inventory-transaction-service.ts`

这些文件的角色应被明确为：

1. 兼容历史导入路径
2. 承接暂未迁走的兼容职责
3. 不作为后续新增调用的首选入口

#### 1.4 建议排查的一致性问题

##### A. 双路类型来源

例如同一类基础类型在不同文件中分别来自：

1. `../inventory`
2. `../services/inventory-core-service`
3. `../services/inventory-transaction-service`

##### B. 双路服务访问

例如同样的库存基础能力，在部分文件中走：

1. 新 `../inventory`
2. 旧 `../services/inventory-*`

##### C. 语义上不该继续新增旧入口依赖的文件

重点关注：

1. `tabs`
2. `hooks`
3. `components`
4. 已经进入新子域内部的 `shipment` 相关实现

#### 1.5 建议执行方式

若你批准后续执行，建议按以下顺序推进：

1. 显式搜索仍走旧 `inventory-*` 平面入口的基础类型与基础服务调用。
2. 按“库存基础能力 / 兼容职责”二分法分类。
3. 对属于库存基础能力的调用，统一切到 `warehouse/inventory` 新入口。
4. 对兼容职责相关调用，只做标注保留，不强行切换。
5. 执行定向 `eslint` / `tsc` 验证，并更新 `walkthrough.md`。

#### 1.6 风险与控制策略

1. **过度收紧风险**
   - 若为了统一而把兼容职责也一并切走，容易误伤 `shipment / stocktake` 现有链路。
   - 控制策略：只统一库存基础能力入口，不动兼容职责调用。

2. **表面一致、语义不一致风险**
   - 仅统一 import 路径但不明确职责，后续仍可能再次写回旧入口。
   - 控制策略：本轮明确“新入口默认、旧入口兜底”的规则，并在文档中固定下来。

3. **收益递减风险**
   - 剩余问题可能很零散，必须避免为追求绝对整洁而放大改动范围。
   - 控制策略：只处理对一致性收益明显、且验证成本低的调用点。

#### 1.7 当前阶段结论

`inventory` 当前最需要的不是再立即扩大迁移面，而是先做一次“第一批兜底一致性收口”，把统一入口与兼容兜底的边界彻底固定下来，避免后续批次又重新写回双路结构。

### 3. warehouse 第三阶段补充：inventory 第二批消费方切换规划

日期：2026-04-11  
状态：待批准

#### 1.1 当前现状

`inventory` 第三阶段第一批已经完成以下工作：

1. 新 `warehouse/inventory` 子域骨架已建立
2. 旧 `inventory-core-service / inventory-maintenance-service / inventory-transaction-service` 已开始兼容转发
3. 第一批低风险消费方已切到新 `inventory` 入口
4. `inventory-maintenance-service` 的库存基础维护能力边界已进一步确认

但当前仍有可能存在剩余的低风险调用点继续通过旧 `inventory-*` 平面入口访问基础能力，尚未完全切到 `warehouse/inventory` 统一入口。

#### 1.2 本轮目标

本轮目标是完成 `inventory` 的第二批低风险消费方切换，而不是扩大为整个 `warehouse` 的全量 import 清理或直接进入 `stocktake` 子域执行。

本轮目标如下：

1. 检索仍直接引用以下旧平面入口的调用点：
   - `src/features/warehouse/services/inventory-core-service.ts`
   - `src/features/warehouse/services/inventory-maintenance-service.ts`
   - `src/features/warehouse/services/inventory-transaction-service.ts`
2. 判断这些调用点是否适合直接切到 `warehouse/inventory` 子域统一入口。
3. 仅对低风险、无业务编排耦合的消费方做第二批切换。
4. 保留旧 `inventory-*` 兼容入口，不在本轮删除。

#### 1.3 明确执行边界

本轮只做 `inventory` 第二批消费方切换，不做以下事项：

1. 不进入 `stocktake` 子域执行。
2. 不重写共享聚合层或全量 import 结构。
3. 不删除旧 `inventory-*` 服务文件。
4. 不把非库存基础兼容职责强行迁入新 `inventory` 子域。

#### 1.4 建议排查对象

##### A. 直接型消费方

优先排查仍直接引用旧 `inventory-*` 平面入口的页面、hooks、components：

1. `tabs`
2. `hooks`
3. `components`
4. 与报表、入库、库存管理直接相关的页面级文件

##### B. 间接但低风险的类型消费方

优先排查仅通过旧服务拿 `InventoryView / InboundRecord / MasterDataSearchResult / InventoryAlertSummary` 等类型的调用点。

处理原则：

1. 若只是消费基础服务或基础类型，则优先切到 `../inventory`
2. 若涉及发货作废、盘点审批、调整历史等兼容职责，则继续保留旧层

#### 1.5 建议执行方式

若你批准后续执行，建议按以下顺序推进：

1. 显式搜索剩余旧 `inventory-*` 平面入口引用。
2. 将命中点分为：
   - 可直接切到 `warehouse/inventory` 的低风险消费方
   - 应继续保留旧兼容层的非库存基础调用点
3. 完成第二批低风险切换。
4. 执行定向 `eslint` / `tsc` 验证，并更新 `walkthrough.md`。

#### 1.6 风险与控制策略

1. **共享链路误切风险**
   - 某些旧 `inventory-*` 服务入口同时承载兼容职责，不能按文件整体替换。
   - 控制策略：按方法与调用语义判断，而不是按文件全量替换。

2. **边界再次混淆风险**
   - 若把盘点或发货兼容职责也一起迁入 `inventory`，会模糊第三阶段边界。
   - 控制策略：只切库存基础能力消费方。

3. **收益递减风险**
   - 第二批剩余调用点可能更分散，继续推进要避免为了清理而清理。
   - 控制策略：只处理低风险、可验证、对边界有明确收益的调用点。

#### 1.7 当前阶段结论

`inventory` 已具备继续做第二批消费方切换的条件，但应坚持“低风险基础能力优先、兼容职责保守留旧层”的原则，避免在第三阶段中后段重新放大改动范围。

### 4. warehouse 第三阶段补充：inventory-maintenance-service 收口规划

日期：2026-04-11  
状态：待批准

#### 1.1 当前现状

`inventory` 第三阶段第一批已完成共享数据链、基础服务骨架与首批低风险消费方切换，但 `inventory-maintenance-service` 仍处于“新旧并存”的过渡状态。

当前旧 `src/features/warehouse/services/inventory-maintenance-service.ts` 中同时混有两类职责：

1. **库存基础维护能力**
   - `reconcileInventory`
   - `patchInventory`
   - `setAlertThreshold`
   - `getAlertThresholds`
2. **暂不应并入 inventory 基础子域的兼容职责**
   - `deleteShipmentRecord`（发货作废）
   - `submitAdjustmentForApproval`
   - `getAdjustmentHistory`
   - `executeAdjustment`

目前第一类能力已经部分转发到新 `inventory` 子域，但边界仍可继续收紧；第二类能力仍留在旧层，符合当前阶段策略。

#### 1.2 本轮目标

本轮目标是在不扩大到 `shipment / stocktake` 主体改造的前提下，继续把**库存基础维护能力**从旧 `inventory-maintenance-service` 收口到新 `inventory` 子域。

本轮目标如下：

1. 明确新 `inventory` 子域中应继续承接的维护职责。
2. 继续将低风险消费方改为直接使用新 `inventory` 入口。
3. 保留发货作废、盘点审批与调整历史等非库存基础职责在旧兼容层。
4. 不删除旧 `inventory-maintenance-service.ts`，继续将其作为兼容桥接层。

#### 1.3 建议职责边界

##### A. 应继续归入新 `inventory` 子域

1. `reconcileInventory`
2. `patchInventory`
3. `setAlertThreshold`
4. `getAlertThresholds`

这类能力的共同特征是：

1. 面向库存主数据或库存记录本身
2. 不依赖发货业务状态
3. 不依赖盘点任务编排

##### B. 暂时保留在旧兼容层

1. `deleteShipmentRecord`
2. `submitAdjustmentForApproval`
3. `getAdjustmentHistory`
4. `executeAdjustment`

原因：

1. `deleteShipmentRecord` 明显属于 `shipment` 兼容链路，而非库存基础维护
2. 调整审批与调整历史仍与 `stocktake` / `warehouse adjustment` 编排耦合较深
3. 这些逻辑若强行并入 `inventory`，会再次模糊子域边界

#### 1.4 建议继续切换的低风险消费方

优先检查以下消费点是否仍引用旧 `inventory-maintenance-service`：

1. `use-stock-mgmt.ts`
2. `use-report.ts`
3. `shipment` 子域中仅为获取阈值等库存基础维护能力而使用该服务的调用点

处理策略：

1. 若调用的是库存基础维护能力，则直接改为从 `warehouse/inventory` 入口消费
2. 若调用的是发货作废或盘点审批相关能力，则继续保留旧入口

#### 1.5 建议执行方式

若你批准后续执行，建议按以下顺序推进：

1. 先审查旧 `inventory-maintenance-service.ts` 的实际调用点。
2. 将仍适合归属 `inventory` 的消费方切到新 `inventory` 入口。
3. 保留旧服务文件，仅承接兼容层与非库存基础职责。
4. 执行定向 `eslint` / `tsc` 验证，并更新 `walkthrough.md`。

#### 1.6 风险与控制策略

1. **职责回流风险**
   - 若把发货或盘点相关动作继续塞入 `inventory` 子域，会破坏当前拆分成果。
   - 控制策略：只收口库存基础维护能力，不动非库存基础职责。

2. **消费链误切风险**
   - 某些调用点虽然表面上引用 `inventory-maintenance-service`，但实际调用的是兼容层职责。
   - 控制策略：按方法粒度判断，而不是按文件粒度全量替换。

3. **兼容层过早瘦身风险**
   - 若过早删除旧方法或重排旧服务，会影响尚未拆出的 `stocktake` 链路。
   - 控制策略：本轮只继续“迁移基础维护消费方”，不删旧兼容实现。

#### 1.7 当前阶段结论

`inventory-maintenance-service` 已经具备继续收口的条件，但必须坚持“库存基础维护能力进新子域、发货/盘点兼容职责留旧层”的边界原则，才能保持第三阶段低风险推进。

### 5. warehouse 第三阶段：inventory 子域拆分规划

日期：2026-04-11  
状态：待批准

#### 1.1 当前现状

在 `warehouse-category` 与 `shipment` 两个子域完成规划、执行与低风险收口后，`warehouse` 剩余结构中最核心、最基础的部分已经转向 `inventory`。

当前 `inventory` 仍承担以下聚合职责：

1. 库存台账与库存查询
2. 主数据搜索与库存分解查询
3. 入库历史与库存视图查询
4. 库存预警阈值、盘点校准、转移等维护动作
5. 部分仍作为其它子域的基础依赖被消费

现有关键入口主要集中于：

1. `src/features/warehouse/services/inventory-core-service.ts`
2. `src/features/warehouse/services/inventory-maintenance-service.ts`
3. `src/features/warehouse/services/inventory-transaction-service.ts`
4. `src/features/warehouse/adapters/warehouse-api-adapter.ts`
5. `src/features/warehouse/contracts/warehouse-api-dto.ts`
6. 与库存相关的 hooks / tabs / 报表链路

当前核心问题不是功能缺失，而是 `inventory` 仍是 `warehouse` 中最大的剩余聚合核心，承担读写、类型、DTO、adapter 与共享基础能力，尚未形成独立子域边界。

#### 1.2 本轮目标

本轮目标不是立即执行 `inventory` 重构，而是先完成正式拆分规划，为后续执行阶段定义边界、顺序与兼容策略。

本轮目标如下：

1. 明确 `inventory` 子域的领域边界、类型归属与统一入口。
2. 明确 `inventory` 与 `shipment / stocktake / warehouse-category` 的依赖边界。
3. 明确旧 `inventory-core-service / inventory-maintenance-service / inventory-transaction-service` 的渐进收口路径。
4. 明确第一批优先迁移对象，避免一次性拆太多。

#### 1.3 建议子域边界

`inventory` 子域建议承载以下职责：

1. 库存记录、库存视图、库存价值与库存预警摘要等核心领域类型
2. 主数据搜索结果与库存分解、分类库存查询
3. 入库记录相关 DTO、adapter、service
4. 库存维护动作：预警阈值、盘点校准、库间转移、库存重算
5. 对外提供被 `shipment / stocktake / reports` 复用的库存基础能力

建议不纳入 `inventory` 子域的职责：

1. 发货事务本身（已归入 `shipment`）
2. 仓库分类配置（已归入 `warehouse-category`）
3. 盘点业务编排（后续归入 `stocktake`）

#### 1.4 建议目录结构

建议新增目录：

1. `src/features/warehouse/inventory/data/`
2. `src/features/warehouse/inventory/contracts/`
3. `src/features/warehouse/inventory/adapters/`
4. `src/features/warehouse/inventory/services/`
5. `src/features/warehouse/inventory/hooks/`
6. `src/features/warehouse/inventory/index.ts`

建议第一阶段先不迁移 `inventory` 组件层，而是优先稳定共享数据链。

#### 1.5 建议第一批优先迁移对象

优先级建议如下：

##### A. data / contracts / adapters

优先拆出：

1. `InventoryRecord`
2. `InventoryView`
3. `MasterDataSearchResult`
4. `InboundRecord`
5. `InventoryAlertSummary`
6. 与上述类型直接相关的 API DTO 与 adapter

理由：这些是 `inventory` 作为基础子域的最小共享契约，后续 `reports / inbound / shipment / stocktake` 都会依赖。

##### B. services

优先拆出：

1. `inventory-core-service` 的纯查询能力
2. `inventory-maintenance-service` 中明显属于库存基础维护的能力
3. `inventory-transaction-service` 中仅保留入库与共享库存事务，发货相关已继续留在 `shipment` 子域

理由：当前 `inventory-transaction-service` 已经部分去发货化，适合继续收紧为真正的库存/入库事务入口。

##### C. hooks

建议仅迁移和库存基础查询强相关、且不直接绑定页面编排的 hooks。页面级复合 hooks 可延后。

#### 1.6 依赖边界建议

1. **`inventory -> warehouse-category`**
   - 允许消费分类配置与分类选项，但不反向承载分类业务

2. **`shipment -> inventory`**
   - `shipment` 继续消费库存基础能力（主数据搜索、分类库存、库存分解、历史查询）
   - 不再让 `inventory` 承担发货编排职责

3. **`stocktake -> inventory`**
   - 后续盘点子域应消费库存基础能力，但不把盘点编排反向塞回 `inventory`

4. **`reports -> inventory`**
   - 报表继续读取库存与入库数据，但类型与查询能力应来自新 `inventory` 子域统一入口

#### 1.7 旧入口兼容策略

建议延续前两阶段模式：

1. 新 `inventory` 子域目录承接真实实现
2. 旧 `warehouse/services/inventory-*` 保留兼容转发层
3. 先切换低风险直接消费方，再排查间接依赖
4. 不在初期删除旧入口

#### 1.8 风险与控制策略

1. **共享基础链路风险**
   - `inventory` 被多处复用，拆分失误会影响 `shipment / reports / inbound / stocktake`
   - 控制策略：优先拆 data/contracts/adapters 与纯查询服务，不先动页面编排

2. **边界混淆风险**
   - 入库、发货、盘点都与库存有关，容易再次把职责混回去
   - 控制策略：以“库存基础能力”作为 `inventory` 核心，发货和盘点只作为消费方

3. **改动面过大风险**
   - 若一次迁移太多 hooks / components，会迅速放大回归面
   - 控制策略：本阶段执行优先只动共享数据链和基础服务

#### 1.9 预计执行顺序

若你批准后续执行，建议按以下顺序推进：

1. 先建立 `inventory` 子域目录与统一出口。
2. 迁移 `data / contracts / adapters`。
3. 迁移 `inventory-core-service` 与 `inventory-maintenance-service` 中的库存基础能力。
4. 收紧 `inventory-transaction-service`，明确其只保留入库与库存事务。
5. 再切换第一批低风险消费方并执行定向验证。

#### 1.10 当前阶段结论

`inventory` 已经成为 `warehouse` 剩余结构中的下一个核心拆分对象。最合理的第三阶段策略是先稳定共享数据链与基础服务边界，再逐步让 `shipment / reports / stocktake` 转向新 `inventory` 子域入口。

### 6. warehouse 第二阶段补充：warehouse-export-service 历史 lint 清理规划

日期：2026-04-11  
状态：待批准

#### 1.1 当前现状

在 `shipment` 的直接消费面与一跳间接依赖清理完成后，当前最明显的遗留问题集中在 `src/features/warehouse/services/warehouse-export-service.ts`。

该文件当前存在以下历史问题：

1. `no-console`
2. `@typescript-eslint/no-explicit-any`
3. 导出下载逻辑集中在同一服务中，职责边界偏粗，但短期内仍可在不改变行为的前提下做局部收紧

#### 1.2 本轮目标

本轮目标不是重写导出基础设施，而是在保持行为不变的前提下，单独清理 `warehouse-export-service.ts` 的历史 lint 与明显的类型缺口。

本轮目标如下：

1. 清理 `console` 语句，改为符合当前项目规范的日志或错误处理方式。
2. 清理 `any`，为导出下载相关对象补充最小必要类型。
3. 在不改动导出结果与交互行为的前提下，收紧导出服务的职责边界。
4. 不影响现有入库 / 发货报表导出功能。

#### 1.3 明确执行边界

本轮只处理 `warehouse-export-service.ts`，不做以下事项：

1. 不扩大到整个 `warehouse/services` 统一重构。
2. 不联动修改 `use-report.ts`、`report-tables.tsx` 的业务行为。
3. 不重写 `loadExcelJS` 的基础设施。
4. 不引入新的导出框架或依赖。

#### 1.4 建议执行方式

若你批准后续执行，建议按以下顺序推进：

1. 先读取 `warehouse-export-service.ts` 的当前实现，确认 `console` 与 `any` 的具体位置和用途。
2. 用项目已有日志设施或更合适的错误抛出方式替换 `console`。
3. 为下载环节补充最小必要类型，去掉 `any`。
4. 保持导出文件名、sheet 名称、列定义和下载行为不变。
5. 执行定向 `eslint` / `tsc` 验证，并更新 `walkthrough.md`。

#### 1.5 风险与控制策略

1. **行为回归风险**
   - 导出服务同时承载入库与发货导出，误改逻辑会影响实际下载结果。
   - 控制策略：本轮只修 lint 与类型，不调整导出字段、文件名与工作表结构。

2. **错误处理语义变化风险**
   - 直接删除 `console` 可能让问题排查能力下降。
   - 控制策略：优先替换为项目统一日志设施，保留必要错误上下文。

3. **类型过度设计风险**
   - 若为 Excel 工作簿对象引入过重的类型封装，会放大修改范围。
   - 控制策略：仅补齐最小必要类型，不做额外抽象。

#### 1.6 当前阶段结论

`warehouse-export-service.ts` 已经从 `shipment` 子域边界清理中暴露为独立技术债点，适合单独作为低风险收口任务处理，而不应继续和子域拆分任务混在一起扩大修改范围。

### 7. warehouse 第二阶段补充：shipment 间接依赖清理规划

日期：2026-04-11  
状态：待批准

#### 1.1 当前现状

`shipment` 已完成两层收口：

1. 领域类型、事务入口、hooks 与 components 已迁入 `warehouse/shipment`
2. 直接消费面已完成排查，当前未发现继续直接引用旧 `shipment` 平面入口的页面或组件

因此，若还要继续推进 `shipment` 的架构清理，下一层重点不再是页面级直接 import，而是检查是否仍存在通过聚合 helper / service / barrel 间接依赖旧兼容层的情况。

#### 1.2 本轮目标

本轮目标是排查并清理 `warehouse` 范围内对旧 `shipment` 兼容层的间接依赖，而不是扩大为跨子域重构。

本轮目标如下：

1. 识别是否存在通过聚合 helper / service / barrel 间接依赖以下旧兼容层的路径：
   - `src/features/warehouse/hooks/use-shipment.ts`
   - `src/features/warehouse/hooks/use-shipment-bootstrap.ts`
   - `src/features/warehouse/hooks/use-shipment-form-state.ts`
   - `src/features/warehouse/hooks/use-shipment-search.ts`
   - `src/features/warehouse/hooks/use-shipment-inventory-context.ts`
   - `src/features/warehouse/components/shipment-search.tsx`
   - `src/features/warehouse/components/shipment-history.tsx`
   - `src/features/warehouse/components/shipment-dialog.tsx`
   - `src/features/warehouse/services/inventory-transaction-service.ts` 中发货相关转发方法
2. 判断这些间接依赖是否可以安全改为直接指向 `warehouse/shipment`。
3. 只清理低风险、局部可收口的间接依赖。
4. 保留旧兼容层，不在本轮删除。

#### 1.3 明确执行边界

本轮只做 `shipment` 间接依赖清理，不做以下事项：

1. 不进入 `inventory` 第三阶段执行。
2. 不联动修改 `sales / logistics / stocktake` 主体结构。
3. 不做跨子域的公共抽象重构。
4. 不删除旧 `shipment` 兼容层文件。

#### 1.4 建议排查对象

##### A. 聚合出口 / barrel

优先检查以下类型文件是否继续导出或包裹旧 `shipment` 平面入口：

1. `warehouse` 范围内的 `index.ts` / barrel 文件
2. 聚合 hooks 导出文件
3. 聚合 service 导出文件

##### B. 中间 helper / service

优先检查以下类型实现是否通过中间层继续引用旧兼容层：

1. 以 `*-service.ts` 命名的聚合服务
2. 以 `*-config.ts`、`*-utils.ts` 命名的 helper
3. `tabs / components` 之外的中间桥接层

##### C. 发货事务转发链

重点确认：

1. 是否仍有上游聚合 service 通过 `InventoryTransactionService` 间接依赖发货事务入口
2. 是否存在仅为兼容旧命名保留、但实际已经可以直接引用 `ShipmentTransactionService` 的中间桥接层

#### 1.5 预计执行方式

若你批准后续执行，建议按以下顺序推进：

1. 检索 `warehouse` 范围内的聚合 `index.ts / service / helper` 文件，确认是否仍引用旧 `shipment` 兼容层。
2. 将命中的调用链分为：
   - 可直接替换为 `warehouse/shipment` 的低风险调用
   - 暂不处理的高耦合中间层
3. 仅对低风险调用点做最小范围替换。
4. 执行 `eslint` 与 `tsc` 定向验证，并补充 `walkthrough.md`。

#### 1.6 风险与控制策略

1. **误把兼容层本身当成问题源**
   - 旧兼容层文件本身是设计内保留，不应因为“仍存在”就被误删。
   - 控制策略：只清理对兼容层的上游依赖，不删除兼容层本体。

2. **调用链过深导致范围扩大**
   - 间接依赖通常藏在聚合 service / helper 之后，容易越查越深。
   - 控制策略：只处理一跳可替换的中间依赖，深层链路仅记录。

3. **跨子域牵连风险**
   - 某些 helper / service 可能同时服务 `inventory / shipment / stocktake`。
   - 控制策略：遇到共享聚合层时优先保守，不做跨子域拆分。

#### 1.7 当前阶段结论

`shipment` 当前已完成直接消费面收口。若还要继续压缩历史耦合，最合理的下一步是排查聚合 helper / service / barrel 是否仍在间接依赖旧兼容层，并只处理低风险可替换点。

### 8. warehouse 第二阶段补充：shipment 第二批消费方排查与切换规划

日期：2026-04-11  
状态：待批准

#### 1.1 当前现状

`shipment` 已完成两轮收口：

1. 核心领域类型、事务入口与 hooks 已迁入 `warehouse/shipment`
2. 第一批 UI 消费面（`shipment-search / shipment-history / shipment-dialog / product-shipment.tsx`）已切换到新子域入口

当前剩余风险点在于：仓库模块内部可能仍有其它页面、组件或服务直接引用旧 `shipment` 平面入口，导致子域边界虽然已建立，但消费面仍未完全收口。

#### 1.2 本轮目标

本轮目标是完成 `shipment` 的第二批消费方排查与最小范围切换，而不是扩大为整个 `warehouse` 的统一 import 清理工程。

本轮目标如下：

1. 检索仍直接引用以下旧入口的调用点：
   - `src/features/warehouse/hooks/use-shipment.ts`
   - `src/features/warehouse/hooks/use-shipment-bootstrap.ts`
   - `src/features/warehouse/hooks/use-shipment-form-state.ts`
   - `src/features/warehouse/hooks/use-shipment-search.ts`
   - `src/features/warehouse/hooks/use-shipment-inventory-context.ts`
   - `src/features/warehouse/components/shipment-search.tsx`
   - `src/features/warehouse/components/shipment-history.tsx`
   - `src/features/warehouse/components/shipment-dialog.tsx`
   - `src/features/warehouse/services/inventory-transaction-service.ts` 的发货方法导入点
2. 判断这些引用是否适合直接切到 `warehouse/shipment` 子域统一入口。
3. 仅对低风险、直接型调用点做第二批切换。
4. 保留旧入口兼容层，不在本轮直接删除。

#### 1.3 明确执行边界

本轮只做 `shipment` 第二批消费方排查与切换，不做以下事项：

1. 不进入 `inventory` 第三阶段执行。
2. 不联动修改 `logistics / sales` 模块内部实现。
3. 不做整个 `warehouse` 目录的全量 import 重写。
4. 不提前清理旧兼容入口。

#### 1.4 建议排查策略

##### A. 直接入口搜索

优先搜索所有直接引用以下路径的文件：

1. `../hooks/use-shipment`
2. `../hooks/use-shipment-bootstrap`
3. `../hooks/use-shipment-form-state`
4. `../hooks/use-shipment-search`
5. `../hooks/use-shipment-inventory-context`
6. `../components/shipment-search`
7. `../components/shipment-history`
8. `../components/shipment-dialog`
9. `InventoryTransactionService.recordShipment`
10. `InventoryTransactionService.commitShipment`

##### B. 调用点分类

排查结果按两类处理：

1. **直接型消费方**
   - 页面或组件仅做 import 消费，无额外中间封装
   - 这类优先在本轮切换

2. **间接型消费方**
   - 若通过中间 helper / service / 聚合出口转一层
   - 本轮只记录，不做扩大修改，避免放大回归面

#### 1.5 预计执行方式

若你批准后续执行，建议按以下顺序推进：

1. 先做代码检索，列出仍直接引用旧 `shipment` 平面入口的实际文件。
2. 对直接型消费方做最小范围切换到 `warehouse/shipment`。
3. 保持旧入口转发层不变，避免破坏潜在未迁移调用点。
4. 执行 `eslint` 与 `tsc` 定向验证，并补充 `walkthrough.md`。

#### 1.6 风险与控制策略

1. **漏检风险**
   - 旧入口已转发后，运行上可能不出错，但架构层面仍残留历史依赖。
   - 控制策略：本轮先做显式路径检索，避免凭记忆判断。

2. **扩大改动范围风险**
   - 某些旧入口可能连到更深层聚合逻辑，一旦追进去容易演化成大改。
   - 控制策略：只切换直接型消费方，间接型仅记录。

3. **兼容层误删风险**
   - 若在第二批切换时直接删除旧入口，可能影响未发现的调用点。
   - 控制策略：本轮不删除旧入口，只继续把新引用导向 `warehouse/shipment`。

#### 1.7 当前阶段结论

`shipment` 当前已经具备继续做第二批消费方清理的条件，但为了保持低风险，应先完成一次显式调用点排查，再决定最小切换范围。

### 10. warehouse 第二阶段：shipment 子域拆分规划

日期：2026-04-11  
状态：待批准

#### 2.1 当前现状

在 `warehouse-category` 第一阶段完成后，`shipment` 成为当前最适合继续推进的仓储子域，原因如下：

1. 与 `sales / logistics` 的实际耦合最强。
2. 复杂度显著低于 `stocktake`。
3. 已经具备明确的 hooks / components / service 群组，但仍然混在 `warehouse` 大模块内部。

当前 `shipment` 相关实现主要分布于：

1. `src/features/warehouse/hooks/use-shipment.ts`
2. `src/features/warehouse/hooks/use-shipment-bootstrap.ts`
3. `src/features/warehouse/hooks/use-shipment-form-state.ts`
4. `src/features/warehouse/hooks/use-shipment-inventory-context.ts`
5. `src/features/warehouse/hooks/use-shipment-search.ts`
6. `src/features/warehouse/hooks/shipment-hook-types.ts`
7. `src/features/warehouse/components/shipment-dialog.tsx`
8. `src/features/warehouse/components/shipment-history.tsx`
9. `src/features/warehouse/components/shipment-search.tsx`
10. `src/features/warehouse/services/inventory-transaction-service.ts`

当前核心问题不是功能缺失，而是 `shipment` 相关领域类型、DTO、adapter、hook 与 service 仍然散落在仓储大模块中，尚未形成独立子域边界。

#### 2.2 本轮目标

本轮目标不是立即执行 `shipment` 子域重构，而是先完成正式拆分规划，为后续执行提供边界与迁移顺序。

本轮目标如下：

1. 明确 `shipment` 子域的领域边界与类型归属。
2. 明确 `shipment` 与 `sales / logistics / inventory` 的依赖边界。
3. 明确旧入口的保留与退役路径。
4. 明确执行阶段的最小迁移单元，避免一次性大改。

#### 2.3 建议子域边界

`shipment` 子域建议承载以下职责：

1. 发货记录 `ShipmentRecord`
2. 发货状态（`DRAFT / COMMITTED / VOID`）
3. 发货创建、提交、作废操作
4. 发货表单状态与搜索、绑定、库存上下文
5. 发货相关组件与页面交互

建议未来归属：

1. `warehouse/shipment/data`
2. `warehouse/shipment/contracts`
3. `warehouse/shipment/adapters`
4. `warehouse/shipment/services`
5. `warehouse/shipment/hooks`
6. `warehouse/shipment/components`

#### 2.4 与其它子域/模块的依赖边界

##### A. 与 `sales`

保留依赖：

1. 发货时根据 `orderNo` 解析销售单与销售单行
2. 从 `sales` 查询订单明细进行绑定

原则：

1. `shipment` 可以消费 `sales` 查询接口
2. 不反向把 `shipment` 领域类型塞回 `sales`

##### B. 与 `logistics`

保留依赖：

1. `logistics` 可继续引用发货历史或发货 ID 进行绑定
2. `shipment` 与 `logistics` 保持领域协作，而不是合并子域

原则：

1. 不把物流状态链直接并入 `shipment`
2. `shipment` 只负责仓储发货事务本身

##### C. 与 `inventory`

保留依赖：

1. 发货需要读取库存上下文
2. 发货提交/作废会影响库存事务

原则：

1. 第二阶段不直接拆散整个 `inventory-transaction-service`
2. 优先将 `shipment` 相关 record / payload / hook / component 收口到独立子域
3. 对仍留在 `inventory` 的事务入口可先使用兼容转发层

#### 2.5 需要重点收口的旧入口

后续执行时需要重点关注：

1. `src/features/warehouse/services/inventory-transaction-service.ts`
   - 当前同时承担入库与发货交易记录

2. `src/features/warehouse/hooks/use-shipment.ts`
3. `src/features/warehouse/hooks/use-shipment-bootstrap.ts`
4. `src/features/warehouse/hooks/use-shipment-form-state.ts`
5. `src/features/warehouse/hooks/use-shipment-inventory-context.ts`
6. `src/features/warehouse/hooks/use-shipment-search.ts`
7. `src/features/warehouse/hooks/shipment-hook-types.ts`
8. `src/features/warehouse/components/shipment-dialog.tsx`
9. `src/features/warehouse/components/shipment-history.tsx`
10. `src/features/warehouse/components/shipment-search.tsx`

#### 2.6 建议迁移策略

若你批准后续执行，建议按以下顺序推进：

1. **先建立 `warehouse/shipment` 子域骨架**
   - 拆出 `ShipmentRecord`、状态类型、payload 类型、DTO、adapter

2. **再迁移 shipment service 层**
   - 优先抽出与发货直接相关的 service 入口
   - 对旧 `inventory-transaction-service` 先保留转发兼容

3. **再迁移 shipment hooks**
   - 将 `use-shipment*` 系列迁入新子域

4. **最后迁移 shipment components**
   - 将 `shipment-dialog / shipment-history / shipment-search` 切到新子域入口

#### 2.7 风险与控制策略

1. **跨模块依赖风险**
   - `shipment` 同时依赖 `sales / inventory / logistics`。
   - 控制策略：只迁移 `shipment` 自身领域边界，不同步改其它模块结构。

2. **事务入口混合风险**
   - 当前发货与入库都在 `inventory-transaction-service.ts` 中。
   - 控制策略：第二阶段允许旧事务入口继续存在，通过转发层逐步收口。

3. **hook 编排复杂度风险**
   - `use-shipment.ts` 已承担多层编排。
   - 控制策略：先迁类型与 service，再迁 hook，避免一次性改动过大。

#### 2.8 当前阶段结论

`shipment` 适合作为 `warehouse` 第二阶段子域拆分对象，但应继续采用与第一阶段一致的策略：

1. 新子域目录先承接真实实现。
2. 旧入口先保留兼容转发层。
3. 不联动扩大到 `inventory` 与 `logistics` 主体结构。

### 3. warehouse 子域拆分规划：先规划后执行

日期：2026-04-11  
状态：待批准

#### 3.1 当前现状

已确认 `warehouse` 当前并非单一稳定 feature，而是一个承载多个业务子域的聚合模块。当前至少包含以下子域：

1. `warehouse-category`
2. `inventory`
3. `shipment / inbound`
4. `stocktake`

当前服务层已经部分出现子域拆分迹象，例如：

1. `inventory-core-service.ts`
2. `inventory-maintenance-service.ts`
3. `inventory-transaction-service.ts`
4. `stocktake-core-service.ts`
5. `stocktake-maintenance-service.ts`
6. `warehouse-category-core-service.ts`
7. `warehouse-category-maintenance-service.ts`

但 DTO 与 adapter 仍然保持大聚合形态：

1. `src/features/warehouse/contracts/warehouse-api-dto.ts`
2. `src/features/warehouse/adapters/warehouse-api-adapter.ts`

这说明 `warehouse` 当前已经形成“服务层半拆分、契约层未跟进”的结构失衡状态。

#### 3.2 本轮目标

本轮目标不是立即重构 `warehouse`，而是先完成正式的子域拆分规划，为后续分阶段执行建立稳定边界。

本轮目标如下：

1. 明确 `warehouse-category / inventory / shipment / stocktake` 的子域边界。
2. 明确各子域未来应拥有的 `data / contracts / adapters / services / hooks / components` 归属。
3. 明确当前大聚合文件的逐步退役路径。
4. 明确分阶段执行顺序，避免一次性大规模搬迁。

#### 3.3 明确执行边界

本轮**只做规划，不执行业务代码重构**，不做以下事项：

1. 不直接拆分 `warehouse-api-dto.ts`。
2. 不直接拆分 `warehouse-api-adapter.ts`。
3. 不批量修改 `warehouse` 组件 / hook / service 导入路径。
4. 不立即做目录搬迁。
5. 不将本轮演化为一次性仓储域重构。

#### 3.4 建议子域边界

##### A. `warehouse-category`

职责：

1. 仓储分类配置
2. 分类选项
3. 分类默认策略与场景过滤规则

建议未来归属：

1. `warehouse/category/data`
2. `warehouse/category/contracts`
3. `warehouse/category/adapters`
4. `warehouse/category/services`
5. `warehouse/category/hooks`

##### B. `inventory`

职责：

1. 库存台账
2. 库存估值
3. 预警阈值
4. 对账与维护操作

建议未来归属：

1. `warehouse/inventory/data`
2. `warehouse/inventory/contracts`
3. `warehouse/inventory/adapters`
4. `warehouse/inventory/services`
5. `warehouse/inventory/hooks`

##### C. `shipment`

职责：

1. 发货记录
2. 发货提交 / 作废
3. 入库 / 出库交易记录中与发货强相关的部分
4. 与 `sales / logistics` 的绑定关系

建议未来归属：

1. `warehouse/shipment/data`
2. `warehouse/shipment/contracts`
3. `warehouse/shipment/adapters`
4. `warehouse/shipment/services`
5. `warehouse/shipment/hooks`

##### D. `stocktake`

职责：

1. 盘点任务
2. 盘点项
3. PDA 扫描
4. Bulk Sync
5. 调整单与调整明细

建议未来归属：

1. `warehouse/stocktake/data`
2. `warehouse/stocktake/contracts`
3. `warehouse/stocktake/adapters`
4. `warehouse/stocktake/services`
5. `warehouse/stocktake/hooks`

#### 3.5 当前主要结构风险

1. **大聚合 DTO 风险**
   - `warehouse-api-dto.ts` 同时承载多个子域正式契约，已不利于持续演进。

2. **大聚合 adapter 风险**
   - `warehouse-api-adapter.ts` 同时承担领域类型定义与多个子域映射，已成为结构性瓶颈。

3. **hook 编排过重风险**
   - `use-stock-mgmt.ts` 与 `use-shipment.ts` 已承担大量跨层编排职责，若不先分子域，继续小修只会放大复杂度。

4. **服务命名双轨风险**
   - 当前同时存在 `core/maintenance/transaction` 新式 service 与 `category-service.ts / stocktake-service.ts / inbound-service.ts` 等旧式入口，需在后续拆分时明确退役路径。

#### 3.6 建议分阶段执行顺序

若你批准后续执行，建议按以下顺序推进：

1. **第一阶段：`warehouse-category`**
   - 最独立、最适合作为仓储子域拆分模板

2. **第二阶段：`shipment`**
   - 与 `sales / logistics` 耦合高，收口收益明显

3. **第三阶段：`inventory`**
   - 在分类与发货子域边界稳定后再收口库存核心

4. **第四阶段：`stocktake`**
   - 最复杂，最后处理风险最低

#### 3.7 旧文件的规划性退役路径

后续执行时需要重点关注的旧聚合入口：

1. `src/features/warehouse/contracts/warehouse-api-dto.ts`
2. `src/features/warehouse/adapters/warehouse-api-adapter.ts`
3. `src/features/warehouse/services/category-service.ts`
4. `src/features/warehouse/services/stocktake-service.ts`
5. `src/features/warehouse/services/inbound-service.ts`

原则：

1. 不做一次性删除。
2. 每拆完一个子域，再评估对应旧入口是否还能退役。
3. 保持每一阶段都可验证、可回滚、可单独收尾。

#### 3.8 当前阶段结论

`warehouse` 的下一步应是**按子域拆分规划驱动后续重构**，而不是继续做整体小修。

当前推荐的后续执行起点是：

1. 先以 `warehouse-category` 为模板做第一阶段拆分。
2. 在第一阶段稳定后，再推进 `shipment`。
3. 暂不直接进入 `stocktake`。

### 4. logistics 低风险整洁化：根导出收口 + 状态更新 payload 命名化

日期：2026-04-11  
状态：待批准

#### 4.1 当前现状

已确认 `logistics` 当前已经完成第一轮主链收敛，具备：

1. `data / contracts / adapters / services / hooks / components / utils` 的基础分层。
2. `types.ts` 已退出主链。
3. 保存与状态更新链路已走显式 DTO / adapter / service / hook。

当前结构总体稳定，不适合继续扩大为新一轮模块重构。

#### 4.2 本轮目标

本轮仅做低风险整洁化，目标如下：

1. 为 `logistics` 增加根导出文件，收敛外部导入入口。
2. 为状态更新请求 payload 提供明确命名类型，替代 service 中的内联对象类型。

#### 4.3 明确执行边界

本轮**只做结构整洁化**，不做以下事项：

1. 不调整物流业务流程语义。
2. 不调整保存、Patch、状态更新接口协议。
3. 不继续拆更多 command 文件。
4. 不调整组件交互行为。
5. 不演化为物流模块第二轮架构重构。

#### 4.4 计划调整范围

##### A. 根导出收口

预计新增：

1. `src/features/logistics/index.ts`

用于统一导出：

1. `LogisticsMgmt`
2. `useGetLogistics`
3. `useGetLogisticsDetail`
4. `useLogisticsMutations`
5. `LogisticsRecord`
6. `SaveLogisticsRecordInput`
7. `UpdateLogisticsStatusInput`

原则：

1. 不强制改全模块所有相对路径。
2. 只在需要的最小范围内收口外部入口。

##### B. 状态更新 payload 命名化

预计调整：

1. `src/features/logistics/data/schema.ts`
2. `src/features/logistics/services/logistics-service.ts`
3. 如有必要，`src/features/logistics/adapters/logistics-api-adapter.ts`

目标：

1. 将 `logisticsService.updateStatus` 当前内联 payload 类型提升为命名类型。
2. 保持现有字段结构与行为完全不变。
3. 仅提升类型可读性与边界清晰度。

#### 4.5 风险与控制策略

1. **导出面扩大风险**
   - 根导出如果暴露过多实现细节，会反向固化内部结构。
   - 控制策略：只导出稳定、已被明确消费的公共项。

2. **无效整理风险**
   - 若修改面过大，会与“低风险整洁化”目标相违背。
   - 控制策略：不批量替换内部相对导入，仅在必要处做最小变更。

3. **类型漂移风险**
   - 命名化 payload 时如果顺手改变字段，将破坏现有调用链。
   - 控制策略：只抽类型名，不改 payload 字段结构。

#### 4.6 预计执行顺序

若你批准执行，建议按以下顺序推进：

1. 先在 `schema.ts` 中补充状态更新 payload 命名类型。
2. 再调整 `logistics-service.ts` 使用命名类型。
3. 新增 `src/features/logistics/index.ts` 作为根导出入口。
4. 如有必要，只做最小范围 import 收口。
5. 最后执行验证并更新文档。

#### 4.7 验证策略

若你批准执行，本轮至少执行：

1. `pnpm exec eslint`（目标 logistics 文件）
2. `pnpm exec tsc --noEmit`
3. 更新 `walkthrough.md`，记录本轮低风险整洁化结果

### 5. 收口 sales / purchase 的 `_v -> version` 前后端契约语义

日期：2026-04-11  
状态：待批准

#### 5.1 当前现状

已确认 `sales / purchase` 当前虽然前端已有相对成熟的 `contract -> adapter -> service -> hook -> component` 主链，但版本字段的正式传输口径仍是 `_v`。

当前残留位置包括：

1. 后端模型：
   - `server/models/trading.go`
   - `SalesOrder.Version` 使用 `json:"_v"`
   - `PurchaseOrder.Version` 使用 `json:"_v"`

2. 后端 DTO：
   - `server/services/sales_order_dto.go`
   - `server/services/purchase_order_dto.go`
   - 以及 `purchase_receipt_confirm_dto.go` 等采购链附属 DTO

3. 前端 DTO / adapter：
   - `src/features/trading/sales/contracts/sales-order-api-dto.ts`
   - `src/features/trading/sales/adapters/sales-order-api-adapter.ts`
   - `src/features/trading/purchase/contracts/purchase-order-api-dto.ts`
   - `src/features/trading/purchase/adapters/purchase-order-api-adapter.ts`

这说明 `sales / purchase` 仍保留一整条 `_v` 历史契约链。

#### 5.2 本轮目标

本轮目标不是继续做 `_v <-> version` 双轨兼容，而是把 `sales / purchase` 的正式契约统一收口到 `version`。

本轮目标如下：

1. 后端模型、DTO、前端 DTO、adapter 统一改为 `version`。
2. 删除 `sales / purchase` 主链上的 `_v` 历史口径。
3. 保持订单工作流、明细、附件等业务语义不变，仅统一版本字段名称。

#### 5.3 明确执行边界

本轮**只做版本字段语义统一**，不做以下事项：

1. 不重构销售订单工作流或采购订单工作流。
2. 不重做订单附件 `evidences` 链路。
3. 不顺手扩展到 `customer / supplier / logistics` 之外的其他模块。
4. 不将本轮演化为交易域整体重构。

#### 5.4 计划收敛范围

##### A. 后端模型与 DTO

预计调整：

1. `server/models/trading.go`
   - `SalesOrder.Version` 的 JSON tag 改为 `version`
   - `PurchaseOrder.Version` 的 JSON tag 改为 `version`

2. `server/services/sales_order_dto.go`
   - 保存请求 DTO
   - Snapshot / Response DTO
   - 列表响应 DTO
   全部统一改为 `version`

3. `server/services/purchase_order_dto.go`
   - 保存请求 DTO
   - Snapshot / Response DTO
   - 列表响应 DTO
   全部统一改为 `version`

4. 视 grep 结果同步检查：
   - `purchase_receipt_confirm_dto.go`
   - `purchase_return_dto.go`
   - 其他采购链附属 DTO

##### B. 前端 DTO 与 adapter

预计调整：

1. `src/features/trading/sales/contracts/sales-order-api-dto.ts`
2. `src/features/trading/sales/adapters/sales-order-api-adapter.ts`
3. `src/features/trading/purchase/contracts/purchase-order-api-dto.ts`
4. `src/features/trading/purchase/adapters/purchase-order-api-adapter.ts`

目标是让前端也只消费 `version`，不再通过 `_v` 做适配壳。

##### C. 调用链检查

需要额外审查：

1. 销售 / 采购保存接口
2. Patch / SDRTS 相关链路
3. 采购确认收货与退货响应 DTO
4. 订单明细与附件 contract 透传点

确保不存在：

1. 仍读取 `_v`
2. 仍写回 `_v`
3. 仍假定 `_v` 是正式契约字段

#### 5.5 风险与控制策略

1. **范围牵连风险**
   - `sales / purchase` 比 `customer / supplier` 更复杂，因为带明细、附件、工作流 DTO。
   - 控制策略：只改版本字段语义，不改任何业务流程语义。

2. **工作流链路误伤风险**
   - 订单保存与事务服务对版本字段高度敏感。
   - 控制策略：不调整 `ExpectedVersion` 等业务语义，只改传输字段名。

3. **采购链测试噪声风险**
   - 当前服务层已有与 `evidences` 列相关的既有测试噪声。
   - 控制策略：本轮验证优先使用与 `Sales|Purchase` 版本契约直接相关的目标测试与前端编译校验，不把无关旧问题误判为本轮回归。

#### 5.6 预计执行顺序

若你批准执行，建议按以下顺序推进：

1. **先改后端模型与 DTO**
   - 保证后端正式输出 `version`

2. **再改前端 DTO / adapter**
   - 切换前端 contract 输入口径

3. **再做调用链残留清扫**
   - 检查保存、Patch、确认收货等链路

4. **最后执行验证并更新文档**

#### 5.7 验证策略

若你批准执行，本轮至少执行：

1. 前端：
   - `pnpm exec eslint`（目标 sales / purchase 文件）
   - `pnpm exec tsc --noEmit`

2. 后端：
   - 目标 `handlers / routes / services` 的定向 `go test`

3. 文档：
   - 更新 `walkthrough.md`，记录 `_v` 历史契约退出与 `version` 单一语义收敛结果

### 6. 收口 customer / supplier 的 `_v -> version` 前后端契约语义

日期：2026-04-11  
状态：待批准

#### 6.1 当前现状

已确认 `customer / supplier` 当前虽然前端已经具备相对完整的 `contract -> adapter -> service -> hook -> component` 主链，但版本字段语义仍未统一：

1. 后端模型 `server/models/trading.go` 中：
   - `Customer.Version` 使用 `json:"_v"`
   - `Supplier.Version` 使用 `json:"_v"`

2. 后端 handler DTO 中：
   - `server/handlers/customer_dto.go`
   - `server/handlers/supplier_dto.go`
   仍继续以 `json:"_v"` 作为正式请求/响应口径。

3. 前端 DTO / adapter 中：
   - `src/features/trading/customer/contracts/customer-api-dto.ts`
   - `src/features/trading/customer/adapters/customer-api-adapter.ts`
   - `src/features/trading/supplier/contracts/supplier-api-dto.ts`
   - `src/features/trading/supplier/adapters/supplier-api-adapter.ts`
   仍通过 `_v` 与前端内部 `version` 做映射。

这说明当前问题不是“个别文件命名不统一”，而是 `customer / supplier` 仍保留了一整条 `_v` 历史契约链。

#### 6.2 本轮目标

本轮目标不是继续保留 `_v <-> version` 双轨兼容，而是把 `customer / supplier` 明确收口到统一 `version` 语义。

本轮目标如下：

1. 后端模型、handler DTO、前端 DTO、adapter 统一改为 `version`。
2. 删除 `customer / supplier` 主链上的 `_v` 历史口径。
3. 避免后续继续复制 `_v` 这一旧式传输约定。
4. 在不改业务语义的前提下完成前后端契约统一。

#### 6.3 计划收敛范围

##### A. 后端模型与 handler DTO

预计调整：

1. `server/models/trading.go`
   - 将 `Customer.Version` 与 `Supplier.Version` 的 JSON tag 从 `_v` 收口到 `version`。

2. `server/handlers/customer_dto.go`
   - `CustomerRequest`
   - `CustomerResponse`
   - `BulkSyncCustomerRequest`
   - 以及相关 mapper
   全部改为 `version`。

3. `server/handlers/supplier_dto.go`
   - `SupplierResponse`
   - `BulkSyncSupplierRequest`
   - 以及相关 mapper
   全部改为 `version`。

##### B. 前端 DTO 与 adapter

预计调整：

1. `src/features/trading/customer/contracts/customer-api-dto.ts`
2. `src/features/trading/customer/adapters/customer-api-adapter.ts`
3. `src/features/trading/supplier/contracts/supplier-api-dto.ts`
4. `src/features/trading/supplier/adapters/supplier-api-adapter.ts`

目标是让前端 DTO 也只保留 `version`，不再通过 `_v` 做适配壳。

##### C. 调用链检查

需要额外审查：

1. `server/handlers/customers.go`
2. `server/handlers/suppliers.go`
3. 相关 services 中对版本字段的接收与透传
4. 前端 customer / supplier 的保存、Patch、批量同步入口

确保不存在：

1. 仍读取 `_v`
2. 仍写回 `_v`
3. 仍假定 `_v` 是正式契约字段

#### 6.4 明确不保留兼容双轨

本轮明确执行以下原则：

1. 不保留 `version` 与 `_v` 并行暴露。
2. 不在前端 adapter 中保留“优先 `version`，否则回退 `_v`”的过渡逻辑。
3. 不在后端 DTO 中继续接受 `_v` 作为正式输入字段。

即：一旦开始执行，本轮目标就是让 `customer / supplier` 的主链只剩 `version` 一种语义。

#### 6.5 风险与控制策略

1. **前后端契约断裂风险**
   - 这是本轮最大的风险，因为改动跨前后端。
   - 控制策略：本轮只覆盖 `customer / supplier`，不顺手扩大到 `sales / purchase`。

2. **批量同步入口遗漏风险**
   - `BulkSyncCustomerRequest` / `BulkSyncSupplierRequest` 仍使用 `_v`。
   - 控制策略：将批量同步视为正式主链的一部分，一并收口。

3. **模型 JSON tag 改动影响其他消费方风险**
   - 若项目中还有其他地方直接依赖后端返回 `_v`，会在本轮暴露出来。
   - 控制策略：收口前先做精确 grep，执行后用前端 `tsc` 与必要的后端测试发现断点。

#### 6.6 预计执行顺序

若你批准执行，建议按以下顺序推进：

1. **先改后端 DTO 与模型 tag**
   - 保证后端正式输出 `version`。

2. **再改前端 DTO / adapter**
   - 切换前端 contract 输入口径。

3. **再检查 handler / service / bulk sync 调用链**
   - 清理残留 `_v` 透传点。

4. **最后执行验证并更新文档**

#### 6.7 验证策略

若你批准执行，本轮至少执行：

1. 前端：
   - `pnpm exec eslint`（目标 customer / supplier 文件）
   - `pnpm exec tsc --noEmit`

2. 后端：
   - 目标 handler / routes 的定向 `go test`

3. 文档：
   - 更新 `walkthrough.md`，记录 `_v` 历史契约退出与 `version` 单一语义收敛结果

### 7. 将 logistics 收敛到 DTO + adapter + service + hook 的单一稳定链

日期：2026-04-11  
状态：待批准

#### 7.1 当前现状

已确认 `src/features/logistics/` 当前仍停留在旧式轻模块形态：

1. 目录结构只有：
   - `components/`
   - `hooks/`
   - `services/`
   - `types.ts`
   - `utils/`

2. 当前缺少稳定分层：
   - 没有 `contracts/`
   - 没有 `adapters/`
   - 没有独立 `data/`

3. 当前主链问题：
   - `services/logistics-service.ts` 直接以 `LogisticsRecord` 作为 API 请求/响应类型。
   - `hooks/use-logistics.ts` 仍使用 `Partial<LogisticsRecord>` 驱动保存 mutation。
   - service 内仍承担了事件流拼装、局部状态更新编排等混合职责。
   - 页面 / hook / service / type 之间没有清晰的 DTO -> contract -> command 输入边界。

#### 7.2 本轮目标

你已明确要求本轮不是继续做“最小止血”，而是把 `logistics` **完整收敛到一条稳定链**。

本轮目标如下：

1. 建立 `contracts -> adapters -> data -> services -> hooks -> components` 的单一主链。
2. 彻底退出当前“`types.ts` 直接贯穿 service / hook / component”的旧结构。
3. 去掉 `Partial<LogisticsRecord>` 这类弱边界保存写法。
4. service 只负责请求、DTO 校验、adapter 映射与显式 command payload 封装。
5. hook 只消费前端 contract，并统一承接 query invalidation / toast / 错误提示等副作用。
6. **不保留兼容双轨**，最终只允许一条 logistics 稳定链存在。

#### 7.3 计划收敛后的目标结构

预计收敛为以下结构：

1. `src/features/logistics/data/schema.ts`
   - 定义前端物流领域 contract，例如：
     - `LogisticsRecord`
     - `LogisticsEvent`
     - `LogisticsStatus`
     - `LogisticsType`
   - 若需要，可把纯展示常量与 contract 分离。

2. `src/features/logistics/contracts/logistics-api-dto.ts`
   - 定义后端返回 DTO 与写入 payload DTO。

3. `src/features/logistics/adapters/logistics-api-adapter.ts`
   - 负责 DTO -> contract 与 contract / command -> API payload 映射。

4. `src/features/logistics/services/logistics-service.ts`
   - 只保留：
     - 请求发起
     - DTO 校验
     - adapter 映射
     - 显式 create / patch / status-update / delete command 请求封装
   - 不再直接对外暴露旧 `types.ts`。

5. `src/features/logistics/hooks/use-logistics.ts`
   - 统一消费 logistics contract。
   - 移除 `Partial<LogisticsRecord>` mutation 输入。
   - 改为显式 create / patch / status update 输入类型。

6. `src/features/logistics/components/*`
   - 只消费新的 contract 与 hook 导出。
   - 不再直接绑定旧 `types.ts` 主链。

#### 7.4 明确不保留兼容双轨

本轮明确执行以下原则：

1. 不保留“旧 `types.ts` 主链继续可用，新链并行存在”的兼容方案。
2. 不保留 `Partial<LogisticsRecord>` 作为 service / hook 的保存边界。
3. 不保留 service 直接返回未经过 adapter 映射的物流领域对象。
4. 若 `types.ts` 中仍有极少量仅用于 UI 常量的内容，可重定位；若没有保留价值，则直接退出主链。

#### 7.5 预计执行顺序

若你批准执行，建议按以下顺序推进：

1. **先建新链骨架**
   - 新增 `data/schema.ts`
   - 新增 `contracts/logistics-api-dto.ts`
   - 新增 `adapters/logistics-api-adapter.ts`

2. **再重写 service**
   - 统一 service 只面向 DTO / adapter / command payload。
   - 删除旧 `LogisticsRecord` 直连 API 的用法。

3. **再重写 hook**
   - 去掉 `Partial<LogisticsRecord>`。
   - 把 create / patch / updateStatus 的 mutation 输入改为显式类型。

4. **最后调整组件消费位**
   - `components/logistics-action-dialog.tsx`
   - `components/logistics-mgmt.tsx`
   - `components/logistics-timeline.tsx`
   - 以及其他直接依赖旧 `types.ts` 主链的地方。

5. **完成后删除或降级旧主链残片**
   - 确保重构完成后只有一条 logistics 稳定链继续存在。

#### 7.6 预计涉及文件

本轮预计至少涉及：

1. 新增：
   - `src/features/logistics/data/schema.ts`
   - `src/features/logistics/contracts/logistics-api-dto.ts`
   - `src/features/logistics/adapters/logistics-api-adapter.ts`

2. 重写 / 调整：
   - `src/features/logistics/services/logistics-service.ts`
   - `src/features/logistics/hooks/use-logistics.ts`
   - `src/features/logistics/components/logistics-action-dialog.tsx`
   - `src/features/logistics/components/logistics-mgmt.tsx`
   - `src/features/logistics/components/logistics-timeline.tsx`
   - `src/features/logistics/utils/*`（如其依赖旧 `types.ts`）

3. 可能退出主链或重定位：
   - `src/features/logistics/types.ts`

#### 7.7 风险与控制策略

1. **消费链断裂风险**
   - 因为本轮不做兼容双轨，任何遗漏的旧 import 都会直接暴露为类型或编译错误。
   - 控制策略：重构完成后用 `eslint + tsc` 全面扫出残留旧链引用。

2. **接口契约误判风险**
   - 如果后端物流接口返回结构与当前前端假设不完全一致，新 DTO 设计可能需要调整。
   - 控制策略：在动手前先精读当前组件消费字段与 service 请求/响应点，必要时追加读服务端相关 handler。

3. **范围膨胀风险**
   - logistics 本轮只做前端架构完整收敛，不扩大到后端物流模型或 workflow 重构。
   - 控制策略：若发现必须动后端才能完成“单链”，需中途回到规划阶段更新方案并再次确认。

#### 7.8 验证策略

若你批准执行，本轮至少执行：

1. 目标 logistics 文件 `pnpm exec eslint ...`
2. `pnpm exec tsc --noEmit`
3. 必要时补充目标页面手工回归：
   - 物流列表加载
   - 物流详情查看
   - 新增/编辑物流记录
   - 状态更新
4. 更新 `walkthrough.md` 记录“旧链退出 + 新链稳定”的结果

### 8. 优先补齐“差一点”的架构对齐项，降低漏审风险

日期：2026-04-11  
状态：待批准

#### 8.1 背景与目标

基于 `GEMINI.md` 的首轮审计，当前项目并不是所有模块都适合立刻做“大手术”。

从风险收益比来看，下一步更合理的策略是：

1. **先补齐已经接近目标架构、但仍存在清晰漏口的模块**。
2. **优先消除最容易因漏审而继续扩散的旧边界问题**。
3. **避免把本轮工作扩大为 `purchase / labs / logistics` 这类尚未成域模块的整体重构**。

本轮目标不是“让全项目一次性完全架构对齐”，而是优先补齐以下“差一点”的问题：

1. `warehouse` 中仍残留的 service 边界越界与轻量编排问题。
2. 已基本完成分层模块中的 `_v / version` 历史兼容壳与 DTO 语义漏口。
3. 少量仍可能被继续复制的旧式 service 写法（如 `Partial<T>` 保存、service 直传原始 JSON、service 承担本应上移的轻度业务编排）。

#### 8.2 本轮优先范围

##### A. `warehouse` 模块的轻量收口

本轮优先关注以下问题：

1. `services/` 中不应继续保留的副作用或跨模块刷新行为。
2. 可以低风险上移到 Hook / Query `onSuccess` / 局部编排层的轻量逻辑。
3. 体量明显偏大、但可做小步拆分的 Hook 片段。

优先目标不是全面重写 `warehouse`，而是先把最明显违反 `GEMINI.md 5.2 / 5.5` 的漏口补掉，避免后续继续以其为模板复制。

##### B. `_v / version` 兼容壳继续收口

本轮优先挑选已经具备较完整 `contract -> adapter -> service -> hook` 主链的模块：

1. 审查哪些模块还在把 `_v` 当作现役字段继续向外暴露。
2. 区分“仍有兼容必要”与“已可切换到 `version` 唯一语义”的模块。
3. 只处理那些验证成本低、影响面可控的收口点。

目标是减少历史字段口径继续外溢，而不是一次性扫全项目所有版本字段。

##### C. 旧式 service 写法的最小治理

本轮只处理最容易误导后续开发的少量典型问题，例如：

1. `save(data: Partial<T>)` 这类弱边界保存接口。
2. service 直接返回未经 DTO / adapter 收敛的原始结构。
3. service 层承担轻度业务编排，而不是只做请求与协议封装。

本轮不追求把所有旧模块都重构到新范式，只处理最值得先止血的点。

#### 8.3 明确不纳入本轮的范围

为避免范围膨胀，本轮明确不做：

1. 不把 `purchase` 重构成完整独立子域。
2. 不整体重构 `labs` 模块结构。
3. 不对 `logistics` 做完整 DTO / adapter / workflow 化改造。
4. 不启动跨多个 feature 的统一状态治理重构。
5. 不因为清理局部 service 问题而改写既有业务语义或后端事实模型。

#### 8.4 预计执行顺序

若你批准执行，建议按以下顺序推进：

1. **先做 `warehouse` 轻量收口**
   - 清理 service 内明显不该保留的事件广播 / 跨模块刷新触发。
   - 将副作用上移至 Hook / Query 层。
   - 对最重的 Hook 只做必要拆分，不做大面积重构。

2. **再做 `_v / version` 兼容壳收口**
   - 仅选择已经有稳定分层的模块。
   - 优先清理“主链已经切到 `version`，但 DTO 仍在透传 `_v`”的场景。

3. **最后做旧式 service 写法止血**
   - 修正少量 `Partial<T>` 保存入口。
   - 为必要链路补 DTO / adapter 收敛。
   - 避免 service 持续承担不该承担的轻度编排。

4. **每完成一小项立即验证并记录**
   - 前端：`tsc` / 目标文件 `eslint`
   - 后端：仅在涉及后端时执行定向测试
   - 文档：更新 `walkthrough.md`

#### 8.5 涉及文件类型（预计）

本轮预计优先涉及：

1. `src/features/warehouse/services/*`
2. `src/features/warehouse/hooks/*`
3. 若干已相对成熟模块中的：
   - `contracts/*`
   - `adapters/*`
   - `services/*`
4. `walkthrough.md`

本轮原则上不优先修改后端模型，除非某个“差一点”的兼容壳问题已明确跨到接口契约层且改动非常小。

#### 8.6 风险与控制策略

1. **局部收口引发连锁回归风险**
   - 控制策略：一次只收一个小边界，做完即验证。

2. **范围膨胀风险**
   - 控制策略：凡是触及“模块整体重构”的问题，一律移出本轮，保留为后续独立任务。

3. **误伤现有兼容链风险**
   - 控制策略：`_v / version` 收口必须建立在已有主链稳定、消费点明确的前提下，不做盲删。

4. **把 Hook 拆分成新的碎片风险**
   - 控制策略：只抽离职责天然独立的片段，不为拆分而拆分。

#### 8.7 验证策略

若你批准执行，本轮将坚持以下最小验证：

1. 目标前端文件 `pnpm exec eslint ...`
2. `pnpm exec tsc --noEmit`
3. 如涉及后端接口契约，再执行定向 `go test`
4. 更新 `walkthrough.md` 记录每一项收口内容与验证结果

### 9. 物资采购合同弹窗复用销售订单图片上传能力的方案分析

日期：2026-04-11  
状态：待批准

#### 9.1 当前现状

已确认当前采购与销售两条链路在“图片/凭据”能力上的真实状态如下：

1. **采购弹窗现状**
   - 采购创建/编辑弹窗位于 `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`。
   - 头部表单由 `PurchaseOrderHeaderFields` 承担。
   - 当前字段只覆盖供应商、币种、汇率、付款方式、付款账期、采购员、备注等基础字段。
   - 当前采购弹窗里没有图片上传区块，也没有附件字段输入位。

2. **采购前端数据链现状**
   - `src/features/trading/data/schema.ts` 中的 `PurchaseOrder` 当前没有 `evidences / attachments / images` 字段。
   - `src/features/trading/purchase/contracts/purchase-order-api-dto.ts` 中的 `PurchaseOrderApiDTO` 也没有对应字段。
   - `src/features/trading/purchase/adapters/purchase-order-api-adapter.ts` 的 DTO <-> contract 映射中同样没有附件字段。

3. **销售前端现状**
   - 销售订单弹窗通过 `OrderHeaderFields` 挂载 `OrderEvidenceManager`。
   - `OrderEvidenceManager` 是一个独立组件，支持多图上传、预览、删除、大小限制、上传中状态与重复图片提示。
   - 前端 `SalesOrder` schema 已包含 `evidences?: OrderEvidence[]` 字段，表单默认值也包含 `evidences: []`。

4. **销售后端现状**
   - 后端已存在独立上传接口：`POST /sales-orders/evidence/upload`，实现位于 `server/handlers/evidence_handler.go`。
   - 该接口会执行：
     - 文件大小限制
     - 图片处理与 WebP 压缩
     - pHash 查重
     - 服务器磁盘目录 `uploads/` 持久化
   - 但后端 `server/models/trading.go` 中的 `SalesOrder` 模型当前并没有 `evidences` 字段。
   - `server/services/sales_order_dto.go` 中的保存请求、响应 DTO 也没有 `evidences`。
   - 销售订单保存/patch 支持字段里也未看到 `evidences` 进入正式持久化链。

#### 9.2 核心结论

当前问题不能简单理解为“采购弹窗缺一个上传控件”，而应拆成两层：

1. **UI 能力层**
   - 销售侧已经有一套现成、可复用的图片上传交互组件：`OrderEvidenceManager`。

2. **业务持久化层**
   - 无论采购还是销售，目前都还没有形成稳定的“订单主单附件集合”后端落库闭环。
   - 采购侧比销售侧更早一层：连前端 contract / DTO 字段都还没有。
   - 销售侧则处于“前端已消费 + 上传接口已存在，但订单级持久化未闭环”的半成品状态。

因此，如果直接把 `OrderEvidenceManager` 复制到采购弹窗：

3. 只能得到一个**表面有上传 UI、底层未真正闭环**的重复实现。
4. 会把销售侧当前的半闭环问题继续复制到采购链路。

#### 9.3 可复用部分与不应重复造轮子的边界

本轮已确认下列能力应优先复用：

1. **上传底座可复用**
   - `server/handlers/evidence_handler.go`
   - 图片处理、WebP 压缩、pHash 查重
   - 服务器磁盘目录 `uploads/` 存储

2. **前端交互组件可复用**
   - `src/features/trading/components/parts/order-evidence-manager.tsx`
   - 多图上传、预览、删除、大小限制、重复图片提示等交互

3. **不应重复造轮子的部分**
   - 不需要另造一套采购专用图片压缩/查重/上传基础设施。
   - 不建议复制一份“采购版上传组件”，应尽量抽象为交易域共享组件。

4. **当前不能直接复用而不补链的部分**
   - 销售订单的 `evidences` 只在前端 schema/UI 层完整，尚未形成后端订单级持久化主链。
   - 因此不能把“销售已完成”作为前提假设直接照搬到采购。

#### 9.4 推荐方案

推荐采用**先补真实闭环，再在采购弹窗接入 UI**的方案，而不是只做前端表面加控件。

建议分两步：

1. **先统一交易单据附件模型**
   - 在交易域定义稳定附件结构，例如沿用 `OrderEvidence` 或根据业务语义升级为更中性的 `OrderAttachment`。
   - 明确字段至少包括：
     - `id`
     - `url`
     - `name`
     - `uploadedAt`

2. **补齐订单级持久化闭环**
   - 销售单：补齐后端模型、DTO、mapper、patch/save 支持字段。
   - 采购单：同步补齐前端 schema、采购 DTO、adapter、后端模型、请求/响应 DTO 与保存链。

3. **最后接入采购弹窗 UI**
   - 将 `OrderEvidenceManager` 抽成采购/销售共享组件，或保留原组件名但让采购也能复用。
   - 在 `PurchaseOrderHeaderFields` 中增加图片/凭据区块。
   - 保持销售与采购对同一组件和同一附件 contract 的复用。

#### 9.5 命名与业务语义建议

这里需要先明确一件事：采购上传的图片，业务上到底是什么。

当前有两个候选方向：

1. **沿用销售侧 `evidences` 语义**
   - 适合把它理解为“订单凭证 / 佐证图片”。
   - 优点：可以更直接复用现有 `OrderEvidenceManager` 与上传接口语义。

2. **升级为更通用的 `attachments` / `contractAttachments` 语义**
   - 更适合采购“合同图片/附件”的业务表达。
   - 但这意味着销售侧 `evidences` 也最好一并评估是否统一命名，避免交易域内部出现“销售叫 evidences、采购叫 attachments”的长期分裂。

从避免重复造轮子和降低本轮范围的角度：

3. 若你希望本轮尽快落地，建议短期沿用统一 `OrderEvidence` 结构。
4. 若你更重视长期语义整洁，则应一起评估把交易域图片字段统一升级为更中性的附件模型。

#### 9.6 预计涉及文件

若你批准执行，预计会涉及以下层次：

1. **前端共享组件层**
   - `src/features/trading/components/parts/order-evidence-manager.tsx`
   - 可能拆出更中性的 shared attachment/evidence 组件宿主

2. **采购前端链路**
   - `src/features/trading/data/schema.ts`
   - `src/features/trading/hooks/use-purchase-order-form.ts`
   - `src/features/trading/components/purchase/parts/purchase-order-header-fields.tsx`
   - `src/features/trading/purchase/contracts/purchase-order-api-dto.ts`
   - `src/features/trading/purchase/adapters/purchase-order-api-adapter.ts`
   - `src/features/trading/purchase/services/purchase-service.ts`

3. **销售后端补链（若一并修正）**
   - `server/models/trading.go`
   - `server/services/sales_order_dto.go`
   - 销售 mapper / command / transaction save 支持字段

4. **采购后端补链**
   - `server/models/trading.go`
   - 采购 request/response DTO
   - 采购 mapper / save / patch / transaction 支持字段

5. **上传接口层**
   - 优先复用现有 `server/handlers/evidence_handler.go`
   - 如需泛化路由语义，再评估是否改为更中性的共享上传入口，但本轮不建议无必要重做

#### 9.7 本轮不建议做的事

1. 不建议只在采购弹窗里加一个独立采购上传按钮，而不补 DTO / 模型 / 持久化链。
2. 不建议复制 `OrderEvidenceManager` 生成一份采购专用组件。
3. 不建议为了采购上传，重做一套新的图片处理/压缩/查重/存储服务。
4. 不建议在未厘清语义前同时发明 `purchaseAttachments / contractImages / purchaseEvidences` 多套命名。

#### 9.8 风险与注意事项

1. **复制半闭环风险**
   - 如果只复用前端上传 UI，不补后端订单级字段，采购会继承销售当前的半闭环问题。

2. **命名分裂风险**
   - 销售用 `evidences`、采购用 `attachments`、合同又单独叫 `images`，后续会越来越乱。

3. **范围膨胀风险**
   - 一旦决定顺手修销售持久化闭环，改动会跨前后端两条交易链。
   - 但这也是避免把旧问题复制到采购的关键取舍点。

4. **上传接口语义风险**
   - 当前路由是 `/sales-orders/evidence/upload`，语义偏销售单。
   - 若采购要共用，需要决定是先继续复用现有实现，还是将接口路由轻量泛化；建议只在确有必要时再改，避免本轮把上传底座一起扩大重构。

#### 9.9 推荐执行顺序

如果你批准执行，建议顺序如下：

1. 先统一交易域图片/附件字段语义。
2. 先补销售与采购至少一条稳定订单级持久化 contract。
3. 再让采购弹窗复用共享上传组件。
4. 最后做最小回归：
   - 前端类型检查
   - 交易相关接口/服务测试
   - 手工验证采购弹窗上传、回显、编辑保存、详情展示链

### 10. 实验中心侧边栏收敛为单入口方案

日期：2026-04-11  
状态：待批准

#### 10.1 当前现状

已确认当前“实验设备 / 实验测试 / 实验报告”在代码结构上并不是 3 个彼此独立的模块，而是同属一个实验中心容器：

1. 路由位于同一树下：
   - `/labs/experimental/equipment`
   - `/labs/experimental/tests`
   - `/labs/experimental/reports`
2. `src/features/labs/experimental/pages/layout.tsx` 已通过 `ModuleTabbedLayout` 统一挂载这 3 个 TAB。
3. `/labs/experimental/` 根路由已存在默认重定向，会进入 `/labs/experimental/equipment`。
4. 因此，当前“侧边栏有 3 条菜单”的问题，本质是**导航呈现层重复暴露**，而不是页面结构缺少聚合。

#### 10.2 当前问题

当前侧边栏 `src/components/layout/data/sidebar-data.ts` 将实验中心拆成 3 条同级菜单：

1. `实验设备`
2. `实验测试`
3. `实验报告`

这带来几个问题：

1. **侧边栏臃肿**
   - 一个模块的内部 TAB 被直接外翻成 3 条菜单，层级表达不自然。

2. **语义不一致**
   - 页面层已经是“一个中心 + 3 个 TAB”，侧边栏却表现成“3 个并列模块”，容易误导后续维护。

3. **不利于权限对齐**
   - 当前三条侧边栏项虽然 URL 不同，但 menu 权限最终都映射到同一个 root menu：`/labs -> menu_quality`。
   - 这会让“菜单可见性 / 可点击性”和“TAB 可访问性”的边界表达变得模糊。

#### 10.3 推荐方案

推荐采用**最小结构改动**方案：

1. 将侧边栏中的 3 条实验相关菜单收敛为 1 条统一入口。
2. 统一入口建议命名为：`实验中心`。
3. 统一入口 URL 指向 `/labs/experimental`。
4. 点击后继续沿用现有根路由重定向逻辑，默认进入 `实验设备` TAB。
5. 模块内部仍保持现有 3 个 TAB：
   - `实验设备`
   - `实验测试`
   - `实验报告`

这个方案的优点是：

1. 不需要重做实验中心页面结构。
2. 不需要重写现有 3 个子页。
3. 能让侧边栏语义与页面真实结构一致。
4. 更方便后续将“菜单权限”和“TAB 权限”分层治理。

#### 10.4 权限分层建议

本轮建议明确采用以下分层：

1. **菜单入口层（menu）**
   - 侧边栏只保留一个 `实验中心` 入口。
   - 该入口代表“进入实验中心模块”的菜单级访问语义。

2. **模块内部层（tab/page）**
   - `实验设备 / 实验测试 / 实验报告` 继续保留各自现有的 tab/page 路由与权限承载能力。
   - 也就是说，收敛侧边栏入口并不等于合并这 3 个 TAB 的访问控制。

3. **边界说明**
   - 本轮只收敛导航入口，不扩大为权限体系重构。
   - 后续若继续做权限梳理，应优先把“单一菜单入口”和“内部 TAB 访问能力”分开理解，而不是继续用 3 条侧边栏菜单代替 TAB 权限。

#### 10.5 涉及文件（预计）

若你批准执行，预计最小涉及面如下：

1. `src/components/layout/data/sidebar-data.ts`
   - 将实验中心分组中的 3 条侧边栏项收敛为 1 条统一入口。

2. 实验中心相关多语言文案文件
   - 若当前不存在可复用的 `sidebar.items.experimentalCenter`，则补齐该菜单文案 key。

3. 如有权限或导航校验脚本直接依赖侧边栏项数量/名称
   - 需做最小同步，但不改动实验中心页面与业务数据链。

#### 10.6 本轮不做的事

为避免范围失控，本轮明确不做以下事项：

1. 不改实验中心 3 个 TAB 的页面内容。
2. 不改实验中心的数据接口、状态管理或服务层。
3. 不把 3 个 TAB 再合并成单页。
4. 不顺手重构品质中心或整个 `labs` 域的导航体系。
5. 不顺手推进新的前端权限守卫策略。

#### 10.7 风险与注意事项

1. **默认入口感知变化风险**
   - 之前用户可直接从侧边栏一步点到 `tests / reports`，收敛后需要先进入实验中心再切 TAB。
   - 这是预期中的导航收口，不属于功能回退；但应确保默认落点与 TAB 切换流畅。

2. **文案复用风险**
   - 若同时存在“实验中心”分组标题与“实验中心”菜单项，需要确认视觉上是否会显得重复。
   - 可在执行时视当前侧边栏层级决定是否保留分组名不变，或进一步并入其他上级分组。

3. **权限认知风险**
   - 如果后续有人仍把 TAB 权限理解成菜单权限，可能再次把内部页签外翻到侧边栏。
   - 因此本次需要在实现中尽量保持“一个菜单入口 + 内部 3 TAB”的结构清晰。

#### 10.8 完成标准

批准执行后，本轮完成标准为：

1. 侧边栏中实验中心从 3 条菜单收敛为 1 条统一入口。
2. 点击统一入口后进入当前已有的实验中心模块，并保留现有 3 个 TAB。
3. 现有实验中心页面、路由、数据链与业务行为不发生额外改动。
4. 菜单入口与内部 TAB 的权限语义边界更清晰。
5. 完成前端类型检查与最小导航/权限回归，并在 `walkthrough.md` 记录结果。

### 11. 追加边界调整：分类名可配置，不再直接以技术字段名作为最终分类名

根据本轮追加反馈，原“固定四类槽位”方案仍不满足最终目标，需要升级为更贴近业务表达的两层模型：

1. **分类定义层**
   - 由用户自行建立分类
   - 每个分类应具备：
     - 技术键 / 内部编码
     - 中文名
     - 英文名
     - 排序
     - 启用状态

2. **分类项定义层**
   - 每个分类下维护自己的可选值
   - 每个分类项应具备：
     - 值 / 内部编码
     - 中文名
     - 英文名
     - 排序
     - 启用状态

3. **前端展示原则**
   - 用户面优先展示配置后的中文/英文名称
   - 不直接把 `techSeries / tireType / brakeType / versionLevel` 这类技术键裸露为最终分类名
   - 中英展示需对齐系统翻译与当前语言环境

4. **对上一版方案的影响**
   - 当前已实现版本更接近“固定槽位 + 动态值”
   - 下一步若按你的最新要求推进，需要把现有 `category` 从固定枚举升级为用户可维护实体
   - 这会涉及：
     - 后端模型拆分或升级
     - 前端 TAB 结构调整
     - 产品表单对分类定义的动态读取与渲染策略

5. **本次调整的意义**
   - 固定的应当只是内部技术承载能力，而不是最终业务分类名
   - 业务分类名必须允许你按实际产品工程语义自行建立和演进

### 12. `production-shared` 第一阶段拆分计划

日期：2026-04-11  
状态：待批准

#### 12.1 背景

当前 `src/features/production-shared` 已不再只是“共享工具层”，而是同时承载至少三类生产资源能力：

1. 产线资源（lines）
2. 工序资源（processes）
3. 岗位 / 工序能力写入链路（基于产线嵌套拓扑）

并且当前 `production-resource-service.ts` 还在 service 内直接触发 `window.dispatchEvent(...)`，与 `GEMINI.md` 中“services 去副作用化”原则不一致。

此外，`engineering`、`dashboard`、`org-personnel`、`users` 当前都直接依赖 `production-shared` 的 service、事件常量或 tab 内工具类型，说明该模块已经形成“共享宿主 + 多域直连”的结构性耦合点。

#### 12.2 本轮目标

1. 先完成 `production-shared` 的**第一阶段最小拆分**，不一次性重做整个生产域。
2. 把“领域模型 / contracts / service 边界”从 `tabs/**` 与单一大 service 中抽出来。
3. 让现有消费方逐步从：
   - `production-shared/tabs/**`
   - `production-resource-service.ts` 大一统入口
   转向更稳定的子域入口。
4. 为下一阶段去除 service 内副作用、替换裸事件和 query invalidation 改造打基础。

#### 12.3 执行边界

1. 本轮只做 `production-shared` 第一阶段拆分。
2. 本轮不顺手重做以下范围：
   - `dashboard` 整体架构
   - `engineering` 全域重构
   - `users / org-personnel` 全量联动重构
   - `workflow` 平台改造
3. 本轮优先保持现有功能可运行，通过“兼容导出 / 分步替换”降低破坏面。
4. 本轮允许保留过渡层，但要避免继续新增新的宿主耦合。

#### 12.4 第一阶段拆分范围

计划优先拆出三类子域资源边界：

1. `production-lines`
   - 产线实体、列表响应、保存/补丁 service
2. `production-processes`
   - 工序实体、列表响应、保存/删除 service
3. `production-mappings`
   - 工位 / 工序能力映射查询与指派 service

同时处理以下结构问题：

4. 将被外部模块引用的类型 / 转换工具从 `tabs/**` 中上移到稳定目录。
5. 评估并建立过渡导出，避免一次性改完所有消费方后才可运行。

#### 12.5 实施步骤

1. **先抽稳定类型与 contract**
   - 将 `ProductionLine`、`ProcessStep` 等跨模块使用的正式类型从 `tabs/**` 中迁出。
   - 将 DTO / adapter / contract 与页面组件实现解耦。

2. **拆分大一统 service**
   - 将当前 `production-resource-service.ts` 依职责拆为至少三组 service。
   - 第一阶段允许保留一个兼容聚合入口，但其内部只做转发，不继续承载真实实现。

3. **替换直接依赖 tab 内工具的消费方**
   - 优先处理：
     - `engineering/components/product/product-routing-view.tsx`
     - `dashboard/index.tsx`
     - `org-personnel/tabs/employee-management-list.tsx`
     - `users/hooks/use-users-action-dialog-options.ts`
   - 目标是让这些文件不再直接依赖 `production-shared/tabs/**` 内部工具或页面实现层类型。

4. **为下一阶段去副作用化预留位置**
   - 第一阶段可暂时保留更新事件常量。
   - 但要为第二阶段移除 service 内 `dispatchEvent`、改为 hook / mutation / typed bus 编排预留清晰挂点。

#### 12.6 风险与注意事项

1. **消费面较广风险**
   - `production-shared` 当前被多个模块直接依赖，若一次性强拆，容易出现大面积 import 断裂。
   - 控制方式：先抽类型与稳定导出，再分步替换消费方。

2. **假拆分风险**
   - 如果只是换文件名，但仍保留一个继续混装三类资源逻辑的大 service，则收口收益有限。
   - 控制方式：至少做到 lines / processes / mappings 三类职责可独立定位。

3. **范围失控风险**
   - `engineering`、`dashboard`、`users` 都与这条链相连，容易顺手演变成全域重构。
   - 控制方式：本轮只修正它们对 `production-shared` 的直接不合理依赖，不重做各自整体结构。

4. **副作用残留风险**
   - 第一阶段若完全同时移除裸事件，改动面会明显扩大。
   - 控制方式：本轮允许保留事件兼容层，但要显式收敛到过渡位置，禁止继续散落新增。

#### 12.7 完成标准

1. `production-shared` 不再只有一个混装 lines / processes / mappings 的核心 service 实现入口。
2. 跨模块正式依赖的类型与 contract 已从 `tabs/**` 页面实现层抽离。
3. `engineering`、`dashboard`、`org-personnel`、`users` 至少完成第一轮对稳定入口的切换。
4. 保持现有功能可运行，并为下一阶段去副作用化改造留下清晰边界。

### 13. `production-shared` 第二阶段：去副作用化 + typed bus / invalidation 收口

日期：2026-04-11  
状态：待批准

#### 13.1 背景

第一阶段已经完成以下工作：

1. 正式领域类型从 `tabs/**` 抽离到稳定 `data/` 目录。
2. `production-resource-service.ts` 已拆成 `lines / processes / mappings` 三类子域 service。
3. 第一批直接消费者已经从旧 `tabs/**` / 大一统入口切到稳定入口。

但当前仍有一个核心边界问题尚未解决：

4. 三类子域 service 仍在内部直接执行 `window.dispatchEvent(...)`。

这意味着：

1. service 仍混入副作用，不符合 `GEMINI.md` 中“services 去副作用化”原则。
2. 消费方仍需知道具体事件名，导致状态同步语义散落在模块间。
3. 后续若引入 React Query 或 typed domain event bus，会出现“双轨同步”（service 直接发事件 + 页面再自行刷新）的维护风险。

#### 13.2 本轮目标

本轮目标不是重做全站状态管理，而是完成 `production-shared` 第二阶段最小收口：

1. 将 `productionLinesService / productionProcessesService` 与岗位-process capability 写入 service 纯化为**只负责数据请求与协议转换**的 service。
2. 将当前散落的生产资源更新广播，收口到单一 typed domain event bus / invalidation 协调层。
3. 让第一批消费者不再直接依赖裸事件名，而是通过统一的订阅 / 同步入口响应资源变化。
4. 为下一阶段接入更明确的 mutation orchestration、query key invalidation 和模块级 hook 编排打下边界。

#### 13.3 执行边界

1. 本轮只处理 `production-shared` 及其第一批直连消费者的副作用收口。
2. 本轮不扩展为全站通用状态管理框架重做。
3. 本轮不顺手重构 `dashboard`、`engineering`、`org-personnel`、`users` 的页面组织方式，只替换它们对生产资源更新机制的直接依赖。
4. 本轮允许保留兼容事件常量导出，但禁止继续让子域 service 自己 `dispatchEvent`。
5. 本轮优先采用“typed bus + 统一 invalidation / refresh hook”组合，而不是继续散落新增 `window.addEventListener(...)`。

#### 13.4 第二阶段拟落地结构

计划新增或收敛以下能力：

1. **typed domain event bus（production-shared 域内）**
   - 宿主建议：`src/features/production-shared/services/production-resource-sync.ts` 或 `src/features/production-shared/data/production-resource-events.ts`
   - 作用：统一描述资源更新事件，而不是由各个 service 自己散发裸字符串事件。

2. **resource sync / invalidation 协调层**
   - 负责：
     - 触发 typed bus 事件
     - 对外暴露统一订阅方法
     - 为下一阶段接入 React Query invalidation 留出单点挂载

3. **纯 service 层**
   - `productionLinesService`
   - `productionProcessesService`
   - `productionJobCategoryCapabilitiesService`
   - 改造后仅返回数据 / Promise，不再直接发事件。

4. **兼容层**
   - 旧事件常量可以暂留在兼容入口或过渡文件中。
   - 但事件触发应只出现在统一协调层，而不是 service 内部分散出现。

#### 13.5 实施步骤

1. **先定义 production-shared 域内事件契约**
   - 明确事件种类至少包括：
     - lines updated
     - processes updated
     - mappings updated
   - 要求事件 payload 有类型，不再只靠裸字符串。

2. **建立统一 sync / invalidation 协调层**
   - 提供：
     - emit 方法
     - subscribe / unsubscribe 方法
     - 如已适合，可预留 query invalidation bridge
   - 要求所有资源更新广播从这里统一发出。

3. **将三类子域 service 去副作用化**
   - 删除内部 `dispatchEvent`。
   - 保留纯数据读写职责。

4. **将 mutation 成功后的同步职责前移**
   - 第一阶段中的保存 / 删除调用点，需要在更高层（hook / panel / page action handler）中显式触发 typed bus / invalidation。
   - 目标是让“谁发起更新，谁决定同步广播”，而不是 service 偷偷广播。

5. **替换第一批消费者的监听方式**
   - 优先处理：
     - `dashboard/index.tsx`
     - `org-personnel/components/production-selector.tsx`
     - `production-shared/tabs/work-architecture/index.tsx`
     - `engineering/components/product/product-routing-view.tsx`
     - `production-shared/tabs/work-architecture/components/process-library-panel.tsx`
   - 这些文件要从直接监听裸事件名，改为使用统一同步入口。

6. **保留兼容桥，但收口到单点**
   - 若当前仍需兼容旧 `window` 事件，则只允许由统一协调层桥接转发。
   - 禁止再在 service、页面、工具函数中散落新增 `dispatchEvent`。

#### 13.6 风险与注意事项

1. **同步丢失风险**
   - 如果先删 service 内事件，再忘记在高层显式广播，会出现“保存成功但页面不刷新”的问题。
   - 控制方式：逐条 mutation 调用点替换，边替边验证。

2. **双轨并存风险**
   - 若 typed bus 与旧 window 事件同时分散存在，后续会越来越难收口。
   - 控制方式：兼容桥必须收敛到统一协调层单点。

3. **范围膨胀风险**
   - typed bus / invalidation 很容易被顺手扩成全站事件系统。
   - 控制方式：本轮只服务 `production-shared` 域，不抽象成全局平台层。

4. **React Query 接入时机风险**
   - 若直接在本轮强行把所有生产资源读写都改成 React Query，改动面会超过第二阶段最小边界。
   - 控制方式：本轮优先提供 invalidation 挂点与命名约定；是否全量迁入 Query 由后续阶段决定。

#### 13.7 完成标准

1. `productionLinesService / productionProcessesService / productionJobCategoryCapabilitiesService` 内不再直接执行 `window.dispatchEvent(...)`。
2. `production-shared` 域内已有统一 typed bus / invalidation 协调入口。
3. 第一批生产资源消费者不再直接依赖裸事件字符串完成刷新。
4. 如需兼容旧事件，也已经被收敛到单点桥接位置。
5. 保持现有功能可运行，并完成最小验证与 `walkthrough.md` 更新。

### 14. `production-shared` 第三阶段：query key / invalidation 约定

日期：2026-04-11  
状态：待批准

#### 14.1 背景

第二阶段已经完成：

1. `production-shared` 三类子域 service 去副作用化。
2. 新增 `production-resource-sync.ts`，统一承接 typed sync / 兼容桥。
3. 第一批监听方已经从裸事件字符串迁移到统一同步入口。

但目前仍缺一个缓存层面的正式约定：

4. `production-shared` 域内尚无明确的 query key 命名规范。
5. invalidation 还没有统一工厂 / helper，后续一旦接入更多 Query 场景，容易出现多套 key 命名和多处散落 `invalidateQueries(...)`。
6. typed sync 与 React Query 缓存失效的职责边界还没有正式定义。

#### 14.2 本轮目标

本轮目标不是把整个 `production-shared` 全量改成 React Query，而是先建立**正式约定**：

1. 为 `lines / processes` 建立统一 query key 命名入口。
2. 为 `production-shared` 域建立统一 invalidation helper / hook，避免直接散落调用 `queryClient.invalidateQueries(...)`。
3. 明确 typed sync 与 query invalidation 的职责分工。
4. 优先让第一批已收口消费者或相关 action handler 可以复用统一约定，为后续 Query 化迁移做好基础设施。

#### 14.3 执行边界

1. 本轮只建立 `production-shared` 域内 query key / invalidation 约定，不扩展为全站 query key 平台。
2. 本轮不要求把所有生产资源读取立即全量切换到 `useQuery`。
3. 本轮优先做“命名统一 + invalidation 单点化”，而不是大规模页面重写。
4. 本轮不重做 `dashboard`、`engineering`、`org-personnel`、`users` 页面结构，只替换它们对 `production-shared` 缓存失效的调用方式（若已有需要）。

#### 14.4 约定方向

建议新增以下稳定入口：

1. **query key 工厂**
   - 宿主建议：`src/features/production-shared/data/production-resource-query-keys.ts`
   - 至少提供：
     - `productionResourceQueryKeys.all()`
     - `productionResourceQueryKeys.lines()`
     - `productionResourceQueryKeys.processes()`

2. **invalidation helper / hook**
   - 宿主建议：
     - `src/features/production-shared/hooks/use-production-resource-invalidation.ts`
     - 或 `src/features/production-shared/services/production-resource-invalidation.ts`
   - 职责：统一调用 `queryClient.invalidateQueries(...)`，而不是由页面自己拼 key。

3. **sync 与 Query 的职责边界**
   - typed sync：负责描述“资源已经发生变化”这一域事件语义。
   - invalidation：负责让使用 React Query 的消费者丢弃旧缓存并重新拉取。
   - 两者可协作，但不能互相替代、也不能双重散落实现。

#### 14.5 实施步骤

1. **先定义 `production-shared` query key 工厂**
   - 统一 lines / processes 的 query key 结构。
   - 要求 key 命名稳定、可预测、可复用。

2. **建立统一 invalidation 入口**
   - 统一封装：
     - invalidate lines
     - invalidate processes
     - 必要时 invalidate all production resources
   - 要求页面和 action handler 不直接散落写原始 query key。

3. **明确 sync 与 invalidation 的协作方式**
   - 约定：
     - mutation 成功后，谁负责 `emit`
     - 谁负责 `invalidate`
     - 哪些纯监听方只需 sync，哪些 Query 消费方需要 invalidation
   - 目标是避免“同一次更新触发两轮重复刷新”。

4. **替换第一批调用点到统一约定**
   - 优先检查：
     - `production-shared` 域内 action handler
     - 已接入 queryClient 的生产资源相关消费者
   - 若当前未全量使用 Query，则先把 helper 建好并在直接相关调用点中落地最小使用示例。

5. **为后续 Query 化迁移保留统一挂点**
   - 后续若将 lines / processes 相关读取继续迁入 `useQuery`，应直接复用本轮的 query key 工厂与 invalidation helper，而不是重新发明命名规则。

#### 14.6 风险与注意事项

1. **假约定风险**
   - 如果只是增加几个常量文件，但调用点仍各自直接手写 key，约定会失效。
   - 控制方式：至少让第一批直接相关调用点改用统一入口。

2. **双重刷新风险**
   - 同时 `emit` + `invalidate` + 页面主动 `loadData()` 容易造成重复请求。
   - 控制方式：明确每类消费者使用哪一种同步机制，避免无差别叠加。

3. **范围膨胀风险**
   - query key / invalidation 很容易继续膨胀成全站 Query 平台改造。
   - 控制方式：本轮仅限 `production-shared` 域。

4. **过早 Query 化风险**
   - 若本轮强行把所有页面读取都迁成 `useQuery`，会超过“约定先行”的最小边界。
   - 控制方式：先建立 query key / invalidation 统一入口，再逐步迁移读取方式。

#### 14.7 完成标准

1. `production-shared` 域内已有统一 query key 工厂。
2. `production-shared` 域内已有统一 invalidation 入口。
3. typed sync 与 query invalidation 的职责边界已通过代码结构体现。
4. 第一批直接相关调用点已开始复用统一约定，而不是散落硬编码 query key。
5. 保持现有功能可运行，并完成最小验证与 `walkthrough.md` 更新。

### 15. `production-shared` 第四阶段：核心读取迁移到 `useQuery`

日期：2026-04-11  
状态：待批准

#### 15.1 背景

第三阶段已经完成：

1. `production-shared` 域内已有统一 query key 工厂。
2. `production-shared` 域内已有统一 invalidation 入口。
3. `productionResourceSync` 已在单点中与 invalidation 协作。

但当前核心读取仍以手写 `loadData()` + `useEffect()` 为主，存在以下问题：

4. 读取缓存策略不一致，页面各自维护 loading / error / refresh 逻辑。
5. 与 query key / invalidation 的既有约定还没有真正闭环。
6. 后续如果继续保留大量本地拉取 effect，会削弱第三阶段刚建立的 query key / invalidation 价值。

#### 15.2 本轮目标

本轮目标不是把 `production-shared` 所有页面一次性重写，而是将**核心读取**迁到 `useQuery`：

1. 为 lines / processes 提供稳定的 query options 或最小 hooks 入口。
2. 将第一批最核心、最直接的读取场景改为 React Query 驱动。
3. 让读取逻辑正式复用第三阶段的 query key / invalidation 约定。
4. 保持后端权威与 Fail Loudly，不用空数组 / 空对象静默掩盖读取失败。

#### 15.3 执行边界

1. 本轮仅处理 `production-shared` 域内核心读取，不扩展到全站所有模块。
2. 本轮优先迁移读取，不大幅改写写入链路；mutation 仍复用现有 service + sync + invalidation。
3. 本轮不重做页面 UI 结构，只替换数据读取方式。
4. 本轮允许保留少量临时本地状态（如搜索、选择、对话框开关），但资源主数据读取应转交 Query。

#### 15.4 建议落点

建议新增以下稳定入口：

1. **query options 工厂**
   - 宿主建议：`src/features/production-shared/data/production-resource-query-options.ts`
   - 至少提供：
     - `productionResourceQueryOptions.lines()`
     - `productionResourceQueryOptions.processes()`
     - `productionResourceQueryOptions.mappings()`

2. **最小读取 hooks（如需要）**
   - 宿主建议：`src/features/production-shared/hooks/use-production-resources.ts`
   - 封装 `useQuery(...)`，减少页面层重复写法。

#### 15.5 首批迁移建议

优先级建议如下：

1. `src/features/production-shared/tabs/work-architecture/index.tsx`
   - 当前显式读取 production lines，属于核心展示入口。

2. `src/features/production-shared/tabs/work-architecture/components/process-library-panel.tsx`
   - 当前显式读取 production processes，同时已经是 mutation 发起点之一。

3. `src/features/org-personnel/components/production-selector.tsx`
   - 读取 production lines，适合作为跨模块 Query 消费示例。

4. `src/features/engineering/components/product/product-routing-view.tsx`
   - 读取 production processes，适合作为第二个跨模块 Query 消费示例。

说明：

5. `dashboard/index.tsx` 可视情况后置，因为它还夹杂本地存储、可见 segment 配置等额外状态。
6. `line-mgmt/index.tsx` 当前以乐观 UI + 手动局部回写为主，宜先保持写入链路稳定，再逐步过渡读取模式。

#### 15.6 实施步骤

1. **定义 query options / hooks 入口**
   - 让 lines / processes 的读取逻辑统一基于第三阶段 query key 工厂。
   - `queryFn` 继续调用现有纯 service。

2. **迁移首批核心读取页面**
   - 用 `useQuery(...)` 替换手写 `loadData()` + `useEffect()` 拉取。
   - 保留页面内 UI 状态，但去掉资源主数据的重复本地拉取状态机。

3. **校正与 sync / invalidation 的关系**
   - Query 消费者以 invalidation 触发重拉为主。
   - 非 Query 消费者若暂未迁移，可暂时保留 sync 订阅。
   - 避免 Query 页面同时再手写“收到 sync 后 `loadData()`”的双重刷新。

4. **保持 Fail Loudly**
   - 读取失败不允许用 `[]` / `{}` 伪装成功。
   - 应保持显式 loading / error 分支，遵守后端权威与可见失败原则。

5. **为后续全量迁移保留统一模式**
   - 第四阶段完成后，后续页面若继续迁移，只能复用这轮的 query options / hooks / invalidation 约定，不再新增平行实现。

#### 15.7 风险与注意事项

1. **双重刷新风险**
   - 若 Query 页面保留旧 `sync.subscribe -> loadData()`，再叠加 invalidation，会产生重复请求。
   - 控制方式：迁成 Query 的页面应移除对应手动拉取 effect。

2. **乐观 UI 回退风险**
   - `line-mgmt` 这类页面既有乐观更新又有手动回写，若仓促迁移读取，可能打乱现有交互。
   - 控制方式：先迁纯读取消费者，后迁含重写入状态管理的页面。

3. **静默兜底风险**
   - 迁移时若为了“兼容”而对 Query 数据使用默认 `[]`，会违反 Fail Loudly 原则。
   - 控制方式：明确错误分支，不用默认空值掩盖失败。

4. **范围膨胀风险**
   - 一旦开始迁 Query，很容易顺手改太多页面。
   - 控制方式：只做首批核心读取，不扩成全站数据层重写。

#### 15.8 完成标准

1. `production-shared` 域内已有统一读取 query options / hooks 入口。
2. 第一批核心读取页面已改为 `useQuery` 驱动。
3. 已迁移页面不再依赖手写 `loadData()` + `useEffect()` 执行同类资源主数据拉取。
4. 已迁移页面与 typed sync / invalidation 的关系清晰，不产生明显重复刷新。
5. 保持现有功能可运行，并完成最小验证与 `walkthrough.md` 更新。

### 16. `dashboard/index.tsx` Query 化收口

日期：2026-04-11  
状态：待批准

#### 16.1 背景

第四阶段已经完成：

1. `production-shared` 域内已有统一 query options / hooks。
2. 首批 4 个核心读取页面已迁到 `useQuery`。
3. `dashboard/index.tsx` 仍保留手写资源拉取与 storage event 混合刷新逻辑。

当前 `dashboard/index.tsx` 的特殊点在于：

4. 它既依赖 `production lines / segments`，也依赖本地存储中的可见 segment 配置。
5. 若简单迁成 Query，但不拆分 production resources 与 local storage 的边界，容易出现重复刷新和职责混乱。

#### 16.2 本轮目标

本轮目标是把 `dashboard/index.tsx` 纳入 `production-shared` Query 化收口，而不是重写整个 dashboard：

1. 将 dashboard 对 production lines / segments 的读取切换到 React Query。
2. 继续复用既有 `production-shared` query hooks / query key / invalidation 约定。
3. 保留 dashboard 自身本地存储配置（如 visible segments）为本地状态，不强行塞进 Query。
4. 明确 storage event 与 production resources invalidation 的协作边界。

#### 16.3 执行边界

1. 本轮仅处理 `dashboard/index.tsx`，不扩展到 `line-mgmt/index.tsx`。
2. 本轮只重构读取侧，不重写 dashboard 下游各 tab 的业务逻辑。
3. 本轮不移除 `VISIBLE_SEGMENTS_KEY` 与现有本地存储机制。
4. 本轮不扩展为 dashboard 全量状态平台化改造。

#### 16.4 技术方向

1. **production resources 读取**
   - 改为复用 `useProductionLinesQuery()` 或相应 query options。
   - dashboard 内对 line / segment 的派生数据改由 Query 数据计算得出。

2. **本地存储状态读取**
   - `VISIBLE_SEGMENTS_KEY` 仍由 StorageService / local state 维护。
   - storage event 仍只服务本地配置同步，而不是承担 production resource 刷新职责。

3. **刷新协作关系**
   - production lines 更新：由第三阶段 invalidation 触发 Query 重拉。
   - visible segments 更新：由 storage event / local state 更新处理。
   - 避免同一次生产资源变化再通过 dashboard 内部手动 `syncDashboardState()` 重拉 production lines。

#### 16.5 实施步骤

1. **拆分 dashboard 内两类状态来源**
   - 生产资源：React Query。
   - 可见 segment 配置：本地存储 + local state。

2. **替换 production lines 拉取逻辑**
   - 移除 dashboard 内同类 `loadData()` / `syncDashboardState()` 对 production resources 的直接拉取。
   - 保留对本地存储可见 segment 配置的更新逻辑。

3. **以派生计算替代混合刷新**
   - 从 Query 返回的 production lines 计算 segment 列表。
   - 将 visible segment ids 应用于派生结果，而不是在多个 effect 中交替刷新。

4. **校正事件监听边界**
   - storage event 继续监听，用于 visible segment 配置变化。
   - 不再监听 production resource 事件来手动拉取同类主数据。

#### 16.6 风险与注意事项

1. **双重刷新风险**
   - 若 dashboard 同时保留 production resource 手动拉取和 Query invalidation，会造成重复请求。
   - 控制方式：迁移后仅保留 storage 配置同步 effect。

2. **本地配置串扰风险**
   - 如果把 visible segments 和 production lines 混成同一 Query 状态，会削弱 dashboard 原有交互。
   - 控制方式：明确“服务端主数据”和“本地用户偏好”分层。

3. **范围膨胀风险**
   - dashboard 下游 tab 组件较多，容易顺手扩大改动面。
   - 控制方式：只处理 `dashboard/index.tsx` 的数据读取编排层。

#### 16.7 完成标准

1. `dashboard/index.tsx` 对 production lines / segments 的主数据读取已切换到 `useQuery`。
2. `dashboard/index.tsx` 不再通过手写 effect 拉取同类 production resources。
3. storage event 仅承担本地配置同步职责，不再与 production resources 刷新混用。
4. 保持 dashboard 现有功能可运行，并完成最小验证与 `walkthrough.md` 更新。

### 17. `line-mgmt/index.tsx` 分阶段收口：第一阶段先处理乐观 UI

日期：2026-04-11  
状态：待批准

#### 17.1 背景

当前 `line-mgmt/index.tsx` 已具备部分乐观 UI 行为，但仍存在边界不清的问题：

1. 更新时会先本地回写，再请求后端。
2. 创建时会先插入 `temp-*` 临时行，再等待服务端返回真实实体。
3. 失败时统一 `await loadData()` 回滚，成功后也会再次 `await loadData()` 做二次校正。
4. 乐观态、本地临时态、服务端确认态、全量 reload 目前混在一起，后续若直接继续 Query 化，容易放大复杂度。

因此需要先把 `line-mgmt` 的乐观 UI 单独收口，再决定下一步是否迁 Query。

#### 17.2 分阶段策略

**阶段 17A：乐观 UI 收口（本轮）**

1. 明确哪些变更是允许乐观展示的。
2. 明确创建/更新/删除三类操作的本地临时态规则。
3. 明确失败回滚与成功后二次校正的触发条件。
4. 保持现有读取模式，不在本阶段强推整页 Query 化。

**阶段 17B：读取 Query 化评估（后续）**

1. 在乐观 UI 边界稳定后，再评估是否将 `line-mgmt` 读取切到 `useQuery`。
2. 重点考虑 optimistic local state 与 Query cache 谁作为页面主真相来源。

**阶段 17C：mutation / cache 协作优化（后续）**

1. 如有必要，再将局部回写、回滚、invalidation 与 optimistic cache 做更细颗粒收口。

#### 17.3 本轮目标（仅阶段 17A）

本轮只处理 `line-mgmt/index.tsx` 的乐观 UI，不直接推进 Query 化：

1. 盘点当前创建/更新/删除三类操作的 optimistic 行为。
2. 明确临时态与服务端确认态切换规则。
3. 明确失败回滚策略，避免“看似乐观、实则全量重刷兜底”带来的边界模糊。
4. 保持与第二、第三阶段的 sync / invalidation 约定兼容。

#### 17.4 执行边界

1. 本轮只处理 `line-mgmt/index.tsx`。
2. 本轮不把整个页面切到 `useQuery`。
3. 本轮不改造 `dashboard`、`work-architecture`、`production-selector`、`product-routing-view`。
4. 本轮不改动 SDRTS 协议本身，只调整前端 optimistic orchestration。

#### 17.5 重点问题

1. **创建操作**
   - 当前通过 `temp-*` id 插入临时项。
   - 需明确：
     - 临时项的最小字段集合
     - 成功后如何稳定替换为服务端真实实体
     - 失败后如何精准移除临时项

2. **更新操作**
   - 当前按 delta 做本地局部回写。
   - 需明确：
     - 哪些字段允许直接乐观展示
     - 哪些嵌套结构不能只靠浅层 patch 假定成功
     - 成功后是否仍必须全量 reload，还是只在必要时校正

3. **删除操作**
   - 当前删除后再全量 reload。
   - 需评估是否先本地移除再失败回滚，或继续保守模式。

4. **与 invalidation 的协作**
   - line-mgmt 当前 mutation 成功后已经 `emitLinesUpdated()`。
   - 需明确：
     - 乐观 UI 页面本地态如何与域级 invalidation 共存
     - 避免一边 optimistic local state、一边立即全量重刷导致体验和结构互相打架

#### 17.6 实施步骤

1. **先盘点现状**
   - 标出 create / update / delete 当前各自的 optimistic 行为。

2. **明确本地临时态模型**
   - 为临时创建项、局部更新项建立清晰规则。

3. **收口成功/失败分支**
   - 成功时：只有必要时才做二次校正。
   - 失败时：做精确回滚，不依赖模糊的大范围刷新兜底。

4. **保留与后续 Query 化的兼容面**
   - 本轮不切 Query，但代码结构要方便下一阶段继续迁移。

#### 17.7 风险与注意事项

1. **假乐观 UI 风险**
   - 如果最终仍然主要依赖成功/失败后的全量 reload，乐观 UI 就只是表象。
   - 控制方式：尽量把回滚和确认边界写清，而不是继续依赖统一重刷兜底。

2. **嵌套结构错配风险**
   - 生产线包含 segments / jobCategories / stations，多层嵌套很容易让浅层 optimistic patch 失真。
   - 控制方式：第一阶段优先收口允许乐观展示的字段范围，不盲目扩展到复杂嵌套路径。

3. **过早 Query 化风险**
   - 如果在乐观 UI 还没理顺时继续把读取切到 Query，复杂度会叠加。
   - 控制方式：先稳住阶段 17A，再进入 17B。

#### 17.8 完成标准（阶段 17A）

1. `line-mgmt/index.tsx` 的 create / update / delete optimistic 行为边界已清晰。
2. 本地临时态、服务端确认态、失败回滚的切换规则已通过代码结构体现。
3. 成功/失败分支不再过度依赖模糊的全量 reload 兜底。
4. 保持现有功能可运行，并完成最小验证与 `walkthrough.md` 更新。

### 18. `line-mgmt/index.tsx` 第二阶段：Query cache 主真相 + optimistic overlay 短期覆盖层

日期：2026-04-11  
状态：待批准

#### 18.1 背景

阶段 17A 已完成：

1. `line-mgmt/index.tsx` 的乐观 UI 基础边界已经收口。
2. create / update / delete 已具备更明确的本地临时态、确认态与失败回滚规则。

但当前页面仍然以本地 `lines` state 为主，而不是以 Query cache 为主真相来源，这会带来以下问题：

3. 后续若继续推进 Query 化，本地 state 与 Query cache 很容易形成两套长期并存的数据真相。
4. 现有 invalidation 体系虽已存在，但 `line-mgmt` 还未真正把它作为“服务端最终确认态”的唯一刷新通道。
5. 如果不进一步收口，后续 optimistic 行为与 Query 刷新会互相打架。

#### 18.2 本轮目标

本轮目标是正式建立 `line-mgmt` 第二阶段模型：

1. **`Query cache` 作为页面主真相来源**。
2. **`optimistic overlay` 作为短期覆盖层**，只承载尚未确认的本地临时变更。
3. 页面展示数据改为：`displayedLines = applyOverlay(queryLines, overlay)`。
4. 明确 `create / update / delete` 成功时哪些优先 `setQueryData`，哪些需要 `invalidate`。

#### 18.3 执行边界

1. 本轮仅处理 `line-mgmt/index.tsx`。
2. 本轮不扩展到 `dashboard`、`work-architecture`、`production-selector` 等页面。
3. 本轮不重构 SDRTS 协议，不改动后端接口。
4. 本轮只建立 `Query cache + optimistic overlay` 的前端编排模型。

#### 18.4 数据模型建议

建议将 `line-mgmt` 页面状态拆为三层：

1. **Query cache（主真相）**
   - 来源：`useProductionLinesQuery()`
   - 含义：服务端最后确认的生产线数据

2. **optimistic overlay（短期覆盖层）**
   - 含义：当前尚未由服务端确认的本地变更
   - 建议至少区分：
     - `pendingCreates`
     - `pendingUpdates`
     - `pendingDeletes`

3. **displayedLines（展示层）**
   - 由 `queryLines + overlay` 计算得出
   - 页面 UI 只消费 `displayedLines`

#### 18.5 overlay 设计原则

1. overlay 必须是**短生命周期**的。
2. overlay 必须可按操作粒度清理，而不是依赖全量刷新消失。
3. overlay 不应成为新的长期主状态容器。
4. Query cache 始终表示“后端最后确认的数据”。

#### 18.6 create / update / delete 成功策略

##### A. create 成功

建议：**优先 `setQueryData`**

原因：

1. 后端 `saveLine(...)` 返回完整 `ProductionLine` 实体。
2. 可以直接将真实实体写回 Query cache，并移除对应临时创建 overlay。
3. 无需默认立即 `invalidate`，避免刚创建完就重复请求。

补充：

4. 若后端未来在创建后还会联动补齐复杂嵌套，再按需追加一次 `invalidate`，而不是默认总是双做。

##### B. update 成功

建议：**默认优先 `setQueryData`，复杂嵌套场景保留按需 `invalidate`**

原因：

1. `patchLine(...)` 当前也返回完整 `ProductionLine` 实体。
2. 对一级字段和服务端已完整返回的场景，直接 `setQueryData` 最稳定。
3. 若后续确认某些 patch 会联动深层嵌套并且返回值不足以覆盖真实最终态，再针对该类更新增加 `invalidate`。

补充：

4. 不建议 update 成功默认 `setQueryData + invalidate` 双做。

##### C. delete 成功

建议：**优先 `setQueryData` 删除对应实体**

原因：

1. 删除操作成功后，目标实体已不存在。
2. 最直接的确认方式就是从 Query cache 中移除它。
3. 无需默认立即 `invalidate`。

补充：

4. 若删除会联动影响父级聚合统计或拓扑衍生字段，可按需补充局部 invalidation，而不是默认总刷。

#### 18.7 `emit`、`setQueryData`、`invalidate` 的分工

1. **`setQueryData`**
   - 用于 mutation 成功后的本地确认落地
   - 优先服务 `line-mgmt` 自身这类 Query 页面

2. **`invalidate`**
   - 用于后端最终态可能超出当前返回值、或其他 Query 页面需要重拉时
   - 应按需使用，而不是默认所有 mutation 都触发

3. **`emitLinesUpdated()`**
   - 保留域事件语义
   - 服务于兼容桥或非 Query 消费者
   - 已迁为 Query 的页面自身不应再依赖 `emit -> subscribe -> loadData()` 刷新自己

#### 18.8 实施步骤

1. **将主真相切换到 Query cache**
   - 为 `line-mgmt` 接入 `useProductionLinesQuery()`。

2. **引入 overlay 层**
   - 用本地 overlay 承载未确认的 create / update / delete。

3. **实现 `displayedLines` 组装**
   - 统一由 query data + overlay 派生，而不是同时维护两套完整 `lines` 数组。

4. **为三类 mutation 明确成功收口方式**
   - create：默认 `setQueryData`
   - update：默认 `setQueryData`，复杂嵌套按需 `invalidate`
   - delete：默认 `setQueryData`

5. **为失败分支清理 overlay**
   - 失败时只撤销对应 overlay，不污染 Query cache。

#### 18.9 风险与注意事项

1. **双状态打架风险**
   - 若继续保留完整本地 `lines` 作为主状态，同时又引入 Query cache，会形成两套真相。
   - 控制方式：本轮明确 Query cache 是主真相，overlay 只做短期覆盖。

2. **双重刷新风险**
   - 若成功后既 `setQueryData` 又立刻无差别 `invalidate`，会造成重复请求和闪动。
   - 控制方式：默认优先 `setQueryData`，仅在必要时才补 `invalidate`。

3. **overlay 泄漏风险**
   - 如果 overlay 清理不彻底，会让临时态长期残留。
   - 控制方式：所有 mutation 都必须带可定位的 overlay 标识，并在成功/失败时精确清理。

#### 18.10 完成标准

1. `line-mgmt/index.tsx` 已明确以 Query cache 作为主真相来源。
2. `optimistic overlay` 已作为短期覆盖层而不是长期主状态存在。
3. `displayedLines` 已由 Query data + overlay 派生得出。
4. create / update / delete 成功时的 `setQueryData` / `invalidate` 策略已通过代码结构明确体现。
5. 保持现有功能可运行，并完成最小验证与 `walkthrough.md` 更新。
