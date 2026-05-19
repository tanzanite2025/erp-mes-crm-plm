# 设备维保记录功能 - 深度分析报告

生成时间: 2026-05-19  
分析范围: 后端 API、前端组件、数据流、安全性、性能

---

## 🔍 一、潜在漏洞分析

### 1.1 安全漏洞

#### ⚠️ **高危：SQL 注入风险**
**位置**: `handler_maintenance_record.go:67-70`
```go
if search != "" {
    searchPattern := "%" + search + "%"
    query = query.Where("title LIKE ? OR asset_sn LIKE ?", searchPattern, searchPattern)
}
```
**问题**: 虽然使用了参数化查询，但 `search` 参数未进行输入验证和清理。恶意用户可能输入特殊字符（如 `%`、`_`）导致意外的搜索结果。

**建议修复**:
```go
if search != "" {
    // 转义 LIKE 特殊字符
    search = strings.ReplaceAll(search, "%", "\\%")
    search = strings.ReplaceAll(search, "_", "\\_")
    searchPattern := "%" + search + "%"
    query = query.Where("title LIKE ? ESCAPE '\\' OR asset_sn LIKE ? ESCAPE '\\'", searchPattern, searchPattern)
}
```

#### ⚠️ **中危：枚举值验证不完整**
**位置**: `handler_maintenance_record.go:49-56`
```go
// 按状态筛选
if status != "" {
    query = query.Where("status = ?", status)
}
```
**问题**: 筛选参数（status、priority、type）未验证是否为有效枚举值，可能导致无效查询或信息泄露。

**建议修复**:
```go
validStatuses := map[string]bool{"OPEN": true, "IN_PROGRESS": true, "COMPLETED": true, "CANCELLED": true}
if status != "" {
    if !validStatuses[status] {
        c.JSON(http.StatusBadRequest, gin.H{"error": "[VALIDATION] 无效的状态值"})
        return
    }
    query = query.Where("status = ?", status)
}
```

#### ⚠️ **中危：缺少资产所有权验证**
**位置**: `handler_maintenance_record.go:CreateMaintenanceRecordHandler`
**问题**: 创建维保记录时未验证用户是否有权限访问指定的 `assetId`。恶意用户可能为不属于自己的设备创建维保记录。

**建议修复**:
```go
// 验证资产是否存在且用户有权限访问
if input.AssetType == "MOLD" {
    var mold models.Mold
    if err := db.DB.First(&mold, "id = ?", input.AssetID).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "[VALIDATION] 指定的模具不存在"})
        return
    }
} else if input.AssetType == "FURNACE" {
    var furnace models.Furnace
    if err := db.DB.First(&furnace, "id = ?", input.AssetID).Error; err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "[VALIDATION] 指定的炉台不存在"})
        return
    }
}
```

### 1.2 数据完整性漏洞

#### ⚠️ **中危：软删除记录仍可被查询**
**位置**: `handler_maintenance_record.go:GetMaintenanceRecordsHandler`
**问题**: 查询未显式排除软删除的记录（虽然 GORM 默认会排除，但依赖隐式行为不安全）。

**建议修复**:
```go
query := db.DB.Model(&models.MaintenanceRecord{}).Where("deleted_at IS NULL")
```

#### ⚠️ **低危：时间验证不完整**
**位置**: `handler_maintenance_record.go:buildMaintenanceRecordUpdates`
**问题**: 只验证了 `startedAt` 和 `completedAt` 的顺序，但未验证它们是否在合理的时间范围内（如不能是未来时间）。

**建议修复**:
```go
if startedAt != nil && startedAt.After(time.Now()) {
    return nil, fmt.Errorf("[VALIDATION] 开始时间不能是未来时间")
}
if completedAt != nil && completedAt.After(time.Now()) {
    return nil, fmt.Errorf("[VALIDATION] 完成时间不能是未来时间")
}
```

---

## 🐛 二、BUG 分析

### 2.1 后端 BUG

#### 🐛 **严重：统计数据未排除软删除记录**
**位置**: `handler_maintenance_record.go:GetMaintenanceRecordStatsHandler`
```go
var statusCounts []StatusCount
if err := db.DB.Model(&models.MaintenanceRecord{}).
    Select("status, COUNT(*) as count").
    Group("status").
    Find(&statusCounts).Error; err != nil {
```
**问题**: 统计查询未排除 `deleted_at IS NOT NULL` 的记录，导致统计数据包含已删除的记录。

**修复**:
```go
if err := db.DB.Model(&models.MaintenanceRecord{}).
    Where("deleted_at IS NULL").
    Select("status, COUNT(*) as count").
    Group("status").
    Find(&statusCounts).Error; err != nil {
```

#### 🐛 **中等：分页参数未返回总数**
**位置**: `handler_maintenance_record.go:GetMaintenanceRecordsHandler`
**问题**: 分页查询只返回当前页数据，未返回总记录数，前端无法正确显示总页数。

**修复**:
```go
var total int64
if err := query.Count(&total).Error; err != nil {
    c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取记录总数失败: " + err.Error()})
    return
}

var records []models.MaintenanceRecord
if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&records).Error; err != nil {
    c.JSON(http.StatusInternalServerError, gin.H{"error": "[SERVER] 获取维保记录失败: " + err.Error()})
    return
}

c.JSON(http.StatusOK, gin.H{
    "records": records,
    "total": total,
    "limit": limit,
    "offset": offset,
})
```

#### 🐛 **低危：错误处理不一致**
**位置**: `handler_maintenance_record.go:buildMaintenanceRecordUpdates`
```go
if strings.TrimSpace(value) == "" {
    return nil, gin.Error{Err: err, Type: gin.ErrorTypeBind, Meta: "标题不能为空"}
}
```
**问题**: 使用 `gin.Error` 但 `Err` 字段可能为 `nil`，导致潜在的空指针错误。

**修复**:
```go
if strings.TrimSpace(value) == "" {
    return nil, fmt.Errorf("[VALIDATION] 标题不能为空")
}
```

### 2.2 前端 BUG

#### 🐛 **严重：MaintenanceOverview 筛选参数错误**
**位置**: `maintenance-overview.tsx:20-23`
```typescript
const { records: highPriorityRecords, isLoading: isLoadingHighPriority } = useMaintenanceRecordsGlobal({
  filters: { status: 'OPEN', priority: 'HIGH,CRITICAL' },
  pagination: { limit: 10 },
})
```
**问题**: `priority: 'HIGH,CRITICAL'` 是逗号分隔的字符串，但后端期望单个值。这会导致查询失败或返回空结果。

**修复方案1（推荐）**: 后端支持多值筛选
```go
// 后端修改
if priority != "" {
    priorities := strings.Split(priority, ",")
    query = query.Where("priority IN ?", priorities)
}
```

**修复方案2**: 前端发起两次查询并合并
```typescript
const { records: highRecords } = useMaintenanceRecordsGlobal({
  filters: { status: 'OPEN', priority: 'HIGH' },
  pagination: { limit: 5 },
})
const { records: criticalRecords } = useMaintenanceRecordsGlobal({
  filters: { status: 'OPEN', priority: 'CRITICAL' },
  pagination: { limit: 5 },
})
const highPriorityRecords = [...criticalRecords, ...highRecords].slice(0, 10)
```

#### 🐛 **中等：分页逻辑不完整**
**位置**: `maintenance-records-page.tsx:285-295`
```typescript
<Button
  variant='outline'
  size='sm'
  className='h-8 w-8 p-0 rounded-lg'
  onClick={() => setCurrentPage(p => p + 1)}
  disabled={records.length < pageSize}
>
```
**问题**: 使用 `records.length < pageSize` 判断是否有下一页不准确。如果恰好最后一页有 20 条记录，会错误地显示"下一页"按钮。

**修复**: 需要后端返回总数
```typescript
const { records, total, isLoading } = useMaintenanceRecordsGlobal(...)
const totalPages = Math.ceil(total / pageSize)

<Button
  onClick={() => setCurrentPage(p => p + 1)}
  disabled={currentPage >= totalPages}
>
```

#### 🐛 **低危：错误处理缺失**
**位置**: `maintenance-record-list.tsx:handleCreate`
**问题**: 创建成功后直接关闭对话框，但如果后续的 toast 显示失败，用户可能不知道操作结果。

**修复**: 在 try-catch 中处理
```typescript
const handleCreate = async () => {
  if (!formData.title.trim()) {
    toast({
      title: '验证失败',
      description: '标题不能为空',
      variant: 'destructive',
    })
    return
  }

  try {
    await create({...})
    setIsCreateDialogOpen(false)
    // 重置表单
    toast({ title: '创建成功' })
  } catch (error: any) {
    toast({
      title: '创建失败',
      description: error?.message || '创建维保记录时发生错误',
      variant: 'destructive',
    })
    // 保持对话框打开
  }
}
```

---

## 🔄 三、冗余分析

### 3.1 代码冗余

#### 📦 **重复的徽章渲染逻辑**
**位置**: 
- `maintenance-record-list.tsx:getStatusBadge`
- `maintenance-overview.tsx:getStatusBadge`
- `maintenance-records-page.tsx:getStatusBadge`

**问题**: 三个组件中有完全相同的徽章渲染函数（status、priority、type），违反 DRY 原则。

**建议**: 提取到共享工具文件
```typescript
// src/features/equipment-tooling/utils/maintenance-badges.tsx
export function getStatusBadge(status: string) { ... }
export function getPriorityBadge(priority: string) { ... }
export function getTypeBadge(type: string) { ... }
export function formatMaintenanceDate(dateString: string) { ... }
```

#### 📦 **重复的日期格式化**
**位置**: 所有三个组件都有 `formatDate` 函数
**建议**: 统一使用项目级别的日期格式化工具或创建共享函数。

#### 📦 **重复的枚举验证**
**位置**: `handler_maintenance_record.go`
- `CreateMaintenanceRecordHandler` (lines 177-195)
- `buildMaintenanceRecordUpdates` (lines 485-520)

**建议**: 提取验证函数
```go
func validateAssetType(assetType string) error {
    if assetType != "MOLD" && assetType != "FURNACE" {
        return fmt.Errorf("[VALIDATION] assetType 必须是 MOLD 或 FURNACE")
    }
    return nil
}

func validateMaintenanceType(t string) error { ... }
func validatePriority(p string) error { ... }
func validateStatus(s string) error { ... }
```

### 3.2 数据冗余

#### 📊 **AssetSN 字段冗余**
**位置**: `models.MaintenanceRecord.AssetSN`
**问题**: `AssetSN` 存储在维保记录中，但这是资产表的数据。如果资产的序列号更新，维保记录中的序列号不会同步更新。

**建议**: 
- **方案1（推荐）**: 保留冗余字段，但在创建时从资产表读取，确保一致性
- **方案2**: 移除 `AssetSN` 字段，查询时通过 JOIN 获取
- **方案3**: 添加触发器或应用层逻辑，在资产序列号更新时同步更新维保记录

**当前实现的问题**: 前端传入 `assetSn`，但未验证其正确性。

### 3.3 查询冗余

#### 🔍 **MaintenanceOverview 发起 3 次独立查询**
**位置**: `maintenance-overview.tsx:14-28`
```typescript
const { stats, isLoadingStats } = useMaintenanceRecordsGlobal()
const { records: highPriorityRecords, isLoading: isLoadingHighPriority } = useMaintenanceRecordsGlobal(...)
const { records: recentRecords, isLoading: isLoadingRecent } = useMaintenanceRecordsGlobal(...)
```
**问题**: 三次独立的 HTTP 请求，增加服务器负载和页面加载时间。

**建议**: 创建专用的 Overview API
```go
// GET /maintenance-records/overview
func GetMaintenanceOverviewHandler(c *gin.Context) {
    stats := getStats()
    highPriority := getHighPriorityRecords(10)
    recent := getRecentRecords(10)
    
    c.JSON(http.StatusOK, gin.H{
        "stats": stats,
        "highPriority": highPriority,
        "recent": recent,
    })
}
```

---

## ⚡ 四、性能问题

### 4.1 数据库性能

#### 🐌 **缺少复合索引**
**位置**: `models/maintenance_record.go`
**问题**: 
- 只有 `idx_mr_asset (asset_type, asset_id)` 索引
- 缺少常用查询组合的索引

**建议添加**:
```sql
-- 状态 + 创建时间（用于按状态筛选并排序）
CREATE INDEX idx_mr_status_created ON maintenance_records(status, created_at DESC) WHERE deleted_at IS NULL;

-- 优先级 + 状态（用于高优先级待处理查询）
CREATE INDEX idx_mr_priority_status ON maintenance_records(priority, status) WHERE deleted_at IS NULL;

-- 全文搜索索引（PostgreSQL）
CREATE INDEX idx_mr_search ON maintenance_records USING gin(to_tsvector('simple', title || ' ' || asset_sn)) WHERE deleted_at IS NULL;
```

#### 🐌 **N+1 查询风险**
**位置**: 前端组件点击行跳转到资产详情页
**问题**: 如果未来需要在列表中显示资产详细信息（如资产名称），会产生 N+1 查询。

**预防措施**: 考虑在后端添加 JOIN 查询选项
```go
// 可选参数 ?include=asset
if c.Query("include") == "asset" {
    query = query.Preload("Asset") // 需要在模型中定义关联
}
```

### 4.2 前端性能

#### 🐌 **缺少虚拟滚动**
**位置**: `maintenance-records-page.tsx`
**问题**: 如果单页显示大量记录（如 100 条），DOM 节点过多会影响渲染性能。

**建议**: 使用虚拟滚动库（如 `react-window` 或 `@tanstack/react-virtual`）

#### 🐌 **缺少防抖**
**位置**: `maintenance-records-page.tsx:search input`
```typescript
<Input
  value={search}
  onChange={(e) => {
    setSearch(e.target.value)
    setCurrentPage(1)
  }}
/>
```
**问题**: 每次输入都会触发查询，频繁的 API 请求。

**修复**:
```typescript
import { useDebouncedValue } from '@/hooks/use-debounced-value'

const [searchInput, setSearchInput] = useState('')
const debouncedSearch = useDebouncedValue(searchInput, 500)

useEffect(() => {
  setSearch(debouncedSearch)
  setCurrentPage(1)
}, [debouncedSearch])

<Input
  value={searchInput}
  onChange={(e) => setSearchInput(e.target.value)}
/>
```

#### 🐌 **缺少乐观更新**
**位置**: `maintenance-record-list.tsx:handleStatusChange`
**问题**: 状态更新需要等待服务器响应，用户体验不够流畅。

**建议**: 使用 TanStack Query 的乐观更新
```typescript
const patchMutation = useMutation({
  mutationFn: ...,
  onMutate: async (variables) => {
    // 取消正在进行的查询
    await queryClient.cancelQueries({ queryKey })
    
    // 保存当前数据快照
    const previousRecords = queryClient.getQueryData(queryKey)
    
    // 乐观更新
    queryClient.setQueryData(queryKey, (old) => 
      old.map(r => r.id === variables.id ? { ...r, status: variables.delta.status.n } : r)
    )
    
    return { previousRecords }
  },
  onError: (err, variables, context) => {
    // 回滚
    queryClient.setQueryData(queryKey, context.previousRecords)
  },
})
```

---

## 🔒 五、安全建议

### 5.1 认证与授权

#### ✅ **已实现**
- 路由级别的权限检查（`equipmentAccess`、`maintenanceManage`）
- 操作审计日志

#### ⚠️ **需要加强**
1. **行级权限控制**: 验证用户是否有权限访问特定资产的维保记录
2. **敏感字段保护**: `cost` 字段可能包含敏感信息，考虑添加额外的权限检查
3. **审计日志增强**: 记录查询操作（特别是批量导出）

### 5.2 输入验证

#### ⚠️ **需要加强**
1. **字符串长度限制**: 前端未限制输入长度，可能导致数据库错误
   ```typescript
   <Input maxLength={255} ... />
   <Textarea maxLength={5000} ... />
   ```

2. **数值范围验证**: `cost` 字段应有上限
   ```go
   if input.Cost < 0 || input.Cost > 999999999.99 {
       return error
   }
   ```

3. **XSS 防护**: 确保所有用户输入在显示时被正确转义（React 默认转义，但需注意 `dangerouslySetInnerHTML`）

### 5.3 数据保护

#### ⚠️ **建议**
1. **敏感数据加密**: 如果 `remarks` 可能包含敏感信息，考虑加密存储
2. **数据导出控制**: 如果未来添加导出功能，需要限制导出数量和频率
3. **软删除数据清理**: 定期清理软删除的记录（如 90 天后物理删除）

---

## 📊 六、数据一致性问题

### 6.1 并发控制

#### ✅ **已实现**
- 乐观锁（版本号）
- HTTP 409 冲突检测

#### ⚠️ **潜在问题**
1. **统计数据不一致**: `GetMaintenanceRecordStatsHandler` 未使用事务，在高并发下可能不准确
2. **缓存失效时机**: 前端缓存失效策略可能导致短暂的数据不一致

### 6.2 外键约束

#### ⚠️ **缺失**
**问题**: `AssetID` 字段没有外键约束，可能导致：
- 引用不存在的资产
- 资产删除后维保记录成为孤儿记录

**建议**: 添加外键约束（需要考虑跨表约束的复杂性）
```sql
-- 如果使用单一资产表
ALTER TABLE maintenance_records 
ADD CONSTRAINT fk_asset 
FOREIGN KEY (asset_id) REFERENCES assets(id) 
ON DELETE RESTRICT;

-- 如果使用多个资产表（当前情况），需要应用层验证
```

---

## 🎯 七、优先级修复建议

### 🔴 **高优先级（立即修复）**
1. ✅ 修复统计数据未排除软删除记录的 BUG
2. ✅ 修复 MaintenanceOverview 的 priority 筛选参数错误
3. ✅ 添加资产所有权验证
4. ✅ 修复 SQL 搜索的特殊字符转义

### 🟡 **中优先级（近期修复）**
5. ✅ 添加分页总数返回
6. ✅ 提取重复的徽章渲染逻辑
7. ✅ 添加搜索防抖
8. ✅ 添加枚举值验证
9. ✅ 添加复合索引优化查询性能

### 🟢 **低优先级（优化改进）**
10. ✅ 实现乐观更新提升用户体验
11. ✅ 创建 Overview 专用 API 减少请求次数
12. ✅ 添加虚拟滚动支持大数据量
13. ✅ 完善错误处理和用户提示
14. ✅ 添加数据导出功能（如果需要）

---

## 📝 八、总结

### 整体评价
设备维保记录功能的实现**整体架构合理**，遵循了项目的既有模式，核心功能完整。但存在一些**安全漏洞、性能问题和代码冗余**需要改进。

### 关键问题
1. **安全性**: 缺少输入验证和资产所有权检查
2. **数据完整性**: 统计查询包含软删除记录
3. **性能**: 缺少必要的索引和前端优化
4. **代码质量**: 存在大量重复代码

### 建议行动
1. 优先修复高危安全漏洞和严重 BUG
2. 逐步重构冗余代码，提取共享组件
3. 添加性能优化措施（索引、防抖、虚拟滚动）
4. 完善测试覆盖（特别是边界情况和并发场景）

### 风险评估
- **当前风险等级**: 🟡 中等
- **主要风险**: 数据完整性问题、潜在的安全漏洞
- **建议**: 在生产环境部署前完成高优先级修复
