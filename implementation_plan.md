# DTO 全局接入审计与分级治理实施计划

日期：2026-04-09  
状态：待批准

## 1. 目标

本轮目标不是零散地找几个“没上 DTO”的接口逐个补洞，而是建立一套**可全仓复用的 DTO 审计与分级治理框架**，用于系统性回答三个问题：

1. 当前仓库里哪些链路已经真正完成 DTO 分层。
2. 哪些链路只是局部用了 `Request` / `Response` / `DTO` 命名，但本质仍在透传 `models.*`。
3. 哪些模块属于高风险直通链路，应优先治理。

本轮需要沉淀的不是单一文件修改方案，而是一个**全局方法论 + 分类标准 + 推进顺序**，为后续执行轮提供统一依据。

## 2. 当前已确认事实

### 2.1 仓库内 DTO 现状是“并存态”，不是二元态

当前扫描已确认，项目中至少存在三类并存形态：

1. **完整 DTO 链**：存在明确请求/响应 DTO，且有 model 与 DTO 映射函数，典型如 `server/services/production_dto.go`、`server/services/production_process_dto.go`。
2. **半 DTO 链**：某些链路只在请求侧或响应侧做了结构包装，但仍有一端直接暴露实体或把 model 当输入。
3. **模型直通链**：`handler` 直接 `ShouldBindJSON(&models.X)`，或保存后直接 `c.JSON(..., model)` 回传实体。

因此，本轮不能只做“有没有 `*DTO` 文件”的表面统计。

### 2.2 局部模块已经具备较完整样板

以生产拓扑/工艺链路为例，当前已确认：

1. 存在 `ProductionLineDTO`、`ProcessStepDTO`、`LineSegmentDTO` 等独立结构。
2. 存在请求响应包装结构，如 `SaveProductionLineHandlerRequest`、`ProcessStepsResponse`。
3. 存在 `mapXxxToDTO` 与 `mapXxxDTOToModel` 显式映射函数。

这说明仓库内并不是没有可复用样板，而是尚未形成统一强制规则。

### 2.3 多个 handler 仍可能存在模型直通或半直通模式

当前已明确发现：

1. `server/handlers/customers.go` 中 `SaveCustomerHandler` 直接绑定 `models.Customer`。
2. 同一链路在成功保存后直接返回 `input`，说明响应侧也未做独立出站 DTO 隔离。
3. `server/handlers` 中仍广泛分布 `ShouldBindJSON` / `BindJSON`，需要结合绑定目标类型进一步识别是否为直通风险。

这说明 DTO 审计必须以**链路穿透**方式进行，而不是只看命名。

## 3. DTO 审计的全局定义

### 3.1 什么叫“已接入 DTO”

一个接口链路只有同时满足以下条件，才应判定为“已接入 DTO”：

1. **入站隔离**：HTTP 请求绑定目标不是数据库实体 `models.*`，而是独立的 request/input 结构。
2. **服务隔离**：service 入参/出参不直接暴露 ORM model 作为跨层契约。
3. **出站隔离**：HTTP 响应返回的不是数据库实体原样，而是独立 response/output 结构。
4. **映射显式**：存在清晰的 model <-> DTO 转换位置，而不是隐式共用同一个结构体。
5. **前端契约独立**：前端 service/type 不以“后端数据库实体字段长什么样”为默认事实源直接消费。

只满足其中一部分的，不应记为“已完成 DTO 化”。

### 3.2 什么叫“半接入 DTO”

满足以下任一情况，应归类为“半接入”：

1. 请求侧用了 request struct，但响应仍直接返回 model。
2. 响应侧做了 response 包装，但入站仍直接绑定 `models.*`。
3. service 层签名仍直接暴露 `models.*`，只是 handler 外层包了 request/response。
4. 前端定义了 type/interface，但只是机械镜像后端实体字段，没有形成领域/页面侧 contract。

### 3.3 什么叫“未接入 / 伪 DTO”

满足以下情况之一，应判定为“未接入或伪 DTO”：

1. 直接 `ShouldBindJSON(&models.X)`。
2. 直接 `c.JSON(..., model)` 或返回 `[]models.X`。
3. 只是把 `models.X` 嵌入一个 `XxxRequest`/`XxxResponse` 外壳，并未真正隔离。
4. 所谓 DTO 结构与数据库实体一比一耦合，且无映射边界、无裁剪意图、无契约独立性。

## 4. 审计维度：按链路五层扫描

本轮建议使用统一的“五层 DTO 审计模型”，避免后端只看 handler、前端只看 type，导致统计失真。

### 4.1 第一层：HTTP 入站层

关注点：

1. `handler` 的 `ShouldBindJSON` / `BindJSON` 绑定目标类型是什么。
2. 是否存在 `models.*` 直接作为入站载体。
3. request struct 是否只是实体壳子，还是具备独立字段约束。

### 4.2 第二层：服务边界层

关注点：

1. `service` 的公开入参/出参是否仍直接暴露 `models.*`。
2. service 是否承担显式 mapping，而不是把 model 直接透传给 handler。
3. patch/save/update 链路是否以领域输入结构承载，而不是 ORM 实体全字段覆盖。

### 4.3 第三层：持久化/模型层

关注点：

1. ORM model 是否只停留在 repository/db 层。
2. model 是否被直接复用为 API contract。
3. 是否存在 `Select("*").Updates(input)` 之类基于实体直通的更新模式，暗示缺失显式输入模型。

### 4.4 第四层：HTTP 出站层

关注点：

1. `c.JSON` 的返回结构是什么。
2. 是否存在直接回传实体、实体数组、带敏感字段/内部字段的风险。
3. list/detail/save/patch 响应是否都具备独立的 response/output 契约。

### 4.5 第五层：前端契约消费层

关注点：

1. 前端 `services / data / types` 是否以页面/领域 contract 消费接口，而不是默认镜像后端实体。
2. 是否存在前端直接假设后端实体字段、版本字段、内部状态字段原样透出。
3. 是否形成“前端 DTO / schema / view model”与后端 response 的清晰转换边界。

## 5. 审计结果的分级规则

### 5.1 A 级：完整 DTO 链（可作为样板）

判定条件：

1. 请求、服务、响应三侧均已独立。
2. model 不直接穿透到 handler 与前端。
3. 有明确 mapping 函数或等价转换层。

用途：沉淀为后续治理样板。

### 5.2 B 级：半接入链（需要结构补齐）

判定条件：

1. 请求/响应/服务三者只完成了一部分。
2. 已出现局部 DTO 命名，但边界尚未闭环。

用途：优先按最小破坏面补全，通常比 C 级更容易收口。

### 5.3 C 级：模型直通链（高优先级治理）

判定条件：

1. 入站直接绑定 `models.*`。
2. 出站直接返回实体。
3. service/handler 以实体作为 API 契约主载体。

用途：列入首批治理范围，因为风险最高。

### 5.4 D 级：伪 DTO 链（最容易误判）

判定条件：

1. 文件/类型名看似 DTO，但只是对实体做机械转发。
2. 缺少明确 mapping 与边界治理价值。

用途：在统计时单独标记，避免“看起来做了，其实没隔离”的虚假完成率。

## 6. 高风险识别规则

本轮建议把以下模式直接标记为高风险 DTO 缺失信号：

1. `handler` 直接 `ShouldBindJSON(&models.X)`。
2. `handler` 直接 `c.JSON(..., model)` / `c.JSON(..., items)` 且 `items` 为实体集合。
3. service 公开方法签名直接返回 `models.X` / `[]models.X`。
4. update/save 链路直接对 ORM 实体做全字段覆盖，缺少独立 update payload。
5. 前端直接围绕后端实体字段构建页面表单、列表、详情，而没有单独 schema/contract。

这些模式即使当前功能可运行，也应视作架构债高风险点。

## 7. 批准后的建议实施顺序

### Step 1：产出全量清单

输出至少包括：

1. 模块名。
2. 路由/handler。
3. 请求侧分类。
4. 服务侧分类。
5. 响应侧分类。
6. 前端 contract 分类。
7. 最终等级（A/B/C/D）。

### Step 2：优先治理 C 级链路

优先关注三类高风险路径：

1. 请求直接绑定 model。
2. 响应直接回传 model。
3. 前端直接消费实体结构。

### Step 3：收口 B 级与 D 级链路

1. B 级优先补闭环，使已有 DTO 化工作真正闭环。
2. D 级优先去伪存真，避免指标自欺。

### Step 4：固化新增接口准入规则

后续新增接口应在开发阶段即满足 DTO 审计标准，而不是继续先直通、后补票。

## 8. 涉及范围（规划阶段）

后端重点目录：

1. `server/handlers`
2. `server/services`
3. `server/models`
4. `server/routes`
5. `server/repositories`（如存在）

前端重点目录：

1. `src/features/**/services`
2. `src/features/**/data`
3. `src/features/**/types`
4. `src/lib/api-client.ts` 及相关 contract 封装

文档侧：

1. `task.md`
2. `implementation_plan.md`
3. `walkthrough.md`

## 9. 风险与注意事项

### 9.1 “按命名统计”会严重失真

如果只统计 `DTO`、`Request`、`Response` 名称，会把大量伪 DTO 或半接入链误判为已完成。

### 9.2 只做后端半边治理会再次漂移

如果后端补了 request/response DTO，但前端仍直接依赖数据库实体形态，契约边界仍不稳定。

### 9.3 一刀切改造风险高

DTO 缺失可能覆盖大量模块；若没有先分级，很容易进入“大面积机械替换”并引发回归。

### 9.4 DTO 不等于字段越多越好

DTO 的目标是建立边界、裁剪契约、隔离内部模型，而不是单纯复制一份和数据库一样的字段表。

## 10. 批准后的最小验收标准

1. 产出全仓 DTO 审计清单与 A/B/C/D 分级结果。
2. 明确至少一批高风险 C 级链路作为首批治理目标。
3. 形成统一的“已接入 / 半接入 / 未接入 / 伪 DTO”判定口径。
4. 后续执行时可按该口径持续复用，不再依赖人工记忆逐个碰运气。

## 11. 已批准的首批实施范围

你已确认首批 DTO 样板治理范围固定为三处 C 级 handler：

1. `server/handlers/workflow_routing.go`
2. `server/handlers/quality.go`
3. `server/handlers/warehouse_category.go`

本轮不扩散到：

1. `server/services/organization_service.go`
2. `customers / suppliers / users` 的半接入链
3. 大规模 service 层签名重构

## 12. 首批实施策略

首批三处统一采用同一收口策略：

1. 为每个子域补独立 request / response struct。
2. handler 不再直接 `ShouldBindJSON(&models.X)`。
3. 列表与详情响应不再直接回传 `[]models.X` 或 `models.X`。
4. 显式引入 `model -> response` 映射函数。
5. 保持现有路由、字段名与主要业务语义尽量不变，优先做边界收口而非业务重写。

## 13. 首批样板的验收口径

完成后至少满足：

1. `workflow_routing` 不再直接绑定或返回 `models.StandardCommand` / `models.NotificationRule`。
2. `quality` 不再直接绑定或返回 `models.InspectionStandard` / `models.InspectionTask` / `models.QualityAbnormality`。
3. `warehouse_category` 不再直接绑定或返回 `models.WarehouseCategory`。
4. 三处样板具备统一风格的 request / response / mapper 结构。
5. `walkthrough.md` 记录本轮样板化结果与后续复制建议。

## 14. 第二批已启动范围

当前已启动第二批 DTO 治理，范围固定为三条半接入链：

1. `server/handlers/customers.go`
2. `server/handlers/suppliers.go`
3. `server/handlers/users.go`

## 15. 第二批治理目标

第二批目标不是从零搭样板，而是把第一批 handler DTO 样板复制到半接入链中仍残留的高风险入口：

1. save/create/update 仍直接绑定 `models.*` 的入口。
2. options/list 仍直接返回实体集合的入口。
3. bulk sync 仍直接接收 `[]models.*` 或返回实体直通结果的入口。

本轮暂不扩散到 `organization_service` 的 service 层签名改造。

## 16. 第三批已批准范围

当前已批准第三批 DTO 治理，范围固定为：

1. `server/services/organization_service.go`
2. `server/services/org_personnel_patch_service.go`
3. `server/handlers/org_handlers.go`
4. `server/handlers/employee_handlers.go`

## 17. 第三批治理目标

第三批不再以 handler DTO 为唯一主战场，而是优先收口 `organization_service / org-personnel` 的 service 边界：

1. 不再以 `models.Organization` / `models.Employee` 作为公开 save / bulk sync 契约。
2. 为 organization / employee 建立独立 service request / response / bulk sync DTO。
3. 引入显式 mapper，确保 service 与 ORM model 的边界清晰。
4. 在 service DTO 收口后，再让 `SaveOrgHandler`、`SaveEmployeeHandler`、`BulkSyncOrgHandler`、`BulkSyncEmployeesHandler` 接入新 DTO。

## 18. 第三批验收口径

完成后至少满足：

1. `SaveOrganization`、`SaveEmployee`、`BulkSyncOrganizations`、`BulkSyncEmployees` 不再公开暴露 `models.*` 作为输入输出契约。
2. `SaveOrgHandler`、`SaveEmployeeHandler` 不再直接 `ShouldBindJSON(&models.Organization)` / `ShouldBindJSON(&models.Employee)`。
3. `org-personnel` 主链形成 service DTO + handler DTO 的双层边界。
4. `walkthrough.md` 明确记录 service DTO 收口方案与验证口径。

## 19. sales_orders PATCH 残留清理（待确认）

该轮不是新的 DTO 扩面，而是为销售单 hard-cut 做最小残留清理，范围限定为：

1. `server/handlers/sales_orders.go`
2. 与其直接相关的最小调用面 / 编译面

### 目标

1. 清除对已删除 `services.PatchSalesOrderRequest` 的残留引用。
2. 清除对已删除 `services.MapPatchSalesOrderRequestToModel` 的残留引用。
3. 恢复 `go test ./handlers -run ^$` 的编译通过前提。

### 明确不做的事

1. 不恢复 `PATCH /sales-orders/:id` 路由。
2. 不重新引入 sales order PATCH DTO。
3. 不回滚此前已确认的 sales order hard-cut 设计。

---

# 按模块 / 五层链路输出 DTO 现状总表实施计划

日期：2026-04-09  
状态：待批准

## 1. 目标

本轮目标不是继续直接挑几个接口补 DTO，而是先产出一份**按模块组织、按五层链路展开**的 DTO 现状总表，用统一格式回答以下问题：

1. 当前哪些模块已经形成较完整 DTO 链。
2. 哪些模块只完成了 handler 或 service 的局部收口，仍属于半接入态。
3. 哪些模块仍存在 model 直通或伪 DTO 风险。
4. 下一轮整体收口应按什么顺序推进，才能避免再次回到补丁式治理。

本轮需要沉淀的是一份**可直接支撑后续排期与分批执行的全局总表规范**，而不是立即进入新一轮代码修改。

## 2. 当前已确认事实

### 2.1 DTO 治理已从“是否存在样板”进入“是否覆盖全局”阶段

当前已确认：

1. DTO 审计口径、五层链路模型与 A/B/C/D 分级规则已经建立。
2. 后端已经完成三批治理，覆盖了 C 级 handler 样板、B 级半接入链和部分 service 边界收口。
3. 前端局部已经存在 `contract / adapter / gateway` 样板，但尚未形成全仓一致模式。

因此，当前问题已不再是“有没有做 DTO”，而是“DTO 做到哪些模块、卡在哪一层、下一轮该先收哪一批”。

### 2.2 当前缺的不是新规则，而是可执行的模块级台账

虽然现有文档已经定义了 DTO 的判断标准，但仍缺少一份统一总表来承接：

1. 模块名称与所属域。
2. 五层链路现状。
3. 当前综合等级。
4. 关键证据与断点。
5. 建议动作与优先级。

没有这份总表，后续执行仍容易退化为“看到哪个文件就先改哪个文件”。

## 3. 总表的组织方式

### 3.1 总表按“模块”而不是按“单文件”组织

总表主键不应是单个文件名，而应是**业务模块 / 子域模块**，例如：

1. `production-topology`
2. `workflow`
3. `quality`
4. `warehouse`
5. `partner`（customers / suppliers）
6. `users`
7. `org-personnel`
8. `trading`（sales-order / purchase-order）
9. `finance`（voucher 等）

必要时可在模块下再标注关键文件，但总表不应退化为逐文件清单。

### 3.2 每个模块统一按五层链路填写

每个模块都应至少包含以下五列：

1. **HTTP 入站层**
  - 是否仍直接绑定 `models.*`
  - 是否存在独立 request / handler DTO
2. **service 边界层**
  - public service 入参/出参是否仍暴露 `models.*`
  - 是否存在 service request / response DTO
3. **持久化 / 模型层**
  - model 是否仍被复用为 API contract
  - 更新链是否仍存在实体覆盖式直通
4. **HTTP 出站层**
  - 是否仍直接回传 `model / []model`
  - 是否存在独立 response / list response
5. **前端契约消费层**
  - 是否存在 API DTO / contract / adapter / gateway
  - 页面是否仍直接消费后端实体形态

## 4. 总表输出字段建议

建议总表至少包含以下列：

1. `模块`
2. `所属域`
3. `HTTP 入站`
4. `service 边界`
5. `持久化/模型`
6. `HTTP 出站`
7. `前端契约消费`
8. `综合等级`
9. `关键证据`
10. `主要断点`
11. `建议动作`
12. `下一轮优先级`

其中：

### 4.1 综合等级

沿用现有 A/B/C/D：

1. **A**：五层基本闭环，可作为样板。
2. **B**：局部 DTO 化，但仍有明显断点。
3. **C**：存在 model 直通主链，应优先治理。
4. **D**：存在伪 DTO 风险，需要去伪存真。

### 4.2 关键证据

必须记录真实证据，而不是抽象判断，例如：

1. `ShouldBindJSON(&models.Customer)`
2. `c.JSON(..., items)` 且 `items` 为 `[]models.Supplier`
3. `SaveOrganization(input models.Organization)`
4. `apiFetch<Employee[]>('/employees')` 且无 adapter / contract 分层

### 4.3 主要断点

用于回答“这个模块为什么还没闭环”，例如：

1. handler 已 DTO 化，但 service 仍暴露 model。
2. service 已 DTO 化，但前端仍直接吃实体结构。
3. 前端已有 contract，但后端响应仍直接回传 model。

## 5. 模块分组建议

为避免总表过散，建议先按域分组：

### 5.1 后端核心业务域

1. `production-topology`
2. `workflow`
3. `quality`
4. `warehouse`
5. `partner`（customers / suppliers）
6. `users`
7. `org-personnel`
8. `trading`（sales-order / purchase-order）
9. `finance`（voucher 等）

### 5.2 前端核心消费域

1. `org-personnel`
2. `trading`
3. `scan-platform / wheel-trace`
4. `system-management`
5. 其他直接消费 API 的 feature 域

### 5.3 共享基础设施 / 契约域

1. `src/lib/api-client.ts` 及相关 fetch contract 使用方式
2. `server/services/*_dto.go` / `*_mapper.go` 的样板分布
3. 前端 `contracts / adapters / gateway / schema` 的样板分布

## 6. 下一轮整体收口顺序的排序规则

下一轮优先级不应按“最近改过什么”决定，而应按以下四个维度排序：

### 6.1 第一优先：主链是否仍存在 model 直通

以下模式优先级最高：

1. 入站直接 `ShouldBindJSON(&models.X)`。
2. 出站直接 `c.JSON(..., model)` 或 `[]models.X`。
3. public service 直接暴露 `models.*`。

### 6.2 第二优先：是否具备样板复用价值

优先选择能形成整域复制样板的模块，例如：

1. `org-personnel` 这类已进入 service DTO 阶段的模块。
2. `partner / users` 这类可继续从 handler DTO 延伸到 service / frontend contract 的模块。
3. `wheel-trace` 这类可作为前端 contract / adapter 样板的模块。

### 6.3 第三优先：前后端漂移风险是否高

若后端已收口但前端仍直接消费实体结构，或前端已做 contract 但后端仍直返实体，应提高优先级，因为这类模块最容易产生双边漂移。

### 6.4 第四优先：改造破坏面是否可控

在高风险模块中，优先选择：

1. 边界清晰。
2. 调用面可识别。
3. 可沿已有样板推进。

避免一开始就选择跨域过广、缺少样板承接的大模块做硬切。

## 7. 待批准后的建议执行步骤

### Step 1：编制 DTO 现状总表

按模块填完整体台账，至少覆盖核心后端域、前端主要消费域与共享契约域。

### Step 2：给出模块级排序结果

为每个模块标记：

1. 当前综合等级。
2. 当前主要断点。
3. 建议动作。
4. 下一轮优先级。

### Step 3：确定下一轮治理范围

从总表中选择最值得优先推进的一批模块，要求该批次不是随机组合，而是符合统一排序规则。

## 8. 风险与注意事项

### 8.1 总表如果只列后端，会再次失真

如果只记录 handler / service，而不记录前端 contract 与 adapter 现状，最终仍会高估 DTO 完成度。

### 8.2 总表如果按文件而不按模块，会失去治理意义

DTO 的问题是链路问题，不是单文件问题；若退化为文件列表，会无法指导下一轮整域收口。

### 8.3 排序如果不基于统一规则，会再次回到补丁式推进

若没有风险、漂移、样板复用、破坏面四个维度，后续很容易再次变成“哪个最顺手就先改哪个”。

## 9. 批准后的最小验收标准

1. 产出一份按模块 / 五层链路组织的 DTO 现状总表。
2. 每个核心模块都有综合等级、关键证据、主要断点与建议动作。
3. 下一轮整体收口顺序具备明确的排序依据，而不是凭经验口头判断。
4. 总表可直接作为后续 `walkthrough.md` 与分批治理计划的依据。

---

# 正式 notification gateway 抽象收口实施计划

日期：2026-04-09  
状态：待批准

## 1. 目标

本轮目标不是再零散地把几个 `useNotificationStore.getState()` 替换掉，而是为通知域建立一个正式的 `notification gateway`，作为通知读写、归档、快照访问与批量同步的统一基础设施边界。

本轮需要达成四个结果：

1. 业务 service / lib 不再直接把 Zustand store 当作跨域 API 使用。
2. 通知读接口与写接口都有明确承载位，而不是继续散落在 `notification-store.ts` 与各业务 service 之间。
3. `notification-service.ts` 可以逐步聚焦于规则驱动分发，而不是继续兼任所有 store 访问入口。
4. 为后续继续纯化 `workflow-core`、`sales`、`ai-assistant` 等模块提供稳定依赖面。

## 2. 当前已确认事实

### 2.1 通知域目前还没有正式基础设施边界

当前已确认：

1. `sales-service.ts` 原先直接调用 `useNotificationStore.getState().archiveByOrderId(...)`。
2. `ai-context-service.ts` 原先直接调用 `useNotificationStore.getState().messages`。
3. `workflow-core/services/dispatch-service.ts` 仍直接读取并写入 `useNotificationStore.getState()`，包括消息写入、去重判断、归档扫描等。

虽然第二批 Service Purity 已经开始把个别调用点收口到 `notification-service.ts` 的桥接函数，但这仍然只是过渡态，不是正式 gateway。

### 2.2 当前 `notification-service.ts` 职责仍偏混合

当前 `notification-service.ts` 同时承担：

1. 规则驱动的通知分发。
2. 指令模板解析。
3. 部分 store 读写桥接。
4. 领域辅助通知方法（如 order/quality/system notice）。

这意味着如果不再进一步分层，后续只会把更多“通知相关但不同层级”的职责继续堆进一个文件里。

### 2.3 当前问题已经从 UI purity 进入“基础设施 purity”阶段

第一批、第二批 Service Purity 已经收口了“底层直接 toast”的问题；现在更深一层的问题是：

1. store 是否继续裸露给所有 service。
2. 通知读写是否有单一入口。
3. 业务模块是否能在不感知 Zustand 细节的前提下使用通知能力。

这就是本轮要解决的根因。

## 3. 核心设计原则

### 3.1 gateway 是基础设施边界，不是新的上帝对象

`notification gateway` 应该负责：

1. 读消息快照。
2. 写消息。
3. 归档消息。
4. 批量同步消息。
5. 提供最小、稳定、可复用的通知基础设施 API。

它不应该直接吞掉：

1. 工作流规则匹配本身。
2. 业务事件语义判定。
3. 通知中心 UI 交互状态展示策略。

### 3.2 区分“通知访问”和“通知编排”

建议明确拆成两层：

1. `notification gateway`
  - 负责 store 访问封装
  - 对外暴露稳定基础设施接口
2. `notification service`
  - 负责规则、模板、分发编排
  - 通过 gateway 写入或读取通知数据

这样可以避免 `notification-service.ts` 继续同时承担“基础设施 + 规则编排”。

### 3.3 读写接口应显式命名，不暴露裸 store

业务侧最终应依赖诸如：

1. `getNotificationMessages()`
2. `archiveNotificationsByOrderId()`
3. `addNotificationMessage()`
4. `archiveNotificationMessage()`
5. `getNotificationStateSnapshot()`（仅在确有必要时暴露）

而不是直接依赖 `useNotificationStore.getState()`。

### 3.4 迁移以兼容为先，避免一次性强切

当前通知链路横跨 `workflow-core`、`sales`、`ai-assistant` 等模块，因此本轮应优先采用：

1. 先引入 gateway 文件。
2. 再逐个迁移调用方。
3. 最后收缩 `notification-service.ts` 与旧直连路径。

## 4. 建议实施形态

### 4.1 建议新增文件

建议新增一个专门文件，例如：

1. `src/features/system-mgmt/notifications/notification-gateway.ts`

该文件专门承接对 `notification-store.ts` 的访问封装。

### 4.2 gateway 建议职责

建议 gateway 至少提供：

1. `getNotificationMessages()`
2. `addNotificationMessage()`
3. `archiveNotificationMessage()`
4. `archiveNotificationsByOrderId()`
5. `syncNotificationsWithRules()`
6. `syncNotificationsWithCommands()`
7. `syncNotificationsWithOrders()`

如确有必要，可保留一个 `getNotificationStateSnapshot()` 作为过渡接口，但不应鼓励业务侧长期依赖它。

### 4.3 notification-service 的收口方向

本轮理想收口后：

1. `notification-service.ts` 继续负责规则驱动分发与模板解析。
2. 实际的消息读写通过 `notification-gateway.ts` 完成。
3. 其他业务 service 只依赖 gateway，而不是直接感知 store。

### 4.4 首批迁移对象

建议优先迁移：

1. `src/features/trading/sales/services/sales-service.ts`
2. `src/features/ai-assistant/services/ai-context-service.ts`
3. `src/features/system-mgmt/workflow-core/services/dispatch-service.ts`
4. 如有需要，再迁移通知域内部其他直接 store 调用点

## 5. 建议实施顺序

### Step 1：抽出 notification gateway

- 目标：建立正式通知基础设施接口文件。
- 要求：
  1. 不直接改写规则编排逻辑。
  2. 先把 store 访问封装起来。

### Step 2：迁移跨域业务调用方

- 目标：让 `sales-service`、`ai-context-service` 等不再直接依赖 store。
- 要求：
  1. 保持现有行为不变。
  2. 只改变依赖边界。

### Step 3：迁移 workflow-core 通知写入链

- 目标：让 `dispatch-service.ts` 通过 gateway 完成写入、归档与消息扫描读操作。
- 要求：
  1. 保持追溯扫描、去重与归档逻辑不回归。
  2. 不把领域规则错误地下沉到 gateway。

### Step 4：收口 notification-service 的职责表达

- 目标：让 `notification-service.ts` 更像“规则分发编排层”，而不是“store 访问杂糅层”。
- 要求：
  1. 不一次性打散所有导出。
  2. 先让调用方改完，再决定是否进一步拆文件。

## 6. 涉及文件（预估）

高优先级文件：

1. `src/features/system-mgmt/notifications/notification-store.ts`
2. `src/features/system-mgmt/notifications/notification-service.ts`
3. `src/features/system-mgmt/notifications/notification-gateway.ts`（建议新增）
4. `src/features/system-mgmt/workflow-core/services/dispatch-service.ts`
5. `src/features/trading/sales/services/sales-service.ts`
6. `src/features/ai-assistant/services/ai-context-service.ts`

文档侧：

1. `task.md`
2. `implementation_plan.md`
3. `walkthrough.md`

## 7. 风险与注意事项

### 7.1 假 gateway 风险

如果只是把 `useNotificationStore.getState()` 原样搬到另一个文件里，而不同时明确职责边界，最终只会得到一个“换了文件名的直连层”，并没有真正形成基础设施边界。

### 7.2 gateway 吞掉业务规则风险

如果把规则匹配、工作流语义、事件分发逻辑也一并塞进 gateway，会形成新的上帝对象，破坏本轮想建立的分层。

### 7.3 迁移期行为回归风险

通知链路具有状态性与去重语义；迁移过程中若误改消息写入、归档或去重逻辑，会导致重复消息、漏归档或扫描失效。

### 7.4 兼容导出风险

如果 `notification-service.ts` 当前已经被多个模块直接依赖，本轮需要谨慎保留兼容导出，避免一次性大范围破坏 import 面。

## 8. 批准后的最小验收标准

1. 存在正式 `notification gateway` 文件或等价分层承载位。
2. 业务模块不再直接依赖 `useNotificationStore.getState()`。
3. `workflow-core`、`sales`、`ai-assistant` 至少首批调用方已迁移到 gateway。
4. `notification-service.ts` 的职责表达比当前更清晰，朝“规则分发编排层”收口。
5. `pnpm exec tsc --noEmit` 通过，且通知扫描/归档链路不回归。

---

# Service 纯净化（Service Purity）治理实施计划

日期：2026-04-09  
状态：待批准

## 1. 目标

本轮目标不是简单把几个 `toast` 调用机械删除，而是把前端 `service / lib / 数据访问封装 / 共享 mutation 辅助` 中混入的 UI 副作用系统性收口，恢复清晰分层：

1. Service 层只负责数据访问、结果返回、错误抛出或结构化结果输出。
2. Hook / mutation 编排层负责把成功或失败结果翻译为 UI 反馈。
3. Component 层负责具体交互承载，而不再把提示职责继续下沉到底层。
4. 让底层能力可以在测试、脚本、后台任务或非浏览器环境中复用，而不会因为依赖浏览器 UI 组件直接崩溃。

本轮需要达成四个结果：

1. 识别并收口所有“底层函数直接决定 Toast/Notification 呈现”的核心路径。
2. 为成功、失败、日志上报、用户提示建立清晰分层边界。
3. 对共享基础设施层给出统一治理方式，避免只修个别业务 service 后再次反弹。
4. 为后续模块新增 service 时提供明确的 purity 约束样板。

## 2. 当前已确认事实

### 2.1 问题已蔓延到共享基础设施层

当前已确认，问题并不只存在于少数业务 service：

1. `src/features/system-mgmt/workflow-core/services/dispatch-service.ts` 直接导入 `toast`，在追溯扫描补偿后直接触发成功提示。
2. `src/lib/react-query-mutation.ts` 直接导入 `toast`，并在 `successMessage` 存在时统一调用 `toast.success(...)`。
3. `src/lib/handle-server-error.ts` 直接导入 `toast`，同时承担错误提示、路由跳转与日志记录。

这说明当前项目里已经形成一种架构惯性：底层能力不仅返回结果，还顺带替调用方做 UI 呈现。

### 2.2 当前问题的根因是职责边界错位，而不是文案实现问题

当前风险不在于提示文案是否统一，而在于以下结构性问题：

1. Service 不再是纯数据管道，而变成“数据访问 + UI 提示”的混合层。
2. 错误处理基础设施不再只是“错误解析/归因”，而是直接决定展示与跳转行为。
3. 共享 mutation 辅助层把“是否显示成功提示”的决策从调用方手里拿走，导致页面/Hook 对 UI 反馈策略缺少显式控制。

因此，这个问题不能通过“见一个删一个 toast”解决，必须先纠正分层规则。

### 2.3 当前实现会阻碍多环境复用与可测试性

一旦底层 service 或共享基础设施默认依赖浏览器 UI：

1. 在自动化测试中，底层调用可能因为环境缺失而难以稳定运行。
2. 在未来 Node 脚本、后台任务或无浏览器上下文场景中，service 无法自然复用。
3. 调用方无法细粒度决定“静默失败 / 表单内提示 / toast 提示 / redirect 提示”等不同用户反馈策略。

## 3. 核心设计原则

### 3.1 Service 只上报事实，不决定表现形式

Service 层允许做的事：

1. 调接口。
2. 解析响应。
3. 抛出标准错误。
4. 返回结构化结果（如 `Result` / `status` / `reason`）。

Service 层不应该直接做的事：

1. `toast.success/error/info(...)`
2. `notification.open(...)`
3. 直接导航到某个页面作为错误反馈方式
4. 根据 UI 交互语义决定提示出现时机

### 3.2 Hook / mutation 层负责把数据结果翻译为交互反馈

对于页面动作链路，更合理的职责划分是：

1. Service 返回成功数据或抛错。
2. Hook 层在 `onSuccess / onError` 中决定是否 toast、是否刷新 query、是否静默处理。
3. Component 层决定错误是在表单内展示、弹层顶部展示还是仅提示一次。

这样既能保留交互完整性，又不让 Service 越权。

### 3.3 共享基础设施必须优先纯化

与其先零散清理业务 service，更高优先级的是治理两类共享基础设施：

1. 错误处理工具，例如 `handle-server-error`。
2. mutation 辅助工具，例如 `react-query-mutation`。

因为只要共享层仍自带 UI 副作用，业务层就会继续被诱导走回原模式。

### 3.4 错误日志与用户提示必须解耦

结构化日志上报属于可观测性职责；用户提示属于交互职责。两者可以在同一链路协同，但不应被绑定在同一个底层函数里强制同时发生。

## 4. 建议实施形态

### 4.1 Service 层的目标形态

建议 Service 层最终满足以下要求：

1. 不直接依赖 `sonner`、`antd notification`、`message` 等 UI 库。
2. 成功时返回数据或结构化成功结果。
3. 失败时抛出标准错误或返回标准失败结果。
4. 如需保留机器可读语义，优先通过错误码、状态字段、reason enum 传递，而不是直接拼用户提示文案。

### 4.2 错误处理层的目标形态

建议将当前 `handle-server-error` 一类能力拆分为更清晰的两层：

1. 纯错误解析层：输入 `unknown error`，输出可消费的结构化错误信息，如 `status / code / userMessageKey / actionSuggestion / redirectTarget`。
2. UI 适配层：由 Hook 或页面决定是否把这些结构化结果转成 `toast`、弹窗、表单错误或跳转动作。

这样可以保留现在已有的 i18n、状态码与动作注册能力，但不再把 UI 直接写死在底层。

### 4.3 mutation 辅助层的目标形态

建议 `buildMutationOptions` 一类工具从“自带 toast”收口为“只做 mutation 生命周期编排”：

1. 保留 query 失效与成功/失败回调编排。
2. 去掉默认 `toast.success` 注入能力，改由调用方在 `onSuccess` 里显式决定提示。
3. 对失败链路，保留日志上报或纯错误标准化能力，但 UI 反馈交由业务调用方决定。

### 4.4 兼容迁移策略

考虑到当前代码可能已经广泛依赖共享层自动 toast 行为，本轮不宜采用一次性硬切：

1. 先建立新纯函数/纯辅助接口。
2. 再逐个业务 Hook 迁移到显式 `onSuccess / onError` 处理。
3. 最后回收旧共享层中隐式 UI 能力。

如果扫描发现影响面极大，可采用短期兼容包装，但要把包装层明确标记为迁移态，而不是新的长期标准。

## 5. 建议实施顺序

### Step 1：全量盘点 UI 副作用泄露点

- 目标：识别所有 `service / lib` 层直接导入 `toast / notification / message` 的位置。
- 分类：
  1. 业务 service
  2. 共享 mutation 辅助
  3. 错误处理基础设施
  4. 合法的 Hook / Component UI 层提示

### Step 2：定义统一 purity 规则与错误/result 契约

- 目标：明确什么应该抛错、什么应该返回结构化结果、什么应该由 Hook 翻译成 UI。
- 输出：
  1. 错误标准化结构
  2. 成功反馈承载约定
  3. 共享层禁止直接依赖 UI 的约束

### Step 3：优先改造共享基础设施

- 目标：先收口 `handle-server-error`、`react-query-mutation` 这类高扩散面基础设施。
- 原因：如果共享层不纯，业务层纯化很难稳定维持。

### Step 4：迁移业务 Hook 的提示职责

- 目标：让 `useMutation` 调用点显式承担 `toast` 提示职责。
- 要求：
  1. 保持当前成功/失败体验不丢失。
  2. 避免同一错误出现重复 toast。
  3. 对需要静默失败的场景保留控制权。

### Step 5：回收业务 service 中残留 UI 依赖

- 目标：把剩余业务 service 中的直接 `toast` 调用全部迁出。
- 要求：同步更新调用方，避免出现“service 不再提示，但页面也没接提示”的体验空洞。

## 6. 涉及文件（预估）

前端侧高优先级可能涉及：

1. `src/lib/react-query-mutation.ts`
2. `src/lib/handle-server-error.ts`
3. `src/features/**/services/*.ts` 中直接依赖 UI 提示的文件
4. `src/features/**/hooks/*.ts` 中承接 mutation 成功/失败提示的文件

文档侧：

1. `task.md`
2. `implementation_plan.md`
3. `walkthrough.md`

## 7. 风险与注意事项

### 7.1 反馈体验断层风险

如果只删除底层 `toast`，但没有同步把提示上浮到 Hook / Component，用户会得到“操作完成但没有任何反馈”的退化体验。

### 7.2 重复提示风险

若共享层与调用方在迁移期同时保留错误提示，容易出现一次失败触发两次 toast，需要在迁移策略中明确避免双发。

### 7.3 错误契约漂移风险

如果没有先统一“错误标准化输出长什么样”，不同业务 Hook 很快会各自发明一套 `message/status/code` 读取方式，形成新的架构债。

### 7.4 改造面广的回归风险

`handle-server-error` 与 mutation 基础设施属于横切能力，改造时需要优先锁定最核心消费方，避免在未梳理依赖面的情况下直接硬切。

## 8. 批准后的最小验收标准

1. Service / lib 层不再直接依赖浏览器 UI 提示库作为默认行为。
2. 成功与失败提示主要由 Hook / mutation 编排层或 Component 层显式承接。
3. 错误日志上报与用户提示职责实现解耦。
4. 共享基础设施层具备新的纯化接口或纯化实现，不再诱导业务层继续耦合 UI。
5. `walkthrough.md` 记录扫描范围、改造切口、兼容策略与验证结果。
