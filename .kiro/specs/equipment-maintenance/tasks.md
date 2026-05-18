# Implementation Plan: 设备维保记录 (Equipment Maintenance Records)

## Overview

实现统一维保记录系统的全栈功能。后端新增 `maintenance_records` 表及 CRUD API（Go/Gin/GORM），前端新增共享 `<MaintenanceRecordList>` 组件（React/TypeScript/TanStack Query/Zod/shadcn），分别嵌入模具详情页和炉台详情页。

## Tasks

- [ ] 1. Backend: Database Migration
  - [ ] 1.1 Create database migration for maintenance_records table
    - Create migration file in `server/migrations/` directory
    - Define CREATE TABLE statement with all columns: id (UUID primary key), asset_type, asset_id, asset_sn, type, status, title, description, priority, started_at, completed_at, cost, remarks, created_by, updated_by, version, created_at, updated_at, deleted_at
    - Add composite index `idx_mr_asset` on (asset_type, asset_id) with WHERE deleted_at IS NULL
    - Add index `idx_mr_status` on status with WHERE deleted_at IS NULL
    - Add index `idx_mr_created` on created_at DESC with WHERE deleted_at IS NULL
    - Set appropriate column types, defaults, and NOT NULL constraints per design
    - _Requirements: 1.1, 1.2, 2.1, 4.1_

- [ ] 2. Backend: Model and Handlers
  - [ ] 2.1 Create MaintenanceRecord model
    - Create `server/models/maintenance_record.go` with the `MaintenanceRecord` struct
    - Include all fields: ID, AssetType, AssetID, AssetSN, Type, Status, Title, Description, Priority, StartedAt, CompletedAt, Cost, Remarks, CreatedBy, UpdatedBy, Version, CreatedAt, UpdatedAt, DeletedAt
    - Add GORM tags for column types, indexes, and defaults matching the migration
    - Register the model in the auto-migration list (if auto-migration is used)
    - _Requirements: 1.1, 1.2, 2.1, 4.1_

  - [ ] 2.2 Create MaintenanceRecord handlers with CRUD operations
    - Create `server/handlers/handler_maintenance_record.go`
    - Implement `GetMaintenanceRecordsHandler` — list by assetType + assetId query params, ordered by createdAt DESC, exclude soft-deleted records
    - Implement `GetMaintenanceRecordHandler` — get single record by ID, return 404 if not found or soft-deleted
    - Implement `CreateMaintenanceRecordHandler` — validate required fields (title, assetType enum, type enum, priority enum, non-negative cost), set status='OPEN', version=1, createdBy from auth context, write audit log via `services.AuditService`
    - Implement `PatchMaintenanceRecordHandler` — accept DeltaPayload, check version match (return 409 on mismatch), validate status transitions (return 422 on invalid transitions per Property 9), validate enums and cost, increment version, set updatedBy, auto-set completedAt when status changes to COMPLETED, write audit log
    - Implement `DeleteMaintenanceRecordHandler` — soft-delete by setting deleted_at, write audit log
    - Follow existing `buildXxxUpdates` delta pattern from other handlers in the codebase
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3_

  - [ ] 2.3 Register maintenance record routes
    - Add `ActionEquipmentMaintenanceManage` permission constant in `authz` package
    - Register routes in `server/routes/routes_equipment.go` under `equipmentGroup` with path `/maintenance-records`
    - GET endpoints (list and detail) require `equipmentAccess` middleware only
    - POST, PATCH, DELETE endpoints require `maintenanceManage` permission middleware
    - Route definitions: GET /maintenance-records (list), GET /maintenance-records/:id (detail), POST /maintenance-records (create), PATCH /maintenance-records/:id (update), DELETE /maintenance-records/:id (delete)
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 2.4 Write property tests for backend CRUD logic
    - **Property 1: Create-Read Round Trip** — create with valid input, read back, verify all fields preserved, status='OPEN', version=1
    - **Property 2: Query Filtering by Asset** — create records with mixed assetType/assetId, query by specific pair, verify only matching non-deleted records returned
    - **Property 3: Query Ordering** — create multiple records, verify list returns them in createdAt DESC order
    - **Property 4: Delta PATCH Applies Changes and Increments Version** — patch with correct version, verify fields updated and version=N+1
    - **Property 5: Optimistic Lock Rejects Version Mismatch** — patch with wrong version, verify 409 and record unchanged
    - **Property 6: Invalid Enum Values Rejected** — invalid assetType/type/priority/status returns 400
    - **Property 7: Negative Cost Rejected** — negative cost returns 400
    - **Property 8: Temporal Ordering Constraint** — startedAt > completedAt returns 400
    - **Property 9: Invalid Status Transitions Rejected** — COMPLETED/CANCELLED to OPEN/IN_PROGRESS returns 422
    - **Property 10: Permission Enforcement** — write ops without permission return 403, read ops with equipmentAccess allowed
    - **Validates: Requirements 1.1, 1.2, 1.4, 2.1, 2.2, 3.1, 3.2, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3, 7.2, 7.3**

- [ ] 3. Checkpoint - Backend verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Frontend: Data Layer (Schema, Contract, Adapter)
  - [ ] 4.1 Create Zod schema and types for MaintenanceRecord
    - Add maintenance record schemas to `src/features/equipment-tooling/data/schema.ts` (or create a new dedicated file if preferred)
    - Define `maintenanceRecordTypeSchema` as z.enum(['PREVENTIVE', 'CORRECTIVE', 'INSPECTION'])
    - Define `maintenanceRecordStatusSchema` as z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    - Define `maintenanceRecordPrioritySchema` as z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    - Define `maintenanceRecordSchema` with all fields and validation rules (title min 1, cost min 0, nullable dates)
    - Export `MaintenanceRecord`, `MaintenanceRecordType`, `MaintenanceRecordStatus`, `MaintenanceRecordPriority` types
    - _Requirements: 12.1, 12.2_

  - [ ] 4.2 Create MaintenanceRecord API DTO contract
    - Create `src/features/equipment-tooling/contracts/maintenance-record-api-dto.ts`
    - Define `MaintenanceRecordApiDTO` interface with all API response fields (id, assetType, assetId, assetSn, type, status, title, description, priority, startedAt, completedAt, cost, remarks, createdBy, updatedBy, version, createdAt, updatedAt)
    - Define `SaveMaintenanceRecordApiDTO` interface for create requests (assetType, assetId, assetSn, type, title, description, priority, cost, remarks)
    - Define type aliases for enums: `MaintenanceRecordTypeApiDTO`, `MaintenanceRecordStatusApiDTO`, `MaintenanceRecordPriorityApiDTO`
    - _Requirements: 12.3_

  - [ ] 4.3 Create MaintenanceRecord API adapter
    - Create `src/features/equipment-tooling/adapters/maintenance-record-api-adapter.ts`
    - Implement `toMaintenanceRecordContract(dto: MaintenanceRecordApiDTO): MaintenanceRecord` — transform single DTO to domain object with Zod parse for validation
    - Implement `toMaintenanceRecordContracts(dtos: MaintenanceRecordApiDTO[]): MaintenanceRecord[]` — transform array
    - Implement `toSaveMaintenanceRecordApiDTO(formData): SaveMaintenanceRecordApiDTO` — transform form data to save DTO
    - _Requirements: 12.1, 12.3_

  - [ ]* 4.4 Write property test for adapter transformation
    - **Property 14: API DTO to Domain Object Transformation** — generate valid MaintenanceRecordApiDTO, transform through adapter, verify produces valid Zod-parsed MaintenanceRecord with all fields correctly mapped
    - **Validates: Requirements 12.1, 12.3**

- [ ] 5. Frontend: Service and Hook Layer
  - [ ] 5.1 Create MaintenanceRecordService
    - Create `src/features/equipment-tooling/services/maintenance-record-service.ts`
    - Implement `getByAsset(assetType: string, assetId: string): Promise<MaintenanceRecord[]>` — GET /maintenance-records with query params, use `ensureArrayResponse` and `toMaintenanceRecordContracts`
    - Implement `create(record: SaveMaintenanceRecordApiDTO): Promise<MaintenanceRecord>` — POST /maintenance-records, use `ensureObjectResponse` and `toMaintenanceRecordContract`
    - Implement `patch(id: string, delta: DeltaSet, version: number): Promise<MaintenanceRecord>` — PATCH /maintenance-records/:id with DeltaPayload, use `ensureObjectResponse` and `toMaintenanceRecordContract`
    - Implement `delete(id: string): Promise<void>` — DELETE /maintenance-records/:id
    - Follow existing `apiFetch` + `ensureResponse` pattern from the codebase
    - _Requirements: 8.3, 9.2, 10.1, 10.4_

  - [ ] 5.2 Create useMaintenanceRecords hook
    - Create `src/features/equipment-tooling/hooks/use-maintenance-records.ts`
    - Define `MAINTENANCE_RECORDS_QUERY_KEY(assetType: string, assetId: string)` factory function for cache isolation
    - Implement `useQuery` with queryKey from factory, queryFn calling `MaintenanceRecordService.getByAsset`, and `enabled: !!assetId` guard
    - Implement `createMutation` using `MaintenanceRecordService.create`, with `onSuccess` invalidating the query cache
    - Implement `patchMutation` using `MaintenanceRecordService.patch`, with `onSuccess` invalidating the query cache
    - Implement `deleteMutation` using `MaintenanceRecordService.delete`, with `onSuccess` invalidating the query cache
    - Return `{ records, isLoading, create, patch, remove, reload }` interface
    - _Requirements: 11.1, 11.2, 11.3_

- [ ] 6. Frontend: MaintenanceRecordList Component
  - [ ] 6.1 Create MaintenanceRecordList component
    - Create `src/features/equipment-tooling/components/maintenance-record-list.tsx`
    - Accept props: `{ assetType: 'MOLD' | 'FURNACE', assetId: string, assetSn: string }`
    - Use `useMaintenanceRecords(assetType, assetId)` hook to fetch and manage records
    - Display records in a compact list with color-coded status badges (e.g., OPEN=blue, IN_PROGRESS=yellow, COMPLETED=green, CANCELLED=gray), priority indicator, type label, title, and formatted creation date
    - Show loading indicator (spinner or skeleton) while `isLoading` is true
    - Include "新建维保记录" (create) button that opens a dialog form with fields for type, title, description, priority, cost, remarks
    - Pre-fill assetType, assetId, assetSn in create form from props
    - Include inline status editing with dropdown showing only valid next-status options based on current status (enforce transition rules per Property 9)
    - Include delete button with confirmation dialog ("确定删除此维保记录？")
    - Handle 409 conflict error: show toast message "记录已被他人修改，请刷新后重试" and call `reload()`
    - Handle other API errors with appropriate toast messages
    - _Requirements: 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_

  - [ ]* 6.2 Write unit tests for MaintenanceRecordList component
    - Test rendering with mock data (verify status badges, priority, type, title, date displayed)
    - Test create dialog opens when button clicked and submits form data
    - Test status dropdown only shows valid transitions (e.g., COMPLETED cannot transition to OPEN)
    - Test delete confirmation dialog appears and calls delete mutation on confirm
    - Test loading state displays loading indicator
    - **Property 11: Rendered Record Contains Required Fields** — verify each rendered record contains status badge, priority, type, title, creation date
    - **Property 12: Valid Next-Status Options** — verify dropdown options match valid transitions for each status
    - **Validates: Requirements 8.3, 8.4, 8.5, 9.1, 10.3, 10.4**

- [ ] 7. Frontend: Integration with Mold Detail Page
  - [ ] 7.1 Embed MaintenanceRecordList in Mold detail page
    - Locate the mold detail page/tab component (likely in `src/features/equipment-tooling/components/` or similar)
    - Add a new section or tab for "维保记录" (Maintenance Records)
    - Render `<MaintenanceRecordList assetType="MOLD" assetId={mold.id} assetSn={mold.sn} />` in the section
    - Ensure the component is positioned appropriately within the page layout
    - _Requirements: 8.1_

- [ ] 8. Checkpoint - Frontend Mold integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Frontend: Integration with Furnace Detail Page
  - [ ] 9.1 Embed MaintenanceRecordList in Furnace detail page
    - Locate the furnace detail page/tab component (likely in `src/features/equipment-tooling/components/` or similar)
    - Add a new section or tab for "维保记录" (Maintenance Records)
    - Render `<MaintenanceRecordList assetType="FURNACE" assetId={furnace.id} assetSn={furnace.sn} />` in the section
    - Ensure the component is positioned appropriately within the page layout
    - _Requirements: 8.2_

  - [ ]* 9.2 Write integration test for cache isolation
    - **Property 13: Cache Isolation by Asset Key** — create records for two different assets, mutate one, verify the other's cache is not invalidated
    - **Validates: Requirement 11.2**

- [ ] 10. Final checkpoint - Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- The backend follows existing patterns: delta-based PATCH, audit logging via `services.AuditService`, GORM soft-delete
- The frontend follows existing patterns: `apiFetch` + `ensureResponse`, Zod schema validation, TanStack Query hooks, adapter pattern
- The `MaintenanceRecordList` component is shared between Mold and Furnace detail pages via props

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3", "3.4"] },
    { "id": 4, "tasks": ["3.5", "3.6"] },
    { "id": 5, "tasks": ["4.1"] },
    { "id": 6, "tasks": ["4.2", "6.1"] },
    { "id": 7, "tasks": ["6.2"] }
  ]
}
```
