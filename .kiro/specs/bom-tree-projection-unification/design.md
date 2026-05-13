# BOM 树投影逻辑统一 - 设计文档

**Spec ID**: `bom-tree-projection-unification`  
**创建日期**: 2026-05-13  
**设计版本**: v1.0

---

## 设计概述

### 核心思想

将树投影逻辑从"前后端双重实现"改为"后端统一提供，前端消费"的模式：

```
┌─────────────────────────────────────────────────────────────┐
│  当前架构（双重实现）                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  后端                          前端                          │
│  ┌──────────────┐            ┌──────────────┐             │
│  │ RelationSidecar│ ────────▶ │ 树解析逻辑    │             │
│  │ (JSON)        │            │ (TypeScript) │             │
│  └──────────────┘            └──────────────┘             │
│         │                            │                      │
│         │                            │                      │
│         ▼                            ▼                      │
│  ┌──────────────┐            ┌──────────────┐             │
│  │ 验证逻辑      │            │ 层级计算      │             │
│  │ (Go)         │            │ (TypeScript) │             │
│  └──────────────┘            └──────────────┘             │
│                                      │                      │
│                                      ▼                      │
│                              ┌──────────────┐             │
│                              │ 折叠逻辑      │             │
│                              │ (TypeScript) │             │
│                              └──────────────┘             │
│                                                             │
│  问题：逻辑重复，维护成本高，类型容易失同步                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  新架构（后端统一提供）                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  后端                          前端                          │
│  ┌──────────────┐                                          │
│  │ RelationSidecar│                                         │
│  │ (JSON)        │                                          │
│  └──────────────┘                                          │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐                                          │
│  │ 树投影服务    │                                          │
│  │ (Go)         │                                          │
│  │ - 验证       │                                          │
│  │ - 层级计算    │                                          │
│  │ - 折叠逻辑    │                                          │
│  │ - 元数据生成  │                                          │
│  └──────────────┘                                          │
│         │                                                    │
│         │ HTTP API                                          │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────┐            ┌──────────────┐             │
│  │ TreeProjection│ ────────▶ │ 数据映射      │             │
│  │ (JSON)        │            │ (TypeScript) │             │
│  └──────────────┘            └──────────────┘             │
│                                      │                      │
│                                      ▼                      │
│                              ┌──────────────┐             │
│                              │ UI 渲染       │             │
│                              │ (React)      │             │
│                              └──────────────┘             │
│                                                             │
│  优势：单一数据源，类型自动同步，易于测试                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 技术方案

### 方案 A: 完全后端化（推荐）

**描述**: 所有树投影逻辑移至后端，前端只负责渲染

**优点**:
- ✅ 单一数据源，逻辑统一
- ✅ 前端代码大幅简化
- ✅ 易于测试和维护
- ✅ 支持服务端渲染（SSR）

**缺点**:
- ❌ 增加后端负载
- ❌ 需要网络请求（可能有延迟）
- ❌ 前端失去部分灵活性

**适用场景**: 
- BOM 结构复杂，逻辑频繁变更
- 需要支持多端（Web、Mobile、Desktop）
- 团队后端能力强

---

### 方案 B: 混合模式

**描述**: 后端提供基础树结构，前端负责展现逻辑

**优点**:
- ✅ 平衡后端负载和前端灵活性
- ✅ 前端可以自定义展现逻辑
- ✅ 减少网络请求

**缺点**:
- ❌ 仍然存在部分逻辑重复
- ❌ 前后端职责边界模糊

**适用场景**:
- BOM 结构相对稳定
- 前端需要高度定制化
- 网络延迟敏感

---

### 方案 C: 代码生成

**描述**: 使用 OpenAPI 定义协议，自动生成前后端代码

**优点**:
- ✅ 类型自动同步
- ✅ 减少手动编码
- ✅ 文档自动生成

**缺点**:
- ❌ 需要学习 OpenAPI
- ❌ 生成的代码可能不够灵活
- ❌ 需要额外的构建步骤

**适用场景**:
- 团队熟悉 OpenAPI
- 需要严格的类型安全
- 多语言客户端（如 Mobile App）

---

## 推荐方案：方案 A + 方案 C

**组合策略**:
1. 使用 **方案 A**（完全后端化）作为核心架构
2. 使用 **方案 C**（代码生成）确保类型同步
3. 前端保留缓存和增量更新优化性能

---

## 详细设计

### 1. 后端：树投影服务

#### 1.1 数据结构

```go
// TreeProjectionNode 树投影节点（完整信息）
type TreeProjectionNode struct {
    NodeID       string                 `json:"nodeId"`
    ParentNodeID *string                `json:"parentNodeId"`
    ChildNodeIDs []string               `json:"childNodeIds"`
    NodeKind     string                 `json:"nodeKind"` // "root", "branch", "leaf"
    BranchRole   string                 `json:"branchRole,omitempty"` // "section", "collection"
    Label        string                 `json:"label"`
    SectionCode  string                 `json:"sectionCode"`
    SectionName  string                 `json:"sectionName,omitempty"`
    ItemID       string                 `json:"itemId,omitempty"` // 仅 leaf 节点
    Depth        int                    `json:"depth"` // 节点深度（0 = root）
    IsCollapsible bool                  `json:"isCollapsible"` // 是否可折叠
    IsCollapsed  bool                   `json:"isCollapsed"` // 是否已折叠
    Metadata     TreeProjectionMetadata `json:"metadata"` // 元数据
}

// TreeProjectionMetadata 节点元数据
type TreeProjectionMetadata struct {
    Icon        string `json:"icon,omitempty"` // 图标名称
    Color       string `json:"color,omitempty"` // 颜色
    Badge       string `json:"badge,omitempty"` // 徽章文本
    IsEmpty     bool   `json:"isEmpty"` // 是否为空节点
    ChildCount  int    `json:"childCount"` // 子节点数量
}

// TreeProjectionResponse API 响应
type TreeProjectionResponse struct {
    RootNodeID string               `json:"rootNodeId"`
    Nodes      []TreeProjectionNode `json:"nodes"`
    TotalCount int                  `json:"totalCount"`
}

// TreeProjectionRequest API 请求参数
type TreeProjectionRequest struct {
    CollapseEmpty    bool     `json:"collapseEmpty"` // 折叠空节点
    MaxDepth         int      `json:"maxDepth"` // 最大深度（0 = 无限制）
    ExpandedNodeIDs  []string `json:"expandedNodeIds"` // 已展开的节点 ID
}
```

#### 1.2 核心算法

```go
// BuildTreeProjection 构建树投影
func BuildTreeProjection(
    bom models.BOM,
    request TreeProjectionRequest,
) (*TreeProjectionResponse, error) {
    // Step 1: 解析 RelationSidecar
    sidecar, err := parseBOMRelationSidecar(bom.RelationSidecar)
    if err != nil {
        return nil, err
    }

    // Step 2: 构建节点映射
    nodeMap := buildNodeMap(sidecar)

    // Step 3: 计算节点深度
    calculateNodeDepth(nodeMap, sidecar.ProtocolDraft.RootChildren)

    // Step 4: 计算折叠状态
    calculateCollapseState(nodeMap, request)

    // Step 5: 生成元数据
    generateMetadata(nodeMap, bom.Items)

    // Step 6: 转换为响应格式
    nodes := convertToProjectionNodes(nodeMap)

    return &TreeProjectionResponse{
        RootNodeID: "root",
        Nodes:      nodes,
        TotalCount: len(nodes),
    }, nil
}

// calculateNodeDepth 递归计算节点深度
func calculateNodeDepth(
    nodeMap map[string]*TreeProjectionNode,
    childIDs []string,
    currentDepth int,
) {
    for _, childID := range childIDs {
        node, exists := nodeMap[childID]
        if !exists {
            continue
        }
        node.Depth = currentDepth
        calculateNodeDepth(nodeMap, node.ChildNodeIDs, currentDepth+1)
    }
}

// calculateCollapseState 计算折叠状态
func calculateCollapseState(
    nodeMap map[string]*TreeProjectionNode,
    request TreeProjectionRequest,
) {
    expandedSet := make(map[string]bool)
    for _, id := range request.ExpandedNodeIDs {
        expandedSet[id] = true
    }

    for _, node := range nodeMap {
        // 判断是否可折叠
        node.IsCollapsible = len(node.ChildNodeIDs) > 0

        // 判断是否已折叠
        if request.CollapseEmpty && node.Metadata.IsEmpty {
            node.IsCollapsed = true
        } else if expandedSet[node.NodeID] {
            node.IsCollapsed = false
        } else {
            // 默认折叠深度 > maxDepth 的节点
            if request.MaxDepth > 0 && node.Depth >= request.MaxDepth {
                node.IsCollapsed = true
            }
        }
    }
}

// generateMetadata 生成节点元数据
func generateMetadata(
    nodeMap map[string]*TreeProjectionNode,
    items []models.BOMItem,
) {
    // 构建 itemID -> item 映射
    itemMap := make(map[string]models.BOMItem)
    for _, item := range items {
        itemMap[item.ID] = item
    }

    for _, node := range nodeMap {
        metadata := &node.Metadata

        // 设置图标
        switch node.NodeKind {
        case "root":
            metadata.Icon = "home"
        case "branch":
            if node.BranchRole == "section" {
                metadata.Icon = "folder"
            } else {
                metadata.Icon = "folder-open"
            }
        case "leaf":
            metadata.Icon = "file"
        }

        // 设置颜色
        if node.BranchRole == "section" {
            metadata.Color = "#1890ff"
        } else if node.BranchRole == "collection" {
            metadata.Color = "#52c41a"
        }

        // 判断是否为空
        metadata.IsEmpty = len(node.ChildNodeIDs) == 0

        // 设置子节点数量
        metadata.ChildCount = len(node.ChildNodeIDs)

        // 设置徽章（显示子节点数量）
        if metadata.ChildCount > 0 {
            metadata.Badge = fmt.Sprintf("%d", metadata.ChildCount)
        }
    }
}
```

#### 1.3 API 实现

```go
// GetBOMTreeProjection 获取 BOM 树投影
// @Summary 获取 BOM 树投影
// @Tags BOM
// @Accept json
// @Produce json
// @Param id path string true "BOM ID"
// @Param collapseEmpty query bool false "折叠空节点"
// @Param maxDepth query int false "最大深度"
// @Param expandedNodeIds query []string false "已展开的节点 ID"
// @Success 200 {object} TreeProjectionResponse
// @Router /api/bom/{id}/tree-projection [get]
func GetBOMTreeProjection(c *gin.Context) {
    bomID := c.Param("id")

    // 解析请求参数
    var request TreeProjectionRequest
    request.CollapseEmpty = c.Query("collapseEmpty") == "true"
    if maxDepth := c.Query("maxDepth"); maxDepth != "" {
        request.MaxDepth, _ = strconv.Atoi(maxDepth)
    }
    request.ExpandedNodeIDs = c.QueryArray("expandedNodeIds")

    // 获取 BOM
    var bom models.BOM
    if err := db.DB.Preload("Items").First(&bom, "id = ?", bomID).Error; err != nil {
        c.JSON(404, gin.H{"error": "BOM not found"})
        return
    }

    // 构建树投影
    projection, err := BuildTreeProjection(bom, request)
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }

    c.JSON(200, projection)
}
```

---

### 2. 前端：数据消费

#### 2.1 API 客户端

```typescript
// api/bom-tree-projection.ts
export interface TreeProjectionNode {
  nodeId: string
  parentNodeId: string | null
  childNodeIds: string[]
  nodeKind: 'root' | 'branch' | 'leaf'
  branchRole?: 'section' | 'collection'
  label: string
  sectionCode: string
  sectionName?: string
  itemId?: string
  depth: number
  isCollapsible: boolean
  isCollapsed: boolean
  metadata: TreeProjectionMetadata
}

export interface TreeProjectionMetadata {
  icon?: string
  color?: string
  badge?: string
  isEmpty: boolean
  childCount: number
}

export interface TreeProjectionResponse {
  rootNodeId: string
  nodes: TreeProjectionNode[]
  totalCount: number
}

export interface TreeProjectionRequest {
  collapseEmpty?: boolean
  maxDepth?: number
  expandedNodeIds?: string[]
}

export async function getBOMTreeProjection(
  bomId: string,
  request: TreeProjectionRequest = {}
): Promise<TreeProjectionResponse> {
  const params = new URLSearchParams()
  if (request.collapseEmpty) params.append('collapseEmpty', 'true')
  if (request.maxDepth) params.append('maxDepth', String(request.maxDepth))
  if (request.expandedNodeIds) {
    request.expandedNodeIds.forEach(id => params.append('expandedNodeIds', id))
  }

  const response = await fetch(`/api/bom/${bomId}/tree-projection?${params}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch tree projection: ${response.statusText}`)
  }
  return response.json()
}
```

#### 2.2 React Hook

```typescript
// hooks/use-bom-tree-projection.ts
import { useQuery } from '@tanstack/react-query'
import { getBOMTreeProjection, type TreeProjectionRequest } from '../api/bom-tree-projection'

export function useBOMTreeProjection(bomId: string, request: TreeProjectionRequest = {}) {
  return useQuery({
    queryKey: ['bom-tree-projection', bomId, request],
    queryFn: () => getBOMTreeProjection(bomId, request),
    staleTime: 5 * 60 * 1000, // 5 分钟缓存
  })
}
```

#### 2.3 简化的 Workspace Hook

```typescript
// hooks/use-bom-workspace-projection.ts (简化版)
import { useMemo, useState } from 'react'
import { useBOMTreeProjection } from './use-bom-tree-projection'

export function useBOMWorkspaceProjection(bomId: string) {
  const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([])
  const [collapseEmpty, setCollapseEmpty] = useState(false)

  // 从后端获取树投影
  const { data, isLoading, error } = useBOMTreeProjection(bomId, {
    expandedNodeIds,
    collapseEmpty,
  })

  // 构建节点映射（用于快速查找）
  const nodeById = useMemo(() => {
    if (!data) return new Map()
    return new Map(data.nodes.map(node => [node.nodeId, node]))
  }, [data])

  // 切换节点展开/折叠
  const toggleNode = (nodeId: string) => {
    setExpandedNodeIds(prev => {
      if (prev.includes(nodeId)) {
        return prev.filter(id => id !== nodeId)
      } else {
        return [...prev, nodeId]
      }
    })
  }

  // 展开所有节点
  const expandAll = () => {
    if (!data) return
    const allNodeIds = data.nodes
      .filter(node => node.isCollapsible)
      .map(node => node.nodeId)
    setExpandedNodeIds(allNodeIds)
  }

  // 折叠所有节点
  const collapseAll = () => {
    setExpandedNodeIds([])
  }

  return {
    // 数据
    rootNodeId: data?.rootNodeId,
    nodes: data?.nodes ?? [],
    nodeById,
    totalCount: data?.totalCount ?? 0,

    // 状态
    isLoading,
    error,
    expandedNodeIds,
    collapseEmpty,

    // 操作
    toggleNode,
    expandAll,
    collapseAll,
    setCollapseEmpty,
  }
}
```

---

### 3. OpenAPI 定义

```yaml
# api/openapi/bom-tree-projection.yaml
openapi: 3.0.0
info:
  title: BOM Tree Projection API
  version: 1.0.0

paths:
  /api/bom/{id}/tree-projection:
    get:
      summary: 获取 BOM 树投影
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: collapseEmpty
          in: query
          schema:
            type: boolean
        - name: maxDepth
          in: query
          schema:
            type: integer
        - name: expandedNodeIds
          in: query
          schema:
            type: array
            items:
              type: string
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/TreeProjectionResponse'

components:
  schemas:
    TreeProjectionResponse:
      type: object
      required:
        - rootNodeId
        - nodes
        - totalCount
      properties:
        rootNodeId:
          type: string
        nodes:
          type: array
          items:
            $ref: '#/components/schemas/TreeProjectionNode'
        totalCount:
          type: integer

    TreeProjectionNode:
      type: object
      required:
        - nodeId
        - childNodeIds
        - nodeKind
        - label
        - sectionCode
        - depth
        - isCollapsible
        - isCollapsed
        - metadata
      properties:
        nodeId:
          type: string
        parentNodeId:
          type: string
          nullable: true
        childNodeIds:
          type: array
          items:
            type: string
        nodeKind:
          type: string
          enum: [root, branch, leaf]
        branchRole:
          type: string
          enum: [section, collection]
        label:
          type: string
        sectionCode:
          type: string
        sectionName:
          type: string
        itemId:
          type: string
        depth:
          type: integer
        isCollapsible:
          type: boolean
        isCollapsed:
          type: boolean
        metadata:
          $ref: '#/components/schemas/TreeProjectionMetadata'

    TreeProjectionMetadata:
      type: object
      required:
        - isEmpty
        - childCount
      properties:
        icon:
          type: string
        color:
          type: string
        badge:
          type: string
        isEmpty:
          type: boolean
        childCount:
          type: integer
```

---

### 4. 代码生成

#### 4.1 后端代码生成

```bash
# 使用 oapi-codegen 生成 Go 代码
oapi-codegen -package services -generate types \
  api/openapi/bom-tree-projection.yaml > server/services/bom_tree_projection_types.go
```

#### 4.2 前端代码生成

```bash
# 使用 openapi-typescript 生成 TypeScript 类型
npx openapi-typescript api/openapi/bom-tree-projection.yaml \
  --output src/api/bom-tree-projection.types.ts
```

---

## 性能优化

### 1. 缓存策略

```go
// 使用 Redis 缓存树投影结果
func GetBOMTreeProjectionWithCache(bomID string, request TreeProjectionRequest) (*TreeProjectionResponse, error) {
    cacheKey := fmt.Sprintf("bom:tree-projection:%s:%v", bomID, request)

    // 尝试从缓存获取
    cached, err := redis.Get(cacheKey)
    if err == nil {
        var projection TreeProjectionResponse
        json.Unmarshal([]byte(cached), &projection)
        return &projection, nil
    }

    // 缓存未命中，重新计算
    projection, err := BuildTreeProjection(bomID, request)
    if err != nil {
        return nil, err
    }

    // 写入缓存（5 分钟过期）
    data, _ := json.Marshal(projection)
    redis.Set(cacheKey, data, 5*time.Minute)

    return projection, nil
}
```

### 2. 增量更新

```go
// 当 BOM 更新时，只更新变更的节点
func UpdateBOMTreeProjectionIncremental(bomID string, changedNodeIDs []string) error {
    // 获取所有相关的缓存 key
    pattern := fmt.Sprintf("bom:tree-projection:%s:*", bomID)
    keys, _ := redis.Keys(pattern)

    // 删除所有相关缓存（触发重新计算）
    for _, key := range keys {
        redis.Del(key)
    }

    return nil
}
```

---

## 迁移策略

### Phase 1: 后端实现（Week 1）

1. 实现 `BuildTreeProjection` 函数
2. 实现 `GET /api/bom/:id/tree-projection` API
3. 添加单元测试和集成测试
4. 性能基准测试

### Phase 2: 前端适配（Week 2）

1. 创建 `useBOMTreeProjection` Hook
2. 简化 `useBOMWorkspaceProjection` Hook
3. 更新 UI 组件使用新 Hook
4. E2E 测试

### Phase 3: 清理旧代码（Week 3）

1. 移除 `bom-workspace-branch-relation-builder.ts`
2. 移除旧的树构建逻辑
3. 更新文档
4. 代码审查

---

**文档版本**: v1.0  
**创建日期**: 2026-05-13  
**作者**: Kiro AI Assistant
