/**
 * BOM Workspace Source Model Builder
 *
 * 提供构建 BOM workspace 源数据模型的功能
 */
import type { BOMSectionOption } from '../../data/bom-section-schema'
import type { BOM } from '../../data/schema'
import { resolveBOMWorkspaceBranchRelationBuilder } from '../bom-workspace-branch-relation/builder-resolver'
import type {
  BOMWorkspaceBranchRelationBuilder,
  BOMWorkspaceParentChildrenProtocolDraft,
} from '../bom-workspace-branch-relation/types'
import type {
  BOMWorkspaceSourceModel,
  BOMWorkspaceSourceRootNode,
  BOMWorkspaceSourceNode,
} from './types'

/**
 * 构建 BOM Workspace Source Model 的参数
 */
export interface BuildBOMWorkspaceSourceModelParams {
  /** 激活的 sections */
  activeSections: BOMSectionOption[]
  /** 字段列表 */
  fields: Array<{ id: string }>
  /** 监听的 items */
  watchedItems?: BOM['items']
  /** 解析数值字段的函数 */
  resolveNumericField: (
    index: number,
    fieldName: 'unitPrice' | 'standardUsage',
    value: unknown
  ) => number
  /** 自定义分支关系构建器 */
  branchRelationBuilder?: BOMWorkspaceBranchRelationBuilder
  /** 父子关系协议草稿 */
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
}

/**
 * 获取根节点 ID
 *
 * @returns 根节点的固定 ID
 */
export function resolveBOMWorkspaceSourceRootNodeId(): string {
  return 'root'
}

/**
 * 构建 BOM Workspace Source Model
 *
 * 根据提供的参数构建完整的 workspace 源数据模型，包括：
 * - 根节点
 * - 分支节点（section 和 collection）
 * - 叶子节点（items）
 * - 节点关系映射
 *
 * @param params - 构建参数
 * @returns 完整的 BOM Workspace Source Model
 *
 * @example
 * ```typescript
 * const model = buildBOMWorkspaceSourceModel({
 *   activeSections: getActiveBOMSections(sections),
 *   fields: formFields,
 *   watchedItems: form.watch('items'),
 *   resolveNumericField: (index, fieldName, value) => {
 *     return parseFloat(String(value)) || 0
 *   },
 * })
 * ```
 */
export function buildBOMWorkspaceSourceModel({
  activeSections,
  fields,
  watchedItems,
  resolveNumericField,
  branchRelationBuilder,
  protocolDraft,
}: BuildBOMWorkspaceSourceModelParams): BOMWorkspaceSourceModel {
  const rootNodeId = resolveBOMWorkspaceSourceRootNodeId()
  const resolvedBranchRelationBuilder =
    resolveBOMWorkspaceBranchRelationBuilder({
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

  const sourceNodes: BOMWorkspaceSourceNode[] = [
    rootNode,
    ...branchNodes,
    ...leafNodes,
  ]
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
