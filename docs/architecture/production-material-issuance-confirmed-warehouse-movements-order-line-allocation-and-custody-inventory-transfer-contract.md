# 生产领退：正式交接、订单行归属和库存保管去向

建立日期：2026-10-27。本文件承接[生产领料总契约](production-material-issuance-dispatch-warehouse-confirmation-and-inventory-posting-contract.md)中的仓库领域层。

## 当前交付范围

Go 已提供单据级仓库核对、普通发料分配建议、带版本的实际发料／补料／退料命令。正式交接、订单行分配、两个库存余额、成对库存流水、单据版本、幂等回执和审计使用同一事务。

仓库 HTTP、独立办理权限及原单办理界面已接入，见[仓库 HTTP 契约](production-material-issuance-warehouse-http-review-allocation-suggestions-confirmation-permissions-and-error-contract.md)和[仓库界面契约](../frontend/production-material-issuance-warehouse-handover-entry-batch-selection-order-allocation-and-session-stable-confirmation.md)。单据内显示真实投影，全订单范围进度已由独立只读查询接入。未迁移真实业务库或写真实库存。

本文件中的仓库核对只覆盖一张正式单据，不能替代包含未下发订单的总体进度查询。批次可领量及仓库界面已接入；[总体进度查询](production-material-issuance-active-order-scope-frozen-current-basis-progress-and-pagination-contract.md)独立承接全有效订单范围、冻结／当前依据去重及分页前汇总，复用本领域的领退校验投影。

## 物料去了哪里

| 固定编码                                  | 用户含义                                   | 写入职责                             |
| ----------------------------------------- | ------------------------------------------ | ------------------------------------ |
| `MATERIAL`                                | 生产物料仓库，尚在仓库可分配的生产物料     | 既有采购／入库流程及专用生产领退事务 |
| `PRODUCTION_MATERIAL_PENDING_CONSUMPTION` | 生产待耗用物料，已经交到生产、尚未确认消耗 | 仅专用生产领退事务                   |

第二项是系统固定的库存保管去向，已加入预置分类；前端接入时自动带入，不新增每次选仓步骤。编码不从中文名称、默认库区、列表顺序或跨环境固定 UUID 推断。两个去向均须存在、为系统项、启用，并允许本次收发方向；缺失则阻塞，不在发料时临时造仓或回退到其他仓库。

初始化通过显式更新保存待耗用去向的禁用能力，避免 Gorm 的 `default:true` 将首次创建的 `allowStocktake:false` 覆盖。该去向不允许通用盘点、采购收料，也不作为成品、物料或采购默认入库去向；重复初始化保留原 ID，不恢复管理员暂停的收发方向，不改其他库区。普通库存写入和库存调整另由领域保护拦截。

发料／补料从 `MATERIAL` 移入生产待耗用，退料反向移交。使用同一 `Inventory` 表和 `InventoryLedgerEntry` 表，不增加第二套库存余额。成对流水的数量变化之和、金额变化之和均为零，并保留物料、批次、单据和交接事实身份。

交接不修改销售已发货数量，不生成销售出库单或销售成本凭证，也不表示材料已消耗。生产耗用、成本归集及其会计凭证需要独立生产语义，不由领料数量推断。

## 正式事实与归属

| 记录                                                  | 保存内容                                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `ProductionMaterialIssuanceWarehouseMovement`         | 原领料单、办理后版本、`ISSUE`／`SUPPLEMENT`／`RETURN`、原因、确认人及时间            |
| `ProductionMaterialIssuanceWarehouseMovementMaterial` | 本次物料及批次、主单位、实际数量、单位成本及金额、源／目标库存 ID、出／入两笔流水 ID |
| `ProductionMaterialIssuanceOrderLineAllocation`       | 本次物料行、真实订单行、冻结来源、分配数量；退料额外引用原发料分配 ID                |

同一交接的物料与批次组合唯一；单据与办理后版本组合唯一，物料行关联的流水 ID 唯一。数量为正，成本及金额非负；父记录关联限制物理删除。没有修改或删除已确认事实的命令，错误通过有依据的退料或后续明确冲正处理。

归属分配之和必须等于本次物料批次数量。一个实际批次可以覆盖多条订单行；一条订单行可以分次、分批领料。退料保留原订单行、冻结来源、物料、批次和原成本，不能把 A 行的已领转记给 B 行。

## 数量只来自一份依据

`GetProductionMaterialIssuanceWarehouseReview` 先验证已有冻结快照，按“订单行＋物料＋兼容主单位”归并其中已保存的 MRP 配方贡献。多条配方贡献不会重复累计成品数量；不重新展开当前 BOM，不复制缺料或包装算法。下发后当前 BOM 修改、改重量或作废，不改写原单标准量；办理时仍重新校验当前物料是否有效及主单位是否一致。

净领、待领和超标准沿用总契约：已领含补料，净领等于已领减退料，各行待领和超标准分别求和。例如 A 行标准 10、净领 12，B 行标准 20、净领 16，总体仍待领 4、超标准 2，不能相抵为待领 2。

`SuggestProductionMaterialIssuanceOrdinaryOrderLineAllocations` 沿下发时冻结的来源顺序，按各行尚待领量提出分配，先满足前一行，再分到后一行。它只返回建议，调用者必须展示该建议和查看时的单据版本，并明确提交原分配。确认事务不会在版本变化后悄悄改分配。

| 命令              | 校验                                                                                |
| ----------------- | ----------------------------------------------------------------------------------- |
| 普通发料 `ISSUE`  | 每条订单行累计本次各批次分配后，净领不得超过该行冻结标准量                          |
| 补料 `SUPPLEMENT` | 必须明确订单行和原因；允许超过标准，进度分别显示待领和超标准                        |
| 退料 `RETURN`     | 必须有原因和原分配 ID；只能退原单、原来源、原物料及原批次，累计退量不超过原分配数量 |

实际数量及分配使用既有库存 `float64` 主单位契约，拒绝 NaN、无穷、非正数量和合计溢出；数量守恒比较容差为 `1e-9`。金额一致性检查采用现有库存容差乘以 `max(1, 金额)`。不新增暗中的单位换算或包装反算，不把显示小数位当作主单位精度。若以后引入统一十进制定点数量，应统一迁移库存与本契约，不能只在前端局部四舍五入。

## 版本、幂等和事务

领域请求包含 `commandId`、`documentId`、`expectedVersion`、动作、原因，以及明确的物料批次／实际数量／订单行分配。一次最多 200 个物料批次，每个最多 500 条分配，合计最多 5000 条。拒绝同一批次重复及同批次重复的来源归属；排序标准化后生成载荷指纹，界面换序不改变命令含义。

1. 认证层传入真实操作者，领域层验证身份。HTTP 同时校验仓库访问、领料查看及各自独立的发料／补料／退料动作，不能把查看、下发或撤回权限当作实物确认权限。
2. 与下发、撤回复用“操作者＋命令 ID”唯一空间；同键同载荷取原交接及原单当前版本，同键换动作、版本或载荷拒绝。仓库回执同时保存交接 ID，重试不以最近一笔交接冒充原结果。
3. PostgreSQL 使用 Serializable 事务，先锁原单，校验 `DISPATCHED`、固定来源仓和查看时版本；按固定次序锁物料主数据、仓库及库存。缺失的专用目标余额在锁住该物料后建立，避免不同单据并发造出重复专用余额。
4. 在事务内重新核对当前物料、主单位、所选批次的余额、库存金额及有效预留。可用量不足直接拒绝；不自动选其他批次，也不使用已有预留量。
5. 普通发料采用该批次当前库存成本。退料使用原发料分配的成本；同一批次多笔原发料成本不同时，按本次各原分配数量汇总退料金额，不能套用今天的平均采购成本。待耗用余额不足或账面金额不能支持该原成本时明确阻塞。
6. 保存交接、分配、余额、流水、回执和审计；单据版本递增，首次仓库执行时间保留。任何步骤失败全部回滚。

死锁及序列化冲突沿用可识别的依据冲突，调用者重新读取或按原命令处理，不在领域层自动重放。库存在同一事务内处理，前端不能拆成“先扣库存、再增加已领”两个请求，不经离线队列盲目重放。

撤回同时检查执行标记和正式交接事实。即使标记异常丢失，也不能撤回已有发料事实的单据。全部退回后交接历史仍在，不恢复为“从未发料”，也不释放原订单行覆盖。

## 查询与旁路保护

单据级查询按一次一致快照批量读取交接、物料行、分配和库存流水，避免按每条明细逐次查询。校验来源、版本连续性、普通发料上限、退料原分配、数量／金额守恒及出入流水对；缺失或损坏明确报错，不显示成未领或零数量。

专用生产待耗用去向禁止通用库存保存、批量同步改写、入库、销售出库、撤销销售出库、通用调拨、委外调拨和盘点调账写入。既检查请求中的目标，也检查按 ID 命中的原余额，防止把原专用余额改名成普通仓库。`PRODUCTION_MATERIAL_ISSUANCE` 来源也禁止通过通用入库／出库入口伪造。

盘点可读和未来耗用、归属调整、损耗或盘点差异需要明确的专用命令，不能直接改待耗用余额后继续把订单行净领当作现场剩余量。当前未提供这些命令。

## 文件职责

| 文件                                                                                                                                                       | 职责                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [正式交接及归属模型](../../server/models/production_material_issuance_confirmed_warehouse_movements_and_order_line_allocations.go)                         | 不可变事实、标识及数据库约束                                   |
| [命令和进度契约](../../server/services/production_material_issuance_warehouse_movement_commands_and_allocation_progress_contract.go)                       | 输入、正式结果、单据进度和错误类型                             |
| [单据级进度与分配建议](../../server/services/production_material_issuance_frozen_source_allocation_progress_and_ordinary_issue_suggestions.go)             | 读取冻结依据和真实交接，校验历史，逐行求进度与默认建议         |
| [库存保管移交适配](../../server/services/production_material_issuance_inventory_custody_transfer_and_original_cost_return_adapter.go)                      | 使用传入 `tx` 处理两边余额、预留、原成本和成对流水             |
| [仓库确认事务](../../server/services/production_material_issuance_versioned_warehouse_confirmation_allocation_idempotency_and_atomic_inventory_service.go) | 来源归属、版本、幂等、锁顺序、原子提交及审计                   |
| [专用去向能力初始化](../../server/db/production_material_pending_consumption_warehouse_system_capability_initialization.go)                                | 按固定编码校正名称与禁用能力，显式保存 false，保留收发暂停开关 |

HTTP 和动作权限已由[独立路由及 Handler](production-material-issuance-warehouse-http-review-allocation-suggestions-confirmation-permissions-and-error-contract.md#文件职责与验证)承接。前端 DTO／service／Hook／办理控件和全订单范围查询仍应独立文件承接，不把这些职责塞入库存适配器、MRP 算法或页面组件。

## 验证与限制

隔离 SQLite 回归覆盖分次领齐、冻结依据不被当前 BOM 改写、默认分配与排序幂等、跨行待领及超标准不相抵、原成本退料、错来源／批次及超退拒绝、单位变化、库存／预留不足、多批次中后续失败回滚、审计与流水失败回滚、通用入口旁路、损坏事实及缺失执行标记拦截。

独立[专用去向初始化测试](../../server/db/production_material_pending_consumption_warehouse_initialization_enforces_dedicated_capabilities_test.go)验证首次创建保存禁用能力、重复初始化不改身份、不误用默认收料去向、保留收发暂停及不改自定义库区。仅使用隔离内存数据库。

独立 [PostgreSQL 仓库并发测试](../../server/services/production_material_issuance_postgres_concurrent_warehouse_confirmation_and_stock_conservation_test.go) 延用专用测试 DSN 和随机隔离 schema，覆盖同键确认、同版本不同键确认、不同单据抢同批次，以及库存数量／金额守恒。当前未配置 `PRODUCTION_MATERIAL_ISSUANCE_TEST_POSTGRES_DSN`，这些测试明确跳过；不能以 SQLite 通过代替 PostgreSQL 迁移、行锁和并发实测。
