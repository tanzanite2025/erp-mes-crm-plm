import { failLoudly } from '@/lib/safe-catch'
import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import type {
  BOMWorkspaceBranchRelationBuildResult,
  BOMWorkspaceSourceBranchNode,
  BOMWorkspaceSourceBranchRole,
  BOMWorkspaceSourceLeafNode,
} from './bom-workspace-branch-relation-builder'

export type BOMWorkspaceParentChildrenProtocolNodeKind = 'branch' | 'item'

export interface BOMWorkspaceParentChildrenProtocolBranchDraft {
  id: string
  parentId: string | null
  children: string[]
  nodeKind: 'branch'
  branchRole?: BOMWorkspaceSourceBranchRole
  label: string
  sectionCode: string
  sectionName?: string
}

export interface BOMWorkspaceParentChildrenProtocolItemDraft {
  id: string
  parentId: string | null
  children: string[]
  nodeKind: 'item'
  sectionCode: string
  sectionName?: string
  itemId?: string
}

export interface BOMWorkspaceParentChildrenProtocolDraft {
  rootChildren: string[]
  branchNodes: BOMWorkspaceParentChildrenProtocolBranchDraft[]
  itemNodes: BOMWorkspaceParentChildrenProtocolItemDraft[]
}

export interface BuildBOMWorkspaceParentChildrenProtocolBranchRelationsParams {
  protocolDraft: BOMWorkspaceParentChildrenProtocolDraft
  activeSections: BOMSectionOption[]
  fields: Array<{ id: string }>
  watchedItems?: BOM['items']
  resolveNumericField: (index: number, fieldName: 'unitPrice' | 'standardUsage', value: unknown) => number
  rootNodeId: string
}

interface BOMWorkspaceResolvedFormItemReference {
  fieldId: string
  index: number
  item: BOM['items'][number]
}

function throwProtocolAdapterError(message: string): never {
  const error = new Error(`[CRITICAL] ${message}`)
  failLoudly(error, 'buildParentChildrenProtocolBranchRelations', { silentUI: true })
  throw error
}

function normalizeRequiredId(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) {
    throwProtocolAdapterError(`Missing ${label} in parent/children protocol draft`)
  }
  return normalized
}

function normalizeOptionalId(value?: string | null) {
  const normalized = value?.trim() ?? ''
  return normalized || null
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

function resolveSectionOption(
  sectionCode: string,
  sectionName: string | undefined,
  activeSectionsByCode: Map<string, BOMSectionOption>
) {
  const normalizedSectionCode = normalizeRequiredId(sectionCode, 'protocol sectionCode')
  const section = activeSectionsByCode.get(normalizedSectionCode)
  if (!section) {
    throwProtocolAdapterError(`Missing active BOM section for protocol sectionCode: ${normalizedSectionCode}`)
  }

  return {
    section,
    sectionName: sectionName?.trim() || section.name,
  }
}

function resolveRootChildNodeIds(
  protocolDraft: BOMWorkspaceParentChildrenProtocolDraft,
  branchDraftById: Map<string, BOMWorkspaceParentChildrenProtocolBranchDraft>,
  rootNodeId: string
) {
  const derivedRootChildNodeIds = protocolDraft.rootChildren.length > 0
    ? protocolDraft.rootChildren.map((nodeId) => normalizeRequiredId(nodeId, 'protocol root child id'))
    : protocolDraft.branchNodes
        .filter((branchNode) => {
          const parentId = normalizeOptionalId(branchNode.parentId)
          return parentId === null || parentId === rootNodeId
        })
        .map((branchNode) => normalizeRequiredId(branchNode.id, 'protocol branch id'))

  ensureUniqueIds(derivedRootChildNodeIds, 'protocol root child')

  derivedRootChildNodeIds.forEach((nodeId) => {
    const branchDraft = branchDraftById.get(nodeId)
    if (!branchDraft) {
      throwProtocolAdapterError(`Root child is not a branch node: ${nodeId}`)
    }

    const parentId = normalizeOptionalId(branchDraft.parentId)
    if (parentId !== null && parentId !== rootNodeId) {
      throwProtocolAdapterError(`Root child branch ${nodeId} must use root parent`)
    }
  })

  return derivedRootChildNodeIds
}

function createResolvedFormItemReferences(
  fields: Array<{ id: string }>,
  watchedItems?: BOM['items']
) {
  const referencesByItemId = new Map<string, BOMWorkspaceResolvedFormItemReference>()
  const referencesByFieldId = new Map<string, BOMWorkspaceResolvedFormItemReference>()

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

function resolveFieldIdFromProtocolItemNodeId(nodeId: string) {
  if (!nodeId.startsWith('field:')) {
    return undefined
  }

  const rawFieldId = nodeId.slice('field:'.length).trim()
  return rawFieldId || undefined
}

function resolveFieldReferenceByProtocolNodeId(
  nodeId: string,
  referencesByFieldId: Map<string, BOMWorkspaceResolvedFormItemReference>
) {
  const directMatch = referencesByFieldId.get(nodeId)
  if (directMatch) {
    return directMatch
  }

  const rawFieldId = resolveFieldIdFromProtocolItemNodeId(nodeId)
  if (!rawFieldId) {
    return undefined
  }

  return referencesByFieldId.get(rawFieldId)
}

function resolveFormItemReference(
  itemDraft: BOMWorkspaceParentChildrenProtocolItemDraft,
  referencesByItemId: Map<string, BOMWorkspaceResolvedFormItemReference>,
  referencesByFieldId: Map<string, BOMWorkspaceResolvedFormItemReference>
) {
  const normalizedDraftNodeId = normalizeRequiredId(itemDraft.id, 'protocol item node id')
  const normalizedDraftItemId = itemDraft.itemId?.trim()

  return (
    (normalizedDraftItemId ? referencesByItemId.get(normalizedDraftItemId) : undefined)
    ?? referencesByItemId.get(normalizedDraftNodeId)
    ?? resolveFieldReferenceByProtocolNodeId(normalizedDraftNodeId, referencesByFieldId)
    ?? throwProtocolAdapterError(`Unable to resolve protocol item node to current form row: ${normalizedDraftNodeId}`)
  )
}

function resolveBranchRole(
  branchDraft: BOMWorkspaceParentChildrenProtocolBranchDraft,
  rootChildNodeIds: Set<string>
): BOMWorkspaceSourceBranchRole {
  const branchId = normalizeRequiredId(branchDraft.id, 'protocol branch id')
  const isRootChild = rootChildNodeIds.has(branchId)
  const branchRole = branchDraft.branchRole ?? (isRootChild ? 'section' : 'collection')

  if (isRootChild && branchRole !== 'section') {
    throwProtocolAdapterError(`Root child branch must use section role: ${branchId}`)
  }

  if (!isRootChild && branchRole === 'section') {
    throwProtocolAdapterError(`Nested branch cannot use section role: ${branchId}`)
  }

  return branchRole
}

export function buildParentChildrenProtocolBranchRelations(
  params: BuildBOMWorkspaceParentChildrenProtocolBranchRelationsParams
): BOMWorkspaceBranchRelationBuildResult {
  const {
    protocolDraft,
    activeSections,
    fields,
    watchedItems,
    resolveNumericField,
    rootNodeId,
  } = params

  const activeSectionsByCode = new Map(activeSections.map((section) => [section.code, section]))

  const branchDraftIds = protocolDraft.branchNodes.map((branchNode) => normalizeRequiredId(branchNode.id, 'protocol branch id'))
  const itemDraftIds = protocolDraft.itemNodes.map((itemNode) => normalizeRequiredId(itemNode.id, 'protocol item node id'))

  ensureUniqueIds(branchDraftIds, 'protocol branch')
  ensureUniqueIds(itemDraftIds, 'protocol item')

  const duplicateNodeId = itemDraftIds.find((itemId) => branchDraftIds.includes(itemId))
  if (duplicateNodeId) {
    throwProtocolAdapterError(`Protocol branch and item node ids must be unique: ${duplicateNodeId}`)
  }

  if (branchDraftIds.includes(rootNodeId) || itemDraftIds.includes(rootNodeId)) {
    throwProtocolAdapterError(`Protocol node id cannot reuse root node id: ${rootNodeId}`)
  }

  const branchDraftById = new Map(
    protocolDraft.branchNodes.map((branchNode) => [normalizeRequiredId(branchNode.id, 'protocol branch id'), branchNode])
  )
  const allNodeIds = new Set([...branchDraftIds, ...itemDraftIds])

  const rootChildNodeIds = resolveRootChildNodeIds(protocolDraft, branchDraftById, rootNodeId)
  const rootChildNodeIdSet = new Set(rootChildNodeIds)

  const branchNodes = protocolDraft.branchNodes.map<BOMWorkspaceSourceBranchNode>((branchDraft) => {
    const branchNodeId = normalizeRequiredId(branchDraft.id, 'protocol branch id')
    const parentId = normalizeOptionalId(branchDraft.parentId)
    const branchRole = resolveBranchRole(branchDraft, rootChildNodeIdSet)
    const { section, sectionName } = resolveSectionOption(branchDraft.sectionCode, branchDraft.sectionName, activeSectionsByCode)
    const childNodeIds = branchDraft.children.map((childNodeId) => normalizeRequiredId(childNodeId, 'protocol child node id'))

    ensureUniqueIds(childNodeIds, `protocol child node for branch ${branchNodeId}`)

    childNodeIds.forEach((childNodeId) => {
      if (!allNodeIds.has(childNodeId)) {
        throwProtocolAdapterError(`Branch ${branchNodeId} references missing child node: ${childNodeId}`)
      }
    })

    if (rootChildNodeIdSet.has(branchNodeId)) {
      if (parentId !== null && parentId !== rootNodeId) {
        throwProtocolAdapterError(`Root child branch ${branchNodeId} must use root parent`)
      }

      return {
        nodeId: branchNodeId,
        parentNodeId: rootNodeId,
        childNodeIds,
        nodeKind: 'branch',
        branchRole,
        sectionCode: section.code,
        sectionName,
        label: branchDraft.label.trim() || section.name,
        section,
      }
    }

    if (!parentId || parentId === rootNodeId) {
      throwProtocolAdapterError(`Nested branch ${branchNodeId} must reference a non-root branch parent`)
    }

    if (!branchDraftById.has(parentId)) {
      throwProtocolAdapterError(`Nested branch ${branchNodeId} references missing parent branch: ${parentId}`)
    }

    return {
      nodeId: branchNodeId,
      parentNodeId: parentId,
      childNodeIds,
      nodeKind: 'branch',
      branchRole,
      sectionCode: section.code,
      sectionName,
      label: branchDraft.label.trim() || section.name,
      section,
    }
  })

  const { referencesByItemId, referencesByFieldId } = createResolvedFormItemReferences(fields, watchedItems)

  const leafNodes = protocolDraft.itemNodes.map<BOMWorkspaceSourceLeafNode>((itemDraft) => {
    const itemNodeId = normalizeRequiredId(itemDraft.id, 'protocol item node id')
    const parentId = normalizeOptionalId(itemDraft.parentId)
    const { section, sectionName } = resolveSectionOption(itemDraft.sectionCode, itemDraft.sectionName, activeSectionsByCode)
    const childNodeIds = itemDraft.children.map((childNodeId) => normalizeRequiredId(childNodeId, 'protocol item child node id'))

    if (childNodeIds.length > 0) {
      throwProtocolAdapterError(`Leaf item node cannot have children: ${itemNodeId}`)
    }

    if (!parentId || parentId === rootNodeId) {
      throwProtocolAdapterError(`Leaf item node must reference a branch parent: ${itemNodeId}`)
    }

    if (!branchDraftById.has(parentId)) {
      throwProtocolAdapterError(`Leaf item node references missing parent branch: ${itemNodeId}`)
    }

    const resolvedItemReference = resolveFormItemReference(itemDraft, referencesByItemId, referencesByFieldId)
    if (resolvedItemReference.item.section !== section.code) {
      throwProtocolAdapterError(`Protocol item section does not match current form row: ${itemNodeId}`)
    }

    return {
      nodeId: itemNodeId,
      parentNodeId: parentId,
      childNodeIds: [],
      nodeKind: 'leaf',
      sectionCode: section.code,
      sectionName,
      itemId: resolvedItemReference.item.id?.trim() || itemDraft.itemId?.trim() || '',
      fieldId: resolvedItemReference.fieldId,
      index: resolvedItemReference.index,
      materialId: resolvedItemReference.item.materialId ?? '',
      materialName: resolvedItemReference.item.materialName ?? '',
      unitPrice: resolveNumericField(resolvedItemReference.index, 'unitPrice', resolvedItemReference.item.unitPrice),
      standardUsage: resolveNumericField(resolvedItemReference.index, 'standardUsage', resolvedItemReference.item.standardUsage),
    }
  })

  const branchNodeById = new Map(branchNodes.map((branchNode) => [branchNode.nodeId, branchNode]))
  const leafNodeById = new Map(leafNodes.map((leafNode) => [leafNode.nodeId, leafNode]))

  branchNodes.forEach((branchNode) => {
    if (branchNode.parentNodeId === rootNodeId) {
      if (!rootChildNodeIdSet.has(branchNode.nodeId)) {
        throwProtocolAdapterError(`Top-level branch must be declared in protocol root children: ${branchNode.nodeId}`)
      }
      return
    }

    const parentBranchNode = branchNode.parentNodeId ? branchNodeById.get(branchNode.parentNodeId) : undefined
    if (!parentBranchNode) {
      throwProtocolAdapterError(`Branch references missing mapped parent branch: ${branchNode.nodeId}`)
    }

    if (!parentBranchNode.childNodeIds.includes(branchNode.nodeId)) {
      throwProtocolAdapterError(`Parent branch is missing child relation for branch: ${branchNode.nodeId}`)
    }
  })

  leafNodes.forEach((leafNode) => {
    const parentBranchNode = branchNodeById.get(leafNode.parentNodeId || '')
    if (!parentBranchNode) {
      throwProtocolAdapterError(`Leaf node references missing mapped parent branch: ${leafNode.nodeId}`)
    }

    if (!parentBranchNode.childNodeIds.includes(leafNode.nodeId)) {
      throwProtocolAdapterError(`Parent branch is missing child relation for leaf: ${leafNode.nodeId}`)
    }
  })

  branchNodes.forEach((branchNode) => {
    branchNode.childNodeIds.forEach((childNodeId) => {
      const childBranchNode = branchNodeById.get(childNodeId)
      const childLeafNode = leafNodeById.get(childNodeId)

      if (childBranchNode && childBranchNode.parentNodeId !== branchNode.nodeId) {
        throwProtocolAdapterError(`Child branch parent relation mismatch: ${childNodeId}`)
      }

      if (childLeafNode && childLeafNode.parentNodeId !== branchNode.nodeId) {
        throwProtocolAdapterError(`Child leaf parent relation mismatch: ${childNodeId}`)
      }
    })
  })

  const sectionBranchNodes = branchNodes.filter((branchNode) => branchNode.branchRole === 'section')
  const collectionBranchNodes = branchNodes.filter((branchNode) => branchNode.branchRole === 'collection')

  ensureUniqueIds(sectionBranchNodes.map((branchNode) => branchNode.sectionCode), 'section branch sectionCode')

  return {
    rootChildNodeIds,
    branchNodes,
    sectionBranchNodes,
    collectionBranchNodes,
    leafNodes,
  }
}
