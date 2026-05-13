# BOM 树投影逻辑统一 - 需求文档

**Spec ID**: `bom-tree-projection-unification`  
**创建日期**: 2026-05-13  
**优先级**: High  
**类型**: Architecture Refactoring

---

## 问题陈述

### 核心问题：树投影逻辑的双重实现 (Projection Logic Duplication)

当前 BOM 模块存在严重的逻辑重复问题：

**后端实现** (`server/services/bom_sidecar_contract.go`):
- 定义了完整的树结构协议（`BOMRelationSidecar`）
- 实现了树结构的验证逻辑
- 定义了节点类型（`branch`, `item`）和角色（`section`, `collection`）
- 负责树的"正确性"保证

**前端实现** (`src/features/product-structure/hooks/`):
- `bom-workspace-source-model.ts`: 重新实现了树结构解析
- `use-bom-workspace-projection.ts`: 实现了层级计算、节点折叠逻辑
- `bom-workspace-branch-relation-builder.ts`: 实现了树构建逻辑
- 大量硬编码的展现逻辑（如 `isCollapsibleCollectionSourceBranchNode`）

### 问题影响

1. **维护成本高**：
   - 任何树协议的变更（如新增 `NodeKind`）需要在前后端两处同步修改
   - 前后端类型定义容易失同步，导致运行时错误

2. **测试困难**：
   - 前端测试文件因类型失同步而崩溃
   - 需要同时维护前后端两套测试

3. **职责不清**：
   - 后端负责"正确性"，前端负责"展现"，但边界模糊
   - 复杂的折叠规则硬编码在前端 Hook 中

4. **扩展性差**：
   - 新增节点类型或角色需要修改多处代码
   - 难以支持动态的树结构配置

---

## 用户故事

### Story 1: 作为后端开发者，我希望树结构协议的变更不需要前端同步修改

**场景**:
- 产品经理要求新增一种节点类型 `NodeKind = "virtual"`（虚拟节点，用于分组）
- 当前需要修改：
  1. 后端：`bom_sidecar_contract.go` 的验证逻辑
  2. 前端：`bom-workspace-source-model.ts` 的类型定义
  3. 前端：`use-bom-workspace-projection.ts` 的渲染逻辑
  4. 前端：测试文件的 mock 数据

**期望**:
- 只需修改后端协议定义
- 前端自动适配新的节点类型
- 测试无需修改

### Story 2: 作为前端开发者，我希望树的展现逻辑由后端统一提供

**场景**:
- 需要实现"折叠所有空节点"功能
- 当前需要在前端实现复杂的遍历逻辑：
  ```typescript
  function isCollapsibleCollectionSourceBranchNode(node) {
    return node.branchRole === 'collection' && 
           node.childNodeIds.length === 0 &&
           // ... 更多复杂条件
  }
  ```

**期望**:
- 后端提供 API：`GET /api/bom/:id/tree-projection?collapseEmpty=true`
- 前端直接使用后端返回的树结构
- 无需实现复杂的折叠逻辑

### Story 3: 作为测试工程师，我希望前后端共享同一套树结构测试数据

**场景**:
- 编写 BOM 树结构的集成测试
- 当前需要：
  1. 后端：准备 `RelationSidecar` JSON
  2. 前端：准备对应的 TypeScript 类型数据
  3. 手动确保两者一致

**期望**:
- 使用 OpenAPI/JSON Schema 定义树结构
- 前后端自动生成类型定义
- 共享测试数据文件

---

## 功能需求

### FR-1: 后端提供完整的树投影 API

**描述**: 后端提供 RESTful API，返回完整的树投影数据，包括：
- 节点层级信息
- 展开/折叠状态建议
- 节点元数据（图标、颜色、标签等）

**API 设计**:
```
GET /api/bom/:id/tree-projection
Query Parameters:
  - collapseEmpty: boolean (是否折叠空节点)
  - maxDepth: number (最大展开深度)
  - expandedNodeIds: string[] (已展开的节点 ID 列表)

Response:
{
  "rootNodeId": "root",
  "nodes": [
    {
      "nodeId": "node-1",
      "parentNodeId": null,
      "childNodeIds": ["node-2", "node-3"],
      "nodeKind": "branch",
      "branchRole": "section",
      "label": "主材料",
      "sectionCode": "MAIN",
      "depth": 0,
      "isCollapsible": true,
      "isCollapsed": false,
      "metadata": {
        "icon": "folder",
        "color": "#1890ff"
      }
    },
    // ... more nodes
  ]
}
```

### FR-2: 前端使用后端提供的树投影数据

**描述**: 前端移除本地的树构建逻辑，直接使用后端返回的树投影数据

**变更**:
- 移除 `bom-workspace-branch-relation-builder.ts` 的树构建逻辑
- 简化 `use-bom-workspace-projection.ts` 为简单的数据映射
- 保留前端的交互状态管理（展开/折叠、选中等）

### FR-3: 使用 OpenAPI 定义树结构协议

**描述**: 使用 OpenAPI 3.0 定义树结构协议，前后端自动生成类型定义

**文件**: `api/openapi/bom-tree-projection.yaml`

**生成**:
- 后端：生成 Go 结构体
- 前端：生成 TypeScript 类型
- 文档：生成 API 文档

### FR-4: 后端提供树结构验证服务

**描述**: 后端提供独立的树结构验证服务，供前端在保存前调用

**API 设计**:
```
POST /api/bom/validate-tree-structure
Request Body:
{
  "relationSidecar": { ... }
}

Response:
{
  "valid": true,
  "errors": []
}
```

---

## 非功能需求

### NFR-1: 性能

- 树投影 API 响应时间 < 500ms（1000 节点）
- 前端渲染时间 < 200ms（1000 节点）

### NFR-2: 兼容性

- 支持旧版本前端（逐步迁移）
- 后端同时支持旧协议和新协议

### NFR-3: 可测试性

- 前后端共享测试数据
- 100% 单元测试覆盖率
- 集成测试覆盖所有节点类型

---

## 验收标准

### AC-1: 后端 API 实现

- [ ] 实现 `GET /api/bom/:id/tree-projection` API
- [ ] 支持 `collapseEmpty`, `maxDepth`, `expandedNodeIds` 参数
- [ ] 返回完整的树投影数据（包括 metadata）
- [ ] 响应时间 < 500ms（1000 节点）

### AC-2: 前端重构

- [ ] 移除 `bom-workspace-branch-relation-builder.ts` 的树构建逻辑
- [ ] 简化 `use-bom-workspace-projection.ts` 为数据映射
- [ ] 前端渲染时间 < 200ms（1000 节点）
- [ ] 所有现有功能正常工作（展开/折叠、拖拽、编辑等）

### AC-3: OpenAPI 定义

- [ ] 创建 `api/openapi/bom-tree-projection.yaml`
- [ ] 自动生成后端 Go 结构体
- [ ] 自动生成前端 TypeScript 类型
- [ ] 生成 API 文档

### AC-4: 测试覆盖

- [ ] 后端单元测试覆盖率 > 90%
- [ ] 前端单元测试覆盖率 > 90%
- [ ] 集成测试覆盖所有节点类型和角色
- [ ] 前后端共享测试数据文件

### AC-5: 文档

- [ ] 更新架构文档，说明新的树投影机制
- [ ] 更新 API 文档
- [ ] 编写迁移指南（旧版本前端 → 新版本前端）

---

## 约束条件

1. **向后兼容**: 必须支持旧版本前端，不能破坏现有功能
2. **渐进式迁移**: 允许前端逐步迁移到新 API
3. **性能要求**: 不能降低现有性能
4. **数据一致性**: 树投影数据必须与 `RelationSidecar` 一致

---

## 风险与缓解

### 风险 1: 性能下降

**描述**: 后端生成树投影可能比前端本地计算慢

**概率**: 中  
**影响**: 高

**缓解措施**:
- 实现树投影缓存（Redis）
- 使用增量更新（只更新变更的节点）
- 性能基准测试，确保不低于现有性能

### 风险 2: 前端迁移成本高

**描述**: 前端代码重构工作量大，可能引入新 bug

**概率**: 高  
**影响**: 中

**缓解措施**:
- 分阶段迁移（先只读，再编辑）
- 保留旧代码作为 fallback
- 充分的集成测试和 E2E 测试

### 风险 3: OpenAPI 生成的类型不符合预期

**描述**: 自动生成的类型可能不够灵活或不符合现有代码风格

**概率**: 中  
**影响**: 中

**缓解措施**:
- 使用成熟的代码生成工具（如 `openapi-generator`）
- 允许手动调整生成的代码
- 编写类型适配层

---

## 依赖关系

- **依赖**: 无（独立 spec）
- **被依赖**: 
  - `bom-id-stability`: 树投影 API 需要支持 ID 稳定性
  - 未来的 BOM 功能增强（如多层级 BOM、虚拟节点等）

---

## 参考资料

- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [JSON Schema](https://json-schema.org/)
- [Tree Projection Pattern](https://martinfowler.com/eaaCatalog/dataTransferObject.html)

---

**文档版本**: v1.0  
**创建日期**: 2026-05-13  
**作者**: Kiro AI Assistant
