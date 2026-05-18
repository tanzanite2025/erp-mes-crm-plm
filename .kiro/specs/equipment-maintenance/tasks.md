# Implementation Plan: 设备维保记录 (Equipment Maintenance Records)

## Overview

实现统一维保记录系统的全栈功能。后端新增 `maintenance_records` 表及 CRUD API（Go/Gin/GORM），前端新增共享 `<MaintenanceRecordList>` 组件（React/TypeScript/TanStack Query/Zod/shadcn），通过 props 接受 `(assetType, assetId, assetSn)` 三元组，分别嵌入模具详情页和炉台详情页。

实现遵循既有模式：delta-based PATCH、版本号乐观锁、`services.AuditService` 审计日志、`apiFetch` + `ensureResponse`、Zod schema + adapter contract、TanStack Query 缓存按 (assetType, assetId) 隔离。

## Tasks

- [ ] 1. Backend: Database Migration
  - [ ] 1.1 Create database migration for `maintenance_records` table
    - Create migration file under `server/migrations/` (follow existing naming convention in that directory)
    - Define `CREATE TABLE maintenance_records` with columns matching design:
      - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
      - `asset_type VARCHAR(50) NOT NULL`, `asset_id UUID NOT NULL`, `asset_sn VARCHAR(100) DEFAULT ''`
      - `type VARCHAR(50) NOT NULL`, `status VARCHAR(50) NOT NULL DEFAULT 'OPEN'`
      - `title VARCHAR(255) NOT NULL`, `description TEXT DEFAULT ''`
      - `priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'`
      - `started_at TIMESTAMPTZ`, `completed_at TIMESTAMPTZ`
      - `cost NUMERIC(12,2) DEFAULT 0`, `remarks TEXT DEFAULT ''`
      - `created_by VARCHAR(100) DEFAULT ''`, `updated_by VARCHAR(100) DEFAULT ''`
      - `version INTEGER NOT NULL DEFAULT 1`
      - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `deleted_at TIMESTAMPTZ`
    - Add partial indexes (all `WHERE deleted_at IS NULL`):
      - `idx_mr_asset (asset_type, asset_id)`
      - `idx_mr_status (status)`
      - `idx_mr_created (created_at DESC)`
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 4.1_

- [ ] 2. Backend: Model and Handlers
  - [ ] 2.1 Create `MaintenanceRecord` GORM model
    - Create `server/models/maintenance_record.go` with the `MaintenanceRecord` struct from design
    - Include all fields with proper GORM tags: `type:uuid`, `size:N`, `index:idx_mr_asset`, defaults, `gorm.DeletedAt` for soft-delete
    - Register the model in the project's auto-migration list (e.g., `server/migrations/automigrate.go` or equivalent) so `db.AutoMigrate` picks it up alongside the SQL migration
    - Ensure JSON tags match the `MaintenanceRecordApiDTO` casing (camelCase)
    - _Requirements: 1.1, 1.2, 2.1, 4.1_

  - [ ] 2.2 Implement `MaintenanceRecord` CRUD handlers
    - Create `server/handlers/handler_maintenance_record.go`
    - `GetMaintenanceRecordsHandler` — list by `assetType` + `assetId` query params, order by `created_at DESC`, exclude soft-deleted
    - `GetMaintenanceRecordHandler` — fetch single record by `id`; return 404 if not found or soft-deleted
    - `CreateMaintenanceRecordHandler`:
      - Validate required `title` (HTTP 400 if missing)
      - Validate enum values: `assetType ∈ {MOLD, FURNACE}`, `type ∈ {PREVENTIVE, CORRECTIVE, INSPECTION}`, `priority ∈ {LOW, MEDIUM, HIGH, CRITICAL}` (HTTP 400 on invalid)
      - Validate `cost >= 0` (HTTP 400 if negative)
      - Validate temporal ordering: if both `startedAt` and `completedAt` provided, ensure `startedAt <= completedAt` (HTTP 400 otherwise)
      - Set `status='OPEN'`, `version=1`, `createdBy` from auth context
      - Persist via GORM; write audit log entry via `services.AuditService.LogCreate("MaintenanceRecord", id, delta)`
    - `PatchMaintenanceRecordHandler`:
      - Accept `DeltaPayload { op, delta, metadata: { id, version, intent } }`
      - Load record; if `metadata.version` ≠ current `version`, return HTTP 409
      - Validate any enum/cost/temporal fields present in the delta (same rules as create)
      - Validate status transitions: reject `COMPLETED → OPEN`, `CANCELLED → OPEN`, `CANCELLED → IN_PROGRESS` with HTTP 422
      - When `status` transitions to `COMPLETED` and `completedAt` not explicitly in delta, auto-set `completedAt = NOW()`
      - Apply delta via existing `buildXxxUpdates` pattern, increment `version`, set `updatedBy`
      - Write audit log via `services.AuditService.LogUpdate("MaintenanceRecord", id, delta)`
    - `DeleteMaintenanceRecordHandler` — soft-delete (`deleted_at = NOW()`), write audit log via `services.AuditService.LogDelete`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3_

  - [ ] 2.3 Register routes and permission
    - Add `ActionEquipmentMaintenanceManage` permission constant in the `authz` package
    - In `server/routes/routes_equipment.go`, register under the existing `equipmentGroup` (which already applies `equipmentAccess` middleware):
      - `GET    /maintenance-records` → `GetMaintenanceRecordsHandler` (read)
      - `GET    /maintenance-records/:id` → `GetMaintenanceRecordHandler` (read)
      - `POST   /maintenance-records` → `CreateMaintenanceRecordHandler` (requires `ActionEquipmentMaintenanceManage`)
      - `PATCH  /maintenance-records/:id` → `PatchMaintenanceRecordHandler` (requires `ActionEquipmentMaintenanceManage`)
      - `DELETE /maintenance-records/:id` → `DeleteMaintenanceRecordHandler` (requires `ActionEquipmentMaintenanceManage`)
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 2.4 Write property tests for backend CRUD logic
    - **Property 1: Create-Read Round Trip** — for any valid input, POST then GET by id yields all fields preserved, `status='OPEN'`, `version=1`, non-empty `id`/timestamps
      - **Validates: Requirements 1.1, 1.2, 1.4, 2.3**
    - **Property 2: Query Filtering by Asset** — for any mix of records with varied (assetType, assetId) and soft-delete states, listing by a specific pair returns exactly the non-deleted matching records
      - **Validates: Requirements 2.1, 4.2**
    - **Property 3: Query Ordering** — for any list response, every record's `createdAt >=` next record's `createdAt`
      - **Validates: Requirement 2.2**
    - **Property 4: Delta PATCH Applies Changes and Increments Version** — for any record at version N, valid delta + correct version yields field updates and version=N+1
      - **Validates: Requirement 3.1**
    - **Property 5: Optimistic Lock Rejects Version Mismatch** — for any record at version N, PATCH with version ≠ N returns 409 and record unchanged
      - **Validates: Requirement 3.2**
    - **Property 6: Invalid Enum Values Rejected** — any value outside the enum set for `assetType`/`type`/`priority`/`status` yields HTTP 400
      - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**
    - **Property 7: Negative Cost Rejected** — any negative `cost` yields HTTP 400
      - **Validates: Requirement 5.6**
    - **Property 8: Temporal Ordering Constraint** — `startedAt > completedAt` yields HTTP 400 on both POST and PATCH
      - **Validates: Requirement 5.7**
    - **Property 9: Invalid Status Transitions Rejected** — terminal-state (`COMPLETED`/`CANCELLED`) → `OPEN`/`IN_PROGRESS` yields HTTP 422
      - **Validates: Requirements 6.1, 6.2, 6.3**
    - **Property 10: Permission Enforcement** — write ops without `ActionEquipmentMaintenanceManage` return 403; read ops with `equipmentAccess` are allowed
      - **Validates: Requirements 7.2, 7.3**

- [ ] 3. Checkpoint - Backend verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Frontend: Data Layer (Schema, Contract, Adapter)
  - [ ] 4.1 Add Zod schema and types for `MaintenanceRecord`
    - Add to `src/features/equipment-tooling/data/schema.ts` (or a dedicated `maintenance-record.ts` if the file is large):
      - `maintenanceRecordTypeSchema = z.enum(['PREVENTIVE','CORRECTIVE','INSPECTION'])`
      - `maintenanceRecordStatusSchema = z.enum(['OPEN','IN_PROGRESS','COMPLETED','CANCELLED'])`
      - `maintenanceRecordPrioritySchema = z.enum(['LOW','MEDIUM','HIGH','CRITICAL'])`
      - `maintenanceRecordSchema` with all fields per design (`title.min(1)`, `cost.min(0).default(0)`, nullable date strings)
    - Export `MaintenanceRecord`, `MaintenanceRecordType`, `MaintenanceRecordStatus`, `MaintenanceRecordPriority` types via `z.infer`
    - _Requirements: 12.1, 12.2_

  - [ ] 4.2 Create `MaintenanceRecordApiDTO` contract
    - Create `src/features/equipment-tooling/contracts/maintenance-record-api-dto.ts`
    - Define `MaintenanceRecordApiDTO` with full API response shape (id, assetType, assetId, assetSn, type, status, title, description, priority, startedAt, completedAt, cost, remarks, createdBy, updatedBy, version, createdAt, updatedAt)
    - Define `SaveMaintenanceRecordApiDTO` for create requests (assetType, assetId, assetSn, type, title, description?, priority?, cost?, remarks?)
    - Export enum-string aliases: `MaintenanceRecordTypeApiDTO`, `MaintenanceRecordStatusApiDTO`, `MaintenanceRecordPriorityApiDTO`
    - _Requirements: 12.3_

  - [ ] 4.3 Create `MaintenanceRecord` API adapter
    - Create `src/features/equipment-tooling/adapters/maintenance-record-api-adapter.ts`
    - `toMaintenanceRecordContract(dto: MaintenanceRecordApiDTO): MaintenanceRecord` — map fields and run `maintenanceRecordSchema.parse` (or `safeParse` + log on failure) for runtime validation
    - `toMaintenanceRecordContracts(dtos: MaintenanceRecordApiDTO[]): MaintenanceRecord[]` — array variant
    - `toSaveMaintenanceRecordApiDTO(formData): SaveMaintenanceRecordApiDTO` — map create-form data to wire DTO (trim strings, default optional fields)
    - _Requirements: 12.1, 12.2, 12.3_

  - [ ]* 4.4 Write property test for adapter transformation
    - **Property 14: API DTO to Domain Object Transformation** — for any valid `MaintenanceRecordApiDTO` (use property-test generators), `toMaintenanceRecordContract` produces a `MaintenanceRecord` that passes `maintenanceRecordSchema.safeParse` with all fields correctly mapped
      - **Validates: Requirements 12.1, 12.3**

- [ ] 5. Frontend: Service and Hook Layer
  - [ ] 5.1 Create `MaintenanceRecordService`
    - Create `src/features/equipment-tooling/services/maintenance-record-service.ts`
    - `getByAsset(assetType, assetId)` → `GET /maintenance-records?assetType=...&assetId=...`, parse via `ensureArrayResponse` + `toMaintenanceRecordContracts`
    - `create(record: SaveMaintenanceRecordApiDTO)` → `POST /maintenance-records`, parse via `ensureObjectResponse` + `toMaintenanceRecordContract`
    - `patch(id, delta: DeltaSet, version)` → `PATCH /maintenance-records/:id` with body `{ op:'PATCH', delta, metadata:{ id, version, intent:'MAINTENANCE_RECORD_UPDATE' } }`, parse via `ensureObjectResponse` + `toMaintenanceRecordContract`
    - `delete(id)` → `DELETE /maintenance-records/:id`
    - All calls use shared `apiFetch` from `@/lib/api-client`
    - _Requirements: 8.3, 9.2, 10.1, 10.4, 12.3_

  - [ ] 5.2 Create `useMaintenanceRecords` hook
    - Create `src/features/equipment-tooling/hooks/use-maintenance-records.ts`
    - Export `MAINTENANCE_RECORDS_QUERY_KEY(assetType, assetId)` factory returning `['maintenanceRecords', assetType, assetId] as const`
    - `useQuery` with `queryKey` from factory, `queryFn = () => MaintenanceRecordService.getByAsset(assetType, assetId)`, `enabled: !!assetId`
    - `createMutation`, `patchMutation`, `deleteMutation` — each `onSuccess` calls `queryClient.invalidateQueries({ queryKey })` for the same `(assetType, assetId)` only
    - Return `{ records, isLoading, create, patch, remove, reload }`
    - _Requirements: 11.1, 11.2, 11.3_

- [ ] 6. Frontend: `MaintenanceRecordList` Component
  - [ ] 6.1 Implement `MaintenanceRecordList`
    - Create `src/features/equipment-tooling/components/maintenance-record-list.tsx`
    - Props: `{ assetType: 'MOLD' | 'FURNACE'; assetId: string; assetSn: string }`
    - Use `useMaintenanceRecords(assetType, assetId)` for data and mutations
    - Render compact list rows using shadcn primitives: color-coded status badge (OPEN=blue, IN_PROGRESS=yellow, COMPLETED=green, CANCELLED=gray), priority chip, type label, title, formatted `createdAt`
    - Show loading skeleton/spinner while `isLoading`
    - "新建维保记录" button opens a dialog form (type, title, description, priority, cost, remarks); pre-fill `assetType`, `assetId`, `assetSn` from props; on submit call `create` and close on success; on error display message and keep dialog open
    - Inline status edit: dropdown shows only valid next-status options (no `COMPLETED→OPEN`, `CANCELLED→OPEN`, `CANCELLED→IN_PROGRESS`); on change build `DeltaSet` and call `patch({ id, delta, version })`
    - Inline remarks edit: same delta-PATCH path
    - Delete: confirmation dialog ("确定删除此维保记录？"); on confirm call `remove(id)`
    - Error handling: on HTTP 409, toast "记录已被他人修改，请刷新后重试" and call `reload()`; for other errors show toast with server message
    - _Requirements: 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_

  - [ ]* 6.2 Write unit tests for `MaintenanceRecordList`
    - Render with mock data; assert each row contains status badge, priority, type, title, formatted creation date
    - Open create dialog from button; submit valid form; assert `create` mutation called with pre-filled props
    - Status dropdown only exposes valid transitions for each starting state
    - Delete button shows confirmation dialog; confirm triggers `remove`
    - 409 conflict path triggers toast and `reload()`
    - Loading state renders the loading indicator
    - **Property 11: Rendered Record Contains Required Fields** — for any valid `MaintenanceRecord`, the rendered row contains status badge, priority, type, title, and creation date
      - **Validates: Requirement 8.4**
    - **Property 12: Valid Next-Status Options** — for any current `status`, the next-status options shown are a subset of allowed transitions (no backward transitions from terminal states)
      - **Validates: Requirement 10.3**

- [ ] 7. Frontend: Integration with Mold Detail Page
  - [ ] 7.1 Embed `MaintenanceRecordList` in Mold detail page
    - Locate the Mold detail page/tab component in `src/features/equipment-tooling/`
    - Add a "维保记录" section or tab and render `<MaintenanceRecordList assetType="MOLD" assetId={mold.id} assetSn={mold.sn} />`
    - Ensure the section is hidden / does not fire requests until the parent has loaded `mold.id` (component already guards via `enabled: !!assetId`)
    - _Requirements: 8.1, 11.3_

- [ ] 8. Checkpoint - Mold integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Frontend: Integration with Furnace Detail Page
  - [ ] 9.1 Embed `MaintenanceRecordList` in Furnace detail page
    - Locate the Furnace detail page/tab component in `src/features/equipment-tooling/`
    - Add a "维保记录" section or tab and render `<MaintenanceRecordList assetType="FURNACE" assetId={furnace.id} assetSn={furnace.sn} />`
    - Same loading guard as Mold (component handles via `enabled: !!assetId`)
    - _Requirements: 8.2, 11.3_

  - [ ]* 9.2 Write integration test for cache isolation
    - Mount two `MaintenanceRecordList` instances for distinct `(assetType, assetId)` pairs in a shared `QueryClientProvider`; perform a mutation on one; assert the other's cached data is not invalidated
    - **Property 13: Cache Isolation by Asset Key** — for any two different `(assetType, assetId)` pairs, mutations on one SHALL NOT invalidate the cached data of the other
      - **Validates: Requirement 11.2**

- [ ] 10. Final checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements (granular sub-requirements, e.g. 5.7) for traceability
- All 14 correctness properties from `design.md` are mapped to test sub-tasks: 1–10 → 2.4 (backend), 11–12 → 6.2 (component), 13 → 9.2 (cache isolation), 14 → 4.4 (adapter)
- Backend follows existing patterns: delta-based PATCH, `services.AuditService` audit logging, GORM soft-delete, version-based optimistic locking
- Frontend follows existing patterns: `apiFetch` + `ensureResponse`, Zod schema + adapter contract, TanStack Query with `(assetType, assetId)` cache key isolation
- `MaintenanceRecordList` is the single shared component reused by both Mold and Furnace detail pages, parameterised by `assetType`

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "4.1", "4.2"] },
    { "id": 1, "tasks": ["2.1", "4.3"] },
    { "id": 2, "tasks": ["2.2", "4.4", "5.1"] },
    { "id": 3, "tasks": ["2.3", "5.2"] },
    { "id": 4, "tasks": ["2.4", "6.1"] },
    { "id": 5, "tasks": ["6.2", "7.1", "9.1"] },
    { "id": 6, "tasks": ["9.2"] }
  ]
}
```
