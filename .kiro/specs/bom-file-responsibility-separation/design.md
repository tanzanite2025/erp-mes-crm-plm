# BOM 文件职责分离 - 设计文档

## 概述

**设计版本**: v1.0  
**创建日期**: 2025-01-13  
**设计原则**: 单一职责原则 (SRP) + 明确的模块边界 + 最小依赖

---

## 设计决策总结

基于需求分析，我们采用以下重构策略：

1. **文件拆分策略**: 按职责将大文件拆分为多个小文件
2. **模块组织**: 类型定义、实现逻辑、入口文件分离
3. **依赖管理**: 减少 re-export，明确依赖来源
4. **逻辑统一**: 合并重复的 section 解析逻辑
5. **向后兼容**: 提供过渡期的兼容层

---

## 高层架构设计

### 当前架构（Before）

```
src/features/product-structure/
├── hooks/
│   ├── bom-workspace-source-model.ts          (职责过载)
│   │   ├── 类型定义
│   │   ├── 模型构建函数
│   │   └── 20+ re-exports
│   │
│   ├── bom-workspace-branch-relation-builder.ts (逻辑混杂)
│   │   ├── 合成模式实现
│   │   ├── 协议模式 re-exports
│   │   └── 类型定义
│   │
│   └── bom-workspace-parent-children-protocol-adapter.ts
│       └── resolveSectionOption (重复逻辑)
│
└── utils/
    └── bom-section-utils.ts
        └── resolveBOMSection (重复逻辑)
```

**问题**:
- 职责不清晰
- 依赖关系复杂
- 代码重复
- 难以维护和测试

---

### 目标架构（After）

```
src/features/product-structure/
├── hooks/
│   ├── bom-workspace-source/                   (新目录)
│   │   ├── types.ts                           (纯类型定义)
│   │   │   ├── BOMWorkspaceSourceNode
│   │   │   ├── BOMWorkspaceSourceModel
│   │   │   └── 相关接口
│   │   │
│   │   ├── model-builder.ts                   (模型构建)
│   │   │   ├── buildBOMWorkspaceSourceModel
│   │   │   └── resolveBOMWorkspaceSourceRootNodeId
│   │   │
│   │   └── index.ts                           (可选入口)
│   │       └── 统一导出
│   │
│   ├── bom-workspace-branch-relation/          (新目录)
│   │   ├── types.ts                           (通用类型)
│   │   │   ├── BOMWorkspaceBranchRelationBuilder
│   │   │   ├── BOMWorkspaceSourceBranchNode
│   │   │   └── BOMWorkspaceSourceLeafNode
│   │   │
│   │   ├── synthetic-builder.ts               (合成模式)
│   │   │   └── buildSyntheticBOMWorkspaceBranchRelations
│   │   │
│   │   ├── protocol-adapter.ts                (协议模式)
│   │   │   └── buildParentChildrenProtocolBranchRelations
│   │   │
│   │   ├── builder-resolver.ts                (构建器选择)
│   │   │   └── resolveBOMWorkspaceBranchRelationBuilder
│   │   │
│   │   └── index.ts                           (可选入口)
│   │       └── 统一导出
│   │
│   └── [保留兼容性文件]                        (临时)
│       ├── bom-workspace-source-model.ts      (deprecated)
│       └── bom-workspace-branch-relation-builder.ts (deprecated)
│
└── utils/
    └── bom-section-utils.ts                   (统一逻辑)
        ├── resolveBOMSection (保留并增强)
        └── 移除 protocol adapter 中的重复代码
```

**改进**:
- 职责清晰：每个文件只负责一件事
- 依赖明确：直接导入所需模块
- 无重复：统一的 section 解析逻辑
- 易维护：小文件，易理解，易测试

---

## 详细设计

### 1. 拆分 bom-workspace-source-model.ts

#### 1.1 新文件结构

**文件**: `hooks/bom-workspace-source/types.ts`
```typescript
// 纯类型定义，无实现代码，无 re-export

export type BOMWorkspaceSourceNodeKind = 'root' | 'branch' | 'leaf'

export interface BOMWorkspaceSourceBaseNode {
  nodeId: string
  parentNodeId: string | null
  childNodeIds: string[]
  nodeKind: BOMWorkspaceSourceNodeKind
  sectionCode: string
  sectionName: string
}

export interface BOMWorkspaceSourceRootNode extends BOMWorkspaceSourceBaseNode {
  nodeKind: 'root'
}

// 从 branch-relation 导入具体的 branch 和 leaf 节点类型
export type { 
  BOMWorkspaceSourceBranchNode,
  BOMWorkspaceSourceLeafNode 
} from '../bom-workspace-branch-relation/types'

export type BOMWorkspaceSourceNode =
  | BOMWorkspaceSourceRootNode
  | BOMWorkspaceSourceBranchNode
  | BOMWorkspaceSourceLeafNode

export interface BOMWorkspaceSourceModel {
  rootNode: BOMWorkspaceSourceRootNode
  sourceNodes: BOMWorkspaceSourceNode[]
  nodeById: Map<string, BOMWorkspaceSourceNode>
  branchNodes: BOMWorkspaceSourceBranchNode[]
  sectionBranchNodes: BOMWorkspaceSourceBranchNode[]
  collectionBranchNodes: BOMWorkspaceSourceBranchNode[]
  leafNodes: BOMWorkspaceSourceLeafNode[]
}
```

**文件**: `hooks/bom-workspace-source/model-builder.ts`
```typescript
// 模型构建逻辑

import { type BOMSectionOption } from '../../data/bom-section-schema'
import { type BOM } from '../../data/schema'
import { type BOMWorkspaceBranchRelationBuilder } from '../bom-workspace-branch-relation/types'
import { type BOMWorkspaceParentChildrenProtocolDraft } from '../../data/schema'
import { resolveBOMWorkspaceBranchRelationBuilder } from '../bom-workspace-branch-relation/builder-resolver'
import {
  type BOMWorkspaceSourceModel,
  type BOMWorkspaceSourceRootNode,
  type BOMWorkspaceSourceNode,
} from './types'

export interface BuildBOMWorkspaceSourceModelParams {
  activeSections: BOMSectionOption[]
  fields: Array<{ id: string }>
  watchedItems?: BOM['items']
  resolveNumericField: (index: number, fieldName: 'unitPrice' | 'standardUsage', value: unknown) => number
  branchRelationBuilder?: BOMWorkspaceBranchRelationBuilder
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
}

export function resolveBOMWorkspaceSourceRootNodeId(): string {
  return 'root'
}

export function buildBOMWorkspaceSourceModel(
  params: BuildBOMWorkspaceSourceModelParams
): BOMWorkspaceSourceModel {
  const {
    activeSections,
    fields,
    watchedItems,
    resolveNumericField,
    branchRelationBuilder,
    protocolDraft,
  } = params

  const rootNodeId = resolveBOMWorkspaceSourceRootNodeId()
  const resolvedBranchRelationBuilder = resolveBOMWorkspaceBranchRelationBuilder({
    branchRelationBuilder,
    protocolDraft,
  })

  const {
    rootChildNodeIds,
    branchNodes,
    sectionBranchNodes,
    collectionBranchNodes,
    leafNodes,
  } = resolvedBranchRelationBuilder({
    activeSections,
    fields,
    watchedItems,
    resolveNumericField,
    rootNodeId,
  })

  const rootNode: BOMWorkspaceSourceRootNode = {
    nodeId: rootNodeId,
    parentNodeId: null,
    childNodeIds: rootChildNodeIds,
    nodeKind: 'root',
    sectionCode: '',
    sectionName: '',
  }

  const sourceNodes: BOMWorkspaceSourceNode[] = [rootNode, ...branchNodes, ...leafNodes]
  const nodeById = new Map(sourceNodes.map((node) => [node.nodeId, node]))

  return {
    rootNode,
    sourceNodes,
    nodeById,
    branchNodes,
    sectionBranchNodes,
    collectionBranchNodes,
    leafNodes,
  }
}
```

**文件**: `hooks/bom-workspace-source/index.ts` (可选)
```typescript
/**
 * BOM Workspace Source Model
 * 
 * 此模块提供 BOM workspace 的源数据模型定义和构建功能
 */

// 类型导出
export type {
  BOMWorkspaceSourceNodeKind,
  BOMWorkspaceSourceBaseNode,
  BOMWorkspaceSourceRootNode,
  BOMWorkspaceSourceNode,
  BOMWorkspaceSourceModel,
  BOMWorkspaceSourceBranchNode,
  BOMWorkspaceSourceLeafNode,
} from './types'

// 函数导出
export {
  buildBOMWorkspaceSourceModel,
  resolveBOMWorkspaceSourceRootNodeId,
} from './model-builder'

export type {
  BuildBOMWorkspaceSourceModelParams,
} from './model-builder'
```

---

### 2. 分离 bom-workspace-branch-relation-builder.ts

#### 2.1 新文件结构

**文件**: `hooks/bom-workspace-branch-relation/types.ts`
```typescript
// 通用类型定义

import { type BOMSectionOption } from '../../data/bom-section-schema'
import { type BOM } from '../../data/schema'

export type BOMWorkspaceSourceBranchRole = 'section' | 'collection'

export interface BOMWorkspaceSourceBranchNode {
  nodeId: string
  parentNodeId: string | null
  childNodeIds: string[]
  nodeKind: 'branch'
  branchRole: BOMWorkspaceSourceBranchRole
  sectionCode: string
  sectionName: string
  label: string
  section: BOMSectionOption
}

export interface BOMWorkspaceSourceLeafNode {
  nodeId: string
  parentNodeId: string | null
  childNodeIds: string[]
  nodeKind: 'leaf'
  sectionCode: string
  sectionName: string
  itemId: string
  fieldId: string
  index: number
  materialId: string
  materialName: string
  unitPrice: number
  standardUsage: number
}

export interface BOMWorkspaceBranchRelationBuildParams {
  activeSections: BOMSectionOption[]
  fields: Array<{ id: string }>
  watchedItems?: BOM['items']
  resolveNumericField: (index: number, fieldName: 'unitPrice' | 'standardUsage', value: unknown) => number
  rootNodeId: string
}

export interface BOMWorkspaceBranchRelationBuildResult {
  rootChildNodeIds: string[]
  branchNodes: BOMWorkspaceSourceBranchNode[]
  sectionBranchNodes: BOMWorkspaceSourceBranchNode[]
  collectionBranchNodes: BOMWorkspaceSourceBranchNode[]
  leafNodes: BOMWorkspaceSourceLeafNode[]
}

export type BOMWorkspaceBranchRelationBuilder = (
  params: BOMWorkspaceBranchRelationBuildParams
) => BOMWorkspaceBranchRelationBuildResult

// Re-export protocol types
export type {
  BOMParentChildrenProtocolBranchDraft as BOMWorkspaceParentChildrenProtocolBranchDraft,
  BOMParentChildrenProtocolDraft as BOMWorkspaceParentChildrenProtocolDraft,
  BOMParentChildrenProtocolItemDraft as BOMWorkspaceParentChildrenProtocolItemDraft,
} from '../../data/schema'
```

**文件**: `hooks/bom-workspace-branch-relation/synthetic-builder.ts`
```typescript
// 合成模式实现

import {
  resolveSectionBranchNodeId,
  resolveCollectionBranchNodeId,
  resolveLeafNodeId,
} from '../../utils/bom-node-id-resolver'
import {
  type BOMWorkspaceBranchRelationBuilder,
  type BOMWorkspaceSourceBranchNode,
  type BOMWorkspaceSourceLeafNode,
} from './types'

/**
 * 构建合成模式的分支关系
 * 
 * 合成模式：为每个 section 创建两层节点
 * - Section Branch: 代表 section 本身
 * - Collection Branch: 代表该 section 下的所有 items
 */
export const buildSyntheticBOMWorkspaceBranchRelations: BOMWorkspaceBranchRelationBuilder = ({
  activeSections,
  fields,
  watchedItems,
  resolveNumericField,
  rootNodeId,
}) => {
  const { branchNodes, sectionBranchNodes, collectionBranchNodes, leafNodes } = activeSections.reduce<{
    branchNodes: BOMWorkspaceSourceBranchNode[]
    sectionBranchNodes: BOMWorkspaceSourceBranchNode[]
    collectionBranchNodes: BOMWorkspaceSourceBranchNode[]
    leafNodes: BOMWorkspaceSourceLeafNode[]
  }>(
    (acc, section) => {
      const branchNodeId = resolveSectionBranchNodeId(section.code)
      const collectionBranchNodeId = resolveCollectionBranchNodeId(section.code)

      const sectionLeafNodes = fields.flatMap((field, index) => {
        const item = watchedItems?.[index]
        if (!item || item.section !== section.code) {
          return []
        }

        const unitPrice = resolveNumericField(index, 'unitPrice', item.unitPrice)
        const standardUsage = resolveNumericField(index, 'standardUsage', item.standardUsage)

        return [{
          nodeId: resolveLeafNodeId(item.id, field.id),
          parentNodeId: collectionBranchNodeId,
          childNodeIds: [],
          nodeKind: 'leaf' as const,
          sectionCode: section.code,
          sectionName: section.name,
          itemId: item.id?.trim() || '',
          fieldId: field.id,
          index,
          materialId: item.materialId ?? '',
          materialName: item.materialName ?? '',
          unitPrice,
          standardUsage,
        }]
      })

      const sectionBranchNode: BOMWorkspaceSourceBranchNode = {
        nodeId: branchNodeId,
        parentNodeId: rootNodeId,
        childNodeIds: [collectionBranchNodeId],
        nodeKind: 'branch',
        branchRole: 'section',
        sectionCode: section.code,
        sectionName: section.name,
        label: section.name,
        section,
      }

      const collectionBranchNode: BOMWorkspaceSourceBranchNode = {
        nodeId: collectionBranchNodeId,
        parentNodeId: branchNodeId,
        childNodeIds: sectionLeafNodes.map((node) => node.nodeId),
        nodeKind: 'branch',
        branchRole: 'collection',
        sectionCode: section.code,
        sectionName: section.name,
        label: `${section.name} 明细`,
        section,
      }

      acc.branchNodes.push(sectionBranchNode, collectionBranchNode)
      acc.sectionBranchNodes.push(sectionBranchNode)
      acc.collectionBranchNodes.push(collectionBranchNode)
      acc.leafNodes.push(...sectionLeafNodes)
      return acc
    },
    {
      branchNodes: [],
      sectionBranchNodes: [],
      collectionBranchNodes: [],
      leafNodes: [],
    }
  )

  return {
    rootChildNodeIds: sectionBranchNodes.map((node) => node.nodeId),
    branchNodes,
    sectionBranchNodes,
    collectionBranchNodes,
    leafNodes,
  }
}
```

**文件**: `hooks/bom-workspace-branch-relation/protocol-adapter.ts`
```typescript
// 协议模式实现 - 从现有文件移动过来
export { buildParentChildrenProtocolBranchRelations } from '../bom-workspace-parent-children-protocol-adapter'
export type { BuildBOMWorkspaceParentChildrenProtocolBranchRelationsParams } from '../bom-workspace-parent-children-protocol-adapter'
```

**文件**: `hooks/bom-workspace-branch-relation/builder-resolver.ts`
```typescript
// 构建器选择逻辑
import { type BOMWorkspaceBranchRelationBuilder, type BOMWorkspaceParentChildrenProtocolDraft } from './types'
import { buildSyntheticBOMWorkspaceBranchRelations } from './synthetic-builder'
import { buildParentChildrenProtocolBranchRelations } from './protocol-adapter'

export interface ResolveBOMWorkspaceBranchRelationBuilderParams {
  branchRelationBuilder?: BOMWorkspaceBranchRelationBuilder
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
}

export function resolveBOMWorkspaceBranchRelationBuilder(
  params: ResolveBOMWorkspaceBranchRelationBuilderParams
): BOMWorkspaceBranchRelationBuilder {
  const { branchRelationBuilder, protocolDraft } = params
  
  if (branchRelationBuilder) {
    return branchRelationBuilder
  }
  
  if (protocolDraft) {
    return buildParentChildrenProtocolBranchRelations(protocolDraft)
  }
  
  return buildSyntheticBOMWorkspaceBranchRelations
}
```

**文件**: `hooks/bom-workspace-branch-relation/index.ts`
```typescript
/**
 * BOM Workspace Branch Relation Builders
 * 
 * 提供两种构建模式：
 * - Synthetic: 合成模式，自动为每个 section 创建层级结构
 * - Protocol: 协议模式，基于父子关系协议构建
 */

// 类型导出
export type {
  BOMWorkspaceSourceBranchRole,
  BOMWorkspaceSourceBranchNode,
  BOMWorkspaceSourceLeafNode,
  BOMWorkspaceBranchRelationBuildParams,
  BOMWorkspaceBranchRelationBuildResult,
  BOMWorkspaceBranchRelationBuilder,
  BOMWorkspaceParentChildrenProtocolBranchDraft,
  BOMWorkspaceParentChildrenProtocolDraft,
  BOMWorkspaceParentChildrenProtocolItemDraft,
} from './types'

// 构建器导出
export { buildSyntheticBOMWorkspaceBranchRelations } from './synthetic-builder'
export { buildParentChildrenProtocolBranchRelations } from './protocol-adapter'
export type { BuildBOMWorkspaceParentChildrenProtocolBranchRelationsParams } from './protocol-adapter'

// 解析器导出
export { resolveBOMWorkspaceBranchRelationBuilder } from './builder-resolver'
export type { ResolveBOMWorkspaceBranchRelationBuilderParams } from './builder-resolver'

// Node ID resolvers (re-export for convenience)
export {
  resolveSectionBranchNodeId as resolveBOMWorkspaceSourceBranchNodeId,
  resolveCollectionBranchNodeId as resolveBOMWorkspaceSourceCollectionBranchNodeId,
  resolveLeafNodeId as resolveBOMWorkspaceSourceLeafNodeId,
} from '../../utils/bom-node-id-resolver'
```

---

### 3. 统一 Section 解析逻辑

#### 3.1 分析现有实现

**当前 `bom-section-utils.ts` 中的 `resolveBOMSection`**:
- 输入：sections 数组 + 原始值
- 匹配逻辑：code、name、value、label、legacyNames
- 输出：BOMSectionOption 或 undefined

**当前 `protocol-adapter.ts` 中的 `resolveSectionOption`**:
- 输入：sections 数组 + 原始值
- 匹配逻辑：类似但可能有细微差异
- 输出：BOMSectionOption 或 undefined

#### 3.2 统一方案

**保留并增强 `bom-section-utils.ts`**:
```typescript
// utils/bom-section-utils.ts

import { DEFAULT_BOM_SECTION_CODE, LEGACY_BOM_SECTION_CODE_MAP, BOM_SECTION_SEED_CONFIGS } from '../constants/bom-sections'
import { type BOMSectionOption } from '../data/bom-section-schema'

function normalizeSectionToken(value?: string | null): string {
  return (value || '').replace(/\s+/g, '').trim().toUpperCase()
}

function createSeedSectionOptions(): BOMSectionOption[] {
  return BOM_SECTION_SEED_CONFIGS.map((section) => ({
    value: section.code,
    label: section.name,
    code: section.code,
    name: section.name,
    active: section.active,
    sortOrder: section.sortOrder,
    isDefault: section.isDefault,
    legacyNames: [...section.legacyNames],
  }))
}

function withFallbackSections(sections: BOMSectionOption[]): BOMSectionOption[] {
  return sections.length > 0 ? sections : createSeedSectionOptions()
}

export function getSortedBOMSections(sections: BOMSectionOption[]): BOMSectionOption[] {
  return [...withFallbackSections(sections)].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.code.localeCompare(b.code)
  })
}

export function getActiveBOMSections(sections: BOMSectionOption[]): BOMSectionOption[] {
  const sorted = getSortedBOMSections(sections)
  return sorted.filter((section) => section.active)
}

export function getDefaultBOMSectionCode(sections: BOMSectionOption[]): string {
  const sorted = getSortedBOMSections(sections)
  return (
    sorted.find((section) => section.active && section.isDefault)?.code
    ?? sorted.find((section) => section.active)?.code
    ?? (sections.length === 0 ? DEFAULT_BOM_SECTION_CODE : '')
  )
}

/**
 * 解析 BOM section
 * 
 * 支持多种输入格式：
 * - Section code (e.g., "MAIN")
 * - Section name (e.g., "主料")
 * - Legacy names
 * - Case-insensitive matching
 * 
 * @param sections - 可用的 section 列表
 * @param rawValue - 原始输入值
 * @returns 匹配的 BOMSectionOption，如果未找到则返回 undefined
 */
export function resolveBOMSection(
  sections: BOMSectionOption[], 
  rawValue?: string | null
): BOMSectionOption | undefined {
  const normalizedValue = normalizeSectionToken(rawValue)
  if (!normalizedValue) return undefined

  const candidates = withFallbackSections(sections)

  // 精确匹配
  const matched = candidates.find((section) => {
    if (normalizeSectionToken(section.code) === normalizedValue) return true
    if (normalizeSectionToken(section.name) === normalizedValue) return true
    if (normalizeSectionToken(section.value) === normalizedValue) return true
    if (normalizeSectionToken(section.label) === normalizedValue) return true
    return section.legacyNames.some((legacyName) => normalizeSectionToken(legacyName) === normalizedValue)
  })

  if (matched) return matched

  // Fallback to legacy map
  const fallbackCode = LEGACY_BOM_SECTION_CODE_MAP[rawValue || '']
  if (!fallbackCode) return undefined
  return candidates.find((section) => section.code === fallbackCode)
}

/**
 * 规范化 section 值为 code
 */
export function normalizeBOMSectionValue(
  sections: BOMSectionOption[], 
  rawValue?: string | null
): string {
  return resolveBOMSection(sections, rawValue)?.code ?? rawValue?.trim() ?? ''
}

/**
 * 解析 section 的显示名称
 */
export function resolveBOMSectionLabel(
  sections: BOMSectionOption[], 
  rawValue?: string | null, 
  fallback = ''
): string {
  return resolveBOMSection(sections, rawValue)?.name ?? rawValue?.trim() ?? fallback
}

export function buildBOMSectionDisplayNames(sections: BOMSectionOption[]): string[] {
  const activeSections = getActiveBOMSections(sections)
  if (activeSections.length > 0) {
    return activeSections.map((section) => section.name)
  }
  return sections.length === 0 ? BOM_SECTION_SEED_CONFIGS.map((section) => section.name) : []
}

// 为了向后兼容，提供别名
export { resolveBOMSection as resolveSectionOption }
```

**更新 `protocol-adapter.ts`**:
```typescript
// 移除本地的 resolveSectionOption 实现
// 改为导入统一的函数
import { resolveBOMSection as resolveSectionOption } from '../../utils/bom-section-utils'
```

---

### 4. 兼容性处理

#### 4.1 保留旧文件作为过渡

**文件**: `hooks/bom-workspace-source-model.ts` (deprecated)
```typescript
/**
 * @deprecated 此文件已拆分为多个模块，请使用新的导入路径
 * 
 * 新路径：
 * - 类型: from './bom-workspace-source/types'
 * - 函数: from './bom-workspace-source/model-builder'
 * - 统一导出: from './bom-workspace-source'
 * 
 * 此文件将在 v2.0 中移除
 */

// Re-export everything from new location
export * from './bom-workspace-source'
```

**文件**: `hooks/bom-workspace-branch-relation-builder.ts` (deprecated)
```typescript
/**
 * @deprecated 此文件已拆分为多个模块，请使用新的导入路径
 * 
 * 新路径：
 * - 类型: from './bom-workspace-branch-relation/types'
 * - 合成模式: from './bom-workspace-branch-relation/synthetic-builder'
 * - 协议模式: from './bom-workspace-branch-relation/protocol-adapter'
 * - 统一导出: from './bom-workspace-branch-relation'
 * 
 * 此文件将在 v2.0 中移除
 */

// Re-export everything from new location
export * from './bom-workspace-branch-relation'
```

---

## 实现计划

### 阶段 1: 创建新文件结构（不破坏现有代码）

1. 创建新目录和文件
2. 复制代码到新位置
3. 调整导入路径
4. 运行测试确保新代码工作正常

### 阶段 2: 更新导入路径

1. 使用 IDE 的"查找所有引用"功能
2. 逐个文件更新导入路径
3. 每次更新后运行测试
4. 提交小的、可验证的更改

### 阶段 3: 添加 deprecated 标记

1. 在旧文件中添加 @deprecated 注释
2. 配置 ESLint 规则警告使用 deprecated 导入
3. 更新文档说明迁移路径

### 阶段 4: 清理（可选，在未来版本）

1. 确认所有代码已迁移
2. 移除旧文件
3. 更新版本号

---

## 测试策略

### 单元测试

**新增测试文件**:
- `bom-workspace-source/model-builder.test.ts`
- `bom-workspace-branch-relation/synthetic-builder.test.ts`
- `bom-workspace-branch-relation/builder-resolver.test.ts`
- `utils/bom-section-utils.test.ts` (增强现有测试)

**测试覆盖**:
- 所有公共函数
- 边界条件
- 错误处理
- 向后兼容性

### 集成测试

**测试场景**:
- 完整的 workspace 构建流程
- 不同构建模式的切换
- Section 解析的各种输入

### 回归测试

**验证**:
- 所有现有测试通过
- 运行时行为一致
- 性能无明显下降

---

## 迁移指南

### 对于开发者

**旧代码**:
```typescript
import { 
  BOMWorkspaceSourceModel,
  buildBOMWorkspaceSourceModel 
} from '@/features/product-structure/hooks/bom-workspace-source-model'
```

**新代码（推荐）**:
```typescript
import { 
  type BOMWorkspaceSourceModel,
  buildBOMWorkspaceSourceModel 
} from '@/features/product-structure/hooks/bom-workspace-source'
```

**或者更具体**:
```typescript
import { type BOMWorkspaceSourceModel } from '@/features/product-structure/hooks/bom-workspace-source/types'
import { buildBOMWorkspaceSourceModel } from '@/features/product-structure/hooks/bom-workspace-source/model-builder'
```

---

**旧代码**:
```typescript
import { 
  buildSyntheticBOMWorkspaceBranchRelations 
} from '@/features/product-structure/hooks/bom-workspace-branch-relation-builder'
```

**新代码**:
```typescript
import { 
  buildSyntheticBOMWorkspaceBranchRelations 
} from '@/features/product-structure/hooks/bom-workspace-branch-relation/synthetic-builder'
```

---

**Section 解析**:
```typescript
// 旧代码（在 protocol-adapter 中）
const section = resolveSectionOption(sections, rawValue)

// 新代码（统一使用）
import { resolveBOMSection } from '@/features/product-structure/utils/bom-section-utils'
const section = resolveBOMSection(sections, rawValue)
```

---

## 性能考虑

### 导入性能

**优化**:
- 减少 re-export 层级
- 使用具体路径导入减少模块解析时间
- Tree-shaking 更有效

**预期影响**:
- 构建时间：无明显变化或略有改善
- 运行时性能：无影响（编译后代码相同）
- Bundle 大小：可能略有减小（更好的 tree-shaking）

### 运行时性能

**保持不变**:
- 所有逻辑保持相同
- 无额外的函数调用层级
- 无性能回归

---

## 风险缓解

### 风险 1: 导入路径更新遗漏

**缓解**:
- 使用 TypeScript 编译器检查
- 使用 ESLint 规则检测 deprecated 导入
- 代码审查

### 风险 2: 意外的行为变化

**缓解**:
- 完整的测试覆盖
- 渐进式迁移
- 每次更改后验证

### 风险 3: 团队适应成本

**缓解**:
- 提供清晰的迁移文档
- 保留兼容层
- 团队培训和沟通

---

## 成功标准

### 代码质量
- [ ] 每个文件不超过 150 行
- [ ] 无循环依赖
- [ ] 所有文件有清晰的 JSDoc 注释

### 测试覆盖
- [ ] 单元测试覆盖率 > 80%
- [ ] 所有现有测试通过
- [ ] 新增测试覆盖新的模块边界

### 文档
- [ ] 迁移指南完整
- [ ] API 文档更新
- [ ] 代码注释清晰

### 性能
- [ ] 构建时间无明显增加
- [ ] 运行时性能无回归
- [ ] Bundle 大小无明显增加

---

## 附录

### A. 文件映射表

| 旧文件 | 新文件 | 内容 |
|--------|--------|------|
| `bom-workspace-source-model.ts` | `bom-workspace-source/types.ts` | 类型定义 |
| | `bom-workspace-source/model-builder.ts` | 构建函数 |
| | `bom-workspace-source/index.ts` | 统一导出 |
| `bom-workspace-branch-relation-builder.ts` | `bom-workspace-branch-relation/types.ts` | 类型定义 |
| | `bom-workspace-branch-relation/synthetic-builder.ts` | 合成模式 |
| | `bom-workspace-branch-relation/protocol-adapter.ts` | 协议模式 |
| | `bom-workspace-branch-relation/builder-resolver.ts` | 构建器选择 |
| | `bom-workspace-branch-relation/index.ts` | 统一导出 |

### B. 依赖关系图

```
bom-workspace-source/
  ├── types.ts
  │   └── imports from: bom-workspace-branch-relation/types
  ├── model-builder.ts
  │   ├── imports from: types
  │   ├── imports from: bom-workspace-branch-relation/builder-resolver
  │   └── imports from: data/schema
  └── index.ts
      ├── exports from: types
      └── exports from: model-builder

bom-workspace-branch-relation/
  ├── types.ts
  │   └── imports from: data/schema
  ├── synthetic-builder.ts
  │   ├── imports from: types
  │   └── imports from: utils/bom-node-id-resolver
  ├── protocol-adapter.ts
  │   └── re-exports from: bom-workspace-parent-children-protocol-adapter
  ├── builder-resolver.ts
  │   ├── imports from: types
  │   ├── imports from: synthetic-builder
  │   └── imports from: protocol-adapter
  └── index.ts
      ├── exports from: types
      ├── exports from: synthetic-builder
      ├── exports from: protocol-adapter
      └── exports from: builder-resolver
```

### C. ESLint 配置建议

```javascript
// .eslintrc.js
module.exports = {
  rules: {
    'no-restricted-imports': [
      'warn',
      {
        patterns: [
          {
            group: ['**/bom-workspace-source-model'],
            message: 'Please use @/features/product-structure/hooks/bom-workspace-source instead',
          },
          {
            group: ['**/bom-workspace-branch-relation-builder'],
            message: 'Please use @/features/product-structure/hooks/bom-workspace-branch-relation instead',
          },
        ],
      },
    ],
  },
}
```


**文件**: `hooks/bom-workspace-branch-relation/builder-resolver.ts`
```typescript
// 构建器选择逻辑

import { type BOMWorkspaceBranchRelationBuilder, type BOMWorkspaceParentChildrenProtocolDraft } from './types'
import { buildSyntheticBOMWorkspaceBranchRelations } from './synthetic-builder'
import { buildParentChildrenProtocolBranchRelations } from './protocol-adapter'

export interface ResolveBOMWorkspaceBranchRelationBuilderParams {
  branchRelationBuilder?: BOMWorkspaceBranchRelationBuilder
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
}

export function resolveBOMWorkspaceBranchRelationBuilder({
  branchRelationBuilder,
  protocolDraft,
}: ResolveBOMWorkspaceBranchRelationBuilderParams): BOMWorkspaceBranchRelationBuilder {
  if (branchRelationBuilder) {
    return branchRelationBuilder
  }
  if (protocolDraft) {
    return buildParentChildrenProtocolBranchRelations(protocolDraft)
  }
  return buildSyntheticBOMWorkspaceBranchRelations
}
```

**文件**: `hooks/bom-workspace-branch-relation/protocol-adapter.ts`
```typescript
// 协议模式实现 (从现有文件移动过来)

import { type BOMWorkspaceBranchRelationBuilder, type BOMWorkspaceParentChildrenProtocolDraft } from './types'
// ... 现有的 protocol adapter 实现
```

**文件**: `hooks/bom-workspace-branch-relation/index.ts`
```typescript
/**
 * BOM Workspace Branch Relation Builders
 * 
 * 提供两种构建模式：
 * - Synthetic: 合成模式，自动为每个 section 创建层级结构
 * - Protocol: 协议模式，基于父子关系协议构建
 */

// 类型导出
export type {
  BOMWorkspaceSourceBranchRole,
  BOMWorkspaceSourceBranchNode,
  BOMWorkspaceSourceLeafNode,
  BOMWorkspaceBranchRelationBuildParams,
  BOMWorkspaceBranchRelationBuildResult,
  BOMWorkspaceBranchRelationBuilder,
  BOMWorkspaceParentChildrenProtocolBranchDraft,
  BOMWorkspaceParentChildrenProtocolDraft,
  BOMWorkspaceParentChildrenProtocolItemDraft,
} from './types'

// 构建器导出
export { buildSyntheticBOMWorkspaceBranchRelations } from './synthetic-builder'
export { buildParentChildrenProtocolBranchRelations } from './protocol-adapter'
export type { BuildBOMWorkspaceParentChildrenProtocolBranchRelationsParams } from './protocol-adapter'

// 解析器导出
export { resolveBOMWorkspaceBranchRelationBuilder } from './builder-resolver'
export type { ResolveBOMWorkspaceBranchRelationBuilderParams } from './builder-resolver'

// Node ID resolvers (re-export for convenience)
export {
  resolveSectionBranchNodeId as resolveBOMWorkspaceSourceBranchNodeId,
  resolveCollectionBranchNodeId as resolveBOMWorkspaceSourceCollectionBranchNodeId,
  resolveLeafNodeId as resolveBOMWorkspaceSourceLeafNodeId,
} from '../../utils/bom-node-id-resolver'
```

---

### 3. 统一 Section 解析逻辑

#### 3.1 分析现有实现

**当前的两个函数**:

1. `bom-section-utils.ts::resolveBOMSection`
   - 位置: `utils/` 目录
   - 功能: 通用的 section 解析
   - 支持: code, name, value, label, legacyNames
   - 返回: `BOMSectionOption | undefined`

2. `bom-workspace-parent-children-protocol-adapter.ts::resolveSectionOption`
   - 位置: `hooks/` 目录
   - 功能: 协议适配器中的 section 解析
   - 逻辑与 `resolveBOMSection` 高度相似

#### 3.2 统一方案

**决策**: 保留并增强 `bom-section-utils.ts` 中的实现，移除 adapter 中的重复代码

**理由**:
- `utils/` 目录更适合放置通用工具函数
- `resolveBOMSection` 已经是完整实现
- adapter 应该使用工具函数而不是重复实现

**修改**: `utils/bom-section-utils.ts`
```typescript
// 保持现有实现，添加更详细的文档

/**
 * 解析 BOM section
 * 
 * 支持多种输入格式：
 * - section.code (如 "MAIN")
 * - section.name (如 "主料")
 * - section.value
 * - section.label
 * - legacyNames (如 "主要物料")
 * 
 * @param sections - 可用的 section 列表
 * @param rawValue - 待解析的值
 * @returns 匹配的 BOMSectionOption，如果未找到返回 undefined
 * 
 * @example
 * const section = resolveBOMSection(sections, "主料")
 * // 返回 { code: "MAIN", name: "主料", ... }
 */
export function resolveBOMSection(
  sections: BOMSectionOption[], 
  rawValue?: string | null
): BOMSectionOption | undefined {
  // ... 现有实现保持不变
}

// 其他函数保持不变
```

**修改**: `hooks/bom-workspace-branch-relation/protocol-adapter.ts`
```typescript
// 移除 resolveSectionOption 函数
// 改为导入和使用 resolveBOMSection

import { resolveBOMSection } from '../../utils/bom-section-utils'

// 在需要的地方使用
const section = resolveBOMSection(sections, rawSectionValue)
```

---

### 4. 向后兼容策略

#### 4.1 保留旧文件作为兼容层（临时）

**文件**: `hooks/bom-workspace-source-model.ts` (deprecated)
```typescript
/**
 * @deprecated 此文件已被拆分，请使用新的模块结构
 * 
 * 迁移指南：
 * - 类型导入: 从 './bom-workspace-source/types' 导入
 * - 函数导入: 从 './bom-workspace-source/model-builder' 导入
 * - 或使用统一入口: 从 './bom-workspace-source' 导入
 * 
 * 此兼容层将在 v2.0 版本移除
 */

// Re-export 所有内容以保持兼容
export * from './bom-workspace-source/types'
export * from './bom-workspace-source/model-builder'
export * from './bom-workspace-branch-relation/types'
export * from './bom-workspace-branch-relation/synthetic-builder'
export * from './bom-workspace-branch-relation/protocol-adapter'
export * from './bom-workspace-branch-relation/builder-resolver'
```

**文件**: `hooks/bom-workspace-branch-relation-builder.ts` (deprecated)
```typescript
/**
 * @deprecated 此文件已被拆分，请使用新的模块结构
 * 
 * 迁移指南：
 * - 类型导入: 从 './bom-workspace-branch-relation/types' 导入
 * - 合成模式: 从 './bom-workspace-branch-relation/synthetic-builder' 导入
 * - 协议模式: 从 './bom-workspace-branch-relation/protocol-adapter' 导入
 * - 或使用统一入口: 从 './bom-workspace-branch-relation' 导入
 * 
 * 此兼容层将在 v2.0 版本移除
 */

export * from './bom-workspace-branch-relation/types'
export * from './bom-workspace-branch-relation/synthetic-builder'
export * from './bom-workspace-branch-relation/protocol-adapter'
export * from './bom-workspace-branch-relation/builder-resolver'
```

#### 4.2 迁移时间表

**Phase 1: 创建新结构（Week 1）**
- 创建新的目录和文件
- 实现所有新模块
- 保持旧文件不变

**Phase 2: 添加兼容层（Week 1）**
- 修改旧文件为 re-export
- 添加 @deprecated 标记
- 更新文档

**Phase 3: 渐进迁移（Week 2-3）**
- 逐步更新导入路径
- 运行测试确保无破坏
- 更新相关文档

**Phase 4: 移除兼容层（Week 4）**
- 确认所有代码已迁移
- 移除旧文件
- 发布新版本

---

## 数据流设计

### 构建 BOM Workspace Source Model 的流程

```
┌─────────────────────────────────────────────────────────────┐
│ 1. 调用 buildBOMWorkspaceSourceModel                        │
│    - 传入 sections, items, fields 等参数                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. resolveBOMWorkspaceBranchRelationBuilder                 │
│    - 根据参数选择构建器                                      │
│    - 返回 synthetic 或 protocol builder                     │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│ Synthetic Mode   │    │ Protocol Mode    │
│ - 自动分层       │    │ - 基于协议       │
│ - Section/Coll   │    │ - 父子关系       │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 构建器执行                                                │
│    - 创建 branch nodes (section, collection)                │
│    - 创建 leaf nodes (items)                                │
│    - 建立父子关系                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. 组装 Source Model                                        │
│    - 创建 root node                                         │
│    - 构建 nodeById Map                                      │
│    - 分类 branch/leaf nodes                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. 返回 BOMWorkspaceSourceModel                             │
│    - 完整的树结构                                            │
│    - 可用于渲染和操作                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 接口设计

### 公共 API

#### buildBOMWorkspaceSourceModel

```typescript
function buildBOMWorkspaceSourceModel(
  params: BuildBOMWorkspaceSourceModelParams
): BOMWorkspaceSourceModel

interface BuildBOMWorkspaceSourceModelParams {
  activeSections: BOMSectionOption[]
  fields: Array<{ id: string }>
  watchedItems?: BOM['items']
  resolveNumericField: (index: number, fieldName: string, value: unknown) => number
  branchRelationBuilder?: BOMWorkspaceBranchRelationBuilder
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
}
```

**用途**: 构建完整的 workspace source model

**使用示例**:
```typescript
const model = buildBOMWorkspaceSourceModel({
  activeSections: getActiveBOMSections(sections),
  fields: formFields,
  watchedItems: form.watch('items'),
  resolveNumericField: (index, fieldName, value) => {
    return parseFloat(String(value)) || 0
  },
})
```

---

#### resolveBOMSection

```typescript
function resolveBOMSection(
  sections: BOMSectionOption[],
  rawValue?: string | null
): BOMSectionOption | undefined
```

**用途**: 解析 section 字符串为 section 对象

**使用示例**:
```typescript
const section = resolveBOMSection(sections, "主料")
// 返回: { code: "MAIN", name: "主料", ... }

const section2 = resolveBOMSection(sections, "MAIN")
// 返回: { code: "MAIN", name: "主料", ... }
```

---

## 测试策略

### 单元测试

#### 1. 类型定义测试
```typescript
// types.test.ts
describe('BOM Workspace Source Types', () => {
  it('should define correct node kinds', () => {
    const kinds: BOMWorkspaceSourceNodeKind[] = ['root', 'branch', 'leaf']
    expect(kinds).toHaveLength(3)
  })
})
```

#### 2. 模型构建测试
```typescript
// model-builder.test.ts
describe('buildBOMWorkspaceSourceModel', () => {
  it('should build model with synthetic builder', () => {
    const model = buildBOMWorkspaceSourceModel({
      activeSections: mockSections,
      fields: mockFields,
      watchedItems: mockItems,
      resolveNumericField: jest.fn(),
    })
    
    expect(model.rootNode).toBeDefined()
    expect(model.sourceNodes.length).toBeGreaterThan(0)
  })
  
  it('should build model with protocol builder', () => {
    const model = buildBOMWorkspaceSourceModel({
      activeSections: mockSections,
      fields: mockFields,
      protocolDraft: mockProtocol,
      resolveNumericField: jest.fn(),
    })
    
    expect(model.rootNode).toBeDefined()
  })
})
```

#### 3. 构建器测试
```typescript
// synthetic-builder.test.ts
describe('buildSyntheticBOMWorkspaceBranchRelations', () => {
  it('should create section and collection branches', () => {
    const result = buildSyntheticBOMWorkspaceBranchRelations({
      activeSections: [mockSection],
      fields: mockFields,
      watchedItems: mockItems,
      resolveNumericField: jest.fn(),
      rootNodeId: 'root',
    })
    
    expect(result.sectionBranchNodes).toHaveLength(1)
    expect(result.collectionBranchNodes).toHaveLength(1)
  })
})
```

#### 4. Section 解析测试
```typescript
// bom-section-utils.test.ts
describe('resolveBOMSection', () => {
  it('should resolve by code', () => {
    const section = resolveBOMSection(mockSections, 'MAIN')
    expect(section?.code).toBe('MAIN')
  })
  
  it('should resolve by name', () => {
    const section = resolveBOMSection(mockSections, '主料')
    expect(section?.code).toBe('MAIN')
  })
  
  it('should resolve by legacy name', () => {
    const section = resolveBOMSection(mockSections, '主要物料')
    expect(section?.code).toBe('MAIN')
  })
  
  it('should return undefined for unknown value', () => {
    const section = resolveBOMSection(mockSections, 'UNKNOWN')
    expect(section).toBeUndefined()
  })
})
```

### 集成测试

```typescript
// integration.test.ts
describe('BOM Workspace Integration', () => {
  it('should work end-to-end with synthetic mode', () => {
    // 1. 准备数据
    const sections = getActiveBOMSections(mockSections)
    
    // 2. 构建模型
    const model = buildBOMWorkspaceSourceModel({
      activeSections: sections,
      fields: mockFields,
      watchedItems: mockItems,
      resolveNumericField: (i, f, v) => Number(v) || 0,
    })
    
    // 3. 验证结构
    expect(model.rootNode.childNodeIds).toHaveLength(sections.length)
    expect(model.branchNodes.length).toBeGreaterThan(0)
    expect(model.leafNodes.length).toBeGreaterThan(0)
    
    // 4. 验证关系
    model.branchNodes.forEach(branch => {
      expect(model.nodeById.get(branch.nodeId)).toBe(branch)
      if (branch.parentNodeId) {
        const parent = model.nodeById.get(branch.parentNodeId)
        expect(parent?.childNodeIds).toContain(branch.nodeId)
      }
    })
  })
})
```

---

## 性能考虑

### 1. 避免不必要的重新计算

**问题**: 每次渲染都重新构建整个模型

**解决方案**: 使用 memoization
```typescript
const model = useMemo(
  () => buildBOMWorkspaceSourceModel({
    activeSections,
    fields,
    watchedItems,
    resolveNumericField,
  }),
  [activeSections, fields, watchedItems, resolveNumericField]
)
```

### 2. 优化 Map 查找

**当前**: 使用 `Map<string, Node>` 已经是 O(1) 查找

**保持**: 继续使用 Map 而不是数组查找

### 3. 减少函数调用层级

**问题**: 过多的 re-export 可能增加调用栈

**解决方案**: 直接导入所需模块，减少中间层

---

## 迁移指南

### 对于开发者

#### 步骤 1: 更新导入语句

**旧代码**:
```typescript
import { 
  BOMWorkspaceSourceModel,
  buildBOMWorkspaceSourceModel 
} from '../hooks/bom-workspace-source-model'
```

**新代码（推荐）**:
```typescript
import { 
  type BOMWorkspaceSourceModel 
} from '../hooks/bom-workspace-source/types'
import { 
  buildBOMWorkspaceSourceModel 
} from '../hooks/bom-workspace-source/model-builder'
```

**或使用统一入口**:
```typescript
import { 
  type BOMWorkspaceSourceModel,
  buildBOMWorkspaceSourceModel 
} from '../hooks/bom-workspace-source'
```

#### 步骤 2: 更新 branch relation 导入

**旧代码**:
```typescript
import {
  buildSyntheticBOMWorkspaceBranchRelations
} from '../hooks/bom-workspace-branch-relation-builder'
```

**新代码**:
```typescript
import {
  buildSyntheticBOMWorkspaceBranchRelations
} from '../hooks/bom-workspace-branch-relation/synthetic-builder'
```

#### 步骤 3: 更新 section 解析调用

**旧代码（在 protocol adapter 中）**:
```typescript
const section = resolveSectionOption(sections, rawValue)
```

**新代码**:
```typescript
import { resolveBOMSection } from '../../utils/bom-section-utils'

const section = resolveBOMSection(sections, rawValue)
```

---

## 风险与缓解

### 风险 1: 导入路径错误

**影响**: 编译失败  
**概率**: 中  
**缓解**:
- 使用 TypeScript 的路径映射
- 提供 ESLint 规则检查导入
- 使用 IDE 的自动导入功能

### 风险 2: 循环依赖

**影响**: 运行时错误  
**概率**: 低  
**缓解**:
- 使用 `madge` 工具检测循环依赖
- 保持单向依赖流：types ← builder ← index
- 代码审查

### 风险 3: 性能下降

**影响**: 用户体验  
**概率**: 低  
**缓解**:
- 性能基准测试
- 使用 React DevTools Profiler
- 保持 memoization

---

## 实施计划

### Week 1: 创建新结构
- [ ] Day 1-2: 创建 `bom-workspace-source/` 目录和文件
- [ ] Day 3-4: 创建 `bom-workspace-branch-relation/` 目录和文件
- [ ] Day 5: 添加单元测试

### Week 2: 统一逻辑
- [ ] Day 1-2: 统一 section 解析逻辑
- [ ] Day 3-4: 更新 protocol adapter
- [ ] Day 5: 添加集成测试

### Week 3: 迁移代码
- [ ] Day 1-3: 逐步更新导入路径
- [ ] Day 4: 运行完整测试套件
- [ ] Day 5: 性能测试和优化

### Week 4: 清理和文档
- [ ] Day 1-2: 移除兼容层
- [ ] Day 3-4: 更新文档
- [ ] Day 5: 代码审查和发布

---

## 附录

### A. 文件对照表

| 旧文件 | 新文件 | 职责 |
|--------|--------|------|
| `bom-workspace-source-model.ts` | `bom-workspace-source/types.ts` | 类型定义 |
| | `bom-workspace-source/model-builder.ts` | 模型构建 |
| | `bom-workspace-source/index.ts` | 统一入口 |
| `bom-workspace-branch-relation-builder.ts` | `bom-workspace-branch-relation/types.ts` | 类型定义 |
| | `bom-workspace-branch-relation/synthetic-builder.ts` | 合成模式 |
| | `bom-workspace-branch-relation/protocol-adapter.ts` | 协议模式 |
| | `bom-workspace-branch-relation/builder-resolver.ts` | 构建器选择 |
| | `bom-workspace-branch-relation/index.ts` | 统一入口 |

### B. 依赖关系图

```
bom-workspace-source/
├── types.ts (无依赖)
├── model-builder.ts
│   ├── → types.ts
│   ├── → bom-workspace-branch-relation/types.ts
│   └── → bom-workspace-branch-relation/builder-resolver.ts
└── index.ts
    ├── → types.ts
    └── → model-builder.ts

bom-workspace-branch-relation/
├── types.ts (无依赖)
├── synthetic-builder.ts
│   ├── → types.ts
│   └── → utils/bom-node-id-resolver.ts
├── protocol-adapter.ts
│   ├── → types.ts
│   └── → utils/bom-section-utils.ts
├── builder-resolver.ts
│   ├── → types.ts
│   ├── → synthetic-builder.ts
│   └── → protocol-adapter.ts
└── index.ts
    ├── → types.ts
    ├── → synthetic-builder.ts
    ├── → protocol-adapter.ts
    └── → builder-resolver.ts
```

### C. 检查清单

**重构前**:
- [ ] 备份当前代码
- [ ] 运行所有测试并记录结果
- [ ] 记录性能基准
- [ ] 创建新分支

**重构中**:
- [ ] 每个文件创建后立即添加测试
- [ ] 每次提交保持代码可编译
- [ ] 定期运行测试套件
- [ ] 使用 `madge` 检查循环依赖

**重构后**:
- [ ] 所有测试通过
- [ ] 性能无明显下降
- [ ] 文档已更新
- [ ] 代码审查通过
- [ ] 无循环依赖
- [ ] 无 TypeScript 错误
