# implementation plan

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

## `asset-service.ts` facade/hook 拆层专项（2026-04-07，待确认）

### 一、当前目标
本专项不是继续补 DTO guard，而是单独分析 `src/features/equipment-tooling/services/asset-service.ts` 是否需要从当前的 facade/hook 混合结构中拆层。

本轮目标：

1. 明确 `asset-service.ts` 当前承担的职责；
2. 判断现状是否已经越过合理边界；
3. 设计最小拆层路径；
4. 保证后续实施时不扩散为 equipment-tooling 全模块重构。

### 二、现状职责拆解
当前 `asset-service.ts` 同时承担了三类职责：

#### 1) 无状态 facade
通过静态绑定导出：

- `getMolds`
- `getGroupNames`
- `saveMolds`
- `checkMoldCapacity`
- `checkLinkIntegrity`
- `getFurnaces`
- `saveFurnaces`
- `getLoans`
- `lendMold`
- `borrowMold`
- `returnMold`

这部分职责本质上是对底层领域 service 的统一门面封装。

#### 2) React hook 状态管理
`useAssets()` 内部负责：

- `molds` / `furnaces` / `loans` 本地状态
- `isLoading` 状态
- 初始加载 `loadInitial()`
- `loadMolds()` / `loadFurnaces()` / `loadLoans()`
- `useEffect()` 事件监听与解绑

这部分职责属于典型 UI/React 侧协调逻辑。

#### 3) 乐观更新与回滚协调
`useAssets()` 的 `actions` 内部还承担：

- `updateMolds()`：乐观更新、失败回滚、patch/save 路由分流
- `updateFurnaces()`：乐观更新、失败回滚、patch/save 路由分流
- `setAssetStatus()`：状态乐观更新与失败还原

这已经超出“简单 hook”范围，更接近 UI 侧状态协调器。

### 三、是否需要拆层
结论：**需要，但应采用最小拆层策略。**

理由如下：

1. 同一文件同时承载 facade + hook + 协调器，职责边界已经不清晰；
2. 当前结构使得测试粒度不自然：
   - facade 很难单独测试
   - hook 很难在不触发领域逻辑的情况下独立验证
3. 后续若继续抽离炉台模块或资产子域，该文件会成为高耦合节点；
4. 当前 DTO guard 已大多下沉到底层 service，`asset-service.ts` 再继续承担同层职责收益不高，反而更适合拆成“门面层”和“React 组合层”。

### 四、最小拆层方案

#### 方案核心
保留无状态 facade，拆出独立 hook。

#### 拟拆分方向

##### A. 保留 `asset-service.ts`
仅保留无状态 facade 能力：

- 聚合底层 `MoldService` / `FurnaceService` / `MoldLoanService`
- 暴露统一查询与命令入口
- 不再包含 React hook 与本地状态逻辑

##### B. 新建独立 hook 文件
建议新建类似：

- `src/features/equipment-tooling/hooks/use-assets.ts`

职责包括：

- `molds` / `furnaces` / `loans` / `isLoading`
- 初始加载与局部刷新
- 事件监听与清理
- 乐观更新与失败回滚

##### C. 暂不新建更重的 service 抽象层
本轮不建议继续引入：

- `BaseAssetCoordinator`
- `AssetRepository`
- 通用 optimistic-update framework

因为这会显著扩大改动面。

### 五、拟实施顺序（待确认后执行）

1. 新建 hook 文件，迁移 `useAssets()` 逻辑；
2. 保持 `AssetService` 对外静态方法签名不变；
3. 将当前引用 `useAssets` 的调用方切换到新 hook 文件；
4. 回归验证 `molds` / `furnaces` / `loans` 加载、局部刷新、乐观更新与回滚行为；
5. 若稳定，再考虑是否把 hook 内部的乐观更新 helper 继续拆小。

### 六、风险点
1. `useAssets()` 当前混合了事件监听与乐观更新，拆分时容易遗漏事件订阅；
2. 若调用方直接从 `asset-service.ts` 同时 import `AssetService` 与 `useAssets`，需要同步修正引用；
3. `setAssetStatus()`、`updateMolds()`、`updateFurnaces()` 的回滚语义不能退化；
4. 本专项如果顺带动到底层 service，会显著放大回归面，因此必须严格收住。

### 七、明确不做事项
1. 不重写资产页面组件；
2. 不改底层 `MoldService` / `FurnaceService` / `MoldLoanService` 的 API 语义；
3. 不替换现有事件总线机制；
4. 不将本次拆层扩散为 equipment-tooling 目录全面重构。

### 八、验证要求
若后续进入执行阶段，至少验证：

```bash
pnpm build
```

并人工验证：

- 资产页面初始加载正常
- 模具/炉台/借用记录局部刷新正常
- 乐观更新失败时可正确回滚
- 状态切换失败时本地状态可恢复

## DTO 第二阶段：`equipment-tooling/services` 与 `basic-settings/services`（2026-04-07，待确认）

### 一、当前目标
在 DTO 第一阶段已完成主干 `product-service`、`category-service`、`trading-service`、`user-api` 收口后，本阶段聚焦两个历史 service 密集目录：

- `src/features/equipment-tooling/services`
- `src/features/basic-settings/services`

本阶段仍先输出审批稿，不直接改代码。目标是进一步细化到文件与函数级，明确下一批 DTO 整改优先顺序。

### 二、目录级初步结论

#### `equipment-tooling/services`
- **相对完整**：`drawing-service.ts`、`partner-service.ts`
- **存在明确缺口**：`mold-service.ts`、`mold-loan-service.ts`、`furnace-service.ts`
- **待二次核对**：`archive-service.ts`、`asset-service.ts`

#### `basic-settings/services`
- **相对完整**：`unit-service.ts`、`dictionary-service.ts`
- **存在明确缺口**：`system-config-service.ts`、`enterprise-service.ts`、`linear-barcode-protocol-service.ts`、`numbering-service.ts`

### 三、第二阶段 DTO 整改表（审批稿）

| 风险级别 | 文件 | 函数 | 当前问题类型 | 拟整改策略 |
| --- | --- | --- | --- | --- |
| 高 | `src/features/basic-settings/services/system-config-service.ts` | `getConfigs()` | 列表读取直接返回 `apiFetch<SystemConfig[]>`，未显式做数组响应校验 | 增加 `ensureArrayResponse<SystemConfig>(...)` |
| 高 | `src/features/basic-settings/services/system-config-service.ts` | `updateConfig()` | 保存返回对象未显式做对象响应校验 | 增加 `ensureObjectResponse<SystemConfig>(...)` |
| 高 | `src/features/basic-settings/services/enterprise-service.ts` | `getConfig()` | 成功路径直接返回 `apiFetch<EnterpriseConfig>`，404 fallback 与 DTO guard 未统一收口 | 在成功路径增加 `ensureObjectResponse<EnterpriseConfig>(...)`，保留 404 fallback |
| 高 | `src/features/basic-settings/services/enterprise-service.ts` | `saveConfig()` | 保存返回对象未显式做对象响应校验 | 增加 `ensureObjectResponse<EnterpriseConfig>(...)` |
| 高 | `src/features/basic-settings/services/linear-barcode-protocol-service.ts` | `getConfig()` | 成功路径直接返回对象，异常 fallback 存在，但未显式做 DTO guard | 在成功路径增加 `ensureObjectResponse<LinearBarcodeProtocolConfig>(...)` |
| 高 | `src/features/basic-settings/services/linear-barcode-protocol-service.ts` | `updateConfig()` | 保存返回对象未显式做对象响应校验 | 增加 `ensureObjectResponse<LinearBarcodeProtocolConfig>(...)` |
| 高 | `src/features/basic-settings/services/numbering-service.ts` | `generateNumber()` | 直接读取 `data.number`，未显式确认返回对象结构 | 增加对象响应校验，并显式校验 `number` 字段 |
| 高 | `src/features/equipment-tooling/services/mold-service.ts` | `getMoldsWithVersion()` | 依赖 `(response as any).data` / `(response as any).version` 与手工兼容分支，DTO 边界松散 | 评估是否改为 `ensureObjectResponse(...)` + 明确 DTO 结构，避免裸 `any` |
| 高 | `src/features/equipment-tooling/services/mold-service.ts` | `getMoldById()` | 详情读取未显式做对象响应校验 | 增加 `ensureObjectResponse<Mold>(...)` |
| 高 | `src/features/equipment-tooling/services/mold-service.ts` | `isSnDuplicate()` | 对象返回直接读取字段，未显式做 DTO guard | 增加对象响应校验后再读取 `duplicate` |
| 高 | `src/features/equipment-tooling/services/mold-service.ts` | `checkLinkIntegrity()` | 聚合对象返回未显式做对象响应校验 | 增加 `ensureObjectResponse(...)` |
| 高 | `src/features/equipment-tooling/services/mold-loan-service.ts` | `getLoans()` | 列表读取仅做空值判断，未显式做数组响应校验 | 增加 `ensureArrayResponse<MoldLoan>(...)` |
| 高 | `src/features/equipment-tooling/services/mold-loan-service.ts` | `createBorrowRecord()` | 使用 `apiFetch<any>` 并直接返回裸结果 | 明确返回 DTO 结构，移除 `any`，补对象响应校验 |
| 高 | `src/features/equipment-tooling/services/furnace-service.ts` | `getFurnaces()` | 列表读取未显式做数组响应校验 | 增加 `ensureArrayResponse<Furnace>(...)` |
| 中 | `src/features/equipment-tooling/services/archive-service.ts` | 待二次核对 | 尚未展开函数级盘点 | 进入实施前先补读源码，确认是否存在裸 `apiFetch` / 缺失 patch |
| 中 | `src/features/equipment-tooling/services/asset-service.ts` | 待二次核对 | 尚未展开函数级盘点 | 进入实施前先补读源码，确认缺口后再实施 |
| 低 | `src/features/basic-settings/services/unit-service.ts` | 已基本完整 | 已具备数组/对象 guard 与 `patchUnit()` | 本轮不动 |
| 低 | `src/features/basic-settings/services/dictionary-service.ts` | 已基本完整 | 主要读取链路已显式做数组响应校验 | 本轮不动 |
| 低 | `src/features/equipment-tooling/services/drawing-service.ts` | 已基本完整 | 已具备 patch DTO 与对象响应校验 | 本轮不动 |
| 低 | `src/features/equipment-tooling/services/partner-service.ts` | 已基本完整 | 已具备列表/对象 guard 与 `patchPartner()` | 本轮不动 |

### 四、建议实施顺序

#### 第一批：basic-settings 高风险项
1. `system-config-service.ts`
2. `enterprise-service.ts`
3. `linear-barcode-protocol-service.ts`
4. `numbering-service.ts`

原因：
- 文件短；
- 风险边界清晰；
- 以 DTO guard 收口为主，不涉及复杂状态流。

#### 第二批：equipment-tooling 明确缺口项
1. `furnace-service.ts`
2. `mold-loan-service.ts`
3. `mold-service.ts`

原因：
- 这些文件已明显存在列表读取裸返回、`any`、详情对象无 guard 等问题；
- 但 `mold-service.ts` 内含兼容逻辑与聚合接口，风险略高，应放在 `furnace/mold-loan` 之后。

#### 第三批：待二次核对项
1. `archive-service.ts`
2. `asset-service.ts`

### 五、明确不做事项
1. 本阶段不修改 `drawing-service.ts` 与 `partner-service.ts`；
2. 本阶段不扩散到 `engineering-db/services`、`finance/services`、`approval/services`；
3. 本阶段不重写 `mold-service.ts` 的业务语义，只收口 DTO guard；
4. 本阶段不把目录内所有 service 强行统一为抽象基类。

### 六、补充结论：`archive-service.ts` 与 `asset-service.ts`

#### `archive-service.ts`
函数级核对结果：

- `getArchivedMolds()`
  - 当前已使用 `ensureArrayResponse<Mold>(...)`
  - 列表读取链路已具备明确数组响应校验
- `archive()`
  - 当前是命令型接口：提交归档命令后派发事件
  - 不依赖返回对象 DTO，也不承担复杂响应结构解析

结论：
- 该文件当前不属于高优先级 DTO 缺口；
- 若无新增后端返回对象契约需求，不建议为追求形式统一而额外改动。

#### `asset-service.ts`
函数级核对结果：

- 当前文件不直接调用 `apiFetch`
- 其职责主要是：
  - 聚合 `MoldService` / `FurnaceService` / `MoldLoanService`
  - 暴露 facade 能力
  - 在 `useAssets()` 中做局部刷新、乐观更新与事件监听

结论：
- `asset-service.ts` 更接近 facade/hook 组合层，而非底层 DTO service；
- 它的 DTO 边界主要继承自下游 service；
- 当前不建议把它作为“补 response guard”的主战场。

若后续继续治理本文件，应另立专项，聚焦：

1. facade 是否过重；
2. hook 与 service 是否需要拆层；
3. 乐观更新与事件同步边界是否需要进一步收口。

### 七、实施约束
后续若进入执行阶段，必须遵守：

1. 先改 `basic-settings/services`，再改 `equipment-tooling/services`；
2. 每次只处理少量文件，避免大面积联动；
3. 每批改完后至少执行：

```bash
pnpm build
```

4. 对 `mold-service.ts` 中涉及 hybrid array / 兼容结构的链路，必须先确认调用方是否依赖现有返回形状，再决定是否只加 guard 或同时做最小 DTO 映射。

## DTO 接入缺口盘点与整改规划（2026-04-07，待确认）

### 一、当前目标
本轮不是直接改业务代码，而是将当前前端 service 层尚未完全接入 DTO/Delta 协议的缺口整理成一份可执行的整改表，供后续分批确认实施。

本轮输出要求：

1. 精确到文件；
2. 精确到函数；
3. 标注风险级别；
4. 标注问题类型；
5. 给出拟整改策略；
6. 明确本轮仅为审批稿，不直接实施代码修改。

### 二、判定标准
本轮将“尚未完全接入 DTO/Delta 协议”定义为以下任一情况：

1. 使用 `apiFetch<any>` 或直接 `as Xxx[]` / `as Xxx` 类型断言返回；
2. 创建/更新返回对象未显式做 `ensureObjectResponse(...)` 校验；
3. 列表/选项返回数组未显式做 `ensureArrayResponse(...)` 校验；
4. 已存在 save/get，但缺少配套 `patchXXX()` 的 `DeltaPayload` / `DeltaSet` 接入；
5. 同一 service 内部 create/read/patch 三类链路的 DTO 风格不一致。

### 三、DTO 整改表（审批稿）

| 风险级别 | 文件 | 函数 | 当前问题类型 | 拟整改策略 |
| --- | --- | --- | --- | --- |
| 高 | `src/features/engineering/services/product-service.ts` | `getProducts()` | 使用 `apiFetch<any>`，并直接 `as Product[]` 返回 | 改为 `apiFetch<unknown>` 或明确泛型后，使用 `ensureArrayResponse<Product>(...)` 收口 |
| 高 | `src/features/engineering/services/product-service.ts` | `getProductTypes()` | 使用 `apiFetch<any>`，并直接 `as ProductType[]` 返回 | 改为显式数组响应校验，消除对解包结果的裸断言依赖 |
| 高 | `src/features/trading/services/trading-service.ts` | `saveCustomer()` | 创建返回对象未显式做 `ensureObjectResponse(...)` | 对创建返回值统一增加对象响应校验 |
| 高 | `src/features/trading/services/trading-service.ts` | `saveSupplier()` | 创建返回对象未显式做 `ensureObjectResponse(...)` | 对创建返回值统一增加对象响应校验 |
| 高 | `src/features/trading/services/trading-service.ts` | `getSalesOrderById()` | 详情读取未显式做对象响应校验 | 统一详情读取口径，增加 `ensureObjectResponse(...)` |
| 高 | `src/features/trading/services/trading-service.ts` | `getSalesOrderByNo()` | 详情读取未显式做对象响应校验 | 统一详情读取口径，增加 `ensureObjectResponse(...)` |
| 高 | `src/features/trading/services/trading-service.ts` | `saveSalesOrder()` | 创建返回对象未显式做对象响应校验 | 与 patch/order list 风格对齐，补齐对象响应校验 |
| 高 | `src/features/trading/services/trading-service.ts` | `savePurchaseOrder()` | 创建返回对象未显式做对象响应校验 | 与 `patchPurchaseOrder()`、分页查询风格统一 |
| 高 | `src/features/warehouse/services/category-service.ts` | `getCategories()` | 列表读取直接返回 `apiFetch` 结果，未显式校验 | 增加 `ensureArrayResponse<WarehouseCategory>(...)` |
| 中 | `src/features/users/services/user-api.ts` | `fetchUsers()` | 分页读取未显式做对象响应校验 | 明确分页 DTO 结构，增加对象响应校验 |
| 中 | `src/features/users/services/user-api.ts` | `fetchUserOptions()` | 选项读取未显式做数组响应校验 | 增加 `ensureArrayResponse<UserOption>(...)` |
| 中 | `src/features/users/services/user-api.ts` | `createUser()` | 创建返回对象未显式做对象响应校验 | 增加 `ensureObjectResponse<User>(...)` |
| 中 | `src/features/users/services/user-api.ts` | `replaceUser()` | 替换返回对象未显式做对象响应校验 | 增加 `ensureObjectResponse<User>(...)` |
| 中 | `src/features/trading/services/trading-service.ts` | `patchCustomer()` / `patchSupplier()` / `patchSalesOrder()` / `patchPurchaseOrder()` | 已接 `DeltaPayload`，但 patch 返回值仍未统一显式校验风格 | 分批补齐 patch 返回对象的 `ensureObjectResponse(...)`，与其他已治理模块保持一致 |
| 中 | `src/features/trading/services/trading-service.ts` | customer / supplier / order 整体 service | 同一 service 内 create/read/patch 风格不一致 | 按实体分批收口：先 customer/supplier，再 sales/purchase |
| 低-中 | `src/features/equipment-tooling/services/*.ts` | 待二次审计 | 当前尚未完成函数级盘点，疑似存在旧式 `save/get/delete` 链路 | 二次审计后补充函数级整改表，不在本轮直接实施 |
| 低-中 | `src/features/basic-settings/services/*.ts` | 待二次审计 | 基础配置类 service 可能仍保留裸 `apiFetch` 返回 | 二次审计后按配置模块分批治理 |
| 低-中 | `src/features/engineering-db/services/*.ts` | 待二次审计 | 工程数据库 service 可能仍有未接 Delta/DTO 的历史接口 | 二次审计后补充明细 |
| 低-中 | `src/features/finance/services/*.ts` | 待二次审计 | 财务 service 尚未确认是否统一接入 DTO guard | 二次审计后补充明细 |
| 低-中 | `src/features/approval/services/*.ts` | 待二次审计 | 审批 service 尚未确认返回结构是否已统一收口 | 二次审计后补充明细 |

### 四、分批整改顺序建议

#### 第一批：高风险、低扩散、最容易复发响应契约错误
1. `src/features/engineering/services/product-service.ts`
   - `getProducts()`
   - `getProductTypes()`
2. `src/features/warehouse/services/category-service.ts`
   - `getCategories()`

#### 第二批：trading service 风格统一
1. `saveCustomer()`
2. `saveSupplier()`
3. `getSalesOrderById()`
4. `getSalesOrderByNo()`
5. `saveSalesOrder()`
6. `savePurchaseOrder()`
7. patch 返回值统一补 guard

#### 第三批：users 与其他中风险 service
1. `src/features/users/services/user-api.ts`
2. 目录级二次审计：
   - `equipment-tooling/services`
   - `basic-settings/services`
   - `engineering-db/services`
   - `finance/services`
   - `approval/services`

### 五、明确不做事项
1. 本轮不修改后端 DTO 定义；
2. 本轮不重写全局 `apiFetch` 解包策略；
3. 本轮不做一次性跨仓横扫式替换；
4. 本轮不将所有旧式 service 统一迁移为同一抽象基类。

### 六、实施约束
后续若进入执行阶段，必须遵守：

1. 每一批只改少量 service，避免一次性大面积触发响应契约回归；
2. 优先补响应校验与 DTO guard，不先做抽象层重构；
3. 每批改完后至少执行：

```bash
pnpm build
```

4. 若某模块实际依赖 `apiFetch` 的 hybrid array 语义，需先确认调用方是否依赖附加元数据，再决定使用 `ensureArrayResponse(...)` 还是对象 DTO 收口。

## `/purchase/logistics` 页面 500 修复（2026-04-07，待确认）

### 一、当前问题
`/purchase/logistics` 页面当前无法正常打开，前端同时出现两类错误：

1. React 警告与崩溃：
   - `The result of getSnapshot should be cached to avoid an infinite loop`
   - `Maximum update depth exceeded`
2. 请求错误：
   - `GET /purchase-orders?status=Approved` 返回 `404 Not Found`

当前堆栈显示错误落点在：

- `PurchaseLogisticsPage`
- `PurchaseLogisticsDialog`
- `purchase-logistics-offline-draft-service`

### 二、根因结论
本轮已定位到两处直接根因：

#### 根因 1：采购订单查询路径写错
前端当前在 `PurchaseLogisticsDialog` 中请求：

- `/purchase-orders?status=Approved`

但后端真实路由注册为：

- `/purchase/orders`

因此该请求会稳定返回 404。

#### 根因 2：`useSyncExternalStore` 的 `getSnapshot` 不稳定
`PurchaseLogisticsPage` 中：

- `React.useSyncExternalStore(subscribePurchaseLogisticsOfflineDrafts, getPurchaseLogisticsOfflineDraftsSnapshot, () => [])`

而 `getPurchaseLogisticsOfflineDraftsSnapshot()` 当前直接返回：

- `listPurchaseLogisticsOfflineDrafts()`

其底层 `readDrafts()` 每次都会重新构造并返回新数组，即使 localStorage 数据没有变化，快照引用也不稳定。

这违反了 `useSyncExternalStore` 对 `getSnapshot` 的要求，最终会触发：

- `The result of getSnapshot should be cached`
- `Maximum update depth exceeded`

### 三、本轮目标
本轮只做最小修复：

1. 让采购物流页不再因为错误接口路径触发 404；
2. 让离线草稿订阅快照在未变化时返回稳定引用；
3. 恢复 `/purchase/logistics` 页面的正常打开与基础交互。

### 四、拟改范围（待确认后实施）

#### 必改
- `src/features/purchase-logistics/purchase-logistics-dialog.tsx`
- `src/features/purchase-logistics/services/purchase-logistics-offline-draft-service.ts`

#### 本轮明确不改
- `server/handlers/purchase_orders.go`
- 全局 `useSyncExternalStore` 封装
- 整个采购模块的数据模型或 API 架构

### 五、拟采用的最小修复路径

#### 修复路径 1：对齐采购订单查询接口路径
将前端查询：

- `/purchase-orders?status=Approved`

调整为与后端真实路由一致的路径。

#### 修复路径 2：缓存离线草稿快照
在离线草稿服务中建立稳定快照机制，确保：

- localStorage 内容未变化时，`getPurchaseLogisticsOfflineDraftsSnapshot()` 返回同一引用
- 仅在 `writeDrafts()` 或实际存储变化后，才更新快照引用并触发订阅通知

### 六、风险与注意事项
1. 若只修接口 404，不修快照稳定性，页面仍可能因为无限更新崩溃。
2. 若只修快照稳定性，不修路径错误，采购订单下拉仍然无法正常加载。
3. 本轮不确认后端是否支持 `status=Approved` 过滤语义以外的更多筛选扩展，只先修路由正确性与页面可用性。

### 七、验证要求
待实施阶段至少验证：

```bash
pnpm build
```

并做页面行为验证：

- `/purchase/logistics` 页面可正常打开
- 控制台不再出现 `getSnapshot should be cached`
- 控制台不再出现 `Maximum update depth exceeded`
- 采购订单下拉请求不再是 `/purchase-orders?...` 404

### 八、明确不做事项
- 不在本轮将采购订单接口统一重命名为另一套 REST 风格；
- 不在本轮重写整个离线草稿存储层；
- 不把本轮问题扩散成全局 React store 抽象重构。

## MaterialService.getMaterialOptions 响应契约冲突修复（2026-04-07，待确认）

### 一、当前问题
材料组装页当前出现前端运行时错误：

```text
[INVALID_RESPONSE] MaterialService.getMaterialOptions expected an object response.
```

触发点位于：

- `MaterialAssemblyManager.loadData`
- `materialService.getMaterialOptions()`

页面表现为材料选项加载失败，进而导致材料组装页无法正常初始化。

### 二、根因结论
当前问题不是后端 `/materials?options=true` 返回错误，也不是接口 404/500。

根因是前端内部响应契约漂移：

1. 后端 `GET /materials?options=true` 返回：
   - `{ data: Material[], version: string }`
2. 全局 `apiFetch` 已具备自动解包逻辑：
   - 对 `{ data: [] }` 包装响应会返回数组实例（附带元数据）
3. `materialService.getMaterialOptions()` 仍然调用：
   - `ensureObjectResponse(...)`
4. 因此该函数把已经被 `apiFetch` 解包成数组的结果，再次误判为“非法对象响应”，最终抛出 `[INVALID_RESPONSE]`

### 三、本轮目标
本轮不改全局 API 语义，也不改后端 handler，只做最小对齐修复：

1. 让 `getMaterialOptions()` 与 `apiFetch` 当前解包行为保持一致；
2. 保持该函数对外仍返回 `Material[]`；
3. 保证 `MaterialAssemblyManager` 无需改动即可恢复加载。

### 四、拟改范围（待确认后实施）

#### 必改
- `src/features/material-archive/services/material-service.ts`

#### 本轮明确不改
- `server/handlers/materials.go`
- `src/lib/api-client.ts`
- 其他材料、仓库、工程等模块的响应校验逻辑

### 五、拟采用的最小修复路径
将 `getMaterialOptions()` 从“对象响应假设”切换为“数组响应假设”。

也就是说：

- 不再对其结果调用 `ensureObjectResponse(...)`
- 改为按 `apiFetch` 解包后的数组结果进行校验与返回

这样可以保证：

- 与当前全局解包行为一致
- 不影响 `getMaterialsWithVersion()` 这类仍依赖对象元数据读取的调用方

### 六、风险与注意事项
1. 若未来回滚 `apiFetch` 的自动解包机制，这里的契约需要再同步检查。
2. 本轮只修复 `getMaterialOptions()`，不代表全仓库所有旧对象假设都已排查完毕。
3. 若相同模式在其他模块存在，后续应单独做“响应契约巡检专项”，而不是在本轮顺手扩散。

### 七、验证要求
待实施阶段至少验证：

```bash
pnpm build
```

并做页面行为验证：

- 材料组装页打开后不再出现 `[INVALID_RESPONSE]`
- 材料下拉选项正常展示
- `MaterialAssemblyManager.loadData` 不再 fail loudly

### 八、明确不做事项
- 不在本轮调整后端 `/materials` 响应结构；
- 不在本轮回退或重写 `apiFetch` 全局解包机制；
- 不把本轮扩散成所有 `ensureObjectResponse` 调用点的大规模清理。

## 生产部署脚本二阶段优化：默认只重建 `app`，`watchdog` 按需重建（2026-04-07，待确认）

### 一、当前背景
上一轮已经将生产部署修正为默认重建后端，堵住了“前端已更新、后端没 build 导致 API 404”的高风险缺口。

但实际执行中暴露了新的效率问题：

1. 默认 build 会同时重建 `app` 与 `watchdog`
2. `watchdog` 的 Rust `cargo build --release` 在 VPS 上耗时很长
3. 对大多数常规发布而言，真正高频变化的是 `app`，不是 `watchdog`

因此需要做二阶段优化：

- 保留“默认路径足够安全、下次可以直接用”
- 同时避免每次部署都无差别重建 `watchdog`

### 二、本轮目标
本轮目标是把默认部署路径优化成更贴近真实使用频率的方案：

1. 默认无参执行时，优先重建 `app`
2. `watchdog` 改为按需显式重建
3. 保留全量重建入口，确保特殊场景仍可完整刷新所有服务

### 三、目标策略

#### 默认路径
- 无参执行：
  - 重建 `app`
  - 继续拉起/保持 `db`、`redis`、`nginx_lb` 等依赖服务
  - 不默认重建 `watchdog`

#### 扩展路径
- 全量重建：
  - 显式参数触发 `app + watchdog` 等服务重建
- watchdog 重建：
  - 单独提供按需参数，用于 watchdog 代码确有变更时执行
- 快路径：
  - 如保留，必须是显式 opt-in，而不能作为默认行为

### 四、建议参数矩阵
建议将 `server/deploy-prod.sh` 调整为以下语义：

- 默认：
  - `./deploy-prod.sh`
  - 重建 `app`
- 全量重建：
  - `./deploy-prod.sh --full-build`
  - 重建 `app` + `watchdog`
- 仅重建 watchdog：
  - `./deploy-prod.sh --watchdog-build`
- 快路径：
  - `./deploy-prod.sh --no-build`

具体参数命名可在实施时微调，但必须满足：

1. 默认路径最常用
2. 默认路径最安全
3. 默认路径耗时明显低于全量重建

### 五、预计改动范围（待确认后实施）

#### 必改
- `server/deploy-prod.sh`

#### 可能联动
- `deploy.sh`
- `walkthrough.md`

### 六、实施顺序建议

#### Phase A：重构 `server/deploy-prod.sh` 的服务选择策略
- 将 compose 启动服务列表拆分为：
  - 默认部署服务集
  - 全量重建服务集
  - watchdog 专项重建服务集

#### Phase B：统一参数语义与日志文案
- 日志必须清楚打印当前走的是：
  - 默认 app rebuild path
  - full rebuild path
  - watchdog rebuild path
  - no-build fast path

#### Phase C：必要时最小联动根脚本
- 确保根目录 `deploy.sh` 的默认入口语义与新默认策略一致。

### 七、风险与注意事项
1. 若参数设计过多或命名不清，会造成新的运维误用。
2. 若默认路径漏掉必要依赖服务，可能导致部署后状态不一致。
3. 若未来 watchdog 也变成高频变更点，需要重新评估默认策略。

### 八、验证要求
待实施阶段至少验证：

#### 默认路径
```bash
./server/deploy-prod.sh
```

应确认：
- 日志表明仅重建 `app`
- `app` 创建时间更新
- `watchdog` 不强制更新

#### 全量路径
```bash
./server/deploy-prod.sh --full-build
```

应确认：
- `app` 与 `watchdog` 都会重建

#### 功能回归
```bash
curl -i http://127.0.0.1:8000/api/v1/<新增或变更的后端路由>
```

应确认：
- 默认路径部署后，后端路由更新仍可生效
- 新增后端路由不再因旧 app 镜像导致 404

### 九、明确不做事项
- 不在本轮引入自动 diff 检测来智能判断哪些服务该 build；
- 不在本轮改造为完整 CI/CD pipeline；
- 不把本轮扩散成 docker-compose 全体系重构。

## 生产部署脚本默认重建后端固化修复（2026-04-07，待确认）

### 一、当前结论
本轮生产部署风险已经确认：新增后端路由在默认 fast path 下可能因旧 app 镜像仍在运行而表现为 404。

当前证据包括：

1. 代码仓库中后端已新增路由
2. 线上对新增路由的请求曾出现 404
3. 部署日志显示：
   - `Build mode: disabled (fast path)`
4. `server-app-*` 容器创建时间停留在数天前，说明后端并未在本次部署中重建

这说明当前生产部署默认策略存在结构性风险：

- 前端部署会更新
- 后端默认可能不重建
- 一旦引入新的 API/路由/handler，就可能产生前后端版本错位

### 二、本轮目标
本轮不先改业务逻辑，只把这个高风险部署缺口固化修复掉：

1. 生产部署默认重建后端 app 镜像；
2. fast path 改为显式选项，而不是默认行为；
3. 避免未来再次因为忘记 `--build` 而把生产环境打成前后端版本不一致。

### 三、拟调整策略

#### 目标策略
- 默认：
  - 生产部署执行带 build 的后端部署
- 可选：
  - 仅在明确确认需要快路径时，才允许显式禁用 build

#### 推荐方向
优先改：
- `server/deploy-prod.sh`

必要时联动：
- 根目录 `deploy.sh`

确保统一入口与直接进入 `server/` 执行脚本两种路径都尽量不再落入“默认不重建后端”的陷阱。

### 四、预计改动范围（待确认后实施）

#### 必改
- `server/deploy-prod.sh`

#### 可选联动
- `deploy.sh`

### 五、实施顺序建议

#### Phase A：先调整 `server/deploy-prod.sh`
- 将当前默认：
  - `WITH_BUILD=false`
  调整为默认启用 build；
- 如需保留快路径，改为显式参数，例如：
  - `--no-build`

#### Phase B：视情况同步根脚本入口
- 若根目录 `deploy.sh` 是主入口，则确保其调用后端部署时不会继续触发默认 fast path。

#### Phase C：生产验证
- 部署日志应明确显示 build 已启用；
- `server-app-*` 容器创建时间应更新；
- 新增后端路由不再返回 404。

### 六、风险与注意事项
1. 默认启用 build 会延长生产部署时间，但相较于登录阻塞故障，这个代价更可接受。
2. 若只改根脚本、不改 `server/deploy-prod.sh`，直接在 `server/` 目录部署时仍可能复发。
3. 若保留 fast path，必须把它变成显式 opt-in，而不能继续作为默认。

### 七、验证要求
待实施阶段至少验证：

```bash
./server/deploy-prod.sh --build
```

或修改默认后：

```bash
./server/deploy-prod.sh
```

并确认：

- 部署日志显示 build 已启用
- `docker compose ps` 中 `server-app-*` 容器创建时间更新
- 对新增后端路由的源站探测不再返回 404

### 八、明确不做事项
- 不在本轮同时重构部署体系或引入完整 CI/CD 平台；
- 不把本轮扩散成前后端全部服务的镜像版本管理工程；
- 不在未验证生产结果前，将问题简单归咎于前端容错。

## 已治理真相边界链路的最小后端回归测试补强（2026-04-07，待确认）

### 一、当前结论
当前已完成三条真相边界治理：

1. `sales-order`
   - 前端状态机已后迁到后端 authoritative path；
2. `shipment`
   - 前端 commit 状态推进与库存裁决已切回后端 command；
3. `purchase-order`
   - 局部前端状态扩散残留已删除。

这些改动都已通过 `pnpm build`，但目前仍缺少针对新边界的最小后端回归测试，存在后续迭代中被无意回退的风险。

### 二、本轮目标
本轮不扩散成测试体系重构，只补最小且高价值的后端回归测试，目标是：

1. 锁住新建立的 authoritative boundary；
2. 防止前端状态机/状态扩散逻辑在未来被变相引回；
3. 让关键状态流转在后端有最小自动化护栏。

### 三、测试范围

#### 1) `sales-order`
建议优先补：

- `server/services/sales_order_flow.go`
- `server/services/sales_fulfillment_service.go`
- 如有必要，`server/handlers/sales_orders.go`

最小断言建议：

- `Pending + all claimed -> InProgress`
- delivery 进度变化后：
  - `Pending -> InProgress`
  - `InProgress -> Done`
- `Canceled` 不被普通重算覆盖
- delete 首次进入 `Canceled`、再次 delete 才逻辑删除的语义保持稳定

#### 2) `shipment`
建议优先补：

- `server/services/inventory_command_service.go`
- 已存在的 shipment / inventory command 相关测试文件

最小断言建议：

- `CommitShipment(...)` 成功提交 DRAFT 记录
- 非 DRAFT 状态拒绝 commit
- 库存不足/非法数量的拒绝路径
- commit 后：
  - 库存扣减
  - sales order deliveredQty 更新
  - sales order 状态重算

#### 3) `purchase-order`
建议优先补：

- `server/services/purchase_order_flow.go`
- `server/services/purchase_receipt_service.go`
- `server/services/workflow_document_sync_service.go`

最小断言建议：

- `Draft / Sent / Awaiting / Received / Canceled` 状态规则稳定
- workflow 批准后 `Draft -> Sent`
- receipt 后 `Awaiting / Received`
- 移除前端状态扩散后，后端仍能提供正式主状态来源

### 四、预计改动文件（待确认后实施）
优先改测试文件，不碰业务实现，除非为补测试可达性必须做最小导出或最小可测性调整。

预估涉及：

- `server/services/*_test.go`
- 视情况少量补充：
  - `server/handlers/*_test.go`

### 五、实施顺序建议

#### Phase A：先补 services 层纯规则测试
- 先锁住状态规则本身；
- 这类测试最稳定、最便宜。

#### Phase B：再补关键事务联动测试
- `shipment commit -> inventory + sales-order`
- `purchase receipt -> received_qty + purchase-order status`

#### Phase C：仅在必要时补 handler 语义测试
- 例如 delete/取消的 handler 语义
- 不默认扩散到所有 handler。

### 六、风险与注意事项
1. 若一次性追求“测试全覆盖”，范围会迅速失控。
2. 若为了写测试而大改业务实现，会偏离本轮“最小护栏”的目标。
3. 应优先锁住 authoritative 规则与关键事务联动，而不是 UI 无关的普通 CRUD。

### 七、验证要求
待实施阶段至少执行：

```bash
pnpm build
```

并补充最小后端测试验证，例如：

```bash
go test ./server/services ./server/handlers -run "SalesOrder|Shipment|PurchaseOrder"
```

如测试命令需按现有测试组织微调，再以最小真实可运行命令为准。

### 八、明确不做事项
- 不在本轮发起全仓库测试重构；
- 不补与本轮真相边界治理无关的大量 handler 测试；
- 不为了测试方便反向修改业务边界设计。

## `purchase-service.ts` 前端状态扩散清理专项（2026-04-07，待确认）

### 一、当前结论
当前 purchase-order 真相边界体检确认：`src/features/trading/services/purchase-service.ts` 中存在一段局部前端状态扩散残留。

当前已确认的前端越界点：

1. `savePurchaseOrder(...)`
   - 当前会在前端对 `Canceled / Received` 状态执行主表到明细的状态扩散：
     - `order.lines = order.lines.map(line => ({ ...line, status: targetStatus }))`

这说明 purchase-order 虽未发展成完整前端状态机，但前端仍残留一段对正式明细状态的补丁式派生逻辑。

### 二、当前后端承接现状
purchase-order 链的后端 authoritative flow 已基本存在：

1. `workflow_document_sync_service.go`
   - 工作流审批通过后负责：
     - `Draft -> Sent`
2. `purchase_order_flow.go`
   - 负责采购单正式主状态重算：
     - `Draft / Sent / Awaiting / Received / Canceled`
3. `purchase_receipt_confirm_service.go` / `purchase_receipt_service.go`
   - 负责收货确认、`received_qty` 更新与收货后的状态重算。

这意味着 purchase-order 的正式状态规则主干并不在前端，前端残留的状态扩散更像历史补丁，应优先清理而不是继续保留双轨定义。

### 三、本轮目标
本轮不做大专项，只做一个小范围清理：

1. 去掉前端 `Canceled / Received -> lines.status` 的本地扩散；
2. 确认后端现有 authoritative flow 是否已足以承接；
3. 仅在发现后端缺少明细状态同步时，做最小补位。

### 四、拟调整的职责边界

#### 前端保留
- 提交采购单表单数据；
- 显示状态与工作流结果；
- 提交 receipt / delete 等用户意图。

#### 后端接管
- 工作流审批后的正式状态推进；
- 收货后主状态重算；
- 如有需要，明细正式状态的统一派生。

### 五、预计改动范围（待确认后实施）

#### 前端
- `src/features/trading/services/purchase-service.ts`

#### 后端
- 默认不改
- 仅在确认 purchase-order 明细状态在后端没有正式派生来源时，最小补：
  - `server/services/purchase_receipt_service.go`
  - 或 `server/handlers/purchase_orders.go` 的保存/更新路径

### 六、实施顺序建议

#### Phase A：先移除前端状态扩散
- 从 `purchase-service.ts` 删除：
  - `Canceled / Received -> lines.status` 的前端同步逻辑。

#### Phase B：验证后端 authoritative flow 是否足够
- 检查：
  - workflow 批准后 `Draft -> Sent`
  - receipt 后 `Awaiting / Received`
  - delete / cancel 场景下是否已有正式后端来源。

#### Phase C：仅在必要时补最小后端派生
- 如果去掉前端扩散后，发现明细正式状态缺少 authoritative source，再做最小补位；
- 不扩大为 purchase 全链重构。

### 七、风险与注意事项
1. 若直接删掉前端状态扩散，而后端又没有正式明细状态派生，可能会暴露历史依赖。
2. 若把本轮扩散到 purchase 页面、receipt UI、workflow UI，会超出“小专项清理”的边界。
3. 若继续保留前端补丁式扩散，后续后端规则演进时仍会发生双轨漂移。

### 八、验证要求
待实施阶段至少执行：

```bash
pnpm build
```

并补充 purchase-order 定向验证：

- 保存 Draft
- workflow 审批后状态变化
- confirm receipt 后 `Awaiting / Received` 变化
- 前端不再本地扩散明细状态后，列表/详情展示仍正确

### 九、明确不做事项
- 不在本轮同时重构全部 purchase-order 页面与 hooks；
- 不把本轮扩大成 purchase / inbound / finance 联动全链重写；
- 不在没有证据时引入新的 command 路由或大范围后端改造。

## `warehouse / shipment` 真相边界后迁专项（2026-04-07，待确认）

### 一、当前结论
当前真相边界体检已确认：`src/features/warehouse/hooks/use-shipment.ts` 中仍存在前端承担库存裁决与状态推进的问题。

当前高风险越界点包括：

1. `submitShipment(...)`
   - 在前端使用 `categoryStock` 快照判断 `COMMITTED` 是否允许提交；
2. `commitDraft(...)`
   - 前端直接通过 patch 推进 `status: DRAFT -> COMMITTED`；
3. `removeRecord(...)`
   - 前端对 draft / committed 记录执行不同语义路径，需确认是否应进一步后迁。

这说明 shipment 链中，前端仍在用本地快照和前端 patch 参与最终业务裁决。

### 二、本轮目标
本轮不扩散到全部 warehouse 域，只聚焦 shipment 链，将：

1. commit 前库存裁决从前端后迁到后端；
2. `DRAFT -> COMMITTED` 状态推进从前端 patch 改为后端 authoritative command；
3. 前端降级为提交意图、显示提示与消费 authoritative result。

### 三、拟调整的职责边界

#### 前端保留
- 填写出库表单；
- 基于当前快照给出风险提示；
- 提交 commit/void 意图；
- 显示后端返回的成功/失败结果。

#### 后端接管
- 最终库存是否足够的事务内校验；
- `CommitShipment(...)` 的正式状态推进；
- 扣库存、联动销售订单、更新交付进度与状态回写；
- 冲突、库存不足、非法状态的正式拒绝理由。

### 四、当前后端承接现状
当前后端并非空白，已存在较好的 authoritative 基础：

- `inventory_command_service.go` 中已有 `CommitShipment(...)`
- 提交出库后，后端会：
  - 更新出库记录状态
  - 扣减库存
  - 联动销售订单交付数量
  - 重算销售订单状态

这说明本轮重点不是新发明后端状态机，而是把前端调用链切回现有 authoritative command。

### 五、预计改动范围（待确认后实施）

#### 前端
- `src/features/warehouse/hooks/use-shipment.ts`
- 如有必要，联动：
  - `src/features/warehouse/services/inventory-service.ts`
  - `src/features/warehouse/tabs/product-shipment.tsx`

#### 后端
- 仅在发现 `CommitShipment(...)` 的错误返回、状态校验或 void 语义存在缺口时，做最小补齐

### 六、实施顺序建议

#### Phase A：切断前端状态推进
- `commitDraft(...)` 改为直接调用 `inventoryService.commitShipment(id)`；
- 不再由前端 patch `status: DRAFT -> COMMITTED`。

#### Phase B：收口前端库存裁决
- `submitShipment(...)` 中 `quantity > categoryStock` 从阻断裁决降级为风险提示；
- 最终 commit 成败以后端事务内库存校验为准。

#### Phase C：复核 void/remove 语义
- 判断 `removeRecord(...)` 是否仍存在前端语义分流；
- 如有必要，进一步收口到后端 authoritative action。

### 七、风险与注意事项
1. 若前端仍保留“本地阻断 + 后端再校验”的双轨模式，真相边界问题不会完全消失。
2. 若后端 `CommitShipment(...)` 的错误返回不够清晰，前端切回 authoritative command 后用户体验可能退化，需补清晰错误提示。
3. 若一次性扩散到 inbound / stocktake / adjustment，范围会失控。

### 八、验证要求
待实施阶段至少执行：

```bash
pnpm build
```

并补充 shipment 定向验证：

- draft 提交 commit
- 库存不足时后端正式拒绝
- committed 记录联动库存与 sales order 交付进度
- void/remove 在 draft / committed 两种状态下的行为

### 九、明确不做事项
- 不在本轮同时重构全部 warehouse 模块；
- 不保留“前端 patch 状态 + 后端 authoritative command”长期双轨模式；
- 不把本轮扩大成 Redis / 实时链 / 分布式库存锁改造。

## `trading-service.ts` 前端状态机后迁专项（2026-04-07，待确认）

### 一、当前结论
当前真相边界体检已确认：`src/features/trading/services/trading-service.ts` 中存在前端 service 越界承担业务状态机的问题。

当前前端仍在本地执行的高风险逻辑包括：

1. `saveSalesOrder(...)`
   - 根据主表状态批量推导明细状态；
2. `deleteSalesOrder(...)`
   - 在前端决定“物理删除”还是“取消单据”；
3. `claimOrderLine(...)`
   - 在前端根据 claim 完成度推进主表状态；
4. `updateOrderDelivery(...)`
   - 在前端根据 deliveredQty 推进行状态，再进一步推导主表状态。

这说明当前 trading 前端 service 已不是单纯传输层，而是承担了 authoritative business state transition 的一部分。

### 二、本轮目标
本轮不直接扩散到整个 trading 域，只聚焦把 `trading-service.ts` 中越界的前端状态机逻辑识别并后迁到后端 authoritative path。

目标如下：

1. 前端不再决定销售订单主表/明细状态如何推进；
2. 前端不再决定“删除 vs 取消”最终语义；
3. 前端保留输入意图、delta 提交与展示反馈；
4. 后端成为销售订单状态流转的单一事实来源。

### 三、拟调整的职责边界

#### 前端保留
- 收集用户操作意图；
- 提交显式 command 或 SDRTS delta；
- 做 UI 级提示、表单校验与结果展示；
- 根据后端返回结果刷新缓存与页面状态。

#### 后端接管
- 主表状态与明细状态的最终推进；
- 删除/取消语义裁决；
- claim / delivery 等动作触发后的状态机流转；
- 版本冲突后的正式拒绝或合并策略。

### 四、预计改动范围（待确认后实施）

#### 前端
- `src/features/trading/services/trading-service.ts`
- 视后端 contract 变化，可能联动：
  - `src/features/trading/hooks/use-trading.ts`
  - 个别 trading 页面/弹窗调用点

#### 后端
- 对应 sales order 的 handler / service / route
- 如当前缺少正式 command / action route，最小范围补齐 authoritative endpoint

### 五、实施顺序建议

#### Phase A：先切断前端状态机
- 从 `trading-service.ts` 中识别所有“本地推导最终状态”的逻辑；
- 改为提交 command 或最小必要 delta，而不是在前端先完成状态演算。

#### Phase B：后端补 authoritative action
- 让后端 service/handler 成为：
  - claim action
  - cancel/delete action
  - delivery update action
  的单一执行入口。

#### Phase C：前端改为消费 authoritative result
- 前端拿后端返回的正式订单状态刷新页面；
- 不再用本地 service 拼出最终状态再写回。

### 六、风险与注意事项
1. 若一次性扩散到 purchase / supplier / shipment 等全部链路，范围会失控。
2. 若后端还没有对应 command 入口，前端切掉本地状态机后需同步补 authoritative action，不能形成能力真空。
3. 若保留“前端先算状态、后端再兜底”的双轨模式，真相边界问题不会真正消失。

### 七、验证要求
待实施阶段至少执行：

```bash
pnpm build
```

并补充对应 trading 定向验证：

- 销售订单 claim
- 销售订单取消/删除
- delivery 更新后主表/明细状态变化
- 版本冲突与失败提示

### 八、明确不做事项
- 不在本轮同时重构全部 trading 模块；
- 不保留“前端状态机 + 后端再兜底”的长期双轨模式；
- 不把本轮扩大成全域微服务拆分或事件总线改造。

## 三类共享根因的可复用约束沉淀方案（2026-04-07，待确认）

### 一、目标判断
当前 `pnpm build` 已恢复通过，但这并不意味着三类共享根因已经从机制上被消除。

如果不进一步沉淀可复用约束，后续仍会反复出现：

1. schema 新增正式字段后，默认值工厂/样例常量/页面初始化继续分叉；
2. 表单子组件继续自行声明局部 `UseFormReturn<X>`，在 build 模式下再次爆出泛型断裂；
3. 业务组件继续直接散写 vendor options，随着依赖或类型边界变化再次暴露不一致。

因此下一阶段目标不是“继续修眼前错误”，而是把这三类根因沉淀为团队内可复用约束。

### 二、约束一：统一默认值 builder

#### 目标
为领域对象建立明确的默认值 builder / draft factory，承接：

- 新建态初始对象
- 样例常量初始对象
- 必要正式默认字段（如 `version`、`createdAt`）
- 局部 `normalizeXxx(...)` 的共同基础形态

#### 拟落地方式
优先从已暴露问题的 `engineering` 域开始：

- `src/features/engineering/utils/`
  - 继续收口或拆分 `buildDefaultProductValues(...)`
  - 新增/整理 `ProductTemplate`、`ChangeOrder`、`Routing` 的 builder / draft factory
- 样例常量与页面初始化对象优先改为复用 builder，而不是各自裸写。

#### 约束原则
- schema 演进后，正式字段默认值不允许再分散定义在页面、样例、局部 normalize 中；
- 页面层允许补业务特有临时字段，但核心正式字段必须来自 builder。

### 三、约束二：统一表单子组件 contract 模式

#### 目标
避免子组件继续依赖整份 `UseFormReturn` 并自行窄化成局部模型。

#### 推荐模式
默认采用字段级 contract：

- `value`
- `onChange`
- 或最小必要字段集合

只有真正的通用表单容器/布局组件，才允许依赖整份 `form`，且必须与父层共享同一正式泛型边界。

#### 拟落地方式
优先从已出现问题的链路开始整理规范：

- `src/features/engineering/components/product/production-restrictions.tsx`
- 继续抽查同类 `*-form-section` / `*-restrictions` / `*-tags` 组件
- 总结出“字段级 contract 优先、整份 form 为例外”的约束模板

#### 约束原则
- 子组件不应再自行发明一个更窄的整份 `UseFormReturn<X>`；
- `react-hook-form + zodResolver` 的正式泛型边界应在父层统一收口。

### 四、约束三：统一第三方 adapter 模式

#### 目标
让业务组件不再直接面向 vendor 原始 options / config，而是依赖项目内部稳定适配层。

#### 拟落地方式
优先从本轮已暴露问题的条码/二维码链开始：

- 在 `src/lib/` 或相关 feature 的 `services/utils` 中建立最小 adapter/helper；
- 对外暴露项目内稳定配置面；
- 对内对齐第三方正式类型与能力边界。

后续其他易受第三方类型变化影响的能力（如导出、图表、二维码等）也按相同模式推进。

#### 约束原则
- vendor 原始 options 不应在业务 UI 组件里散写；
- 业务层只依赖项目内稳定参数，不直接承担第三方 contract 演进风险。

### 五、实施批次建议

#### Phase A：先在 `engineering` 域做默认值 builder 试点
- 以当前已暴露问题的 `Product` / `ProductTemplate` / `ChangeOrder` / `Routing` 为第一批。

#### Phase B：整理字段级 form contract 模板
- 先沉淀一个可复用模式，再按需替换其它同类子组件。

#### Phase C：建立最小 vendor adapter 试点
- 先做条码/二维码渲染链；
- 不一次性扩散到所有第三方库。

### 六、风险与注意事项
1. 若默认值 builder 抽象过度，可能把不同对象的业务差异硬塞进同一个工厂，反而增加维护复杂度。
2. 若表单 contract 治理范围失控，容易扩散成全项目表单重构。
3. 若 vendor adapter 一次性包太多能力，会把“边界收口”演变成“基础设施重写”。
4. 本阶段目标是沉淀约束与首批试点，不是一次性改造全仓库。

### 七、明确不做事项
- 不在本轮直接扩散修改所有 feature 的默认值来源；
- 不把全部表单子组件统一重写成单一模式；
- 不对所有第三方依赖一次性建立大而全 adapter 层；
- 不脱离本轮已验证问题去做纯理论重构。

## 本轮 `pnpm build` 多点报错的共享根因分析（2026-04-07，待确认）

### 一、当前判断
本轮 `pnpm build` 新暴露的报错，并非完全随机的单点故障，而是两类因素叠加后的结果：

1. **历史欠账集中显形**
   - 根目录日常检查与 `tsc -b` / `pnpm build` 口径不一致；
   - 多轮迭代中未被完全覆盖的边界问题，在真实 build 模式下被统一展开。

2. **共享架构边界缺口持续外溢**
   - 当前错误虽然分布在 `basic-settings`、`engineering`、表单组件与样例常量中，但可归并为少数几类共享根因，而不是彼此无关的巧合。

### 二、三类主根因

#### 根因 A：schema 演进后，消费层缺少单一事实来源
表现为：
- schema 已新增/正式化 `version`；
- 默认值工厂、页面初始化对象、样例常量、局部 normalize 逻辑仍各自手写；
- 最终出现：
  - `version` 缺失
  - `_v` 残留
  - 推断过窄/`never`

这说明当前问题并不只是字段没补，而是**schema -> default builder -> sample data -> page state** 没有形成单向 authoritative 链路。

#### 根因 B：`react-hook-form + zodResolver + 子组件 form props` 缺少统一 contract 策略
表现为：
- 父组件使用完整领域模型创建 `form`；
- 子组件自行声明更窄的 `UseFormReturn<X>`；
- 局部还存在 `zodResolver(...) as any` 之类历史写法；
- 一旦切到 `tsc -b`，就集中暴露为：
  - `UseFormReturn` 不兼容
  - `watch/control/handleSubmit` 泛型错位

这说明当前真正问题不是单个表单字段，而是**表单体系没有统一的泛型收口规则**。

#### 根因 C：第三方库边界未封装，业务层直接写 vendor options
表现为：
- 业务组件直接面向第三方 `RenderOptions` 写配置；
- 实际使用的是经验字段，而不是当前正式类型支持字段；
- 最终在严格 build 下暴露为 vendor type mismatch。

这说明项目对第三方库缺少本地 adapter / wrapper，导致“运行经验写法”与“正式类型 contract”脱节。

### 三、哪些是症状，不是根因
以下现象应视为表层症状，而非最终根因：

- `version` 缺失
- `_v` 残留
- `never` 推断
- `UseFormReturn<大对象>` 不能传给 `UseFormReturn<小对象>`
- 第三方 options 上个别字段不存在

这些错误会不断换文件出现，但如果不先收口上游模式，修一处还会在别处继续冒出。

### 四、后续修复顺序建议

#### Phase A：schema consumer 收口
目标：
- 默认值工厂
- 样例常量
- 页面初始化对象

原则：
- 尽量从统一 builder / draft factory 出发；
- 不再让核心字段在多个页面裸写。

#### Phase B：form contract 收口
目标：
- 为 `useForm`、`zodResolver`、子组件 `form` props 建立统一泛型策略；
- 子组件尽量依赖字段级 contract，而不是自行声明更窄 `UseFormReturn<X>`。

#### Phase C：vendor adapter 收口
目标：
- 第三方 options 不直接散落在业务组件中；
- 通过本地 wrapper 或正式配置帮助函数固化合法字段。

### 五、明确不做事项
- 不把当前所有 build 报错当作随机孤立 bug 逐条补丁式修复；
- 不在未归类根因前继续扩散到全仓库重构；
- 不以 `as any`、`as unknown as` 继续压制表单或第三方类型边界；
- 不把本轮分析误扩成全项目架构重写。

## `engineering` 域 `version/_v` 契约漂移修复方案（2026-04-07，已确认）

### 一、当前结论
`pnpm build` 已确认不再停在 `mold-loan-action-dialog.tsx`，新的真实阻塞已经转移到 `src/features/engineering` 域。


1. `engineering` 相关 schema 已将 `version` 作为正式字段；
2. 页面初始化对象、样例数据与编辑默认值仍存在：
   - 缺失 `version`
   - 残留旧 `_v`

这说明当前问题不是单个页面拼写错误，而是 `engineering` 域在 `version` 契约统一后仍未完成消费层同步收口。

### 二、本轮目标
本轮只处理 `engineering` 域当前 `pnpm build` 暴露的真实阻塞：

1. 为缺失 `version` 的初始化对象与样例数据补齐正式字段；
2. 清退 `change-orders.tsx` 中残留的 `_v` 旧字段；
3. 保持 `engineering` 当前业务语义不变；
4. 以 `pnpm build` 作为最终验收标准。

### 三、实施顺序

#### Phase A：补齐缺失 `version` 的初始化对象/样例数据
涉及重点：
- `src/features/engineering/components/product/product-routing-view.tsx`
- `src/features/engineering/tabs/template-mgmt.tsx`

处理原则：
- 不新增兼容壳；
- 直接对齐正式 schema 要求；
- 保持默认对象现有业务语义不变，仅补齐正式字段。

#### Phase B：清退 `_v` 旧字段
涉及重点：
- `src/features/engineering/tabs/change-orders.tsx`

处理原则：
- 统一改回 `version`；
- 不保留 `_v` / `version` 双轨长期兼容；
- 保持原有创建/编辑流程不变。

### 四、关键风险
1. 若默认对象 `version` 补值位置不一致，可能导致局部编辑/新建初始值语义漂移。
2. 若 `_v` 直接替换为 `version` 时遗漏旧读取点，可能继续触发构建错误。
3. 本轮只处理 build 当前真实阻塞，不扩散为 `engineering` 全域重构。

### 五、验证要求
本轮至少执行：

```bash
pnpm build
```

必要时补充：

```bash
pnpm exec eslint src/features/engineering/components/product/product-routing-view.tsx src/features/engineering/tabs/template-mgmt.tsx src/features/engineering/tabs/change-orders.tsx
```

### 六、明确不做事项
- 不将本轮扩展成 `engineering` 域全量重构；
- 不重新引入 `_v` 兼容字段；
- 不因为 schema 要求而改动页面业务流程与默认交互语义。
