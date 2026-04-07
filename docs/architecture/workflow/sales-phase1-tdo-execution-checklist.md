# `sales` 第一阶段 TDO 化可执行实施清单

## 一、清单目标

本文档将 `sales` 第一阶段 TDO 化方案压缩为一份可执行实施清单，用于在进入代码改造前完成最终审批。

本文档只回答三类问题：

1. 实施顺序是什么；
2. 每个阶段要动哪些文件；
3. 每个阶段完成后要验证什么。

本文档不是代码 diff，也不是最终实施记录。

---

## 二、适用范围

本清单只适用于 `sales` 第一阶段改造，范围严格限制在以下目标：

1. 为 `claim` 建立语义事务入口；
2. 让前端 `claim` 从 patch 驱动迁移到 transaction 驱动；
3. 开始收口 `claim` 相关业务副作用；
4. 为第二阶段状态推进事务化打基础。

本清单不覆盖：

1. `purchase` 实施；
2. `inventory` 实施；
3. `workflow-core` 重构；
4. 全量 `sales` 重写；
5. 所有通知与规则体系重做。

---

## 三、实施前不变量

进入代码改造前，必须保持以下不变量：

1. 现有 `PATCH /sales-orders/:id` 能力先保留，不作为本阶段删除目标；
2. 现有列表与详情读链不重做；
3. 第一阶段只把 `claim` 作为样板事务动作；
4. 任何新事务能力都不得继续塞回旧的混合 service 结构中；
5. 未经用户批准，不进入业务代码修改。

---

## 四、Phase 1：建立事务入口协议

## 目标

建立一条最小可运行的 `sales` 语义事务入口，只先支持 `ORDER_LINE_CLAIM`。

## 涉及文件

### 后端新增/改造

1. `server/handlers/sales_transaction_handlers.go`（建议新增）
2. `server/services/sales_transaction_service.go`（建议新增）
3. `server/routes` 下 `sales` 相关路由注册文件
4. 视实现需要，补充 `server/services` 下的事务审计辅助能力

### 前端暂不切换调用方

这一阶段前端可以暂时不改页面调用，只先把后端事务入口与协议准备好。

## 预期结果

1. 后端新增统一 transaction endpoint；
2. endpoint 能识别 `ORDER_LINE_CLAIM`；
3. 请求体至少包含：
   - `intent`
   - `aggregateId`
   - `actorId` 或等价操作者信息
   - `expectedVersion`
   - `payload.lineNos`
4. 后端可在事务服务层内完成基础校验与数据修改。

## 风险点

1. 事务入口若仍依赖字段 patch 语义，第一阶段价值会明显下降；
2. 若并发版本不纳入协议，后续冲突处理会继续脆弱；
3. 若把领域逻辑直接塞入 `workflow_service.go`，会污染 workflow 基础设施边界。

## 验证口径

1. 新 transaction endpoint 已存在；
2. `ORDER_LINE_CLAIM` 可被正确识别；
3. 后端编译通过；
4. 对应最小 handler / service 测试可补齐。

---

## 五、Phase 2：前端 `claim` 迁移到 transaction 链

## 目标

让前端 `claim` 不再通过“先读订单 + 拼 `lines` + patch”实现，而是直接提交语义事务。

## 涉及文件

### 前端优先改造

1. `src/features/trading/sales/services/sales-service.ts`
2. `src/features/trading/sales/hooks/use-sales.ts`
3. `src/features/trading/components/sales-order-detail.tsx`

### 前端建议新增

1. `src/features/trading/sales/services/sales-transaction-service.ts`
2. `src/features/trading/sales/hooks/use-sales-transactions.ts`
3. 必要时新增 query / transaction 分层文件

## 预期结果

1. 页面触发 `claim` 时不再调用旧 `claimOrderLine()` 拼 `nextLines`；
2. 前端 mutation 改为调用 transaction service；
3. UI 层只提交：
   - `orderId`
   - `lineNos`
   - `operator`
   - `expectedVersion`
4. `SalesOrderDetail.tsx` 不再承担 `claim` 的字段级变更拼装职责。

## 风险点

1. 旧 `claimOrderLine()` 若继续留作正式入口，会导致新旧双轨长期并存；
2. 若 query / transaction 职责不拆，旧 `sales-service.ts` 会继续膨胀；
3. 若页面仍直接依赖旧 mutation 名称与返回结构，迁移时容易出现局部耦合残留。

## 验证口径

1. 单行认领调用已走 transaction 链；
2. 按型号批量认领调用已走 transaction 链；
3. 页面认领后详情回显正常；
4. 查询缓存失效与刷新正常；
5. `pnpm exec tsc --noEmit` 通过。

---

## 六、Phase 3：副作用收口与最小审计落位

## 目标

把 `claim` 对应的关键业务副作用开始从前端移出，并在后端落下最小事务审计锚点。

## 涉及文件

### 前端优先检查

1. `src/features/trading/sales/hooks/use-sales.ts`
2. `src/features/trading/sales/services/sales-service.ts`

### 后端优先补齐

1. `server/services/sales_transaction_service.go`
2. `server/services` 下的审计记录能力
3. 视实现需要，补充 workflow 编排接点

## 预期结果

1. `claim` 的关键业务副作用不再通过前端手工派发；
2. 前端保留的副作用仅限：
   - toast
   - invalidateQueries
3. 后端事务服务至少记录一次显式事务审计；
4. 后端为后续 workflow / 规则扩展保留稳定挂点。

## 风险点

1. 若只迁移主调用链，不处理副作用，第一阶段会留下明显半成品；
2. 若审计仍只记录字段变化而不记录事务意图，TDO 价值会被削弱；
3. 若前端仍继续保留业务通知派发，后续规则层会再次分裂。

## 验证口径

1. 前端不再负责 `claim` 业务派发；
2. 后端存在最小事务审计记录；
3. 事务成功后 UI 反馈不退化；
4. 目标文件编译通过。

---

## 七、Phase 4：验证、兼容与回退口径

## 目标

确保第一阶段改造可上线验证，同时保留必要兼容与回退能力。

## 兼容要求

1. 普通 `patch` 编辑链在本阶段仍可使用；
2. 列表与详情查询链不应被重做；
3. 非 `claim` 事务动作暂不强制切到 transaction。

## 回退口径

若第一阶段实施中出现问题：

1. 可以临时把 `claim` 前端调用回退到旧 patch 链；
2. 不回退 query / transaction 分层方向；
3. 不把新 transaction 逻辑重新塞回旧混合 service；
4. 不删除新 transaction endpoint，只允许短期停用调用方切换。

## 总体验证口径

### 功能

1. 单行认领正常；
2. 批量认领正常；
3. 详情回显正常；
4. 缓存刷新正常。

### 并发

1. 带版本冲突可识别；
2. 冲突返回口径可解释；
3. 不再依赖前端先读后拼字段的旧方式。

### 结构

1. `claim` 已从 patch 驱动迁移到 transaction 驱动；
2. 前端查询与事务职责开始分离；
3. 关键业务副作用已开始收口到后端。

### 最小技术验证

建议后续正式实施时至少覆盖：

```bash
pnpm exec tsc --noEmit
```

以及后端对应的 handler / service 测试。

---

## 八、待用户批准后执行的事项

以下事项在你明确批准前，**不得开始**：

1. 新增 `sales` transaction endpoint 的业务实现；
2. 修改前端 `claim` 调用链；
3. 调整 `use-sales.ts` / `sales-service.ts` 职责边界；
4. 新增事务审计落库或相关后端逻辑；
5. 任何影响现有 `sales` 业务行为的代码变更。

---

## 九、批准后的默认执行顺序

如果你确认按本清单进入代码改造，默认顺序建议为：

1. 先做后端 transaction endpoint + service 骨架；
2. 再做前端 `claim` 调用链切换；
3. 再做副作用收口与最小审计落位；
4. 最后做验证与必要回退。

这个顺序的目的，是先把事务能力建立起来，再切前端入口，避免前端先改而后端语义入口未稳定。
