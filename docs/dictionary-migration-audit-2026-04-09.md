# Dictionary Migration Audit (2026-04-09)

## Scope
- Workspace scan target: `src/**`, `server/**`
- Goal: identify current wrong dependencies on global dictionary system (`DictionaryCoreService` + `/dictionary/*`) under strong-module architecture

## Executive Summary
- Conclusion aligns with your architecture direction: current global dictionary layer should become compatibility-only, not authoritative domain source.
- Current direct `getOptions('...')` calls found: **18**
- Current global full-snapshot (`getEntries()`) usage found: **8+ key points** (mostly Engineering/Trading)
- Current global event (`xdfc_dictionary_updated`) coupling found: **5 listeners**
- Critical mismatch found: backend seed explicitly purges `HOLE_COUNT`, but frontend still calls `getOptions('HOLE_COUNT')`.

## P0 - Must Fix First
### 1) Stale code uses removed dictionary entry `HOLE_COUNT`
- Frontend callsite:
  - `src/features/engineering-db/components/drilling-action-dialog.tsx:194`
- Backend seed purges it:
  - `server/db/seeds.go:90`
  - `server/db/seeds.go:92`
- Risk:
  - `DictionaryCoreService.getOptions()` is fail-loud and throws when entry missing.
- Migration target:
  - Move "standard hole count options" to Engineering/Drilling module-owned source (e.g. drilling profile config table or hard business enum), not global dictionary.

## P1 - Domain Ownership Migration List

### A. Materials domain (owner: Material Archive)
#### Current wrong dependencies
- `MATERIAL_CATEGORY` via global dictionary:
  - `src/routes/_authenticated/materials/route.tsx:23`
  - `src/features/material-archive/tabs/material-mgmt.tsx:41`
  - `src/features/material-archive/hooks/use-material-columns.tsx:122`
  - `src/features/material-archive/components/material-form.tsx:37`
  - `src/features/material-archive/components/material-mobile-list.tsx:31`
  - `src/features/material-archive/services/excel-service.ts:79`

#### Target ownership
- Material module should own category master data and read API (example: `MaterialCategoryService.listOptions()` / `/materials/categories`).
- Material tabs, forms, export/import dictionary sheet should read from material domain only.

### B. Trading domain (owner: Trading / Sales Order)
#### Current wrong dependencies
- `ORDER_CLASSIFICATION`:
  - `src/features/trading/hooks/use-sales-order-init.ts:21`
  - `src/features/trading/hooks/use-sales-order-form.ts:64`
  - `src/features/trading/hooks/use-sales-order-form.ts:86`
  - `src/features/trading/components/sales-order-master.tsx:85`
  - `src/features/trading/components/parts/order-header-fields.tsx:128`
  - `src/features/trading/components/parts/sales-order-detail-summary.tsx:106`
- `ORDER_TYPE`:
  - `src/features/trading/hooks/use-sales-order-init.ts:23`
  - `src/features/trading/components/parts/order-header-fields.tsx:111`
  - `src/features/trading/components/parts/sales-order-detail-summary.tsx:98`

#### Target ownership
- Trading module should expose its own option endpoints (example: `SalesOrderMetaService.getOrderTypes()`, `getClassifications()`).
- Barcode/ext mapping for classification should belong to Sales Order numbering/contract policy, not dictionary center.

### C. Engineering domain (owner: Engineering/Product)
#### Current wrong dependencies
- Product form options by dictionary code:
  - `src/features/engineering/hooks/use-product-form-init.ts:51` (`TIRE_TYPE`)
  - `src/features/engineering/hooks/use-product-form-init.ts:52` (`BRAKE_TYPE`)
  - `src/features/engineering/hooks/use-product-form-init.ts:53` (`TECH_SERIES`)
  - `src/features/engineering/hooks/use-product-form-init.ts:54` (`VERSION_LEVEL`)

#### Target ownership
- Product metadata options should be provided by Engineering module metadata service (example: `/engineering/meta/*`).

### D. Engineering-DB domain (owner: Engineering DB)
#### Current wrong dependencies
- `LACING_PATTERN` and `HOLE_COUNT` from global dictionary:
  - `src/features/engineering-db/components/drilling-action-dialog.tsx:184`
  - `src/features/engineering-db/components/drilling-action-dialog.tsx:194`

#### Target ownership
- Drilling parameter dictionaries should come from engineering-db module-owned entities/config.

## P1.5 - Cross-Module Technical Debt (Global Snapshot Coupling)
### Full dictionary snapshot coupling (`getEntries()`)
- `src/features/engineering/index.tsx:59`
- `src/features/engineering/hooks/use-bom-data.ts:52`
- `src/features/engineering/hooks/use-bom-form.ts:121`
- `src/features/trading/components/sales-order-action-dialog.tsx:56`
- Plus update handlers reading full snapshot on global event

### Why this is harmful
- Pulls unrelated dictionary entries into module runtime.
- Creates hidden schema coupling across module boundaries.
- Increases break risk when unrelated dictionary entries change.

### Migration target
- Replace `getEntries()` broad fetch with narrow domain-owned option/list APIs.
- For cross-domain read, use explicit read-only domain APIs (e.g. Trading reads Engineering product display via Engineering read service).

## P2 - Compatibility Layer Hardening
### Freeze policy to enforce now
- No new dictionary group/entry for domain master data.
- Keep dictionary APIs only for compatibility + old UI until migrations complete.

### Immediate guard recommendations
- Frontend: block new usage by lint rule (`no-restricted-imports` for `DictionaryCoreService` outside `basic-settings`).
- Backend: keep `/dictionary/*` but mark as compatibility; optionally block creation for non-legacy scopes.

## Suggested Migration Order
1. Remove `HOLE_COUNT` dependency (P0 hotfix).
2. Materials (`MATERIAL_CATEGORY`) full migration.
3. Trading (`ORDER_TYPE`, `ORDER_CLASSIFICATION`) migration.
4. Engineering product metadata migration (`TIRE_TYPE`, `BRAKE_TYPE`, `TECH_SERIES`, `VERSION_LEVEL`, `LACING_PATTERN`).
5. Remove `getEntries()`/`xdfc_dictionary_updated` listeners in Engineering/Trading.
6. Downgrade dictionary center to compatibility layer; after zero callers, delete.

## Backend Anchors (for compatibility-layer phase)
- Dictionary routes: `server/routes/routes.go:94`
- Dictionary service: `server/services/dictionary_service.go`
- Dictionary model: `server/models/dictionary.go`
- Seed + system codes: `server/db/seeds.go`
