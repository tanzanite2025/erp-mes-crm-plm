# BOM 模块架构重构 - 设计文档

## 概述

**设计版本**: v1.0  
**创建日期**: 2026-05-13  
**设计原则**: CQRS + 后端投影 + 智能 Upsert + GORM 钩子 + OpenAPI

---

## 设计决策总结

基于需求分析，我们选择了以下技术方案：

1. **树投影逻辑**: 后端提供完整的树投影 API
2. **ID 稳定性**: 智能 Upsert 机制
3. **服务拆分**: CQRS 模式（读写分离）
4. **审计快照**: GORM 钩子自动化
5. **前后端校验**: OpenAPI + 代码生成

---

## 高层架构设计

### 当前架构（Before）

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 React                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  use-bom-workspace-projection.ts (500+ 行)          │  │
│  │  - 树解析逻辑                                         │  │
│  │  - 层级计算                                           │  │
│  │  - 节点折叠                                           │  │
│  │  - 业务规则                                           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                      后端 Go 服务                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  bom_service.go (830+ 行)                           │  │
│  │  - 查询 + 保存 + 删除 + 派生 + 状态流转              │  │
│  │  - 循环引用检查                                       │  │
│  │  - 手动审计调用                                       │  │
│  │  - 物理删除 + 重新插入                                │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  engineering_audit.go                                │  │
│  │  - 手动字段映射                                       │  │
│  │  - 容易遗漏新字段                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**问题**:
- 前后端逻辑重复
- 服务职责不清
- ID 不稳定导致前端全量重绘
- 审计快照手动维护

---

### 目标架构（After）

```
┌─────────────────────────────────────────────────────────────┐
│                        前端 React                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  use-bom-workspace.ts (简化至 200 行)                │  │
│  │  - 仅负责渲染                                         │  │
│  │  - 状态管理                                           │  │
│  │  - 用户交互                                           │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  自动生成的 TypeScript 类型 (from OpenAPI)           │  │
│  │  - Zod Schema                                        │  │
│  │  - API Client                                        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTP
┌─────────────────────────────────────────────────────────────┐
│                      后端 Go 服务                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BOMQueryService (只读)                              │  │
│  │  - GetBOMByID                                        │  │
│  │  - GetBOMProjection (新增 - 树投影)                  │  │
│  │  - ListBOMs                                          │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  BOMCommandService (写入)                            │  │
│  │  - SaveBOM (智能 Upsert)                             │  │
│  │  - DeriveMBOM                                        │  │
│  │  - PromoteBOMStatus                                  │  │
│  │  - DeleteBOM                                         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  GORM 钩子 (自动审计)                                │  │
│  │  - AfterCreate → 自动快照                            │  │
│  │  - AfterUpdate → 自动快照                            │  │
│  │  - AfterDelete → 自动快照                            │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

**改进**:
- 前端简化，仅负责渲染
- 服务职责清晰（CQRS）
- ID 稳定，支持增量更新
- 审计快照自动化

---

## 详细设计

### 1. 树投影逻辑 - 后端 API

#### 新增 API: GET /api/v1/engineering/bom/:id/projection

**功能**: 返回已经计算好的树结构，包含层级、折叠状态、节点类型等

**请求参数**:
```typescript
interface BOMProjectionQuery {
  expandedNodeIds?: string[];  // 展开的节点 ID 列表
  collapsedNodeIds?: string[]; // 折叠的节点 ID 列表
  viewMode?: 'tree' | 'flat';  // 视图模式
}
```

**响应结构**:
```typescript
interface BOMProjectionResponse {
  bomId: string;
  bomNo: string;
  productId: string;
  nodes: BOMProjectionNode[];
  metadata: {
    totalNodes: number;
    maxDepth: number;
    visibleNodes: number;
  };
}

interface BOMProjectionNode {
  id: string;                    // BOMItemID
  nodeType: 'root' | 'branch' | 'leaf';
  level: number;                 // 层级（0 = 根节点）
  path: string[];                // 路径（从根到当前节点的 ID 列表）
  parentId: string | null;
  materialId: string;
  materialCode: string;
  materialName: string;
  section: string;
  unitUsage: number;
  sortOrder: number;
  isCollapsible: boolean;        // 是否可折叠
  isExpanded: boolean;           // 是否展开
  hasChildren: boolean;
  childrenCount: number;
  // ... 其他字段
}
```

**后端实现**:
```go
// server/services/bom_query_service.go
func (s *BOMQueryService) GetBOMProjection(ctx context.Context, bomID string, query BOMProjectionQuery) (*BOMProjectionResponse, error) {
    // 1. 获取 BOM 数据
    bom, err := s.GetBOMByID(ctx, bomID)
    if err != nil {
        return nil, err
    }
    
    // 2. 解析 RelationSidecar，构建树结构
    tree, err := s.buildTreeFromSidecar(bom.RelationSidecar, bom.Items)
    if err != nil {
        return nil, err
    }
    
    // 3. 计算层级和路径
    nodes := s.calculateNodeLevels(tree)
    
    // 4. 应用展开/折叠状态
    nodes = s.applyExpandCollapseState(nodes, query.ExpandedNodeIds, query.CollapsedNodeIds)
    
    // 5. 返回投影结果
    return &BOMProjectionResponse{
        BOMID: bom.ID,
        BOMNo: bom.BOMNo,
        ProductID: bom.ProductID,
        Nodes: nodes,
        Metadata: s.calculateMetadata(nodes),
    }, nil
}
```

**前端使用**:
```typescript
// 前端仅需调用 API，无需自己计算树结构
const { data: projection } = useQuery({
  queryKey: ['bom-projection', bomId, expandedNodeIds],
  queryFn: () => api.getBOMProjection(bomId, { expandedNodeIds })
});

// 直接渲染
return projection.nodes.map(node => (
  <BOMTreeNode key={node.id} node={node} />
));
```

---

