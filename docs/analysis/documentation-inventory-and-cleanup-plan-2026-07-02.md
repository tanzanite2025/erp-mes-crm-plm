# Documentation Inventory and Cleanup Plan (2026-07-02)

## Scope

- Scanned Markdown documents under the repo, excluding generated/runtime folders such as `node_modules`, `dist`, `.git`, `server/postgres_data`, coverage output, and test reports.
- Scanned docs-like YAML/config files only for classification boundaries; they are not treated as prose documentation.
- The original 2026-07-02 inventory did not delete or move files; later follow-up deletions are recorded explicitly in the dated sections below.

## Current Map

| Category                | Current location                                                                                                     | Status            | Rule                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------- |
| Root entry docs         | `README.md`, `GEMINI.md`, `DELTA_SYSTEM.md`                                                                          | Keep              | Repo entry, AI architecture rules, and delta-system design stay at root.                     |
| GitHub workflow docs    | `.github/**`                                                                                                         | Keep              | Contribution, issue, PR, CI, and stale-bot config stay under `.github`.                      |
| Architecture docs       | `docs/architecture/**`                                                                                               | Keep              | Durable architecture decisions, topology maps, and domain design.                            |
| Analysis/history docs   | `docs/analysis/**`                                                                                                   | Keep              | Time-stamped audits, retrospectives, migration analysis, and cleanup plans.                  |
| Frontend docs           | `docs/frontend/**`                                                                                                   | Keep              | Frontend display and implementation guidelines.                                              |
| Ops docs                | `docs/ops/**`                                                                                                        | Keep              | Deployment, monitoring, rollout, and recovery procedures.                                    |
| Security test artifacts | `docs/security/postman/**`                                                                                           | Keep              | Security Postman collections are indexed by a local README.                                  |
| Server-local docs       | `server/contract-samples/README.md`, `server/migrations/README.md`, `server/security/**`, `server/docs/swagger.yaml` | Keep near code    | These are tightly coupled to backend contracts, migrations, security records, or API schema. |
| Feature-local docs      | `src/features/**/README.md`, feature-local `docs/**`, `src/locales/**/README.md`                                     | Keep near feature | Keep only when the doc is directly scoped to nearby code.                                    |
| Deployment config       | `deployment/monitoring/**`, `deployment/nginx/**`, `server/deployment/loki/**`, `server/docker-compose.yml`          | Not prose docs    | Treat as runnable config; keep paths that are referenced by deployment entry points.         |

## 2026-07-24 Follow-up

| Document                                      | Verdict after follow-up          | Result                                                                                                                                                             |
| --------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/architecture/生产架构与委外边界设计.md` | Refreshed                        | Completed production-architecture migration items are now historical recap, and the deployment checklist no longer shows finished work as pending.                 |
| `docs/architecture/生产委外执行链路设计.md`   | Keep                             | This still contains genuine open work for execution, outsourcing, and audit integration.                                                                           |
| `docs/ops/hostinger-vps-docker-runbook.md`    | Refreshed                        | The stale SSH-key warning and old SSH deploy-script guidance were replaced with the current Docker Manager path.                                                   |
| `docs/ops/single-vps-deployment-roadmap.md`   | Refreshed                        | Phase A is now recorded as done; remaining risks are backup/recovery, capacity governance, and second-project onboarding.                                          |
| `docs/frontend/bom-performance/**`            | Keep                             | The `[ ]` items here are troubleshooting/checklist content, not project backlog items.                                                                             |
| `server/security/**`                          | Superseded by 2026-07-25 cleanup | This follow-up originally deferred CVE scripts, but the next cleanup removed stale executable scripts because they still encoded the old server-side release path. |

## 2026-07-25 Follow-up

| Document                                                             | Verdict after follow-up | Result                                                                                                                                                                 |
| -------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                                          | Refreshed               | Removed the old SSH-based server release snippets. The README now points production releases back to Hostinger Docker Manager + GHCR `sha-*` images.                   |
| `server/security/README.md`                                          | Refreshed               | Downgraded to historical security guidance and removed stale server-side source checkout release instructions.                                                         |
| `server/security/CVE-2026-31431-QUICK-GUIDE.md`                      | Refreshed               | Replaced the old executable host commands with a historical note and current safety boundaries.                                                                        |
| `server/security/*.sh`                                               | Removed                 | Deleted stale CVE shell scripts because they still referenced old source checkout paths, host-level deployment commands, and non-current ERP recovery instructions.    |
| `docs/architecture/workflow/sales-phase1-tdo-alignment-plan.md`      | Closed as historical    | Rewritten as current sales TDO status; `ORDER_LINE_CLAIM` transaction is now recorded as landed.                                                                       |
| `docs/architecture/workflow/sales-phase1-tdo-execution-checklist.md` | Closed as historical    | Rewritten as a closed checklist with new follow-up items for service splitting and transaction tests.                                                                  |
| `docs/analysis/dictionary-migration-audit-2026-04-09.md`             | Closed as historical    | Replaced old P0/P1 findings with a closeout note; current ownership is `master-data-ownership-table.md`.                                                               |
| `docs/analysis/mold_asset_management_analysis.md`                    | Closed as historical    | Replaced outdated IndexedDB-based risk report with a note requiring a fresh audit against current backend-backed mold files.                                           |
| `docs/architecture/permission-sync-migration-plan.md`                | Closed as historical    | Replaced old `users.role` migration phases and removed the职位字段映射角色 direction from current guidance.                                                            |
| `docs/architecture/组织-人员-账号-权限链路梳理.md`                   | Removed                 | Replaced by `docs/architecture/组织人员归属-账号权限边界与文件职责计划.md` because the old file no longer matched the current account-permission boundary.             |
| `docs/architecture/组织-人员-账号-权限统一实施方案.md`               | Removed                 | Replaced by `docs/architecture/组织人员归属-账号权限边界与文件职责计划.md` to avoid keeping a stale target model beside the current analysis.                          |
| `docs/architecture/组织人员归属-账号权限边界与文件职责计划.md`       | Added                   | Documents the real current file responsibilities, separates organization-personnel context from account permissions, and records the split-first implementation order. |

## 2026-08-13 Follow-up

| Document                                                            | Verdict after follow-up                             | Result                                                                                                                                                                                                               |
| ------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/architecture/生产拓扑路线步骤与计件工价统一设计.md`           | Added as canonical                                  | Defines production segments, dynamic segment-to-work-item binding, leaf-operation piece rates, route-step identity, and stable domain rules.                                                                         |
| `docs/architecture/生产路线步骤与计件工价实施准备与文件拆分计划.md` | Added as implementation plan, now tracking progress | Records verified blockers, file split boundaries, deferred areas, PR0-PR4 order, and the current completion of PR0, PR1, and PR2 basic route lifecycle protection without overloading the canonical domain document. |
| `docs/architecture/生产架构与委外边界设计.md`                       | Corrected                                           | States that `BOMSection` is a material classification, `LineSegment` is a production segment, and L3 is the projection of dynamically mapped `ProcessStep` records rather than fixed ownership.                      |
| `docs/architecture/生产委外执行链路设计.md`                         | Corrected                                           | Aligns outsourcing with dynamic work-item binding and route-step execution, and removes stale statements about quality routing and process-owned execution policy.                                                   |
| `docs/architecture/aps-scheduling-engine/README.md`                 | Corrected                                           | Replaces the deleted `/personnel/line` reference and aligns scheduling inputs with `ProductionRoute` and `ProductionRouteStep`.                                                                                      |
| `docs/architecture/aps-scheduling-engine/domain-model.md`           | Corrected                                           | Clarifies that APS consumes production routes and does not infer process steps from BOM section classifications.                                                                                                     |
| `docs/architecture/组织人员归属-账号权限边界与文件职责计划.md`      | Corrected                                           | Removes the stale claim that organization and employee models are still stored in `server/models/production.go`; records the remaining production-internal split.                                                    |

## 2026-10-20 Messaging And Approval Follow-up

This review covers notification storage, delivery, cross-device state, approval references, and the root development/SDRTS guidance that governs those paths. It does not certify every historical finance, inventory, or configuration claim in the repository.

| Document                                                                                                                                                    | Verdict                                    | Result                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Root development boundaries](../../GEMINI.md) and [SDRTS contract](../../DELTA_SYSTEM.md)                                                                  | Current entry points corrected             | Removes mandatory calls through the deleted browser dispatcher, distinguishes frontend and backend services, limits offline writes to explicit domain contracts, and documents the actual PATCH/tracker API and optimistic version checks.                                                                                                                             |
| [System notification inbox and delivery contract](../architecture/workflow/system-notification-inbox-cross-device-synchronization-and-delivery-contract.md) | Implemented contract updated               | Records the account inbox and shared delivery queue, shared quality recipient/log creation, original-log diagnostics, cancellation-aware recovery with accurate storage errors, cross-device reconciliation, inactive-task cancellation, bounded retention, source coverage limits, cutover, file ownership, and verification. Production deployment remains separate. |
| [Quality standard transaction contract](../quality-standard-approval-transaction-and-notification-delivery-contract.md)                                     | Implemented contract updated               | Records real approval transactions, shared inbox/delivery, original-receipt resolution after configuration changes, shared file ownership, and the boundary between reading and approval.                                                                                                                                                                              |
| [Logistics record transaction contract](../logistics-record-transaction-and-notification-delivery-contract.md)                                              | Added as domain contract                   | Records actual states, versioned writes, JSON arrays, sales/purchase visibility, links and shared notifications; documents unified carrier tracking transactions, ordering, rollback, authenticated callback boundaries and missing business association.                                                                                                              |
| [Domain topology](../architecture/workflow/current-domain-topology-map.md)                                                                                  | Rewritten against current entry points     | Records semantic transactions and the shared inbox/outbox; obsolete Workflow flows and browser notification execution are removed.                                                                                                                                                                                                                                     |
| [Old lightweight BPM proposal](../architecture/workflow/审批工作流挂载与轻量BPM设计.md)                                                                     | Closed as superseded                       | The database removes legacy Workflow artifacts; current approval requests must not be replaced by recreating that old engine during inbox work.                                                                                                                                                                                                                        |
| [Purchase/sales and finance overview](../architecture/采购销售流程全闭环分析与财务架构规划.md)                                                              | Approval scope corrected                   | Removes obsolete BPM adoption and instance attachment instructions; leaves unrelated cost and reconciliation planning explicitly outside this review.                                                                                                                                                                                                                  |
| Production architecture and outsourcing execution docs                                                                                                      | Shared delivery recorded                   | Actual production/outsourcing events use the common inbox and post-commit queue. Diagnostics read the original log status; retired Redis CLI acceptance and dated historical evidence are distinguished from current isolated tests and production rollout. The deleted production line route is no longer listed as an active risk.                                   |
| Sales TDO status and checklist                                                                                                                              | Updated                                    | Backend sales transactions, durable account inbox, post-commit delivery, and removal of browser message execution are implemented.                                                                                                                                                                                                                                     |
| Status-code phase-six audit                                                                                                                                 | Marked as a historical configuration audit | Its dated findings are not the current message runtime or proof of durable user receipt.                                                                                                                                                                                                                                                                               |
| `README.md`                                                                                                                                                 | Indexed                                    | Links to the canonical message contract and quality/logistics domain contracts without duplicating common delivery rules.                                                                                                                                                                                                                                              |

## Stale Or Risky References

| Finding                              | Evidence                                                                                                                                  | Recommended cleanup                                                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy spec-directory references     | Resolved on 2026-07-02 in `README.md`, `.github/CONTRIBUTING.md`, and `docs/architecture/project-structure-review.md`                     | No further action unless an active spec directory is reintroduced.                                                                                                      |
| Old local absolute paths             | Resolved on 2026-07-02: 36 Markdown links were converted to repo-relative links                                                           | Keep future links repo-relative.                                                                                                                                        |
| Broken absolute-link targets         | Resolved on 2026-07-02: 8 missing targets were converted to inline historical notes instead of links                                      | Do not blindly recreate files; add current equivalent links only when verified.                                                                                         |
| Root-level docs are noisy            | Resolved on 2026-07-02: seven Markdown files were moved into category folders                                                             | Keep future docs under the nearest category instead of directly under `docs/`.                                                                                          |
| APS docs overlap                     | Resolved on 2026-07-02: parent docs are canonical; `core/` keeps only implementation deep dives                                           | Do not recreate same-name short stubs under `core/`.                                                                                                                    |
| Loki config duplicated               | Resolved on 2026-07-02: `server/docker-compose.yml` mounts `server/deployment/loki/**`; unused root `deployment/loki/**` copy was removed | Keep `server/deployment/loki/**` as the compose-local source of truth.                                                                                                  |
| Security CVE docs are date-sensitive | `server/security/**` records CVE-2026-31431 history                                                                                       | Resolved on 2026-07-25: executable scripts were removed, and the remaining Markdown files now state that any future CVE work needs a fresh current-environment runbook. |

## Completed Moves

These were organization changes only; content was not rewritten during the move.

| Current path                                             | Reason                                                 |
| -------------------------------------------------------- | ------------------------------------------------------ |
| `docs/analysis/dictionary-migration-audit-2026-04-09.md` | It is a time-stamped migration audit.                  |
| `docs/architecture/master-data-ownership-table.md`       | It is a durable ownership/architecture rule.           |
| `docs/architecture/permission-sync-migration-plan.md`    | It is a durable authorization migration design.        |
| `docs/frontend/bom-performance/optimization.md`          | BOM performance work is frontend-focused.              |
| `docs/frontend/bom-performance/api-reference.md`         | Same BOM performance doc set.                          |
| `docs/frontend/bom-performance/monitoring-setup.md`      | Same BOM performance doc set; link from ops if needed. |
| `docs/frontend/bom-performance/troubleshooting.md`       | Same BOM performance doc set.                          |

## Cleanup Candidates Requiring Confirmation

| Candidate                           | Why not automatic                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------------- |
| Historical migration/checklist docs | Some checklist names look temporary, but several are linked or still encode durable decisions. |
| `server/security/**` CVE guides     | Security docs are operationally sensitive and should be validated before pruning.              |
| Duplicate Loki config trees         | Config deletion can break deployment scripts if their path assumptions are outside this repo.  |

## Safe Next Batch

1. Review historical migration/checklist docs only with domain-owner confirmation.
2. Review `server/security/**` CVE guides only with ops/security confirmation.

## 2026-10-23 BOM And Product Handbook Follow-up

本次核对 BOM 及直接关联的产品手册、HOME 导航和主数据归属文档，并搜索 `docs/**` 中的相关旧术语与已删除组件引用。核对依据为当前工作区源码，不代表已逐一审查整个仓库的所有业务文档。明确过期的说明已修正，历史实验保留归档。

| 文档 | 发现与处理 |
| --- | --- |
| [BOM 渲染优化归档](../frontend/bom-performance/optimization.md)、[故障排查归档](../frontend/bom-performance/troubleshooting.md) | “当前结构／当前检查”仍描述已删除的 flat/tree 双视图，已改为汇总、分组手风琴与虚拟明细表，并链接当前职责文档。 |
| [历史 API](../frontend/bom-performance/api-reference.md)、[历史监控部署](../frontend/bom-performance/monitoring-setup.md) | 原有 Historical 标记有效；补充当前文档入口，区分渲染性能实验与“性能版本”业务概念，不恢复已退休 API 或部署步骤。四份归档的目录锚点也同步修正，避免标题加上归档标记后无法定位。 |
| [HOME 与手册导航](../architecture/HOME快捷入口与全厂概览独立导航及权限约定.md) | 补齐同级 BOM 手册、独立权限及 HOME 普通路由入口；明确产品指南仍为锚点阅读加操作向导，BOM 指南为固定标题、章节 Tabs 与独立正文滚动。 |
| [主数据归属](../architecture/master-data-ownership-table.md) | 修复不存在的 `server/db/seeds.go` 引用；区分 `product-structure` 的性能版本业务归属和复用的 `engineering` 存储契约；补充成品重量与共用物料分组的读写归属。 |
| [模板属性复用](../frontend/product-template-attribute-classification-business-components-reuse-guide.md)、[BOM 编辑弹窗](../frontend/bom-editor-dialog-product-information-recipe-layout-and-responsibility-boundaries.md) | 统一按具体产品 `productId` 而非基础型号 `typeId` 解释重量范围，说明界面“本型号”的实际含义，补齐与独立说明指南的职责关系。 |
| [BOM 说明指南](../frontend/bom-creation-operation-guide-content-navigation-and-responsibility-boundaries.md)、[产品向导架构](../frontend/product-creation-guide-architecture-and-file-responsibility-review.md) | 明确两份手册独立承接；修正“其他重量都是会话草稿”的泛化描述，区分已保存 BOM 来源与本次暂存，补充可核验的源码及当前文档入口。 |
| [BOM 状态机注释](../../server/services/state_machine/bom.go) | “MBOM 只存在发布／作废、派生即生效”与实现不符。注释已改为两类型共用状态表，派生初始为草稿，修订新版本直接发布；状态规则未改。 |

### 初次核对时发现的实现条件差异

初次核对时，列表派生按钮在“研发 BOM 且未锁定”时出现，后端却要求源研发 BOM 已发布且锁定。发布按钮仅对 MBOM 定义，且被锁定分支遮住。文档核对阶段只记录，随后按用户要求修复了派生与发布链路（见下节）。“提交评审”直接请求批准的既有行为继续保留。依据、组件入口和当前边界见 [BOM 生命周期说明](../frontend/bom-editor-dialog-product-information-recipe-layout-and-responsibility-boundaries.md#文档核对发现的生命周期差异2026-10-23)。

APS 文档关于“BOM 分组不是工序”的定义，以及消息／领域拓扑文档关于“派生 MBOM 实际为草稿”的描述，与当前实现一致，继续保留。原有带日期的历史核查结果不作为本轮未实施需求，也不因当前测试数量或文件行数变化而改写历史验证记录。

本次验证：11 份文档中的 122 个本地链接（含章节锚点）与当前结构列出的 10 个编辑器源码文件均有效；`git diff --check` 通过。状态机去除注释和空白后的源码与原版本一致。本轮只改说明与注释，未重跑业务测试；前文的业务测试数量均为对应改造时的历史验证结果。

## 2026-10-23 BOM Release And Derivation Fix

派生按钮现与服务端一致，只有已发布且锁定的研发 BOM 才能作为源。修复同时补通前置的发布路径：已批准 EBOM／MBOM 保持内容锁定，但可分别执行研发／生产发布；提交编排直接使用已保存记录与版本，不尝试重存锁定配方。后端仅放行原状态机已有的锁定记录 `APPROVED → RELEASED` 转换，原有权限、版本和物料／重量完整性校验继续执行。

该修复不新增审批流；“提交评审”沿用原有直接批准目标。派生仍创建 MBOM 草稿，修订已发布 MBOM 时新版本仍直接发布，二者的初始状态规则分别保留。

真实 PostgreSQL 测试同时发现版本快照对聚合函数使用 `FOR UPDATE` 会导致发布／派生回滚，已改为锁定父 BOM 行后分配快照序号。前端 19 项测试与后端 4 组、10 个真实 PostgreSQL 场景通过，覆盖可派生条件、锁定内容发布、拒绝路径及并发快照编号。集成测试使用独立临时 schema，不操作已有业务记录。
