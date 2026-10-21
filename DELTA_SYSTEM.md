# XDFC 响应式差量更新系统 (SDRTS) 设计规范

> **复核日期**: 2026-10-20
> **状态**: 记录当前差量基础设施与接入约束；业务状态、并发规则及审批以各领域后端契约为准。

## 1. 核心哲学 (Core Philosophy)

### 1.1 告别“补丁式”更新

传统的局部更新（Partial Update）通常依赖于开发者手动构建 `updates` 对象。这种方式在面对深层嵌套数据（如：设备维保配置、生产拓扑节点）时极其低效且容易出错。

### 1.2 响应式追踪 (Reactive Tracking)

本系统采用 **JavaScript Proxy** 对原始领域模型（Domain Model）进行深度包装。系统会自动捕获用户在 UI 上的所有微小改动，并在提交阶段自动生成一份**结构化、扁平化**的差量集（Delta Set）。

---

## 2. 差量载荷协议 (Structured Delta Protocol)

为了确保后端能够以极低成本解析变更并生成审计日志，我们统一采用 **扁平路径（Flat Path）** 载荷格式。

### 2.1 载荷结构示例

假设用户在一个复杂的“模具资产”对象中修改了维保周期的限制值。

**原始对象:**

```json
{
  "id": "mold_001",
  "name": "压铸模 A",
  "config": {
    "maintenance": { "limit": 3000, "unit": "CYCLES" }
  }
}
```

**用户操作:** `draft.config.maintenance.limit = 5000`

**生成的 SDRTS 载荷:**

```json
{
  "op": "PATCH",
  "delta": {
    "config.maintenance.limit": { "o": 3000, "n": 5000 }
  },
  "metadata": {
    "id": "mold_001",
    "version": 5
  }
}
```

- **Key**: 使用点号（`.`）连接的扁平化路径，由后端领域白名单解析和校验，不直接充当任意数据库更新路径。
- **o (Old)**: 原始值，用于并发冲突检测。
- **n (New)**: 新值，提交给数据库。

### 2.2 语义约定

- **Update**: 键路径存在，且 `n` 与 `o` 不同。
- **Clear**: `n: null` 表示请求清空字段，是否允许由后端领域契约决定；不代表删除业务实体。
- **Array Mutation**: 当前 `DeltaPayload.op` 仅定义 `PATCH`，没有通用 `APPEND` 操作符。数组可产生数字索引路径或按字段整体提交，具体由领域接口支持的路径决定。

---

## 3. 开发规范 (Implementation Rules)

### 3.1 脏检查 (Dirty Checking)

`ProxyTracker.commit()` 只生成 `DeltaSet` 并过滤实际未变更的属性；它不发送请求，也不确认保存。用户将值改回原始状态后，该字段不会出现在差量中。服务端成功后由调用方刷新查询并重建或重置编辑基线。

### 3.2 乐观并发控制与后端事务锁

受版本控制的接口必须携带其约定的 `version` 或更新时间；类型和精度遵循领域模型。品质标准、物流记录等接口对当前版本进行匹配校验，冲突返回409，不因差量携带旧值就默认合并。

后端按需要在事务内锁定并重读当前记录，完成字段白名单、状态、权限、版本和业务校验。旧值是编辑基线与审计依据，不能代替当前审批或动作权限。

---

## 4. 后端适配边界

- **领域校验**: 差量只能修改接口明确允许的编辑字段。提审、审批决定、库存过账等语义动作走实际后端事务，不能通过任意字段路径绕过。
- **审计与通知**: 后端按现有领域审计模型记录结果；需要通知时复用同事务收件与提交后队列。差量协议本身不保证审计、申请或通知已经生成。
- **JSONB 更新**: 是否使用 JSONB 路径更新由领域服务选择，必须位于白名单校验与事务边界内；不要求每个实体直接执行通用 JSONB 更新。

---

## 5. 组件集成路径

实现入口为 [use-delta-tracker.ts](src/hooks/use-delta-tracker.ts)、[proxy-tracker.ts](src/lib/delta/proxy-tracker.ts) 和 [types.ts](src/lib/delta/types.ts)；品质标准的提交示例见 [quality-maintenance-service.ts](src/features/quality/services/quality-maintenance-service.ts)。

1. **Service 层**: 前端领域服务使用 `apiFetch` 与实际 DTO 构造请求，例如 `QualityMaintenanceService.saveStandard`；不要求继承不存在的 `BaseApiService` 或调用 `saveDelta()`。
2. **Hook 层**: `useDeltaTracker(originalData, resetKey?)` 返回 `data`、`deltaProxy`、`commit()`、`isDirty()`、`reset()` 等能力。使用 `isDirty()` 判断变化，使用 `commit()` 取得差量。
3. **UI 层**: 编辑追踪器的 `data`，或通过表单生成差量，再交给领域 Service 提交；保存成功后由 Hook 更新查询和界面。

> [!IMPORTANT]
> **切记**：不要用 `undefined` 表达字段清空或依赖 JSON 自动丢弃来生成有效差量。未修改字段不进入差量；清空时按领域契约显式传 `null`，提交前校验载荷。
