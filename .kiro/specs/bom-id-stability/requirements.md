# BOM Item ID 稳定性 - 需求文档

## 概述

**项目名称**: BOM Item ID 稳定性改进  
**项目类型**: 性能优化 + 用户体验改进  
**优先级**: P0（最高）  
**预计周期**: 1-2 周  
**影响范围**: 后端 SaveBOM 逻辑 + 前端状态管理

---

## 问题描述

### 当前行为

**后端 `SaveBOM` 的实现**:
```go
// 当前实现：物理删除 + 重新插入
if err := tx.Where("bom_id = ?", existing.ID).Delete(&models.BOMItem{}).Error; err != nil {
    return err
}
if err := saveBOMItems(tx, existing.ID, modelInput.Items); err != nil {
    return err
}
```

**问题**:
1. 每次保存时，所有 `BOMItemID` 都会重新生成（UUID）
2. 即使物料内容没有变化，ID 也会改变
3. 前端无法通过 ID 追踪物料的变更

### 用户影响

#### 场景 1: 保存后丢失展开/折叠状态
```
用户操作：
1. 打开一个包含 100 行物料的 BOM
2. 展开了第 10-20 行的树节点
3. 修改了第 15 行的用量
4. 点击保存

当前结果：
❌ 所有节点的 ID 都变了
❌ 前端无法识别哪些节点之前是展开的
❌ 所有节点都折叠了，用户需要重新展开

期望结果：
✅ 只有第 15 行的 ID 可能变化（如果是新增）
✅ 其他行的 ID 保持不变
✅ 展开/折叠状态保持
```

#### 场景 2: 保存后全量重绘导致性能问题
```
用户操作：
1. 打开一个包含 1000 行物料的大型 BOM
2. 修改了 1 行物料的用量
3. 点击保存

当前结果：
❌ 所有 1000 行的 ID 都变了
❌ 前端必须重新渲染所有 1000 行
❌ 渲染耗时 > 5 秒，页面卡顿

期望结果：
✅ 只有 1 行的数据变化
✅ 前端仅重新渲染 1 行
✅ 渲染耗时 < 0.5 秒
```

#### 场景 3: 无法实现细粒度的审计追踪
```
用户操作：
1. 查看 BOM 的版本历史
2. 想知道"第 5 行物料从 A 改为 B"

当前结果：
❌ 每个版本的第 5 行 ID 都不同
❌ 无法追踪"某一行"的变更历史
❌ 审计日志只能看到"整个 BOM 变了"

期望结果：
✅ 第 5 行的 ID 在多个版本中保持一致
✅ 可以追踪"第 5 行从 A 改为 B"
✅ 审计日志精确到行级别
```

---

## 根本原因分析

### 技术债务的历史

**为什么当初选择"物理删除 + 重新插入"？**

1. **实现简单**: 不需要复杂的 diff 算法
2. **避免孤儿数据**: 删除后不会有残留数据
3. **事务安全**: 在事务中删除再插入，保证一致性

**但这种方式的代价**:

1. **ID 不稳定**: 每次保存都生成新 ID
2. **性能差**: 大量的 DELETE + INSERT 操作
3. **前端复杂**: 前端需要复杂的状态恢复逻辑
4. **审计困难**: 无法追踪行级别的变更

### 违反的设计原则

**违反 GEMINI.md 中的 SDRTS 原则**:

> SDRTS (Server-Driven Real-Time Sync): 服务端驱动的实时同步
> - 前端应该能够通过 ID 追踪实体的变更
> - 支持增量更新，而非全量替换

**当前实现违反了这一原则**:
- 前端无法通过 ID 追踪物料的变更
- 必须全量替换，无法增量更新

---

## 解决方案：智能 Upsert

### 核心思想

**Upsert = Update + Insert**

根据前端发送的 `BOMItemID` 判断操作类型：
- **有 ID 且存在**: 更新（UPDATE）
- **有 ID 但不存在**: 视为新增（INSERT，保留前端生成的 ID）
- **无 ID**: 新增（INSERT，后端生成 ID）
- **数据库有但前端没发送**: 删除（DELETE）

### 算法流程

```
输入：前端发送的 BOMItem 列表（可能包含 ID）

步骤 1: 获取数据库中现有的 BOMItem 列表
existingItems = SELECT * FROM bom_items WHERE bom_id = ?

步骤 2: 构建 ID 映射表
existingMap = { item.ID: item for item in existingItems }

步骤 3: 分类处理前端发送的数据
toCreate = []  // 需要新增的
toUpdate = []  // 需要更新的
incomingIDs = set()  // 前端发送的所有 ID

for item in frontendItems:
    if item.ID == "":
        // 无 ID，新增
        item.ID = generateUUID()
        toCreate.append(item)
    elif item.ID in existingMap:
        // 有 ID 且存在，更新
        toUpdate.append(item)
    else:
        // 有 ID 但不存在，视为新增（保留 ID）
        toCreate.append(item)
    
    incomingIDs.add(item.ID)

步骤 4: 找出需要删除的
toDelete = []
for existingItem in existingItems:
    if existingItem.ID not in incomingIDs:
        toDelete.append(existingItem)

步骤 5: 执行数据库操作
for item in toDelete:
    DELETE FROM bom_items WHERE id = item.ID

for item in toCreate:
    INSERT INTO bom_items (id, ...) VALUES (item.ID, ...)

for item in toUpdate:
    UPDATE bom_items SET ... WHERE id = item.ID
```

---

## 用户故事与验收标准

### 用户故事 1: 保存后保持展开/折叠状态

**作为** 工艺工程师  
**我想要** 在保存 BOM 后，树节点的展开/折叠状态保持不变  
**以便** 我可以继续编辑，而不需要重新展开节点

**验收标准**:
- [ ] 保存前展开的节点，保存后仍然展开
- [ ] 保存前折叠的节点，保存后仍然折叠
- [ ] 仅修改的行可能有新 ID（如果是新增）
- [ ] 未修改的行 ID 保持不变

---

### 用户故事 2: 大型 BOM 保存性能优化

**作为** 工艺工程师  
**我想要** 在保存大型 BOM（1000+ 行）时，页面不卡顿  
**以便** 我可以快速保存并继续工作

**验收标准**:
- [ ] 修改 1 行物料，保存后仅该行重新渲染
- [ ] 保存耗时 < 2 秒（1000 行 BOM）
- [ ] 前端渲染耗时 < 0.5 秒
- [ ] 数据库操作仅涉及变更的行（而非全量删除插入）

---

### 用户故事 3: 行级别的审计追踪

**作为** 质量工程师  
**我想要** 查看某一行物料的变更历史  
**以便** 我可以追溯"谁在何时修改了这行物料"

**验收标准**:
- [ ] 同一行物料在多个版本中保持相同的 ID
- [ ] 审计日志可以显示"第 5 行从 A 改为 B"
- [ ] 可以查询"某个 BOMItemID 的所有历史版本"

---

## 技术需求

### 后端需求

#### 1. 修改 `SaveBOM` 函数

**当前签名**:
```go
func SaveBOM(ctx context.Context, input SaveBOMInput) (BOMDetailResponse, error)
```

**需要修改的部分**:
- 将 `saveBOMItems` 改为 `upsertBOMItems`
- 实现智能 Upsert 算法
- 保留前端发送的 ID（如果有）

#### 2. 新增 `upsertBOMItems` 函数

**函数签名**:
```go
func upsertBOMItems(tx *gorm.DB, bomID string, items []models.BOMItem) error
```

**功能**:
- 根据 ID 判断是新增、更新还是删除
- 批量执行数据库操作
- 返回操作统计（新增 X 行，更新 Y 行，删除 Z 行）

#### 3. 修改 `DeriveMBOMFromEBOM` 函数

**当前问题**:
- 派生时生成全新的 ID
- 无法追踪"派生后的物料"与"源 EBOM 物料"的关系

**改进**:
- 可选：在派生时保留源 EBOM 的 ID（或建立映射关系）
- 或者：在 BOMItem 中增加 `SourceItemID` 字段

---

### 前端需求

#### 1. 修改 BOM 保存逻辑

**当前行为**:
```typescript
// 前端发送时不包含 ID
const payload = {
  items: items.map(item => ({
    materialId: item.materialId,
    unitUsage: item.unitUsage,
    // ... 其他字段，但没有 id
  }))
};
```

**改进后**:
```typescript
// 前端发送时保留 ID
const payload = {
  items: items.map(item => ({
    id: item.id,  // ✅ 保留 ID
    materialId: item.materialId,
    unitUsage: item.unitUsage,
    // ... 其他字段
  }))
};
```

#### 2. 优化状态管理

**当前行为**:
```typescript
// 保存后全量替换
const { data: savedBOM } = await saveBOM(payload);
setBOM(savedBOM);  // ❌ 全量替换，丢失前端状态
```

**改进后**:
```typescript
// 保存后增量更新
const { data: savedBOM } = await saveBOM(payload);
updateBOMIncrementally(savedBOM);  // ✅ 仅更新变更的部分
```

---

## 数据库影响

### 是否需要迁移？

**答案：不需要**

- `BOMItem` 表结构不变
- `id` 字段已经是 UUID，支持前端生成
- 仅修改应用层逻辑

### 性能影响

**当前性能**（物理删除 + 重新插入）:
```sql
-- 1000 行 BOM 保存
DELETE FROM bom_items WHERE bom_id = ?;  -- 删除 1000 行
INSERT INTO bom_items (...) VALUES (...);  -- 插入 1000 行
-- 总计：2000 次数据库操作
```

**改进后性能**（智能 Upsert）:
```sql
-- 假设修改了 10 行，新增了 2 行，删除了 1 行
DELETE FROM bom_items WHERE id IN (...);  -- 删除 1 行
INSERT INTO bom_items (...) VALUES (...);  -- 插入 2 行
UPDATE bom_items SET ... WHERE id IN (...);  -- 更新 10 行
-- 总计：13 次数据库操作（减少 99%）
```

---

## 风险评估

### 高风险

#### 1. ID 冲突
**风险**: 前端生成的 ID 与数据库中已有的 ID 冲突

**缓解措施**:
- 使用 UUID v4，冲突概率极低（< 10^-18）
- 后端在插入前检查 ID 是否已存在
- 如果冲突，返回错误，前端重新生成 ID

#### 2. 并发冲突
**风险**: 两个用户同时编辑同一个 BOM

**缓解措施**:
- 使用乐观锁（BOM 的 `version` 字段）
- 如果版本不匹配，拒绝保存
- 前端提示用户"BOM 已被其他用户修改，请刷新后重试"

### 中风险

#### 3. 前端兼容性
**风险**: 旧版本前端不发送 ID，导致所有物料被视为新增

**缓解措施**:
- 后端兼容两种模式：
  - 如果前端发送了 ID，使用 Upsert
  - 如果前端没发送 ID，回退到旧逻辑（物理删除 + 重新插入）
- 逐步迁移前端

#### 4. 审计日志兼容性
**风险**: 旧的审计日志无法追踪行级别变更

**缓解措施**:
- 新的审计日志记录操作类型（新增/更新/删除）
- 旧的审计日志保持不变
- 提供工具查询"某个 BOMItemID 的历史"

---

## 成功标准

### 性能指标

- [ ] 1000 行 BOM 保存耗时 < 2 秒（当前：> 5 秒）
- [ ] 前端渲染耗时 < 0.5 秒（当前：> 3 秒）
- [ ] 数据库操作减少 90%+

### 用户体验指标

- [ ] 保存后展开/折叠状态保持
- [ ] 保存后滚动位置保持
- [ ] 保存后编辑焦点保持

### 数据完整性指标

- [ ] 审计日志可追踪行级别变更
- [ ] 历史版本可完整还原
- [ ] 无数据丢失

---

## 实施计划

### Phase 1: 后端实现（1 周）
- [ ] 实现 `upsertBOMItems` 函数
- [ ] 修改 `SaveBOM` 函数
- [ ] 添加单元测试
- [ ] 添加集成测试

### Phase 2: 前端适配（3 天）
- [ ] 修改保存逻辑，发送 ID
- [ ] 优化状态管理，支持增量更新
- [ ] 添加 E2E 测试

### Phase 3: 验证与优化（2 天）
- [ ] 性能基准测试
- [ ] 用户验收测试
- [ ] 修复发现的问题

---

**文档版本**: v1.0  
**创建日期**: 2026-05-13  
**作者**: Kiro AI Assistant  
**审核人**: 待填写
