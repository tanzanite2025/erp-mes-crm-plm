- [ ] 510. 冻结本轮范围，修复图片上传在 pHash 阶段的运行时解码失败（2026-04-08，待确认）
- [ ] 587. 冻结本轮范围，规划“DTO 全局接入审计与分级治理”（2026-04-09，待批准）
  - [ ] 本轮聚焦“如何以全局方式审计 DTO 接入现状并形成统一治理规则”，不扩散为逐个接口立即补 DTO 的执行轮。
  - [ ] 当前目标不是只找单一缺失点，而是识别仓库内 `handler -> service -> model -> frontend contract` 的 DTO 分层现状、缺口模式与高风险区域。
  - [ ] 在你批准前，本阶段只更新 `task.md` 与 `implementation_plan.md`，不直接修改业务代码、不开始批量补 DTO。

- [ ] 588. 固化当前 DTO 现状的已确认事实链
  - [ ] 代码扫描已确认，仓库内并非“完全无 DTO”或“完全统一 DTO”，而是存在多种并存形态。
  - [ ] `server/services/production_dto.go`、`server/services/production_process_dto.go` 已体现较完整的 DTO 分层：存在请求/响应 DTO 与 model 映射函数。
  - [ ] `server/handlers/customers.go` 仍存在 `ShouldBindJSON(&input)` 直接绑定 `models.Customer`，并在保存后直接 `c.JSON(http.StatusOK, input)` 返回实体，说明部分链路仍是模型直通。
  - [ ] `server/handlers` 下大量文件仍存在 `ShouldBindJSON` / `BindJSON` 分布，说明 DTO 接入现状需要按全局规则分级盘点，而不是靠个案记忆判断。

- [ ] 589. 明确本轮 DTO 全局审计的目标产物
  - [ ] 形成一套 DTO 审计框架：定义什么算“已接入 DTO”、什么算“半接入”、什么算“未接入/伪 DTO”。
  - [ ] 形成面向全仓的审计维度：请求入站、服务入参、服务出参、响应出站、前端 contract/type 五层。
  - [ ] 形成风险分级口径：哪些模块优先治理、哪些问题属于高危直通、哪些属于可延后优化。
  - [ ] 为后续真正执行时提供可批量推进的清单与验收标准，而不是继续零散补洞。

- [ ] 590. 明确 DTO 审计前的关键设计约束
  - [ ] DTO 审计不能只看“有没有 `*DTO` 命名”，还要看是否真正隔离了数据库 model、是否存在显式映射与独立契约。
  - [ ] 需要区分“合法的领域输入结构体”与“把 `models.*` 改名成 request/response 壳子”的伪 DTO，避免统计失真。
  - [ ] 审计范围必须覆盖后端入站/出站，也要覆盖前端 service/type 是否直接耦合后端实体字段，避免只做后端半边治理。
  - [ ] 本轮不直接引入一刀切强制重构；先建立全局口径、分类结果与推进顺序，再决定批准后的执行范围。

- [ ] 591. 明确待批准后的实施顺序与验收口径
  - [ ] 批准后先产出 DTO 全量清单与分级表，再按高风险模块优先推进，而不是随机逐文件修补。
  - [ ] 批准后优先处理“请求直接绑定 model / 响应直接回传 model / 前端直接吃实体结构”这三类高风险链路。
  - [ ] 完成阶段性治理后，至少验证：新增接口遵循统一 DTO 规则、重点模块不再模型直通、文档与审计结果可持续复用。

- [ ] 582. 冻结本轮范围，规划“正式 notification gateway 抽象收口”（2026-04-09，待批准）
  - [ ] 本轮聚焦通知域的正式 gateway 抽象，目标是阻止 `service / lib / 跨域模块` 继续直接把 `notification-store` 当作基础设施 API 使用。
  - [ ] 本轮不扩散到通知中心 UI 改版、不扩散到工作流规则产品设计重做，也不顺手重写整个通知域数据结构。
  - [ ] 在你批准前，本阶段只更新 `task.md` 与 `implementation_plan.md`，不直接修改业务代码。

- [ ] 583. 固化当前 notification gateway 已确认事实链
  - [ ] 第二批 Service Purity 已确认：`sales-service.ts` 与 `ai-context-service.ts` 原先都直接依赖 `notification-store`，目前已开始通过 `notification-service` 中的桥接函数收口。
  - [ ] `workflow-core/services/dispatch-service.ts` 仍直接调用 `useNotificationStore.getState()` 完成通知写入与扫描去重，说明通知域的正式接入边界仍未形成单一入口。
  - [ ] `notification-service.ts` 当前同时承担通知路由、规则匹配、消息写入、局部桥接函数等职责，但还不是一个明确分层的 gateway。
  - [ ] 因此，当前问题已从“是否直接 toast”进一步演进为“通知能力是否有正式基础设施边界”，这是 Service Purity 后续必须继续收口的根因点。

- [ ] 584. 明确本轮 notification gateway 目标
  - [ ] 建立正式 `notification gateway`，作为通知读写、归档、消息快照访问的统一基础设施入口。
  - [ ] 让业务 service/hook 不再直接依赖 `useNotificationStore.getState()` 或 store 内部结构细节。
  - [ ] 区分“通知基础设施访问”“通知规则编排”“通知 UI 展示”三层职责，避免继续混在同一文件中增长。
  - [ ] 为后续继续纯化 `workflow-core`、`ai-assistant`、`sales` 等模块提供稳定依赖面。

- [ ] 585. 明确实施前关键设计约束
  - [ ] gateway 必须是基础设施边界，不应反过来吸收业务规则；工作流路由匹配、规则解释等领域逻辑不能全部塞进 gateway 里造成新一层上帝对象。
  - [ ] 需要区分“读接口”与“写接口”：读取消息快照、归档订单消息、写入消息、批量同步消息不应继续通过裸 store 状态对象暴露。
  - [ ] 迁移时要优先兼容现有调用方，避免一次性强切导致通知链路失效或消息状态异常。
  - [ ] 在你批准前，本阶段只沉淀方案、涉及文件、风险与验收口径，不直接开始代码改造。

- [ ] 586. 明确待批准后的实施顺序与验证口径
  - [ ] 批准后先抽出 `notification gateway` 文件或分层接口，再迁移 `sales-service`、`ai-context-service`、`dispatch-service` 等调用方。
  - [ ] 迁移后让 `notification-service.ts` 更聚焦于规则驱动分发，而不是继续兼任所有 store 访问入口。
  - [ ] 完成后至少验证：业务模块不再直接依赖 `notification-store`；通知读写通过 gateway 统一承接；`tsc --noEmit` 继续通过；现有通知扫描/归档链路不回归。

 - [ ] 510. 冻结本轮范围，修复图片上传在 pHash 阶段的运行时解码失败（2026-04-08，待确认）
- [ ] 577. 冻结本轮范围，规划“Service 纯净化（Service Purity）治理”（2026-04-09，待批准）
  - [ ] 本轮聚焦前端 `service / lib / 数据访问封装` 中混入 `toast / notification / message` 等 UI 副作用的问题，不扩散到无关业务重构。
  - [ ] 当前核心问题不是某个提示文案不优雅，而是底层数据层与表现层职责边界错位，已经影响可复用性、可测试性与多环境运行能力。
  - [ ] 在你批准前，本阶段只更新 `task.md` 与 `implementation_plan.md`，不直接修改前端业务代码。

- [ ] 578. 固化当前 Service Purity 已确认事实链
  - [ ] 代码扫描已确认，问题不只存在于个别业务 `service`，共享基础设施层也存在直接触发 UI 提示的模式。
  - [ ] `src/features/system-mgmt/workflow-core/services/dispatch-service.ts` 当前直接导入 `toast`，在追溯扫描补偿后直接决定成功提示形式。
  - [ ] `src/lib/react-query-mutation.ts` 当前把 `successMessage` 直接绑定为 `toast.success(...)`，说明通用 mutation 基础设施也在替调用方决定 UI 呈现。
  - [ ] `src/lib/handle-server-error.ts` 当前直接依赖 `toast` 与路由跳转，说明错误处理层同时承担了“错误归因 / 日志上报 / UI 呈现 / 交互跳转”多重职责。
  - [ ] 这意味着问题根因不是“少数 service 写法不规范”，而是项目内已形成“底层能力默认顺带做 UI 提示”的架构惯性。

- [ ] 579. 明确本轮治理目标
  - [ ] Service 层只负责返回数据、抛出错误或返回结构化结果，不再直接调用浏览器 UI 提示能力。
  - [ ] Hook / mutation 编排层负责把 Service 返回的成功或失败结果翻译为 `toast` 等 UI 反馈。
  - [ ] Component 层只负责具体交互触发与展示，不继续向下沉淀新的 UI 副作用到 `service` 或通用 `lib`。
  - [ ] 为后续 Node 脚本、测试、后台任务或非浏览器运行场景复用这些数据访问能力提供可运行前提。

- [ ] 580. 明确实施前关键设计约束
  - [ ] 不能只逐个删 `toast` 导入了事；必须同步明确“成功反馈由谁负责、错误提示由谁负责、结构化错误如何上传递”的统一分层规则。
  - [ ] 要区分真正的 `service purity` 问题与 Hook 层合理的 UI 反馈职责，避免把所有提示都错误地下沉或上浮。
  - [ ] 对 `handle-server-error`、`react-query-mutation` 这类共享层改造时，要优先抽象为“纯错误解析 / 纯 mutation 辅助”，不能继续在基础设施里耦合具体 UI 实现。
  - [ ] 若执行中发现现有大量页面直接依赖共享层自动 toast 行为，需要先补兼容迁移策略，再逐步收口，避免一次性破坏整站反馈体验。
  - [ ] 在你批准前，本阶段只沉淀方案、涉及文件、风险与验证口径，不直接开始代码改造。

- [ ] 581. 明确待批准后的实施顺序与验证口径
  - [ ] 批准后先盘点所有 `service / lib` 直接依赖 UI 提示的入口，并区分“业务 service”“共享 mutation 辅助”“错误处理基础设施”三类。
  - [ ] 先定义纯错误/result 契约与 UI 反馈承载层，再改造共享层，最后回收业务 service 中残留的 `toast` 直接调用。
  - [ ] 完成后至少验证：Service 在无浏览器 UI 环境下可被安全调用；成功/失败提示仍能在 Hook 或 Component 层正常出现；错误日志与用户提示不再强耦合在同一底层函数内。

 - [ ] 510. 冻结本轮范围，修复图片上传在 pHash 阶段的运行时解码失败（2026-04-08，待确认）
- [ ] 567. 冻结本轮范围，规划“销售订单保存路径后端收敛为单一入口”（2026-04-09，待批准）
  - [ ] 本轮聚焦 `sales-order` 保存链的领域编排收口，不扩散到 `purchase`、客户/供应商档案或新的事务语义扩面。
  - [ ] 当前核心问题不是 UI 计算性能，而是前端承担了“事务路由器”职责，根据 delta 与行差异自行判定调用哪条 mutation。
  - [ ] 在你批准前，本阶段只更新 `task.md` 与 `implementation_plan.md`，不直接修改前后端业务代码。

- [ ] 568. 固化当前销售订单保存链事实
  - [ ] 当前前端会根据 `delta` 内容、行项目结构差异以及字段组合，判定是走客户变更、行新增、行删除、状态迁移还是通用 patch/save。
  - [ ] 这种判定已经超出展示层职责，属于“根据业务语义选择事务入口”的领域规则编排。
  - [ ] 一旦前后端事务意图继续分叉演进，前端分流逻辑很容易与后端真实裁决规则漂移。
  - [ ] 因此，继续在前端补更多 `if/else` 不是长期解法，真正需要收口的是后端保存入口与裁决位置。

- [ ] 569. 明确本轮方案目标
  - [ ] 后端提供单一销售订单保存入口，由后端根据原始变更集或最终快照判断属于哪类变更及应触发的事务语义。
  - [ ] 前端保存动作只提交“原始变更集 / 最终快照 / 并发控制元数据”，不再自行决定走哪条领域事务路径。
  - [ ] 保留现有乐观锁与版本冲突语义，不因入口收敛而削弱并发保护。
  - [ ] 为后续 `purchase` 或其他交易单据复制同类收口模式提供统一样板。

- [ ] 570. 明确实施前关键设计约束
  - [ ] 后端必须成为事务语义判定的单一裁决者，前端不得再根据字段差异充当业务分发器。
  - [ ] 单一保存入口不等于退回“粗暴全量覆盖保存”；需保留显式意图、并发控制与后端防腐校验能力。
  - [ ] 若后端内部仍需区分客户变更、状态迁移、行增删改，可在服务层内部继续分派，但该分派不再暴露给前端决定。
  - [ ] 在你批准前，本阶段只沉淀方案、涉及文件、风险与验证口径，不直接开始代码改造。

- [ ] 571. 明确待批准后的实施顺序与验证口径
  - [ ] 批准后优先定位 `sales-order-save-plan.ts`、`use-sales-order-save.ts` 与后端当前保存/事务 handler 的真实调用链。
  - [ ] 先设计后端统一保存请求契约与服务层判定逻辑，再收口前端 save hook，最后删除 UI 层事务路由规则。
  - [ ] 完成后至少验证：前端不再依据 delta 路由不同 mutation；后端单一入口仍能正确处理客户变更、状态变更、行增删改与通用 patch；版本冲突语义保持不变。

 - [ ] 510. 冻结本轮范围，修复图片上传在 pHash 阶段的运行时解码失败（2026-04-08，待确认）
- [ ] 572. 冻结本轮范围，规划“MRP 独立模块化迁移”（2026-04-09，待批准）
  - [ ] 本轮聚焦将 MRP 从当前挂靠 Trading 的功能点提升为独立前端领域模块，不扩散到一次性重构全部交易域或后端整体拆分。
  - [ ] 当前问题不是目录命名美观，而是 MRP 仍缺少正式的 `data / services / hooks / module entry` 领域骨架，边界长期漂移风险高。
  - [ ] 在你批准前，本阶段只更新 `task.md` 与 `implementation_plan.md`，不直接修改业务代码。

- [ ] 573. 固化当前 MRP 结构事实
  - [ ] `src/features/mrp/services` 当前为空目录。
  - [ ] `src/features/mrp/data` 当前为空目录。
  - [ ] 这说明 MRP 目前尚未形成完整前端领域模块，更像是 Trading 体系内的功能点集合，而非独立模块。
  - [ ] 因此，后续迁移不能假设已有 MRP 独立 service/data 层，而要按“从功能点抽离成模块”的思路规划。

- [ ] 574. 明确本轮迁移目标
  - [ ] 为 MRP 建立正式模块骨架：`data / services / hooks / components / pages(or entry)` 的最小分层边界。
  - [ ] 明确当前散落在 Trading 或其他目录中的 MRP 相关页面、查询、动作、类型定义与 API 调用，应如何迁移或归属。
  - [ ] 设计迁移阶段，保证迁移期间不要求一次性完成所有业务改写，而是支持渐进抽离。
  - [ ] 保证迁移完成后，MRP 能以领域模块身份持续演进，而不再依赖 Trading 作为长期宿主。

- [ ] 575. 明确实施前关键设计约束
  - [ ] 不把“新建空目录”误当作模块化完成；必须同步定义事实源、服务层、查询层、页面入口与依赖关系。
  - [ ] 迁移方案需明确哪些代码保留在 Trading、哪些抽到 MRP、哪些需要共享层承接，避免复制粘贴式拆分。
  - [ ] 迁移期间需控制破坏面，优先通过兼容导出、渐进迁移与阶段验收降低回归风险。
  - [ ] 在你批准前，本阶段只沉淀架构方案、分层目录、迁移阶段、风险与验收口径，不直接开始代码改造。

- [ ] 576. 明确待批准后的实施顺序与验证口径
  - [ ] 批准后先盘点当前 MRP 功能实际散落位置、入口页面、服务调用与 schema 定义，再确定真实迁移范围。
  - [ ] 先搭模块骨架与兼容边界，再迁移 data/service/hook，最后收口页面入口与 Trading 侧旧引用。
  - [ ] 完成后至少验证：MRP 具备独立模块骨架；Trading 不再长期承担 MRP 的领域宿主职责；旧功能在迁移阶段仍可正常访问。

 - [ ] 510. 冻结本轮范围，修复图片上传在 pHash 阶段的运行时解码失败（2026-04-08，待确认）
  - [ ] 本轮聚焦 Rust `search-engine` 的图像处理稳定性，不扩散到上传业务接口、Redis 查重策略或前端交互。
  - [ ] 不采用补丁式“双解码兜底”，而是转向长期稳定的单次解码方案。
  - [ ] 目标是让同一张图片在尺寸读取、pHash 计算、WebP 编码三步共享同一份已解码图像数据。

- [x] 562. 冻结本轮范围，执行“客户/供应商列表统计下沉到后端 metadata/stats”（2026-04-09，已完成）
  - [x] 本轮聚焦 `customer` / `supplier` 列表页头部统计卡片的数据来源治理，不扩散到档案编辑事务、审计接入或新的筛选交互改版。
  - [x] 已将客户列表接口升级为返回 `items + metadata.pagination + metadata.stats`，统计口径覆盖 `total / active / newThisMonth`。
  - [x] 已将供应商列表接口升级为返回 `items + metadata.pagination + metadata.stats`，统计口径覆盖 `total / active / pendingReview`。
  - [x] 前端客户/供应商列表页头部统计卡片已切换为消费后端 `metadata.stats`，不再以当前列表数组本地重算作为主事实源。
  - [x] 已完成最小验证：`pnpm exec tsc --noEmit`、`go test ./handlers -run "Customer|Supplier"`。

 - [ ] 527. 冻结本轮范围，规划“请假申请功能闭环”专项（2026-04-09，待批准）
  - [ ] 本轮先把“请假管理”从半成品样板推进到可实施的闭环规划，不直接修改业务代码。
  - [ ] 本轮聚焦请假申请的前端写链路、人员关联、后端权威试算与提交闭环，不扩散到整个人事域全面重构。
  - [ ] 坚持从底层链路补齐闭环，不采用只给按钮补 `onClick` 之类的表层补丁。

- [ ] 532. 冻结本轮范围，规划“请假管理二阶段升级”（2026-04-09，待批准）
  - [ ] 本轮聚焦两项升级：前端交互细化，以及后端请假时长算法从“最小可用版”升级为“排班/节假日 authority 裁决”。
  - [ ] 本轮不扩散到完整考勤系统、完整审批流重构或全人事域排班平台建设。
  - [ ] 若仓库内不存在可复用的排班/节假日权威数据源，本轮需先明确最小可落地的数据来源与降级边界，再决定是否进入实现。

- [ ] 537. 冻结本轮范围，规划“请假列表增强”（2026-04-09，待批准）
  - [ ] 本轮聚焦请假页面的列表可用性提升：筛选、排序、详情展示。
  - [ ] 本轮不扩散到新的后端查询接口、审批流重构或请假规则改造。
  - [ ] 优先在现有“我的请假记录”数据基础上完成前端增强，不先引入新的列表事实来源分叉。

- [ ] 542. 冻结本轮范围，规划“Trading 审计样板接入”（2026-04-09，待批准）
  - [ ] 本轮聚焦把 Trading 做成审计引擎的第一个真实可验证样板接入模块。
  - [ ] 本轮优先覆盖 `SalesOrder` 与 `PurchaseOrder` 两条交易单据链路。
  - [ ] 本轮不扩散到全模块统一接入、完整看板智能统计或新的审计归档体系重构。

- [ ] 547. 冻结本轮范围，规划“audit-engine 真实统计升级”（2026-04-09，待批准）
  - [ ] 本轮聚焦把 audit-engine 从“配置驱动表达”升级为“基于真实日志与真实入口统计”的看板。
  - [ ] 本轮优先围绕现有已确认实体接入事实构建统计口径，不扩散到新的审计归档平台或 BI 分析系统。
  - [ ] 本轮不追求一次性做完整跨模块运营分析，只先建立可信的接入判定事实源。

- [ ] 552. 冻结本轮范围，规划“audit-engine 真实入口补齐（方案A）”（2026-04-09，待批准）
  - [ ] 本轮聚焦为“已有真实日志但缺少前端时间线入口”的实体补齐 `AuditStamp` 入口。
  - [ ] 本轮优先评估并覆盖 `Customer`、`Supplier`、`Employee`，谨慎评估 `ProductionLine` 的最合适承载位。
  - [ ] 本轮不扩散到新的审计统计平台重构、全模块 UI 重设计或无边界页面改版。

- [ ] 557. 冻结本轮范围，规划“audit-engine 模块卡片原因展示增强”（2026-04-09，待批准）
  - [ ] 本轮聚焦在 audit-engine 模块卡片中直接展示“部分接入原因”。
  - [ ] 本轮优先复用现有真实统计结果，不新增第二套判定链路。
  - [ ] 本轮不扩散到新的图表系统、复杂 drill-down 页面或额外管理后台。

- [ ] 558. 固化当前原因展示增强已确认事实链
  - [ ] 当前后端真实统计接口已经返回 `loggedEntities`、`entryEntities`、`connectedEntities`，说明原因展示所需核心数据已经存在。
  - [ ] 当前前端模块卡片只展示状态、覆盖率和最近事件时间，尚未把“哪些实体只有日志 / 哪些实体已有入口”直观呈现出来。
  - [ ] 当前模块卡片中的 `ALERT` 能表达“部分接入”，但还不能帮助用户快速判断下一步应补入口还是补日志。
  - [ ] 因此，本轮重点不是继续增强统计口径，而是把已有统计结果转译为可操作的原因解释。

- [ ] 559. 明确本轮升级目标
  - [ ] 在模块卡片中显式展示“已闭环实体”“只有日志的实体”“已有入口的实体”。
  - [ ] 让 `ALERT` 状态下的模块具备最小可操作解释，帮助后续选择应补入口还是补日志。
  - [ ] 保持当前 `audit-engine` 的真实统计主链不变，仅增强展示层信息密度与可读性。

- [ ] 560. 明确实施前关键设计约束
  - [ ] 原因展示必须直接基于后端 `/audit/engine/stats` 返回结果，不允许前端自行重新推导第二套差异口径。
  - [ ] 展示层应坚持“最小清晰解释”，避免把模块卡片堆成完整详情页。
  - [ ] 若实体同时属于 `loggedEntities` 与 `entryEntities`，应优先归类为“已闭环实体”，避免在多个区域重复造成理解噪音。
  - [ ] 在你批准前，本阶段只更新 `task.md` 与 `implementation_plan.md`，不直接修改页面代码。

- [ ] 561. 明确批准前产出与执行边界
  - [ ] 当前阶段需要把原因分类规则、卡片展示形态、涉及文件与验证方式写入规划文档。
  - [ ] 若你批准后进入执行，应优先补前端展示辅助函数与卡片区域，再做必要文案微调。
  - [ ] 若实施中发现后端返回字段不足以表达清晰原因，再回到规划阶段评估是否扩展 stats 接口。

- [ ] 553. 固化当前方案A已确认事实链
  - [ ] 当前真实入口已覆盖 `SalesOrder` 与 `PurchaseOrder`，但后端真实日志已覆盖范围更大，导致 audit-engine 中出现“有日志无入口”的部分接入模块。
  - [ ] 当前前端明确存在管理页或主视图落点的实体至少包括 `Customer`、`Supplier`、`Employee`。
  - [ ] `ProductionLine` 当前更接近生产线管理组件链路，是否存在自然的详情承载位仍需在执行前谨慎选点，避免为了挂审计入口硬造一层伪详情页。
  - [ ] 因此，方案A的关键不是继续补统计，而是让已有真实日志的实体逐步补齐前端时间线入口，使“部分接入”向“闭环接入”推进。

- [ ] 554. 明确本轮升级目标
  - [ ] 为 `Customer`、`Supplier`、`Employee` 补齐最小可用的审计时间线入口。
  - [ ] 评估 `ProductionLine` 是否具备合适的详情/卡片承载位；若有则纳入本轮，否则明确暂缓原因。
  - [ ] 补齐入口后，使 audit-engine 中对应模块的 `entryCoverage` 与综合状态能真实提升。
  - [ ] 保持现有 Trading 样板与 audit-engine 真实统计逻辑不被破坏。

- [ ] 555. 明确实施前关键设计约束
  - [ ] 审计入口应优先挂在已有详情卡片、详情弹层或主信息区域，不为接入审计而新增一套无业务价值的页面结构。
  - [ ] 前端继续复用现有 `AuditStamp` / `DataTimeline` 组件，不发明第二套审计展示入口。
  - [ ] 新入口必须使用统一 canonical module 值，并与后端注册表保持一致。
  - [ ] 在你批准前，本阶段只更新 `task.md` 与 `implementation_plan.md`，不直接修改业务页面代码。

- [ ] 556. 明确批准前产出与执行边界
  - [ ] 当前阶段需要把优先接入实体、页面落点、风险与验证方式写入规划文档。
  - [ ] 若你批准后进入执行，应优先做 `Customer` / `Supplier` / `Employee`，再决定是否纳入 `ProductionLine`。
  - [ ] 若实施中发现某实体当前页面缺少稳定的创建/更新元数据展示位，则应先回到规划评估入口形态，而不是强行塞入页面。

- [ ] 548. 固化当前 audit-engine 真实统计已确认事实链
  - [ ] 当前前端明确挂载 `AuditStamp` 的真实入口至少包括 `SalesOrder` 与 `PurchaseOrder` 详情页。
  - [ ] 当前后端明确存在 `AuditLog` 写入的实体至少包括 `SalesOrder`、`PurchaseOrder`、`Employee`、`Customer`、`Supplier`、`ProductionLine`。
  - [ ] 当前 audit-engine 看板展示的模块维度是 `trading / finance / equipment / engineering / warehouse`，而真实审计写入维度是实体级 module，二者之间缺少统一映射与聚合口径。
  - [ ] 因此，若不先定义“实体 -> 模块”的权威映射与“入口覆盖 / 日志覆盖”的统计规则，看板仍无法表达真实接入状态。

- [ ] 549. 明确本轮升级目标
  - [ ] 建立 audit-engine 的真实统计口径，至少包含“真实入口覆盖”和“真实日志覆盖”两个维度。
  - [ ] 建立实体级审计 module 到业务模块级看板的统一映射关系，避免前端页面、后端日志、看板模块各说各话。
  - [ ] 让 audit-engine 的模块状态、覆盖率与连接数量来自真实统计结果，而非静态数组。
  - [ ] 为后续继续扩展更多实体接入提供统一注册/聚合模式。

- [ ] 550. 明确实施前关键设计约束
  - [ ] 模块是否“已接入”不能只看页面是否接了 `AuditStamp`，也不能只看后端是否写日志，需采用双维度联合判定。
  - [ ] 统计逻辑应优先以后端为权威聚合源，避免前端自行扫描所有页面并承担事实裁决职责。
  - [ ] 实体到模块的映射必须集中维护，不能继续散落在多个前端组件和后端服务字符串里。
  - [ ] 在你批准前，本阶段只更新 `task.md` 与 `implementation_plan.md`，不直接修改前端页面、后端 handler 或数据库查询逻辑。

- [ ] 551. 明确批准前产出与执行边界
  - [ ] 当前阶段需要把统计口径、聚合路线、涉及文件、风险与验证方式写入规划文档。
  - [ ] 若你批准后进入执行，应优先建设后端统计接口/聚合服务，再让 audit-engine 页面消费真实结果。
  - [ ] 若实施中发现部分模块只有日志没有入口、或只有入口没有日志，应保留“部分接入”态，而不是简单二元化为已接入/未接入。

- [ ] 543. 固化当前 Trading 审计接入已确认事实链
  - [ ] `/system-management/audit-engine` 当前的模块接入状态与 `1/5` 统计来自前端静态 `MODULES` 数组，并非真实后端判定结果。
  - [ ] 前端 Trading 侧已存在 `AuditStamp` 与 `DataTimeline` 能力，且 `sales-order` 详情页已经挂载审计时间线入口。
  - [ ] 后端 Trading 服务已对 `SalesOrder` 与 `PurchaseOrder` 写入 `AuditLog`，说明底层审计写链路并非空白。
  - [ ] 当前前端查询使用的 module 值（如 `sales-order`）与后端写入的 module 值（如 `SalesOrder`）存在契约漂移，导致“有入口但不一定能查到真实时间线”。

- [ ] 544. 明确本轮升级目标
  - [ ] 统一 Trading 审计的前后端 module 契约，至少覆盖 `SalesOrder` 与 `PurchaseOrder`。
  - [ ] 打通销售单与采购单详情的审计时间线查询与展示，确保真实可查、可见。
  - [ ] 让 audit-engine 看板中的 Trading 状态不再只是静态宣称，而是基于可维护的事实映射表达“已接入样板”。
  - [ ] 为后续 Finance / Engineering / Warehouse / Equipment 的复制接入沉淀统一模式。

- [ ] 545. 明确实施前关键设计约束
  - [ ] 必须优先解决 module 命名契约漂移，避免继续在不同页面、不同服务里各写一套 module 字符串。
  - [ ] 优先复用现有 `/audit/timeline` 查询接口与 `AuditStamp` / `DataTimeline` 组件，不额外发明第二套审计展示链路。
  - [ ] 本轮对 audit-engine 看板的改造应以“真实可维护配置/映射”为目标，不继续保留写死的 Trading=已接入 视觉假象。
  - [ ] 在你批准前，本阶段只更新 `task.md` 与 `implementation_plan.md`，不直接修改前端页面或后端审计实现。

- [ ] 546. 明确批准前产出与执行边界
  - [ ] 当前阶段需要把 Trading 样板接入的范围、涉及文件、风险与验证口径写入规划文档。
  - [ ] 若你批准后进入执行，应先统一审计 module 契约，再接销售单/采购单详情，再收口 audit-engine 看板表达。
  - [ ] 若实施过程中发现现有 `AuditLog.Module` 已被其他模块广泛依赖，则需优先采用兼容式收口方案，避免一次性破坏既有查询口径。

- [ ] 538. 固化当前请假列表增强已确认事实链
  - [ ] 当前 `leave-management.tsx` 已具备请假记录展示、状态中文化、时间格式化与待审批撤销入口。
  - [ ] 当前列表仍是单一顺序直出，缺少状态筛选、类型筛选、时间排序等基本浏览能力。
  - [ ] 当前列表仅展示摘要信息，用户无法在不展开页面布局的前提下查看完整请假详情。
  - [ ] 当前 `LeaveService.getMyLeaveRequests()` 已返回列表渲染所需的核心字段，说明本轮可优先基于现有接口做前端增强。

- [ ] 539. 明确本轮升级目标
  - [ ] 新增最小可用的列表筛选能力，至少支持按状态筛选，并评估是否同时支持请假类型筛选。
  - [ ] 新增明确且稳定的排序方式，优先保证“最新申请/最近时间优先”的浏览体验。
  - [ ] 新增请假详情展示入口，用于查看完整起止时间、状态、事由、员工信息与工日信息。
  - [ ] 保持现有撤销交互与列表刷新链路不被破坏。

- [ ] 540. 明确实施前关键设计约束
  - [ ] 筛选与排序优先在当前前端已获取的数据集上完成，不为此先扩展后端列表查询参数。
  - [ ] 详情展示应优先采用独立 Dialog / Sheet / Detail Card 组件，避免把列表项本身堆成复杂大块。
  - [ ] 前端不新增权限硬拦截，详情与撤销的最终可用性仍以后端返回为准。
  - [ ] 在你批准前，本阶段只更新 `task.md` 与 `implementation_plan.md`，不直接修改请假页面业务代码。

- [ ] 541. 明确批准前产出与执行边界
  - [ ] 当前阶段需要把筛选项、排序规则、详情展示形态、涉及文件与验证口径写入规划文档。
  - [ ] 若你批准进入执行，应优先拆出独立显示/状态组件或 hook，避免继续把复杂展示逻辑堆回 `leave-management.tsx`。
  - [ ] 若实施过程中发现现有列表字段不足以支撑详情展示，再回到规划阶段评估是否需要扩展接口返回字段。

- [ ] 533. 固化当前请假管理二阶段已确认事实链
  - [ ] 当前请假前端已具备“本人申请 + 后端 preview/create + 列表/统计刷新”的最小闭环。
  - [ ] 当前前端列表仍直接展示原始 `status` 枚举值与原始时间字符串，缺少中文状态映射与时间格式化。
  - [ ] 当前列表未提供待审批请假单的“撤销”交互入口，虽然前后端已具备 `POST /leaves/:id/cancel` 能力。
  - [ ] 当前后端 `server/services/leave_service.go` 的 `calculateLeaveDurationDays(...)` 仍基于自然时间差按 0.5 天取整，尚未接入排班、工作日、节假日等权威规则。
  - [ ] 经过代码检索，仓库内暂未直接发现现成的“节假日 / 排班 / 班次 / 工作日 authority 服务”被请假模块复用，说明算法升级不能建立在想当然的既有能力上。

- [ ] 534. 明确本轮升级目标
  - [ ] 前端：补齐请假列表状态中文化、时间格式化、待审批记录撤销按钮、撤销成功后的统一刷新反馈。
  - [ ] 后端：将请假时长 authority 计算从简单自然时长升级为基于工作日/排班/节假日裁决的服务逻辑。
  - [ ] 若现有后端缺少权威节假日/排班数据源，本轮必须先定义最小事实来源与接口边界，不能直接把规则硬编码进前端。

- [ ] 535. 明确实施前关键设计约束
  - [ ] 前端权限体验继续以后端裁决为准，不在前端新增硬拦截式权限守卫；撤销按钮仅作为交互入口，最终是否允许撤销仍由后端校验。
  - [ ] 时间展示优化只改变展示层，不得改变接口传输的 ISO 时间事实。
  - [ ] 后端时长算法升级必须优先复用已有权威数据源；若仓库内无现成数据源，则需明确本轮是否引入最小工作日/节假日配置模型，避免把临时规则埋进请假服务内部。
  - [ ] 在你批准前，本阶段只更新 `task.md` 与 `implementation_plan.md`，不直接修改前端页面、hook、service 或后端请假算法实现。

- [ ] 536. 明确批准前产出与执行边界
  - [ ] 当前阶段需要把前端交互增强项、后端 authority 升级路径、风险与验证口径写入规划文档。
  - [ ] 若你批准后进入执行，应优先先落后端 authority 数据源与算法，再接前端展示与撤销交互，避免 UI 先行绑定不稳定契约。
  - [ ] 若在实施前进一步确认“现有仓库无可复用排班/节假日事实源”，则需先回到规划文档补充“最小数据模型/配置来源”后再执行。

- [ ] 528. 固化当前“请假管理”已确认事实链
  - [ ] `src/features/org-personnel/tabs/leave-management.tsx` 当前只通过 `LeaveService.getMyLeaveRequests()` 与 `LeaveService.getLeaveStats()` 读取“我的请假记录”与统计数据。
  - [ ] 页面头部“新建请假申请”按钮当前没有 `onClick`、没有 Dialog、没有表单状态，也没有任何 mutation 绑定。
  - [ ] `src/features/org-personnel/services/leave-service.ts` 已提供 `submitLeaveRequest(...)`，说明服务层已具备基础提交入口，但当前没有前端消费方。
  - [ ] `src/features/org-personnel/data/leave-request-schema.ts` 当前要求提交结构中包含 `employeeId`、`leaveType`、`startTime`、`endTime`、`durationDays`、`reason`，但页面没有任何人员发现/选择与写入表单链路。
  - [ ] `/personnel/leave` 路由当前仍通过 `FeatureSandbox` 挂载，说明该模块仍处于隔离开发/样板态，而非生产闭环态。

- [ ] 529. 明确本轮闭环规划目标
  - [ ] 新增独立的请假申请交互载体（如 `LeaveActionDialog`），承载人员选择、请假类型、时间范围、原因输入与提交反馈。
  - [ ] 补齐“逻辑 Hook - Service - UI”三层写链路，避免 UI 直接拼接复杂提交流程。
  - [ ] 请假时长 `durationDays` 不由前端本地简单相减裁决，需改为以后端权威试算/确认结果为准。
  - [ ] 人员发现能力优先复用现有人事/员工服务，不在请假模块内部复制一套人员主数据逻辑。

- [ ] 530. 明确实施前的关键设计约束
  - [ ] 需要先确认“发起请假”是仅允许当前用户为自己申请，还是允许有权限的用户代他人发起；若支持代提，则人员选择器必须进入正式范围。
  - [ ] 若后端尚无请假时长试算接口，本轮实施需先补后端权威接口，再让前端表单消费，不能由前端自行计算最终 `durationDays`。
  - [ ] 提交成功后，列表与统计必须通过统一 query 失效/刷新回到真实后端状态，不能只做前端临时插入假数据。
  - [ ] 表单校验、错误提示与提交态反馈必须完整闭环，避免出现“创建成功但审批/统计/UI 不一致”的半链路状态。

- [ ] 531. 明确批准前产出与执行边界
  - [ ] 当前阶段只更新 `task.md` 与 `implementation_plan.md`，沉淀方案、涉及文件、风险与验证口径。
  - [ ] 在你明确批准前，不新增 `LeaveActionDialog`、不修改请假页面业务代码、也不补后端接口实现。
  - [ ] 若后续实施过程中发现“是否允许代他人申请”等核心语义与当前假设不一致，需先回到规划阶段更新方案并再次确认。

- [ ] 516. 冻结本轮范围，规划生产环境图片上传 `500 Disk write failed` 的专项修复（2026-04-09，待批准）
  - [ ] 本轮先聚焦生产环境上传物理落盘失败，不扩散到前端预览、本地 DEV `/uploads` 代理或新的业务重构。
  - [ ] 当前已确认前端拿到的错误文案为 `Disk write failed`，该文本来自 Go 上传处理器，不是 Rust `search-engine` 直接返回。
  - [ ] 本轮先完成“高概率根因锁定 + 修复专项规划”，待批准后再实施生产变更。

- [ ] 517. 固化当前已确认的生产现场事实链
  - [ ] `server/handlers/evidence_handler.go` 中先执行 Rust 图像处理，随后才调用 `os.WriteFile(filepath.Join("uploads", fileName), ...)` 落盘，因此 `Disk write failed` 发生在 Go 本地写盘阶段。
  - [ ] 生产宿主机当前工作目录已确认是 `/var/www/erp/server`，`./uploads` 目录存在，但当前权限为 `root:root` + `755`。
  - [ ] 生产 `app` 当前有两个副本在跑，因此此前 `docker exec -it $(docker compose ps -q app) ...` 失败是因为命令替换返回了两个容器 ID，不是新的独立根因。
  - [ ] 生产磁盘空间与 inode 已确认正常，当前不再优先怀疑 `no space left on device` 一类基础设施问题。

- [ ] 518. 锁定当前高概率直接根因
  - [ ] `server/Dockerfile` 已确认 `app` 容器最终以非 root 用户 `xdfcuser:xdfcgroup` 运行。
  - [ ] `server/docker-compose.yml` 已确认宿主机 `./uploads` 以卷挂载方式映射到容器内 `/app/uploads`。
  - [ ] 因此在宿主机 `server/uploads` 为 `root:root 755` 的前提下，容器内普通用户对挂载目录无写权限，与当前 `Disk write failed` 现象高度吻合。
  - [ ] 当前高优先级修复方向应落在宿主机挂载目录权限/归属与容器运行用户对齐，而不是 Rust 版本、图像处理逻辑或前端上传链。

- [ ] 519. 明确专项修复分层
  - [ ] A 层先做生产恢复：让宿主机 `server/uploads` 对容器内 `xdfcuser` 可写，优先恢复上传能力。
  - [ ] B 层再做长期防回归：补齐 `server/deploy-prod.sh` 的运行目录权限准备逻辑，避免后续部署再次生成 `root:root 755` 的不可写挂载目录。
  - [ ] 本轮不把容器重新切回 root 作为默认方案，也不采用无边界的 `777` 兜底作为长期解法。

- [ ] 520. 明确批准前的产出与约束
  - [ ] 当前阶段只更新 `task.md` 与 `implementation_plan.md`，把根因、修复分层与实施边界写清楚。
  - [ ] 在收到批准前，不直接对生产宿主机目录执行 `chown`、`chmod`、`docker compose up` 或其他实际变更动作。
  - [ ] 实施时需同时准备“临时人工恢复步骤”和“部署脚本固化步骤”，避免只救火、不防回归。

- [x] 521. 固化 `uploads/backups` 目录权限防回归约束（2026-04-09，仓库侧已完成）
  - [x] `server/Dockerfile` 已改为显式固定 `app` 运行用户的 UID/GID，避免继续依赖 Alpine 自动分配系统用户编号。
  - [x] `server/docker-compose.yml` 已把同一组 `XDFC_APP_UID` / `XDFC_APP_GID` 作为 build args 传入 `app` 镜像构建链。
  - [x] `server/deploy-prod.sh` 已在每次部署前按同一 UID/GID 准备 `./uploads` 与 `./backups` 顶层目录属主和权限，防止再次生成容器不可写的挂载目录。
  - [x] `.env.example` 已补充运行时身份配置项，默认与部署脚本、容器镜像保持一致。

- [ ] 522. 冻结本轮范围，规划 `sales` 事务编排下沉与并发写收口（2026-04-09，待确认）
  - [ ] 本轮先固化审查结论与改造边界，不直接并发修改 `sales` UI、前端 service 与后端事务接口。
  - [ ] 本轮聚焦两个问题：`sales-order-action-dialog.tsx` 的交易编排泄露，以及遗留前端交付回写链路的并发写风险。
  - [ ] 本轮不顺手扩散到 `purchase`、`customer`、`supplier` 或新的事务语义实现。

- [ ] 523. 固化当前 `sales` 交易编排泄露现状
  - [ ] `src/features/trading/components/sales-order-action-dialog.tsx` 当前在 UI 层承担了大段 delta 分类、行结构比对与 mutation 分发逻辑。
  - [ ] 组件当前通过 `isCustomerOnlyChange`、`isLinesOnlyChange`、`isPureLineAdd`、`isPureLineRemove` 等条件，在保存前手动决定调用哪条 transaction mutation 或 `patchMutation`。
  - [ ] 这意味着“哪种编辑命中哪种事务意图”的领域编排仍由 UI 裁决，而不是由单一 orchestration/service 层或后端权威入口裁决。

- [ ] 524. 固化当前并发写风险边界
  - [ ] 当前主 `patchSalesOrder(...)` 链路已通过 `version` 与后端 `409 CONFLICT` 具备基础乐观锁保护，不应误判为完全没有并发保护。
  - [ ] 但 `src/features/trading/services/order-delivery-service.ts` 仍保留前端 read-modify-write 式的交付数量累加与状态推导，并通过整单保存方式回写。
  - [ ] 该遗留链路绕开了显式事务意图与版本治理，若仍被业务入口调用，将存在脏写覆盖与状态漂移风险。
  - [ ] 需进一步确认该文件是否已完全失去引用；若未失活，应视为高优先级架构风险。

- [ ] 525. 明确本轮专项规划目标
  - [ ] 将 `sales-order-action-dialog.tsx` 中的 delta 分类与 mutation 分发下沉到单一 `sales` orchestration/service hook，UI 仅提交表单结果与 delta。
  - [ ] 将“交付增量”收敛为显式事务意图，由后端基于快照与版本执行原子裁决，而不是前端先计算后回写。
  - [ ] 在完成上述收敛前，不继续增加新的 UI 内 if/else 分流规则，不继续复制到 `purchase` 侧形成新的泄露面。

- [ ] 526. 明确实施前验证与约束
  - [ ] 先补专项规划文档，明确改造切口、涉及文件、兼容策略与最小验证口径，再开始实际代码改造。
  - [ ] 若 `order-delivery-service.ts` 已无引用，可将其移出正式导出面或删除；若仍有引用，需先定位调用入口。
  - [ ] 实施时必须保留现有 `patch`/transaction 路径的 `version` 冲突语义，不得为了下沉 orchestration 反向削弱乐观锁。

- [ ] 513. 冻结本轮范围，补齐本地 DEV `/uploads` 访问链（2026-04-08，待确认）
  - [ ] 本轮只修本地开发环境中的静态上传资源访问链，不扩散到上传业务逻辑、Rust 图像处理或生产 Nginx 配置。
  - [ ] 当前问题表现为本地图片上传成功后，`GET /uploads/ev-*.webp` 在 `127.0.0.1:5173` 返回 `200` 但预览破图。
  - [ ] 已确认生产配置中 `/uploads/` 由 Nginx 正式暴露，本轮不改生产部署语义。

- [ ] 514. 固化当前本地预览坏图根因
  - [ ] 前端预览使用 `getStaticEvidenceUrl(...)` 将后端返回文件名拼为 `/uploads/{fileName}`，不是 `blob:` 临时地址。
  - [ ] `vite.config.ts` 当前只代理 `/api`，未代理 `/uploads`，导致浏览器把 `/uploads/*` 请求发给 Vite Dev Server。
  - [ ] 本地坏图不代表 Rust 图像处理失败，也不代表生产必然复现；它是 DEV 访问链与生产访问链不一致导致的验证盲区。

- [ ] 515. 明确本轮修复要求
  - [ ] 在本地 DEV 中补齐 `/uploads` 代理，使上传后图片回显链路与生产访问语义一致。
  - [ ] 优先复用现有 `VITE_PROXY_TARGET`，避免为 `/uploads` 再引入新的独立目标地址配置。
  - [ ] 不修改生产 Nginx、`docker-compose`、Go 上传接口或 Rust 图像处理逻辑。
  - [ ] 完成后需要验证本地上传后的 `GET /uploads/*.webp` 能正常返回真实图片内容，而不是 Vite 回退响应。

- [ ] 511. 固化当前运行时根因
  - [ ] 前端请求已命中正确后端 `http://localhost:8080`，当前问题不再是 Vite 代理错配。
  - [ ] Go 后端日志显示：`rust image worker returned status: 400, body: Failed to decode image for perceptual hash`。
  - [ ] Rust 当前实现先用 `image::load_from_memory(raw_data)` 解码，再用 `img_hash::image::load_from_memory(raw_data)` 二次解码用于 pHash。
  - [ ] 同一份原始字节由两套解码路径处理，导致运行时格式兼容性出现分叉，是当前 500 的直接根因。

- [ ] 512. 明确长期稳定修复要求
  - [ ] Rust 图像处理链改为“单次权威解码 + 统一像素管线”，避免同一请求内出现双解码分叉。
  - [ ] pHash 计算需要基于已成功解码后的统一像素数据完成，而不是再次从原始字节独立解码。
  - [ ] 如需调整依赖组合，只能作为配套收敛手段，不能替代主方案。
  - [ ] 完成后需要重新验证图片上传成功，并确认 Rust 日志中不再出现 `Failed to decode image for perceptual hash`。

- [ ] 507. 冻结本轮范围，修复 `search-engine` 本地 Docker 构建失败（2026-04-08，待确认）
  - [ ] 本轮只修 Rust 构建链，不扩散到图像处理业务逻辑。
  - [ ] 目标是恢复 `search-engine` 在本地 DEV/Compose 下的可构建性。
  - [ ] 不改变运行时接口、端口和镜像职责。

- [ ] 508. 固化当前构建失败根因
  - [ ] `server/search-engine/Dockerfile` 当前使用 `rust:1.75-alpine`，工具链版本过旧。
  - [ ] 构建日志显示依赖链中的 `time-core` 需要更高版本 Cargo 才能解析 `edition2024`。
  - [ ] Dockerfile 当前只复制 `Cargo.toml`，没有复制已存在的 `Cargo.lock`，导致依赖解析存在漂移。

- [ ] 509. 明确本轮修复要求
  - [ ] 升级 `search-engine` 的 Rust builder 镜像到兼容当前依赖链的稳定版本。
  - [ ] 将 `Cargo.lock` 纳入 Docker 构建缓存层，避免依赖漂移。
  - [ ] 完成后需要重新验证 `docker compose build search-engine` 能通过。

- [ ] 504. 冻结本轮范围，补齐本地 DEV 一键启动链（2026-04-08，待确认）
  - [ ] 本轮只修本地开发启动体验，不扩散到业务逻辑或生产部署语义。
  - [ ] 目标是让前端、Go 后端与 Rust `search-engine` 在本地具备一致的启动入口。
  - [ ] 优先复用现有脚本，而不是重复创建新的平行入口。

- [ ] 505. 固化当前 DEV 启动缺口
  - [ ] `server/dev-up.ps1` 当前只启动 `db/redis/app/nginx_lb/watchdog`。
  - [ ] 当前脚本未启动 `search-engine`，导致图片上传链在 DEV 下天然缺失图像处理依赖。
  - [ ] 根目录 `package.json` 也没有可直接拉起完整本地开发链的脚本。

- [ ] 506. 明确本轮修复要求
  - [ ] `server/dev-up.ps1` 需要把 `search-engine` 纳入本地启动流程。
  - [ ] 根目录需要提供清晰的脚本入口，减少手工切目录操作。
  - [ ] `walkthrough.md` 需要记录新的本地 DEV 使用方式。

- [ ] 501. 冻结本轮范围，修复 `search-engine` 未随生产部署更新的问题（2026-04-08，待确认）
  - [ ] 本轮只修部署链，不扩散到业务逻辑或搜索索引功能重构。
  - [ ] 目标是让默认部署路径能够同步构建并启动 Rust 图像处理服务。
  - [ ] 不改变现有运行时数据目录保护策略。

- [ ] 502. 固化当前部署缺口
  - [ ] 顶层 `deploy.sh` 最终调用 `server/deploy-prod.sh`。
  - [ ] `server/deploy-prod.sh` 默认只重建 `app`，不会重建 `search-engine`。
  - [ ] `server/docker-compose.yml` 当前未声明 `search-engine` 服务。
  - [ ] 因此 `server/search-engine/src/processor.rs` 的修复不会随默认部署自动上服务器。

- [ ] 503. 明确本轮修复要求
  - [ ] `docker-compose.yml` 需要纳入 `search-engine` 服务，并提供稳定的容器内访问地址。
  - [ ] `deploy-prod.sh` 默认部署路径需要把 `search-engine` 一起构建/启动。
  - [ ] `app` 需要通过环境变量显式指向容器内 `search-engine`，避免继续依赖宿主机 `localhost:8081` 假设。

- [ ] 498. 冻结本轮范围，修复销售订单图片上传 `500 Image processing failed`（2026-04-08，待确认）
  - [ ] 本轮聚焦 Go -> Rust 图像处理链，不扩散到通知 WebSocket 或其他业务域。
  - [ ] 先增强错误可观测性，再修复图像处理兼容性。
  - [ ] 不把 Redis 查重降级链误判为本次主因。

- [ ] 499. 固化当前 500 根因判断
  - [ ] 当前失败点位于后端 `HandleEvidenceUpload(...)` 内的 `ProcessImage(rawData)`。
  - [ ] 文件大小超限并非本次主因；超限按现有逻辑应返回 `413`。
  - [ ] Redis 未初始化并非本次主因；当前实现只会跳过去重，不会返回 `500`。
  - [ ] 高优先级怀疑为 Rust 图像解码或 WebP 编码兼容性问题。

- [ ] 500. 明确本轮修复与验证要求
  - [ ] Go 侧需要保留 Rust 返回的真实错误上下文，避免前端只看到笼统的 `Image processing failed`。
  - [ ] Rust 侧需要提升 `process_image(...)` 对常见截图格式的兼容性，优先修复 WebP 编码输入格式问题。
  - [ ] 完成后至少执行与本轮改动直接相关的最小验证，并同步 `walkthrough.md`。

- [ ] 495. 冻结本轮范围，只排查“建立订单时图片上传报错”根因（2026-04-08，待确认）
  - [ ] 本轮先做根因分析，不直接修改业务代码。
  - [ ] 聚焦销售订单图片上传链路：前端请求、后端路由、存储同步提示。
  - [ ] 明确判断当前报错是否与 Redis 未就绪、Rust 服务异常或接口未实现/未注册有关。

- [ ] 496. 固化当前已观察现象
  - [ ] 前端控制台对 `/trading/sales-orders/evidence/upload` 报 `[API_ERROR] 404 Not Found`。
  - [ ] UI 同时出现“Evidence upload failed [API_ERROR] 404 Not Found”。
  - [ ] 页面另有“存储服务同步失败”提示，需要判断其是否与本次图片上传主失败链路直接相关。

- [ ] 497. 明确排查结论输出要求
  - [ ] 需要确认上传接口在前后端是否真实存在且路径一致。
  - [ ] 需要确认上传链路是否依赖 Redis、WebSocket 通知、或 Rust 解析服务。
  - [ ] 需要给出根因优先级判断，并明确下一步应修复的最小切口。

- [x] 494. 修复 `error-action-registry` 与 `translate` 的类型不匹配构建失败（2026-04-08，已完成）
  - [x] 已定位为 `handle-server-error.ts` 中传入 `translate(...)` 的 `messageKey` / `actionLabelKey` 被推断为普通 `string`。
  - [x] 已收紧 `src/lib/error-action-registry.ts` 的 key 类型，使其对齐 `TranslationKey`。
  - [x] 已避免继续使用宽泛 `string` 导致部署构建时 `tsc -b` 失败。
  - [x] 已验证：`pnpm exec tsc --noEmit` 通过，且 `handle-server-error.ts` 不再报 TS2345。

- [x] 490. 冻结本轮范围，规划并实现 `customer / supplier` 核心标识字段变更事务化（2026-04-08，已完成）
  - [x] 本轮只处理 `customer` / `supplier` 的核心标识字段，未并发进入状态、归档、删除或其他业务域。
  - [x] 已为“主体身份识别字段变更”建立显式 intent，而不是继续只依赖通用 `patch`。
  - [x] 仅对具备稳定业务语义、可审计、可复用后端裁决的字段进行了事务化。

- [x] 491. 明确 `customer` 核心标识字段事务化边界
  - [x] 已将候选字段限定为 `code` 与 `name`，未扩展到联系人、电话、邮箱、地址等普通档案字段。
  - [x] 已在纯 `code`、纯 `name` 或 `code + name` 场景下命中显式 transaction。
  - [x] 若混入其他普通档案字段，继续保留在现有 `patch` 链中。
  - [x] 唯一性、存在性与可变更约束继续由后端裁决，前端未猜规则。

- [x] 492. 明确 `supplier` 核心标识字段事务化边界
  - [x] 已将候选字段限定为 `code` 与 `name`，未扩展到分类、联系人、电话、邮箱、地址、主营产品等普通档案字段。
  - [x] 已在纯 `code`、纯 `name` 或 `code + name` 场景下命中显式 transaction。
  - [x] 若混入其他普通档案字段，继续保留在现有 `patch` 链中。
  - [x] 唯一性、存在性与可变更约束继续由后端裁决，前端未猜规则。

- [x] 493. 明确本轮风险、验证与收尾要求
  - [x] 已确认 `code` 存在唯一索引约束，并在 transaction 中复用后端唯一性校验。
  - [x] 已补后端 identity change transaction service，而不是仅让前端硬分流。
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run "Customer|Supplier"`。
  - [x] 已同步 `walkthrough.md` 记录核心标识字段 intent、分流条件、唯一性约束复用情况与验证结果。

- [x] 486. 冻结本轮范围，执行 `trading/customer` / `trading/supplier` 的 TDO 接入（2026-04-08，已完成）
  - [x] 本轮优先处理客户与供应商主数据模块，未并发进入其他业务域。
  - [x] 已为主数据编辑建立显式业务 intent，而不是继续只依赖 `patch`。
  - [x] 本轮先落地了最窄语义动作：`customer.status` / `supplier.status` 变更。

- [x] 487. 明确 `trading/customer` 的 TDO 边界
  - [x] 已盘点客户当前编辑仍以 CRUD + `patch` 主导的现状。
  - [x] 已为稳定、单语义的 `status` 变更建立 customer transaction intent。
  - [x] 普通档案混合编辑继续保留在现有 `patch` 链中。
  - [x] 未前端猜测客户校验规则，继续复用后端主数据裁决。

- [x] 488. 明确 `trading/supplier` 的 TDO 边界
  - [x] 已盘点供应商当前编辑仍以 CRUD + `patch` 主导的现状。
  - [x] 已为稳定、单语义的 `status` 变更建立 supplier transaction intent。
  - [x] 普通档案混合编辑继续保留在现有 `patch` 链中。
  - [x] 未前端猜测供应商校验规则，继续复用后端主数据裁决。

- [x] 489. 明确本轮验证与收尾要求
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run "Customer|Supplier"`。
  - [x] 已验证：customer / supplier 的纯 `status` 动作命中显式 transaction，普通混合编辑仍保留原链路。
  - [x] 已同步 `walkthrough.md`，记录 customer / supplier 的 TDO intent、分流条件与验证结果。

- [x] 484. 完成 `purchase` 头部第二刀：供应商主体变更事务化（2026-04-08，已完成）
  - [x] 已确认 `ORDER_SUPPLIER_CHANGE` 在前后端均已落地。
  - [x] 已确认采购编辑弹窗中纯 `supplierId` / `supplierName` 变更命中显式 transaction。
  - [x] 已确认混合编辑继续保留在现有 transaction / `patch` 链中。

- [x] 485. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [x] 已同步 `walkthrough.md`，记录 `purchase` 头部第二刀结果。

- [x] 481. 冻结本轮范围，执行 `purchase` 头部第二刀：供应商主体变更事务化（2026-04-08，已完成）
  - [x] 本轮只处理采购订单 `supplierId` / `supplierName` 的纯头部变更事务。
  - [x] 已确认供应商主体切换使用窄语义 intent。
  - [x] 未并发处理 `expectedDate`、其他头部字段、收货状态或任何行级编辑。

- [x] 482. 明确 `purchase` 头部第二刀边界
  - [x] 仅当 delta 仅包含 `supplierId` / `supplierName` 时，才走供应商主体变更 transaction。
  - [x] 若混入其他头部字段或行级字段，则不进入本轮 intent。
  - [x] 其余采购订单编辑继续保留在现有 transaction / `patch` 链中。
  - [x] 供应商不存在或不可用校验继续复用现有后端规则，不由前端猜测。

- [x] 483. 明确本轮验证与收尾要求
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [x] 已验证：采购编辑弹窗中纯供应商主体切换命中 transaction，混合编辑仍回落原链路。
  - [x] 完成后已同步 `walkthrough.md`，记录 `purchase` 头部第二刀 intent、分流条件与验证结果。

- [x] 479. 完成 `sales` 的 `status` / `statusNote` 联动重构（2026-04-08，已完成）
  - [x] 已补销售订单 `statusNote` 的最小编辑入口。
  - [x] 已将编辑弹窗中的纯 `statusNote` 修改从 `patch` 收敛到显式状态 transaction。
  - [x] 已保持详情页状态按钮与编辑弹窗共享同一条状态语义主链。

- [x] 480. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [x] 已同步 `walkthrough.md`，记录 `sales` 的 `status` / `statusNote` 联动重构结果。

- [x] 476. 冻结本轮范围，执行 `sales` 的 `status` / `statusNote` 联动重构（2026-04-08，已完成）
  - [x] 本轮处理销售订单 `status` 与 `statusNote` 的联动语义边界。
  - [x] 本轮按单一状态 transaction 主链收敛执行。
  - [x] 不并发处理 `orderName`、`purchaseOrderNo`、`requirements`、交期、客户、分类/类型或任何行级编辑。

- [x] 477. 明确 `sales` 中 `status` / `statusNote` 的重构边界
  - [x] 纯 `statusNote` 修改不再落回 `patch`，统一进入显式状态 transaction。
  - [x] `status + statusNote` 同时修改继续走现有状态流转 transaction。
  - [x] 若混入其他头部字段或行级字段，则不在本轮重构范围内。
  - [x] 其余销售订单编辑继续保留在现有 transaction / `patch` 链中。

- [x] 478. 明确本轮验证与收尾要求
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [x] 已验证：详情页状态按钮与编辑弹窗保存链路的 `status` / `statusNote` 语义一致。
  - [x] 完成后已同步 `walkthrough.md`，记录 `sales` 的 `status` / `statusNote` 联动重构结果。

- [ ] 471. 冻结本轮范围，执行 `sales` 头部下一刀：`purchaseOrderNo` 事务化（2026-04-08，待确认）
  - [ ] 本轮只处理销售订单 `purchaseOrderNo` 的纯头部变更事务。
  - [ ] 仅针对 `purchaseOrderNo` 单字段建 intent。
  - [ ] 不并发处理 `orderName`、`requirements`、交期、客户、分类/类型或任何行级编辑。

- [ ] 472. 明确 `sales` 头部 `purchaseOrderNo` 边界
  - [ ] 仅当 delta 仅包含 `purchaseOrderNo` 时，才走 `purchaseOrderNo` transaction。
  - [ ] 若混入其他头部字段或行级字段，则不进入本轮 intent。
  - [ ] 其余销售订单编辑继续保留在现有 transaction / `patch` 链中。

- [ ] 473. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `sales` 头部 `purchaseOrderNo` 事务化结果。

- [ ] 466. 冻结本轮范围，执行 `sales` 头部下一刀：`orderName` 编辑入口 + 事务化（2026-04-08，待确认）
  - [x] 1. 账号管理：修复废弃服务调用逻辑 / Personnel Accounts Migration
    - [x] 修正 `EmployeeService` Proxy 导出逻辑
    - [x] 完成 `use-users-action-dialog-options.ts` 迁移
  - [x] 2. 采购物流：修复无限循环与快照报错 / Purchase Logistics Fix
    - [x] 优化 `purchase-logistics-offline-draft-service.ts` 快照缓存
    - [x] 优化 `PurchaseLogisticsPage` 自动同步 Effect
  - [x] 3. 架构归一化：质量管理与计件工资模块 / Quality & Piecework Normalization
    - [x] 创建 QualityCore/Maintenance Services
    - [x] 重构 `use-quality.ts` Hook
    - [x] 创建 PieceworkMaintenanceService
    - [x] 重构 `use-piecework.ts` Hook
    - [x] [四阶段] BOM 财务成本试算下沉 (SummaryPanel)
- [x] [四阶段] SKU 与 产品条码规则合规化 (ProductDerive)
- [x] [四阶段] 质量任务待测总量统计优化 (QualityInspection)
- [x] [四阶段] 物料使用频率统计下沉 (MaterialUsageService)
  - [x] 4. 仓库管理：架构归一化与清理 / Warehouse Normalization
    - [x] 移除 `inbound-service.ts` 废弃文件 (通过代码清理完成)
    - [x] 拆分 `WarehouseCategory` Core/Maintenance 服务
    - [x] 拆分 `Stocktake` Core/Maintenance 服务
    - [x] 建立 `use-warehouse-category.ts` 与 `use-stocktake.ts` Hooks
    - [x] 重构 `warehouse-category.tsx` 与 `stocktake-mgmt.tsx` UI
    - [x] 迁移 PDA 模块：`src/features/pda-stocktake/hooks/use-stocktake.ts`
    - [x] 深度重构 `use-stock-mgmt.ts` 至 TanStack Query 架构

- [ ] 5. Rust 高性能搜索增强 (隔离开发阶段) / Rust Search Engine (Isolated)
    - [x] 初始化项目结构: `server/search-engine` & `Cargo.toml`
    - [x] 定义 Tantivy 索引 Schema (Material/Asset 映射)
    - [x] 实现 Axum 接口: `/v1/index` (SDRTS 接入) & `/v1/search`
    - [x] 编写支持多阶段构建的 `Dockerfile` (适配 VPS)
    - [ ] 6. Rust 高性能搜索增强 (后端集成阶段) / Rust Search Integration (Backend)
    - [x] 创建 Go 侧 `SearchServiceClient` (`search_client.go`)
    - [x] 为 `Inventory` 实体插入 SDRTS 同步钩子 (入库/出库/调拨)
    - [x] 实现全量索引初始化脚本 (`RebuildSearchIndex`)
    - [x] 验证后端变动与 Rust 服务的连通性
    - [x] 7. Rust 高性能搜索增强 (全栈集成阶段) / Rust Search Full-Stack Integration
    - [x] 在 `SearchServiceClient` 中增加 `Search` 查询方法
    - [x] 实现 Go 侧 `SearchGlobal` Handler (带数据脱敏/增强)
    - [x] 注册 `/api/v1/search/global` 路由
    - [x] 重构 `use-command-menu.ts` 接入新接口并清理旧调用
    - [x] 8. 全量搜索 UI 重构 (业务优先 & 选项卡布局) / Search UI Refactor (Tabbed)
    - [x] 简化 `search-data.ts` 剔除冗余导航项
    - [x] 引入 `Tabs` 组件并重构 `CommandMenuView` 为双 Tab 架构
    - [x] 适配跨设备样式 (Mobile/PDA/Desktop)
    - [x] 验证 Tab 切换动画及 Rust 结果展示逻辑
    - [x] 9. 命令菜单生产力中心重构 (指令爆炸 & 去外观化) / Search Productivity Hub
    - [x] 补全全量业务指令集 (`search-data.ts` / `actionConfigs`)
    - [x] 清理 `CommandMenuView` 中的主题设置与低频系统入口
    - [x] 调整操作 Tab 为高密度紧凑布局
    - [x] 验证全量指令的搜索命中与路由直达逻辑
    - [x] 10. 搜索结果初始展示优化 (按需折叠) / Search Display Optimization
    - [x] 实现针对 `searchValue` 为空的列表截断逻辑 (`slice(0, 6)`)
    - [x] 添加全量搜索引导视觉锚点 (`More...`)
    - [x] 验证有无搜索关键词状态下的布局联动效果

- [ ] 467. 明确 `sales` 头部 `orderName` 边界
  - [ ] 仅当 UI 可编辑且 delta 仅包含 `orderName` 时，才走 `orderName` transaction。
  - [ ] 若混入其他头部字段或行级字段，则不进入本轮 intent。
  - [ ] 其余销售订单编辑继续保留在现有 transaction / `patch` 链中。

- [ ] 468. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `sales` 头部 `orderName` 事务化结果。

- [ ] 461. 冻结本轮范围，执行 `sales` 头部 patch 压缩下一稳定切口（2026-04-08，待确认）
  - [ ] 本轮只从 `sales` 当前仍直落 `patchMutation` 的头部字段中挑一个稳定切口。
  - [ ] 不并发实现多个 `sales` 头部新 intent。
  - [ ] 不进入 `sales` 行级混合编辑压缩。

- [ ] 462. 明确 `sales` 头部下一唯一切口
  - [ ] 先确认当前仍直接落回 `patchMutation` 的头部字段候选。
  - [ ] 按“单语义、稳定、可复制已有样板、收益高”选择唯一切口。
  - [ ] 其余 `sales` 头部编辑继续保留在现有 `patch` 链中。

- [ ] 463. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `sales` 头部 patch 压缩结果。

- [ ] 455. 冻结本轮范围，执行 `purchase` 头部第二刀：供应商主体变更事务化（2026-04-08，待确认）
  - [ ] 本轮只处理采购订单供应商主体变更事务。
  - [ ] 仅针对 `supplierId` / `supplierName` 的纯头部变更建 intent。
  - [ ] 不并发处理 `expectedDate`、其他头部字段或任何行级编辑。

- [ ] 456. 明确 `purchase` 头部第二刀边界
  - [ ] 仅当 delta 仅包含 `supplierId` / `supplierName` 时，才走供应商主体变更 transaction。
  - [ ] 若混入其他头部字段或行级字段，则不进入本轮 intent。
  - [ ] 其余采购订单编辑继续保留在现有 `patch` 链中。

- [ ] 457. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `purchase` 头部第二刀 intent、分流条件与验证结果。

- [ ] 450. 冻结本轮范围，执行 `sales` / `purchase` 的 patch 兜底压缩专项（2026-04-08，待确认）
  - [ ] 本轮先做双域现状盘点，不直接并发推进多个新 intent。
  - [ ] 目标是明确哪些编辑路径仍落回 `patch`，以及这些回退是否合理。
  - [ ] 本轮只允许在完成分析后选择一个最高价值切口进入下一轮实现。

- [ ] 451. 梳理 `sales` / `purchase` 仍落回 `patch` 的真实路径
  - [ ] 明确头部字段编辑中哪些仍由 `patchMutation` 承担。
  - [ ] 明确行级混合编辑中哪些仍由 `patchMutation` 承担。
  - [ ] 区分“合理兜底”与“仍可继续语义化”的回退路径。

- [ ] 452. 明确本轮验证与收尾要求
  - [ ] 若本轮仅完成分析，则同步 `walkthrough.md` 记录盘点结论与下一轮建议。
  - [ ] 若本轮选定并实现一个新切口，则执行 `pnpm exec tsc --noEmit` 与对应 Go 测试。
  - [ ] 全程不得把 `patch` 直接删除，必须保留安全兜底链路。

- [ ] 444. 冻结本轮范围，执行 `purchase` 行级事务化第三刀：`ORDER_LINE_REMOVE`（2026-04-08，待确认）
  - [ ] 本轮只处理采购订单纯删除行事务。
  - [ ] 不并发处理 `ORDER_LINE_ADD`。
  - [ ] 不扩展回采购订单头字段，不退回整单 patch 包装型 transaction。

- [ ] 445. 明确 `purchase` 行级第三刀边界
  - [ ] 仅当可稳定识别为“纯删除行”时，才走 `ORDER_LINE_REMOVE`。
  - [ ] 若存在既有行内容修改或头部字段混入，则不进入本轮 intent。
  - [ ] 若纯行级变更但不是“仅删除”，继续保留在现有 `ORDER_LINE_CONTENT_CHANGE` / `ORDER_LINE_ADD` / `patch` 链中。

- [ ] 446. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `purchase` 行级第三刀 intent、分流条件与验证结果。

- [ ] 438. 冻结本轮范围，执行 `purchase` 行级事务化第二刀：`ORDER_LINE_ADD`（2026-04-08，待确认）
  - [ ] 本轮只处理采购订单纯新增行事务。
  - [ ] 不并发处理 `ORDER_LINE_REMOVE`。
  - [ ] 不扩展回采购订单头字段，不退回整单 patch 包装型 transaction。

- [ ] 439. 明确 `purchase` 行级第二刀边界
  - [ ] 仅当可稳定识别为“纯新增行”时，才走 `ORDER_LINE_ADD`。
  - [ ] 若存在既有行内容修改或头部字段混入，则不进入本轮 intent。
  - [ ] 若纯行级变更但不是“仅新增”，继续保留在现有 `ORDER_LINE_CONTENT_CHANGE` / `patch` 链中。

- [ ] 440. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `purchase` 行级第二刀 intent、分流条件与验证结果。

- [ ] 426. 冻结本轮范围，执行 `purchase` 事务化第一刀（2026-04-08，待确认）
  - [ ] 本轮目标是将 `sales` 已验证的 transaction 样板横向复制到 `purchase`。
  - [ ] 本轮只选一个最小可复制切口，不并发推进整个采购域事务化。
  - [ ] 不扩展到库存、MRP 或跨域聚合链路。

- [ ] 427. 明确 `purchase` 第一刀的优先切口
  - [ ] 优先分析是否应先做采购订单头部字段事务，而非直接切行级。
  - [ ] 候选优先项：`ORDER_DELIVERY_DATE_CHANGE` 对应采购预计到货期调整。
  - [ ] 明确本轮只选一个最稳妥切口实施，避免一开始并发复制过多 intent。

- [ ] 428. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `purchase` 第一刀 intent、分流条件与验证结果。

- [ ] 420. 冻结本轮范围，执行 `sales` 行级事务化第四刀：`ORDER_LINE_REMOVE`（2026-04-08，待确认）
  - [ ] 本轮只处理销售订单纯删除行事务。
  - [ ] 不并发处理 `ORDER_LINE_ADD`。
  - [ ] 不扩展回订单头字段，不退回整单 patch 包装型 transaction。

- [ ] 421. 明确 `ORDER_LINE_REMOVE` 的边界
  - [ ] 仅当可稳定识别为“纯删除行”时，才走 `ORDER_LINE_REMOVE`。
  - [ ] 若存在既有行内容修改或头部字段混入，则不进入本轮 intent。
  - [ ] 若是纯行级变更但不是“仅删除”，继续保留在现有 `ORDER_LINES_CHANGE` / `ORDER_LINE_CONTENT_CHANGE` / `ORDER_LINE_ADD`。

- [ ] 422. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `ORDER_LINE_REMOVE` 的分流条件与验证结果。

- [ ] 414. 冻结本轮范围，执行 `sales` 行级事务化第三刀：`ORDER_LINE_ADD`（2026-04-08，待确认）
  - [ ] 本轮只处理销售订单行新增事务。
  - [ ] 不并发处理 `ORDER_LINE_REMOVE`。
  - [ ] 不扩展回订单头字段，不退回整单 patch 包装型 transaction。

- [ ] 415. 明确 `ORDER_LINE_ADD` 的边界
  - [ ] 仅当可稳定识别为“纯行级新增”时，才走 `ORDER_LINE_ADD`。
  - [ ] 若存在既有行内容修改或头部字段混入，则不进入本轮 intent。
  - [ ] 若是纯行级变更但不是“仅新增”，继续保留在现有 `ORDER_LINES_CHANGE` / `ORDER_LINE_CONTENT_CHANGE`。

- [ ] 416. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `ORDER_LINE_ADD` 的分流条件与验证结果。

- [ ] 408. 冻结本轮范围，执行 `sales` 行级事务化第二刀（2026-04-08，待确认）
  - [ ] 本轮目标是将 `ORDER_LINES_CHANGE` 进一步细化为更窄的行级语义事务。
  - [ ] 候选范围仅限：行新增、行删除、行内容编辑。
  - [ ] 不扩展回订单头字段，不退回整单 patch 包装型 transaction。

- [ ] 409. 明确行级第二刀的优先切口
  - [ ] 优先分析是否应先做 `ORDER_LINE_CONTENT_CHANGE`。
  - [ ] 评估 `ORDER_LINE_ADD` 与 `ORDER_LINE_REMOVE` 是否适合在本轮独立收口。
  - [ ] 明确本轮只选一个最稳妥切口实施，避免一次性并发改三条行级语义链。

- [ ] 410. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录本轮 intent、分流条件与验证结果。

- [ ] 402. 冻结本轮范围，执行 `sales` 行级编辑事务化第一刀（2026-04-08，待确认）
  - [ ] 本轮只处理销售订单 `lines` 的纯内容编辑事务化。
  - [ ] 不扩展到订单头字段、客户主体、交期、分类/模式调整。
  - [ ] 不实现泛化 `ORDER_AMEND` 或整单 patch 包装型 transaction。

- [ ] 403. 明确行级编辑事务化第一刀边界
  - [ ] 仅当编辑订单提交的 delta 只涉及 `lines` 时，才允许切换到行级 transaction。
  - [ ] 本轮优先覆盖行内内容编辑场景，不把头部字段混入同一个 intent。
  - [ ] 其余任何混合编辑仍继续保留在现有 `patchMutation` 链中。

- [ ] 404. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录本轮行级 transaction intent、分流条件与验证结果。

- [ ] 396. 冻结本轮范围，执行 `sales` 分类/模式调整事务化（2026-04-08，待确认）
  - [ ] 本轮只处理订单头字段 `classification` / `type` 的语义事务化。
  - [ ] 不扩展到行项目编辑、客户主体、交期之外的其他改单项。
  - [ ] 代码改造前需确认：仅在纯 `classification/type` 变更场景切换到 transaction。

- [ ] 397. 明确分类/模式调整事务化边界
  - [ ] 当编辑订单提交的 delta 仅包含 `classification`、`type` 时，走独立 transaction。
  - [ ] 若同时混入其他字段，仍保留在现有 `patch` 链中。
  - [ ] 保持已有 `ORDER_CUSTOMER_CHANGE` 与 `ORDER_DELIVERY_DATE_CHANGE` 分流逻辑不回退。

- [ ] 398. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录本轮 transaction intent、分流条件与验证结果。

- [ ] 391. 冻结本轮范围，执行 `sales` 交期调整事务化（2026-04-08，待确认）
  - [ ] 本轮只处理改单事务化第二刀：交期调整。
  - [ ] 已完成客户主体调整事务化后，本轮继续沿用“单字段语义收口”的推进方式。
  - [ ] 代码改造前需先确认本轮只覆盖 `deliveryDate`。

- [ ] 392. 明确交期调整事务化边界
  - [ ] 仅当 `deliveryDate` 发生变化时，编辑订单才走独立 transaction。
  - [ ] 不将分类/模式调整或其他字段一并混入本轮 intent。
  - [ ] 其他普通编辑仍继续保留在 `patch` 链中。

- [ ] 393. 明确交期调整事务化风险控制
  - [ ] 需要避免把包含多字段的 delta 强行塞入“交期调整 transaction”。
  - [ ] 需要保证现有编辑对话框在非纯交期修改场景下继续走 `patchMutation`。
  - [ ] 需要保持 toast、invalidate、版本冲突与详情回显口径一致。

- [ ] 386. 冻结本轮范围，执行 `sales` 改单事务化（2026-04-08，待确认）
  - [ ] 本轮只推进改单事务化，不扩展到审批后状态细化或其他域。
  - [ ] 第一刀不做全量改单事务化，避免退化成 `patch` 外层包装壳。
  - [ ] 代码改造前需先确认本轮首个切入范围。

- [ ] 387. 明确改单事务化首个切入范围
  - [ ] 建议第一刀只处理订单头关键语义修改，而不是整单任意字段修改。
  - [ ] 优先候选可包含：客户主体调整、交期调整、订单分类/模式调整。
  - [ ] 行项目明细的大范围编辑暂继续保留在普通 `patch` 表单链中。

- [ ] 388. 明确改单事务化风险与边界
  - [ ] 需要避免把现有 `patchSalesOrder` 原样包进 transaction intent，导致语义失真。
  - [ ] 需要明确改单事务的 payload 只承载被批准的一小组业务语义字段。
  - [ ] 需要保证普通表单编辑链路仍可用，不因首刀事务化造成大面积断裂。

- [ ] 375. 冻结本轮范围，只处理 `sales` query / transaction 分层拆分（2026-04-08，待确认）
  - [ ] 本轮聚焦前端 `sales` 域分层拆分，不扩散到新的事务语义扩展。
  - [ ] 本轮目标是拆出 query hooks / transaction hooks / query service，收口旧混合入口。
  - [ ] 本轮不顺手推进 `ORDER_STATUS_TRANSITION` 或其他域改造。

- [ ] 376. 明确分层拆分目标与边界
  - [ ] 拆分目标优先覆盖：`use-sales-queries.ts`、`use-sales-transactions.ts`、`sales-query-service.ts`。
  - [ ] 已存在的 `sales-transaction-service.ts` 继续保留，作为 transaction 层正式入口之一。
  - [ ] 本轮只做职责重组与引用切换，不改变现有业务语义与接口契约。

- [ ] 377. 明确建议改动面与风险点
  - [ ] 需要评估 `use-sales.ts` 是否保留为兼容 re-export 薄壳，还是直接收缩为过渡文件。
  - [ ] 需要同步评估 `src/features/trading/sales/index.ts` 的导出策略，避免拆分后出现双入口漂移。
  - [ ] 需要控制 query key、mutation 成功回调、toast / invalidate 行为不发生回归。

- [ ] 378. 明确进入拆分实施前确认点
  - [ ] 需要用户确认本轮按前端分层拆分推进。
  - [ ] 需要用户确认是否允许 `use-sales.ts` 暂时保留为兼容桥接层。
  - [ ] 用户确认后再正式开始业务代码拆分。



- [ ] 367. 冻结本轮范围，只沉淀 `sales` 第一阶段 TDO 化改造方案独立文档（2026-04-08，待确认）
  - [ ] 本轮只新增单独 Markdown 方案文档，不修改业务代码。
  - [ ] 文档聚焦 `sales` 域第一阶段，从当前 patch 驱动走向语义事务入口的最小改造方案。
  - [ ] 文档应明确边界、分阶段目标、拟改文件、风险点与验证口径。

- [ ] 368. 明确方案文档目标与边界
  - [ ] 文档应服务于 `sales` 第一阶段 TDO 化，而不是泛化为全域统一方案。
  - [ ] 文档应聚焦第一阶段样板动作，优先围绕 `claim` 与状态推进链路展开。
  - [ ] 文档应先给出“方案与实施路径”，不在本轮混入具体代码 diff。

- [ ] 369. 明确建议落点与目录策略
  - [ ] 延续 `workflow` 专题目录，保持“现状拓扑图”与“阶段方案”并排存放。
  - [ ] 建议路径：`docs/architecture/workflow/sales-phase1-tdo-alignment-plan.md`。
  - [ ] 若用户确认其他命名，再按确认结果调整，不擅自生成多份近义文档。

- [ ] 370. 明确本轮确认点
  - [ ] 需要用户确认是否接受建议路径 `docs/architecture/workflow/sales-phase1-tdo-alignment-plan.md`。
  - [ ] 需要用户确认文档主体以第一阶段方案为主，是否允许文末附“后续阶段预留”。
  - [ ] 用户确认后再正式创建该独立 Markdown 文件。

- [ ] 363. 冻结本轮范围，只沉淀“当前各域数据流/副作用流/工作流接点”独立拓扑图文档（2026-04-08，待确认）
  - [ ] 本轮只新增单独 Markdown 文档，不修改业务代码。
  - [ ] 文档内容聚焦 `sales / purchase / inventory / workflow-core` 四域当前真实拓扑。
  - [ ] 文档应覆盖三条主线：数据流、副作用流、工作流接点。

- [ ] 364. 明确文档目标与产出形式
  - [ ] 产出一份可独立阅读的现状拓扑图文档，而不是将内容塞入 `implementation_plan.md`。
  - [ ] 文档需可作为后续 `SDRTS + Workflow + TDO` 收敛方案的现状基线。
  - [ ] 文档需明确各域当前真实职责，而不是抽象化愿景描述，并在文末增加“后续收敛方向”作为下一步入口。

- [ ] 365. 明确建议落点与目录策略
  - [ ] 优先采用目录化落点，避免继续在仓库根目录堆叠架构说明。
  - [ ] 若用户确认其他目录，再按确认结果调整，不擅自新增多个重复版本。

- [ ] 366. 明确本轮确认点
  - [ ] 根据确认结果创建该独立 Markdown 文件。


- [ ] 328. 冻结本轮范围，只处理仓储库存聚合链后移后端方案（2026-04-07，待确认）
  - [ ] 聚焦 `src/features/warehouse/services/inventory-service.ts` 的 `getInventoryList()`。
  - [ ] 本轮只先收口库存视图聚合，不顺带处理主数据搜索聚合、通知扫描与 dashboard 统计。
  - [ ] 本轮先完成方案与边界确认，待批准后再改前后端业务代码。

- [ ] 329. 固化当前前端重计算现状
  - [ ] 当前 `inventory-service.ts` 需要并行拉取 `materialService.getMaterialOptions()`、`productService.getProducts()`、`getInventoryListRaw()` 后在浏览器本地聚合结果。
  - [ ] `getInventoryList()` 在前端完成库存视图拼装、主数据映射与孤儿库存完整性校验日志。
  - [ ] 这条库存视图链目前是 `use-stock-mgmt.ts` 等仓储页面的正式展示事实源。

- [ ] 330. 固化当前架构问题
  - [ ] 前端承担了跨模块库存聚合与主数据拼装，而不是只消费后端权威视图。
  - [ ] 同一页面/服务需要拉取多份主数据再本地组装，放大网络体积与快照不一致风险。
  - [ ] 库存展示口径、搜索口径与数据完整性校验未收敛到后端，难以复算、审计与复用。

- [ ] 331. 明确最小后移目标
  - [ ] 后端提供权威库存视图接口，直接返回当前前端 `InventoryView` 所需字段。
  - [ ] 前端 `inventory-service.ts#getInventoryList()` 不再自行拉三份数据做正式聚合。
  - [ ] `searchMasterData()` 暂不纳入本轮实施。

- [ ] 332. 明确本轮实施边界
  - [ ] 本轮只改造 `warehouse` 库存视图链路。
  - [ ] `use-stock-mgmt.ts` 做最小消费层适配，不重做页面 UI。
  - [ ] `use-report.ts` 若不受影响则不改，`searchMasterData()` 留待下一轮。
  - [ ] `use-notification-rules.ts` 与 `dashboard/trace-service.ts` 只记录为下一批候选，不在本轮实施。

- [ ] 333. 明确验证口径
  - [ ] 前端不再通过 `materialService + productService + inventory raw` 本地拼装库存权威视图。
  - [ ] `searchMasterData()` 保持现状，不作为本轮回归阻塞项。
  - [ ] `pnpm exec tsc --noEmit` 通过，且 `warehouse` 库存管理主链可正常编译。

## P1 AI 单入口收敛专项（2026-04-07，待确认）

- [ ] 312. 冻结本轮范围，只处理 AI 入口容器收敛
  - [ ] 保留当前中间弹窗交互作为唯一主容器。
  - [ ] 移除侧边栏/抽屉式 AI 主交互路径。
  - [ ] 本轮不顺带重做 AI provider、提示词、权限体系或业务数据采集链。

- [ ] 313. 固化当前维护问题
  - [ ] 当前同一个 AI 按钮会因状态不同而打开 `DailyInsightModal` 或 `AiDrawer` 两种完全不同容器。
  - [ ] 用户点击前无法预期结果，形成明显交互歧义。
  - [ ] 双容器并存会放大后续样式、状态、权限和行为维护成本。

- [ ] 314. 明确收口目标
  - [ ] AI 按钮点击后始终进入同一种容器。
  - [ ] 统一保留中间弹窗，不再保留侧边抽屉作为主交互入口。
  - [ ] 减少多套 UI 同步维护造成的偏差和生产/DEV 认知错位。

- [ ] 315. 明确最小实施边界
  - [ ] 复用现有 `DailyInsightModal` 作为唯一主容器。
  - [ ] `AiDrawer` 从主入口移除，必要时删除相关触发链和无用状态。
  - [ ] 若仍需普通聊天能力，应在同一中间弹窗内承载，而不是继续保留第二套主容器。

- [ ] 316. 明确验证要求
  - [ ] 点击 AI 按钮后，无论是否有 unread insight，用户都进入统一中间弹窗体系。
  - [ ] 不再出现“一次点开抽屉、一次点开弹窗”的随机体验。
  - [ ] 生产与 DEV 在容器层级上保持一致。

## P1 AI 治理权限口径统一专项（方案B，2026-04-07，待确认）

- [ ] 306. 冻结本轮范围，只处理 AI 治理权限前后端判定口径漂移
  - [ ] 聚焦 `use-ai-permissions.ts`、`provider-client.ts`、`server/middleware/ai_policy_guard.go`、认证上下文中的 `role/username` 来源。
  - [ ] 本轮不顺带重做 AI 弹窗 UI，不扩散到 provider 选型或通用权限体系重构。
  - [ ] 本轮先输出统一口径方案，待确认后再改代码。

- [ ] 307. 固化已确认问题现象
  - [ ] DEV 环境点击 AI 后可进入 `DailyInsightModal`。
  - [ ] 生产环境点击 AI 后只进入 `AiDrawer`。
  - [ ] 生产日志显示 `AI_PROXY_ERROR (403): Current user is not allowed by AI governance policy`。

- [ ] 308. 固化根因判断
  - [ ] `DailyInsightModal` 是否出现取决于 `aiAgentService` 是否成功把 `hasUnread` 置为 `true`。
  - [ ] 生产环境后台任务已触发，但在 `/api/v1/ai/proxy` 进入服务端时被 `AIPolicyGuard()` 拒绝。
  - [ ] 前端当前按 `user.role[] / username` 做可见性与能力判定；后端当前按单个 `context.role / username` 做准入判定，存在口径漂移。

- [ ] 309. 明确方案B目标
  - [ ] 前后端 AI 治理判定必须收敛到同一事实来源。
  - [ ] 避免再次出现“前端允许打开 AI，后端 `/ai/proxy` 403 拒绝”的割裂体验。
  - [ ] 不依赖前端本地缓存或页面态猜测角色集合。

- [ ] 310. 明确最小实施边界
  - [ ] 优先以后端认证上下文中的权威角色集合/用户名作为唯一裁决输入。
  - [ ] 前端 `useAiPermissions()` 仅消费与后端一致的权威可用性结果，或至少与同一策略口径对齐。
  - [ ] 不通过前端吞掉 403 或强行伪造 unread insight 掩盖问题。

- [ ] 311. 明确验证口径
  - [ ] 被授权用户在 DEV / 生产应都能成功触发 AI 背景任务，并出现 `DailyInsightModal`。
  - [ ] 未授权用户前后端都应一致拒绝，且拒绝方式一致、可解释。
  - [ ] `/api/v1/ai/proxy` 不应再对“前端已判定可用”的同一用户返回治理 403。

。

## P1 DTO 接入缺口盘点与整改规划（2026-04-07，待确认）

- [ ] 281. 冻结本轮范围，只处理前端 service 层 DTO/Delta 协议接入缺口盘点与整改规划
  - [ ] 仅盘点 `src/features/**/services` 下的前端 service 文件。
  - [ ] 仅输出文件、函数、风险级别、问题类型与拟整改策略。
  - [ ] 本轮不直接修改业务代码，不顺带重构全局 `apiFetch`。

- [ ] 282. 识别高风险 DTO 缺口（优先整改候选）
  - [ ] `src/features/engineering/services/product-service.ts`
    - [ ] `getProducts()`：仍使用 `apiFetch<any>` + `as Product[]`。
    - [ ] `getProductTypes()`：仍使用 `apiFetch<any>` + `as ProductType[]`。
  - [ ] `src/features/trading/services/trading-service.ts`
    - [ ] `saveCustomer()`：返回对象未显式做响应校验。
    - [ ] `saveSupplier()`：返回对象未显式做响应校验。
    - [ ] `getSalesOrderById()`：详情读取未显式做响应校验。
    - [ ] `getSalesOrderByNo()`：详情读取未显式做响应校验。
    - [ ] `saveSalesOrder()`：返回对象未显式做响应校验。
    - [ ] `savePurchaseOrder()`：返回对象未显式做响应校验。
  - [ ] `src/features/warehouse/services/category-service.ts`
    - [ ] `getCategories()`：列表读取仍直接返回 `apiFetch` 结果。

- [ ] 283. 识别中风险 DTO 缺口（已部分接入 Delta，但全链路未收口）
  - [ ] `src/features/users/services/user-api.ts`
    - [ ] `fetchUsers()`：分页读取未显式做响应校验。
    - [ ] `fetchUserOptions()`：选项读取未显式做响应校验。
    - [ ] `createUser()`：创建返回对象未显式做响应校验。
    - [ ] `replaceUser()`：全量替换返回对象未显式做响应校验。
  - [ ] `src/features/trading/services/trading-service.ts`
    - [ ] 已补 `patchCustomer()`，但 customer/supplier/order 的 create/read/patch 响应校验风格仍未完全统一。

- [ ] 284. 识别待二次审计的低到中风险目录
  - [ ] `src/features/equipment-tooling/services/*.ts`
  - [ ] `src/features/basic-settings/services/*.ts`
  - [ ] `src/features/engineering-db/services/*.ts`
  - [ ] `src/features/finance/services/*.ts`
  - [ ] `src/features/approval/services/*.ts`
  - [ ] 输出时优先确认是否存在“只有 save/get，没有 patch DTO”或“直接 `apiFetch<any>` + 类型断言”的链路。

- [ ] 285. 为每个整改项定义统一判定标准
  - [ ] 读取链路：避免 `apiFetch<any>` 与裸 `as Xxx[]`。
  - [ ] 创建/更新链路：返回对象需显式做 `ensureObjectResponse(...)`。
  - [ ] 列表/选项链路：返回数组需显式做 `ensureArrayResponse(...)`。
  - [ ] Patch 链路：统一走 `DeltaPayload` / `DeltaSet`。

- [ ] 286. 将 DTO 整改表写入实施文档
  - [ ] 在 `implementation_plan.md` 中输出“文件 + 函数 + 风险级别 + 问题类型 + 拟整改策略”表。
  - [ ] 待确认后再按风险等级分批实施，避免一次性横扫全部 service。
