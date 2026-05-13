# BOM 树投影逻辑统一 - 任务列表

**Spec ID**: `bom-tree-projection-unification`  
**创建日期**: 2026-05-13  
**状态**: 📝 Planning

---

## 任务概览

**总任务数**: 15  
**预计工期**: 3 周  
**并行度**: 部分任务可并行

---

## Phase 1: 后端实现（Week 1）

### Task 1: 创建树投影数据结构

**描述**: 定义后端的树投影数据结构

**文件**: `server/services/bom_tree_projection_types.go`

**子任务**:
1. 创建 `TreeProjectionNode` 结构体
2. 创建 `TreeProjectionMetadata` 结构体
3. 创建 `TreeProjectionResponse` 结构体
4. 创建 `TreeProjectionRequest` 结构体

**验收标准**:
- [ ] 所有结构体定义完整
- [ ] 包含必要的 JSON 标签
- [ ] 代码编译通过

**依赖**: 无

---

### Task 2: 实现树投影核心算法

**描述**: 实现 `BuildTreeProjection` 函数

**文件**: `server/services/bom_tree_projection.go`

**子任务**:
1. 实现 `buildNodeMap` 函数（构建节点映射）
2. 实现 `calculateNodeDepth` 函数（计算节点深度）
3. 实现 `calculateCollapseState` 函数（计算折叠状态）
4. 实现 `generateMetadata` 函数（生成元数据）
5. 实现 `BuildTreeProjection` 主函数

**验收标准**:
- [ ] 正确解析 `RelationSidecar`
- [ ] 正确计算节点深度
- [ ] 正确计算折叠状态
- [ ] 正确生成元数据（图标、颜色、徽章）
- [ ] 支持 `collapseEmpty`, `maxDepth`, `expandedNodeIds` 参数

**依赖**: Task 1

---

### Task 3: 实现树投影 API

**描述**: 实现 `GET /api/bom/:id/tree-projection` API

**文件**: `server/handlers/bom_tree_projection.go`

**子任务**:
1. 创建 `GetBOMTreeProjection` handler
2. 解析请求参数
3. 调用 `BuildTreeProjection` 函数
4. 返回 JSON 响应
5. 添加错误处理

**验收标准**:
- [ ] API 正常响应
- [ ] 支持所有查询参数
- [ ] 错误处理完善（404, 500 等）
- [ ] 响应时间 < 500ms（1000 节点）

**依赖**: Task 2

---

### Task 4: 添加路由

**描述**: 在路由中注册树投影 API

**文件**: `server/routes/routes.go`

**子任务**:
1. 添加 `/api/bom/:id/tree-projection` 路由
2. 绑定 `GetBOMTreeProjection` handler
3. 添加必要的中间件（认证、权限等）

**验收标准**:
- [ ] 路由注册成功
- [ ] 中间件正常工作
- [ ] 可以通过 Postman/curl 访问

**依赖**: Task 3

---

### Task 5: 添加单元测试

**描述**: 为树投影核心算法添加单元测试

**文件**: `server/services/bom_tree_projection_test.go`

**子任务**:
1. 测试用例：简单树结构（1 个 section，3 个 items）
2. 测试用例：复杂树结构（多层嵌套）
3. 测试用例：空树（无 items）
4. 测试用例：折叠空节点
5. 测试用例：最大深度限制
6. 测试用例：展开指定节点

**验收标准**:
- [ ] 所有测试用例通过
- [ ] 测试覆盖率 > 90%
- [ ] 测试包含边界情况

**依赖**: Task 2

---

### Task 6: 添加集成测试

**描述**: 测试完整的 API 流程

**文件**: `server/handlers/bom_tree_projection_test.go`

**子任务**:
1. 测试场景：获取树投影（正常情况）
2. 测试场景：BOM 不存在（404）
3. 测试场景：无效参数（400）
4. 测试场景：大型 BOM（1000+ 节点）性能

**验收标准**:
- [ ] 所有测试场景通过
- [ ] API 响应时间 < 500ms（1000 节点）
- [ ] 错误处理正确

**依赖**: Task 3, Task 4

---

### Task 7: 性能优化（可选）

**描述**: 添加缓存和性能优化

**文件**: `server/services/bom_tree_projection_cache.go`

**子任务**:
1. 实现 Redis 缓存
2. 实现缓存失效机制
3. 性能基准测试

**验收标准**:
- [ ] 缓存命中率 > 80%
- [ ] 缓存失效正确
- [ ] 性能提升 > 50%

**依赖**: Task 3

---

## Phase 2: 前端实现（Week 2）

### Task 8: 创建 API 客户端

**描述**: 创建前端的树投影 API 客户端

**文件**: `src/features/product-structure/api/bom-tree-projection.ts`

**子任务**:
1. 定义 TypeScript 类型（`TreeProjectionNode`, `TreeProjectionResponse` 等）
2. 实现 `getBOMTreeProjection` 函数
3. 添加错误处理

**验收标准**:
- [ ] 类型定义完整
- [ ] API 调用正常
- [ ] 错误处理完善

**依赖**: Task 3（后端 API 已实现）

---

### Task 9: 创建 React Hook

**描述**: 创建 `useBOMTreeProjection` Hook

**文件**: `src/features/product-structure/hooks/use-bom-tree-projection.ts`

**子任务**:
1. 使用 `@tanstack/react-query` 封装 API 调用
2. 添加缓存策略（5 分钟）
3. 添加错误处理和重试逻辑

**验收标准**:
- [ ] Hook 正常工作
- [ ] 缓存策略生效
- [ ] 错误处理完善

**依赖**: Task 8

---

### Task 10: 简化 Workspace Hook

**描述**: 简化 `useBOMWorkspaceProjection` Hook

**文件**: `src/features/product-structure/hooks/use-bom-workspace-projection.ts`

**子任务**:
1. 移除本地的树构建逻辑
2. 使用 `useBOMTreeProjection` 获取数据
3. 保留交互状态管理（展开/折叠、选中等）
4. 实现 `toggleNode`, `expandAll`, `collapseAll` 等操作

**验收标准**:
- [ ] Hook 代码量减少 > 50%
- [ ] 所有现有功能正常工作
- [ ] 性能不低于现有实现

**依赖**: Task 9

---

### Task 11: 更新 UI 组件

**描述**: 更新 BOM 编辑器组件使用新 Hook

**文件**: `src/features/product-structure/components/bom-editor/`

**子任务**:
1. 更新 `bom-table.tsx` 使用新 Hook
2. 更新 `primary-material-cell.tsx` 使用新数据结构
3. 测试所有交互功能（展开/折叠、拖拽、编辑等）

**验收标准**:
- [ ] 所有 UI 功能正常
- [ ] 渲染性能 < 200ms（1000 节点）
- [ ] 无视觉回归

**依赖**: Task 10

---

### Task 12: 添加前端测试

**描述**: 为新 Hook 添加单元测试

**文件**: `src/features/product-structure/hooks/use-bom-tree-projection.test.ts`

**子任务**:
1. 测试用例：正常获取树投影
2. 测试用例：API 错误处理
3. 测试用例：缓存策略
4. 测试用例：展开/折叠操作

**验收标准**:
- [ ] 所有测试用例通过
- [ ] 测试覆盖率 > 80%

**依赖**: Task 9, Task 10

---

### Task 13: E2E 测试

**描述**: 添加端到端测试

**文件**: `e2e/bom-tree-projection.spec.ts`

**子任务**:
1. 测试场景：打开 BOM 编辑器
2. 测试场景：展开/折叠节点
3. 测试场景：编辑物料
4. 测试场景：保存 BOM

**验收标准**:
- [ ] 所有 E2E 测试通过
- [ ] 测试覆盖关键用户场景

**依赖**: Task 11

---

## Phase 3: 清理与文档（Week 3）

### Task 14: 移除旧代码

**描述**: 移除前端的旧树构建逻辑

**文件**: 
- `src/features/product-structure/hooks/bom-workspace-branch-relation-builder.ts`
- `src/features/product-structure/hooks/bom-workspace-source-model.ts`

**子任务**:
1. 确认所有功能已迁移到新实现
2. 移除 `bom-workspace-branch-relation-builder.ts`
3. 移除 `bom-workspace-source-model.ts` 中的旧逻辑
4. 更新相关的 import 语句

**验收标准**:
- [ ] 旧代码完全移除
- [ ] 代码编译通过
- [ ] 所有测试通过

**依赖**: Task 11, Task 12, Task 13

---

### Task 15: 更新文档

**描述**: 更新架构文档和 API 文档

**文件**: 
- `docs/architecture/bom-tree-projection.md`
- `docs/api/bom-tree-projection.md`

**子任务**:
1. 编写架构文档，说明新的树投影机制
2. 编写 API 文档（使用 OpenAPI 生成）
3. 编写迁移指南（旧版本 → 新版本）
4. 更新 README

**验收标准**:
- [ ] 架构文档完整
- [ ] API 文档完整
- [ ] 迁移指南清晰

**依赖**: Task 14

---

## 任务依赖图

```
Phase 1 (后端)
Task 1 (数据结构)
  └─→ Task 2 (核心算法)
        ├─→ Task 3 (API)
        │     └─→ Task 4 (路由)
        │           └─→ Task 6 (集成测试)
        │                 └─→ Task 7 (性能优化) [可选]
        └─→ Task 5 (单元测试)

Phase 2 (前端)
Task 8 (API 客户端)
  └─→ Task 9 (React Hook)
        └─→ Task 10 (简化 Workspace Hook)
              └─→ Task 11 (更新 UI)
                    ├─→ Task 12 (前端测试)
                    └─→ Task 13 (E2E 测试)

Phase 3 (清理)
Task 14 (移除旧代码)
  └─→ Task 15 (更新文档)
```

---

## 实施计划

### Week 1: 后端实现

**Day 1-2**:
- [ ] Task 1: 创建数据结构
- [ ] Task 2: 实现核心算法
- [ ] Task 5: 添加单元测试

**Day 3**:
- [ ] Task 3: 实现 API
- [ ] Task 4: 添加路由

**Day 4**:
- [ ] Task 6: 添加集成测试
- [ ] 性能基准测试

**Day 5**:
- [ ] Task 7: 性能优化（如果需要）
- [ ] 代码审查

---

### Week 2: 前端实现

**Day 1-2**:
- [ ] Task 8: 创建 API 客户端
- [ ] Task 9: 创建 React Hook
- [ ] Task 10: 简化 Workspace Hook

**Day 3-4**:
- [ ] Task 11: 更新 UI 组件
- [ ] Task 12: 添加前端测试

**Day 5**:
- [ ] Task 13: E2E 测试
- [ ] 代码审查

---

### Week 3: 清理与文档

**Day 1-2**:
- [ ] Task 14: 移除旧代码
- [ ] 回归测试

**Day 3-4**:
- [ ] Task 15: 更新文档
- [ ] 编写迁移指南

**Day 5**:
- [ ] 最终审查
- [ ] 部署到生产环境

---

## 风险与缓解

### 风险 1: 性能不达标
**概率**: 中  
**影响**: 高  
**缓解**: Task 7 实现缓存和性能优化

### 风险 2: 前端迁移引入 bug
**概率**: 高  
**影响**: 中  
**缓解**: Task 12, Task 13 充分测试

### 风险 3: 旧代码移除导致功能缺失
**概率**: 中  
**影响**: 高  
**缓解**: Task 14 前确认所有功能已迁移

---

## 成功标准

### 性能指标
- [ ] API 响应时间 < 500ms（1000 节点）
- [ ] 前端渲染时间 < 200ms（1000 节点）
- [ ] 缓存命中率 > 80%

### 代码质量指标
- [ ] 后端测试覆盖率 > 90%
- [ ] 前端测试覆盖率 > 80%
- [ ] 代码量减少 > 30%

### 用户体验指标
- [ ] 所有现有功能正常工作
- [ ] 无性能回归
- [ ] 无视觉回归

---

**文档版本**: v1.0  
**创建日期**: 2026-05-13  
**作者**: Kiro AI Assistant
