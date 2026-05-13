# BOM Item ID 稳定性 - 任务列表

## 任务概览

**总任务数**: 15  
**预计工期**: 2 周  
**并行度**: 部分任务可并行

---

## Task 1: 实现 upsertBOMItems 核心函数

**描述**: 实现智能 Upsert 算法，根据 ID 判断新增、更新或删除

**文件**: `server/services/bom_service.go`

**子任务**:
1. 创建 `UpsertResult` 结构体
2. 实现 `upsertBOMItems` 函数
3. 实现分类逻辑（toCreate, toUpdate, toDelete）
4. 实现批量数据库操作

**验收标准**:
- [ ] 函数签名正确：`func upsertBOMItems(tx *gorm.DB, bomID string, items []models.BOMItem) (*UpsertResult, error)`
- [ ] 正确处理无 ID 的情况（新增，后端生成 ID）
- [ ] 正确处理有 ID 且存在的情况（更新，保留 ID）
- [ ] 正确处理有 ID 但不存在的情况（新增，保留前端 ID）
- [ ] 正确识别需要删除的 items
- [ ] 返回操作统计（created, updated, deleted）

**依赖**: 无

---

## Task 2: 修改 SaveBOM 函数使用 Upsert

**描述**: 将 SaveBOM 中的物理删除逻辑替换为 upsertBOMItems

**文件**: `server/services/bom_service.go`

**子任务**:
1. 找到 SaveBOM 中的物理删除代码
2. 替换为 upsertBOMItems 调用
3. 添加 Upsert 结果日志记录
4. 保持其他逻辑不变

**验收标准**:
- [ ] 更新现有 BOM 时使用 upsertBOMItems
- [ ] 新增 BOM 时仍使用 saveBOMItems（因为是全新的）
- [ ] 记录 Upsert 统计信息到日志
- [ ] 不破坏现有的乐观锁、审计等逻辑

**依赖**: Task 1

---

## Task 3: 实现兼容性回退逻辑

**描述**: 支持旧版本前端（不发送 ID），自动回退到旧逻辑

**文件**: `server/services/bom_service.go`

**子任务**:
1. 在 upsertBOMItems 中检测是否所有 ID 都为空
2. 如果是，调用 upsertBOMItemsLegacy
3. 实现 upsertBOMItemsLegacy（旧逻辑）

**验收标准**:
- [ ] 如果所有 items 都没有 ID，回退到旧逻辑
- [ ] 旧逻辑与当前实现完全一致
- [ ] 记录日志说明使用了 legacy mode

**依赖**: Task 1

---

## Task 4: 添加 upsertBOMItems 单元测试

**描述**: 为 upsertBOMItems 函数编写全面的单元测试

**文件**: `server/services/bom_service_test.go`

**子任务**:
1. 测试用例：全新增（所有 items 无 ID）
2. 测试用例：全更新（所有 items 有 ID 且存在）
3. 测试用例：混合操作（新增 + 更新 + 删除）
4. 测试用例：ID 冲突（前端 ID 与其他 BOM 冲突）
5. 测试用例：空列表（删除所有 items）

**验收标准**:
- [ ] 所有测试用例通过
- [ ] 测试覆盖率 > 90%
- [ ] 测试包含边界情况

**依赖**: Task 1

---

## Task 5: 添加 SaveBOM 集成测试

**描述**: 测试 SaveBOM 的 ID 稳定性

**文件**: `server/services/bom_service_integration_test.go`

**子任务**:
1. 测试场景：保存后 ID 稳定性
2. 测试场景：并发保存（乐观锁）
3. 测试场景：大型 BOM（1000+ 行）性能

**验收标准**:
- [ ] 修改部分 items 后，未修改的 items ID 不变
- [ ] 并发保存时乐观锁正常工作
- [ ] 1000 行 BOM 保存耗时 < 2 秒

**依赖**: Task 2

---

## Task 6: 性能基准测试

**描述**: 对比新旧实现的性能差异

**文件**: `server/services/bom_service_benchmark_test.go`

**子任务**:
1. 编写 Benchmark：旧逻辑（物理删除 + 重新插入）
2. 编写 Benchmark：新逻辑（智能 Upsert）
3. 对比不同规模 BOM 的性能（10, 100, 1000 行）

**验收标准**:
- [ ] 新逻辑性能优于旧逻辑
- [ ] 1000 行 BOM 数据库操作减少 90%+
- [ ] 生成性能报告

**依赖**: Task 2

---

## Task 7: 增强审计日志记录

**描述**: 在审计日志中记录 Upsert 操作统计

**文件**: `server/services/bom_service.go`

**子任务**:
1. 在 SaveBOM 中获取 UpsertResult
2. 将统计信息添加到审计 payload
3. 记录详细的 item 级别变更（可选）

**验收标准**:
- [ ] 审计日志包含 itemsChanged 字段
- [ ] 记录 created, updated, deleted 数量
- [ ] 不破坏现有审计逻辑

**依赖**: Task 2

---

## Task 8: 前端修改保存逻辑发送 ID

**描述**: 修改前端保存逻辑，在 payload 中包含 BOMItemID

**文件**: `client/src/features/bom/hooks/use-bom-workspace.ts`

**子任务**:
1. 找到 saveBOM 函数
2. 修改 payload 构建逻辑，包含 id 字段
3. 添加 version 字段（乐观锁）

**验收标准**:
- [ ] payload 中包含 items[].id
- [ ] payload 中包含 version
- [ ] 不破坏现有保存逻辑

**依赖**: Task 2（后端先部署，前端再适配）

---

## Task 9: 前端实现增量更新

**描述**: 保存后增量更新状态，而非全量替换

**文件**: `client/src/features/bom/hooks/use-bom-workspace.ts`

**子任务**:
1. 实现 updateBOMIncrementally 函数
2. 修改 saveBOM 成功后的处理逻辑
3. 保留前端状态（isExpanded, scrollPosition 等）

**验收标准**:
- [ ] 保存后仅更新变更的 items
- [ ] 保存后展开/折叠状态保持
- [ ] 保存后滚动位置保持

**依赖**: Task 8

---

## Task 10: 前端新增物料时预生成 ID

**描述**: 用户添加物料时，前端预生成 UUID

**文件**: `client/src/features/bom/hooks/use-bom-workspace.ts`

**子任务**:
1. 安装 uuid 库（如果未安装）
2. 修改 addItem 函数，生成 UUID
3. 确保 ID 格式与后端一致

**验收标准**:
- [ ] 新增物料时有 ID
- [ ] ID 格式为 UUID v4
- [ ] 保存后 ID 保持不变

**依赖**: Task 8

---

## Task 11: 前端 E2E 测试

**描述**: 测试保存后状态保持

**文件**: `client/e2e/bom-save.spec.ts`

**子任务**:
1. 测试场景：保存后展开/折叠状态保持
2. 测试场景：保存后滚动位置保持
3. 测试场景：大型 BOM 保存性能

**验收标准**:
- [ ] 所有 E2E 测试通过
- [ ] 测试覆盖关键用户场景

**依赖**: Task 9

---

## Task 12: 数据库索引验证

**描述**: 确保必要的索引存在

**文件**: `server/migrations/verify_bom_indexes.sql`

**子任务**:
1. 检查 bom_items.bom_id 索引
2. 检查 bom_items.id 索引（主键）
3. 如果缺失，创建索引

**验收标准**:
- [ ] idx_bom_items_bom_id 存在
- [ ] 主键索引存在
- [ ] 查询性能符合预期

**依赖**: 无（可并行）

---

## Task 13: 部署到预生产环境

**描述**: 将后端和前端部署到预生产环境

**子任务**:
1. 部署后端代码
2. 执行数据库迁移（如果有）
3. 部署前端代码
4. 验证功能正常

**验收标准**:
- [ ] 预生产环境部署成功
- [ ] 功能测试通过
- [ ] 性能测试通过

**依赖**: Task 1-11

---

## Task 14: 生产环境部署

**描述**: 将代码部署到生产环境

**子任务**:
1. 备份生产数据库
2. 部署后端代码
3. 部署前端代码
4. 监控错误日志

**验收标准**:
- [ ] 生产环境部署成功
- [ ] 无错误日志
- [ ] 用户反馈正常

**依赖**: Task 13

---

## Task 15: 监控与优化

**描述**: 监控生产环境性能，收集用户反馈

**子任务**:
1. 监控 API 响应时间
2. 监控数据库查询性能
3. 收集用户反馈
4. 修复发现的问题

**验收标准**:
- [ ] API 响应时间符合预期（< 2 秒）
- [ ] 无用户投诉
- [ ] 性能指标达标

**依赖**: Task 14

---

## 任务依赖图

```
Task 1 (upsertBOMItems)
  ├─→ Task 2 (修改 SaveBOM)
  │     ├─→ Task 5 (集成测试)
  │     ├─→ Task 6 (性能测试)
  │     ├─→ Task 7 (审计日志)
  │     └─→ Task 8 (前端发送 ID)
  │           ├─→ Task 9 (增量更新)
  │           │     └─→ Task 11 (E2E 测试)
  │           └─→ Task 10 (预生成 ID)
  ├─→ Task 3 (兼容性)
  └─→ Task 4 (单元测试)

Task 12 (索引验证) [并行]

Task 13 (预生产部署)
  └─→ Task 14 (生产部署)
        └─→ Task 15 (监控优化)
```

---

## 实施计划

### Week 1: 后端实现

**Day 1-2**:
- [ ] Task 1: 实现 upsertBOMItems
- [ ] Task 3: 实现兼容性回退
- [ ] Task 4: 单元测试

**Day 3**:
- [ ] Task 2: 修改 SaveBOM
- [ ] Task 7: 增强审计日志

**Day 4**:
- [ ] Task 5: 集成测试
- [ ] Task 6: 性能基准测试
- [ ] Task 12: 索引验证

**Day 5**:
- [ ] 代码审查
- [ ] 修复发现的问题
- [ ] Task 13: 部署到预生产环境

---

### Week 2: 前端实现与部署

**Day 1-2**:
- [ ] Task 8: 前端发送 ID
- [ ] Task 10: 预生成 ID

**Day 3**:
- [ ] Task 9: 增量更新
- [ ] Task 11: E2E 测试

**Day 4**:
- [ ] 前端代码审查
- [ ] 修复发现的问题
- [ ] Task 14: 生产环境部署

**Day 5**:
- [ ] Task 15: 监控与优化
- [ ] 收集用户反馈
- [ ] 编写总结文档

---

## 风险与缓解

### 风险 1: ID 冲突
**概率**: 低  
**影响**: 高  
**缓解**: 使用 UUID v4，冲突概率极低；后端检查 ID 是否已存在

### 风险 2: 并发冲突
**概率**: 中  
**影响**: 中  
**缓解**: 使用乐观锁（version 字段）

### 风险 3: 性能下降
**概率**: 低  
**影响**: 高  
**缓解**: 性能基准测试；批量操作优化

### 风险 4: 前端兼容性
**概率**: 中  
**影响**: 中  
**缓解**: 后端兼容旧版本前端；逐步迁移

---

## 成功标准

### 性能指标
- [ ] 1000 行 BOM 保存耗时 < 2 秒
- [ ] 前端渲染耗时 < 0.5 秒
- [ ] 数据库操作减少 90%+

### 用户体验指标
- [ ] 保存后展开/折叠状态保持
- [ ] 保存后滚动位置保持
- [ ] 无用户投诉

### 数据完整性指标
- [ ] 审计日志可追踪行级别变更
- [ ] 历史版本可完整还原
- [ ] 无数据丢失

---

**文档版本**: v1.0  
**创建日期**: 2026-05-13  
**作者**: Kiro AI Assistant
