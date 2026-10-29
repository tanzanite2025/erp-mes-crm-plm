# 生产领料仓库接口：核对、分配建议、独立确认权限与错误契约

建立日期：2026-10-27。本文件承接[正式交接与库存保管契约](production-material-issuance-confirmed-warehouse-movements-order-line-allocation-and-custody-inventory-transfer-contract.md)，只规定 HTTP 边界，不重复 MRP、分配进度或库存算法。

## 当前范围

仓库单据核对、普通发料分配建议、普通发料／补料／退料确认已注册 Go HTTP 路由，新增三项独立动作权限及前后端权限契约。接口直接调用已存在的 Go 查询和原子领退事务，不通过通用销售出库接口。

原单内办理界面及仓储“生产领退”入口已接入，批次查询复用 MRP 的共用余额／有效预留能力。详见[仓库界面契约](../frontend/production-material-issuance-warehouse-handover-entry-batch-selection-order-allocation-and-session-stable-confirmation.md)。[总体订单进度](production-material-issuance-active-order-scope-frozen-current-basis-progress-and-pagination-contract.md)已由独立只读查询接入；正式打印、主动待办和消息仍待承接。未迁移真实业务库、重启服务或写真实库存。

## 认证、业务访问与动作权限

全部路径位于 `/api/v1/mrp/production-material-issuance`，统一属于生产领料领域；仓库与生产复用同一套单据和交接事实，不复制一套仓库领料单。URL 中的 `mrp` 前缀不用于推断访问权限。

| 接口职责                                     | 业务访问                                                                        | 独立动作权限                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 当前来源核对、下发及撤回                     | `menu_mrp`、`tab_mrp_requirements`、`tab_mrp_production_material_issuance` 任一 | 查看；下发、撤回另需各自动作                                     |
| 已下发单据列表、冻结详情、仓库核对与分配建议 | 上述生产访问任一，或 `menu_warehouse`                                           | `action_production_material_issuance_view`                       |
| 普通发料确认                                 | `menu_warehouse`                                                                | 查看＋`action_production_material_issuance_warehouse_issue`      |
| 补料确认                                     | `menu_warehouse`                                                                | 查看＋`action_production_material_issuance_warehouse_supplement` |
| 退料确认                                     | `menu_warehouse`                                                                | 查看＋`action_production_material_issuance_warehouse_return`     |

因此仓库账号可以单独获得仓库访问和领料查看权限读取原单，无需额外开放 MRP 页面。仓库访问不能替代生产端来源核对、下发和撤回权限。普通发料、补料和退料互不授权；销售出库、采购入库、指南阅读、下发和撤回动作均不代替仓库领退动作。权限目录按 `menu_warehouse` 归属三种新动作，不会自动给普通仓库账号授予这些动作，也不因动作目录父级授予页面访问。

权限仍采用当前系统共享生产范围：可读取全部正式领料单及其来源、交接和成本，不按下发人或确认人过滤，不表示已实现客户、组织或个人数据隔离。未来细分范围必须在后端读取、汇总、分页和命令前统一落实。

所有入口要求认证身份；操作者 ID、用户名和请求 IP 由认证上下文及请求读取，不能由 JSON 传入。三个确认动作直接由路由决定，不接收客户端 `kind`；单据身份只取路径 `:id`，不接受第二份 body `documentId`。

## 单据核对和普通分配建议

| 请求                                                 | 输入                                              | 成功结果                                                                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /documents/:id/warehouse-review`                | 规范 UUID，不接受查询参数                         | `{document,sourceMaterials,materialTotals,movements,returnableAllocations}`，含原单当前版本、冻结标准、逐行已领／已退／净领／待领／超标准、交接及原分配 |
| `POST /documents/:id/ordinary-allocation-suggestion` | 严格 JSON `{expectedVersion,materialId,quantity}` | `{documentId,expectedVersion,materialId,quantity,allocations}`                                                                                          |

建议输入数量采用物料冻结主单位。它只对单一物料沿冻结来源顺序提出普通发料归属，不选库存批次、不预留、不扣库存，也不保存建议。查看时版本必传，若与查询快照不符返回 409；超出各行合计待领量返回 422。多批次或多次请求的建议不能视为已经预占，正式确认仍必须提交明确批次和各订单行分配。

查询读取同一后端一致快照。后续界面须展示建议及其单据版本，确认提交原版本和明确分配；不能在版本改变后静默重新分配并提交。冻结依据或交接流水损坏返回明确错误，不能以空数组、零待领或已齐套掩盖失败。

批次查询为 `POST /documents/:id/material-batches`，严格 body 为 `{expectedVersion,materialId}`，沿用核对查询的业务访问与独立查看权限。返回 `{documentId,expectedVersion,materialId,unit,items}`，每项含库存余额身份、固定 MATERIAL、批次、主单位、库存、有效预留及可领量。只读一致快照校验原单版本、冻结物料及系统仓库能力，选择不预留库存，确认时重新检查。原单核对另必有 `returnableAllocations` 数组，沿原发料分配投影扣除已退后的可退量，不由前端推算。

## 三种确认命令

| 请求                             | 服务端动作   | 附加条件                                                                |
| -------------------------------- | ------------ | ----------------------------------------------------------------------- |
| `POST /documents/:id/issue`      | `ISSUE`      | 每行净领累计本次各批次后不能超过冻结标准                                |
| `POST /documents/:id/supplement` | `SUPPLEMENT` | 必填原因，允许超标准，保留订单行归属                                    |
| `POST /documents/:id/return`     | `RETURN`     | 必填原因，每条归属须给出原发料分配 ID，沿原来源、物料和批次按原成本回仓 |

三者 body 相同：

```json
{
  "commandId": "规范小写 UUID",
  "expectedVersion": 1,
  "reason": "办理原因，补料和退料必填",
  "materials": [
    {
      "materialId": "规范小写 UUID",
      "batchNo": "原批次",
      "quantity": 10,
      "allocations": [
        {
          "salesOrderLineId": 101,
          "quantity": 10,
          "originalAllocationId": null
        }
      ]
    }
  ]
}
```

上例为字段格式说明，不是可以直接提交的业务载荷。退料将 `originalAllocationId` 换为真实原分配 UUID；普通发料和补料不提供该字段或置 `null`。数量必须是 JSON 有限正数，订单行是正整数；不接受字符串数量或浏览器另算成本。固定来源和待耗用去向由领域层带入，客户端不传仓库或金额。

请求上限 256 KiB，另受领域限制：最多 200 个物料批次，每批次最多 500 条分配，总计最多 5000 条，实际还须同时符合字节上限。拒绝未知字段、尾随 JSON、非法 UUID、非法数值和重复物料批次；原因去首尾空格后最多 2000 UTF-8 字节。本轮接口不支持额外查询参数。

成功返回 `{document,movement}`，其中 `movement` 为 `{movement,materials}`，各物料明细包含实际交接记录及其 `allocations`。原子事务负责原单状态、预期版本、有效物料、主单位、库存／预留、原分配、成本、成对流水、回执及审计；HTTP 不拆事务，不预先保存“已领”。

幂等沿用操作者＋命令 ID。同键同载荷返回原交接与原单当前版本；同键换动作、版本或载荷返回 409。重试返回旧交接时，不能把响应中的当前单据版本冒充原交接办理版本；原交接保留 `documentVersionAfter`。网络超时、响应异常或 500 后先查询原单或明确按原请求重试，不能自动换键、重新分配或进入离线自动重放。

## HTTP 错误与缓存

| HTTP | 错误码                                                                                     | 调用者含义                                                   |
| ---- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 400  | `PRODUCTION_MATERIAL_ISSUANCE_INVALID_REQUEST`                                             | 修正请求格式、必填字段或不允许的办理条件                     |
| 401  | 认证失败                                                                                   | 重新认证；不调用领域事务                                     |
| 403  | 权限不足                                                                                   | 不可凭查看、其他动作或按钮可见性绕过                         |
| 404  | `PRODUCTION_MATERIAL_ISSUANCE_NOT_FOUND`                                                   | 原单不存在                                                   |
| 409  | `PRODUCTION_MATERIAL_ISSUANCE_BASIS_CHANGED`                                               | 单据状态／版本、当前主单位等已变化，重新核对                 |
| 409  | `PRODUCTION_MATERIAL_ISSUANCE_COMMAND_REUSED`                                              | 原命令键被用于不同动作、版本或载荷                           |
| 409  | `PRODUCTION_MATERIAL_ISSUANCE_STOCK_UNAVAILABLE`                                           | 指定批次库存或扣除预留后的可用量不足，不自动改批次           |
| 422  | `PRODUCTION_MATERIAL_ISSUANCE_ALLOCATION_INVALID`                                          | 归属合计不一致、普通发料超标准、原退料归属不符等，需修正分配 |
| 500  | `PRODUCTION_MATERIAL_ISSUANCE_QUERY_FAILED`／`PRODUCTION_MATERIAL_ISSUANCE_COMMAND_FAILED` | 明确报错或提示结果未确认；服务端记录原错误，响应不泄露 SQL   |

成功及领域错误响应设置 `Cache-Control: no-store`，不能将确认结果或库存核对当作长期 HTTP 缓存。

## 文件职责与验证

| 文件                                                                                                                                                                     | 职责                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| [仓库路由](../../server/routes/routes_production_material_issuance_warehouse_review_allocation_suggestions_and_separate_movement_permissions.go)                         | 查询业务访问及独立发料／补料／退料权限                             |
| [核对与建议 Handler](../../server/handlers/production_material_issuance_warehouse_frozen_progress_review_and_versioned_allocation_suggestion_queries.go)                 | HTTP 身份、参数、建议版本及只读服务适配                            |
| [明确确认 Handler](../../server/handlers/production_material_issuance_warehouse_issue_supplement_and_original_return_explicit_confirmation_commands.go)                  | 路由决定动作与原单，认证决定操作者，提交原领域事务                 |
| [共享身份、解码和错误响应](../../server/handlers/production_material_issuance_http_identity_strict_request_validation_and_error_responses.go)                            | UUID、请求上限、未知字段及稳定错误码                               |
| [权限目录](../../src/features/authz/data/action-permission-catalog.ts)／[Go 权限](../../server/authz/permissions.go)                                                     | 动作归属、路由绑定、可授权动作和生成契约                           |
| [权限与正式交接回归](../../server/routes/production_material_issuance_warehouse_http_action_authorization_explicit_identity_idempotency_and_inventory_atomicity_test.go) | 越权、仓库独立读单、分次领退、原身份、幂等及数量金额守恒           |
| [校验与失败回滚回归](../../server/routes/production_material_issuance_warehouse_http_malformed_requests_stale_versions_semantic_errors_and_failure_rollback_test.go)     | 伪造字段、非法请求、版本、错误码、库存不足、损坏依据及审计失败回滚 |

`go test ./services ./handlers ./authz ./routes ./db -count=1` 全部通过；共享身份校验归位后又通过生产领料路由回归。前端权限目录校验、TypeScript 编译及权限文件 ESLint 通过。

测试仅使用隔离 SQLite；既有 PostgreSQL 并发测试因未配置专用测试 DSN 未实测，不以 HTTP 回归替代 PostgreSQL 迁移、锁和并发验证。全量动作权限闭环仍有既有两处漏绑：`POST /engineering/bom/:id/revise`、`PUT /approvals/policies/:businessType`；仓库六个查询／确认入口均有明确绑定。
