# XDFC 全局架构与 AI 行为约束 (GEMINI.MD)

> **注意**: 此文件为 AI 开发的核心指导准则，所有后续的功能迭代、重构及代码生成必须严格遵守以下规范。

---

## 🛡️ 1. 核心哲学：后端权威 (Backend Authority)

- **数据唯一性**: 所有的计算逻辑、状态流转和权限校验必须以中心化服务器为终点。前端仅提供响应式展示与输入采集。
- **Fail Loudly**: 禁止任何形式的静默失败。数据缺失或 API 异常必须抛出 [CRITICAL] 错误或可见的挂起，严禁使用空对象 `{}` 或空数组 `[]` 掩盖错误。

---

## 📦 2. 数据传输规范 (DTO & SDRTS)

### 2.1 全量 DTO 模型
- 所有的 `services` 返回值必须基于 Zod Schema 定义的 DTO 模型，严禁在业务层直接透传后端原始 JSON。
- 所有的主实体模型（如 Mold, Furnace）必须包含 `version` (int) 字段以支持悲观并发。

### 2.2 SDRTS 差量更新协议
- **严禁补丁式更新**: 禁止手动构造 `Partial<T>`。所有的局部更新必须走 **SDRTS (Systematic Delta Reactive Tracking System)**。
- **载荷标准**: 必须使用扁平化路径载荷：
  ```json
  { "op": "PATCH", "delta": { "path.to.field": { "o": old, "n": new } } }
  ```
- **原子性**: 审计日志由后端根据 Delta 直接生成，前端必须确保提交的 Delta 是经过“脏检查”的真实增量。

---

## 📶 3. 离线支持与弹性架构 (Offline Roadmap)

为了支持工业环境下的不稳定网络，未来的所有写入操作（Mutations）应遵循以下演进路径：

1. **乐观更新 (Optimistic UI)**: UI 立即反映变更，同时在后台提交。
2. **变更排队 (Queued Write)**: 所有的 SDRTS 差量应进入客户端 `IndexedDB` 队列。
3. **断网暂存**: 若 API 请求因网络原因超时（Timeout），系统应自动将 Delta 降级为本地草稿，并在网络恢复后触发 `Self-Healing Sync`（自愈同步）。
4. **冲突策略**: 发生版本冲突时，利用 Delta 中的 `o` (Old Value) 进行细粒度合并，而非全盘覆盖。

---

## 🛠️ 4. UI 视觉规范 (UDS 1.0)

- **工业感设计**: 必须遵守 `user_global` 定义的 UDS 1.0 规范，强调 `italic` 标题、`dashed` 边框和 `rounded-[24px/32px]` 的物理大圆角。
- **动效约束**: 所有的卡片进入必须使用 `animate-in fade-in duration-700`，确保工业软件在复杂数据下仍保持流畅的交互感。

---

> **警告**: 任何违反上述 DTO 规范或 SDRTS 协议的代码生成行为均被视为“损坏（Broken Block）”，AI 必须在生成前自检是否符合此文档。
