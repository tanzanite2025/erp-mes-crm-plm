### 1. purchase：第二阶段收口规划（`usePurchaseOrderForm` / 写操作边界）

日期：2026-04-12  
状态：待批准

#### 1.1 当前背景

`purchase` 方向 A 第一轮已完成 UI 容器拆分：

1. `PurchaseOrderList` 已拆出筛选工具栏、详情 sheet 和筛选项加载 hook。
2. `PurchaseOrderActionDialog` 已拆出 Dialog 壳和物料 / 单位元数据加载 hook。

这一步已经把采购单主链的 UI 壳层责任压薄，但当前最重的复杂度已进一步集中到采购单编辑主链内部：

1. `usePurchaseOrderForm`
2. `usePurchaseOrderMutations`
3. `purchase-transaction-service.ts`

因此，下一阶段更适合进入“状态与写操作边界收口”，而不是继续优先拆 UI 外壳。

#### 1.2 当前问题判断

##### A. `usePurchaseOrderForm` 过于中心化

当前 `src/features/trading/hooks/use-purchase-order-form.ts` 同时承担：

1. 表单默认值初始化
2. 新建单号生成
3. 头部字段编辑
4. 行项目增删改
5. 金额汇总 / 预览计算
6. 基础校验
7. 提交前 `commit` 整理

这意味着它已经不是单纯的“表单 hook”，而是采购单编辑状态的中心。若继续在同一 hook 中叠加逻辑，未来每次修改头部字段、行编辑或保存前整理，都可能互相牵连。

##### B. `usePurchaseOrderMutations` 写操作入口集中

当前 `src/features/trading/purchase/hooks/use-purchase-orders.ts` 中的 mutation 层同时承载：

1. create
2. save
3. delete
4. receive / confirm
5. 查询失效与 toast 逻辑

这在现阶段仍可工作，但若采购单写操作继续增长，会逐渐形成“所有写操作都堆在一个 hook 里”的热点。

##### C. `purchase-transaction-service.ts` intent 层仍偏平铺

当前事务 service 已有 intent 化方向，是好的基础；但 intent 与 payload 仍然偏平铺。如果下一阶段继续增加 header / line / workflow 类 intent，文件复杂度会继续上升。

#### 1.3 下一阶段目标

下一阶段不改后端接口语义，也不重写 DTO / adapter，而是在前端内部继续降低复杂度：

1. 先把 `usePurchaseOrderForm` 拆成更清晰的状态职责块。
2. 再评估 `usePurchaseOrderMutations` 是否适合按写操作类型分组。
3. 最后再决定 `purchase-transaction-service.ts` 是否需要继续按 header / line / workflow 分层。

#### 1.4 推荐实施顺序

##### 第一步：先拆 `usePurchaseOrderForm`

目标：

1. 识别并收口以下职责：
   - 头部字段更新
   - 行项目编辑
   - 金额汇总
   - 校验
   - `commit` 前整理
2. 尽量保持现有 `PurchaseOrderActionDialog` 调用方式低破坏。

建议方向：

1. 可优先抽出纯函数或局部 helper，而不是立刻把 hook 过度拆散。
2. 若拆 hook，优先保证“单向组合”，避免多个 hook 互相反向依赖。
3. 对金额计算、默认值生成、校验这类纯逻辑，优先抽到独立工具文件。

##### 第二步：评估 `usePurchaseOrderMutations` 分组

目标：

1. 判断是否需要拆成更细的写操作组合，例如：
   - create / save
   - delete
   - receive / workflow
2. 保持 React Query 的缓存失效口径一致。

建议方向：

1. 优先抽共用成功 / 失败处理逻辑，避免重复 toast 与 invalidateQueries。
2. 若分组，先从读写语义差异最大的操作切开，不一次性全拆。

##### 第三步：视复杂度决定是否继续拆事务 service

目标：

1. 评估 `purchase-transaction-service.ts` 当前 intent 是否已经出现明显的 header / line / workflow 三类边界。
2. 若证据不足，则本轮先不动该文件，仅在 plan 中记录下一步候选方向。

#### 1.5 本轮边界控制

本轮明确不做：

1. 不修改后端采购单接口语义。
2. 不修改 `purchase-order-api-dto.ts` 与 adapter 契约结构。
3. 不处理 `features/purchase` 与 `features/trading` 的宿主归属迁移。
4. 不把本轮扩大为采购、销售共用抽象重构。

#### 1.6 风险与控制策略

1. **表单状态拆分后行为漂移风险**
   - `usePurchaseOrderForm` 涉及默认值、行编辑和提交前整理，拆分不当容易引入隐性回归。
   - 控制策略：优先抽纯逻辑，保留外部 API 稳定，逐步减重。

2. **mutation 分组后缓存失效不一致风险**
   - 若不同写操作分散后 invalidation 口径不一致，容易产生列表 / 详情不同步。
   - 控制策略：抽统一失效 helper，先集中定义查询 key 策略。

3. **事务 service 过早拆分风险**
   - 在 intent 边界还不够稳定前过早拆文件，可能制造更多横跳导入。
   - 控制策略：先以“是否已形成明确三类 intent”为判断门槛，不满足则先不拆。

#### 1.7 验证建议

若后续进入执行，建议至少验证：

1. 新建采购单时默认值、头部字段编辑、行编辑与金额汇总正常。
2. 编辑已有采购单时详情加载、表单回填与保存链路正常。
3. 删除、保存、确认收货等写操作行为不变。
4. `pnpm exec eslint` 目标文件通过。
5. `pnpm exec tsc --noEmit` 通过。

#### 1.8 当前阶段结论

`purchase` 第二阶段最稳妥的入口，不是继续拆页面外壳，而是从 `usePurchaseOrderForm` 开始，先把采购单编辑主链的状态与纯逻辑进一步分层；随后再按低风险方式评估 mutation 与事务 intent 的进一步收口。

### 1. purchase：模块分析与下一步收口规划

日期：2026-04-11  
状态：待批准

#### 1.1 当前模块入口

当前 `purchase` 模块并不是一个完全自洽的独立域，而是呈现出“页面宿主在 `features/purchase`，核心业务实现仍大量落在 `features/trading`”的结构。

当前主要入口包括：

1. `src/features/purchase/tabs/index.tsx`
   - 负责 `PurchaseOrders()` 与 `SupplierMgmt()` 的页面宿主
   - `PurchaseOrders()` 内部再包一层二级 Tabs：`orders / logs / returns`

2. `src/features/trading/components/purchase/**`
   - 承担采购单列表、详情、编辑弹窗、局部表单部件等 UI 组织

3. `src/features/trading/purchase/**`
   - 承担 purchase API service、transaction service、adapter、contracts、hooks 等业务链路

这意味着当前 purchase 的“展示入口”和“业务核心实现”已经跨两个 feature 目录分布。

#### 1.2 当前主链数据流

按采购单主链梳理，目前大致数据流为：

1. 页面宿主：
   - `src/features/purchase/tabs/index.tsx`

2. 列表容器：
   - `src/features/trading/components/purchase/purchase-order-list.tsx`
   - 负责分页、筛选、详情 sheet、编辑弹窗开关、删除动作、支付方式/账期字典加载

3. 编辑弹窗壳：
   - `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
   - 负责 supplier / material / unit 元数据加载、详情加载、保存动作接线

4. 表单状态与本地编辑逻辑：
   - `src/features/trading/hooks/use-purchase-order-form.ts`
   - 负责默认值、表头修改、行增删改、预览金额计算、校验、delta 提交前状态维护

5. 读写 hooks：
   - `src/features/trading/purchase/hooks/use-purchase-orders.ts`
   - 负责 React Query 查询与 mutation 封装，以及 toast / invalidateQueries

6. 基础 service：
   - `src/features/trading/purchase/services/purchase-service.ts`
   - 普通 REST 读写与收货确认

7. 事务式 service：
   - `src/features/trading/purchase/services/purchase-transaction-service.ts`
   - 负责按 intent 调用 `/purchase/orders/:id/transactions`

8. DTO / adapter：
   - `src/features/trading/purchase/contracts/purchase-order-api-dto.ts`
   - `src/features/trading/purchase/adapters/purchase-order-api-adapter.ts`

#### 1.3 当前最重的热点文件

基于现有结构，当前最值得关注的热点包括：

1. `src/features/trading/components/purchase/purchase-order-list.tsx`
   - 同时承担列表、筛选、详情、弹窗、局部字典加载与路由 search state 联动
   - 已经出现典型的“列表页容器堆叠”趋势

2. `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`
   - 同时承担详情加载、supplier/material/unit 元数据加载、表单 hook 接线与保存入口
   - 继续膨胀后容易变成下一个复杂弹窗壳文件

3. `src/features/trading/hooks/use-purchase-order-form.ts`
   - 同时承担：
     - 默认值初始化
     - 新建单据编号生成
     - 汇率拉取
     - 行编辑
     - 预览计算
     - 基础校验
   - 已经是采购单编辑主链最关键的状态热点

4. `src/features/trading/purchase/hooks/use-purchase-orders.ts`
   - 同时管理 create/save/supplier change/line add/remove/content change 等多个 mutation
   - mutation 与 query invalidation 逻辑集中，后续继续扩展会变重

5. `src/features/trading/purchase/services/purchase-transaction-service.ts`
   - 已经形成清晰 intent 分层，但 intent 数量多、payload 多，后续容易继续扩张为“大而平”的 transaction client

#### 1.4 当前结构问题判断

当前 purchase 还没有到必须大重构的程度，但已经有几个明显的架构信号：

1. **宿主边界分裂**
   - 页面在 `features/purchase`
   - 主体业务在 `features/trading/purchase`
   - 长期会让模块归属感变弱，排障成本提高

2. **列表容器责任偏多**
   - `PurchaseOrderList` 不只是“列表”，还承担了筛选、详情、编辑入口、辅助字典加载

3. **弹窗壳责任偏多**
   - `PurchaseOrderActionDialog` 已经开始混合“数据准备层 + 表单壳 + 保存协调层”三种职责

4. **表单 hook 过于中心化**
   - `usePurchaseOrderForm` 当前是采购单编辑主链的真正核心，任何继续叠加都容易让它变成新的高风险点

5. **事务意图层已出现价值，但还缺进一步分组**
   - `purchase-transaction-service.ts` 的 intent 化是好方向
   - 但后续若继续增加 intent，最好分组或拆文件，而不是继续平铺扩张

#### 1.5 下一步最推荐的低风险入口

当前如果要从 `purchase` 开始做下一轮，不建议一上来处理“宿主目录归属重构”，而更推荐先从采购单主链做低风险收口。

优先级建议如下：

##### 优先级 1：先拆采购单 UI 容器边界

目标文件：

1. `src/features/trading/components/purchase/purchase-order-list.tsx`
2. `src/features/trading/components/purchase/purchase-order-action-dialog.tsx`

理由：

1. 风险相对可控
2. 能先降低列表页与弹窗壳继续膨胀的趋势
3. 不会立即触碰最深的数据事务边界

##### 优先级 2：再收口采购单编辑状态边界

目标文件：

1. `src/features/trading/hooks/use-purchase-order-form.ts`
2. `src/features/trading/purchase/hooks/use-purchase-orders.ts`
3. `src/features/trading/purchase/services/purchase-transaction-service.ts`

理由：

1. 当前这三者共同组成采购单编辑主链
2. 若先把 UI 容器拆清，再来收口状态与事务边界会更稳

##### 优先级 3：最后再评估 purchase / trading 宿主边界

理由：

1. 这一步会涉及模块归属与目录迁移
2. 破坏面明显大于前两步
3. 更适合在主链边界已经清楚后单独推进

#### 1.6 当前推荐

如果下一轮正式启动 `purchase`，我当前最推荐：

1. **先选方向 A**：
   - 拆 `PurchaseOrderList`
   - 拆 `PurchaseOrderActionDialog`
   - 保持现有 service / transaction / DTO 不先大动

2. **下一轮再处理方向 B**：
   - 收口 `usePurchaseOrderForm`
   - 视情况拆 `purchase-transaction-service`

这样更符合“先减风险，再动主链”的顺序。

#### 1.7 当前阶段结论

`purchase` 模块当前最值得处理的不是“整模块重命名或迁目录”，而是采购单主链的 UI 容器与编辑状态边界。下一步最稳妥的入口，是先从 `PurchaseOrderList` 与 `PurchaseOrderActionDialog` 做低风险拆分和职责收口，再决定是否进入 `usePurchaseOrderForm` 与 transaction service 的第二阶段收口。

### 1. engineering：`/engineering/product-attributes` 历史 `option.value` 统一迁移

日期：2026-04-11  
状态：待批准

#### 1.1 当前背景

在 `/engineering/product-attributes` 已完成方向 A 的机器值治理后，系统已经实现：

1. 新增分类项 `value` 会自动规范化
2. 保存前后端双层格式校验与防重复
3. 已有 `option.value` 被保护为不可直接编辑

这解决了“未来继续写入脏机器值”的问题，但当前仍存在一个历史治理遗留点：

1. 现有历史 `option.value` 虽然没有冲突，但风格并不统一
2. 当前同时存在：
   - 全大写：`NORMAL` / `HIGHTG` / `STD`
   - 首字母大写：`Hooked` / `Disc` / `Lightweight`

也就是说，当前状态是“数据不撞车，但机器值风格不统一”。

#### 1.2 已完成的库内扫描结论

基于当前本地运行库的只读扫描，确认如下：

1. `product_attribute_options` 共 10 条记录
2. 不存在同一分类下仅大小写不同的重复值
3. 不存在按当前规范化规则收口后会撞值的记录
4. `product_attribute_values` 当前为空表
5. 因此本地库里暂无历史 `option_value` 的存量引用负担

这意味着：

1. 历史 `option.value` 统一迁移在当前本地库中的数据迁移成本较低
2. 但代码链路仍需一并收口，避免默认值与消费链口径不一致

#### 1.3 本轮目标

本轮目标不是继续分析，而是为下一轮正式执行建立明确映射和边界：

1. 统一历史 `product_attribute_options.value`
2. 如目标环境存在引用数据，则同步迁移 `product_attribute_values.option_value`
3. 同步调整前后端默认种子值与相关字典消费口径
4. 保持 `category.key` 继续稳定兼容，不扩大为全链迁移

#### 1.4 建议的目标映射表

建议将当前历史值统一映射为以下机器值：

1. `NORMAL` -> `normal`
2. `HIGHTG` -> `high-tg`
3. `Hooked` -> `hooked`
4. `Hookless` -> `hookless`
5. `Tubular` -> `tubular`
6. `Disc` -> `disc`
7. `STD` -> `std`
8. `Lightweight` -> `lightweight`
9. `Ultralight` -> `ultralight`
10. `Reinforced` -> `reinforced`

这些目标值符合当前已经落地的机器值规则：

1. 全小写
2. 连字符分隔
3. 可稳定搜索 / 比较 / 筛选

#### 1.5 预期代码收口范围

若进入执行，建议至少同步以下代码范围：

##### A. 后端默认种子值

1. `server/services/product_attribute_option_service.go`
2. `server/db/db.go`

原因：

1. 两处都定义了默认 `option.value`
2. 若只改数据库、不改默认值，后续环境初始化仍会继续写回旧值

##### B. 前端字典消费链

1. `src/features/engineering/hooks/use-product-form-init.ts`
2. `src/features/engineering/components/product/dynamic-attribute-section.tsx`
3. `src/features/engineering/utils/product-attribute-utils.ts`
4. `src/features/engineering/tabs/product-attributes-mgmt.tsx`

原因：

1. 产品表单与动态属性下拉的真实值来自 `option.value`
2. 若值统一后，这些地方需要验证回显、提交与筛选是否仍正常

##### C. 产品保存 / 传输链

1. `server/services/product_master_service.go`
2. `server/models/product_attribute_value.go`
3. `src/features/engineering/adapters/product-api-adapter.ts`
4. `src/features/engineering/data/schema.ts`

说明：

1. 这些文件未必都需要代码修改
2. 但至少属于必须纳入验证的链路

#### 1.6 预期数据收口范围

##### A. 必做

1. `product_attribute_options.value`

##### B. 条件联动

1. `product_attribute_values.option_value`

当前本地库扫描结果为 0 行，因此本地环境无实际数据迁移负担。  
但若目标环境存在历史产品属性值，则必须同步迁移，否则会导致：

1. 产品表单回显不到下拉项
2. 动态属性显示失配
3. 旧值继续在产品数据中残留

因此下一轮正式执行时，仍应把 `product_attribute_values` 迁移脚本作为正式步骤保留，而不是假设所有环境都为空。

#### 1.7 建议执行顺序

建议按以下顺序执行：

1. 先更新默认种子值与代码常量口径
2. 再更新 `product_attribute_options.value`
3. 若目标环境存在引用数据，再同步更新 `product_attribute_values.option_value`
4. 最后做产品表单 / 动态属性 / 编辑保存回归验证

这个顺序能减少“代码先读新值、数据库仍是旧值”或“数据库已改、UI 仍按旧值处理”的错位窗口。

#### 1.8 风险与控制策略

1. **目标环境数据与本地扫描不一致风险**
   - 本地库当前为空表，不代表其它环境一定为空。
   - 控制策略：正式执行前再次扫描目标环境的 `product_attribute_values`。

2. **默认种子回写旧值风险**
   - 若只改数据库、不改默认种子，后续初始化可能继续补回旧值。
   - 控制策略：数据库与默认种子值一起收口。

3. **表单回显失配风险**
   - 产品表单下拉的 `value` 变更后，旧产品若仍存旧值可能无法正常回显。
   - 控制策略：若发现目标环境存在引用数据，必须同步迁移 `product_attribute_values`。

4. **误把本轮扩大为 `category.key` 主链迁移风险**
   - 当前任务只处理 `option.value`，不应顺势扩大为 `category.key` 重构。
   - 控制策略：明确 `category.key` 保持兼容稳定，不在本轮改名。

#### 1.9 验证建议

若后续进入执行，建议至少验证：

1. 字典页分类项列表显示正常
2. 新增分类项仍按新规则落值
3. 产品表单下拉能正确显示并提交新机器值
4. 编辑已有产品时动态属性回显正常
5. `pnpm exec eslint` 目标文件通过
6. `pnpm exec tsc --noEmit` 通过
7. 后端定向验证产品属性与产品保存相关链路

#### 1.10 当前阶段结论

历史 `option.value` 统一迁移已经具备进入执行的条件：当前本地库没有冲突，也没有 `product_attribute_values` 存量引用负担。下一轮的关键不是“能不能迁移”，而是按映射表把默认种子值、字典数据和可能存在的产品属性值引用一起收口，避免形成新旧值并存。

### 1. engineering：`/engineering/product-attributes` 机器值长期规范化治理

日期：2026-04-11  
状态：待批准

#### 1.1 当前问题

`/engineering/product-attributes` 当前除了页面结构与样式问题外，还暴露出一个更长期的治理风险：

1. `category.key` 本质上是内部机器值，但目前只是约定式地倾向小写，并没有形成强约束。
2. `option.value` 也在承担机器值职责，但目前允许大小写混用、空格/符号输入差异等潜在不一致来源。
3. 如果继续允许这些值以“看起来差不多、机器上却不同”的形式进入系统，后期容易在搜索、筛选、精确匹配、导入导出、统计与规则判断中形成隐性问题。

这类问题的风险不在于“现在立即报错”，而在于后期出了问题时**很难第一时间想到根因在机器值不规范**。

#### 1.2 长期目标

本轮长期目标是把以下字段明确收口为**机器值**：

1. `category.key`
2. `option.value`

它们应满足：

1. 稳定可比较
2. 稳定可搜索
3. 稳定可筛选
4. 不因大小写、空格、符号差异形成重复语义

同时，展示语义继续由以下字段承担：

1. `nameZh / nameEn`
2. `labelZh / labelEn`

也就是说，后续要进一步把“机器值”和“展示值”职责分离清楚。

#### 1.3 建议的统一规范

建议将 `category.key` 与 `option.value` 统一为同一种机器值格式：

1. 全小写
2. 去除首尾空白
3. 中间空白折叠并转为连接符
4. 非法符号剔除或拦截
5. 最终保存为稳定的 slug 风格机器值

示例：

1. ` Matte Black ` -> `matte-black`
2. `HIGH TEMP` -> `high-temp`
3. `fiber_12K` -> `fiber-12k`（若采用统一连字符规则）

这样比“仅自动转小写”更稳，因为还能一起处理空格、符号、粘贴污染与边缘输入。

#### 1.4 推荐治理策略：三层同时做

本轮建议按以下三层一起治理，而不是只做单点输入修补。

##### A. 输入层自动规范化

前端表单在录入 `category.key` 与 `option.value` 时，自动执行：

1. `trim`
2. 小写化
3. 空格转连字符
4. 连续分隔符压缩
5. 非法字符过滤

价值：

1. 立刻减少误输入
2. 对用户更直观
3. 能在日常录入阶段就拦住大部分脏值

##### B. 保存层强校验

无论输入框是否已经自动转换，保存前仍应再次统一规范化并校验：

1. 规范化后是否为空
2. 是否符合机器值格式
3. 是否与现有记录发生重复
4. 是否只是大小写/空白/符号差异导致的重复

价值：

1. 防止未来新增其它入口时绕过前端输入约束
2. 防止因历史代码或批量导入漏过前端规则
3. 确保最终持久化边界稳定

##### C. 存量数据治理

在真正收口前，需要排查现有数据中是否已存在：

1. `Black` / `black`
2. `High Temp` / `high-temp`
3. 其它规范化后会撞成同一个机器值的记录

若存在冲突，不建议直接静默覆盖，而应：

1. 先列出冲突清单
2. 明确保留值与合并策略
3. 再做数据清洗或人工确认

价值：

1. 避免“新规则上线后，旧脏数据继续污染搜索/筛选结果”
2. 避免规范化迁移时误合并数据

#### 1.5 为什么不能只做输入自动转换

只做输入自动转并不等于长期稳妥，原因包括：

1. 历史存量数据不会自动变干净。
2. 未来可能存在导入、脚本、其它保存入口绕过当前页面。
3. 即使输入自动转换，如果保存边界不校验，仍可能出现“规范化后撞值”的问题。
4. 只做页面层处理，会让根因继续停留在 UI，而不是正式保存边界。

因此，输入自动规范化是必要条件，但不是充分条件。

#### 1.6 最小联动范围

若进入执行，建议最小联动以下范围：

1. `src/features/engineering/tabs/product-attributes-mgmt.tsx`
   - 容器层保存前校验与提示

2. `src/features/engineering/components/product-attributes/product-attribute-category-dialog.tsx`
   - `category.key` 输入约束与提示

3. `src/features/engineering/components/product-attributes/product-attribute-option-dialog.tsx`
   - `option.value` 输入约束与提示

4. `src/features/engineering/utils/` 下新增或扩展规范化工具
   - 统一的机器值规范化函数
   - 统一的重复比较函数

5. 产品属性保存链路对应的前后端保存边界
   - 至少评估并补齐最终入库前的规范化/防重逻辑

#### 1.7 新发现的复杂度：`category.key` 已经是跨链稳定标识

在进入执行前补充排查后，确认了一个关键事实：`category.key` 目前并不只是产品属性管理页的内部字段，而是已经被以下链路直接依赖：

1. 前端产品表单动态属性渲染
2. 前端产品摘要与属性读取工具
3. 前端部分 SKU / 版本逻辑
4. 后端产品 DTO / 保存链路
5. `product_attribute_values` 中的 `categoryKey`

当前系统内还存在硬编码稳定 key，例如：

1. `techSeries`
2. `tireType`
3. `brakeType`
4. `versionLevel`

这意味着：

1. 若仅从管理页层面把这些 key 直接改成全新 slug，会导致既有产品属性值与消费点失配。
2. `category.key` 的正式收口已不再是局部页面治理，而是跨前后端主链迁移。

因此，这一发现使得原先“`category.key / option.value` 同步统一机器值”的执行范围出现了升级，需要在正式实施前再次确认边界。

#### 1.8 建议的执行分叉

基于当前复杂度，建议在执行前明确选择以下两种方向之一：

##### 方向 A：稳定旧 `category.key`，优先收口 `option.value`

适用场景：

1. 当前优先目标是长期稳定，但不希望本轮升级为跨链重构。
2. 希望先把最容易形成大小写/搜索/筛选隐患的 `option.value` 完整治理掉。

执行内容：

1. 保留现有已落库 `category.key` 作为稳定兼容标识，不做全量改名迁移。
2. 对 `category.key` 新增更严格的输入与保存校验，防止继续写入随意新 key。
3. 把 `option.value` 完整收口为统一机器值格式（输入规范化 + 保存校验 + 服务端防重）。
4. 排查 `option.value` 的存量冲突并制定清洗策略。

优点：

1. 风险显著更低。
2. 能先解决最现实的搜索/匹配隐患。
3. 不会立即冲击既有产品主链。

代价：

1. `category.key` 的历史 camelCase 不会在这一轮彻底统一成 slug。
2. `category.key` 的完全规范化需要后续单独作为正式迁移任务推进。

##### 方向 B：正式推进 `category.key` 全链迁移

适用场景：

1. 你希望一次把 `category.key` 与 `option.value` 都收口到统一机器值体系。
2. 可以接受本轮升级为跨前后端主链迁移任务。

执行内容：

1. 为既有 `category.key` 设计目标 slug。
2. 同步迁移前端常量、动态属性消费点、产品表单与属性工具。
3. 同步迁移后端 DTO / 保存链 / 默认种子数据。
4. 迁移已有 `product_attribute_values.category_key` 与相关数据。
5. 再在新体系下收口 `option.value`。

优点：

1. 理论上一轮内把机器值体系完全统一。

代价：

1. 破坏面明显扩大。
2. 需要处理历史产品数据迁移与兼容。
3. 验证范围会远超当前页面本身。

#### 1.9 当前推荐

从“长期最稳”和“当前避免隐形大坑”两者平衡来看，我更推荐：

1. **本轮采用方向 A**：
   - 保持既有 `category.key` 兼容稳定
   - 完整收口 `option.value`
   - 同时收紧 `category.key` 新增/编辑规则，避免继续失控

2. **把 `category.key` 全链迁移单独立项**：
   - 作为后续正式迁移任务
   - 在有充分时间处理产品属性值与消费点联动时推进

#### 1.10 风险与控制策略

1. **规范化后撞值风险**
   - 如 `Black` 与 `black` 会收敛为同一个机器值。
   - 控制策略：先扫描冲突，再决定是否自动阻断、人工合并或迁移。

2. **已有业务依赖旧值风险**
   - 若历史逻辑直接使用原始大小写值，规范化后可能影响既有精确匹配。
   - 控制策略：先排查消费点，确认 `value` 的使用口径，再做正式收口。

3. **用户感知偏差风险**
   - 用户可能误以为机器值就是展示值。
   - 控制策略：继续把中英文展示名与机器值分离，并在表单中保持说明。

4. **只改前端不改边界风险**
   - 新旧入口可能继续写入不一致值。
   - 控制策略：不把方案停留在输入框层，必须评估并补齐保存边界。

#### 1.11 验证建议

若后续进入执行，建议至少验证：

1. 正常输入大小写、空格、符号时，表单值是否被稳定规范化
2. 仅大小写不同的重复值是否会被阻止保存
3. 编辑已有记录时，是否不会误伤合法展示字段
4. `pnpm exec eslint` 目标文件通过
5. `pnpm exec tsc --noEmit` 通过
6. 若服务端联动，补充对应保存链路的定向验证

#### 1.12 当前阶段结论

`/engineering/product-attributes` 如果要做到长期最稳，不应只做“输入自动变小写”的轻量补丁，而应把 `category.key / option.value` 当成正式机器值治理：**输入自动规范化 + 保存层强校验 + 存量数据冲突排查** 三层一起做，才能最大限度降低后续隐性排错成本。

### 1. engineering：`/engineering/product-attributes` 先拆分再按 `GEMINI.md` 对齐样式

日期：2026-04-11  
状态：待批准

#### 1.1 当前现状

当前 `/engineering/product-attributes` 对应页面为：

1. `src/features/engineering/tabs/product-attributes-mgmt.tsx`

该页面已经具备一定的工业风基础，例如：

1. 页面根节点已使用 `animate-in fade-in duration-700`
2. 存在 `rounded-[24px/32px]`
3. 存在 `dashed` 边框与 `italic` 标题

但当前更大的问题已经不只是视觉细节，而是**文件过长与嵌套过深**：

1. `product-attributes-mgmt.tsx` 同时承载页面容器、统计卡片、双列表卡片、两个弹窗和大量表单字段
2. 如果继续在同一个超长文件里直接做样式对齐，容易把结构与视觉修改混在一起
3. 这会提高误伤逻辑与回归排查成本

因此，这轮最合理的顺序应调整为：**先拆分文件，再做样式对齐**。

#### 1.2 调整后的目标

本轮新的主目标是两步走：

1. 先把 `product-attributes-mgmt.tsx` 拆成更小的页面局部组件
2. 在拆分后的结构上，再继续按 `GEMINI.md` 的 UDS 1.0 做样式对齐

这样可以避免一次性在超长文件内做过多视觉细节修改，降低破坏逻辑的风险。

#### 1.3 对齐依据

本轮将以 `GEMINI.md` 中的 UDS 1.0 规范为准，重点对齐：

1. `italic` 标题
2. `dashed` 边框
3. `rounded-[24px/32px]` 的工业大圆角
4. 页面整体 `animate-in fade-in duration-700`

换句话说，本轮不是功能改造，而是**视觉密度与样式语言的一致性收口**。

#### 1.4 建议拆分边界

结合当前页面结构，建议优先拆出以下局部组件：

1. **页面头部卡片**
   - 负责标题、图标、副标题说明

2. **分类统计卡片区**
   - 负责顶部分类摘要卡片列表

3. **分类定义卡片**
   - 负责左侧分类表格与操作按钮

4. **分类项定义卡片**
   - 负责右侧分类项表格与操作按钮

5. **分类弹窗表单**
   - 负责分类新增/编辑表单视图

6. **分类项弹窗表单**
   - 负责分类项新增/编辑表单视图

#### 1.5 页面容器层建议保留的逻辑

拆分后，页面容器层仍建议保留：

1. 数据加载与 `loadData`
2. `categories / options / selectedCategoryKey` 等状态
3. 新增、编辑、删除、保存等事件处理函数
4. 弹窗开关状态与当前编辑对象

也就是说，先拆**展示层与局部表单结构**，暂不下沉复杂状态逻辑，避免拆分过猛。

#### 1.6 拆分后再对齐样式的路径

在拆分后的结构上，再统一以下视觉细节会更安全：

1. 页面头部卡片
2. 分类统计卡片
3. 左右双列表卡片
4. 两个弹窗

届时样式对齐仍按以下方向执行：

1. `italic` 标题
2. `dashed` 边框
3. `rounded-[24px/32px]`
4. 字号、tracking、字重、按钮密度与空态层级统一

#### 1.7 本轮目标

本轮目标是先完成**结构减重**，为后续安全样式对齐建立更清晰的文件边界：

1. 降低单文件长度与嵌套深度
2. 保持业务逻辑不变
3. 为下一步视觉对齐提供更低风险的改动面

#### 1.8 本轮刻意不做的部分

本轮保持不动：

1. 数据加载逻辑
2. 保存/删除交互逻辑
3. DTO / schema / service
4. 其它 engineering 页面
5. 大范围样式重做（留到拆分后再做）

原因是本轮先做结构减重，不把拆分和大规模视觉微调混在同一轮里。

#### 1.9 风险与控制策略

1. **拆分过猛风险**
   - 如果把状态逻辑也大规模下沉，会增加回归面。
   - 控制策略：本轮先只拆展示块和局部表单结构，容器层保留状态与事件处理。

2. **拆分后样式碎片化风险**
   - 如果边拆边各自调整样式，可能形成新的不一致。
   - 控制策略：先完成拆分边界，再集中做样式收口。

3. **中英文布局回归风险**
   - 拆分后组件 props 变化可能影响中英文文本布局。
   - 控制策略：保持现有响应式结构与文本逻辑，拆分后做中英文快速检查。

#### 1.10 验证建议

本轮执行后建议至少验证：

1. `pnpm exec eslint src/features/engineering/tabs/product-attributes-mgmt.tsx`
2. `pnpm exec tsc --noEmit`
3. 若拆出新文件，则同步验证新增组件文件
4. 人工快速检查页面功能未受拆分影响

#### 1.11 当前阶段结论

`/engineering/product-attributes` 当前最合理的下一步，不是继续在超长文件里直接磨样式，而是先把 `product-attributes-mgmt.tsx` 拆成更小的局部组件，再在拆分后的结构上继续做 `GEMINI.md` 风格对齐。这样更稳、更易验证，也更符合“避免长文件继续堆叠”的要求。

