# Master Data Ownership Table (Field -> Module -> Read Entry)

Updated: 2026-10-22 (product attribute catalog and BOM grade ownership)
Scope: `src/**` and current dictionary seeds in `server/db/seeds.go`

## 1) Rules

1. Fixed business enums: no TAB, no public dictionary; keep in module-owned readonly code.
2. Maintainable master data: must belong to one business module; module owns both write and read entry.
3. Global exceptions are rare (example: units).
4. Public dictionary is compatibility-only, not business source of truth.

## 2) Final Ownership (Locked)

| Field / Code           | Owner Module                        | Data Nature                                              | Read Entry (Frontend)                                                                                                                                      | Write Entry                               | Need TAB               |
| ---------------------- | ----------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------- |
| `MATERIAL_CATEGORY`    | `material-archive`                  | Fixed enum (current)                                     | `getMaterialCategoryOptions(locale)` in `src/features/material-archive/data/material-category-options.ts`                                                  | Module file constants                     | No                     |
| `ORDER_TYPE`           | `trading`                           | Fixed enum (current)                                     | `getSalesOrderTypeOptions/getSalesOrderTypeLabel` in `src/features/trading/data/sales-order-options.ts`                                                    | Module file constants                     | No                     |
| `ORDER_CLASSIFICATION` | `trading`                           | Fixed enum + ext rule                                    | `getSalesOrderClassificationOptions/getSalesOrderClassificationLabel/getSalesOrderClassificationExt` in `src/features/trading/data/sales-order-options.ts` | Module file constants                     | No                     |
| `HOLE_COUNT`           | `engineering-db`                    | Fixed enum                                               | `STANDARD_HOLE_COUNT_OPTIONS` in `src/features/engineering-db/data/drilling-options.ts`                                                                    | Module file constants                     | No                     |
| `LACING_PATTERN`       | `engineering-db`                    | Fixed enum                                               | `LACING_PATTERN_OPTIONS` in `src/features/engineering-db/data/drilling-options.ts`                                                                         | Module file constants                     | No                     |
| `TIRE_TYPE`            | `engineering`                       | Template-owned attribute and options                     | Current template attributeBindings and its options                                                                                                         | Product Templates → Edit current template | Yes, per template      |
| `BRAKE_TYPE`           | `engineering`                       | Template-owned attribute and options                     | Current template attributeBindings and its options                                                                                                         | Product Templates → Edit current template | Yes, per template      |
| `TECH_SERIES`          | `engineering`                       | Template-owned attribute and options                     | Current template attributeBindings and its options                                                                                                         | Product Templates → Edit current template | Yes, per template      |
| `VERSION_LEVEL`        | `engineering` (BOM grade catalog)   | Independent grade options; selected grade belongs to BOM | versionLevel option catalog; selected value from BOM.versionLevel                                                                                          | BOM form → Manage product grade options   | Yes, within BOM        |
| `UNIT`                 | `basic-settings` (global exception) | Global maintainable master                               | `unitService.getUnits()` in `src/features/basic-settings/services/unit-service.ts`                                                                         | `/basic/units` + unit management UI       | Yes (global exception) |
| `DRILLING_PLAN`        | `engineering-db`                    | Maintainable module master                               | `ProductionDBService.getDrilling()`                                                                                                                        | Engineering-DB drilling management        | Yes (module)           |
| `LABELING_PLAN`        | `engineering-db`                    | Maintainable module master                               | `ProductionDBService.getLabeling()`                                                                                                                        | Engineering-DB labeling management        | Yes (module)           |

Each product template owns its attribute definitions and options. Templates may use equal category keys and option values without sharing records. Products store individual selections; labels are resolved within the owning template. Product Templates edits the entire template draft transactionally. BOM grade choices remain an independent catalog and are maintained beside the grade field in the BOM form. There is no standalone product attribute route, public catalog entry, module TAB or compatibility redirect.

Product templates bind attribute categories and required settings; product forms select their option values. `techSeries`, `tireType` and `brakeType` are product specifications. The `versionLevel` option catalog is maintained by engineering, while each selected grade is stored on the BOM in the `product-structure` domain. Product saves exclude this grade from product attributes. See [product template attribute ownership and reuse](../frontend/product-template-attribute-classification-business-components-reuse-guide.md).

## 3) Pending (Explicitly Scoped)

| Field / Code  | Status                             | Decision                                                                                                                     |
| ------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
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
