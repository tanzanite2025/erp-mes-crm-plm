# 生产领退：仓库入口、批次选择、订单行归属与会话内原请求重试

复核日期：2026-10-27。本文承接[工作区边界](production-material-issuance-workspace-tab-and-warehouse-confirmed-movement-integration-boundaries.md)与[仓库 HTTP 契约](../architecture/production-material-issuance-warehouse-http-review-allocation-suggestions-confirmation-permissions-and-error-contract.md)，只说明本轮仓库界面及查询对接。

## 当前入口与操作

仓储模块增加 `/warehouse/production-material-handovers`（生产领退），复用原领料单列表、冻结详情与领退办理组件，不建立第二套单据或库存账。仓库组合页隐藏生产撤回控件。生产管理的原单追溯也能查看同一领退区域；实际办理仍要求仓库访问及对应动作权限。

仓库页选中原单后自动展开“仓库领退与单据进度”并请求核对；下发成功通过经校验的 `?documentId=<UUID>` 直接定位同一原单。生产页追溯仍按需展开。区域直接显示本单各订单行的六项进度、办理表单与手风琴交接历史，不增加嵌套弹窗。仓库页使用路由派生权限 `tab_warehouse_production_material_handovers`，沿用 `menu_warehouse` 回退；查看另需 `action_production_material_issuance_view`，发料、补料、退料分别需要各自的仓库动作权限。页面权限和查看权限不隐式授予动作。

首期每次确认一种物料、一个批次，多个批次或分次交接继续使用原单；后端多物料批次命令能力保留。发料填写实际数量后，明确获取后端分配建议，展示该物料的全部覆盖订单行，可调整数量，零分配不提交。正分配合计须等于本次数量，各行普通发料上限由后端复核。补料明确一个订单行并必填原因；退料选择原发料分配，选项同时显示订单行、批次及后端剩余可退量，按原分配和原成本退回。确认前须勾选实际交接核对。

批次选项显示生产物料仓库可领量，并列展示库存、有效预留和可领数量。单位沿用冻结主单位，前端不换算、不四舍五入。查看失败明确报错并阻止发料，不回退到其他仓库。选择批次不预留、不锁库存，确认事务重新检查实际可用量。

## 共用查询及数据范围

`POST /documents/:id/material-batches` 只接受 `{expectedVersion,materialId}`，返回 `{documentId,expectedVersion,materialId,unit,items}`。查询校验已下发状态、查看版本、冻结物料身份、当前物料有效性／主单位以及系统仓库能力。读取使用一致快照，只返回固定 `MATERIAL` 下真实余额批次。

`QueryMaterialInventoryBatchAvailability` 是批次余额扣除有效 `RESERVED` 的共用入口；原 MRP 物料级 `QueryMaterialInventoryAvailability` 聚合它，不另建缺口或包装算法。只有预留而无余额的批次保留给聚合查询计入预留，拣料 API 过滤这些不可拣批次。负数、非有限量、同物料／仓库／批次重复余额均报错，不能悄悄相加。

`warehouse-review.returnableAllocations` 是必须存在的数组，字段为原分配 ID、订单行 ID、物料 ID、批次、单位和剩余可退量。后端从原分配扣除已确认退量投影；前端不得自行建立正式可退量算法，旧响应缺字段应报错。

`warehouse-review.warehouseActionBlockers` 是必有对象，含 issue、supplement、return 三个字符串；空字符串表示当前系统仓库能力满足该动作，有值则给出阻塞原因。前端在数量输入前展示问题，只呈现权限及能力同时满足的动作；能力改变时重建编辑器，事务内仍按锁定的最新仓库能力重新检查。生产首领入口、来源准备和导航职责见[发起流程架构及验收](../architecture/production-material-issuance-start-entry-source-selection-prerequisite-validation-shared-workflow-and-warehouse-handoff-architecture-review.md)。

界面六项数量只对应当前单据覆盖的订单行。全有效订单范围包含未下发来源，已由独立只读查询接入生产领料工作区，不能把当前原单或当前分页冒充总体进度；见[总体进度契约](../architecture/production-material-issuance-active-order-scope-frozen-current-basis-progress-and-pagination-contract.md)。MRP 的需求、库存缺口和包装计算继续只有一个来源；MRP 现有分析是明确触发的快照，交接后需要重新分析，不在仓库命令后自动重跑全部 MRP。

## 提交、重试与缓存

前端首次明确确认时深复制完整请求并生成命令 UUID，操作者来自认证上下文，不放入 body。React Query MutationCache 在当前 QueryClient 会话按“账号＋原单”保存一次未完成仓库命令，动作和原版本都保留在载荷内，不按新版本换缓存键。关闭再展开或原单版本更新都保留原请求；未知结果只允许明确按原请求重试，不能直接开始另一笔。

成功或明确 4xx 拒绝后，才提供“重新核对后办理下一次”；重新读取原单后再填写。请求禁止自动重试、离线排队和自动重放。换账号不显示前一账号请求，丢失对应动作权限时禁用重试；后端仍是权限和事务的权威。整页刷新或重开应用不承接离线账，先查历史再核对。

用户明确选择重新核对时，同时移除本次命令 UUID 对应的全部已结束重试记录，避免关闭再打开后重新恢复已放弃的拒绝请求。提交中及结果未知的请求不能清除。原单列表、冻结详情及下发／撤回结果缓存也按账号隔离，新账号等待查询或查询失败时不能读取前一账号的原单缓存。

service 仅请求并验证身份、版本及载荷匹配，不触发 toast 或 Query 刷新。查询键含账号，查询支持取消；修改物料、动作或版本卸载旧填写区域，避免旧建议污染新表单。成功后由 Hook 失效原单／进度与仓库库存相关查询。重放允许原单当前版本更高，原交接版本仍须等于提交预期版本加一。

## 文件职责

| 文件                                                                                                                                                                                       | 职责                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| [仓库组合页](../../src/features/production-material-issuance/pages/production-material-issuance-warehouse-handover-handling-page.tsx)                                                      | 仓库说明及原单列表，关闭生产撤回控件                 |
| [领退 DTO](../../src/features/production-material-issuance/contracts/production-material-issuance-warehouse-review-batch-availability-and-confirmed-movement-api-dto.ts)                   | 必有投影、身份、单位及命令格式校验，无业务需求算法   |
| [领退 service](../../src/features/production-material-issuance/services/production-material-issuance-warehouse-review-batches-suggestions-and-explicit-confirmation-service.ts)            | 核对、批次、建议及专用确认接口，验证响应身份和原载荷 |
| [查询与稳定确认 Hook](../../src/features/production-material-issuance/hooks/use-production-material-issuance-warehouse-queries-and-session-stable-explicit-confirmation.ts)                | Query、原请求、防双击、重试与成功失效                |
| [原单进度和交接区域](../../src/features/production-material-issuance/components/production-material-issuance-warehouse-document-progress-movement-history-and-inline-handling-section.tsx) | 权限投影、懒展开、单据进度、恢复区及交接历史         |
| [单物料批次及分配表单](../../src/features/production-material-issuance/components/production-material-issuance-single-material-batch-and-order-allocation-confirmation-editor.tsx)         | 临时选择、数量、建议核对和明确确认                   |
| [冻结订单行显示工具](../../src/features/production-material-issuance/utils/production-material-issuance-frozen-order-line-display-label.ts)                                                | 以冻结订单号／行号／产品名标识归属                   |
| [共用批次查询](../../server/services/material_inventory_batch_availability_shared_balance_reservation_and_duplicate_validation_query.go)                                                   | 显式仓库范围、余额、有效预留、重复与异常校验         |
| [单据批次查询](../../server/services/production_material_issuance_versioned_frozen_material_batch_picking_availability_query.go)                                                           | 版本及冻结身份保护、固定系统仓库能力、主单位核对     |

生产侧领料指南的双语文案独立维护，解释流程并按目标权限链接到仓库页；仓储手册按步骤办理的入口见下一节。总体范围已接入，正式打印和消息仍明确为待接入。

## 仓储生产领退操作手册

仓储管理操作手册增加独立页面 `/warehouse/production-material-handovers-guide`（如何办理生产领退），生产领退页标题区域也提供指南入口。它面向仓管人员，按办理前准备、分批发料、补料、原单退料、进度与对账、异常与重试六章说明实际字段和确认步骤，并给出分次发料、补料、退料后的数量示例。生产侧的领料与下发指南继续保留。

单纯阅读时只读取本地双语文案及账号权限，不挂载单据、批次查询或库存命令。各步骤现在可明确打开共用的原单办理弹窗，复用正式单列表、冻结详情、领退表单、版本检查及原请求重试；发料、补料、退料步骤只呈现对应办理类型，查看步骤隐藏写入控件。异常恢复入口只核对记录与恢复会话中已有请求，不直接发起新交接。已有的“发起领料”弹窗在准备步骤按生产下发权限复用。

章节导航和标题固定，正文独立滚动；关闭弹窗保留阅读位置和已选原单，切换账号清空原单选择。未知结果关闭再打开仍沿用 QueryClient 中同账号、同原单的原请求，不能通过切换补料或退料步骤绕过未完成请求。查看和动作权限分开验证，系统仓库能力仍由原办理区域与后端复核。手册目录、首页快捷入口、全局搜索及最近访问统一指向该页面。章节结构、正文组件和双语文件分别位于 `src/features/warehouse/data`、`src/features/warehouse/components` 和 `src/locales/messages/{zh-CN,en-US}/production-material-handovers-operation-guide.ts`。

## 验证范围

后端隔离 SQLite 回归覆盖批次预留／仓库隔离、只读不写账、版本／身份／授权、重复余额与异常预留，以及部分退料后的原分配可退投影。随后在真实 PostgreSQL 随机隔离 schema 内完成并发下发、订单编辑争用、同单重复仓库确认及跨单批次争用验证；证据见发起流程架构第 9、10 节。

前端回归覆盖只读权限不挂写入／批次请求、明确批次与建议、确认、防双击、未知结果关闭重开后的同载荷重试、新单据版本不换原命令、账号／权限隔离、补料归属／原因、原分配退料上限和响应契约。浏览器使用模拟 API 检查桌面及手机完整入口与填写，不能作为真实库存业务验收。本地 DEV 后端已重启加载实现，未创建真实领料单或写入真实库存。

本轮关联前端 12 个文件、63 项回归通过；TypeScript、定向 ESLint、双语结构、中文编码、路由目录及权限目录检查通过。Go services／handlers／authz／routes／db 回归通过，补充的空原单及全部退完场景保证 `returnableAllocations` 始终返回数组。全局动作权限闭环仍有既有两处漏绑：`POST /engineering/bom/:id/revise` 和 `PUT /approvals/policies/:businessType`，本轮仓库入口未新增漏绑。

隔离浏览器验证中文和英文 1366／390／320 像素布局无横向溢出，以及发料首次响应丢失后同载荷重试、退料和补料。示例发料 10、退料 3、补料 45 后，累计已领 55、累计退料 3、净领 52、超标准 2，第一笔分配剩余可退 7；这些为浏览器模拟数据，不是实际业务记录。

2026-10-29 指南弹窗复审修复原单读取缓存未按账号隔离、明确拒绝并重新核对后旧请求在重开时恢复两处问题。新增回归覆盖新账号等待列表、新账号详情拒绝、拒绝请求清理后跨章节重开、提交中关闭重开，以及只读查看与恢复动作权限撤销。生产领料模块及仓储指南共 14 个测试文件、81 项测试通过，TypeScript、定向 ESLint、格式、双语结构、中文编码和路由目录检查通过；本轮未写入真实业务数据。
