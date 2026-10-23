import { useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { failLoudly } from '@/lib/safe-catch'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import {
  getSortedBOMSections,
  getDefaultBOMSectionCode,
} from '../utils/bom-section-utils'
import { type BOMWorkspaceParentChildrenProtocolDraft } from './bom-workspace-branch-relation-builder'
import {
  buildBOMWorkspaceSourceModel,
  type BOMWorkspaceSourceBranchNode,
  type BOMWorkspaceSourceLeafNode,
  type BOMWorkspaceSourceNode,
} from './bom-workspace-source'

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
  isSectionActive: boolean
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

export type BOMWorkspaceNode =
  | BOMWorkspaceBranchNode
  | BOMWorkspaceLeafNode
  | BOMWorkspaceSyntheticNode
export type BOMWorkspaceVisibleNode =
  | BOMWorkspaceLeafNode
  | BOMWorkspaceSyntheticNode

export interface BOMWorkspaceGroupNode extends BOMWorkspaceBranchNode {
  nodeType: 'branch'
  section: BOMSectionOption
  leafRows: BOMWorkspaceLeafNode[]
}

function resolveProjectionBranchKey(
  sourceBranchNode: BOMWorkspaceSourceBranchNode
) {
  return sourceBranchNode.branchRole === 'section'
    ? sourceBranchNode.sectionCode
    : sourceBranchNode.nodeId
}

function resolveSourceNodeDepth(
  nodeId: string,
  nodeById: Map<string, BOMWorkspaceSourceNode>
) {
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

function isCollapsibleCollectionSourceBranchNode(
  sourceBranchNode: BOMWorkspaceSourceBranchNode,
  nodeById: Map<string, BOMWorkspaceSourceNode>
) {
  if (
    sourceBranchNode.branchRole !== 'collection' ||
    !sourceBranchNode.parentNodeId
  ) {
    return false
  }

  const parentSourceNode = nodeById.get(sourceBranchNode.parentNodeId)
  if (!parentSourceNode || parentSourceNode.nodeKind !== 'branch') {
    return false
  }

  return (
    parentSourceNode.branchRole === 'section' &&
    parentSourceNode.sectionCode === sourceBranchNode.sectionCode &&
    parentSourceNode.childNodeIds.length === 1 &&
    parentSourceNode.childNodeIds[0] === sourceBranchNode.nodeId &&
    sourceBranchNode.childNodeIds.every(
      (childNodeId) => nodeById.get(childNodeId)?.nodeKind !== 'branch'
    )
  )
}

function resolveVisibleParentSourceBranchNode(
  sourceNode: BOMWorkspaceSourceBranchNode | BOMWorkspaceSourceLeafNode,
  nodeById: Map<string, BOMWorkspaceSourceNode>
) {
  const parentSourceNode = sourceNode.parentNodeId
    ? nodeById.get(sourceNode.parentNodeId)
    : undefined
  if (!parentSourceNode || parentSourceNode.nodeKind !== 'branch') {
    return undefined
  }

  if (
    isCollapsibleCollectionSourceBranchNode(parentSourceNode, nodeById) &&
    parentSourceNode.parentNodeId
  ) {
    const visibleParentSourceNode = nodeById.get(parentSourceNode.parentNodeId)
    if (visibleParentSourceNode?.nodeKind === 'branch') {
      return visibleParentSourceNode
    }
  }

  return parentSourceNode
}

function resolveVisibleNodeDepth(
  sourceNode: BOMWorkspaceSourceBranchNode | BOMWorkspaceSourceLeafNode,
  nodeById: Map<string, BOMWorkspaceSourceNode>
) {
  const parentSourceNode = sourceNode.parentNodeId
    ? nodeById.get(sourceNode.parentNodeId)
    : undefined
  const sourceDepth = resolveSourceNodeDepth(sourceNode.nodeId, nodeById)

  if (
    parentSourceNode &&
    parentSourceNode.nodeKind === 'branch' &&
    isCollapsibleCollectionSourceBranchNode(parentSourceNode, nodeById)
  ) {
    return Math.max(sourceDepth - 1, 0)
  }

  return sourceDepth
}

function resolveDescendantSourceLeafNodes(
  nodeId: string,
  nodeById: Map<string, BOMWorkspaceSourceNode>
): BOMWorkspaceSourceLeafNode[] {
  const sourceNode = nodeById.get(nodeId)
  if (!sourceNode) {
    return []
  }

  if (sourceNode.nodeKind === 'leaf') {
    return [sourceNode]
  }

  return sourceNode.childNodeIds.flatMap((childNodeId) =>
    resolveDescendantSourceLeafNodes(childNodeId, nodeById)
  )
}

function createLeafProjectionNode(
  sourceLeafNode: BOMWorkspaceSourceLeafNode,
  nodeById: Map<string, BOMWorkspaceSourceNode>
): BOMWorkspaceLeafNode {
  const parentSourceNode = resolveVisibleParentSourceBranchNode(
    sourceLeafNode,
    nodeById
  )

  return {
    key: sourceLeafNode.nodeId,
    sourceNodeId: sourceLeafNode.nodeId,
    fieldId: sourceLeafNode.fieldId,
    index: sourceLeafNode.index,
    nodeType: 'leaf',
    depth: resolveVisibleNodeDepth(sourceLeafNode, nodeById),
    parentKey: parentSourceNode
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

function buildAppendableBranchChildNodes(
  branchNode: BOMWorkspaceBranchNode,
  childNodes: BOMWorkspaceNode[]
): BOMWorkspaceNode[] {
  if (!branchNode.isSectionActive) return childNodes
  if (branchNode.isEmpty) {
    return [
      {
        key: `${branchNode.key}:empty`,
        label: branchNode.sectionName,
        nodeType: 'synthetic',
        syntheticKind: 'group-empty',
        depth: branchNode.depth + 1,
        parentKey: branchNode.key,
        sectionCode: branchNode.sectionCode,
        sectionName: branchNode.sectionName,
      },
    ]
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

function buildBranchChildNodes(
  branchNode: BOMWorkspaceBranchNode,
  childNodes: BOMWorkspaceNode[]
): BOMWorkspaceNode[] {
  if (branchNode.branchRole !== 'collection' && childNodes.length > 0) {
    return childNodes
  }

  return buildAppendableBranchChildNodes(branchNode, childNodes)
}

interface UseBOMWorkspaceProjectionParams {
  form: UseFormReturn<BOM>
  fields: Array<{ id: string }>
  sections: BOMSectionOption[]
  branchExpansionOverrides: ReadonlyMap<string, boolean>
  protocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
}

export function useBOMWorkspaceProjection({
  form,
  fields,
  sections,
  branchExpansionOverrides,
  protocolDraft,
}: UseBOMWorkspaceProjectionParams) {
  const watchedItems = form.watch('items')

  const resolveNumericField = (
    index: number,
    fieldName: 'unitPrice' | 'standardUsage',
    value: unknown
  ) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      const error = new Error(
        `[CRITICAL] Missing ${fieldName} at index ${index}`
      )
      failLoudly(error, `useBOMWorkspaceProjection.${fieldName}`)
      throw error
    }

    return value
  }

  // The protocol includes inactive catalog entries so historical rows remain resolvable.
  const catalogSections = useMemo(
    () => getSortedBOMSections(sections),
    [sections]
  )

  const sourceModel = useMemo(
    () =>
      buildBOMWorkspaceSourceModel({
        activeSections: catalogSections,
        fields,
        watchedItems,
        protocolDraft,
        resolveNumericField,
      }),
    [catalogSections, fields, protocolDraft, watchedItems]
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
      sourceModel.sectionBranchNodes
        .map((sourceBranchNode) => {
          const leafRows = resolveDescendantSourceLeafNodes(
            sourceBranchNode.nodeId,
            sourceModel.nodeById
          ).flatMap((sourceLeafNode) => {
            const leafNode = leafNodesBySourceNodeId.get(sourceLeafNode.nodeId)
            return leafNode ? [leafNode] : []
          })

          const sectionCost = leafRows.reduce(
            (acc, leafRow) => acc + leafRow.standardUsage * leafRow.unitPrice,
            0
          )

          return {
            key: sourceBranchNode.sectionCode,
            sourceNodeId: sourceBranchNode.nodeId,
            branchRole: sourceBranchNode.branchRole,
            label: sourceBranchNode.label,
            nodeType: 'branch' as const,
            depth: resolveSourceNodeDepth(
              sourceBranchNode.nodeId,
              sourceModel.nodeById
            ),
            parentKey: null,
            childCount: leafRows.length,
            isEmpty: leafRows.length === 0,
            isExpanded:
              branchExpansionOverrides.get(sourceBranchNode.nodeId) ??
              (leafRows.length > 0 ||
                (sourceModel.leafNodes.length === 0 &&
                  sourceBranchNode.sectionCode ===
                    getDefaultBOMSectionCode(sections))),
            sectionCost,
            sectionCode: sourceBranchNode.sectionCode,
            sectionName: sourceBranchNode.sectionName,
            isSectionActive: sourceBranchNode.section.active,
            section: sourceBranchNode.section,
            leafRows,
          }
        })
        .filter((group) => group.isSectionActive || !group.isEmpty),
    [branchExpansionOverrides, leafNodesBySourceNodeId, sourceModel, sections]
  )

  const nestedBranchNodes = useMemo<BOMWorkspaceBranchNode[]>(
    () =>
      sourceModel.collectionBranchNodes
        .filter(
          (sourceBranchNode) =>
            !isCollapsibleCollectionSourceBranchNode(
              sourceBranchNode,
              sourceModel.nodeById
            )
        )
        .map((sourceBranchNode) => {
          const leafRows = resolveDescendantSourceLeafNodes(
            sourceBranchNode.nodeId,
            sourceModel.nodeById
          ).flatMap((sourceLeafNode) => {
            const leafNode = leafNodesBySourceNodeId.get(sourceLeafNode.nodeId)
            return leafNode ? [leafNode] : []
          })

          const sectionCost = leafRows.reduce(
            (acc, leafRow) => acc + leafRow.standardUsage * leafRow.unitPrice,
            0
          )
          const parentSourceNode = resolveVisibleParentSourceBranchNode(
            sourceBranchNode,
            sourceModel.nodeById
          )

          return {
            key: resolveProjectionBranchKey(sourceBranchNode),
            sourceNodeId: sourceBranchNode.nodeId,
            branchRole: sourceBranchNode.branchRole,
            label: sourceBranchNode.label,
            nodeType: 'branch',
            depth: resolveVisibleNodeDepth(
              sourceBranchNode,
              sourceModel.nodeById
            ),
            parentKey: parentSourceNode
              ? resolveProjectionBranchKey(parentSourceNode)
              : null,
            childCount: leafRows.length,
            isEmpty: leafRows.length === 0,
            isExpanded:
              branchExpansionOverrides.get(sourceBranchNode.nodeId) ??
              leafRows.length > 0,
            sectionCost,
            sectionCode: sourceBranchNode.sectionCode,
            sectionName: sourceBranchNode.sectionName,
            isSectionActive: sourceBranchNode.section.active,
          }
        }),
    [branchExpansionOverrides, leafNodesBySourceNodeId, sourceModel]
  )

  const allBranchNodes = useMemo(
    () => [...groups, ...nestedBranchNodes],
    [groups, nestedBranchNodes]
  )

  const branchNodeBySourceNodeId = useMemo(
    () => new Map(allBranchNodes.map((node) => [node.sourceNodeId, node])),
    [allBranchNodes]
  )

  const branchChildrenBySourceNodeId = useMemo(
    () =>
      new Map<string, BOMWorkspaceNode[]>(
        allBranchNodes.map((branchNode) => {
          const sourceBranchNode = sourceModel.nodeById.get(
            branchNode.sourceNodeId
          )
          const resolveCollapsibleCollectionChildNodes = (
            sourceCollectionBranchNode: BOMWorkspaceSourceBranchNode
          ) => {
            const childNodes = sourceCollectionBranchNode.childNodeIds.reduce<
              BOMWorkspaceNode[]
            >((acc, childNodeId) => {
              const sourceChildNode = sourceModel.nodeById.get(childNodeId)
              if (!sourceChildNode || sourceChildNode.nodeKind !== 'leaf') {
                return acc
              }

              const childLeafNode = leafNodesBySourceNodeId.get(
                sourceChildNode.nodeId
              )
              if (childLeafNode) {
                acc.push(childLeafNode)
              }

              return acc
            }, [])

            return buildAppendableBranchChildNodes(branchNode, childNodes)
          }

          const directChildNodes =
            sourceBranchNode?.nodeKind === 'branch'
              ? sourceBranchNode.childNodeIds.reduce<BOMWorkspaceNode[]>(
                  (acc, childNodeId) => {
                    const sourceChildNode =
                      sourceModel.nodeById.get(childNodeId)
                    if (!sourceChildNode) {
                      return acc
                    }

                    if (sourceChildNode.nodeKind === 'branch') {
                      if (
                        isCollapsibleCollectionSourceBranchNode(
                          sourceChildNode,
                          sourceModel.nodeById
                        )
                      ) {
                        acc.push(
                          ...resolveCollapsibleCollectionChildNodes(
                            sourceChildNode
                          )
                        )
                        return acc
                      }

                      const childBranchNode = branchNodeBySourceNodeId.get(
                        sourceChildNode.nodeId
                      )
                      if (childBranchNode) {
                        acc.push(childBranchNode)
                      }
                      return acc
                    }

                    const childLeafNode = leafNodesBySourceNodeId.get(
                      sourceChildNode.nodeId
                    )
                    if (childLeafNode) {
                      acc.push(childLeafNode)
                    }

                    return acc
                  },
                  []
                )
              : []

          return [
            branchNode.sourceNodeId,
            buildBranchChildNodes(branchNode, directChildNodes),
          ]
        })
      ),
    [
      allBranchNodes,
      branchNodeBySourceNodeId,
      leafNodesBySourceNodeId,
      sourceModel,
    ]
  )

  const visibleTreeNodes = useMemo<BOMWorkspaceNode[]>(() => {
    const flattenNode = (node: BOMWorkspaceNode): BOMWorkspaceNode[] => {
      if (node.nodeType !== 'branch') {
        return [node]
      }

      const children = node.isExpanded
        ? (branchChildrenBySourceNodeId.get(node.sourceNodeId) ?? [])
        : []

      return [node, ...children.flatMap((childNode) => flattenNode(childNode))]
    }

    return sourceModel.rootNode.childNodeIds.flatMap((childNodeId) => {
      const rootBranchNode = branchNodeBySourceNodeId.get(childNodeId)
      return rootBranchNode ? flattenNode(rootBranchNode) : []
    })
  }, [branchChildrenBySourceNodeId, branchNodeBySourceNodeId, sourceModel])

  return {
    sourceModel,
    groups,
    branchNodes: allBranchNodes,
    visibleTreeNodes,
  }
}
