# BOM 审计与版本历史系统漏洞修复方案
## 深度审计报告 - Phase 3

**审计日期**: 2026-05-13  
**审计范围**: 审计快照、版本历史、数据一致性  
**风险等级**: 严重 × 1 | 中高风险 × 2 | 逻辑漏洞 × 1 | 一致性风险 × 1

---

## 🔴 风险 #7: 审计快照中的 SortOrder 字段蒸发

### 问题描述
**位置**: `server/services/engineering_audit.go` - `bomAuditItemsSnapshot` (Line 38-55)  
**严重性**: **严重** - 历史无法还原，审计盲区

**现状代码**:
```go
func bomAuditItemsSnapshot(items []models.BOMItem) []map[string]any {
    result := make([]map[string]any, 0, len(items))
    for _, item := range items {
        result = append(result, map[string]any{
            "id":             strings.TrimSpace(item.ID),
            "section":        strings.TrimSpace(item.Section),
            "materialId":     strings.TrimSpace(item.MaterialID),
            "unitPrice":      item.UnitPrice,
            "unit":           strings.TrimSpace(item.Unit),
            "unitUsage":      item.UnitUsage,
            "wastagePercent": item.WastagePercent,
            "standardUsage":  item.StandardUsage,
            "materialType":   strings.TrimSpace(item.MaterialType),
            "supplyChannel":  strings.TrimSpace(item.SupplyChannel),
            // ❌ 缺失: sortOrder 字段
        })
    }
    return result
}
```

**后果**:
1. **历史无法还原**: 版本快照中没有 `sortOrder`，从历史版本还原时顺序丢失
2. **审计盲区**: 无法追踪"谁在何时调整了物料顺序"
3. **工艺指导失效**: 装配顺序是工艺的核心，丢失顺序等于丢失工艺知识

### 修复方案
```go
func bomAuditItemsSnapshot(items []models.BOMItem) []map[string]any {
    result := make([]map[string]any, 0, len(items))
    for _, item := range items {
        result = append(result, map[string]any{
            "id":             strings.TrimSpace(item.ID),
            "section":        strings.TrimSpace(item.Section),
            "materialId":     strings.TrimSpace(item.MaterialID),
            "unitPrice":      item.UnitPrice,
            "unit":           strings.TrimSpace(item.Unit),
            "unitUsage":      item.UnitUsage,
            "wastagePercent": item.WastagePercent,
            "standardUsage":  item.StandardUsage,
            "materialType":   strings.TrimSpace(item.MaterialType),
            "supplyChannel":  strings.TrimSpace(item.SupplyChannel),
            "sortOrder":      item.SortOrder, // ✅ 新增：保存装配顺序
        })
    }
    return result
}
```

**验证方法**:
1. 保存一个 BOM，调整物料顺序
2. 查询 `bom_version_snapshots` 表，检查 `snapshot` JSON 中是否包含 `sortOrder`
3. 从历史版本还原，验证顺序是否正确

---

## 🟠 风险 #8: 关键业务意图被"抹平"

### 问题描述
**位置**: `server/services/bom_version_history_service.go` - `normalizeBOMVersionOperation` (Line 151)  
**严重性**: **中高风险** - 语义丢失，用户体验差

**现状代码**:
```go
func normalizeBOMVersionOperation(value string) string {
    trimmed := strings.ToUpper(strings.TrimSpace(value))
    if trimmed == "DELETE" {
        return trimmed
    }
    return "SAVE" // ❌ 所有非删除操作都变成 SAVE
}
```

**后果**:
- 版本历史中全是 "SAVE"，无法区分：
  - 普通保存（SAVE）
  - 状态流转（PROMOTE）
  - MBOM 派生（DERIVE）
- 工艺工程师无法快速定位"审核通过"或"派生起点"的关键节点

### 修复方案

#### 方案 A: 保留原始操作类型（推荐）
```go
func normalizeBOMVersionOperation(value string) string {
    trimmed := strings.ToUpper(strings.TrimSpace(value))
    
    // 定义允许的操作类型
    validOperations := map[string]bool{
        "SAVE":    true,
        "DELETE":  true,
        "PROMOTE": true,
        "DERIVE":  true,
        "CREATE":  true,
        "UPDATE":  true,
    }
    
    if validOperations[trimmed] {
        return trimmed
    }
    
    // 未知操作类型，默认为 SAVE
    return "SAVE"
}
```

#### 方案 B: 添加操作类型映射（更灵活）
```go
func normalizeBOMVersionOperation(value string) string {
    trimmed := strings.ToUpper(strings.TrimSpace(value))
    
    // 操作类型映射表
    operationMap := map[string]string{
        "SAVE":    "SAVE",
        "CREATE":  "SAVE",
        "UPDATE":  "SAVE",
        "DELETE":  "DELETE",
        "PROMOTE": "PROMOTE",
        "DERIVE":  "DERIVE",
    }
    
    if normalized, exists := operationMap[trimmed]; exists {
        return normalized
    }
    
    return "SAVE"
}
```

**推荐**: 采用方案 A（简单直接）

**前端展示优化**:
```typescript
// 前端可以根据操作类型显示不同的图标和颜色
const operationIcons = {
  SAVE: '💾',
  PROMOTE: '✅',
  DERIVE: '🔄',
  DELETE: '🗑️'
}

const operationLabels = {
  SAVE: '保存',
  PROMOTE: '状态流转',
  DERIVE: 'MBOM派生',
  DELETE: '删除'
}
```

---

## 🟡 风险 #9: MBOM 派生后的结构性瘫痪

### 问题描述
**位置**: `server/services/bom_service.go` - `DeriveMBOMFromEBOM` (Line 683-740)  
**严重性**: **逻辑漏洞** - 可能导致树状视图崩溃

**现状分析**:
```go
// 派生时的处理
clonedItems[idx] = models.BOMItem{
    ID: uuid.NewString(), // ✅ 生成新 ID
    // ... 其他字段
}

mbom := models.BOM{
    RelationSidecar: ebom.RelationSidecar, // ❌ 直接复制 JSON
}
```

**风险场景**:
如果 `RelationSidecar` 的 JSON 结构如下：
```json
{
  "nodes": [
    {"id": "old-item-id-1", "parentId": null},
    {"id": "old-item-id-2", "parentId": "old-item-id-1"}
  ]
}
```

派生后，`BOMItem` 的 ID 变成了新的 UUID，但 `RelationSidecar` 中的 ID 仍然指向旧的 ID，导致：
- 树状视图无法匹配到对应的物料行
- 前端显示空白或报错

### 修复方案

#### 方案 A: 重新映射 RelationSidecar 中的 ID（推荐）
```go
func DeriveMBOMFromEBOM(ctx context.Context, ebomID string, input DeriveMBOMInput) (BOMDetailResponse, error) {
    // ... 现有代码 ...
    
    // 3. 克隆BOM Items 并建立 ID 映射表
    clonedItems := make([]models.BOMItem, len(ebom.Items))
    idMapping := make(map[string]string) // oldID -> newID
    
    for idx, item := range ebom.Items {
        newID := uuid.NewString()
        idMapping[item.ID] = newID
        
        clonedItems[idx] = models.BOMItem{
            ID:             newID,
            Section:        item.Section,
            MaterialID:     item.MaterialID,
            // ... 其他字段
            SortOrder:      item.SortOrder,
        }
    }
    
    // 4. 重新映射 RelationSidecar 中的 ID
    newRelationSidecar, err := remapBOMRelationSidecarIDs(ebom.RelationSidecar, idMapping)
    if err != nil {
        return BOMDetailResponse{}, fmt.Errorf("remap relation sidecar: %w", err)
    }
    
    // 5. 创建MBOM
    mbom := models.BOM{
        // ... 其他字段
        RelationSidecar: newRelationSidecar, // ✅ 使用重新映射后的 JSON
    }
    
    // ... 继续保存逻辑
}

// 新增辅助函数
func remapBOMRelationSidecarIDs(sidecar json.RawMessage, idMapping map[string]string) (json.RawMessage, error) {
    if len(sidecar) == 0 {
        return sidecar, nil
    }
    
    var data map[string]any
    if err := json.Unmarshal(sidecar, &data); err != nil {
        return nil, err
    }
    
    // 递归替换所有 ID 引用
    remapIDsInMap(data, idMapping)
    
    return json.Marshal(data)
}

func remapIDsInMap(data map[string]any, idMapping map[string]string) {
    for key, value := range data {
        switch v := value.(type) {
        case string:
            // 如果是 ID 字段，尝试替换
            if (key == "id" || key == "itemId" || key == "parentId") && idMapping[v] != "" {
                data[key] = idMapping[v]
            }
        case map[string]any:
            remapIDsInMap(v, idMapping)
        case []any:
            for _, item := range v {
                if m, ok := item.(map[string]any); ok {
                    remapIDsInMap(m, idMapping)
                }
            }
        }
    }
}
```

#### 方案 B: 清空 RelationSidecar（最安全但功能受损）
```go
mbom := models.BOM{
    // ... 其他字段
    RelationSidecar: json.RawMessage("{}"), // ✅ 清空，让用户重新构建
}
```

**推荐**: 
- 如果 `RelationSidecar` 确实包含 BOMItem ID 引用，采用方案 A
- 如果 `RelationSidecar` 仅包含元数据（不引用 ID），保持现状即可

**验证方法**:
1. 检查现有 BOM 的 `relation_sidecar` 字段，确认是否包含 `itemId` 或类似字段
2. 如果包含，必须实施方案 A

---

## 🟡 风险 #10: 版本序列的竞态条件

### 问题描述
**位置**: `server/services/bom_version_history_service.go` - `nextBOMVersionSequence` (Line 126)  
**严重性**: **中高风险** - 可能生成重复序号

**现状代码**:
```go
func nextBOMVersionSequence(tx *gorm.DB, bomID string) (int, error) {
    var currentMax int
    if err := tx.Model(&models.BOMVersionSnapshot{}).
        Where("bom_id = ?", strings.TrimSpace(bomID)).
        Select("COALESCE(MAX(version_sequence), 0)").
        Scan(&currentMax).Error; err != nil {
        return 0, err
    }
    return currentMax + 1, nil // ❌ 无锁保护
}
```

**竞态场景**:
```
时间线：
T1: 用户A 查询 MAX(sequence) = 5
T2: 用户B 查询 MAX(sequence) = 5
T3: 用户A 插入 sequence = 6
T4: 用户B 插入 sequence = 6  ❌ 重复！
```

### 修复方案

#### 方案 A: 使用数据库行锁（推荐）
```go
func nextBOMVersionSequence(tx *gorm.DB, bomID string) (int, error) {
    var currentMax int
    
    // ✅ 使用 FOR UPDATE 锁定相关行
    if err := tx.Model(&models.BOMVersionSnapshot{}).
        Where("bom_id = ?", strings.TrimSpace(bomID)).
        Select("COALESCE(MAX(version_sequence), 0)").
        Clauses(clause.Locking{Strength: "UPDATE"}).
        Scan(&currentMax).Error; err != nil {
        return 0, err
    }
    
    return currentMax + 1, nil
}
```

**注意**: 需要导入 `"gorm.io/gorm/clause"`

#### 方案 B: 使用数据库唯一约束（最安全）
```sql
-- 迁移脚本
ALTER TABLE bom_version_snapshots 
ADD CONSTRAINT uk_bom_version_sequence 
UNIQUE (bom_id, version_sequence);
```

然后在代码中处理冲突重试：
```go
func nextBOMVersionSequence(tx *gorm.DB, bomID string) (int, error) {
    var currentMax int
    if err := tx.Model(&models.BOMVersionSnapshot{}).
        Where("bom_id = ?", strings.TrimSpace(bomID)).
        Select("COALESCE(MAX(version_sequence), 0)").
        Scan(&currentMax).Error; err != nil {
        return 0, err
    }
    return currentMax + 1, nil
}

// 在 writeBOMVersionSnapshotTx 中添加重试逻辑
func writeBOMVersionSnapshotTx(ctx context.Context, tx *gorm.DB, bom models.BOM, operation string) error {
    const maxRetries = 3
    
    for attempt := 0; attempt < maxRetries; attempt++ {
        sequence, err := nextBOMVersionSequence(tx, bom.ID)
        if err != nil {
            return err
        }
        
        // ... 构建 record ...
        
        err = tx.Create(&record).Error
        if err == nil {
            return nil
        }
        
        // 如果是唯一约束冲突，重试
        if strings.Contains(err.Error(), "uk_bom_version_sequence") {
            continue
        }
        
        return err
    }
    
    return fmt.Errorf("failed to create version snapshot after %d retries", maxRetries)
}
```

**推荐**: 方案 A（行锁）+ 方案 B（唯一约束）双重保护

---

## 🟡 风险 #11: 静态快照与动态主数据的认知鸿沟

### 问题描述
**严重性**: **业务风险** - 可能误导生产采购

**场景**:
1. 2025 年 1 月：创建 BOM，包含物料 M001（钢板，状态 Active）
2. 2026 年 5 月：物料 M001 被禁用（状态改为 Archived）
3. 工程师查看 2025 年 1 月的 BOM 快照，看到 M001，以为仍然可用
4. 下单采购 M001，发现已停产

### 修复方案

#### 方案 A: 在快照中添加"主数据状态警告"（推荐）
```go
// 新增函数：为快照添加主数据状态标记
func enrichBOMSnapshotWithMaterialStatus(tx *gorm.DB, snapshot map[string]any) (map[string]any, error) {
    items, ok := snapshot["items"].([]map[string]any)
    if !ok {
        return snapshot, nil
    }
    
    for idx := range items {
        materialID, ok := items[idx]["materialId"].(string)
        if !ok || materialID == "" {
            continue
        }
        
        var material models.Material
        if err := tx.Where("id = ?", materialID).First(&material).Error; err != nil {
            if errors.Is(err, gorm.ErrRecordNotFound) {
                items[idx]["_materialStatusWarning"] = "DELETED"
                items[idx]["_materialStatusMessage"] = "物料已被删除"
            }
            continue
        }
        
        if material.Status != "Active" {
            items[idx]["_materialStatusWarning"] = material.Status
            items[idx]["_materialStatusMessage"] = fmt.Sprintf("物料当前状态: %s", material.Status)
        }
    }
    
    snapshot["items"] = items
    return snapshot, nil
}

// 在 mapBOMVersionRecordDetail 中调用
func mapBOMVersionRecordDetail(record models.BOMVersionSnapshot) (BOMVersionRecordDetail, error) {
    snapshot, err := parseBOMVersionSnapshotPayload(record.Snapshot)
    if err != nil {
        return BOMVersionRecordDetail{}, err
    }
    
    // ✅ 添加主数据状态警告
    enrichedSnapshot, err := enrichBOMSnapshotWithMaterialStatus(db.DB, snapshot)
    if err != nil {
        return BOMVersionRecordDetail{}, err
    }
    
    relationSidecar, err := parseBOMRelationSidecar(record.RelationSidecar)
    if err != nil {
        return BOMVersionRecordDetail{}, err
    }
    
    return BOMVersionRecordDetail{
        BOMVersionRecordSummary: mapBOMVersionRecordSummary(record),
        Snapshot:                enrichedSnapshot,
        RelationSidecar:         relationSidecar,
    }, nil
}
```

**前端展示**:
```typescript
// 在历史版本详情中显示警告
{snapshot.items.map(item => (
  <div>
    <span>{item.materialName}</span>
    {item._materialStatusWarning && (
      <Badge color="warning">
        {item._materialStatusMessage}
      </Badge>
    )}
  </div>
))}
```

#### 方案 B: 在快照中同时保存物料快照（更完整但占用空间）
```go
func bomAuditItemsSnapshot(items []models.BOMItem) []map[string]any {
    result := make([]map[string]any, 0, len(items))
    for _, item := range items {
        itemSnapshot := map[string]any{
            "id":             strings.TrimSpace(item.ID),
            "section":        strings.TrimSpace(item.Section),
            "materialId":     strings.TrimSpace(item.MaterialID),
            "unitPrice":      item.UnitPrice,
            "unit":           strings.TrimSpace(item.Unit),
            "unitUsage":      item.UnitUsage,
            "wastagePercent": item.WastagePercent,
            "standardUsage":  item.StandardUsage,
            "materialType":   strings.TrimSpace(item.MaterialType),
            "supplyChannel":  strings.TrimSpace(item.SupplyChannel),
            "sortOrder":      item.SortOrder,
        }
        
        // ✅ 保存物料快照（可选）
        if item.MaterialID != "" {
            var material models.Material
            if err := db.DB.Where("id = ?", item.MaterialID).First(&material).Error; err == nil {
                itemSnapshot["_materialSnapshot"] = map[string]any{
                    "code":   material.Code,
                    "name":   material.Name,
                    "spec":   material.Spec,
                    "status": material.Status,
                }
            }
        }
        
        result = append(result, itemSnapshot)
    }
    return result
}
```

**推荐**: 方案 A（动态警告，不占用额外空间）

---

## 📋 修复优先级与实施计划

### Phase 3A: 紧急修复（本周完成）
1. ✅ **风险 #7**: 修复 SortOrder 字段蒸发（5 分钟）
2. ✅ **风险 #8**: 保留操作类型语义（10 分钟）

### Phase 3B: 重要加固（下周完成）
3. ✅ **风险 #10**: 添加版本序列锁保护（20 分钟）
4. ✅ **风险 #11**: 添加主数据状态警告（30 分钟）

### Phase 3C: 架构优化（下个迭代）
5. ⏳ **风险 #9**: 实现 RelationSidecar ID 重映射（1 小时，需先确认是否必要）

---

## 🧪 测试验证清单

### 测试 RISK-7 修复
```bash
# 1. 创建 BOM，调整物料顺序
# 2. 保存 BOM
# 3. 查询版本快照
SELECT snapshot FROM bom_version_snapshots WHERE bom_id = 'xxx' ORDER BY created_at DESC LIMIT 1;
# 4. 验证 JSON 中包含 sortOrder 字段
```

### 测试 RISK-8 修复
```bash
# 1. 执行不同操作：保存、状态流转、派生
# 2. 查询版本历史
GET /api/v1/engineering/bom/version-history?bomId=xxx
# 3. 验证 operation 字段显示为 SAVE、PROMOTE、DERIVE
```

### 测试 RISK-10 修复
```bash
# 并发测试
# 使用 Apache Bench 模拟并发保存
ab -n 100 -c 10 -p bom.json -T application/json http://localhost:8080/api/v1/engineering/bom

# 验证版本序号无重复
SELECT bom_id, version_sequence, COUNT(*) 
FROM bom_version_snapshots 
GROUP BY bom_id, version_sequence 
HAVING COUNT(*) > 1;
# 应该返回 0 行
```

---

## 📊 风险矩阵总结

| 风险编号 | 严重性 | 影响范围 | 修复难度 | 优先级 |
|---------|--------|---------|---------|--------|
| #7 SortOrder 蒸发 | 严重 | 审计追溯 | 低 | P0 |
| #8 操作类型抹平 | 中高 | 用户体验 | 低 | P0 |
| #9 结构性瘫痪 | 逻辑 | 树状视图 | 中 | P2 |
| #10 版本序列竞态 | 中高 | 数据一致性 | 低 | P1 |
| #11 主数据鸿沟 | 业务 | 生产采购 | 中 | P1 |

---

## 🔧 实施建议

1. **立即执行 Phase 3A**（总耗时 < 15 分钟）
2. **为 Phase 3B 创建功能分支**
3. **Phase 3C 需要先调研 RelationSidecar 的实际结构**

---

**文档版本**: v1.0  
**最后更新**: 2026-05-13
