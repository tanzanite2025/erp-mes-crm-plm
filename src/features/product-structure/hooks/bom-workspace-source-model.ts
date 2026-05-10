import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import {
  type BOMWorkspaceBranchRelationBuilder,
  type BOMWorkspaceParentChildrenProtocolDraft,
  type BOMWorkspaceSourceBranchNode,
  type BOMWorkspaceSourceLeafNode,
} from './bom-workspace-branch-relation-builder'
import { resolveBOMWorkspaceBranchRelationBuilder } from './bom-workspace-branch-relation-builder-resolver'

export type BOMWorkspaceSourceNodeKind = 'root' | 'branch' | 'leaf'
export {
  buildParentChildrenProtocolBranchRelations,
  buildSyntheticBOMWorkspaceBranchRelations,
  resolveBOMWorkspaceBranchRelationBuilder,
  resolveBOMWorkspaceSourceBranchNodeId,
  resolveBOMWorkspaceSourceCollectionBranchNodeId,
  resolveBOMWorkspaceSourceLeafNodeId,
} from './bom-workspace-branch-relation-builder'
export type {
  BOMWorkspaceParentChildrenProtocolBranchDraft,
  BOMWorkspaceParentChildrenProtocolDraft,
  BOMWorkspaceParentChildrenProtocolItemDraft,
  BOMWorkspaceBranchRelationBuildParams,
  BOMWorkspaceBranchRelationBuildResult,
  BOMWorkspaceBranchRelationBuilder,
  BOMWorkspaceSourceBranchNode,
  BOMWorkspaceSourceBranchRole,
  BOMWorkspaceSourceLeafNode,
  BuildBOMWorkspaceParentChildrenProtocolBranchRelationsParams,
  ResolveBOMWorkspaceBranchRelationBuilderParams,
} from './bom-workspace-branch-relation-builder'

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

interface BuildBOMWorkspaceSourceModelParams {
  activeSections: BOMSectionOption[]
  fields: Array<{ id: string }>
  watchedItems?: BOM['items']
  resolveNumericField: (index: number, fieldName: 'unitPrice' | 'standardUsage', value: unknown) => number
  branchRelationBuilder?: BOMWorkspaceBranchRelationBuilder
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
}

export function resolveBOMWorkspaceSourceRootNodeId() {
  return 'root'
}

export function buildBOMWorkspaceSourceModel({
  activeSections,
  fields,
  watchedItems,
  resolveNumericField,
  branchRelationBuilder,
  protocolDraft,
}: BuildBOMWorkspaceSourceModelParams): BOMWorkspaceSourceModel {
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
