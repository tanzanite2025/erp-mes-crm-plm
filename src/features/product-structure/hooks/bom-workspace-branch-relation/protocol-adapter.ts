/**
 * Protocol Branch Relation Builder
 *
 * 实现基于父子关系协议的分支关系构建器
 */
import { failLoudly } from '@/lib/safe-catch'
import type { BOMSectionOption } from '../../data/bom-section-schema'
import type { BOM } from '../../data/schema'
import { parseLeafNodeId } from '../../utils/bom-node-id-resolver'
import { resolveBOMSection } from '../../utils/bom-section-utils'
import type {
  BOMWorkspaceBranchRelationBuilder,
  BOMWorkspaceBranchRelationBuildResult,
  BOMWorkspaceSourceBranchNode,
  BOMWorkspaceSourceBranchRole,
  BOMWorkspaceSourceLeafNode,
  BOMWorkspaceParentChildrenProtocolDraft,
  BOMWorkspaceParentChildrenProtocolBranchDraft,
  BOMWorkspaceParentChildrenProtocolItemDraft,
} from './types'

/**
 * 构建父子关系协议分支关系的参数
 */
export interface BuildBOMWorkspaceParentChildrenProtocolBranchRelationsParams {
  protocolDraft: BOMWorkspaceParentChildrenProtocolDraft
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

interface BOMWorkspaceResolvedFormItemReference {
  fieldId: string
  index: number
  item: BOM['items'][number]
}

function throwProtocolAdapterError(message: string): never {
  const error = new Error(`[CRITICAL] ${message}`)
  failLoudly(error, 'buildParentChildrenProtocolBranchRelations', {
    silentUI: true,
  })
  throw error
}

function normalizeOptionalId(value?: string | null) {
  return value || null
}

function ensureUniqueIds(ids: string[], scope: string) {
  const idSet = new Set<string>()
  ids.forEach((id) => {
    if (idSet.has(id)) {
      throwProtocolAdapterError(`Duplicate ${scope} id: ${id}`)
    }
    idSet.add(id)
  })
}

/**
 * 解析 section 选项
 * 使用统一的 resolveBOMSection 函数
 */
function resolveSectionOptionForProtocol(
  sectionCode: string,
  sectionName: string | undefined,
  activeSections: BOMSectionOption[]
) {
  const section = resolveBOMSection(activeSections, sectionCode)
  if (!section) {
    throwProtocolAdapterError(
      `Missing active BOM section for protocol sectionCode: ${sectionCode}`
    )
  }

  return {
    section,
    sectionName: sectionName || section.name,
  }
}

function resolveRootChildNodeIds(
  protocolDraft: BOMWorkspaceParentChildrenProtocolDraft,
  branchDraftById: Map<string, BOMWorkspaceParentChildrenProtocolBranchDraft>,
  rootNodeId: string
) {
  const derivedRootChildNodeIds =
    protocolDraft.rootChildren.length > 0
      ? protocolDraft.rootChildren
      : protocolDraft.branchNodes
          .filter(
            (branchNode: BOMWorkspaceParentChildrenProtocolBranchDraft) => {
              const parentId = normalizeOptionalId(branchNode.parentId)
              return parentId === null || parentId === rootNodeId
            }
          )
          .map(
            (branchNode: BOMWorkspaceParentChildrenProtocolBranchDraft) =>
              branchNode.id
          )

  ensureUniqueIds(derivedRootChildNodeIds, 'protocol root child')

  derivedRootChildNodeIds.forEach((nodeId: string) => {
    const branchDraft = branchDraftById.get(nodeId)
    if (!branchDraft) {
      throwProtocolAdapterError(`Root child is not a branch node: ${nodeId}`)
    }

    const parentId = normalizeOptionalId(branchDraft.parentId)
    if (parentId !== null && parentId !== rootNodeId) {
      throwProtocolAdapterError(
        `Root child branch ${nodeId} must use root parent`
      )
    }
  })

  return derivedRootChildNodeIds
}

function createResolvedFormItemReferences(
  fields: Array<{ id: string }>,
  watchedItems?: BOM['items']
) {
  const referencesByItemId = new Map<
    string,
    BOMWorkspaceResolvedFormItemReference
  >()
  const referencesByFieldId = new Map<
    string,
    BOMWorkspaceResolvedFormItemReference
  >()

  fields.forEach((field, index) => {
    const item = watchedItems?.[index]
    if (!item) {
      return
    }

    const reference: BOMWorkspaceResolvedFormItemReference = {
      fieldId: field.id,
      index,
      item,
    }

    referencesByFieldId.set(field.id, reference)

    const normalizedItemId = item.id?.trim()
    if (normalizedItemId) {
      referencesByItemId.set(normalizedItemId, reference)
    }
  })

  return {
    referencesByItemId,
    referencesByFieldId,
  }
}

/**
 * 解析字段引用
 * 使用统一的 parseLeafNodeId 而不是手动解析
 */
function resolveFieldReferenceByProtocolNodeId(
  nodeId: string,
  referencesByFieldId: Map<string, BOMWorkspaceResolvedFormItemReference>
) {
  const directMatch = referencesByFieldId.get(nodeId)
  if (directMatch) {
    return directMatch
  }

  // 使用统一的 ID 解析器
  const parsed = parseLeafNodeId(nodeId)
  if (parsed && 'fieldId' in parsed) {
    return referencesByFieldId.get(parsed.fieldId)
  }

  return undefined
}

function resolveFormItemReference(
  itemDraft: BOMWorkspaceParentChildrenProtocolItemDraft,
  referencesByItemId: Map<string, BOMWorkspaceResolvedFormItemReference>,
  referencesByFieldId: Map<string, BOMWorkspaceResolvedFormItemReference>
) {
  const normalizedDraftNodeId = itemDraft.id
  const normalizedDraftItemId = itemDraft.itemId

  return (
    (normalizedDraftItemId
      ? referencesByItemId.get(normalizedDraftItemId)
      : undefined) ??
    referencesByItemId.get(normalizedDraftNodeId) ??
    resolveFieldReferenceByProtocolNodeId(
      normalizedDraftNodeId,
      referencesByFieldId
    ) ??
    throwProtocolAdapterError(
      `Unable to resolve protocol item node to current form row: ${normalizedDraftNodeId}`
    )
  )
}

function resolveBranchRole(
  branchDraft: BOMWorkspaceParentChildrenProtocolBranchDraft,
  rootChildNodeIds: Set<string>
): BOMWorkspaceSourceBranchRole {
  const branchId = branchDraft.id
  const isRootChild = rootChildNodeIds.has(branchId)
  const branchRole =
    (branchDraft.branchRole as BOMWorkspaceSourceBranchRole) ??
    (isRootChild ? 'section' : 'collection')

  if (isRootChild && branchRole !== 'section') {
    throwProtocolAdapterError(
      `Root child branch must use section role: ${branchId}`
    )
  }

  if (!isRootChild && branchRole === 'section') {
    throwProtocolAdapterError(
      `Nested branch cannot use section role: ${branchId}`
    )
  }

  return branchRole
}

/**
 * 构建基于父子关系协议的分支关系
 *
 * 此函数返回一个构建器，该构建器使用提供的协议草稿来构建分支关系。
 *
 * @param protocolDraft - 父子关系协议草稿
 * @returns 分支关系构建器函数
 *
 * @example
 * ```typescript
 * const builder = buildParentChildrenProtocolBranchRelations(myProtocol)
 * const result = builder({
 *   activeSections: sections,
 *   fields: fields,
 *   watchedItems: items,
 *   resolveNumericField: (i, f, v) => Number(v) || 0,
 *   rootNodeId: 'root',
 * })
 * ```
 */
export function buildParentChildrenProtocolBranchRelations(
  protocolDraft: BOMWorkspaceParentChildrenProtocolDraft
): BOMWorkspaceBranchRelationBuilder {
  return (params): BOMWorkspaceBranchRelationBuildResult => {
    const {
      activeSections,
      fields,
      watchedItems,
      resolveNumericField,
      rootNodeId,
    } = params

    const branchDraftIds = protocolDraft.branchNodes.map(
      (branchNode: BOMWorkspaceParentChildrenProtocolBranchDraft) =>
        branchNode.id
    )
    const itemDraftIds = protocolDraft.itemNodes.map(
      (itemNode: BOMWorkspaceParentChildrenProtocolItemDraft) => itemNode.id
    )

    ensureUniqueIds(branchDraftIds, 'protocol branch')
    ensureUniqueIds(itemDraftIds, 'protocol item')

    const duplicateNodeId = itemDraftIds.find((itemId: string) =>
      branchDraftIds.includes(itemId)
    )
    if (duplicateNodeId) {
      throwProtocolAdapterError(
        `Protocol branch and item node ids must be unique: ${duplicateNodeId}`
      )
    }

    if (
      branchDraftIds.includes(rootNodeId) ||
      itemDraftIds.includes(rootNodeId)
    ) {
      throwProtocolAdapterError(
        `Protocol node id cannot reuse root node id: ${rootNodeId}`
      )
    }

    const branchDraftById = new Map<
      string,
      BOMWorkspaceParentChildrenProtocolBranchDraft
    >(
      protocolDraft.branchNodes.map(
        (branchNode: BOMWorkspaceParentChildrenProtocolBranchDraft) => [
          branchNode.id,
          branchNode,
        ]
      )
    )
    const allNodeIds = new Set<string>([...branchDraftIds, ...itemDraftIds])

    const rootChildNodeIds = resolveRootChildNodeIds(
      protocolDraft,
      branchDraftById,
      rootNodeId
    )
    const rootChildNodeIdSet = new Set<string>(rootChildNodeIds)

    const branchNodes =
      protocolDraft.branchNodes.map<BOMWorkspaceSourceBranchNode>(
        (branchDraft: BOMWorkspaceParentChildrenProtocolBranchDraft) => {
          const branchNodeId = branchDraft.id
          const parentId = normalizeOptionalId(branchDraft.parentId)
          const branchRole = resolveBranchRole(branchDraft, rootChildNodeIdSet)
          const { section, sectionName } = resolveSectionOptionForProtocol(
            branchDraft.sectionCode,
            branchDraft.sectionName,
            activeSections
          )
          const childNodeIds = branchDraft.children

          ensureUniqueIds(
            childNodeIds,
            `protocol child node for branch ${branchNodeId}`
          )

          childNodeIds.forEach((childNodeId: string) => {
            if (!allNodeIds.has(childNodeId)) {
              throwProtocolAdapterError(
                `Branch ${branchNodeId} references missing child node: ${childNodeId}`
              )
            }
          })

          if (rootChildNodeIdSet.has(branchNodeId)) {
            if (parentId !== null && parentId !== rootNodeId) {
              throwProtocolAdapterError(
                `Root child branch ${branchNodeId} must use root parent`
              )
            }

            return {
              nodeId: branchNodeId,
              parentNodeId: rootNodeId,
              childNodeIds,
              nodeKind: 'branch',
              branchRole,
              sectionCode: section.code,
              sectionName,
              label: branchDraft.label || section.name,
              section,
            }
          }

          if (!parentId || parentId === rootNodeId) {
            throwProtocolAdapterError(
              `Nested branch ${branchNodeId} must reference a non-root branch parent`
            )
          }

          if (!branchDraftById.has(parentId)) {
            throwProtocolAdapterError(
              `Nested branch ${branchNodeId} references missing parent branch: ${parentId}`
            )
          }

          return {
            nodeId: branchNodeId,
            parentNodeId: parentId,
            childNodeIds,
            nodeKind: 'branch',
            branchRole,
            sectionCode: section.code,
            sectionName,
            label: branchDraft.label || section.name,
            section,
          }
        }
      )

    const { referencesByItemId, referencesByFieldId } =
      createResolvedFormItemReferences(fields, watchedItems)

    const leafNodes = protocolDraft.itemNodes.map<BOMWorkspaceSourceLeafNode>(
      (itemDraft: BOMWorkspaceParentChildrenProtocolItemDraft) => {
        const itemNodeId = itemDraft.id
        const parentId = normalizeOptionalId(itemDraft.parentId)
        const { section, sectionName } = resolveSectionOptionForProtocol(
          itemDraft.sectionCode,
          itemDraft.sectionName,
          activeSections
        )
        const childNodeIds = itemDraft.children

        if (childNodeIds.length > 0) {
          throwProtocolAdapterError(
            `Leaf item node cannot have children: ${itemNodeId}`
          )
        }

        if (!parentId || parentId === rootNodeId) {
          throwProtocolAdapterError(
            `Leaf item node must reference a branch parent: ${itemNodeId}`
          )
        }

        if (!branchDraftById.has(parentId)) {
          throwProtocolAdapterError(
            `Leaf item node references missing parent branch: ${itemNodeId}`
          )
        }

        const resolvedItemReference = resolveFormItemReference(
          itemDraft,
          referencesByItemId,
          referencesByFieldId
        )
        if (resolvedItemReference.item.section !== section.code) {
          throwProtocolAdapterError(
            `Protocol item section does not match current form row: ${itemNodeId}`
          )
        }

        return {
          nodeId: itemNodeId,
          parentNodeId: parentId,
          childNodeIds: [],
          nodeKind: 'leaf',
          sectionCode: section.code,
          sectionName,
          itemId: resolvedItemReference.item.id || itemDraft.itemId || '',
          fieldId: resolvedItemReference.fieldId,
          index: resolvedItemReference.index,
          materialId: resolvedItemReference.item.materialId ?? '',
          materialName: resolvedItemReference.item.materialName ?? '',
          unitPrice: resolveNumericField(
            resolvedItemReference.index,
            'unitPrice',
            resolvedItemReference.item.unitPrice
          ),
          standardUsage: resolveNumericField(
            resolvedItemReference.index,
            'standardUsage',
            resolvedItemReference.item.standardUsage
          ),
        }
      }
    )

    const branchNodeById = new Map<string, BOMWorkspaceSourceBranchNode>(
      branchNodes.map((branchNode: BOMWorkspaceSourceBranchNode) => [
        branchNode.nodeId,
        branchNode,
      ])
    )
    const leafNodeById = new Map<string, BOMWorkspaceSourceLeafNode>(
      leafNodes.map((leafNode: BOMWorkspaceSourceLeafNode) => [
        leafNode.nodeId,
        leafNode,
      ])
    )

    branchNodes.forEach((branchNode: BOMWorkspaceSourceBranchNode) => {
      if (branchNode.parentNodeId === rootNodeId) {
        if (!rootChildNodeIdSet.has(branchNode.nodeId)) {
          throwProtocolAdapterError(
            `Top-level branch must be declared in protocol root children: ${branchNode.nodeId}`
          )
        }
        return
      }

      const parentBranchNode = branchNode.parentNodeId
        ? branchNodeById.get(branchNode.parentNodeId)
        : undefined
      if (!parentBranchNode) {
        throwProtocolAdapterError(
          `Branch references missing mapped parent branch: ${branchNode.nodeId}`
        )
      }

      if (!parentBranchNode.childNodeIds.includes(branchNode.nodeId)) {
        throwProtocolAdapterError(
          `Parent branch is missing child relation for branch: ${branchNode.nodeId}`
        )
      }
    })

    leafNodes.forEach((leafNode: BOMWorkspaceSourceLeafNode) => {
      const parentBranchNode = branchNodeById.get(leafNode.parentNodeId || '')
      if (!parentBranchNode) {
        throwProtocolAdapterError(
          `Leaf node references missing mapped parent branch: ${leafNode.nodeId}`
        )
      }

      if (!parentBranchNode.childNodeIds.includes(leafNode.nodeId)) {
        throwProtocolAdapterError(
          `Parent branch is missing child relation for leaf: ${leafNode.nodeId}`
        )
      }
    })

    branchNodes.forEach((branchNode: BOMWorkspaceSourceBranchNode) => {
      branchNode.childNodeIds.forEach((childNodeId: string) => {
        const childBranchNode = branchNodeById.get(childNodeId)
        const childLeafNode = leafNodeById.get(childNodeId)

        if (
          childBranchNode &&
          childBranchNode.parentNodeId !== branchNode.nodeId
        ) {
          throwProtocolAdapterError(
            `Child branch parent relation mismatch: ${childNodeId}`
          )
        }

        if (childLeafNode && childLeafNode.parentNodeId !== branchNode.nodeId) {
          throwProtocolAdapterError(
            `Child leaf parent relation mismatch: ${childNodeId}`
          )
        }
      })
    })

    const sectionBranchNodes = branchNodes.filter(
      (branchNode: BOMWorkspaceSourceBranchNode) =>
        branchNode.branchRole === 'section'
    )
    const collectionBranchNodes = branchNodes.filter(
      (branchNode: BOMWorkspaceSourceBranchNode) =>
        branchNode.branchRole === 'collection'
    )

    ensureUniqueIds(
      sectionBranchNodes.map(
        (branchNode: BOMWorkspaceSourceBranchNode) => branchNode.sectionCode
      ),
      'section branch sectionCode'
    )

    return {
      rootChildNodeIds,
      branchNodes,
      sectionBranchNodes,
      collectionBranchNodes,
      leafNodes,
    }
  }
}
