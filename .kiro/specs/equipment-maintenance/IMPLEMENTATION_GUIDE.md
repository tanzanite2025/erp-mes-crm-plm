# 设备维保记录功能 - 实施指南

## 已完成任务 ✅

- ✅ 1.1 数据库迁移 (`server/migrations/20260520_create_maintenance_records.sql`)
- ✅ 2.1 GORM 模型 (`server/models/maintenance_record.go`)
- ✅ 4.1 Zod Schema (`src/features/equipment-tooling/data/schema.ts`)
- ✅ 4.2 API DTO Contract (`src/features/equipment-tooling/contracts/maintenance-record-api-dto.ts`)
- ✅ 4.3 API Adapter (`src/features/equipment-tooling/adapters/maintenance-record-api-adapter.ts`)
- ✅ 5.1 Service 层 (`src/features/equipment-tooling/services/maintenance-record-service.ts`)

## 待实施任务清单

### Wave 2 (当前)
- [ ] 2.2 后端 CRUD handlers

### Wave 3
- [ ] 2.3 注册路由和权限
- [ ] 5.2 创建 useMaintenanceRecords hook

### Wave 4
- [ ] 6.1 实现 MaintenanceRecordList 组件

### Wave 5
- [ ] 7.1 嵌入模具详情页
- [ ] 9.1 嵌入炉台详情页

### Wave 6+
- [ ] 11.1 验证全局查询支持
- [ ] 11.2 验证统计端点
- [ ] 12.1 创建全局 hook
- [ ] 13.1-13.4 独立维保中心页面

---

## 详细实施步骤


### 任务 2.2: 实现后端 CRUD Handlers

**文件**: `server/handlers/handler_maintenance_record.go`

**参考现有 handler**: `server/handlers/handler_mold.go` 或类似文件

#### 实现要点

1. **GetMaintenanceRecordsHandler** (列表查询)
   ```go
   // 支持可选的 assetType/assetId 查询参数
   // 支持分页: limit, offset
   // 支持筛选: status, priority, type, dateFrom, dateTo
   // 支持搜索: search (匹配 title 或 asset_sn)
   // 排序: created_at DESC
   // 排除软删除记录: WHERE deleted_at IS NULL
   ```

2. **GetMaintenanceRecordStatsHandler** (统计)
   ```go
   // 返回按状态分组的计数
   // SELECT status, COUNT(*) FROM maintenance_records 
   // WHERE deleted_at IS NULL GROUP BY status
   // 返回格式: { open, inProgress, completed, cancelled, total }
   ```

3. **GetMaintenanceRecordHandler** (单条查询)
   ```go
   // 根据 ID 查询
   // 如果不存在或已软删除，返回 404
   ```

4. **CreateMaintenanceRecordHandler** (创建)
   ```go
   // 验证:
   // - title 必填
   // - assetType ∈ {MOLD, FURNACE}
   // - type ∈ {PREVENTIVE, CORRECTIVE, INSPECTION}
   // - priority ∈ {LOW, MEDIUM, HIGH, CRITICAL}
   // - cost >= 0
   // - startedAt <= completedAt (如果都提供)
   // 
   // 设置:
   // - status = 'OPEN'
   // - version = 1
   // - createdBy = 从 auth context 获取
   //
   // 审计日志:
   // services.AuditService.LogCreate("MaintenanceRecord", id, delta)
   ```

