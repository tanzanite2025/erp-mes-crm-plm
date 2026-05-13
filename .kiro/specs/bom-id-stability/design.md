# BOM Item ID 稳定性 - 设计文档

## 概述

**设计版本**: v1.0  
**创建日期**: 2026-05-13  
**设计原则**: 智能 Upsert + ID 稳定性 + 增量更新

---

## 核心设计：智能 Upsert 算法

### 算法概述

**输入**: 前端发送的 BOMItem 列表（可能包含 ID）  
**输出**: 数据库中更新后的 BOMItem 列表  
**保证**: ID 稳定性 + 数据一致性

### 详细流程图

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: 获取现有数据                                        │
│  existingItems = SELECT * FROM bom_items WHERE bom_id = ?   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 2: 构建映射表                                          │
│  existingMap = { item.ID: item }                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 3: 分类前端数据                                        │
│  for each item in frontendItems:                            │
│    if item.ID == "":                                        │
│      → toCreate (生成新 ID)                                 │
│    elif item.ID in existingMap:                             │
│      → toUpdate (保留 ID)                                   │
│    else:                                                    │
│      → toCreate (保留前端 ID)                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 4: 找出需要删除的                                      │
│  toDelete = existingItems - incomingItems                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Step 5: 执行数据库操作                                      │
│  DELETE → INSERT → UPDATE                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 后端实现

### 1. 新增 `upsertBOMItems` 函数

**文件**: `server/services/bom_service.go`

```go
// UpsertResult 记录 Upsert 操作的统计信息
type UpsertResult struct {
    Created int
    Updated int
    Deleted int
}

// upsertBOMItems 智能 Upsert BOM Items
func upsertBOMItems(tx *gorm.DB, bomID string, items []models.BOMItem) (*UpsertResult, error) {
    result := &UpsertResult{}
    
    // Step 1: 获取现有数据
    var existingItems []models.BOMItem
    if err := tx.Where("bom_id = ?", bomID).Find(&existingItems).Error; err != nil {
        return nil, fmt.Errorf("failed to fetch existing items: %w", err)
    }
    
    // Step 2: 构建映射表
    existingMap := make(map[string]*models.BOMItem)
    for i := range existingItems {
        existingMap[existingItems[i].ID] = &existingItems[i]
    }
    
    // Step 3: 分类前端数据
    var toCreate []models.BOMItem
    var toUpdate []models.BOMItem
    incomingIDs := make(map[string]bool)
    
    for idx := range items {
        item := &items[idx]
        item.BOMID = bomID
        item.SortOrder = idx  // 持久化物理顺序
        
        if strings.TrimSpace(item.ID) == "" {
            // 无 ID，新增（后端生成 ID）
            item.ID = uuid.NewString()
            toCreate = append(toCreate, *item)
        } else if existing, found := existingMap[item.ID]; found {
            // 有 ID 且存在，更新（保留 ID）
            item.CreatedAt = existing.CreatedAt  // 保留创建时间
            toUpdate = append(toUpdate, *item)
        } else {
            // 有 ID 但不存在，视为新增（保留前端 ID）
            // 这种情况通常是前端新增时预生成了 ID
            toCreate = append(toCreate, *item)
        }
        
        incomingIDs[item.ID] = true
    }
    
    // Step 4: 找出需要删除的
    var toDelete []models.BOMItem
    for _, existing := range existingItems {
        if !incomingIDs[existing.ID] {
            toDelete = append(toDelete, existing)
        }
    }
    
    // Step 5: 执行数据库操作
    
    // 5.1 删除
    if len(toDelete) > 0 {
        deleteIDs := make([]string, len(toDelete))
        for i, item := range toDelete {
            deleteIDs[i] = item.ID
        }
        if err := tx.Where("id IN ?", deleteIDs).Delete(&models.BOMItem{}).Error; err != nil {
            return nil, fmt.Errorf("failed to delete items: %w", err)
        }
        result.Deleted = len(toDelete)
    }
    
    // 5.2 新增
    if len(toCreate) > 0 {
        if err := tx.Create(&toCreate).Error; err != nil {
            return nil, fmt.Errorf("failed to create items: %w", err)
        }
        result.Created = len(toCreate)
    }
    
    // 5.3 更新
    for _, item := range toUpdate {
        if err := tx.Save(&item).Error; err != nil {
            return nil, fmt.Errorf("failed to update item %s: %w", item.ID, err)
        }
    }
    result.Updated = len(toUpdate)
    
    return result, nil
}
```

---

### 2. 修改 `SaveBOM` 函数

**修改点**: 将 `saveBOMItems` 替换为 `upsertBOMItems`

```go
func SaveBOM(ctx context.Context, input SaveBOMInput) (BOMDetailResponse, error) {
    // ... 前面的代码保持不变 ...
    
    err = db.DB.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
        // ... 验证逻辑保持不变 ...
        
        if modelInput.ID != "" {
            // 更新现有 BOM
            var existing models.BOM
            if err := tx.Preload("Items").Where("id = ?", modelInput.ID).First(&existing).Error; err != nil {
                return err
            }
            
            // ... 乐观锁检查等逻辑保持不变 ...
            
            // ✅ 修改点：使用 upsertBOMItems 替代物理删除
            upsertResult, err := upsertBOMItems(tx, existing.ID, modelInput.Items)
            if err != nil {
                return err
            }
            
            // 📊 可选：记录 Upsert 统计信息到日志
            log.Printf("BOM %s saved: created=%d, updated=%d, deleted=%d", 
                existing.ID, upsertResult.Created, upsertResult.Updated, upsertResult.Deleted)
            
            // ... 后续逻辑保持不变 ...
        } else {
            // 新增 BOM
            // ... 逻辑保持不变，使用 saveBOMItems（因为是全新的）...
        }
        
        return nil
    })
    
    // ... 后续代码保持不变 ...
}
```

---

### 3. 兼容性处理

**问题**: 旧版本前端不发送 ID，如何兼容？

**方案**: 自动检测并回退到旧逻辑

```go
func upsertBOMItems(tx *gorm.DB, bomID string, items []models.BOMItem) (*UpsertResult, error) {
    // 检测是否所有 item 都没有 ID
    allEmpty := true
    for _, item := range items {
        if strings.TrimSpace(item.ID) != "" {
            allEmpty = false
            break
        }
    }
    
    // 如果所有 ID 都为空，回退到旧逻辑（物理删除 + 重新插入）
    if allEmpty {
        log.Println("All items have empty IDs, falling back to legacy mode (delete + insert)")
        return upsertBOMItemsLegacy(tx, bomID, items)
    }
    
    // 否则，使用新的 Upsert 逻辑
    // ... 智能 Upsert 代码 ...
}

func upsertBOMItemsLegacy(tx *gorm.DB, bomID string, items []models.BOMItem) (*UpsertResult, error) {
    // 旧逻辑：物理删除 + 重新插入
    if err := tx.Where("bom_id = ?", bomID).Delete(&models.BOMItem{}).Error; err != nil {
        return nil, err
    }
    
    for idx := range items {
        items[idx].ID = uuid.NewString()
        items[idx].BOMID = bomID
        items[idx].SortOrder = idx
    }
    
    if err := tx.Create(&items).Error; err != nil {
        return nil, err
    }
    
    return &UpsertResult{Created: len(items)}, nil
}
```

---

## 前端实现

### 1. 修改保存逻辑

**文件**: `client/src/features/bom/hooks/use-bom-workspace.ts`

**当前代码**:
```typescript
const saveBOM = async () => {
  const payload = {
    id: bom.id,
    items: items.map(item => ({
      // ❌ 不发送 id
      materialId: item.materialId,
      unitUsage: item.unitUsage,
      // ... 其他字段
    }))
  };
  
  const response = await api.saveBOM(payload);
  setBOM(response.data);  // ❌ 全量替换
};
```

**改进后**:
```typescript
const saveBOM = async () => {
  const payload = {
    id: bom.id,
    version: bom.version,  // ✅ 乐观锁
    items: items.map(item => ({
      id: item.id,  // ✅ 发送 id
      materialId: item.materialId,
      unitUsage: item.unitUsage,
      // ... 其他字段
    }))
  };
  
  const response = await api.saveBOM(payload);
  
  // ✅ 增量更新，而非全量替换
  updateBOMIncrementally(response.data);
};
```

---

### 2. 实现增量更新

**新增函数**: `updateBOMIncrementally`

```typescript
const updateBOMIncrementally = (savedBOM: BOM) => {
  // 1. 更新 BOM 元数据
  setBOM(prev => ({
    ...prev,
    version: savedBOM.version,
    updatedAt: savedBOM.updatedAt,
    // ... 其他元数据
  }));
  
  // 2. 增量更新 items
  setItems(prev => {
    const savedItemsMap = new Map(
      savedBOM.items.map(item => [item.id, item])
    );
    
    // 更新现有 items
    return prev.map(item => {
      const savedItem = savedItemsMap.get(item.id);
      if (savedItem) {
        // 找到对应的 item，更新数据
        return {
          ...item,
          ...savedItem,
          // 保留前端状态（如 isExpanded）
          isExpanded: item.isExpanded,
        };
      }
      // 未找到，说明被删除了（理论上不应该发生）
      return item;
    });
  });
  
  // 3. 保持展开/折叠状态
  // 不需要额外操作，因为 isExpanded 已经保留
};
```

---

### 3. 新增物料时预生成 ID

**场景**: 用户点击"添加物料"按钮

**当前代码**:
```typescript
const addItem = () => {
  const newItem = {
    // ❌ 没有 id
    materialId: '',
    unitUsage: 0,
    // ... 其他字段
  };
  setItems(prev => [...prev, newItem]);
};
```

**改进后**:
```typescript
import { v4 as uuidv4 } from 'uuid';

const addItem = () => {
  const newItem = {
    id: uuidv4(),  // ✅ 前端预生成 ID
    materialId: '',
    unitUsage: 0,
    // ... 其他字段
  };
  setItems(prev => [...prev, newItem]);
};
```

---

## 数据库设计

### 无需修改表结构

**当前 `bom_items` 表**:
```sql
CREATE TABLE bom_items (
    id UUID PRIMARY KEY,  -- ✅ 已经是 UUID，支持前端生成
    bom_id UUID NOT NULL,
    material_id UUID NOT NULL,
    unit_usage DECIMAL(10, 4),
    sort_order INT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    -- ... 其他字段
);
```

**无需修改**:
- `id` 字段已经是 UUID，支持前端生成
- 无需添加新字段
- 无需数据迁移

---

## 审计日志增强

### 当前审计日志

**问题**: 无法区分新增、更新、删除

```json
{
  "operation": "update",
  "before": { "items": [...] },
  "after": { "items": [...] }
}
```

### 改进后的审计日志

**新增操作统计**:

```json
{
  "operation": "update",
  "itemsChanged": {
    "created": 2,
    "updated": 10,
    "deleted": 1
  },
  "details": [
    {
      "itemId": "uuid-1",
      "operation": "created",
      "data": { "materialId": "...", "unitUsage": 10 }
    },
    {
      "itemId": "uuid-2",
      "operation": "updated",
      "before": { "unitUsage": 5 },
      "after": { "unitUsage": 10 }
    },
    {
      "itemId": "uuid-3",
      "operation": "deleted",
      "data": { "materialId": "...", "unitUsage": 5 }
    }
  ]
}
```

**实现**:

```go
// 在 SaveBOM 中记录详细的审计信息
payload := bomAuditSnapshot(saved)
payload["operation"] = "update"
payload["itemsChanged"] = map[string]int{
    "created": upsertResult.Created,
    "updated": upsertResult.Updated,
    "deleted": upsertResult.Deleted,
}
// ... 写入审计日志
```

---

## 性能优化

### 批量操作优化

**问题**: 逐个 UPDATE 性能差

**优化**: 使用批量 UPDATE

```go
// 优化前：逐个更新
for _, item := range toUpdate {
    tx.Save(&item)  // ❌ N 次数据库调用
}

// 优化后：批量更新
if len(toUpdate) > 0 {
    // 使用 GORM 的 Save 批量操作
    tx.Save(&toUpdate)  // ✅ 1 次数据库调用
}
```

### 索引优化

**确保索引存在**:

```sql
-- 确保 bom_id 有索引（用于查询现有 items）
CREATE INDEX IF NOT EXISTS idx_bom_items_bom_id ON bom_items(bom_id);

-- 确保 id 有索引（用于 Upsert 判断）
-- 主键自动有索引，无需额外创建
```

---

## 测试策略

### 单元测试

**测试用例 1**: 全新增
```go
func TestUpsertBOMItems_AllNew(t *testing.T) {
    // 数据库中无现有数据
    // 前端发送 3 个 item（无 ID）
    // 预期：创建 3 个 item，生成新 ID
}
```

**测试用例 2**: 全更新
```go
func TestUpsertBOMItems_AllUpdate(t *testing.T) {
    // 数据库中有 3 个 item
    // 前端发送 3 个 item（有 ID，与数据库匹配）
    // 预期：更新 3 个 item，ID 不变
}
```

**测试用例 3**: 混合操作
```go
func TestUpsertBOMItems_Mixed(t *testing.T) {
    // 数据库中有 5 个 item
    // 前端发送 6 个 item：
    //   - 3 个有 ID（更新）
    //   - 2 个无 ID（新增）
    //   - 1 个数据库有但前端没发送（删除）
    // 预期：创建 2 个，更新 3 个，删除 1 个
}
```

**测试用例 4**: ID 冲突
```go
func TestUpsertBOMItems_IDConflict(t *testing.T) {
    // 前端发送的 ID 与数据库中其他 BOM 的 item ID 冲突
    // 预期：返回错误
}
```

---

### 集成测试

**测试场景 1**: 保存后 ID 稳定性
```go
func TestSaveBOM_IDStability(t *testing.T) {
    // 1. 创建 BOM，包含 10 个 item
    // 2. 修改第 5 个 item 的 unitUsage
    // 3. 保存 BOM
    // 4. 验证：前 4 个和后 5 个 item 的 ID 不变
    // 5. 验证：第 5 个 item 的 ID 不变，但 unitUsage 已更新
}
```

**测试场景 2**: 并发保存
```go
func TestSaveBOM_Concurrency(t *testing.T) {
    // 1. 两个 goroutine 同时保存同一个 BOM
    // 2. 验证：一个成功，一个因乐观锁失败
}
```

---

### E2E 测试

**测试场景**: 用户保存后状态保持

```typescript
test('保存后展开/折叠状态保持', async () => {
  // 1. 打开 BOM
  await page.goto('/bom/123');
  
  // 2. 展开第 5 行
  await page.click('[data-testid="expand-row-5"]');
  
  // 3. 修改第 5 行的用量
  await page.fill('[data-testid="unit-usage-5"]', '10');
  
  // 4. 保存
  await page.click('[data-testid="save-button"]');
  
  // 5. 等待保存完成
  await page.waitForSelector('[data-testid="save-success"]');
  
  // 6. 验证：第 5 行仍然展开
  const isExpanded = await page.isVisible('[data-testid="children-of-row-5"]');
  expect(isExpanded).toBe(true);
});
```

---

## 回滚方案

### 如果出现问题，如何回滚？

**方案 1**: 代码回滚
```bash
# 回滚到上一个版本
git revert <commit-hash>
git push origin master

# 重新部署
./deploy.sh
```

**方案 2**: 功能开关
```go
// 添加功能开关
const useSmartUpsert = os.Getenv("USE_SMART_UPSERT") == "true"

func SaveBOM(ctx context.Context, input SaveBOMInput) (BOMDetailResponse, error) {
    // ...
    if useSmartUpsert {
        upsertBOMItems(tx, existing.ID, modelInput.Items)
    } else {
        // 旧逻辑
        tx.Where("bom_id = ?", existing.ID).Delete(&models.BOMItem{})
        saveBOMItems(tx, existing.ID, modelInput.Items)
    }
    // ...
}
```

**方案 3**: 数据库回滚
```bash
# 如果数据损坏，从备份恢复
pg_restore -U postgres -d xdfc_production backup.sql
```

---

## 部署计划

### Phase 1: 后端部署（第 1 周）
- [ ] Day 1-2: 实现 `upsertBOMItems` 函数
- [ ] Day 3: 修改 `SaveBOM` 函数
- [ ] Day 4: 单元测试 + 集成测试
- [ ] Day 5: 代码审查 + 部署到预生产环境

### Phase 2: 前端部署（第 2 周）
- [ ] Day 1-2: 修改保存逻辑，发送 ID
- [ ] Day 3: 实现增量更新
- [ ] Day 4: E2E 测试
- [ ] Day 5: 部署到生产环境

### Phase 3: 监控与优化（第 3 周）
- [ ] 监控性能指标
- [ ] 收集用户反馈
- [ ] 修复发现的问题

---

**文档版本**: v1.0  
**创建日期**: 2026-05-13  
**作者**: Kiro AI Assistant  
**审核人**: 待填写
