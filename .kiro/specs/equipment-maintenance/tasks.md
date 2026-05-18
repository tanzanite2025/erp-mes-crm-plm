# Implementation Plan: 设备维保记录 (Equipment Maintenance Records)

## Overview

实现统一维保记录系统的全栈功能。后端新增 `maintenance_records` 表及 CRUD API（Go/Gin/GORM），前端新增共享 `<MaintenanceRecordList>` 组件（React/TypeScript/TanStack Query/Zod/shadcn），分别嵌入模具详情页和炉台详情页。

## Tasks

- [ ] 1. Backend: Model, Migration, and Route Registration
  - [ ] 1.1 Create MaintenanceRecord model and auto-migration
    - Create `server/models/maintenance_record.go` with the `MaintenanceRecord` struct
    - Include all fields: ID, AssetType, AssetID, AssetSN, Type, Status, Title, Description, Priority, StartedAt, CompletedAt, Cost, Remarks, CreatedBy, UpdatedBy, Version, CreatedAt, UpdatedAt, DeletedAt
    - Add GORM tags for column types, indexes (`idx_mr_asset` on asset_type + asset_id), and defaults
    - Register the model in the auto-migration list
    - _Requirements: 1.1, 1.2, 2.1, 4.1_

  - [ ] 1.2 Create MaintenanceRecord handlers with CRUD operations
    - Create `server/handlers/handler_maintenance_record.go`
    - Implement `GetMaintenanceRecordsHandler` — list by assetType + assetId, ordered by createdAt DESC, exclude soft-deleted
    - Implement `GetMaintenanceRecordHandler` — get single record by ID, return 404 if not found or soft-deleted
    - Implement `CreateMaintenanceRecordHandler` — validate required fields (title, assetType enum, type enum, priority enum, non-negative cost), set status='OPEN', version=1, createdBy from auth context, write audit log
    - Implement `PatchMaintenanceRecordHandler` — accept DeltaPayload, check version match (409 on mismatch), validate status transitions (422 on invalid), validate enums and cost, increment version, set updatedBy, auto-set completedAt on COMPLETED status, write audit log
    - Implement `DeleteMaintenanceRecordHandler` — soft-delete, write audit log
    - Follow existing `buildXxxUpdates` delta pattern from other handlers
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 6.1, 6.2, 6.3_

  - [ ] 1.3 Register maintenance record routes in routes_equipment.go
    - Add `ActionEquipmentMaintenanceManage` permission constant in `authz` package
    - Register routes under `equipmentGroup` with path `/maintenance-records`
    - GET (list and detail) requires `equipmentAccess` only
    - POST, PATCH, DELETE require `maintenanceManage` permission middleware
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 1.4 Write property tests for backend CRUD logic
    - **Property 1: Create-Read Round Trip** — create with valid input, read back, verify all fields preserved, status='OPEN', version=1
    - **Property 4: Delta PATCH Applies Changes and Increments Version** — patch with correct version, verify fields updated and version=N+1
    - **Property 5: Optimistic Lock Rejects Version Mismatch** — patch with wrong version, verify 409 and record unchanged
    - **Property 6: Invalid Enum Values Rejected** — invalid assetType/type/priority/status returns 400
    - **Property 7: Negative Cost Rejected** — negative cost returns 400
    - **Property 9: Invalid Status Transitions Rejected** — COMPLETED/CANCELLED to OPEN/IN_PROGRESS returns 422
    - **Validates: Requirements 1.1, 1.2, 1.4, 3.1, 3.2, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3**

- [ ] 2. Checkpoint - Backend verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Frontend: Service, Hook, Adapter, Contract, and Schema
  - [ ] 3.1 Create Zod schema and types for MaintenanceRecord
    - Add maintenance record schemas to `src/features/equipment-tooling/data/schema.ts` (or a new dedicated file)
    - Define `maintenanceRecordTypeSchema`, `maintenanceRecordStatusSchema`, `maintenanceRecordPrioritySchema`
    - Define `maintenanceRecordSchema` with all fields and validation rules (title min 1, cost min 0)
    - Export `MaintenanceRecord`, `MaintenanceRecordType`, `MaintenanceRecordStatus`, `MaintenanceRecordPriority` types
    - _Requirements: 12.1, 12.2_

  - [ ] 3.2 Create MaintenanceRecord API DTO contract
    - Create `src/features/equipment-tooling/contracts/maintenance-record-api-dto.ts`
    - Define `MaintenanceRecordApiDTO` interface with all API response fields
    - Define `SaveMaintenanceRecordApiDTO` interface for create requests
    - Define type aliases for enums: `MaintenanceRecordTypeApiDTO`, `MaintenanceRecordStatusApiDTO`, `MaintenanceRecordPriorityApiDTO`
    - _Requirements: 12.3_

  - [ ] 3.3 Create MaintenanceRecord API adapter
    - Create `src/features/equipment-tooling/adapters/maintenance-record-api-adapter.ts`
    - Implement `toMaintenanceRecordContract(dto)` — transform single DTO to domain object with Zod parse
    - Implement `toMaintenanceRecordContracts(dtos)` — transform array
    - Implement `toSaveMaintenanceRecordApiDTO(formData)` — transform form data to save DTO
    - _Requirements: 12.1, 12.3_

  - [ ] 3.4 Create MaintenanceRecordService
    - Create `src/features/equipment-tooling/services/maintenance-record-service.ts`
    - Implement `getByAsset(assetType, assetId)` — GET with query params, use `ensureArrayResponse`
    - Implement `create(saveDTO)` — POST, use `ensureObjectResponse`
    - Implement `patch(id, delta, version)` — PATCH with DeltaPayload, use `ensureObjectResponse`
    - Implement `delete(id)` — DELETE
    - Follow existing `apiFetch` + `ensureResponse` pattern
    - _Requirements: 8.3, 9.2, 10.1, 10.4_

  - [ ] 3.5 Create useMaintenanceRecords hook
    - Create `src/features/equipment-tooling/hooks/use-maintenance-records.ts`
    - Define `MAINTENANCE_RECORDS_QUERY_KEY(assetType, assetId)` for cache isolation
    - Implement `useQuery` with `enabled: !!assetId` guard
    - Implement `createMutation`, `patchMutation`, `deleteMutation` with `invalidateQueries` on success
    - Return `{ records, isLoading, create, patch, remove, reload }`
    - _Requirements: 11.1, 11.2, 11.3_

  - [ ]* 3.6 Write property test for adapter transformation
    - **Property 14: API DTO to Domain Object Transformation** — any valid DTO through adapter produces valid Zod-parsed MaintenanceRecord
    - **Validates: Requirements 12.1, 12.3**

- [ ] 4. Frontend: MaintenanceRecordList shared component (Mold integration)
  - [ ] 4.1 Create MaintenanceRecordList component
    - Create `src/features/equipment-tooling/components/maintenance-record-list.tsx`
    - Accept props: `{ assetType, assetId, assetSn }`
    - Display records in a compact list with color-coded status badges, priority, type, title, and creation date
    - Show loading indicator while fetching
    - Include "新建" (create) button that opens a dialog form
    - Include inline status editing with valid-next-status dropdown (enforce transition rules)
    - Include delete button with confirmation dialog
    - Handle 409 conflict: show "记录已被他人修改，请刷新后重试" toast and refresh
    - Pre-fill assetType, assetId, assetSn in create form
    - _Requirements: 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4_

  - [ ] 4.2 Embed MaintenanceRecordList in Mold detail page
    - Locate the mold detail page/tab component
    - Add `<MaintenanceRecordList assetType="MOLD" assetId={mold.id} assetSn={mold.sn} />` section
    - _Requirements: 8.1_

- [ ] 5. Checkpoint - Frontend Mold integration verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Frontend: Embed in Furnace detail page
  - [ ] 6.1 Embed MaintenanceRecordList in Furnace detail page
    - Locate the furnace detail page/tab component
    - Add `<MaintenanceRecordList assetType="FURNACE" assetId={furnace.id} assetSn={furnace.sn} />` section
    - _Requirements: 8.2_

  - [ ]* 6.2 Write unit tests for MaintenanceRecordList component
    - Test rendering with mock data (status badges, priority, type, title, date)
    - Test create dialog opens and submits
    - Test status dropdown only shows valid transitions
    - Test delete confirmation flow
    - Test loading state display
    - **Validates: Requirements 8.3, 8.4, 8.5, 9.1, 10.3, 10.4**

- [ ] 7. Final checkpoint - Full integration verification
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
