# XDFC BOM 模块安全加固方案
## 架构审计与漏洞修复计划

**审计日期**: 2026-05-13  
**审计范围**: `server/services/bom_service.go`  
**风险等级**: 高风险 × 1 | 中高风险 × 2 | 中风险 × 2 | 业务风险 × 1

---

## 🔴 风险 #1: MBOM 派生过程中的 SortOrder 回归漏洞

### 问题描述
**位置**: `DeriveMBOMFromEBOM` 函数 (Line 683-696)  
**严重性**: **高风险** - 直接破坏工艺指导的严肃性

**现状代码**:
```go
clonedItems[idx] = models.BOMItem{
    ID:             uuid.NewString(),
    Section:        item.Section,
    MaterialID:     item.MaterialID,
    UnitPrice:      item.UnitPrice,
    Unit:           item.Unit,
    UnitUsage:      item.UnitUsage,
    WastagePercent: item.WastagePercent,
    StandardUsage:  item.StandardUsage,
    MaterialType:   item.MaterialType,
    SupplyChannel:  item.SupplyChannel,
    // ❌ 缺失: SortOrder 字段未复制
}
```

**后果**:
- EBOM 中精心排列的装配顺序在派生为 MBOM 后完全丢失
- 工艺工程师需要重新手动排序（浪费时间）
- 可能导致装配错误（如先装配外壳再装配内部组件）

### 修复方案
```go
clonedItems[idx] = models.BOMItem{
    ID:             uuid.NewString(),
    Section:        item.Section,
    MaterialID:     item.MaterialID,
    UnitPrice:      item.UnitPrice,
    Unit:           item.Unit,
    UnitUsage:      item.UnitUsage,
    WastagePercent: item.WastagePercent,
    StandardUsage:  item.StandardUsage,
    MaterialType:   item.MaterialType,
    SupplyChannel:  item.SupplyChannel,
    SortOrder:      item.SortOrder, // ✅ 新增：继承源 EBOM 的排序
}
```

**验证方法**:
1. 创建一个包含 10 行物料的 EBOM，手动调整顺序
2. 派生为 MBOM
3. 验证 MBOM 的 `sort_order` 字段与源 EBOM 完全一致

---

## 🟠 风险 #2: 递归深度与栈溢出隐患

### 问题描述
**位置**: `checkBOMCircularReference` 函数 (Line 245-268)  
**严重性**: **中高风险** - 可能导致服务崩溃

**现状代码**:
```go
func checkBOMCircularReference(tx *gorm.DB, rootProductID string, currentMaterialID string, visited map[string]bool) error {
    // ❌ 无最大深度限制
    if currentMaterialID == rootProductID {
        return fmt.Errorf("[CIRCULAR_REFERENCE] ...")
    }
    // ... 递归调用
}
```

**后果**:
- 处理 50+ 层级的超大型装配体时可能栈溢出
- Goroutine 崩溃导致整个 HTTP 请求失败
- 无法给出友好的错误提示（"BOM 层级过深"）

### 修复方案

#### 方案 A: 添加深度限制（推荐 - 最小改动）
```go
const MaxBOMDepth = 50 // 工业标准：50 层已经是极限

func checkBOMCircularReference(tx *gorm.DB, rootProductID string, currentMaterialID string, visited map[string]bool, depth int) error {
    // ✅ 深度保护
    if depth > MaxBOMDepth {
        return fmt.Errorf("[DEPTH_EXCEEDED] BOM nesting exceeds maximum depth of %d levels", MaxBOMDepth)
    }

    if currentMaterialID == rootProductID {
        return fmt.Errorf("[CIRCULAR_REFERENCE] BOM circular dependency detected: Product depends on itself (ID: %s)", rootProductID)
    }

    if visited[currentMaterialID] {
        return nil
    }
    visited[currentMaterialID] = true

    var boms []models.BOM
    if err := tx.Where("product_id = ? AND status != ?", currentMaterialID, models.BOMStatusObsolete).
        Preload("Items", func(db *gorm.DB) *gorm.DB { return db.Order("bom_items.sort_order ASC") }).Find(&boms).Error; err != nil {
        return err
    }

    for _, b := range boms {
        for _, item := range b.Items {
            // ✅ 传递深度计数器
            if err := checkBOMCircularReference(tx, rootProductID, item.MaterialID, visited, depth+1); err != nil {
                return err
            }
        }
    }

    return nil
}
```

**调用点修改**:
```go
// Line 220
if err := checkBOMCircularReference(tx, input.ProductID, item.MaterialID, make(map[string]bool), 0); err != nil {
    return err
}
```

#### 方案 B: 改为迭代算法（最优 - 但改动较大）
```go
func checkBOMCircularReferenceIterative(tx *gorm.DB, rootProductID string, startMaterialID string) error {
    type queueItem struct {
        materialID string
        depth      int
    }
    
    queue := []queueItem{{materialID: startMaterialID, depth: 0}}
    visited := make(map[string]bool)
    
    for len(queue) > 0 {
        current := queue[0]
        queue = queue[1:]
        
        if current.depth > MaxBOMDepth {
            return fmt.Errorf("[DEPTH_EXCEEDED] BOM nesting exceeds maximum depth of %d levels", MaxBOMDepth)
        }
        
        if current.materialID == rootProductID {
            return fmt.Errorf("[CIRCULAR_REFERENCE] BOM circular dependency detected")
        }
        
        if visited[current.materialID] {
            continue
        }
        visited[current.materialID] = true
        
        var boms []models.BOM
        if err := tx.Where("product_id = ? AND status != ?", current.materialID, models.BOMStatusObsolete).
            Preload("Items").Find(&boms).Error; err != nil {
            return err
        }
        
        for _, b := range boms {
            for _, item := range b.Items {
                queue = append(queue, queueItem{
                    materialID: item.MaterialID,
                    depth:      current.depth + 1,
                })
            }
        }
    }
    
    return nil
}
```

**推荐**: 先采用方案 A（快速修复），后续重构时考虑方案 B。

---

## 🟠 风险 #3: BOM Item ID 的物理挥发性

### 问题描述
**位置**: `SaveBOM` 函数 (Line 425-530)  
**严重性**: **中风险** - 破坏数据追溯性

**现状代码**:
```go
// Line 486-492
if err := tx.Where("bom_id = ?", existing.ID).Delete(&models.BOMItem{}).Error; err != nil {
    return err
}
if err := saveBOMItems(tx, existing.ID, modelInput.Items); err != nil {
    return err
}
```

**后果**:
1. **引用断裂**: 下游模块（仓库预占料、质检明细）引用的 `BOMItemID` 在保存后失效
2. **审计噪音**: 无法追踪"第 3 行物料从 A 改为 B"的历史
3. **版本对比困难**: 无法精确 diff 两个版本的差异

### 修复方案

#### 方案 A: 智能 Upsert（推荐）
```go
func saveBOMItemsWithUpsert(tx *gorm.DB, bomID string, items []models.BOMItem) error {
    // 1. 获取现有 Items
    var existingItems []models.BOMItem
    if err := tx.Where("bom_id = ?", bomID).Find(&existingItems).Error; err != nil {
        return err
    }
    
    existingMap := make(map[string]*models.BOMItem)
    for i := range existingItems {
        existingMap[existingItems[i].ID] = &existingItems[i]
    }
    
    // 2. 分类处理
    var toCreate []models.BOMItem
    var toUpdate []models.BOMItem
    incomingIDs := make(map[string]bool)
    
    for idx := range items {
        items[idx].BOMID = bomID
        items[idx].SortOrder = idx
        
        if strings.TrimSpace(items[idx].ID) == "" {
            // 新增行
            items[idx].ID = uuid.NewString()
            toCreate = append(toCreate, items[idx])
        } else if existing, found := existingMap[items[idx].ID]; found {
            // 更新行（保留原 ID）
            items[idx].CreatedAt = existing.CreatedAt // 保留创建时间
            toUpdate = append(toUpdate, items[idx])
        } else {
            // ID 不存在（可能是前端错误），视为新增
            items[idx].ID = uuid.NewString()
            toCreate = append(toCreate, items[idx])
        }
        incomingIDs[items[idx].ID] = true
    }
    
    // 3. 删除不在新列表中的行
    for _, existing := range existingItems {
        if !incomingIDs[existing.ID] {
            if err := tx.Delete(&existing).Error; err != nil {
                return err
            }
        }
    }
    
    // 4. 批量创建和更新
    if len(toCreate) > 0 {
        if err := tx.Create(&toCreate).Error; err != nil {
            return err
        }
    }
    for _, item := range toUpdate {
        if err := tx.Save(&item).Error; err != nil {
            return err
        }
    }
    
    return nil
}
```

**调用点修改**:
```go
// Line 492 和 522
if err := saveBOMItemsWithUpsert(tx, existing.ID, modelInput.Items); err != nil {
    return err
}
```

#### 方案 B: 保留现有逻辑 + 添加警告（最小改动）
如果下游模块暂时没有引用 `BOMItemID`，可以暂时保留现有逻辑，但在 API 文档中明确警告：

```go
// ⚠️ WARNING: Saving a BOM will regenerate all BOMItem IDs.
// Do NOT store BOMItemID references in external systems.
```

**推荐**: 采用方案 A，为未来扩展预留空间。

---

## 🟡 风险 #4: 空 BOM 或无效 BOM 发布

### 问题描述
**位置**: `PromoteBOMStatus` 函数 (Line 575-650)  
**严重性**: **业务风险** - 导致生产停工

**现状代码**:
```go
func PromoteBOMStatus(ctx context.Context, id string, input PromoteBOMStatusInput) (BOMDetailResponse, error) {
    // ❌ 仅校验权限和状态机，不校验业务完整性
    if guard := statemachine.CanTransitionBOMStatusWithType(...); !guard.Allowed {
        return guard.Err()
    }
    // ... 直接保存
}
```

**后果**:
- 允许发布"零物料"的 BOM
- 允许发布"所有物料用量为 0"的 BOM
- MRP 算料引擎读取到空 BOM，导致算料结果为 0，引发停工待料

### 修复方案
```go
// 新增业务完整性校验函数
func validateBOMBusinessIntegrity(tx *gorm.DB, bomID string, targetStatus string) error {
    // 仅在发布（RELEASED）时校验
    if targetStatus != models.BOMStatusReleased {
        return nil
    }
    
    var bom models.BOM
    if err := tx.Preload("Items").Where("id = ?", bomID).First(&bom).Error; err != nil {
        return err
    }
    
    // 1. 校验：至少包含 1 行物料
    if len(bom.Items) == 0 {
        return fmt.Errorf("[VALIDATION] Cannot release an empty BOM (ID: %s). At least one material is required", bomID)
    }
    
    // 2. 校验：至少有一行物料的用量 > 0
    hasValidUsage := false
    for _, item := range bom.Items {
        if item.UnitUsage > 0 || item.StandardUsage > 0 {
            hasValidUsage = true
            break
        }
    }
    if !hasValidUsage {
        return fmt.Errorf("[VALIDATION] Cannot release BOM with all zero-usage materials (ID: %s)", bomID)
    }
    
    // 3. 校验：所有物料必须存在且状态为 Active
    for _, item := range bom.Items {
        var material models.Material
        if err := tx.Where("id = ?", item.MaterialID).First(&material).Error; err != nil {
            if errors.Is(err, gorm.ErrRecordNotFound) {
                return fmt.Errorf("[VALIDATION] BOM contains non-existent material (ID: %s)", item.MaterialID)
            }
            return err
        }
        if material.Status != "Active" {
            return fmt.Errorf("[VALIDATION] BOM contains inactive material: %s - %s (Status: %s)", material.Code, material.Name, material.Status)
        }
    }
    
    return nil
}
```

**调用点修改**:
```go
// Line 605 之前插入
if err := validateBOMBusinessIntegrity(tx, id, input.Status); err != nil {
    return err
}
```

---

## 🟡 风险 #5: 幽灵物料注入

### 问题描述
**位置**: `saveBOMItems` 函数 (Line 411-423) + `validateBOMReferences` (Line 195-240)  
**严重性**: **中风险** - 主数据完整性破坏

**现状分析**:
- `validateBOMReferences` 已经有外键校验（Line 207-216）
- 但该校验仅在 `SaveBOM` 中调用，不在 `DeriveMBOMFromEBOM` 中调用

**后果**:
- 如果源 EBOM 包含已删除的物料，派生 MBOM 时会继承"幽灵物料"
- 前端查询物料详情时返回 404，导致页面崩溃

### 修复方案
```go
// 在 DeriveMBOMFromEBOM 中添加校验
func DeriveMBOMFromEBOM(ctx context.Context, ebomID string, input DeriveMBOMInput) (BOMDetailResponse, error) {
    // ... 现有代码 ...
    
    // ✅ 新增：在派生前验证源 EBOM 的物料完整性
    if err := validateBOMReferences(tx, &ebom); err != nil {
        return fmt.Errorf("[VALIDATION] Source EBOM contains invalid references: %w", err)
    }
    
    // ... 继续派生逻辑 ...
}
```

**额外加固**: 在数据库层添加外键约束
```sql
-- 迁移脚本
ALTER TABLE bom_items 
ADD CONSTRAINT fk_bom_items_material 
FOREIGN KEY (material_id) 
REFERENCES materials(id) 
ON DELETE RESTRICT;
```

---

## 🟡 风险 #6: 大规模 BOM 的加载延迟

### 问题描述
**位置**: `GetBOMByID` 函数 (Line 177-186)  
**严重性**: **性能风险** - 用户体验下降

**现状代码**:
```go
func GetBOMByID(id string) (BOMDetailResponse, error) {
    var bom models.BOM
    if err := db.DB.
        Preload("Product").
        Preload("Items", func(db *gorm.DB) *gorm.DB { 
            return db.Order("bom_items.sort_order ASC") 
        }).
        First(&bom, "id = ?", id).Error; err != nil {
        return BOMDetailResponse{}, err
    }
    // ...
}
```

**后果**:
- 1000+ 行的 MBOM 加载时间 > 5 秒
- `sort_order` 字段无索引，排序在内存中完成
- JSON 序列化开销大

### 修复方案

#### 方案 A: 添加数据库索引（推荐 - 立即见效）
```sql
-- 迁移脚本
CREATE INDEX idx_bom_items_bom_id_sort_order 
ON bom_items(bom_id, sort_order);
```

**效果**: 查询时间从 O(n log n) 降至 O(n)

#### 方案 B: 分页加载（适用于超大型 BOM）
```go
type GetBOMByIDOptions struct {
    IncludeItems bool
    ItemPage     int
    ItemPageSize int
}

func GetBOMByIDWithOptions(id string, opts GetBOMByIDOptions) (BOMDetailResponse, error) {
    var bom models.BOM
    query := db.DB.Preload("Product")
    
    if opts.IncludeItems {
        if opts.ItemPageSize > 0 {
            // 分页加载
            offset := (opts.ItemPage - 1) * opts.ItemPageSize
            query = query.Preload("Items", func(db *gorm.DB) *gorm.DB {
                return db.Order("bom_items.sort_order ASC").
                    Limit(opts.ItemPageSize).
                    Offset(offset)
            })
        } else {
            // 全量加载
            query = query.Preload("Items", func(db *gorm.DB) *gorm.DB {
                return db.Order("bom_items.sort_order ASC")
            })
        }
    }
    
    if err := query.First(&bom, "id = ?", id).Error; err != nil {
        return BOMDetailResponse{}, err
    }
    
    bom.DisplayVersion = resolveBOMDisplayVersion(bom)
    return MapBOMToDetailResponse(bom)
}
```

#### 方案 C: 响应压缩（最小改动）
在 Gin 中间件中启用 gzip 压缩：
```go
import "github.com/gin-contrib/gzip"

router.Use(gzip.Gzip(gzip.DefaultCompression))
```

**推荐**: 先执行方案 A（索引），如果仍有性能问题再考虑方案 B。

---

## 📋 修复优先级与实施计划

### Phase 1: 紧急修复（本周完成）
1. ✅ **风险 #1**: 修复 SortOrder 回归（5 分钟）
2. ✅ **风险 #4**: 添加业务完整性校验（30 分钟）
3. ✅ **风险 #6**: 添加数据库索引（5 分钟）

### Phase 2: 重要加固（下周完成）
4. ✅ **风险 #2**: 添加递归深度限制（20 分钟）
5. ✅ **风险 #5**: 加固幽灵物料防护（15 分钟）

### Phase 3: 架构优化（下个迭代）
6. ✅ **风险 #3**: 实现智能 Upsert（2 小时）
7. ✅ **风险 #2**: 改为迭代算法（可选，1 小时）

---

## 🧪 测试验证清单

### 单元测试
- [ ] `TestDeriveMBOMPreservesSortOrder` - 验证排序继承
- [ ] `TestCheckBOMCircularReferenceDepthLimit` - 验证深度限制
- [ ] `TestSaveBOMItemsPreservesIDs` - 验证 ID 稳定性
- [ ] `TestPromoteBOMRejectsEmptyBOM` - 验证空 BOM 拒绝
- [ ] `TestDeriveMBOMRejectsGhostMaterials` - 验证幽灵物料拒绝

### 集成测试
- [ ] 创建 50 层嵌套 BOM，验证不崩溃
- [ ] 加载 1000 行 BOM，验证响应时间 < 2 秒
- [ ] 保存 BOM 10 次，验证 Item ID 稳定性

### 性能基准测试
```bash
# 使用 Apache Bench 测试
ab -n 100 -c 10 http://localhost:8080/api/v1/engineering/bom/{large-bom-id}
```

**目标**: P95 响应时间 < 2 秒

---

## 📊 风险矩阵总结

| 风险编号 | 严重性 | 影响范围 | 修复难度 | 优先级 |
|---------|--------|---------|---------|--------|
| #1 SortOrder 回归 | 高 | 工艺指导 | 低 | P0 |
| #2 栈溢出 | 中高 | 服务稳定性 | 低 | P1 |
| #3 ID 挥发性 | 中 | 数据追溯 | 中 | P2 |
| #4 空 BOM 发布 | 业务 | 生产计划 | 低 | P0 |
| #5 幽灵物料 | 中 | 主数据完整性 | 低 | P1 |
| #6 性能延迟 | 性能 | 用户体验 | 低 | P0 |

---

## 🔧 实施建议

1. **立即执行 Phase 1**（总耗时 < 1 小时）
   - 这些修复都是"低风险高收益"
   - 不涉及复杂逻辑变更

2. **为 Phase 2 创建功能分支**
   ```bash
   git checkout -b feature/bom-security-hardening
   ```

3. **每个修复独立提交**
   ```bash
   git commit -m "fix(bom): preserve SortOrder in MBOM derivation [RISK-1]"
   git commit -m "fix(bom): add business integrity validation [RISK-4]"
   ```

4. **部署前在预生产环境验证**
   - 使用真实的大规模 BOM 数据
   - 监控 CPU/内存使用率

---

## 📞 联系与反馈

如有疑问或需要进一步讨论，请联系：
- **架构负责人**: [您的名字]
- **审计日期**: 2026-05-13

**文档版本**: v1.0
