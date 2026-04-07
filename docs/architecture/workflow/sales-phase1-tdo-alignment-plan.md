# `sales` 第一阶段 TDO 化改造方案

## 一、文档目标

本文档用于定义 `sales` 域在当前架构下的第一阶段 TDO 化改造方案。

本文档只回答三个问题：

1. 为什么 `sales` 应该成为第一批 TDO 化样板域；
2. 第一阶段到底改什么、不改什么；
3. 如何在不直接重写整条销售链的前提下，把 `sales` 从“字段 patch 驱动”推进到“语义事务入口驱动”。

本文档是方案稿，不是代码实施稿。

---

## 二、当前 `sales` 域断点回顾

基于已完成的现状拓扑分析，当前 `sales` 域处于“具备基础，但尚未收敛”的状态。

### 1. 已有基础

当前已具备：

1. 前端 `delta` 传输能力；
2. `trackDelta(...)` 差量跟踪方式；
3. 后端 `PATCH /sales-orders/:id` 差量消费能力；
4. 销售单创建时自动创建 workflow instance；
5. 销售单与 `workflow_instance_id` 的持久化关联。

### 2. 当前关键断点

当前最大的问题不是“没有 workflow”，而是“workflow 还没有真正接管关键业务动作”。

已确认断点如下：

1. `claim` 仍是“前端先读订单 -> 本地拼 nextLines -> 再 patch 回去”；
2. 状态推进仍主要通过字段更新而不是事务语义表达；
3. 部分通知与归档副作用仍留在前端 Hook / Service；
4. 后端 `PatchSalesOrderHandler` 仍是通用字段解释器，而不是语义事务入口；
5. 审计天然产物仍然不足，更多记录的是字段变化，而不是“发生了什么业务事务”。

### 3. 当前真实风险

如果继续沿用当前方式，风险会持续扩大：

1. 多人并发认领时，前端先读后改的窗口会持续存在；
2. 审计只能看到字段变更，难以天然表达“认领”“推进”“取消”等事务语义；
3. 规则、通知、下游任务与事务之间仍然依赖松散耦合；
4. 未来做补偿、回放、PDA 并发修复时，缺少统一事务载体。

---

## 三、为什么第一阶段先从 `sales` 下手

`sales` 不是系统里事务最重的域，但它是当前最适合做第一阶段样板的域。

### 1. 相比 `inventory`，风险更可控

`inventory` 已经牵涉：

1. 锁；
2. 库存数量与成本；
3. 凭证；
4. 回滚；
5. 采购与销售联动；
6. 审批 token；
7. 冲突控制。

如果第一刀直接切 `inventory`，很容易把“事务协议还没跑通”和“核心链路过于复杂”两个问题叠在一起。

而 `sales` 更适合先做：

1. 边界更清晰；
2. 关键动作离散度更高；
3. 更容易提炼出一套可复制的 TDO 样板。

### 2. 相比 `purchase`，`sales` 的语义动作更适合作为第一批样板

`sales` 当前最适合抽象的动作包括：

1. 认领；
2. 状态推进；
3. 取消；
4. 改单。

其中认领动作尤其适合做第一批样板，因为它同时具备：

1. 语义非常明确；
2. 并发敏感；
3. 现在的实现方式存在明显断点；
4. 做成功后可以直接复用到其他事务动作。

### 3. `sales` 当前已经有 workflow 入口，但尚未完全接管后续事务

这意味着 `sales` 最适合做的不是“从零搭建”，而是“把已有的半成品链路真正收敛”。

---

## 四、第一阶段总体目标

第一阶段不追求一次性把 `sales` 全量改造成终局架构。

第一阶段的目标只有四个：

1. 为 `sales` 建立一条真正的语义事务入口；
2. 用一个样板动作验证 `TDO + Workflow + Delta` 可以协同工作；
3. 把最关键的前端业务副作用从 Hook 中移出；
4. 为第二阶段状态推进与更多事务动作铺路。

### 第一阶段完成后的理想状态

第一阶段完成后，`sales` 至少应达到：

1. 前端不再通过“拼字段变化”表达认领；
2. 前端改为表达“我要执行什么事务”；
3. 后端明确理解这是一个 `claim` 事务，而不是普通 `patch`；
4. workflow 与审计开始有机会围绕事务语义而不是字段变化运转；
5. 原有 `patch` 能力可暂时保留用于兼容普通编辑，但不再作为关键动作的唯一入口。

---

## 五、第一阶段明确不做

为了控制风险，第一阶段明确不做以下事项：

### 1. 不全量重写 `sales` 域

不在本阶段一次性改造：

1. 全部 CRUD；
2. 所有状态机；
3. 所有通知；
4. 所有下游联动；
5. 所有报表读口径。

### 2. 不把 `purchase / inventory` 一起拉进来同步实施

第一阶段只输出 `sales` 的样板方案，不同步推进其他域。

### 3. 不先重构 `workflow-core`

第一阶段不先把 `workflow-core` 改造成统一运行时，而是优先让 `sales` 跑出真实样板后，再决定如何抽象上浮。

### 4. 不删除现有 `PATCH` 能力

第一阶段可以保留现有 `patch` 能力作为：

1. 普通编辑兼容入口；
2. 渐进迁移期间的过渡能力；
3. 对照组与回退手段。

---

## 六、第一阶段样板动作选择

第一阶段建议优先选择：

## 样板动作 A：`ORDER_LINE_CLAIM`

这是第一阶段最优先动作。

### 选择理由

1. 业务语义明确；
2. 当前实现方式最典型地暴露“前端拼字段”的问题；
3. 并发敏感，能体现事务语义与版本控制的价值；
4. 非常适合沉淀审计；
5. 能为后续 PDA、多操作者场景打基础。

### 当前实现方式

当前链路是：

```text
handleClaimLine / handleClaimModel
  -> claimMutation
    -> claimOrderLine()
      -> getSalesOrderById()
      -> 前端改 lines
      -> patchSalesOrder()
```

### 第一阶段目标实现方式

目标链路应变成：

```text
handleClaimLine / handleClaimModel
  -> claimTransactionMutation
    -> sales transaction service
      -> POST sales transaction endpoint
        -> 后端识别 ORDER_LINE_CLAIM
          -> 执行业务校验
          -> 更新数据
          -> 写入事务审计
          -> 触发 workflow / 后置动作
```

---

## 七、第一阶段建议分层

第一阶段不建议继续把新能力堆进现有 `use-sales.ts` 和 `sales-service.ts`。

建议按“查询”和“事务”拆层。

### 1. 前端建议分层

建议形成如下形态：

```text
src/features/trading/sales/
  data/
  hooks/
    use-sales-queries.ts
    use-sales-transactions.ts
  services/
    sales-query-service.ts
    sales-transaction-service.ts
  mappers/
  index.ts
```

### 2. 分层职责

#### `sales-query-service.ts`

只负责：

1. 获取列表；
2. 获取详情；
3. 获取按单号查询结果。

不得负责：

1. toast；
2. 通知派发；
3. 业务事务拼装；
4. store 副作用。

#### `sales-transaction-service.ts`

只负责：

1. 发起语义事务请求；
2. 提交事务 payload；
3. 对事务响应做最小 guard。

#### `use-sales-transactions.ts`

负责：

1. mutation 包装；
2. query invalidate；
3. 最小 UI 提示。

不得负责：

1. 业务通知规则；
2. 业务链路派发；
3. 用字段拼装事务结果。

### 3. 为什么第一阶段就要拆查询与事务

因为如果第一阶段仍然把事务能力继续塞在旧 `sales-service.ts` 内部，最终只会得到：

1. 查询；
2. patch；
3. 事务；
4. 通知；
5. 兼容逻辑；
6. 历史副作用；

全部继续堆叠在一个文件中。

这会直接破坏第一阶段方案的可复制性。

---

## 八、TDO 载体建议

第一阶段不要求一次性定义出终局版全域 TDO 协议，但必须先有一版 `sales` 可落地的事务载体。

### 1. 第一阶段建议最小事务结构

建议至少具备以下信息：

1. `intent`
2. `aggregate`
3. `aggregateId`
4. `actorId`
5. `expectedVersion`
6. `payload`
7. `metadata`
8. 可选 `delta`

### 2. 第一阶段在 `claim` 场景中的表达重点

对于 `ORDER_LINE_CLAIM`，第一阶段建议：

1. 以 `payload` 作为主语义；
2. `payload` 中至少包含：
   - `lineNos`
   - `operator`
3. `expectedVersion` 用于并发保护；
4. `delta` 如需要，可作为附加调试/审计材料，而不是主事务定义。

### 3. 为什么第一阶段不建议继续以 `delta` 作为唯一主语义

因为 `delta` 只能说明“什么字段改了”，但无法天然说明：

1. 为什么要改；
2. 这是认领、推进、取消还是其他事务；
3. 哪些规则与通知应该挂在这次动作上。

第一阶段必须先把“事务意图”抬出来。

---

## 九、后端第一阶段建议落点

第一阶段不建议把所有新语义继续挤进 `PatchSalesOrderHandler`。

### 1. 保留现有 handler 的职责

现有：

1. `SaveSalesOrderHandler`
2. `PatchSalesOrderHandler`
3. `DeleteSalesOrderHandler`

可继续保留，作为：

1. 当前兼容链路；
2. 普通编辑入口；
3. 渐进迁移期的过渡层。

### 2. 第一阶段新增语义事务入口

建议为 `sales` 增加独立事务入口，例如统一形态：

```text
POST /sales-orders/:id/transactions
```

第一阶段只先支持：

1. `ORDER_LINE_CLAIM`

### 3. 第一阶段新增后端服务层

建议新增独立的事务服务层，例如：

1. `sales_transaction_service.go`
2. `sales_transaction_handler.go`

职责划分建议：

#### handler

1. 绑定请求；
2. 校验基础参数；
3. 路由到具体事务处理逻辑；
4. 返回标准响应。

#### service

1. 理解业务语义；
2. 校验当前状态与并发版本；
3. 完成数据变更；
4. 记录事务审计；
5. 调用 workflow / 后置动作。

### 4. 为什么第一阶段不建议直接把事务逻辑塞进 `workflow_service.go`

因为 `workflow_service.go` 当前更像：

1. 流程实例与任务推进基础设施；
2. 工作流定义解析层；
3. 审批流基础能力。

它不应该在第一阶段直接吸收 `sales` 领域明细字段语义。

更合理的方式是：

1. `sales_transaction_service` 理解 `claim`；
2. `workflow_service` 提供流程编排基础能力；
3. 两者通过清晰接口协作。

---

## 十、第一阶段副作用收口策略

第一阶段一个非常重要的目标，是开始把业务副作用从前端移出。

### 1. 当前需要重点关注的前端副作用

已识别的典型项包括：

1. `NotificationService.dispatch(...)`
2. `useNotificationStore.getState().archiveByOrderId(id)`
3. `toast.success(...)` 之外的业务性动作

### 2. 第一阶段建议处理原则

#### 可以保留在前端的

1. toast 成功提示；
2. toast 失败提示；
3. query invalidate；
4. 最小交互反馈。

#### 不应继续留在前端的

1. 业务通知生成；
2. 订单生命周期归档判定；
3. 依赖业务语义的派发规则；
4. 应由事务结果驱动的后续动作。

### 3. 第一阶段对 `claim` 的副作用处理建议

对于 `claim`，第一阶段建议：

1. 前端只负责提交 `claim` 事务；
2. 前端只做最小提示与缓存失效；
3. 若需要挂接通知，应优先由后端事务完成后触发；
4. 若当前后端通知基础尚未准备好，可先把“移出前端”作为明确收口方向，而不是继续往 Hook 加新逻辑。

---

## 十一、第一阶段拟改文件范围

本阶段方案文档建议覆盖但不实施的文件范围如下。

### 1. 前端优先涉及

1. `src/features/trading/sales/hooks/use-sales.ts`
2. `src/features/trading/sales/services/sales-service.ts`
3. `src/features/trading/components/sales-order-detail.tsx`
4. `src/features/trading/sales/index.ts`

### 2. 前端建议新增

建议后续实施时新增：

1. `src/features/trading/sales/hooks/use-sales-transactions.ts`
2. `src/features/trading/sales/hooks/use-sales-queries.ts`
3. `src/features/trading/sales/services/sales-query-service.ts`
4. `src/features/trading/sales/services/sales-transaction-service.ts`
5. `src/features/trading/sales/mappers/` 下的事务 payload mapper 或 DTO mapper

### 3. 后端优先涉及

1. `server/handlers/sales_orders.go`
2. `server/services/workflow_service.go`
3. 现有 `sales` 相关 service / mapper / model 文件

### 4. 后端建议新增

建议后续实施时新增：

1. `server/handlers/sales_transaction_handlers.go`
2. `server/services/sales_transaction_service.go`
3. `server/services/sales_transaction_audit_service.go` 或等价能力
4. 对应测试文件

---

## 十二、第一阶段实施顺序建议

### Phase A：先建立事务入口与最小协议

目标：

1. 定义 `ORDER_LINE_CLAIM` 请求协议；
2. 新增后端事务 handler 与 service 骨架；
3. 保留现有 `patch` 作为兼容入口。

### Phase B：前端 `claim` 从 patch 迁移到 transaction

目标：

1. 将 `claimMutation` 从“字段 patch”切换为“语义事务提交”；
2. 让 `SalesOrderDetail.tsx` 不再负责拼接 `nextLines`；
3. 最小化保留 UI 层交互与反馈。

### Phase C：副作用收口与审计落位

目标：

1. 从前端移出 `claim` 相关业务副作用；
2. 让后端事务服务具备最小审计记录能力；
3. 为 workflow 与后续规则接入预留稳定锚点。

### Phase D：验证与兼容回归

目标：

1. 验证新事务入口可用；
2. 确认现有 `patch` 编辑链仍可作为兼容路径存在；
3. 验证 `claim` 的读写、并发、回显与缓存刷新不退化。

---

## 十三、风险点与回退口径

### 1. 风险点一：事务入口与旧 patch 双轨并存期间的语义漂移

如果 `claim` 已切到 transaction，而其他动作仍走 patch，容易导致：

1. 调用方理解不一致；
2. 新旧入口命名混乱；
3. 后续开发者继续把关键动作写回 patch。

#### 对策

1. 在第一阶段明确把 `claim` 标记为样板事务；
2. 在文档与公开 API 命名上区分“查询 / patch / transaction”；
3. 避免继续往旧 `claimOrderLine()` 叠逻辑。

### 2. 风险点二：并发与版本校验处理不完整

如果只改接口名字，不把 `expectedVersion` 与后端版本校验纳入事务层，第一阶段会失去关键价值。

#### 对策

1. 第一阶段就要求事务入口带版本；
2. 后端事务服务必须显式检查并发版本；
3. 冲突返回口径需与现有版本冲突行为保持一致或可解释升级。

### 3. 风险点三：副作用只搬了一半

如果前端 `NotificationService.dispatch(...)` 没有同步处理，第一阶段可能得到一条“看似语义化，但副作用仍散落”的半成品链。

#### 对策

1. 第一阶段至少把 `claim` 对应副作用收口作为明确目标；
2. 即便后端规则层尚未完善，也不应继续在前端扩散新业务派发逻辑。

### 4. 回退口径

若第一阶段实施后出现问题，回退原则应为：

1. 可以暂时回退 `claim` 调用路径到旧 patch 方式；
2. 不回退目录级拆分与 query / transaction 分层方向；
3. 不把新事务逻辑重新塞回旧 `sales-service.ts` 成为更大的混合文件。

---

## 十四、验证口径

第一阶段后续正式实施时，建议至少验证以下内容。

### 1. 功能验证

1. 单行认领可成功执行；
2. 按型号批量认领可成功执行；
3. 成功后订单详情回显正确；
4. 列表与详情缓存刷新正常。

### 2. 并发验证

1. 带版本的事务入口能够识别冲突；
2. 多操作者竞争认领时不再依赖前端先读后拼字段；
3. 冲突提示与旧版本冲突口径一致或更清晰。

### 3. 结构验证

1. `claim` 不再通过前端拼接 `lines` 后调用 `patchSalesOrder()`；
2. 前端查询层与事务层开始分离；
3. `claim` 的关键业务副作用不再停留在前端 Hook 内。

### 4. 最小技术验证

建议后续正式实施时至少覆盖：

```bash
pnpm exec tsc --noEmit
```

以及后端对应测试。

---

## 十五、第一阶段完成后的预期收益

第一阶段如果按方案完成，收益将不是“多了一个接口”这么简单，而是为后续收敛打下四个非常关键的基础：

1. 系统开始从“字段变化驱动”转向“事务意图驱动”；
2. 审计开始有机会围绕事务语义组织；
3. workflow 与领域服务之间开始形成清晰编排关系；
4. `purchase` 与后续域可以复制这套样板，而不是重复从头试错。

---

## 十六、后续阶段预留

本文档只定义第一阶段，但为了后续持续演进，需要预留后续阶段方向。

### 第二阶段候选

1. `ORDER_STATUS_TRANSITION` 事务化；
2. 改单事务化；
3. 取消事务化；
4. 更完整的事务审计结构；
5. 与 workflow 规则、通知规则的更深层联动。

### 第三阶段候选

1. 与 `purchase` 复用统一事务协议；
2. 上浮 transaction / orchestrator 通用层；
3. 评估 `workflow-core` 的最终边界；
4. 将事务语义扩展到更多跨域场景。
