/**
 * BOM Workspace Branch Relation Types
 *
 * 定义分支关系构建器的通用类型和接口
 */
import type { BOMSectionOption } from '../../data/bom-section-schema'
import type { BOM } from '../../data/schema'

/**
 * 分支节点角色
 */
export type BOMWorkspaceSourceBranchRole = 'section' | 'collection'

/**
 * 分支节点
 */
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

/**
 * 叶子节点
 */
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

/**
 * 分支关系构建参数
 */
export interface BOMWorkspaceBranchRelationBuildParams {
  activeSections: BOMSectionOption[]
  fields: Array<{ id: string }>
  watchedItems?: BOM['items']
  resolveNumericField: (
    index: number,
    fieldName: 'unitPrice' | 'standardUsage',
    value: unknown
  ) => number
  rootNodeId: string
}

/**
 * 分支关系构建结果
 */
export interface BOMWorkspaceBranchRelationBuildResult {
  rootChildNodeIds: string[]
  branchNodes: BOMWorkspaceSourceBranchNode[]
  sectionBranchNodes: BOMWorkspaceSourceBranchNode[]
  collectionBranchNodes: BOMWorkspaceSourceBranchNode[]
  leafNodes: BOMWorkspaceSourceLeafNode[]
}

/**
 * 分支关系构建器函数类型
 */
export type BOMWorkspaceBranchRelationBuilder = (
  params: BOMWorkspaceBranchRelationBuildParams
) => BOMWorkspaceBranchRelationBuildResult

// ============================================================================
// Re-export protocol types from schema
// ============================================================================

export type {
  BOMParentChildrenProtocolBranchDraft as BOMWorkspaceParentChildrenProtocolBranchDraft,
  BOMParentChildrenProtocolDraft as BOMWorkspaceParentChildrenProtocolDraft,
  BOMParentChildrenProtocolItemDraft as BOMWorkspaceParentChildrenProtocolItemDraft,
} from '../../data/schema'
