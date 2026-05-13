# BOM 树投影逻辑统一

**Spec ID**: `bom-tree-projection-unification`  
**状态**: 📝 Design Phase  
**优先级**: High  
**创建日期**: 2026-05-13

---

## 快速概览

### 问题

当前 BOM 模块存在严重的**逻辑重复**问题：

- **后端** (`bom_sidecar_contract.go`): 定义树结构协议和验证逻辑
- **前端** (`bom-workspace-source-model.ts`, `use-bom-workspace-projection.ts`): 重新实现树解析、层级计算、折叠逻辑

**后果**:
- 任何协议变更需要前后端同步修改
- 类型容易失同步，导致运行时错误
- 维护成本高，测试困难

### 解决方案

将树投影逻辑从"前后端双重实现"改为"后端统一提供，前端消费"：

```
后端提供完整的树投影 API
    ↓
前端直接使用后端返回的树结构
    ↓
使用 OpenAPI 确保类型同步
```

---

## 核心设计

### 1. 后端 API

```
GET /api/bom/:id/tree-projection
Query Parameters:
  - collapseEmpty: boolean
  - maxDepth: number
  - expandedNodeIds: string[]

Response:
{
  "rootNodeId": "root",
  "nodes": [
    {
      "nodeId": "node-1",
      "parentNodeId": null,
      "childNodeIds": ["node-2"],
      "nodeKind": "branch",
      "branchRole": "section",
      "label": "主材料",
      "depth": 0,
      "isCollapsible": true,
      "isCollapsed": false,
      "metadata": {
        "icon": "folder",
        "color": "#1890ff",
        "isEmpty": false,
        "childCount": 1
      }
    }
  ]
}
```

### 2. 前端 Hook

```typescript
// 简化的 Hook，直接使用后端数据
const { nodes, nodeById, toggleNode, expandAll } = useBOMWorkspaceProjection(bomId)
```

### 3. OpenAPI 定义

```yaml
# api/openapi/bom-tree-projection.yaml
openapi: 3.0.0
paths:
  /api/bom/{id}/tree-projection:
    get:
      summary: 获取 BOM 树投影
      # ...
```

---

## 关键收益

### ✅ 单一数据源
- 树投影逻辑只在后端实现一次
- 前端无需重复实现复杂的树构建逻辑

### ✅ 类型自动同步
- 使用 OpenAPI 定义协议
- 自动生成前后端类型定义
- 编译时发现类型不匹配

### ✅ 易于测试
- 后端单元测试覆盖所有逻辑
- 前端只需测试 UI 交互
- 前后端共享测试数据

### ✅ 易于扩展
- 新增节点类型只需修改后端
- 前端自动适配
- 支持动态配置

---

## 实施计划

### Phase 1: 后端实现（Week 1）
- [ ] 实现 `BuildTreeProjection` 函数
- [ ] 实现 `GET /api/bom/:id/tree-projection` API
- [ ] 添加单元测试和集成测试
- [ ] 性能基准测试（目标: < 500ms for 1000 nodes）

### Phase 2: 前端适配（Week 2）
- [ ] 创建 `useBOMTreeProjection` Hook
- [ ] 简化 `useBOMWorkspaceProjection` Hook
- [ ] 更新 UI 组件
- [ ] E2E 测试

### Phase 3: 清理旧代码（Week 3）
- [ ] 移除 `bom-workspace-branch-relation-builder.ts`
- [ ] 移除旧的树构建逻辑
- [ ] 更新文档
- [ ] 代码审查

---

## 性能目标

| 指标 | 目标 | 当前 |
|------|------|------|
| API 响应时间 (1000 nodes) | < 500ms | N/A |
| 前端渲染时间 (1000 nodes) | < 200ms | ~300ms |
| 缓存命中率 | > 80% | N/A |

---

## 风险与缓解

### 风险 1: 性能下降
**缓解**: 
- 实现 Redis 缓存
- 增量更新机制
- 性能基准测试

### 风险 2: 前端迁移成本高
**缓解**:
- 分阶段迁移
- 保留旧代码作为 fallback
- 充分的集成测试

### 风险 3: OpenAPI 生成的类型不符合预期
**缓解**:
- 使用成熟的代码生成工具
- 允许手动调整
- 编写类型适配层

---

## 文档结构

```
.kiro/specs/bom-tree-projection-unification/
├── README.md           # 本文件（概览）
├── requirements.md     # 详细需求（用户故事、验收标准）
├── design.md           # 详细设计（技术方案、API 设计）
└── tasks.md            # 任务列表（待创建）
```

---

## 相关资源

- **后端代码**: `server/services/bom_sidecar_contract.go`
- **前端代码**: `src/features/product-structure/hooks/`
- **OpenAPI 定义**: `api/openapi/bom-tree-projection.yaml` (待创建)
- **相关 Spec**: `bom-id-stability` (已完成 Task 1-4)

---

## 下一步

1. **Review**: 团队审查需求和设计文档
2. **Decision**: 确认技术方案（方案 A + 方案 C）
3. **Tasks**: 创建详细的任务列表（tasks.md）
4. **Implementation**: 开始 Phase 1 实施

---

**文档版本**: v1.0  
**最后更新**: 2026-05-13  
**作者**: Kiro AI Assistant  
**审核人**: 待定
