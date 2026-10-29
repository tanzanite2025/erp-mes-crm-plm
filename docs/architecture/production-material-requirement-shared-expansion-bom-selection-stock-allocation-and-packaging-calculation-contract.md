# 生产物料需求共用计算：BOM 选择、库存分配与包装契约

复核日期：2026-10-27。共用能力已接入 MRP 分析及正式下发；核对／历史查询和明确下发／撤回已接入 HTTP 与前端。仓库确认、单据级领退进度及库存移交已接入 Go 领域层、HTTP 和独立动作权限，原单内仓库界面已接入，总体订单范围进度仍待接入。

## 职责与复用

Go 提供唯一的逐订单行配方展开、指定仓库可用量与分组包装投影。MRP 使用完整订单数量形成理论需求；生产领料下发领域层已引用同一配方展开能力冻结依据，后续另外关联真实领退事实。生产领料不得另建需求、库存缺口、包装算法或库存余额。

TS 负责 Zod 校验、全部选单分页、用户的配方选择、React Query 查询及展示，不把浏览器数据保存为正式依据。查询不预占、不扣库存、不创建单据。

## 数据和选择

MRP 与生产领料总体进度共用有效订单读取：未删除、非报价且处于 `Pending`／`Scheduling`／`InProgress` 的订单。当前配方主数据读取也共用独立入口，展开与库存／包装算法继续由原公共能力负责。[总体进度契约](production-material-issuance-active-order-scope-frozen-current-basis-progress-and-pagination-contract.md)说明冻结来源替换当前来源的去重规则；总体进度不修改 MRP 的完整订单理论数量。

每条来源保留 salesOrderId、salesOrderLineId、orderVersion、orderNo、lineNo、产品／客户、finishedQty、productModel（模具查询原键）、展示名称、候选 BOM、采用 BOM 和配方贡献。每个贡献保留 bomItemId、materialId、section、unit、standardUsage、requiredQty。

候选仅含同产品、未删除、已发布 MBOM，按 UTC 日历日期核对生效区间，起止日期均包含；空日期不限制。当日时间由服务端传入，不使用浏览器时钟。优先同客户专供，存在时不混入企业配方；否则使用企业自有。唯一候选自动采用，多份候选由用户逐订单行明确选择，候选稳定排序只用于展示，不代表最新或默认配方。性能版本编码保留为身份键，另从现有选项目录只读取得中英名称供展示，不能将编码当作用户可读名称，也不调用会补种选项的写入服务。

选择绑定订单 ID、行 ID、BOM ID。失效选择不会自动换配方。旧选单地址协议仍为“订单号-行号”，只从最后一个连字符解析，坏格式、不存在来源或越范围选择报错，不能回退全量。

缺少适用 BOM、多份待选、失效选择、无效物料、单位不一致、无效用量或空配方会在来源行返回 issueCode；任何来源不完整时 isComplete=false，requirements 为空，界面先核对且禁打印、导出。没有可选订单是空范围，不表示错误记录需求为零。

## 数量、库存与包装

每贡献为完整成品数量乘已保存标准用量，不重复加损耗、不用成品重量反推、不递归子 BOM。配方与物料主单位必须一致，库存也必须一致，不猜换算。

同分组同物料合并；同来源重复配方贡献相加，sourceOrders.qty 成品数量只记一次，requiredQty 才是该来源的物料贡献。保留每条配方行 ID 及 BOM 版本。

只读取固定系统仓库 MATERIAL（生产物料仓库），且仓库须存在、启用、允许出库。逐物料／仓库／批次取余额与有效 RESERVED 占用：available=sum(max(balance-reserved,0))。批次可用量由 QueryMaterialInventoryBatchAvailability 共用查询承接，MRP 聚合结果与仓库拣料读取同一口径，不另建缺口算法。不把研发仓库计入，也不把释放占用继续扣减。独立质检状态判断、采购在途与生产在制尚未接入。

跨分组同物料共用库存，按 section、materialId 固定顺序计算剩余可用量：

- inventoryQty、lockedQty、usableStock 是共享快照，不能逐行相加。
- allocatedStockQty 是本组分配预览；totalSupply 当前等于本组分配。
- effectiveGap=max(totalRequired-totalSupply,0)。
- shortageGap 用相同顺序分配实物余额后比较，不扣占用。

例如两组各需 60，实物 100、无占用，则分配 60 与 40，合计缺 20。该顺序只让分析可复现，不预占库存，不规定仓库交接顺序。实际确认仍须事务锁及重校验。

包装保持按本组 totalRequired 计算：forward 为 ceil(total/factor)，reverse 为 ceil(total\*factor)。单位、方向、正有限因子必须有效，结果必须在支持范围。展示与导出明确标为“总需求包装”，不把它混称为缺口采购包装。

## 文件职责

| 文件                                                                                                                                                                             | 职责                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [basis contract](../../server/services/production_material_requirement_basis_contract.go)                                                                                        | 来源、配方候选、选择与贡献公共类型                               |
| [BOM selection](../../server/services/production_material_requirement_bom_selection.go)                                                                                          | 发布、生效区间、客户归属与候选规则                               |
| [expansion](../../server/services/production_material_requirement_expansion.go)                                                                                                  | 纯快照展开与逐行完整性校验                                       |
| [display projection](../../server/services/production_material_requirement_display_projection.go)                                                                                | 产品展示名称及默认文字，不影响模具型号                           |
| [inventory query](../../server/services/material_inventory_availability_query_service.go)                                                                                        | 调用者 DB／tx 内显式仓库与批次可用量查询                         |
| [supply and packaging](../../server/services/production_material_requirement_supply_and_packaging.go)                                                                            | 分组、来源贡献归并、库存分配及包装投影                           |
| [MRP response](../../server/services/mrp_requirement_response_contract.go)                                                                                                       | MRP 展示响应契约                                                 |
| [MRP orchestration](../../server/services/mrp_requirements.go)                                                                                                                   | 数据读取、公共能力调用、模具统计                                 |
| [frontend DTO](../../src/features/mrp/contracts/production-material-requirement-analysis-api-dto.ts)                                                                             | 运行时 Zod 验证及推导类型                                        |
| [order loading](../../src/features/mrp/services/production-material-requirement-order-selection-service.ts)                                                                      | 全部有效订单分页、重复及中途范围变化检查                         |
| [basis review](../../src/features/mrp/components/requirements/production-material-requirement-bom-basis-review.tsx)                                                              | 单面板逐行核对及配方选择，无嵌套弹窗                             |
| [production issuance review and dispatch](../../src/features/production-material-issuance/components/production-material-issuance-source-basis-review-and-dispatch-workflow.tsx) | 完整分析后明确核对，再由独立权限控件确认全部来源下发，不复制计算 |

## 后续接入的前置条件

当前 MRP 查询是多次读取的分析参考，不是正式事务快照。[销售编辑及同步的行身份规则](sales-order-line-stable-identity-edit-reorder-version-and-production-material-source-reference-contract.md)已修正并完成隔离回归：正式来源使用真实订单及明细 ID，行号只用于显示。[正式来源核对服务](../../server/services/production_material_issuance_source_review_and_frozen_basis_service.go)先定位真实来源，再调用本共用展开；下发事务重新校验来源／BOM 版本与完整依据指纹、建立有效覆盖并冻结选中配方及重量。空范围、重复来源和缺失明确 BOM 不会变为全量下发，前端汇总不直接进入正式单。

MRP 分析抽屉现提供“核对生产领料依据”，要求完整分析及独立查看动作权限；核对只读取当前真实依据，展示重量／性能版本与逐配方贡献，不生成单据或占用库存。分析范围、选择、完整性和加载状态变化时卸载旧结果，迟到响应不能挂到新范围。该权限当前允许系统共享生产范围，不代表客户／组织级数据隔离；具体路由与授权见生产领料契约。冻结单据追溯位于生产领料页，与当前 MRP 分析分开查询。

已核对后可在具有独立下发权限时确认全部范围，向专用领域命令提交来源、明确 BOM、预期版本及指纹；服务端重新核对并冻结，不能直接采用浏览器数量。单据详情另有独立权限及版本／原因约束的撤回。两种命令都不反向修改理论分析，重试沿用同一请求，旧原单已撤回时不冒充新下发。

下发只冻结需求，不读取、预占或扣减库存，不把当次库存缺口或包装投影存成正式收发事实。历史单据查询只读已冻结依据，当前 MRP 分析仍按当前有效配方运行；总体领料查询接入时须选择当前未下发或已有有效冻结依据，不能叠加两者。仓库确认另做实际发退、归属守恒、库存过账、幂等和审计。

仓库领退领域层现已建立，单据级进度直接归并冻结的 `RequiredQty`，再叠加正式发退归属，不重新展开 BOM 或重算库存缺口和包装。默认分配只沿冻结来源顺序及各行待领量提出建议；确认校验原单版本和明确分配。具体的固定保管去向、原成本退料、原子库存移交和未开放界面边界见[正式仓库交接契约](production-material-issuance-confirmed-warehouse-movements-order-line-allocation-and-custody-inventory-transfer-contract.md)。

已实现文件、待接入边界与验证范围见[下发、仓库确认和过账契约](production-material-issuance-dispatch-warehouse-confirmation-and-inventory-posting-contract.md)。指南同步当前规则，区分已接入的原单领退及待接入的总体进度、正式打印和消息。
