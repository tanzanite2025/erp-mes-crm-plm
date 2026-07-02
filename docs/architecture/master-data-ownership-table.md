# Master Data Ownership Table (Field -> Module -> Read Entry)

Updated: 2026-04-09
Scope: `src/**` and current dictionary seeds in `server/db/seeds.go`

## 1) Rules

1. Fixed business enums: no TAB, no public dictionary; keep in module-owned readonly code.
2. Maintainable master data: must belong to one business module; module owns both write and read entry.
3. Global exceptions are rare (example: units).
4. Public dictionary is compatibility-only, not business source of truth.

## 2) Final Ownership (Locked)

| Field / Code | Owner Module | Data Nature | Read Entry (Frontend) | Write Entry | Need TAB |
|---|---|---|---|---|---|
| `MATERIAL_CATEGORY` | `material-archive` | Fixed enum (current) | `getMaterialCategoryOptions(locale)` in `src/features/material-archive/data/material-category-options.ts` | Module file constants | No |
| `ORDER_TYPE` | `trading` | Fixed enum (current) | `getSalesOrderTypeOptions/getSalesOrderTypeLabel` in `src/features/trading/data/sales-order-options.ts` | Module file constants | No |
| `ORDER_CLASSIFICATION` | `trading` | Fixed enum + ext rule | `getSalesOrderClassificationOptions/getSalesOrderClassificationLabel/getSalesOrderClassificationExt` in `src/features/trading/data/sales-order-options.ts` | Module file constants | No |
| `HOLE_COUNT` | `engineering-db` | Fixed enum | `STANDARD_HOLE_COUNT_OPTIONS` in `src/features/engineering-db/data/drilling-options.ts` | Module file constants | No |
| `LACING_PATTERN` | `engineering-db` | Fixed enum | `LACING_PATTERN_OPTIONS` in `src/features/engineering-db/data/drilling-options.ts` | Module file constants | No |
| `TIRE_TYPE` | `engineering` | Fixed enum (product meta) | `getTireTypeOptions(locale)` in `src/features/engineering/data/product-meta-options.ts` | Module file constants (current), later module meta write API | No (current) |
| `BRAKE_TYPE` | `engineering` | Fixed enum (product meta) | `getBrakeTypeOptions(locale)` in `src/features/engineering/data/product-meta-options.ts` | Module file constants (current), later module meta write API | No (current) |
| `TECH_SERIES` | `engineering` | Fixed enum (product meta) | `getTechSeriesOptions(locale)` in `src/features/engineering/data/product-meta-options.ts` | Module file constants (current), later module meta write API | No (current) |
| `VERSION_LEVEL` | `engineering` | Fixed enum (product meta) | `getVersionLevelOptions(locale)` in `src/features/engineering/data/product-meta-options.ts` | Module file constants (current), later module meta write API | No (current) |
| `UNIT` | `basic-settings` (global exception) | Global maintainable master | `unitService.getUnits()` in `src/features/basic-settings/services/unit-service.ts` | `/basic/units` + unit management UI | Yes (global exception) |
| `DRILLING_PLAN` | `engineering-db` | Maintainable module master | `ProductionDBService.getDrilling()` | Engineering-DB drilling management | Yes (module) |
| `LABELING_PLAN` | `engineering-db` | Maintainable module master | `ProductionDBService.getLabeling()` | Engineering-DB labeling management | Yes (module) |

## 3) Pending (Explicitly Scoped)

| Field / Code | Status | Decision |
|---|---|---|
| `MARKET_SPEC` | Not currently consumed by frontend | Keep reserved under `engineering` ownership. If enabled later, read via engineering module meta entry only (not dictionary). |

## 4) Forbidden Patterns (Effective Now)

1. No new `DictionaryCoreService` usage in business modules (`trading/material-archive/engineering/engineering-db/...`).
2. No new `xdfc_dictionary_updated` listeners in business modules.
3. No new full-snapshot reads (`DictionaryCoreService.getEntries()`) in business modules.
4. Cross-module read must go through explicit readonly module APIs/functions.

## 5) TAB Decision

1. Fixed enums: do not create TAB.
2. Maintainable master data: create module-internal TAB (not public dictionary TAB).
3. Only global exceptions keep global management entry.
