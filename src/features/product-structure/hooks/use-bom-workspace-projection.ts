import { useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { failLoudly } from '@/lib/safe-catch'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import { getActiveBOMSections, getDefaultBOMSectionCode } from '../utils/bom-section-utils'
import {
  buildBOMWorkspaceSourceModel,
  type BOMWorkspaceParentChildrenProtocolDraft,
  type BOMWorkspaceSourceBranchNode,
  type BOMWorkspaceSourceLeafNode,
  type BOMWorkspaceSourceNode,
} from './bom-workspace-source-model'

export type BOMWorkspaceViewMode = 'summary' | 'group'
export type BOMWorkspaceSyntheticKind = 'group-empty' | 'append-row'

export interface BOMWorkspaceBranchNode {
  key: string
  sourceNodeId: string
  branchRole: 'section' | 'collection'
  label: string
  nodeType: 'branch'
  depth: number
  parentKey: string | null
  childCount: number
  isEmpty: boolean
  isExpanded: boolean
  sectionCost: number
  sectionCode: string
  sectionName: string
}

export interface BOMWorkspaceLeafNode {
  key: string
  sourceNodeId: string
  fieldId: string
  index: number
  nodeType: 'leaf'
  depth: number
  parentKey: string
  sectionCode: string
  sectionName: string
  materialId: string
  materialName: string
  unitPrice: number
  standardUsage: number
}

export type BOMWorkspaceLeafRow = BOMWorkspaceLeafNode

export interface BOMWorkspaceSyntheticNode {
  key: string
  label: string
  nodeType: 'synthetic'
  syntheticKind: BOMWorkspaceSyntheticKind
  depth: number
  parentKey: string | null
  sectionCode: string
  sectionName: string
}

export type BOMWorkspaceNode = BOMWorkspaceBranchNode | BOMWorkspaceLeafNode | BOMWorkspaceSyntheticNode
export type BOMWorkspaceVisibleNode = BOMWorkspaceLeafNode | BOMWorkspaceSyntheticNode

export interface BOMWorkspaceGroupNode extends BOMWorkspaceBranchNode {
  nodeType: 'branch'
  section: BOMSectionOption
  leafRows: BOMWorkspaceLeafNode[]
}

function resolveProjectionBranchKey(sourceBranchNode: BOMWorkspaceSourceBranchNode) {
  return sourceBranchNode.branchRole === 'section' ? sourceBranchNode.sectionCode : sourceBranchNode.nodeId
}

function resolveSourceNodeDepth(nodeId: string, nodeById: Map<string, BOMWorkspaceSourceNode>) {
  let depth = 0
  let currentNode = nodeById.get(nodeId)

  while (currentNode?.parentNodeId) {
    const parentNode = nodeById.get(currentNode.parentNodeId)
    if (!parentNode) {
      break
    }

    if (parentNode.nodeKind !== 'root') {
      depth += 1
    }

    currentNode = parentNode
  }

  return depth
}

function resolveDescendantSourceLeafNodes(nodeId: string, nodeById: Map<string, BOMWorkspaceSourceNode>): BOMWorkspaceSourceLeafNode[] {
  const sourceNode = nodeById.get(nodeId)
  if (!sourceNode) {
    return []
  }

  if (sourceNode.nodeKind === 'leaf') {
    return [sourceNode]
  }

  return sourceNode.childNodeIds.flatMap((childNodeId) => resolveDescendantSourceLeafNodes(childNodeId, nodeById))
}

function createLeafProjectionNode(
  sourceLeafNode: BOMWorkspaceSourceLeafNode,
  nodeById: Map<string, BOMWorkspaceSourceNode>
): BOMWorkspaceLeafNode {
  const parentSourceNode = sourceLeafNode.parentNodeId ? nodeById.get(sourceLeafNode.parentNodeId) : undefined

  return {
    key: sourceLeafNode.nodeId,
    sourceNodeId: sourceLeafNode.nodeId,
    fieldId: sourceLeafNode.fieldId,
    index: sourceLeafNode.index,
    nodeType: 'leaf',
    depth: resolveSourceNodeDepth(sourceLeafNode.nodeId, nodeById),
    parentKey: parentSourceNode && parentSourceNode.nodeKind === 'branch'
      ? resolveProjectionBranchKey(parentSourceNode)
      : sourceLeafNode.sectionCode,
    sectionCode: sourceLeafNode.sectionCode,
    sectionName: sourceLeafNode.sectionName,
    materialId: sourceLeafNode.materialId,
    materialName: sourceLeafNode.materialName,
    unitPrice: sourceLeafNode.unitPrice,
    standardUsage: sourceLeafNode.standardUsage,
  }
}

function buildBranchChildNodes(branchNode: BOMWorkspaceBranchNode, childNodes: BOMWorkspaceNode[]): BOMWorkspaceNode[] {
  if (branchNode.branchRole !== 'collection') {
    return childNodes
  }

  if (branchNode.isEmpty) {
    return [{
      key: `${branchNode.key}:empty`,
      label: branchNode.sectionName,
      nodeType: 'synthetic',
      syntheticKind: 'group-empty',
      depth: branchNode.depth + 1,
      parentKey: branchNode.key,
      sectionCode: branchNode.sectionCode,
      sectionName: branchNode.sectionName,
    }]
  }

  return [
    ...childNodes,
    {
      key: `${branchNode.key}:append`,
      label: branchNode.sectionName,
      nodeType: 'synthetic',
      syntheticKind: 'append-row',
      depth: branchNode.depth + 1,
      parentKey: branchNode.key,
      sectionCode: branchNode.sectionCode,
      sectionName: branchNode.sectionName,
    },
  ]
}

export interface BOMWorkspaceAppendContext {
  groupKey: string
  sectionCode: string
  sectionName: string
}

interface UseBOMWorkspaceProjectionParams {
  form: UseFormReturn<BOM>
  fields: Array<{ id: string }>
  sections: BOMSectionOption[]
  activeGroupKey: string
  expandedBranchKeys: string[]
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
}

export function useBOMWorkspaceProjection({
  form,
  fields,
  sections,
  activeGroupKey,
  expandedBranchKeys,
  protocolDraft,
}: UseBOMWorkspaceProjectionParams) {
  const watchedItems = form.watch('items')

  const resolveNumericField = (index: number, fieldName: 'unitPrice' | 'standardUsage', value: unknown) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      const error = new Error(`[CRITICAL] Missing ${fieldName} at index ${index}`)
      failLoudly(error, `useBOMWorkspaceProjection.${fieldName}`)
      throw error
    }

    return value
  }

  const activeSections = useMemo(() => getActiveBOMSections(sections), [sections])

  const sourceModel = useMemo(
    () =>
      buildBOMWorkspaceSourceModel({
        activeSections,
        fields,
        watchedItems,
        protocolDraft,
        resolveNumericField,
      }),
    [activeSections, fields, protocolDraft, watchedItems]
  )

  const leafNodesBySourceNodeId = useMemo(
    () =>
      new Map<string, BOMWorkspaceLeafNode>(
        sourceModel.leafNodes.map((sourceLeafNode) => [
          sourceLeafNode.nodeId,
          createLeafProjectionNode(sourceLeafNode, sourceModel.nodeById),
        ])
      ),
    [sourceModel]
  )

  const groups = useMemo<BOMWorkspaceGroupNode[]>(
    () =>
      sourceModel.sectionBranchNodes.map((sourceBranchNode) => {
        const leafRows = resolveDescendantSourceLeafNodes(sourceBranchNode.nodeId, sourceModel.nodeById).flatMap((sourceLeafNode) => {
          const leafNode = leafNodesBySourceNodeId.get(sourceLeafNode.nodeId)
          return leafNode ? [leafNode] : []
        })

        const sectionCost = leafRows.reduce((acc, leafRow) => acc + leafRow.standardUsage * leafRow.unitPrice, 0)

        return {
          key: sourceBranchNode.sectionCode,
          sourceNodeId: sourceBranchNode.nodeId,
          branchRole: sourceBranchNode.branchRole,
          label: sourceBranchNode.label,
          nodeType: 'branch' as const,
          depth: resolveSourceNodeDepth(sourceBranchNode.nodeId, sourceModel.nodeById),
          parentKey: null,
          childCount: leafRows.length,
          isEmpty: leafRows.length === 0,
          isExpanded: expandedBranchKeys.includes(sourceBranchNode.nodeId),
          sectionCost,
          sectionCode: sourceBranchNode.sectionCode,
          sectionName: sourceBranchNode.sectionName,
          section: sourceBranchNode.section,
          leafRows,
        }
      }),
    [expandedBranchKeys, leafNodesBySourceNodeId, sourceModel]
  )

  const nestedBranchNodes = useMemo<BOMWorkspaceBranchNode[]>(
    () =>
      sourceModel.collectionBranchNodes.map((sourceBranchNode) => {
        const leafRows = resolveDescendantSourceLeafNodes(sourceBranchNode.nodeId, sourceModel.nodeById).flatMap((sourceLeafNode) => {
          const leafNode = leafNodesBySourceNodeId.get(sourceLeafNode.nodeId)
          return leafNode ? [leafNode] : []
        })

        const sectionCost = leafRows.reduce((acc, leafRow) => acc + leafRow.standardUsage * leafRow.unitPrice, 0)
        const parentSourceNode = sourceBranchNode.parentNodeId ? sourceModel.nodeById.get(sourceBranchNode.parentNodeId) : undefined

        return {
          key: resolveProjectionBranchKey(sourceBranchNode),
          sourceNodeId: sourceBranchNode.nodeId,
          branchRole: sourceBranchNode.branchRole,
          label: sourceBranchNode.label,
          nodeType: 'branch',
          depth: resolveSourceNodeDepth(sourceBranchNode.nodeId, sourceModel.nodeById),
          parentKey: parentSourceNode && parentSourceNode.nodeKind === 'branch'
            ? resolveProjectionBranchKey(parentSourceNode)
            : null,
          childCount: leafRows.length,
          isEmpty: leafRows.length === 0,
          isExpanded: expandedBranchKeys.includes(sourceBranchNode.nodeId),
          sectionCost,
          sectionCode: sourceBranchNode.sectionCode,
          sectionName: sourceBranchNode.sectionName,
        }
      }),
    [expandedBranchKeys, leafNodesBySourceNodeId, sourceModel]
  )

  const allBranchNodes = useMemo(
    () => [...groups, ...nestedBranchNodes],
    [groups, nestedBranchNodes]
  )

  const groupNodes = useMemo<BOMWorkspaceBranchNode[]>(
    () =>
      groups.map((group) => ({
        key: group.key,
        sourceNodeId: group.sourceNodeId,
        branchRole: group.branchRole,
        label: group.label,
        nodeType: 'branch',
        depth: group.depth,
        parentKey: group.parentKey,
        childCount: group.childCount,
        isEmpty: group.isEmpty,
        isExpanded: group.isExpanded,
        sectionCost: group.sectionCost,
        sectionCode: group.sectionCode,
        sectionName: group.sectionName,
      })),
    [groups]
  )

  const branchNodeBySourceNodeId = useMemo(
    () => new Map(allBranchNodes.map((node) => [node.sourceNodeId, node])),
    [allBranchNodes]
  )

  const branchChildrenBySourceNodeId = useMemo(
    () =>
      new Map<string, BOMWorkspaceNode[]>(
        allBranchNodes.map((branchNode) => {
          const sourceBranchNode = sourceModel.nodeById.get(branchNode.sourceNodeId)
          const directChildNodes = sourceBranchNode?.nodeKind === 'branch'
            ? sourceBranchNode.childNodeIds.reduce<BOMWorkspaceNode[]>((acc, childNodeId) => {
                const sourceChildNode = sourceModel.nodeById.get(childNodeId)
                if (!sourceChildNode) {
                  return acc
                }

                if (sourceChildNode.nodeKind === 'branch') {
                  const childBranchNode = branchNodeBySourceNodeId.get(sourceChildNode.nodeId)
                  if (childBranchNode) {
                    acc.push(childBranchNode)
                  }
                  return acc
                }

                const childLeafNode = leafNodesBySourceNodeId.get(sourceChildNode.nodeId)
                if (childLeafNode) {
                  acc.push(childLeafNode)
                }

                return acc
              }, [])
            : []

          return [branchNode.sourceNodeId, buildBranchChildNodes(branchNode, directChildNodes)]
        })
      ),
    [allBranchNodes, branchNodeBySourceNodeId, leafNodesBySourceNodeId, sourceModel]
  )

  const resolvedActiveGroupKey = useMemo(() => {
    if (activeGroupKey === 'all') {
      return 'all'
    }

    return groups.some((group) => group.key === activeGroupKey) ? activeGroupKey : 'all'
  }, [activeGroupKey, groups])

  const activeGroup = useMemo(
    () => groups.find((group) => group.key === resolvedActiveGroupKey),
    [groups, resolvedActiveGroupKey]
  )

  const viewMode: BOMWorkspaceViewMode = resolvedActiveGroupKey === 'all' ? 'summary' : 'group'

  const visibleNodes = useMemo<BOMWorkspaceVisibleNode[]>(() => {
    if (viewMode !== 'group' || !activeGroup) {
      return []
    }

    const collectVisibleNodes = (branchNode: BOMWorkspaceBranchNode): BOMWorkspaceVisibleNode[] => {
      if (!branchNode.isExpanded) {
        return []
      }

      const childNodes = branchChildrenBySourceNodeId.get(branchNode.sourceNodeId) ?? []

      return childNodes.flatMap((childNode) => {
        if (childNode.nodeType === 'branch') {
          return collectVisibleNodes(childNode)
        }

        return [childNode]
      })
    }

    return collectVisibleNodes(activeGroup)
  }, [activeGroup, branchChildrenBySourceNodeId, viewMode])

  const visibleLeafRows = useMemo(
    () => visibleNodes.filter((node): node is BOMWorkspaceLeafNode => node.nodeType === 'leaf'),
    [visibleNodes]
  )

  const visibleTreeNodes = useMemo<BOMWorkspaceNode[]>(() => {
    if (viewMode !== 'group') {
      return []
    }

    const flattenNode = (node: BOMWorkspaceNode): BOMWorkspaceNode[] => {
      if (node.nodeType !== 'branch') {
        return [node]
      }

      const children = node.isExpanded ? branchChildrenBySourceNodeId.get(node.sourceNodeId) ?? [] : []

      return [node, ...children.flatMap((childNode) => flattenNode(childNode))]
    }

    return sourceModel.rootNode.childNodeIds.flatMap((childNodeId) => {
      const rootBranchNode = branchNodeBySourceNodeId.get(childNodeId)
      return rootBranchNode ? flattenNode(rootBranchNode) : []
    })
  }, [branchChildrenBySourceNodeId, branchNodeBySourceNodeId, sourceModel, viewMode])

  const appendContext = useMemo<BOMWorkspaceAppendContext>(() => {
    if (viewMode === 'group' && activeGroup) {
      return {
        groupKey: activeGroup.key,
        sectionCode: activeGroup.sectionCode,
        sectionName: activeGroup.sectionName,
      }
    }

    const defaultSectionCode = getDefaultBOMSectionCode(sections)
    const defaultSection = activeSections.find((section) => section.code === defaultSectionCode)

    return {
      groupKey: defaultSection?.code || 'all',
      sectionCode: defaultSection?.code || '',
      sectionName: defaultSection?.name || '',
    }
  }, [activeGroup, activeSections, sections, viewMode])

  return {
    activeSections,
    sourceModel,
    groups,
    groupNodes,
    resolvedActiveGroupKey,
    activeGroup,
    viewMode,
    visibleNodes,
    visibleTreeNodes,
    visibleLeafRows,
    appendContext,
  }
}
