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
