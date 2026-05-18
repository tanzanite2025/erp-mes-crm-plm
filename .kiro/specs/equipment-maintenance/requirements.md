# Requirements Document

## Introduction

**Feature Name**: 设备维保记录 (Equipment Maintenance Records)  
**Version**: v1.0  
**Priority**: P1 - Important  
**Type**: Full-Stack Feature (Backend + Frontend)

### Problem Statement

模具(Mold)和炉台(Furnace)是制造 ERP 中的核心设备资产，但目前缺乏统一的维保记录管理能力。维保信息分散在纸质记录或非结构化备注中，无法追踪设备维护历史、评估维护成本、或为预防性维护提供数据支撑。

本功能通过多态 `asset_type` + `asset_id` 设计，提供统一的维保记录 CRUD 能力，支持未来扩展到更多设备类型。范围限定为 Step 1-3（不含责任分配、不含计划排程）。

## Glossary

- **System**: 设备维保记录系统（后端 API + 前端 UI 的整体）
- **Backend**: Go/Gin 后端服务
- **Frontend**: React 前端应用
- **MaintenanceRecord**: 维保记录实体
- **Asset**: 被维保的设备（模具或炉台）
- **AssetType**: 设备类型枚举，当前支持 'MOLD'（模具）和 'FURNACE'（炉台）
- **DeltaSet**: 差量更新数据集，用于 PATCH 操作
- **Version**: 乐观锁版本号，用于并发冲突检测
- **AuditLog**: 审计日志，记录所有创建/更新/删除操作
- **MaintenanceRecordList**: 共享前端组件，嵌入模具和炉台详情页

## Requirements

### Requirement 1: 创建维保记录

**User Story:** As a 设备管理员, I want to 为模具或炉台创建维保记录, so that 维护历史可被追踪和查询。

#### Acceptance Criteria

1. WHEN a user submits a valid maintenance record form, THE Backend SHALL create a new MaintenanceRecord with status 'OPEN' and version 1
2. WHEN a MaintenanceRecord is created, THE Backend SHALL persist the assetType, assetId, assetSn, type, title, description, priority, cost, and remarks fields
3. WHEN a MaintenanceRecord is created, THE Backend SHALL set createdBy to the current authenticated user
4. WHEN a MaintenanceRecord is created successfully, THE Backend SHALL return the complete MaintenanceRecord including the generated id and timestamps
5. WHEN a MaintenanceRecord is created, THE AuditLog SHALL record the creation operation with the full delta of created fields

---

### Requirement 2: 查询维保记录

**User Story:** As a 设备管理员, I want to 按设备查询其所有维保记录, so that 我可以查看特定设备的完整维护历史。

#### Acceptance Criteria

1. WHEN a user requests maintenance records for a specific asset, THE Backend SHALL return all non-deleted MaintenanceRecords matching the given assetType and assetId
2. WHEN returning maintenance records, THE Backend SHALL order results by createdAt descending
3. WHEN a user requests a single MaintenanceRecord by id, THE Backend SHALL return the complete record details
4. IF a requested MaintenanceRecord does not exist or has been soft-deleted, THEN THE Backend SHALL return HTTP 404

---

### Requirement 3: 更新维保记录 (Delta-based PATCH)

**User Story:** As a 设备管理员, I want to 更新维保记录的状态、备注等字段, so that 维保进度可被实时跟踪。

#### Acceptance Criteria

1. WHEN a user submits a PATCH request with a DeltaSet and matching version, THE Backend SHALL apply the delta changes and increment the version by 1
2. WHEN a PATCH request contains a version that does not match the current record version, THE Backend SHALL return HTTP 409 Conflict
3. WHEN a MaintenanceRecord is updated, THE Backend SHALL set updatedBy to the current authenticated user and update the updatedAt timestamp
4. WHEN a MaintenanceRecord is updated, THE AuditLog SHALL record the update operation with the submitted delta
5. WHEN a PATCH changes status to 'COMPLETED', THE Backend SHALL set completedAt to the current timestamp if not explicitly provided

---

### Requirement 4: 删除维保记录

**User Story:** As a 设备管理员, I want to 删除错误创建的维保记录, so that 维护历史保持准确。

#### Acceptance Criteria

1. WHEN a user requests deletion of a MaintenanceRecord, THE Backend SHALL perform a soft-delete by setting the deleted_at timestamp
2. WHEN a MaintenanceRecord is soft-deleted, THE Backend SHALL exclude it from all subsequent list queries
3. WHEN a MaintenanceRecord is deleted, THE AuditLog SHALL record the deletion operation

---

### Requirement 5: 数据验证

**User Story:** As a 系统, I want to 验证所有维保记录输入数据, so that 数据完整性和一致性得到保障。

#### Acceptance Criteria

1. WHEN a create or update request is missing the title field, THE Backend SHALL return HTTP 400 with a descriptive error message
2. WHEN a create request contains an assetType value not in ['MOLD', 'FURNACE'], THE Backend SHALL return HTTP 400
3. WHEN a create request contains a type value not in ['PREVENTIVE', 'CORRECTIVE', 'INSPECTION'], THE Backend SHALL return HTTP 400
4. WHEN a create or update request contains a priority value not in ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], THE Backend SHALL return HTTP 400
5. WHEN a create or update request contains a status value not in ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], THE Backend SHALL return HTTP 400
6. WHEN a create or update request contains a negative cost value, THE Backend SHALL return HTTP 400
7. WHEN a MaintenanceRecord has both startedAt and completedAt values, THE Backend SHALL validate that startedAt is not later than completedAt

---

### Requirement 6: 状态流转约束

**User Story:** As a 系统, I want to 限制维保记录的状态变更路径, so that 业务流程的合规性得到保障。

#### Acceptance Criteria

1. WHEN a user attempts to change status from 'COMPLETED' to 'OPEN', THE Backend SHALL return HTTP 422 with message indicating invalid status transition
2. WHEN a user attempts to change status from 'CANCELLED' to 'OPEN', THE Backend SHALL return HTTP 422 with message indicating invalid status transition
3. WHEN a user attempts to change status from 'CANCELLED' to 'IN_PROGRESS', THE Backend SHALL return HTTP 422 with message indicating invalid status transition

---

### Requirement 7: 权限控制

**User Story:** As a 系统管理员, I want to 控制谁可以管理维保记录, so that 只有授权人员可以创建、修改和删除记录。

#### Acceptance Criteria

1. THE Backend SHALL require the 'equipmentAccess' middleware for all maintenance record endpoints
2. WHEN a user without 'ActionEquipmentMaintenanceManage' permission attempts a write operation (POST, PATCH, DELETE), THE Backend SHALL return HTTP 403
3. WHEN a user with 'equipmentAccess' permission attempts a read operation (GET), THE Backend SHALL allow access

---

### Requirement 8: 前端维保记录列表展示

**User Story:** As a 设备管理员, I want to 在设备详情页中查看该设备的维保记录列表, so that 我可以快速了解设备维护状况。

#### Acceptance Criteria

1. WHEN a user navigates to a mold detail page, THE Frontend SHALL display the MaintenanceRecordList component with assetType='MOLD'
2. WHEN a user navigates to a furnace detail page, THE Frontend SHALL display the MaintenanceRecordList component with assetType='FURNACE'
3. WHEN the MaintenanceRecordList loads, THE Frontend SHALL fetch and display all maintenance records for the given asset
4. WHEN displaying maintenance records, THE Frontend SHALL show status with color-coded badges, priority, type, title, and creation date
5. WHILE maintenance records are loading, THE Frontend SHALL display a loading indicator

---

### Requirement 9: 前端创建维保记录

**User Story:** As a 设备管理员, I want to 通过对话框表单创建新的维保记录, so that 我可以快速记录维护活动。

#### Acceptance Criteria

1. WHEN a user clicks the create button in MaintenanceRecordList, THE Frontend SHALL open a dialog with a form for entering maintenance record details
2. WHEN the create form is submitted with valid data, THE Frontend SHALL call the create API and refresh the list upon success
3. WHEN the create API returns an error, THE Frontend SHALL display the error message to the user without closing the dialog
4. THE Frontend SHALL pre-fill assetType, assetId, and assetSn from the parent component props

---

### Requirement 10: 前端编辑与状态流转

**User Story:** As a 设备管理员, I want to 在列表中直接编辑维保记录的状态和备注, so that 我可以高效地更新维护进度。

#### Acceptance Criteria

1. WHEN a user edits a field in the maintenance record list, THE Frontend SHALL construct a DeltaSet and call the PATCH API with the current version
2. WHEN the PATCH API returns HTTP 409 (version conflict), THE Frontend SHALL display a message "记录已被他人修改，请刷新后重试" and refresh the list
3. WHEN a status change is made, THE Frontend SHALL only offer valid next-status options based on the current status
4. WHEN a user clicks delete on a record, THE Frontend SHALL show a confirmation dialog before calling the delete API

---

### Requirement 11: 前端数据缓存与刷新

**User Story:** As a 设备管理员, I want to 在操作后自动看到最新数据, so that 我不需要手动刷新页面。

#### Acceptance Criteria

1. WHEN a create, update, or delete operation succeeds, THE Frontend SHALL invalidate the query cache for the current asset's maintenance records
2. THE Frontend SHALL cache maintenance records by the composite key of (assetType, assetId) to prevent cross-asset cache pollution
3. WHILE the assetId prop is empty or undefined, THE Frontend SHALL not trigger any API requests

---

### Requirement 12: 前端 Zod Schema 验证

**User Story:** As a 开发者, I want to 在前端对 API 响应进行 schema 验证, so that 类型安全和数据一致性在运行时得到保障。

#### Acceptance Criteria

1. THE Frontend SHALL validate all API responses against the maintenanceRecordSchema using Zod
2. WHEN an API response fails schema validation, THE Frontend SHALL log the validation error and handle gracefully
3. THE Frontend SHALL use the adapter pattern (toMaintenanceRecordContract) to transform API DTOs to domain objects

