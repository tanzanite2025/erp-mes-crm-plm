# 生产领料工作区：页签与仓库确认记录的对接边界

复核日期：2026-10-27。

## 本次交付范围

独立业务页 `/mrp/production-material-issuance` 与“料号需求”并列，使用既有 MRP 模块布局、侧栏预览和首页快捷入口。指南继续位于独立的生产操作手册中。

本阶段已接入来源核对、明确下发、正式单据查询和带原因撤回，以及原单内仓库发料、补料、退料、本单订单行进度和交接历史。仓储增加独立“生产领退”入口，复用同一原单。工作区顶部已接入完整有效订单范围及物料／订单总体进度，包含未下发来源，读取失败不冒充空列表或零数量。

工作区页首已补“发起领料”，提供独立来源搜索分页、已选整行清单、BOM 选择及前提准备，再复用正式核对与下发。指南通过 `?intent=start` 进入相同流程，MRP 抽屉预填本次分析来源；流程打开前不请求业务来源。独立 `source-options`／`source-preparation` 接口只要求生产业务与查看权限，选单不再依赖销售接口或总体进度聚合。共享依据 DTO 及展示位于 `src/features/production-material-requirements/`。实现、职责及验收见[发起流程架构](../architecture/production-material-issuance-start-entry-source-selection-prerequisite-validation-shared-workflow-and-warehouse-handoff-architecture-review.md)。

两个视角共用一份完整范围的后端结果。默认按订单查看，每条订单行直接展示各物料的标准应领、净已领和还差（待领），超领单独提示，数量不随配方明细折叠。物料汇总复用相同三列展示与来源行数；累计领退、超领六项数量及冻结／当前依据、性能版本与重量按需展开。异常来源在主列表明确显示无法判断数量，不显示为零。页首只保留标题、发起领料和相关页面菜单，范围说明折叠，手机以三列数量卡片展示关键数据。先汇总后分别分页，不将不同物料、不同单位相加。总体范围及只读接口见[有效订单进度契约](../architecture/production-material-issuance-active-order-scope-frozen-current-basis-progress-and-pagination-contract.md)。

独立指南 `/mrp/production-material-issuance-guide` 位于“生产管理 → 生产操作手册 → 如何生产领料”。首页自动生成指南卡片，工作区提供按权限显示的阅读入口。五章说明备料范围、下发与打印、仓库确认、补退和异常核对。标题、能力范围说明和章节导航固定，只有当前正文滚动，切换章节重置正文位置；不自动打开业务弹窗或发起业务请求。

后端已实现独立的来源核对、下发／撤回、冻结历史、幂等、覆盖约束和订单写入口保护，并注册正式模型迁移。总体进度只读入口为 `GET /api/v1/mrp/production-material-issuance/active-order-progress`，与原单查询保持独立；其他只读 HTTP 为 `POST /api/v1/mrp/production-material-issuance/source-review`、`GET /api/v1/mrp/production-material-issuance/documents` 及 `GET /api/v1/mrp/production-material-issuance/documents/:id`。MRP 分析抽屉在完整分析后明确点击核对，传入全部真实来源及采用 BOM；成品重量和性能版本一起突出展示，配方贡献直接读取服务端结果，不增加算法。范围、选择或分析状态变化会卸载旧核对，防止旧请求污染新范围。

下发 HTTP 为 `POST /api/v1/mrp/production-material-issuance/dispatch`，撤回为 `POST /api/v1/mrp/production-material-issuance/documents/:id/withdraw`。在核对后确认全部订单行范围才下发；撤回填写原因并提交查看时的单据版本。成功显示正式单号和后端冻结依据，旧下发请求返回已撤回原单时明确说明未建立新单。下发／撤回均不确认仓库收发，也不扣减库存。

本地 DEV 后端已重启以加载新增来源接口和仓库前提查询，验证未创建真实领料单或写真实库存。原单领退界面已接入；正式打印、消息及主动待办仍待实现，不能用单据列表替代未下发来源在内的总体需求。

仓库 Go 领域事务与 HTTP 已接入；本轮复用共用批次可用量查询，并建立独立 DTO、service、Query、原单进度／交接区域和单物料批次表单。入口、职责、版本及会话内稳定重试详见[仓库界面契约](production-material-issuance-warehouse-handover-entry-batch-selection-order-allocation-and-session-stable-confirmation.md)。

页面使用路由派生权限 `tab_mrp_production_material_issuance`，沿用 `menu_mrp` 权限回退；模块页签按账号权限投影。侧栏仍沿用现有 MRP 菜单权限。页面内“查看料号需求”“查询仓库库存”分别按目标路由权限显示，领料页权限不扩展为其他业务页权限。

查询另需 `action_production_material_issuance_view`（生产领料：查看依据与单据），前端无该动作权限时不挂载读取组件、不发请求。来源核对检查认证身份、MRP 业务访问和独立查看动作；正式单据及仓库进度查询的业务访问另接受 `menu_warehouse`，无需仓库账号额外开放 MRP 页面。仅页面／指南、仅动作或仓库出库权限均不能代替。当前授权明确覆盖系统共享生产数据，不按下发人过滤，也未实现客户／组织数据隔离。未来细分范围须在后端来源读取及分页统计前统一落实。查看动作不授予发送、撤回或仓库确认。

下发另需 `action_production_material_issuance_dispatch`，撤回另需 `action_production_material_issuance_withdraw`，互不替代。命令控件以账号与依据／单据版本作为挂载边界，明确请求通过 React Query 保存，当前会话中关闭再展开后仍能按原请求重试。超时、网络或响应异常显示结果未确认，4xx 拒绝另行提示；不自动换命令键，不离线排队或重放。会话重载后先查历史、重新核对，有效覆盖继续防止重复；未建立跨刷新客户端正式账。

## 职责和数量口径

| 范围           | 责任与边界                                                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 料号需求 / MRP | 订单完整数量乘 BOM 标准用量的理论分析；当前规则不因新增领料页改变，不按已完工、已发货或已领料自动扣减                                    |
| 生产领料       | 发起选单、BOM 前提核对及正式下发；同一需求依据上的总体物料待领与订单行进度；保留下发覆盖、冻结依据、逐订单行领退归属及差异，提供原单追溯 |
| 仓库           | 正式确认发料和接收退料，完成库存过账；只有正式确认结果才能进入已领和已退                                                                 |
| 排产与生产执行 | 决定如何分批生产；排产、完工和下发记录不自动成为物料收发或实际消耗事实                                                                   |

备料范围可以覆盖整条订单，也可以组合多个订单明细，但必须保留来源和覆盖数量；分批生产与一次领齐并不矛盾。总体范围以有权限的有效订单行查询为准，包含未下发来源；不能只查询已有领料单而漏掉未办理需求。MRP 保留计算、下发与打印的发起入口，正式命令由生产领料后端领域承接。将来支持分批备料时，由后端核对同一来源的覆盖关系，不能由组件自行累加或推断剩余范围。

共用需求最小粒度为稳定订单行、物料与采用的 BOM 依据；同一订单行重复物料贡献先汇总。未下发显示当前待核对需求，已下发采用冻结依据，同一来源只计一次；依据缺失或变化单独提示。物料和订单视角共用相同查询范围，不能各自维护另一套需求计算或正式账。

| 显示数量           | 口径                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------- |
| 标准应领           | 覆盖成品数量 × 本次采用 BOM 的物料标准用量；标准用量已包含的损耗不重复加               |
| 累计已领（含补料） | 仓库正式确认的首次及后续发料合计；申请、草稿、打印不计入                               |
| 累计退料           | 仓库正式确认接收的退料合计；待确认退料不冲减净领料                                     |
| 净领料             | 累计已领 − 累计退料                                                                    |
| 尚待领料           | 每条订单行 `max(标准应领 − 净领料, 0)`，再按同物料同单位汇总；不等于库存缺口或现场余料 |
| 超标准领料         | 每条订单行 `max(净领料 − 标准应领, 0)`，再单独汇总，不能抵消其他订单行待领             |

A 行标准 200、净领 220，B 行标准 200、净领 160：总体待领 40、超标准 20，不能将总标准减总净领得出的 20 当作总体待领。需求、库存缺口与包装换算统一沿用料号需求的共用能力，生产领料不基于待领再建另一套缺口算法。不同料号和不可兼容单位不合成一个数量总计；全范围统计由后端先聚合后分页，不从当前页推算。

合并下发、拣料和一次确认时，后端按下发保存的来源顺序及待领量提出分配建议；仓库核对本次总量，可展开调整各订单行归属。确认同时检查版本、分配守恒和库存，保存实际发料及分配。补料有明确订单行和原因，退料沿原发料分配校验可退量；归属只用于领料核对，不代表实际消耗。详细约束以架构契约为准。

例如 2,000 件、每件标准用量 2 m²，则标准应领 4,000 m²。现场先排产 100 件，不会自动将整单备料范围改为 100 件；可以按已确认的范围一次领齐或分次领料。领足后再补 30 m² 应保留补料事实、原因和超标准差异，不覆盖原始数量，不修改订单或 BOM 来掩盖差异。实际消耗、报废和现场结余需要独立事实依据。

## 文件职责

| 文件                                                                                                                                                                                       | 职责                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| [页面壳](../../src/features/production-material-issuance/pages/production-material-issuance-page.tsx)                                                                                      | 业务标题、目标权限链接、整体可用性说明                                              |
| [进度工作区及单据追溯布局](../../src/features/production-material-issuance/components/production-material-issuance-progress-workspace-with-document-traceability.tsx)                      | 共同范围、物料／订单视角、真实单据追溯和原单领退区域，无正式计算                    |
| [来源核对与冻结单据 DTO](../../src/features/production-material-issuance/contracts/production-material-issuance-source-review-and-frozen-document-api-dto.ts)                              | 复用共享需求依据 schema，校验来源、重量、贡献、指纹、单据状态与分页完整性           |
| [只读 API service](../../src/features/production-material-issuance/services/production-material-issuance-source-review-and-document-query-service.ts)                                      | 核对／分页／详情请求及响应身份验证，无 toast 或跨模块副作用                         |
| [只读 React Query hooks](../../src/features/production-material-issuance/hooks/use-production-material-issuance-source-review-and-document-queries.ts)                                     | 显式触发的只读 POST、列表与详情查询；远端快照归 Query 管理，查询可取消              |
| [来源核对与下发流程](../../src/features/production-material-issuance/components/production-material-issuance-source-basis-review-and-dispatch-workflow.tsx)                                | 查看权限、明确读取、核对结果、挂载独立下发控件，不计算或直接拼装业务事务            |
| [冻结单据追溯](../../src/features/production-material-issuance/components/production-material-issuance-frozen-document-traceability.tsx)                                                   | 查看权限边界、分页、状态筛选、刷新和原区域详情展开                                  |
| [来源与配方明细展示](../../src/features/production-material-issuance/components/production-material-issuance-source-basis-details.tsx)                                                     | 核对与历史共用展示，突出重量／性能版本，直接显示后端配方贡献                        |
| [命令 DTO](../../src/features/production-material-issuance/contracts/production-material-issuance-reviewed-dispatch-and-versioned-withdrawal-command-api-dto.ts)                           | 明确来源／版本／指纹、规范命令 UUID、来源去重与撤回原因 UTF-8 长度验证              |
| [命令 API service](../../src/features/production-material-issuance/services/production-material-issuance-reviewed-dispatch-and-versioned-withdrawal-command-service.ts)                    | 专用请求与正式响应的身份／版本／指纹／状态核对，无 toast 或跨模块副作用             |
| [明确命令与稳定重试 Hook](../../src/features/production-material-issuance/hooks/use-production-material-issuance-explicit-dispatch-withdrawal-and-stable-request-retry.ts)                 | 会话内按账号及范围保存请求变量、防双击、明确同键重试，成功更新单据 Query 并失效查询 |
| [查询及命令缓存键](../../src/features/production-material-issuance/data/production-material-issuance-query-and-explicit-command-cache-keys.ts)                                             | 统一查询失效及账号／动作／范围隔离，不承接数据或业务账                              |
| [下发控件](../../src/features/production-material-issuance/components/production-material-issuance-reviewed-basis-explicit-dispatch-command-panel.tsx)                                     | 独立下发权限、全部范围确认、正式结果与原单已撤回提示                                |
| [撤回控件](../../src/features/production-material-issuance/components/production-material-issuance-frozen-document-versioned-withdrawal-command-panel.tsx)                                 | 独立撤回权限、无执行事实边界、原因、原单版本及原区域确认                            |
| [命令错误和原请求重试说明](../../src/features/production-material-issuance/components/production-material-issuance-command-failure-and-stable-retry-guidance.tsx)                          | 区分明确拒绝和结果未知，不将超时显示为未提交                                        |
| [物料待领汇总](../../src/features/production-material-issuance/components/production-material-issuance-active-scope-material-summary.tsx)                                                  | 展示后端六项数量、来源行数及已知部分说明                                            |
| [订单行进度](../../src/features/production-material-issuance/components/production-material-issuance-active-scope-order-line-progress.tsx)                                                 | 默认展示各订单行的物料与关键数量，折叠配方及累计领退明细，异常原因始终可见          |
| [应领、净已领与待领数量](../../src/features/production-material-issuance/components/production-material-issuance-material-required-net-issued-and-remaining-quantities.tsx)                | 双视角共用的紧凑数量展示，逐物料保留单位，待领及超领突出显示，无数量计算            |
| [数量口径说明弹层](../../src/features/production-material-issuance/components/production-material-issuance-quantity-meaning-help-popover.tsx)                                              | 可复用、无蒙版的数量定义帮助，无计算或库存写入                                      |
| [中文内容](../../src/locales/messages/zh-CN/production-material-issuance.ts)、[英文内容](../../src/locales/messages/en-US/production-material-issuance.ts)                                 | 独立维护文案，通过既有 `mrp.productionMaterialIssuance` 注入词典                    |
| [MRP 页签](../../src/features/mrp/tabs.ts)                                                                                                                                                 | 业务页签声明，导航预览和首页沿用既有生成链路                                        |
| [指南页面壳](../../src/features/production-material-issuance/pages/production-material-issuance-operation-guide-page.tsx)                                                                  | 固定标题、五章切换和能力范围说明                                                    |
| [指南章节定义](../../src/features/production-material-issuance/data/production-material-issuance-operation-guide-chapter-definitions.ts)                                                   | 稳定章节、主题顺序和原页面地址                                                      |
| [指南章节解释](../../src/features/production-material-issuance/components/operation-guide/production-material-issuance-operation-guide-chapter-explanations.tsx)                           | 解释、权限链接和标为示例的领退过程，复用数量帮助                                    |
| [指南中文](../../src/locales/messages/zh-CN/production-material-issuance-operation-guide.ts)、[指南英文](../../src/locales/messages/en-US/production-material-issuance-operation-guide.ts) | 通过 `mrp.productionMaterialIssuanceGuide` 接入词典                                 |

指南派生权限 `tab_mrp_production_material_issuance_guide` 沿用 `menu_mrp` 回退，专属指南权限不授予工作区、订单、库存或业务动作。指南不混入 MRP 两个业务页签，路由目录和前后端页面权限契约通过现有脚本生成。

## 后续实现顺序

1. 共用逐订单行需求分析、稳定来源身份、冻结下发与覆盖保护，以及只读核对／正式单查询 HTTP、独立查看权限、前端 DTO／service／Query 均已建立，详见[共用计算契约](../architecture/production-material-requirement-shared-expansion-bom-selection-stock-allocation-and-packaging-calculation-contract.md)。查看动作与页面路由权限均不等同于下发或仓库确认权限。
2. 明确下发／撤回动作、命令 HTTP 与独立前端 DTO／service／Hook／控件已接入。下发提交真实订单／行 ID、明确 BOM、预期版本及指纹，一次 1 至 500 条整行来源；同键重试返回原单当前状态，不冒充再次下发。组件仅保存选中、确认及原因等临时交互，不用浏览器存储承接正式领料账。
3. 仓库专用领域命令确认发料、补料、退料，由后端原子维护订单行分配、库存过账、权限、并发、幂等及审计；生产领料引用已确认的收发与归属事实，不维护第二套库存余额。
4. 后端对完整有效订单范围提供物料汇总和订单行进度查询，包含未下发需求，逐行汇总待领和超标准，并引用共用需求、库存缺口和包装结果；前端不从完工、发货、生产下发数量反推已领，不直接套用销售出库确认路径。
5. MRP 已提供明确核对后下发，继续完善正式打印、原单定位、仓库待办及消息；不能将分析打印当成正式单据或实际交接。旧分析与正式单保留可追溯来源，不反向耦合 MRP 理论需求。

现有裁纱下发不是 BOM 物料级领退事实。原单状态仍只有 DISPATCHED／WITHDRAWN；实际进度读取已确认交接及订单行分配，不能用执行标记伪造已领。下发／撤回与仓库确认分别由独立 Hook 承接，均不走销售出库。

## 验证与维护

[指南阅读及导航测试](../../src/features/production-material-issuance/pages/production-material-issuance-operation-guide-reading-navigation-and-availability.spec.tsx) 覆盖五章切换、正文重置、固定能力范围说明、无业务请求、两页职责、订单行归属、待领与超标准分开、独立手册权限、首页卡片、目标链接权限和双语内容。浏览器隔离业务请求，验证 1366、768、390、320 像素宽度下的固定标题和章节、单正文滚动、无横向溢出及英文布局；这些仅验证说明页，不代表正式领料闭环已验收。

[集成测试](../../src/features/production-material-issuance/pages/production-material-issuance-navigation-view-permission-boundary-and-quantity-help.spec.tsx) 覆盖导航注册、业务页签权限隔离、侧栏归属、首页去重、物料／订单视角切换与同一范围、查看权限边界、授权目标链接及双语帮助。浏览器检查桌面、平板与手机布局，以及弹层的无蒙版交互。总体进度新增独立的范围、分页、异常来源、失败恢复及双视角测试；文件边界、算法复用与规模限制见有效订单进度契约。

[只读交互回归](../../src/features/production-material-issuance/components/production-material-issuance-readonly-review-permissions-frozen-history-and-request-failures.spec.tsx) 覆盖无动作权限不读取、明确核对、版本与重量、旧分析异步结果清理、历史展开、状态筛选及失败与空列表区分；[响应契约回归](../../src/features/production-material-issuance/services/production-material-issuance-source-review-response-identity-pagination-and-frozen-document-validation.spec.ts) 覆盖来源／BOM／单据身份、配方完整性、分页与状态校验。浏览器隔离全部业务 API，验证只读组件桌面和移动端的布局及展开，不对真实业务库写入。

[命令交互回归](../../src/features/production-material-issuance/components/production-material-issuance-command-permissions-explicit-confirmation-stable-retry-and-scope-isolation.spec.tsx) 覆盖权限、核对和显式确认、双击、网络未知结果、重挂载后同键重试、离线不排队、账号／范围隔离、已撤回原单、撤回原因／版本，以及撤回后下发结果区同步原单最新状态；[命令响应契约](../../src/features/production-material-issuance/services/production-material-issuance-command-payload-frozen-basis-identity-and-withdrawal-response-validation.spec.ts) 验证只传正式依据身份、未知字段拒绝、UTF-8 长度和正式响应校验。相关前端 9 个文件、49 项回归通过。隔离浏览器验证首次响应失败后的原请求重试、原单展开、撤回原因必填、历史保留及桌面／手机布局，不代表真实数据库或仓库库存流程验收。
