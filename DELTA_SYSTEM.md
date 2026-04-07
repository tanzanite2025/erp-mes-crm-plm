# XDFC 响应式差量更新系统 (SDRTS) 设计规范

> **版本**: 1.0 (Draft)
> **状态**: 核心架构指引

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
- **Key**: 使用点号（`.`）连接的扁平化路径，直接映射到后端数据库的 JSON 解析路径。
- **o (Old)**: 原始值，用于并发冲突检测。
- **n (New)**: 新值，提交给数据库。

### 2.2 语义约定
- **Update**: 键路径存在，且 `n` 与 `o` 不同。
- **Delete**: 将 `n` 显式设为 `null` 代表清空该字段。
- **Array Mutation**: 对于数组，系统支持 `APPEND` 操作符，而非全量替换数组字段，从而避免大规模数据传输。

---

## 3. 开发规范 (Implementation Rules)

### 3.1 脏检查 (Dirty Checking)
系统在执行 `commit()` 时会自动过滤所有“实际未变更”的属性。如果用户将一个值改回了原始状态，该字段将不会出现在 Delta 中。

### 3.2 悲观并发控制 (Optimistic Lock)
所有 Delta 更新**必须**携带 `version` 或 `updated_at`。
- **后端规则**: 如果数据库中的 `version` > 提交的 `version`，通过比较 `o` 值与数据库当前值，判定是否发生并发冲突。

---

## 4. 后端对等适配建议

- **审计入库**: 后端 `AuditTimeline` 应直接将整个 `delta` 对象存入 JSONB 字段。
- **JSONB 按需更新**: PostgreSQL 等数据库可以直接利用扁平路径进行高效更新：
  `UPDATE table SET data = jsonb_set(data, '{config,maintenance,limit}', '5000')`

---

## 5. 组件集成路径

1. **Service 层**: 继承 `BaseApiService`，使用其提供的 `saveDelta()` 方法。
2. **Hook 层**: 引入 `useDeltaTracker(originalData)`，它返回一个 `proxy` 和一个状态标识 `isDirty`。
3. **UI 层**: 直接操作 `proxy` 对象，无需维护任何 `Partial` 逻辑。

> [!IMPORTANT]
> **切记**：在本系统中，`undefined` 特指“不进行任何操作”，严禁将 `undefined` 序列化到网络载荷中。
