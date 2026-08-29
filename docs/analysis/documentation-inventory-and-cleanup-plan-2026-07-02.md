# Documentation Inventory and Cleanup Plan (2026-07-02)

## Scope

- Scanned Markdown documents under the repo, excluding generated/runtime folders such as `node_modules`, `dist`, `.git`, `server/postgres_data`, coverage output, and test reports.
- Scanned docs-like YAML/config files only for classification boundaries; they are not treated as prose documentation.
- The original 2026-07-02 inventory did not delete or move files; later follow-up deletions are recorded explicitly in the dated sections below.

## Current Map

| Category | Current location | Status | Rule |
| --- | --- | --- | --- |
| Root entry docs | `README.md`, `GEMINI.md`, `DELTA_SYSTEM.md` | Keep | Repo entry, AI architecture rules, and delta-system design stay at root. |
| GitHub workflow docs | `.github/**` | Keep | Contribution, issue, PR, CI, and stale-bot config stay under `.github`. |
| Architecture docs | `docs/architecture/**` | Keep | Durable architecture decisions, topology maps, and domain design. |
| Analysis/history docs | `docs/analysis/**` | Keep | Time-stamped audits, retrospectives, migration analysis, and cleanup plans. |
| Frontend docs | `docs/frontend/**` | Keep | Frontend display and implementation guidelines. |
| Ops docs | `docs/ops/**` | Keep | Deployment, monitoring, rollout, and recovery procedures. |
| Security test artifacts | `docs/security/postman/**` | Keep | Security Postman collections are indexed by a local README. |
| Server-local docs | `server/contract-samples/README.md`, `server/migrations/README.md`, `server/security/**`, `server/docs/swagger.yaml` | Keep near code | These are tightly coupled to backend contracts, migrations, security records, or API schema. |
| Feature-local docs | `src/features/**/README.md`, feature-local `docs/**`, `src/locales/**/README.md` | Keep near feature | Keep only when the doc is directly scoped to nearby code. |
| Deployment config | `deployment/monitoring/**`, `deployment/nginx/**`, `server/deployment/loki/**`, `server/docker-compose.yml` | Not prose docs | Treat as runnable config; keep paths that are referenced by deployment entry points. |

## 2026-07-24 Follow-up

| Document | Verdict after follow-up | Result |
| --- | --- | --- |
| `docs/architecture/生产架构与委外边界设计.md` | Refreshed | Completed production-architecture migration items are now historical recap, and the deployment checklist no longer shows finished work as pending. |
| `docs/architecture/生产委外执行链路设计.md` | Keep | This still contains genuine open work for execution, outsourcing, and audit integration. |
| `docs/ops/hostinger-vps-docker-runbook.md` | Refreshed | The stale SSH-key warning and old SSH deploy-script guidance were replaced with the current Docker Manager path. |
| `docs/ops/single-vps-deployment-roadmap.md` | Refreshed | Phase A is now recorded as done; remaining risks are backup/recovery, capacity governance, and second-project onboarding. |
| `docs/frontend/bom-performance/**` | Keep | The `[ ]` items here are troubleshooting/checklist content, not project backlog items. |
| `server/security/**` | Superseded by 2026-07-25 cleanup | This follow-up originally deferred CVE scripts, but the next cleanup removed stale executable scripts because they still encoded the old server-side release path. |

## 2026-07-25 Follow-up

| Document | Verdict after follow-up | Result |
| --- | --- | --- |
| `README.md` | Refreshed | Removed the old SSH-based server release snippets. The README now points production releases back to Hostinger Docker Manager + GHCR `sha-*` images. |
| `server/security/README.md` | Refreshed | Downgraded to historical security guidance and removed stale server-side source checkout release instructions. |
| `server/security/CVE-2026-31431-QUICK-GUIDE.md` | Refreshed | Replaced the old executable host commands with a historical note and current safety boundaries. |
| `server/security/*.sh` | Removed | Deleted stale CVE shell scripts because they still referenced old source checkout paths, host-level deployment commands, and non-current ERP recovery instructions. |
| `docs/architecture/workflow/sales-phase1-tdo-alignment-plan.md` | Closed as historical | Rewritten as current sales TDO status; `ORDER_LINE_CLAIM` transaction is now recorded as landed. |
| `docs/architecture/workflow/sales-phase1-tdo-execution-checklist.md` | Closed as historical | Rewritten as a closed checklist with new follow-up items for service splitting and transaction tests. |
| `docs/analysis/dictionary-migration-audit-2026-04-09.md` | Closed as historical | Replaced old P0/P1 findings with a closeout note; current ownership is `master-data-ownership-table.md`. |
| `docs/analysis/mold_asset_management_analysis.md` | Closed as historical | Replaced outdated IndexedDB-based risk report with a note requiring a fresh audit against current backend-backed mold files. |
| `docs/architecture/permission-sync-migration-plan.md` | Closed as historical | Replaced old `users.role` migration phases and removed the职位字段映射角色 direction from current guidance. |
| `docs/architecture/组织-人员-账号-权限链路梳理.md` | Removed | Replaced by `docs/architecture/组织人员归属-账号权限边界与文件职责计划.md` because the old file no longer matched the current account-permission boundary. |
| `docs/architecture/组织-人员-账号-权限统一实施方案.md` | Removed | Replaced by `docs/architecture/组织人员归属-账号权限边界与文件职责计划.md` to avoid keeping a stale target model beside the current analysis. |
| `docs/architecture/组织人员归属-账号权限边界与文件职责计划.md` | Added | Documents the real current file responsibilities, separates organization-personnel context from account permissions, and records the split-first implementation order. |

## 2026-08-13 Follow-up

| Document | Verdict after follow-up | Result |
| --- | --- | --- |
| `docs/architecture/生产拓扑路线步骤与计件工价统一设计.md` | Added as canonical | Defines production segments, dynamic segment-to-work-item binding, leaf-operation piece rates, route-step identity, and stable domain rules. |
| `docs/architecture/生产路线步骤与计件工价实施准备与文件拆分计划.md` | Added as implementation plan, now tracking progress | Records verified blockers, file split boundaries, deferred areas, PR0-PR4 order, and the current completion of PR0, PR1, and PR2 basic route lifecycle protection without overloading the canonical domain document. |
| `docs/architecture/生产架构与委外边界设计.md` | Corrected | States that `BOMSection` is a material classification, `LineSegment` is a production segment, and L3 is the projection of dynamically mapped `ProcessStep` records rather than fixed ownership. |
| `docs/architecture/生产委外执行链路设计.md` | Corrected | Aligns outsourcing with dynamic work-item binding and route-step execution, and removes stale statements about quality routing and process-owned execution policy. |
| `docs/architecture/aps-scheduling-engine/README.md` | Corrected | Replaces the deleted `/personnel/line` reference and aligns scheduling inputs with `ProductionRoute` and `ProductionRouteStep`. |
| `docs/architecture/aps-scheduling-engine/domain-model.md` | Corrected | Clarifies that APS consumes production routes and does not infer process steps from BOM section classifications. |
| `docs/architecture/组织人员归属-账号权限边界与文件职责计划.md` | Corrected | Removes the stale claim that organization and employee models are still stored in `server/models/production.go`; records the remaining production-internal split. |

## Stale Or Risky References

| Finding | Evidence | Recommended cleanup |
| --- | --- | --- |
| Legacy spec-directory references | Resolved on 2026-07-02 in `README.md`, `.github/CONTRIBUTING.md`, and `docs/architecture/project-structure-review.md` | No further action unless an active spec directory is reintroduced. |
| Old local absolute paths | Resolved on 2026-07-02: 36 Markdown links were converted to repo-relative links | Keep future links repo-relative. |
| Broken absolute-link targets | Resolved on 2026-07-02: 8 missing targets were converted to inline historical notes instead of links | Do not blindly recreate files; add current equivalent links only when verified. |
| Root-level docs are noisy | Resolved on 2026-07-02: seven Markdown files were moved into category folders | Keep future docs under the nearest category instead of directly under `docs/`. |
| APS docs overlap | Resolved on 2026-07-02: parent docs are canonical; `core/` keeps only implementation deep dives | Do not recreate same-name short stubs under `core/`. |
| Loki config duplicated | Resolved on 2026-07-02: `server/docker-compose.yml` mounts `server/deployment/loki/**`; unused root `deployment/loki/**` copy was removed | Keep `server/deployment/loki/**` as the compose-local source of truth. |
| Security CVE docs are date-sensitive | `server/security/**` records CVE-2026-31431 history | Resolved on 2026-07-25: executable scripts were removed, and the remaining Markdown files now state that any future CVE work needs a fresh current-environment runbook. |

## Completed Moves

These were organization changes only; content was not rewritten during the move.

| Current path | Reason |
| --- | --- |
| `docs/analysis/dictionary-migration-audit-2026-04-09.md` | It is a time-stamped migration audit. |
| `docs/architecture/master-data-ownership-table.md` | It is a durable ownership/architecture rule. |
| `docs/architecture/permission-sync-migration-plan.md` | It is a durable authorization migration design. |
| `docs/frontend/bom-performance/optimization.md` | BOM performance work is frontend-focused. |
| `docs/frontend/bom-performance/api-reference.md` | Same BOM performance doc set. |
| `docs/frontend/bom-performance/monitoring-setup.md` | Same BOM performance doc set; link from ops if needed. |
| `docs/frontend/bom-performance/troubleshooting.md` | Same BOM performance doc set. |

## Cleanup Candidates Requiring Confirmation

| Candidate | Why not automatic |
| --- | --- |
| Historical migration/checklist docs | Some checklist names look temporary, but several are linked or still encode durable decisions. |
| `server/security/**` CVE guides | Security docs are operationally sensitive and should be validated before pruning. |
| Duplicate Loki config trees | Config deletion can break deployment scripts if their path assumptions are outside this repo. |

## Safe Next Batch

1. Review historical migration/checklist docs only with domain-owner confirmation.
2. Review `server/security/**` CVE guides only with ops/security confirmation.
