# 生产领料：有效订单范围、冻结与当前依据、进度汇总和分页

复核日期：2026-10-27。总体物料待领及订单行进度已接入只读查询与前端；正式打印、消息和主动待办仍未接入。

## 范围与依据

- 全范围为未删除、非报价、状态为 `Pending`／`Scheduling`／`InProgress` 的销售订单及其明细，与 MRP 共用读取入口。不是已有领料单集合，不扣减已完工或已发货数量。
- 完成、取消、关闭等非上述状态退出当前统计；既有覆盖、冻结单据及领退历史继续保留，不能据此删除库存事实。当前统计不表示这些历史单据已全部消耗或退清。
- 未覆盖行使用共用 `ExpandProductionMaterialRequirements` 展开当前适用已发布 MBOM。查询不保存临时 BOM 选择；多份候选需到料号需求明确选择并正式下发，之后总体查询读取冻结依据。
- 有有效覆盖的行使用原单冻结贡献及既有仓库核对投影，校验单据状态、来源身份、快照与分配归属。不能再叠加当前需求，不用当前 BOM 重算历史；撤回释放覆盖后重新采用当前依据。
- 缺 BOM、选择不明确、物料或单位异常均保留订单行及原因。`isComplete=false` 时物料汇总仅代表已知部分，界面突出提示，不能据此显示全部领齐。数据库／快照／库存账本事实校验失败直接返回错误，不当作缺少需求或零进度。

## 数量及库存边界

同一订单行重复物料贡献先归并。已下发行的已领、退料、净领、待领、超标准直接复用现有仓库分配状态读取，补料计入已领，仅正式退料计入已退。未下发行的已领和退料为零，待领为共用展开的标准需求。

物料汇总分别相加各订单行的六项数量。A 标准 200、净领 220，B 标准 200、净领 160，总体待领 40、超标准 20。不能用总标准减总净领替代逐行待领。不同物料不合并，不同主单位遇到冲突明确失败；成品数量也不跨产品、单位合并。

本查询不计算采购缺口、包装或库存分配，不预占、不扣库存。继续由 MRP 共用供应与包装投影承接，禁止根据待领新增第二套采购缺口算法。

## HTTP、分页与一致性

`GET /api/v1/mrp/production-material-issuance/active-order-progress` 仅接受 `materialsPage`、`ordersPage`、`pageSize`，默认 `1／1／20`，页大小上限 100。拒绝未知、重复、非法值和偏移溢出。

返回 `asOf,warehouseCategoryCode,scope,materials,orderLines,materialsPage,ordersPage,pageSize`。scope 包含订单、订单行、已下发、未下发、异常行、物料数量及完整性；两视角始终共用完整范围。先完整读取、校验并汇总，再分别分页物料和订单行；订单行内保留全部物料。超范围页返回空数组和真实总体计数。

需要认证身份、生产访问权限（`menu_mrp`、`tab_mrp_requirements` 或 `tab_mrp_production_material_issuance`）及 `action_production_material_issuance_view`。沿用系统共享生产数据范围，未增加客户或组织隔离。仓库页仍通过原单查询办理，无需因此开放总体生产范围。

PostgreSQL 使用只读 Repeatable Read 事务，避免覆盖、冻结来源、领退版本在同次响应中漂移；SQLite 隔离回归使用同一事务。成功响应 `Cache-Control: no-store`，失败沿用生产领料查询错误码。此次没有迁移业务库或重启服务；PostgreSQL 并发专用 DSN 未配置，不能宣称已实测并发隔离。

## 文件职责

| 文件                                                                                                   | 职责                                                                     |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `server/services/production_material_requirement_active_orders_and_current_recipe_snapshot_queries.go` | MRP 与总体进度共用有效订单范围和当前主数据读取；不计算需求或写入业务事实 |
| `server/services/production_material_issuance_active_order_scope_progress_response_contract.go`        | 总体进度、范围计数与双视角 DTO                                           |
| `server/services/production_material_issuance_active_order_scope_frozen_and_current_progress_query.go` | 只读事务、有效覆盖校验、冻结／当前依据选择；每张涉及原单读取并校验一次   |
| `server/services/production_material_issuance_active_scope_material_grouping_totals_and_pagination.go` | 归并当前贡献、逐行进度相加、完整范围统计与末端分页                       |
| `server/handlers/production_material_issuance_active_order_scope_progress_readonly_query.go`           | 身份、严格查询参数、no-store 与错误响应                                  |
| 前端 `contracts/production-material-issuance-active-order-scope-progress-api-dto.ts`                   | Zod 校验必要投影、范围计数、来源身份与分页完整性                         |
| 前端 `services/production-material-issuance-active-order-scope-progress-query-service.ts`              | 请求、取消信号及响应页身份核对；无 toast 或刷新副作用                    |
| 前端 `hooks/use-production-material-issuance-active-order-scope-progress-query.ts`                     | 按账号和查询参数缓存；沿既有领料 root 接收命令成功失效                   |
| 前端 `components/production-material-issuance-progress-workspace-with-document-traceability.tsx`       | 查看权限、共用范围、读取状态、双视角及各自分页；原单追溯保持独立查询     |
| 前端 `components/production-material-issuance-active-scope-material-summary.tsx`                       | 按物料显示数量、来源行数；不在浏览器重新汇总                             |
| 前端 `components/production-material-issuance-active-scope-order-line-progress.tsx`                    | 订单行手风琴、异常、冻结／当前依据与物料进度                             |
| 前端 `components/production-material-issuance-six-quantity-progress-values.tsx`                        | 复用六项数量的标签、单位、强调色与响应式布局；不计算业务数量             |

当前查询完整读取范围后分页，仓库历史按涉及单据复用既有严格读取；不是数据库聚合索引或后台物化读模型。数据规模扩大时可在此读模型内批量化，必须保持来源、账本校验与同一事务，不把性能优化转移为浏览器当前页汇总。

定向回归覆盖未下发、冻结不重算、不重复、重复配方归并、撤回重算、补料／退料、超领不抵待领、终态退出与历史保留、异常提示、分页前统计、严格输入、权限、只读及失败恢复。

验证结果：Go services／routes／handlers／authz／db 包、相关前端 67 项回归、TypeScript、定向 ESLint、双语结构及权限目录通过。隔离浏览器验证中英文 1366／390／320 像素的两种视角，无横向溢出或业务写请求。全局动作闭环仍有两条既有漏绑（BOM revise 与审批策略更新），本接口已显式绑定查看权限。
