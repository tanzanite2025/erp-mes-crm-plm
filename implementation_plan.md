# Audit Engine 实施主计划

日期：2026-04-09  
状态：待批准

## 1. 目标

# MRP 独立模块化迁移实施计划

日期：2026-04-09  
状态：待批准

## 1. 目标

本轮目标不是单纯给 `src/features/mrp` 补几个空目录，而是把当前仍以 Trading 功能点形态存在的 MRP，逐步提升为一个具备独立前端分层、独立事实源边界和独立演进能力的领域模块。

本轮需要达成四个结果：

1. 明确当前 MRP 功能在前端的真实散落位置与宿主关系。
2. 设计 MRP 作为独立模块的目标目录与分层边界。
3. 设计一条渐进迁移路径，避免一次性重写全部 Trading 相关代码。
4. 保证迁移完成后，MRP 不再长期依赖 Trading 作为领域宿主。

## 2. 当前已确认事实

### 2.1 MRP 当前尚未具备完整模块骨架

当前已确认：

1. `src/features/mrp/services` 为空目录。
2. `src/features/mrp/data` 为空目录。

这意味着 MRP 目前还没有成型的前端 service/data 层，不应被误判为“已经是独立模块，只差补功能”。

### 2.2 当前 MRP 更接近 Trading 体系内功能点

从现有目录结构判断，MRP 当前更像是：

1. 挂靠在 Trading 业务中的一组页面/功能点。
2. 仍借用或依赖其他领域现有 schema、query、mutation、页面入口。
3. 没有独立的模块入口与契约层。

因此，迁移的本质是“从功能点抽离成模块”，而不是“在既有模块中再补几个文件”。

## 3. 核心设计原则

### 3.1 先定义边界，再迁移代码

本轮不能直接把若干文件机械移动到 `mrp/` 目录下就算完成。

需要先明确：

1. 哪些能力属于 MRP 自有领域。
2. 哪些能力属于 Trading 或其他共享领域。
3. 哪些东西应该抽到共享层，而不是被 MRP 和 Trading 各自复制。

### 3.2 独立模块必须具备最小分层闭环

MRP 若要成为正式模块，至少要有：

1. `data`：类型、schema、常量、DTO/adapter。
2. `services`：API 调用与后端契约封装。
3. `hooks`：query/mutation 与页面动作编排。
4. `components`：模块内部可复用视图组件。
5. 模块入口：路由页、index 导出、权限入口或导航承载位。

如果没有这些分层，只是把页面放进 `mrp` 目录，不足以称为独立模块。

### 3.3 迁移必须渐进，不要求一步到位

MRP 从 Trading 中抽离，适合按阶段进行：

1. 先建立模块骨架与兼容导出。
2. 再逐步迁移 data/service/hook。
3. 最后收口页面入口与 Trading 侧旧依赖。

这样能降低回归风险，也更容易验证每一阶段是否真正完成边界收口。

## 4. 建议目标结构

### 4.1 建议的 MRP 模块骨架

建议目标目录至少包括：

1. `src/features/mrp/data`
2. `src/features/mrp/services`
3. `src/features/mrp/hooks`
4. `src/features/mrp/components`
5. `src/features/mrp/pages` 或当前项目约定的路由承载目录
6. `src/features/mrp/index.ts`

### 4.2 每层职责建议

- `data`
  - MRP 自有 schema
  - 视图模型/接口定义
  - API DTO adapter
- `services`
  - MRP 读写接口调用
  - 响应解析与错误映射
- `hooks`
  - query/mutation
  - 模块动作编排
- `components`
  - 清单、详情、动作面板、局部视图组件
- `pages/entry`
  - 页面级容器
  - 路由与权限接入点

## 5. 建议迁移阶段

### Phase 1：盘点当前 MRP 散落点

- 目标：
  1. 找出 MRP 当前真实页面、服务调用、schema、hooks、组件、路由入口。
  2. 列出哪些仍在 Trading 内，哪些已经在 `mrp` 目录中，哪些在共享层。

### Phase 2：建立模块骨架与兼容层

- 目标：
  1. 创建正式 `mrp` 分层目录。
  2. 先放入最小 schema/service/hook 骨架。
  3. 通过 re-export 或兼容层降低迁移期破坏面。

### Phase 3：迁移领域事实源

- 目标：
  1. 将 MRP 自有 schema 从 Trading 或其他目录迁入 `mrp/data`。
  2. 将 MRP 自有 API 调用迁入 `mrp/services`。
  3. 将页面对这些事实源的依赖改为走 MRP 自己的 hooks。

### Phase 4：收口页面入口与旧宿主依赖

- 目标：
  1. 让 MRP 页面入口、模块 index、导航/权限承载位完成独立化。
  2. 清理 Trading 中仅因历史原因保留的 MRP 宿主代码。
  3. 明确哪些共享能力保留在共享层，而不是继续挂在 Trading 中。

## 6. 涉及文件（预估）

前端侧可能涉及：

1. `src/features/mrp/**`
2. `src/features/trading/**` 中当前承载 MRP 的页面、hooks、service、schema
3. 相关 route / sidebar / permission 配置文件
4. 共享 schema / api client / permission 绑定文件

文档侧：

1. `task.md`
2. `implementation_plan.md`
3. `walkthrough.md`

## 7. 风险与注意事项

### 7.1 假独立风险

如果只补空目录或只移动页面，不同步迁移 schema/service/hook，MRP 仍然会继续依赖 Trading 作为真正宿主，形成“目录独立、架构未独立”的假象。

### 7.2 复制粘贴式拆分风险

如果为了快而直接复制 Trading 代码到 MRP，短期看像完成抽离，长期则会造成两套平行逻辑、两份 schema、两套接口适配器同时漂移。

### 7.3 路由与权限边界风险

即使内部代码抽离完成，如果路由入口、权限绑定、菜单承载仍然依附 Trading，MRP 的模块边界仍然不完整。

## 8. 批准后的最小验收标准

1. MRP 拥有正式模块骨架，而不只是空目录。
2. MRP 自有 schema / services / hooks 不再长期散落在 Trading 中。
3. 迁移过程保留兼容层，避免一次性打断现有页面可用性。
4. Trading 不再承担 MRP 的长期领域宿主职责。
5. `walkthrough.md` 记录迁移阶段、兼容策略与验证结果。

---

# 销售订单保存路径后端收敛为单一入口实施计划

日期：2026-04-09  
状态：待批准

## 1. 目标

本轮目标不是继续优化前端 `delta` 计算细节，而是把“根据变更语义选择哪条事务路径”的职责从前端 UI 层移回后端。前端不应继续充当销售订单保存链的事务路由器。

本轮需要达成四个结果：

1. 前端保存动作不再根据 `delta` / 行差异 / 字段组合决定调用哪条后端 mutation。
2. 后端提供单一销售订单保存入口，由后端裁决变更属于客户变更、状态变更、行增删改还是通用更新。
3. 现有并发控制与版本冲突语义继续保留，不因入口收口而退化为粗暴全量覆盖。
4. 为后续 `purchase` 或其他交易单据复制同类模式提供统一样板。

## 2. 当前已确认事实

### 2.1 当前前端承担了领域编排职责

当前销售订单保存链中，前端并不只是“提交表单结果”，而是在保存前先分析：

1. `delta` 中改了哪些字段。
2. 行项目是否发生结构变化。
3. 行变化属于新增、删除还是内容更新。
4. 是否命中客户字段变化、状态字段变化等特殊分支。

随后，前端再根据这些业务判断去选择具体 mutation。

这已经不是展示层工作，而是典型的领域规则编排。

### 2.2 当前问题不是一个 if/else 能否工作，而是谁在裁决

即使当前前端分流逻辑在若干场景下能工作，它仍然存在结构性问题：

1. 事务语义散落在 UI / hook 中，而不是集中在后端服务层。
2. 前端规则一旦与后端真实约束分叉，就会产生“前端命中 A 路径、后端其实需要 B 裁决”的漂移。
3. 后续若继续扩变更类型，只会让 UI 层 `if/else` 更长、更脆弱、更难验证。

因此，这个问题的根因不是“某个分支写得不够好”，而是职责边界放错了层。

## 3. 核心设计原则

### 3.1 前端提交事实，后端裁决语义

前端应该提交：

1. 原始变更集（若仍保留 delta 作为技术输入）。
2. 或最终快照（若保存接口以最终状态为主）。
3. 并发控制元数据（如 `version` / `expectedVersion`）。

后端根据这些输入决定：

1. 属于哪种业务变更类型。
2. 需要执行哪些内部事务路径。
3. 是否允许该变更发生。

### 3.2 单一入口不等于退回全量覆盖保存

本轮收口目标不是把所有语义揉成一个不透明的“大而全 Save”。

后端内部仍可保持：

1. 状态迁移校验。
2. 客户变更的专项约束。
3. 行增删改的显式处理。
4. 版本冲突与防腐校验。

但这些判定与分派应由后端统一完成，而不是由前端决定走哪个路由。

### 3.3 保留并发保护主链

无论最终请求契约是“delta + version”还是“snapshot + version”，都必须保留现有版本冲突语义，不能为了前端简化而削弱后端乐观锁。

## 4. 建议实施形态

### 4.1 对前端的收口目标

建议前端保存链收口为：

1. 表单层负责产出原始表单结果。
2. 若仍需要技术层 `delta`，仅作为变更事实输入，不作为事务路由依据。
3. `use-sales-order-save.ts` 只调用单一保存 mutation。
4. 删除 `sales-order-save-plan.ts` 这类“按领域语义分流后端 mutation”的职责，或将其降级为纯技术差异构造工具。

### 4.2 对后端的收口目标

建议后端增加或收口为单一保存入口：

1. 接收前端原始变更集/最终快照。
2. 在服务层内部识别本次变更语义。
3. 根据语义调用相应内部事务处理逻辑。
4. 统一输出成功结果或冲突/校验错误。

### 4.3 对现有交易事务服务的兼容要求

如果现有后端已经有若干显式 transaction service（客户变更、状态迁移、行增删改），本轮不必强行删掉这些内部能力。

更合理的做法是：

1. 保留内部细分服务。
2. 新增一个上层 orchestration/save service。
3. 由这个后端上层服务做唯一裁决与分派。

这样既能收口前端职责，也不会一次性打碎既有事务语义实现。

## 5. 建议实施顺序

### Step 1：盘点当前前端保存路由规则

- 重点文件：
  1. `sales-order-save-plan.ts`
  2. `use-sales-order-save.ts`
  3. 销售订单表单/保存相关 hook 与 dialog 文件
- 目标：
  1. 列清当前前端到底在判定哪些业务语义。
  2. 确认哪些判断只是技术差异构造，哪些已经是领域分派。

### Step 2：盘点当前后端保存/事务入口

- 重点文件：
  1. 销售订单 routes / handlers
  2. sales transaction service
  3. 相关 patch/save handler 与 service
- 目标：
  1. 确认后端当前已有的细分事务能力。
  2. 确认最合适的单一入口承载位。

### Step 3：定义统一保存请求契约

- 目标：
  1. 明确前端提交字段。
  2. 明确版本控制字段。
  3. 明确后端内部如何从请求识别变更语义。

### Step 4：后端先收口，再移除前端事务路由

- 目标：
  1. 先让后端单入口可正确裁决。
  2. 再把前端 save hook 收缩为单调用。
  3. 最后删除或降级 UI 层业务路由规则。

## 6. 涉及文件（预估）

前端侧可能涉及：

1. `sales-order-save-plan.ts`
2. `use-sales-order-save.ts`
3. `sales-order-action-dialog.tsx`
4. 相关 form hook / mutation hook 文件

后端侧可能涉及：

1. sales order routes / handlers
2. `server/services/sales_transaction_service.go`
3. 相关 patch/save/orchestration service 文件
4. 对应 handler/service 测试文件

文档侧：

1. `task.md`
2. `walkthrough.md`

## 7. 风险与注意事项

### 7.1 契约切换风险

如果前端当前已经深度依赖多条 mutation 的成功回包语义，本轮需要先确认新单入口的响应结构如何兼容，避免 UI 成功后状态刷新异常。

### 7.2 事务语义退化风险

如果实现方式不当，所谓“单一入口”可能退化成一个无法审计、无法细分约束的粗粒度保存接口。这是本轮必须避免的反模式。

### 7.3 版本治理风险

前端去路由器化后，仍必须保证后端对并发写的冲突判定不变；否则会把架构问题从“职责错位”变成“数据一致性退化”。

## 8. 批准后的最小验收标准

1. 前端保存链不再根据业务语义选择不同 mutation。
2. 后端存在单一销售订单保存入口，负责语义裁决与内部事务分派。
3. 客户变更、状态变更、行增删改与通用更新仍能正确处理。
4. `409/CONFLICT` 等版本冲突语义保持不变。
5. `walkthrough.md` 记录本轮契约调整、实现切口与验证结果。

---

# 客户/供应商列表统计下沉到后端 metadata/stats 实施计划

日期：2026-04-09  
状态：待批准

## 1. 目标

本轮目标不是优化前端“重计算”性能，而是把客户/供应商列表页头部统计卡片的事实来源收口到后端，避免未来在分页、权限过滤、软删除、默认筛选或数据隔离规则变化后出现静默失真。

本轮需要达成四个结果：

1. `customer` 列表接口返回列表数据时，同时返回 `metadata.stats`。
2. `supplier` 列表接口返回列表数据时，同时返回 `metadata.stats`。
3. 前端客户/供应商统计卡片只消费后端统计，不再基于当前取回的列表数据自行推导总盘子数字。
4. 为后续服务端分页与更严格的数据裁剪预留统一响应承载位，而不是到时再次破坏响应契约。

## 2. 当前已确认事实

### 2.1 客户统计卡片当前现状

当前 `customer-list.tsx` 中的“总数 / 活跃数 / 本月新增”来自前端对已获取客户列表再次过滤计数。

这意味着它现在隐式依赖一个前提：前端拿到的数据就是完整且未被裁剪的真实全集。

### 2.2 供应商统计卡片当前现状

当前 `supplier-list.tsx` 中的“总数 / 活跃数 / 审核中”同样来自前端对已获取供应商列表再次过滤计数。

它与客户页存在相同问题：当前实现不是绝对错误，但缺少可持续的权威口径保障。

### 2.3 当前实现的结构性风险

只要未来出现以下任一变化，前端卡片数字就可能悄悄偏离真实结果：

1. 列表切为服务端分页。
2. 接口增加权限过滤或部门数据隔离。
3. 后端对软删除、归档、冻结状态的默认排除口径发生变化。
4. 前端为了性能只请求局部列表或默认筛选后的结果集。

因此，本轮应该尽快把“统计属于谁裁决”这个问题收口到后端。

## 3. 核心设计原则

### 3.1 统计与列表必须同源

后端返回的 `stats` 必须与当前列表查询使用同一组过滤前提和同一事实源。

不能出现：

1. 列表按 A 条件查。
2. 统计按 B 条件单独算。

否则只是把问题从前端漂移转移成接口内部漂移。

### 3.2 响应结构要为后续分页预留位置

即使本轮接口尚未正式分页，也建议统一收口为：

1. `data`：当前列表记录。
2. `metadata.stats`：当前查询上下文下的统计。
3. `metadata.pagination`：分页信息承载位，可先按现状最小提供或暂留兼容结构。

这样后续如果进入服务端分页，不需要再次推翻页面消费方式。

### 3.3 前端不再保留兜底重算主链

前端头部卡片应以服务端返回为唯一主事实源。

若 `stats` 缺失，应显式暴露为接口契约缺口，而不是悄悄回退到本地重算，避免问题被掩盖。

## 4. 建议接口形态

### 4.1 客户列表示意

建议客户列表响应统一为如下语义结构：

1. `data`: 客户列表数组。
2. `metadata.stats.total`: 当前查询口径下客户总数。
3. `metadata.stats.active`: 当前查询口径下活跃客户数。
4. `metadata.stats.newThisMonth`: 当前查询口径下本月新增客户数。

### 4.2 供应商列表示意

建议供应商列表响应统一为如下语义结构：

1. `data`: 供应商列表数组。
2. `metadata.stats.total`: 当前查询口径下供应商总数。
3. `metadata.stats.active`: 当前查询口径下活跃供应商数。
4. `metadata.stats.pendingReview`: 当前查询口径下审核中供应商数。

### 4.3 统计口径说明

这里的“当前查询口径”指的是：

1. 与该列表接口当前实际应用的过滤条件一致。
2. 与该调用上下文可见的数据权限一致。
3. 与后端当前对软删除、归档、状态裁剪的默认规则一致。

也就是说，这些统计不是“当前页记录数”，而是“当前查询上下文下的后端权威统计”。

## 5. 建议实施顺序

### Step 1：盘点现有 customer / supplier 列表接口与前端消费点

- 目标：确认当前后端 handler/service/response DTO 与前端 service/hook/list 页面之间的真实契约。
- 重点文件：
  1. `customer-list.tsx`
  2. `supplier-list.tsx`
  3. 对应 front-end service / hook 文件
  4. 对应后端 routes / handlers / services 文件

### Step 2：后端补齐 `metadata.stats`

- 目标：让客户/供应商列表接口在返回列表数据时同时返回统计。
- 要求：
  1. 统计使用与列表一致的过滤上下文。
  2. 不新增第二条脱节的统计查询口径。
  3. 若客户与供应商存在共用列表响应封装，可优先抽成共享结构。

### Step 3：前端收口为只读后端统计

- 目标：移除客户/供应商头部卡片对本地列表数组的业务总数推导依赖。
- 要求：
  1. 页面改为消费 service 返回的 `metadata.stats`。
  2. 类型定义同步升级。
  3. 若接口异常缺少 `stats`，应显式进入缺失态，而不是继续本地猜测。

### Step 4：补最小验证

- 后端验证重点：
  1. 列表接口返回 `data + metadata.stats`。
  2. 统计字段与预期状态口径一致。
- 前端验证重点：
  1. 页面卡片读取后端响应字段。
  2. 不再依赖当前列表数组本地过滤得出总数卡片。

## 6. 涉及文件（预估）

前端侧可能涉及：

1. `customer-list.tsx`
2. `supplier-list.tsx`
3. 对应的 service 文件
4. 对应的 hook / query key / response type 文件

后端侧可能涉及：

1. customer 列表 route / handler / service / repository 相关文件
2. supplier 列表 route / handler / service / repository 相关文件
3. 若当前项目存在统一列表响应结构定义，需同步升级该结构

文档侧：

1. `task.md`
2. `walkthrough.md`

## 7. 风险与注意事项

### 7.1 统计口径分叉风险

如果 customer / supplier 的列表查询逻辑本身已经分散在多个 service 或 query helper 中，本轮最大的风险不是代码量，而是统计条件与列表条件不一致。

因此实施时必须先找到真正的单一列表查询入口，避免只在 handler 层临时拼一份统计逻辑。

### 7.2 响应契约兼容风险

如果当前前端大量地方直接假设接口返回就是数组，本轮需要谨慎确认 customer / supplier service 是否只被单一列表页消费。

若存在多个消费方，可能需要采用兼容式 service 封装，而不是直接粗暴改变所有调用方预期。

### 7.3 未来分页兼容风险

如果本轮只追加裸 `stats` 字段、不预留统一 `metadata` 承载位，那么后续上分页时仍会再次破坏契约。

因此建议本轮一次把承载结构收好。

## 8. 批准后的最小验收标准

1. 客户列表页统计卡片来自后端 `metadata.stats`。
2. 供应商列表页统计卡片来自后端 `metadata.stats`。
3. 前端不再通过当前已取回数组自行推导“总数 / 活跃 / 本月新增 / 审核中”作为主事实源。
4. 接口结构为后续分页演进保留统一 `metadata` 承载位。
5. `walkthrough.md` 记录本轮统计口径、涉及接口与验证结果。

---

## 以下为既有主计划（保留）

本轮不再并行推进多份相互重叠的 audit-engine 子方案，而是收敛为一份主计划，按依赖顺序分阶段实施。

核心目标只有四个：

1. 先把 `Trading` 做成真实可验证的审计接入样板。
2. 再把 audit-engine 从前端静态判断升级为后端真实统计驱动。
3. 然后在卡片中展示“为什么是 HEALTHY / ALERT / CRITICAL”。
4. 最后再扩面补齐 `Customer / Supplier / Employee / ProductionLine` 等真实入口。

## 2. 当前已确认事实

### 2.1 audit-engine 当前存在的主要问题

当前 `/system-management/audit-engine` 的问题不是“完全没有能力”，而是“能力已经部分存在，但缺少统一口径与清晰表达”：

1. 页面状态仍有明显前端静态派生痕迹。
2. 后端已经存在真实 `AuditLog` 写入，但前端入口覆盖并不完整。
3. 模块状态、实体状态、时间线入口状态之间还没有建立单一事实源。
4. 用户能看到结果，但很难知道原因，更不知道下一步该补哪里。

### 2.2 当前最成熟的样板是 Trading

目前最适合作为第一阶段样板的是 `Trading`，原因如下：

1. 已有前端 `AuditStamp` / `DataTimeline` 相关承载能力。
2. 销售单、采购单已有后端审计写入基础。
3. 问题点集中且明确，主要是 module 命名契约、时间线命中、入口统一。
4. 比起其他模块，Trading 更容易形成“真实入口 + 真实日志 + 看板反映”的闭环。

### 2.3 后续待补的真实入口对象

在样板之外，已确认后端存在审计写入、但前端真实入口仍不完整或未统一的对象至少包括：

1. `Customer`
2. `Supplier`
3. `Employee`
4. `ProductionLine`

其中前三类更适合优先纳入后续扩面；`ProductionLine` 是否纳入，要以页面是否存在稳定承载位为前提，不强行硬接。

## 3. 总体实施顺序

本计划按以下固定顺序推进：

1. `Phase 1`：Trading 样板接入收口
2. `Phase 2`：真实统计升级
3. `Phase 3`：卡片原因展示增强
4. `Phase 4`：真实入口扩面补齐

原则上不跳步。

原因是：

1. 如果没有样板闭环，后面的统计规则很容易失真。
2. 如果没有真实统计，卡片原因展示就会再次变成前端猜测。
3. 如果先扩面再收口底座，后续每个模块都会重复踩同样的问题。

## 4. Phase 1：Trading 样板接入收口

### 4.1 目标

把 `SalesOrder` 和 `PurchaseOrder` 打通为一条真实、稳定、可验证的审计链路：

1. 前端有统一入口。
2. 后端有真实日志。
3. `/audit/timeline` 能稳定命中。
4. audit-engine 能据此表达真实状态，而不是静态假象。

### 4.2 实施内容

1. 统一 Trading 相关审计 module 命名。
2. 收口 `AuditStamp`、`DataTimeline`、详情页入口使用的 module 值。
3. 对齐后端写入和前端查询使用的 canonical module。
4. 先打通 `SalesOrder`，再复制到 `PurchaseOrder`。
5. 明确 Trading 在 audit-engine 中的状态计算依据，不再直接依赖硬编码 `connected: true`。

### 4.3 文件级实施步骤

#### Step 1：锁定 Trading 的前端 canonical module 常量

- 文件：`src/features/audit-timeline/data/audit-modules.ts`
- 动作：
  1. 确认 `sales-order`、`purchase-order` 是 Trading 唯一允许使用的前端 module 值。
  2. 清理散落的手写字符串，统一改为消费 `AUDIT_MODULES.salesOrder`、`AUDIT_MODULES.purchaseOrder`。
- 目标：
  1. 前端不再混用 `SalesOrder`、`PurchaseOrder` 等别名。
  2. 所有 Trading 时间线入口都从同一常量源取值。

#### Step 2：收口销售单详情页审计入口

- 文件：`src/features/trading/components/parts/sales-order-detail-activity.tsx`
- 动作：
  1. 确认销售单详情活动区只通过 `AUDIT_MODULES.salesOrder` 打开时间线。
  2. 若存在其他销售单审计入口，统一到该 canonical 值。
- 目标：
  1. 销售单详情页所有时间线查询口径完全一致。

#### Step 3：收口采购单详情页审计入口

- 文件：`src/features/trading/components/purchase/purchase-order-detail.tsx`
- 动作：
  1. 确认采购单详情页 `AuditStamp` 只通过 `AUDIT_MODULES.purchaseOrder` 打开时间线。
  2. 若采购单还有其他侧栏、弹层或活动区入口，也统一到该 canonical 值。
- 目标：
  1. 采购单链路与销售单链路在前端语义和接入方式上保持对称。

#### Step 4：收紧通用审计组件的 module 类型

- 文件：`src/components/common/audit-stamp.tsx`
- 文件：`src/features/audit-timeline/components/data-timeline.tsx`
- 文件：`src/features/audit-timeline/hooks/use-audit-timeline.ts`
- 动作：
  1. 将 `module: string` 逐步收口为前端统一 audit module 类型。
  2. 保证审计组件不再作为任意字符串透传层。
- 目标：
  1. 后续业务页面不能再随意写入新的 module 字符串。
  2. Trading 样板形成“入口常量 -> 组件类型 -> 查询参数”同一口径。

#### Step 5：确认后端落库前统一 module 归一化

- 文件：`server/services/audit_service.go`
- 文件：`server/services/audit_modules.go`
- 动作：
  1. 确认 `defaultAuditLogger.Write()` 是 Trading 审计日志统一落库入口。
  2. 确认所有写入在落库前都会经过 `normalizeAuditModule()` 归一。
- 目标：
  1. 数据库存量和新增数据最终都沉淀到 canonical module。
  2. 后续统计不再依赖多套 module 名称并行存在。

#### Step 6：核对销售/采购事务服务的写入路径

- 文件：`server/services/sales_transaction_service.go`
- 文件：`server/services/purchase_transaction_service.go`
- 动作：
  1. 逐处检查 `AuditEntry{ Module: ... }` 的传值。
  2. 明确哪些仍是兼容输入，哪些已经使用 canonical 值。
- 目标：
  1. 业务层可兼容旧值，但最终输出口径统一。
  2. 为后续彻底去别名做好准备。

#### Step 7：保留 timeline alias 查询，但明确其职责是历史兼容

- 文件：`server/handlers/audit_handlers.go`
- 文件：`server/services/audit_modules.go`
- 动作：
  1. 保留 `ExpandAuditModuleAliasesForQuery()` 的兼容能力。
  2. 在实现和文档中明确：alias 查询只用于历史数据兼容，不是长期主路径。
- 目标：
  1. Phase 1 结束后，新链路不依赖 alias 才能命中。
  2. 历史日志仍可被现有时间线查询命中。

#### Step 8：补最小闭环验证

- 前端重点文件：
  1. `src/components/common/audit-stamp.tsx`
  2. `src/features/audit-timeline/hooks/use-audit-timeline.ts`
- 后端重点文件：
  1. `server/handlers/audit_handlers.go`
  2. `server/services/audit_modules.go`
  3. Trading 相关 transaction service test 文件
- 动作：
  1. 覆盖 canonical module 查询命中 canonical 日志。
  2. 覆盖 canonical module 查询命中历史 alias 日志。
  3. 覆盖销售单、采购单详情页入口传值正确。
- 目标：
  1. Trading 样板具备可回归、可验证的闭环。

#### Step 9：将收口结果记录进 walkthrough

- 文件：`walkthrough.md`
- 动作：
  1. 记录 Trading canonical module 最终定义。
  2. 记录销售单、采购单真实入口位置。
  3. 记录 alias 兼容策略和后续清理方向。
- 目标：
  1. 为 Phase 2 的真实统计升级提供清晰输入。

### 4.4 涉及文件

- `src/features/audit-timeline/components/data-timeline.tsx`
- `src/features/audit-timeline/hooks/use-audit-timeline.ts`
- `src/features/audit-timeline/data/audit-modules.ts`
- `src/components/common/audit-stamp.tsx`
- `src/features/trading/components/parts/sales-order-detail-activity.tsx`
- `src/features/trading/components/purchase/purchase-order-detail.tsx`
- `server/handlers/audit_handlers.go`
- `server/services/audit_service.go`
- `server/services/audit_modules.go`
- `server/services/sales_transaction_service.go`
- `server/services/purchase_transaction_service.go`
- `walkthrough.md`

### 4.5 验收标准

1. 销售单详情页能打开真实时间线。
2. 采购单详情页能打开真实时间线。
3. 前后端不再出现 `sales-order` / `SalesOrder` 这类漂移。
4. Trading 的状态能由真实链路支撑。

## 5. Phase 2：真实统计升级

### 5.1 目标

将 audit-engine 从“前端静态模块数组派生”升级为“后端真实统计结果驱动”。

### 5.2 统一统计口径

建议建立一套统一统计模型，至少包含：

1. `targetEntities`
2. `loggedEntities`
3. `entryEntities`
4. `connectedEntities`
5. `logCoverage`
6. `entryCoverage`
7. `status`
8. `lastEvent`

其中：

1. `loggedEntities` 表示已有真实日志的实体集合。
2. `entryEntities` 表示已有真实时间线入口的实体集合。
3. `connectedEntities` 表示同时具备日志和入口的实体集合。

### 5.3 实施内容

1. 建立实体到业务模块的统一映射。
2. 建立后端 audit-engine 聚合服务或聚合统计函数。
3. 提供 audit-engine 专用 stats 接口，作为页面唯一数据源。
4. 替换前端原有静态 `MODULES` 推导逻辑。

### 5.4 涉及文件

- `src/features/audit-timeline/components/audit-engine-tab.tsx`
- `src/features/audit-timeline/hooks/use-audit-timeline.ts`
- `src/features/audit-timeline/data/audit-modules.ts`
- `server/handlers/audit_handlers.go`
- `server/services/audit_modules.go`
- 如有需要，新增 audit-engine 聚合 service

### 5.5 验收标准

1. audit-engine 页面数字来自后端 stats，而不是前端静态数组。
2. 模块状态能同时反映“有日志”和“有入口”两个维度。
3. 实体到模块的映射集中维护，不再散落多处。

## 6. Phase 3：卡片原因展示增强

### 6.1 目标

让模块卡片不仅告诉用户“结果是什么”，还告诉用户“为什么是这个结果”。

### 6.2 展示原则

原因展示属于展示层增强，不重新发明统计逻辑，必须严格消费 Phase 2 的真实 stats。

建议最小展示分组：

1. `已闭环实体`
2. `只有日志`
3. `已有入口`

对应关系：

1. `已闭环实体` = `connectedEntities`
2. `只有日志` = `loggedEntities - connectedEntities`
3. `已有入口` = `entryEntities - connectedEntities`

### 6.3 交互要求

1. 卡片保持紧凑，不变成详情页。
2. 每组只展示少量代表项，可控制数量。
3. 空分组不展示。
4. `HEALTHY` 优先强调已闭环实体。
5. `ALERT` 优先强调缺口原因。
6. `CRITICAL` 保持简洁，避免噪音堆叠。

### 6.4 涉及文件

- `src/features/audit-timeline/components/audit-engine-tab.tsx`
- 如有需要，新增 audit-engine 展示辅助函数文件
- `walkthrough.md`

### 6.5 验收标准

1. `ALERT` 模块能明确展示缺口来自“只有日志”还是“已有入口”。
2. `HEALTHY` 模块能展示已闭环实体。
3. 原因展示完全基于后端真实统计结果。

## 7. Phase 4：真实入口扩面补齐

### 7.1 目标

在已有底座和展示稳定后，再扩面补齐更多真实审计入口。

优先顺序建议为：

1. `Customer`
2. `Supplier`
3. `Employee`
4. `ProductionLine`（条件成立才纳入）

### 7.2 纳入原则

只有满足以下条件的页面，才进入本阶段：

1. 已有稳定详情区、侧栏、弹层或信息卡承载位。
2. 已有或可稳定获取 `createdAt / updatedAt / createdBy / updatedBy` 等元数据。
3. 接入 `AuditStamp` 不会破坏页面语义或布局。

### 7.3 对 `ProductionLine` 的特别要求

`ProductionLine` 不强制本轮纳入。

只有在确认存在自然承载位时才接入；如果当前页面主要是高交互配置器、缺少稳定详情位，则明确记录“本轮暂缓”，而不是硬塞入口。

### 7.4 涉及文件

- `src/features/trading/components/customer-*`
- `src/features/purchase/**/*supplier*.tsx`
- `src/features/org-personnel/tabs/employee-mgmt.tsx` 或相关员工详情承载文件
- `src/features/production-shared/**/*line*`
- `src/components/common/audit-stamp.tsx`
- `src/features/audit-timeline/data/audit-modules.ts`
- `walkthrough.md`

### 7.5 验收标准

1. `Customer / Supplier / Employee` 至少优先对象能打开真实时间线。
2. 新入口使用的 module 与后端 canonical module 保持一致。
3. 扩面后 audit-engine 的 `entryCoverage` 能真实提升。
4. 若 `ProductionLine` 暂缓，必须明确写明暂缓原因。

## 8. 范围边界

本轮明确不做以下事项：

1. 不把 audit-engine 扩展成完整 BI 或审计分析平台。
2. 不引入第二套时间线体系或第二套 audit 组件。
3. 不在没有承载位的页面上硬塞入口。
4. 不在批准前直接改动大范围业务页面。
5. 不继续保留“看似权威、实则静态”的状态表达。

## 9. 风险与待确认项

### 9.1 统计与归属风险

1. `Employee`、`ProductionLine` 这类实体的业务模块归属可能存在语义争议。
2. 如实体到模块映射分散维护，后续仍会继续漂移。

### 9.2 命名与兼容风险

1. 若直接修改后端 `AuditLog.Module` 写入口径，需要确认是否影响历史数据查询。
2. 若短期兼容旧值与新值，必须控制兼容期限，避免长期双口径。

### 9.3 UI 承载风险

1. 某些页面虽然有列表，但没有适合承载 `AuditStamp` 的位置。
2. 某些页面模型未完整携带审计元数据，可能需要先补基础字段。

### 9.4 展示密度风险

1. 若卡片原因展示实体过多，卡片高度会失控。
2. 若没有显示优先级，`HEALTHY / ALERT / CRITICAL` 语义会被噪音稀释。

## 10. 推荐执行决策

如果只批准一个主方向，建议批准以下顺序：

1. 先执行 `Phase 1` 和 `Phase 2`
2. 验证真实链路和真实统计稳定
3. 再执行 `Phase 3`
4. 最后按优先级进入 `Phase 4`

这也是当前最安全、最容易收口、最不容易返工的路线。

## 11. 完成后统一验收口径

整轮完成后至少应满足：

1. Trading 成为真实可验证的审计接入样板。
2. audit-engine 模块状态由后端真实统计驱动。
3. 模块卡片能解释状态成因，而不是只给结果。
4. `Customer / Supplier / Employee` 至少优先对象具备真实时间线入口。
5. `pnpm exec tsc --noEmit` 与必要的 Go 验证通过。
6. `walkthrough.md` 明确记录本轮范围、结果、暂缓项与原因。
