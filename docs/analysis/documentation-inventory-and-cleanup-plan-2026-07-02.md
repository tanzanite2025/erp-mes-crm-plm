# Documentation Inventory and Cleanup Plan (2026-07-02)

## Scope

- Scanned Markdown documents under the repo, excluding generated/runtime folders such as `node_modules`, `dist`, `.git`, `server/postgres_data`, coverage output, and test reports.
- Scanned docs-like YAML/config files only for classification boundaries; they are not treated as prose documentation.
- No files were deleted or moved in this audit.

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
| Server-local docs | `server/contract-samples/README.md`, `server/migrations/README.md`, `server/security/**`, `server/docs/swagger.yaml` | Keep near code | These are tightly coupled to backend contracts, migrations, security scripts, or API schema. |
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
| `server/security/**` | Deferred | CVE scripts and their local README are operational artifacts; path modernization should be handled in a separate security-specific review, not mixed into this prose-doc cleanup. |

## Stale Or Risky References

| Finding | Evidence | Recommended cleanup |
| --- | --- | --- |
| Legacy spec-directory references | Resolved on 2026-07-02 in `README.md`, `.github/CONTRIBUTING.md`, and `docs/architecture/project-structure-review.md` | No further action unless an active spec directory is reintroduced. |
| Old local absolute paths | Resolved on 2026-07-02: 36 Markdown links were converted to repo-relative links | Keep future links repo-relative. |
| Broken absolute-link targets | Resolved on 2026-07-02: 8 missing targets were converted to inline historical notes instead of links | Do not blindly recreate files; add current equivalent links only when verified. |
| Root-level docs are noisy | Resolved on 2026-07-02: seven Markdown files were moved into category folders | Keep future docs under the nearest category instead of directly under `docs/`. |
| APS docs overlap | Resolved on 2026-07-02: parent docs are canonical; `core/` keeps only implementation deep dives | Do not recreate same-name short stubs under `core/`. |
| Loki config duplicated | Resolved on 2026-07-02: `server/docker-compose.yml` mounts `server/deployment/loki/**`; unused root `deployment/loki/**` copy was removed | Keep `server/deployment/loki/**` as the compose-local source of truth. |
| Security CVE docs are date-sensitive | `server/security/**` documents CVE-2026-31431 procedures | Do not delete as stale without security review; keep server-local because scripts live there, optionally link from `docs/ops`. |

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
