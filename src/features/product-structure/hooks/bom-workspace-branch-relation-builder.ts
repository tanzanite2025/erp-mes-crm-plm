import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'

export {
  buildParentChildrenProtocolBranchRelations,
} from './bom-workspace-parent-children-protocol-adapter'
export type {
  BOMWorkspaceParentChildrenProtocolBranchDraft,
  BOMWorkspaceParentChildrenProtocolDraft,
  BOMWorkspaceParentChildrenProtocolItemDraft,
  BuildBOMWorkspaceParentChildrenProtocolBranchRelationsParams,
} from './bom-workspace-parent-children-protocol-adapter'
export {
  resolveBOMWorkspaceBranchRelationBuilder,
} from './bom-workspace-branch-relation-builder-resolver'
export type {
  ResolveBOMWorkspaceBranchRelationBuilderParams,
} from './bom-workspace-branch-relation-builder-resolver'

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

export function resolveBOMWorkspaceSourceBranchNodeId(sectionCode: string) {
  return `section:${sectionCode}`
}

export function resolveBOMWorkspaceSourceCollectionBranchNodeId(sectionCode: string) {
  return `section:${sectionCode}:collection`
}

export function resolveBOMWorkspaceSourceLeafNodeId(itemId: string | undefined, fieldId: string) {
  const normalizedItemId = itemId?.trim()
  return normalizedItemId ? `item:${normalizedItemId}` : `field:${fieldId}`
}

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
      const branchNodeId = resolveBOMWorkspaceSourceBranchNodeId(section.code)
      const collectionBranchNodeId = resolveBOMWorkspaceSourceCollectionBranchNodeId(section.code)

      const sectionLeafNodes = fields.flatMap((field, index) => {
        const item = watchedItems?.[index]
        if (!item || item.section !== section.code) {
          return []
        }

        const unitPrice = resolveNumericField(index, 'unitPrice', item.unitPrice)
        const standardUsage = resolveNumericField(index, 'standardUsage', item.standardUsage)

        return [{
          nodeId: resolveBOMWorkspaceSourceLeafNodeId(item.id, field.id),
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
