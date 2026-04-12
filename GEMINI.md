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
2. **变更排队 (Queued Write)**: 所有的 SDRTS 差量应进入客户端离线存储，而不是仅停留在内存。
3. **断网暂存**: 若 API 请求因网络原因超时（Timeout）或离线，系统应自动将 Delta 降级为本地草稿，并在网络恢复后触发 `Self-Healing Sync`（自愈同步）。
4. **冲突策略**: 发生版本冲突时，必须利用 Delta 中的 `o` (Old Value) 进行细粒度合并，而非全盘覆盖。

### 3.1 本地离线存储模型
- **三层结构**: 离线写模型默认采用 `snapshot + pending log + sync meta` 三层结构，而不是“单一 pending queue”。
- **snapshot**: 保存最近一次与服务端确认对齐后的实体快照，作为离线恢复与重放基线。
- **pending log**: 保存尚未完成同步确认的 Delta / Intent，至少包含 `entityType`、`entityId`、`path`、`o`、`n`、`baseVersion`、`opId`、`createdAt`、`state`。
- **sync meta**: 保存同步状态元数据，例如 `latestAckVersion`、`lastSyncAt`、`hasConflict`、`queueState`。

### 3.2 存储实现约束
- **IndexedDB 主存储**: 浏览器端离线主存储默认采用 `IndexedDB`，`o(old value)` 严禁只放内存。
- **默认实现候选**: 若采用 `IndexedDB`，默认优先使用 `Dexie.js` 承接事务、Schema Version 与 typed table 访问，不建议手写原始 IndexedDB API。
- **禁止业务层直连 DB**: 业务模块、页面组件、普通 Hook 严禁直接操作 Dexie / IndexedDB；所有存储访问必须经由离线基础设施层封装。

### 3.3 分层原则
- **离线能力平台化**: IndexedDB、队列、重放编排、冲突记录、同步状态机等通用能力，必须抽为独立基础设施层。
- **冲突语义领域化**: 不同模块的 path 粒度、压缩策略、冲突判定、自动合并边界，必须由模块 adapter 定义，严禁硬编码在公共层里。
- **推荐结构**: 前端宜按“离线基础设施层 + 模块 adapter + 页面/Hook 调用层”组织，而不是让每个模块各自实现一套离线逻辑。

### 3.4 同步与冲突原则
- **版本优先**: 恢复同步时应优先基于 `baseVersion / latestAckVersion` 判定，再结合 `o` 与服务端当前值做字段级合并。
- **幂等要求**: 所有离线日志必须具备 `opId` 之类的幂等标识，避免网络抖动下重复应用。
- **日志压缩**: 长周期离线下允许对同实体、同路径日志做压缩，但必须保留可回溯的初始 `o` 与最终 `n`。
- **冲突分级**: 同路径高风险字段冲突必须升级为显式人工决策，严禁静默覆盖。

---

## 🛠️ 4. UI 视觉规范 (UDS 1.0)

- **工业感设计**: 必须遵守 `user_global` 定义的 UDS 1.0 规范，强调 `italic` 标题、`dashed` 边框和 `rounded-[24px/32px]` 的物理大圆角。
- **动效约束**: 所有的卡片进入必须使用 `animate-in fade-in duration-700`，确保工业软件在复杂数据下仍保持流畅的交互感。

---

## 🏗️ 5. 架构对齐：从 SDRTS 向 TDO 与工作流收敛

为了实现工业级事务的语义化审计与自愈，所有业务开发必须遵循以下对齐准则：

### 5.1 从物理差量 (Delta) 向语义事务 (TDO) 进化
- **语义化指令**: 严禁在组件中直接构建复杂的字段级 `PATCH`。对于具备明确业务意图的操作（如“认领订单”、“调整库存”），必须将其封装为 **TDO (Transaction Data Object)** 或调用 **Workflow Command**。
- **意图声明**: 所有的 SDRTS 载荷应在 `metadata` 中携带 `intent` (意图) 标识，以便后端审计系统将物理变更还原为业务事务。

### 5.2 服务层 (Services) 的去副作用化
- **纯净化原则**: `services/` 目录下的代码应仅负责 API 请求与 SDRTS 协议封装（`apiFetch`, `patch`, `create`）。
- **禁止副作用**: 严禁在 Service 中手动触发 Toast、Notification 或跨模块状态更新。所有的业务副作用必须交由工作流引擎（`DispatchService`）或 Hook 层的 `onSuccess` 统一编排。

### 5.3 单一职责与物理隔离
- **禁止上帝文件 (Anti-God Files)**: 严禁创建类似 `trading-service.ts` 这种跨越多个核心实体（客户、供应商、订单）的服务。
- **目录隔离规范**: 每个子域（如 `sales`, `customer`）必须拥有独立的 `services/`, `hooks/`, `data/` 目录。跨域逻辑必须上浮至 `Workflow-Core` 或通过特性层入口 `index.ts` 转发。

### 5.4 工作流 (Workflow) 优先
- **Command 驱动**: 复杂的长事务流程必须注册为 `StandardCommand`，并受 `RoutingService` 和 `DispatchService` 的管控。

---

### 5.5 前端
- **主方向**: 前端状态治理以“响应式数据总线”为主方向，但该总线仅是状态传播层，不能替代后端权威、Workflow 或 Service 边界。
- **技术落点**: 默认采用 `React Query + Zustand + typed domain event bus` 组合，而非将所有状态混入单一 Store 或以组件内手工 `dispatchEvent` 维持同步。
- **增量补充**: 高实时链路可使用 `WebSocket / SSE -> invalidateQueries` 或局部 cache patch 作为补充，但不得引入第二套业务真相源。
- **远端真相归属**: 所有来自服务端的实体列表、详情、分页结果、权限裁决结果与可重取数据，默认由 `React Query` 负责读取、缓存、失效与重取。除非有明确说明，禁止以 `Zustand` 或自定义全局对象长期持有这些服务端真相副本。
- **本地状态归属**: `Zustand` 仅用于本地 UI / 会话 / 临时交互态，例如弹窗开关、表格筛选、视图模式、选中项、短生命周期草稿或界面偏好。不得用 `Zustand` 取代 Query Cache 管理服务端权威实体。
- **事件总线边界**: `typed domain event bus` 仅用于轻量同步、query invalidation、局部视图联动、WebSocket 事件桥接与非事务型前端响应。严禁将 event bus 作为复杂业务编排中心，严禁以事件链替代显式的领域命令与工作流。
- **与 Workflow 的关系**: 涉及跨模块裁决、长事务、语义事务、审批流或需要审计语义还原的操作，仍必须走 `StandardCommand`、`RoutingService`、`DispatchService` 或明确的 Workflow Command。event bus 只能消费这些流程的结果，不能取代这些流程本身。
- **与 Services 的关系**: 为保持 `5.2` 的去副作用化原则，`services/` 目录中的代码只负责请求、DTO 适配与 SDRTS / TDO 协议封装。严禁在 Service 中直接触发 Toast、Notification、bus emit、跨模块刷新或其他状态副作用。
- **副作用承载位置**: query invalidation、bus emit、toast、局部 store patch 等副作用，必须位于 Hook 层、`useMutation().onSuccess`、`DispatchService`、Workflow 结果处理器或 WebSocket bridge 中统一编排。
- **流式更新定位**: `WebSocket / SSE` 是响应式数据总线的增量输入源，而不是新的权威读模型。默认优先策略应为 `invalidateQueries`、`setQueryData` 或最小范围局部同步，而不是绕过现有 DTO / Query / Workflow 边界直接散落更新。
- **兼容性要求**: 任何前端状态治理改造都必须同时满足：
  - 不削弱“后端权威”
  - 不破坏 `services/` 去副作用化
  - 不绕开 `Workflow / DispatchService / StandardCommand`
  - 不回退到无类型、字符串散落的全局事件广播模式
- **离线架构对齐**: 若引入离线 SDRTS，必须采用基础设施层封装，不得让模块直接拼装 `IndexedDB / Dexie / pending queue` 细节；默认从“单一 pending queue”升级为“snapshot + pending log + sync meta”三层架构，并补上版本优先、幂等、压缩与冲突分级处理。
> **警告**: 任何违反上述 DTO 规范、SDRTS 协议或 **TDO 事务封装** 的代码生成行为均被视为“损坏（Broken Block）”，AI 必须在生成前自检是否符合此文档。
