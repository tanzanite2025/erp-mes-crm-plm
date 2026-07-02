# Project Structure Responsibility and Layering Review

## Verdict

The project already has recognizable layers, but the boundaries are uneven. Frontend modules generally follow a clear feature-sliced style, while the backend still has several large service and handler files that mix orchestration, transaction policy, and DTO conversion. Documentation was also noisy: generated summaries, one-off fix notes, and upstream template files made the real source-of-truth docs harder to find.

## Current Responsibility Map

| Area | Responsibility | Current clarity |
| --- | --- | --- |
| `src/routes` | Route definitions and route-level guards | Clear when route files only import feature entries; should stay thin. |
| `src/features` | Frontend domain modules | Mostly clear. Many modules use `components`, `hooks`, `services`, `data`, `tabs`, and `index` exports. |
| `src/components` | Shared UI shells and cross-feature components | Clear, but should not absorb business logic from feature modules. |
| `src/lib` | Cross-cutting frontend infrastructure | Clear for API, logging, delta tracking, schema helpers, and utility code. |
| `src/locales` | Locale catalogs and override guidance | Clear, but large locale files are expected to grow and should remain generated/structured. |
| `server/routes` | Gin route registration | Clear. |
| `server/handlers` | HTTP handlers, DTO mapping, validation boundaries | Partly clear; file count is high and some handlers contain business-adjacent logic. |
| `server/services` | Business rules, transactions, workflow orchestration | Partly clear; some files are too large and act as multiple services in one. |
| `server/models` | GORM persistence models | Clear. |
| `server/modules` | Newer cohesive backend domain modules | Clearer than the flat `handlers`/`services` areas and worth using as the future direction. |
| `docs` | Durable architecture, analysis, and ops knowledge | Clearer after pruning generated/historical docs. |

## Layering Assessment

### What is already working

1. Frontend route files commonly delegate into `src/features`, which keeps route concerns separate from page/domain implementation.
2. Several frontend modules have good physical separation: `services` for API calls, `hooks` for React Query/mutation orchestration, `components` for rendering, and `data` or `contracts` for schemas/options.
3. Cross-cutting frontend concerns have dedicated homes, especially API access, logging, delta tracking, and performance instrumentation under `src/lib`.
4. Backend route registration, handlers, services, models, audit, authz, and database helpers are distinguishable enough for onboarding.
5. `server/modules` shows a more cohesive direction for future backend work than only growing flat `handlers` and `services` folders.

### Main risks

1. Some backend service files are oversized and mix multiple reasons to change. Current examples include `server/services/sales_transaction_service.go`, `server/db/db.go`, and `server/services/purchase_transaction_service.go`.
2. Several frontend screen/dialog files exceed a comfortable review size, which makes UI state, workflow steps, and rendering details harder to separate.
3. The backend `handlers` layer contains many files and can drift into business rules unless DTO mapping and transaction orchestration remain explicitly separated.
4. Documentation had too many generated completion reports and local repair notes. These made it difficult to distinguish current architecture decisions from historical task output.
5. GitHub community files still referenced upstream template projects, which was misleading for contributors and PR authors.

## Recommended Conventions

### Frontend

```text
src/routes/**            Route entry only: auth guards, route params, lazy imports.
src/features/<domain>/   Business module boundary.
  components/            Pure rendering and interaction components.
  hooks/                 React Query, mutation side effects, and page orchestration.
  services/              API calls, DTO adaptation, SDRTS/TDO payload construction.
  data/ or contracts/    Zod schemas, options, constants, and DTO contracts.
  tabs/ or pages/        Feature-owned page compositions.
  index.ts               Explicit public exports only.
src/lib/**               Reusable infrastructure, never domain-specific policy.
```

### Backend

```text
server/routes/**         Register endpoints and middleware.
server/handlers/**       Parse requests, validate inputs, map DTOs, call services.
server/services/**       Business transactions and workflow/domain orchestration.
server/repositories/**   Persistence access when a service needs reusable query logic.
server/models/**         GORM models only.
server/modules/<domain>/ Preferred shape for new cohesive backend domains.
```

### Documentation

```text
README.md                Entry point, setup, repo map, and key commands.
docs/architecture/**     Architecture decisions, topology, and durable design notes.
docs/analysis/**         Time-stamped audits and retrospectives that remain useful.
docs/ops/**              Deployment, monitoring, rollout, and recovery procedures.
```

## Cleanup Performed

1. Replaced upstream-template GitHub docs with project-specific contribution, issue, and PR guidance.
2. Removed stale sponsorship/community files that referenced the source template project.
3. Removed one-off local repair scripts and build-fix notes from the repo root.
4. Moved the single-VPS deployment roadmap from the repo root into `docs/ops`.
5. Removed generated completion reports, status summaries, migration handoff notes, and validation reports that duplicated or obscured durable specs.

## Follow-up Opportunities

1. Split the largest backend services by transaction family or workflow command boundary.
2. Prefer `server/modules/<domain>` for new backend work so handlers, services, repositories, DTOs, and tests stay near the domain.
3. Keep route files and feature `index.ts` files as stable public boundaries; avoid deep cross-feature imports unless they go through an explicit exported API.
4. Add a short `README.md` in large domains such as `product-structure`, `trading`, and `warehouse` if onboarding remains difficult.
