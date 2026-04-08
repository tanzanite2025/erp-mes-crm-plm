
- [x] 474. 完成 `sales` 头部下一刀：`purchaseOrderNo` 编辑入口 + 事务化（2026-04-08，已完成）
  - [x] 已补销售订单 `purchaseOrderNo` 的最小编辑入口。
  - [x] 已为 `sales` 增加 `ORDER_PURCHASE_ORDER_NO_CHANGE`。
  - [x] 已完成前后端分流，并保留其余头部编辑在现有 transaction / `patch` 链中。

- [x] 475. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [x] 已同步 `walkthrough.md`，记录 `sales` 头部 `purchaseOrderNo` 编辑入口 + 事务化结果。

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

- [x] 469. 完成 `sales` 头部下一刀：`orderName` 编辑入口 + 事务化（2026-04-08，已完成）
  - [x] 已补销售订单 `orderName` 的最小编辑入口。
  - [x] 已为 `sales` 增加 `ORDER_NAME_CHANGE`。
  - [x] 已完成前后端分流，并保留其余头部编辑在现有 transaction / `patch` 链中。

- [x] 470. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [x] 已同步 `walkthrough.md`，记录 `sales` 头部 `orderName` 编辑入口 + 事务化结果。

- [ ] 466. 冻结本轮范围，执行 `sales` 头部下一刀：`orderName` 编辑入口 + 事务化（2026-04-08，待确认）
  - [ ] 本轮先补销售订单 `orderName` 的编辑入口。
  - [ ] 仅针对 `orderName` 单字段建 intent。
  - [ ] 不并发处理 `requirements`、交期、客户、分类/类型或任何行级编辑。

- [ ] 467. 明确 `sales` 头部 `orderName` 边界
  - [ ] 仅当 UI 可编辑且 delta 仅包含 `orderName` 时，才走 `orderName` transaction。
  - [ ] 若混入其他头部字段或行级字段，则不进入本轮 intent。
  - [ ] 其余销售订单编辑继续保留在现有 transaction / `patch` 链中。

- [ ] 468. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `sales` 头部 `orderName` 事务化结果。

- [x] 464. 完成 `sales` 头部 patch 压缩本轮切口：`requirements` 事务化（2026-04-08，已完成）
  - [x] 已确认本轮唯一稳定切口为 `requirements`。
  - [x] 已为 `sales` 增加 `ORDER_REQUIREMENTS_CHANGE`。
  - [x] 已完成前后端分流，并保留其余头部编辑在现有 `patch` 链中。

- [x] 465. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [x] 已同步 `walkthrough.md`，记录 `sales` 头部 patch 压缩本轮结果。

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

- [x] 458. 冻结本轮范围，执行 `purchase` 头部第二刀：供应商主体变更事务化（2026-04-08，已完成）
  - [x] 本轮只处理采购订单供应商主体变更事务。
  - [x] 仅针对 `supplierId` / `supplierName` 的纯头部变更建 intent。
  - [x] 未并发处理 `expectedDate`、其他头部字段或任何行级编辑。

- [x] 459. 明确 `purchase` 头部第二刀边界
  - [x] 仅当 delta 仅包含 `supplierId` / `supplierName` 时，才走供应商主体变更 transaction。
  - [x] 若混入其他头部字段或行级字段，则不进入本轮 intent。
  - [x] 其余采购订单编辑继续保留在现有 `patch` 链中。

- [x] 460. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [x] 已同步 `walkthrough.md`，记录 `purchase` 头部第二刀 intent、分流条件与验证结果。

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

- [x] 453. 完成 `sales` / `purchase` patch 兜底压缩专项盘点（2026-04-08，已完成）
  - [x] 已盘点双域当前仍落回 `patch` 的真实路径。
  - [x] 已区分“合理兜底”与“仍可继续事务化”的回退点。
  - [x] 已收敛出下一轮唯一优先建议切口：`purchase` 头部第二刀（供应商主体变更事务化）。

- [x] 454. 完成本轮专项收尾
  - [x] 本轮未直接新增业务 transaction intent。
  - [x] 已同步 `walkthrough.md`，记录双域 patch 回退盘点结论。
  - [x] 已明确继续保留 `patch` 作为安全兜底。

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

- [x] 447. 冻结本轮范围，执行 `purchase` 行级事务化第三刀：`ORDER_LINE_REMOVE`（2026-04-08，已完成）
  - [x] 本轮只处理采购订单纯删除行事务。
  - [x] 未并发处理 `ORDER_LINE_ADD`。
  - [x] 未扩展回采购订单头字段，也未退回整单 patch 包装型 transaction。

- [x] 448. 明确 `purchase` 行级第三刀边界
  - [x] 仅当可稳定识别为“纯删除行”时，走 `ORDER_LINE_REMOVE`。
  - [x] 若存在既有行内容修改或头部字段混入，则不进入本轮 intent。
  - [x] 若纯行级变更但不是“仅删除”，继续保留在现有 `ORDER_LINE_CONTENT_CHANGE` / `ORDER_LINE_ADD` / `patch` 链中。

- [x] 449. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [x] 已同步 `walkthrough.md`，记录 `purchase` 行级第三刀 intent、分流条件与验证结果。

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

- [x] 441. 冻结本轮范围，执行 `purchase` 行级事务化第二刀：`ORDER_LINE_ADD`（2026-04-08，已完成）
  - [x] 本轮只处理采购订单纯新增行事务。
  - [x] 未并发处理 `ORDER_LINE_REMOVE`。
  - [x] 未扩展回采购订单头字段，也未退回整单 patch 包装型 transaction。

- [x] 442. 明确 `purchase` 行级第二刀边界
  - [x] 仅当可稳定识别为“纯新增行”时，走 `ORDER_LINE_ADD`。
  - [x] 若存在既有行内容修改或头部字段混入，则不进入本轮 intent。
  - [x] 若纯行级变更但不是“仅新增”，继续保留在现有 `ORDER_LINE_CONTENT_CHANGE` / `patch` 链中。

- [x] 443. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [x] 已同步 `walkthrough.md`，记录 `purchase` 行级第二刀 intent、分流条件与验证结果。

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

- [x] 435. 冻结本轮范围，执行 `purchase` 行级事务化第一刀：`ORDER_LINE_CONTENT_CHANGE`（2026-04-08，已完成）
  - [x] 本轮只处理采购订单既有行内容修改事务。
  - [x] 未并发处理 `ORDER_LINE_ADD` / `ORDER_LINE_REMOVE`。
  - [x] 未扩展回采购订单头字段，也未退回整单 patch 包装型 transaction。

- [x] 436. 明确 `purchase` 行级第一刀边界
  - [x] 仅当可稳定识别为“既有行内容修改、无增删”时，走 `ORDER_LINE_CONTENT_CHANGE`。
  - [x] 若存在行新增/删除或头部字段混入，则不进入本轮 intent。
  - [x] 其余采购订单行集合变更继续保留在现有 `patch` 链中。

- [x] 437. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [x] 已同步 `walkthrough.md`，记录 `purchase` 行级第一刀 intent、分流条件与验证结果。

- [ ] 432. 冻结本轮范围，执行 `purchase` 行级事务化第一刀：`ORDER_LINE_CONTENT_CHANGE`（2026-04-08，待确认）
  - [ ] 本轮只处理采购订单既有行内容修改事务。
  - [ ] 不并发处理 `ORDER_LINE_ADD` / `ORDER_LINE_REMOVE`。
  - [ ] 不扩展回采购订单头字段，不退回整单 patch 包装型 transaction。

- [ ] 433. 明确 `purchase` 行级第一刀边界
  - [ ] 仅当可稳定识别为“既有行内容修改、无增删”时，才走 `ORDER_LINE_CONTENT_CHANGE`。
  - [ ] 若存在行新增/删除或头部字段混入，则不进入本轮 intent。
  - [ ] 其余采购订单行集合变更继续保留在现有 `patch` 链中，待后续再细化。

- [ ] 434. 明确本轮验证与收尾要求
  - [ ] 前端验证：`pnpm exec tsc --noEmit`。
  - [ ] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [ ] 完成后同步 `walkthrough.md`，记录 `purchase` 行级第一刀 intent、分流条件与验证结果。

- [x] 429. 冻结本轮范围，执行 `purchase` 事务化第一刀（2026-04-08，已完成）
  - [x] 已将 `sales` 已验证的 transaction 样板开始横向复制到 `purchase`。
  - [x] 本轮只实现采购订单 `expectedDate` 事务化。
  - [x] 未扩展到采购订单行级事务或跨域链路。

- [x] 430. 明确 `purchase` 第一刀边界
  - [x] 当 delta 仅包含 `expectedDate` 时，走 transaction。
  - [x] 其他采购订单编辑继续保留在现有 `patch` 链中。
  - [x] 已保持本轮不进入采购订单行级事务化。

- [x] 431. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Purchase`。
  - [x] 已同步 `walkthrough.md`，记录 `purchase` 第一刀 intent、分流条件与验证结果。

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

- [x] 423. 冻结本轮范围，执行 `sales` 行级事务化第四刀：`ORDER_LINE_REMOVE`（2026-04-08，已完成）
  - [x] 本轮只处理销售订单纯删除行事务。
  - [x] 已新增 `ORDER_LINE_REMOVE`，未并发处理 `ORDER_LINE_ADD`。
  - [x] 未扩展回订单头字段，也未退回整单 patch 包装型 transaction。

- [x] 424. 明确 `ORDER_LINE_REMOVE` 的边界
  - [x] 仅当可稳定识别为“纯删除行”时，走 `ORDER_LINE_REMOVE`。
  - [x] 若存在既有行内容修改或头部字段混入，则不进入本轮 intent。
  - [x] 若纯行级变更但不是“仅删除”，继续保留在现有 `ORDER_LINES_CHANGE` / `ORDER_LINE_CONTENT_CHANGE` / `ORDER_LINE_ADD`。

- [x] 425. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [x] 已同步 `walkthrough.md`，记录 `ORDER_LINE_REMOVE` 的分流条件与验证结果。

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

- [x] 417. 冻结本轮范围，执行 `sales` 行级事务化第三刀：`ORDER_LINE_ADD`（2026-04-08，已完成）
  - [x] 本轮只处理销售订单纯新增行事务。
  - [x] 已新增 `ORDER_LINE_ADD`，未并发处理 `ORDER_LINE_REMOVE`。
  - [x] 未扩展回订单头字段，也未退回整单 patch 包装型 transaction。

- [x] 418. 明确 `ORDER_LINE_ADD` 的边界
  - [x] 仅当可稳定识别为“纯新增行”时，走 `ORDER_LINE_ADD`。
  - [x] 若存在既有行内容修改或头部字段混入，则不进入本轮 intent。
  - [x] 若纯行级变更但不是“仅新增”，继续保留在现有 `ORDER_LINES_CHANGE` / `ORDER_LINE_CONTENT_CHANGE`。

- [x] 419. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [x] 已同步 `walkthrough.md`，记录 `ORDER_LINE_ADD` 的分流条件与验证结果。

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

- [x] 411. 冻结本轮范围，执行 `sales` 行级事务化第二刀（2026-04-08，已完成）
  - [x] 本轮已将 `ORDER_LINES_CHANGE` 进一步细化为更窄的行级语义事务。
  - [x] 本轮实际落地切口为 `ORDER_LINE_CONTENT_CHANGE`。
  - [x] 未扩展回订单头字段，也未退回整单 patch 包装型 transaction。

- [x] 412. 明确行级第二刀边界
  - [x] 仅当可稳定识别为“既有行内容修改、无增删”时，走 `ORDER_LINE_CONTENT_CHANGE`。
  - [x] 若纯行级变更但存在增删，则继续保留在 `ORDER_LINES_CHANGE`。
  - [x] `ORDER_LINE_ADD` / `ORDER_LINE_REMOVE` 暂未进入本轮。

- [x] 413. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [x] 已同步 `walkthrough.md`，记录本轮 intent、分流条件与验证结果。

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

- [x] 405. 冻结本轮范围，执行 `sales` 行级编辑事务化第一刀（2026-04-08，已完成）
  - [x] 本轮只处理销售订单 `lines` 的纯内容编辑事务化。
  - [x] 已新增 `ORDER_LINES_CHANGE`，不扩展到订单头字段或泛化改单。
  - [x] 已保持其他普通编辑继续保留在 `patch` 链中。

- [x] 406. 明确行级编辑事务化第一刀边界
  - [x] 当 delta 仅包含 `lines`、`quantity`、`amount` 时，走 transaction。
  - [x] 已将 `quantity` / `amount` 视为 `lines` 变更带出的派生聚合字段。
  - [x] 若混入头部字段，仍保留在现有 `patch` 链中。

- [x] 407. 完成本轮验证与收尾
  - [x] 前端验证：`pnpm exec tsc --noEmit`。
  - [x] 后端验证：`go test ./handlers ./routes ./services -run Sales`。
  - [x] 已同步 `walkthrough.md`，记录本轮 transaction intent、分流条件与验证结果。

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

- [x] 394. 冻结本轮范围，执行 `sales` 交期调整事务化（2026-04-08，已完成）
  - [x] 本轮只处理改单事务化第二刀：交期调整。
  - [x] 已新增 `ORDER_DELIVERY_DATE_CHANGE`，不扩展到分类/模式调整。
  - [x] 已保证其他普通编辑仍保留在 `patch` 链中。

- [x] 395. 明确交期调整事务化边界
  - [x] 仅当 `deliveryDate` 发生变化时，编辑对话框才走 transaction。
  - [x] 不将其他字段一并混入本轮 intent。
  - [x] 保持现有普通编辑流程可用。

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

- [x] 389. 冻结本轮范围，执行 `sales` 客户主体调整事务化（2026-04-08，已完成）
  - [x] 本轮只处理改单事务化第一刀：客户主体调整。
  - [x] 已新增 `ORDER_CUSTOMER_CHANGE`，不扩展到交期或分类/模式调整。
  - [x] 已保证其他普通编辑仍保留在 `patch` 链中。

- [x] 390. 明确客户主体调整事务化边界
  - [x] 仅当 `customerId/customerName` 发生变化时，编辑对话框才走 transaction。
  - [x] 不把整单编辑整体 transaction 化。
  - [x] 保持现有普通编辑流程可用。

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

- [x] 383. 冻结本轮范围，执行 `sales` 取消事务化（2026-04-08，已完成）
  - [x] 已将“取消/作废”从 `DELETE /sales-orders/:id` 中拆出为独立 transaction intent。
  - [x] 列表与详情中的取消动作已切换为 transaction 链。
  - [x] `DELETE` 已收敛为仅处理已取消后的硬删除。

- [x] 384. 明确取消事务化目标与边界
  - [x] 本轮只处理取消语义，不扩展到改单或审批后状态细化。
  - [x] 取消沿用既有 `/sales-orders/:id/transactions` endpoint，不新增平行事务入口。
  - [x] 保持版本冲突、toast、invalidate 与详情回显口径一致。

- [x] 385. 明确改动面与风险控制
  - [x] 已改动前后端 transaction service、前端 transaction hooks、详情页与列表页取消调用点。
  - [x] 已避免继续让未取消订单通过 `DELETE` 直接进入取消语义。
  - [x] 已完成前后端编译与目标测试验证。

- [x] 379. 冻结本轮范围，执行 `use-sales.ts` 物理删除与 `ORDER_STATUS_TRANSITION` 事务化（2026-04-08，已完成）
  - [x] 已按批准顺序完成：先物理删除 `use-sales.ts`，再推进 `ORDER_STATUS_TRANSITION` 事务化。
  - [x] 本轮继续只聚焦 `sales` 域，未扩散到 `purchase / inventory / workflow-core`。
  - [x] 已在规划确认后完成代码改造。

- [x] 380. 明确本轮目标与边界
  - [x] 删除前已确认 `use-sales.ts` 无正式引用残留。
  - [x] `ORDER_STATUS_TRANSITION` 已沿用既有 transaction endpoint，而未回退到 patch 驱动。
  - [x] 本轮未顺手扩展更多 intent，只处理状态推进事务化。

- [x] 381. 明确建议改动面与风险
  - [x] 实际已改动 `sales-order-detail.tsx`、`sales-transaction-service.ts`、前端 transaction hooks、后端 sales transaction service。
  - [x] 当前状态变更入口已从 `trackDelta()` 与 `patchMutation` 切换为语义事务提交。
  - [x] 状态推进后的 toast、invalidate、版本冲突与详情回显已按现有口径保持一致，并通过验证。

- [x] 382. 明确进入实施前确认点
  - [x] 用户已确认按“先删 `use-sales.ts`，再做 `ORDER_STATUS_TRANSITION` 事务化”的顺序执行。
  - [x] 用户已确认本轮只处理状态推进事务，不扩展更多动作。
  - [x] 已按确认结果完成代码改造。

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
  - [x] 路径确认：`docs/architecture/workflow/current-domain-topology-map.md`。
  - [ ] 若用户确认其他目录，再按确认结果调整，不擅自新增多个重复版本。

- [ ] 366. 明确本轮确认点
  - [x] 用户已确认接受路径 `docs/architecture/workflow/current-domain-topology-map.md`。
  - [x] 用户已确认文档主体为“当前现状拓扑”，并允许文末补充“后续收敛方向”。
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

