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
3. 工位 / 工序能力映射（mappings）

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

1. 将 `productionLinesService / productionProcessesService / productionMappingsService` 纯化为**只负责数据请求与协议转换**的 service。
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
   - `productionMappingsService`
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

1. `productionLinesService / productionProcessesService / productionMappingsService` 内不再直接执行 `window.dispatchEvent(...)`。
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

1. 为 `lines / processes / mappings` 建立统一 query key 命名入口。
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
     - `productionResourceQueryKeys.mappings()`

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
   - 统一 lines / processes / mappings 的 query key 结构。
   - 要求 key 命名稳定、可预测、可复用。

2. **建立统一 invalidation 入口**
   - 统一封装：
     - invalidate lines
     - invalidate processes
     - invalidate mappings
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
   - 后续若将 lines / processes / mappings 全量迁入 `useQuery`，应直接复用本轮的 query key 工厂与 invalidation helper，而不是重新发明命名规则。

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

1. 为 lines / processes / mappings 提供稳定的 query options 或最小 hooks 入口。
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
   - 让 lines / processes / mappings 的读取逻辑统一基于第三阶段 query key 工厂。
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
