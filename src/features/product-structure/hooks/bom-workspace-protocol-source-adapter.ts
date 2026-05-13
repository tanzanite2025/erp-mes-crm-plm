import { type BOMSectionOption } from '../data/bom-section-schema'
import { type BOM } from '../data/schema'
import {
  type BOMWorkspaceParentChildrenProtocolDraft,
} from './bom-workspace-branch-relation-builder'
import {
  resolveSectionBranchNodeId,
  resolveCollectionBranchNodeId,
  resolveLeafNodeId,
} from '../utils/bom-node-id-resolver'
import { mergeBOMWorkspaceParentChildrenProtocolDrafts } from './bom-workspace-protocol-merge'

interface BuildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSourceParams {
  sourceBOM: BOM
  activeSections: BOMSectionOption[]
  fields: Array<{ id: string }>
  watchedItems?: BOM['items']
  authoritativeProtocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
}

function resolveProtocolFieldId(fields: Array<{ id: string }>, sourceBOMId: string, index: number) {
  return fields[index]?.id ?? `detail:${sourceBOMId || 'bom'}:${index}`
}

function buildLiveBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource({
  sourceBOM,
  activeSections,
  fields,
  watchedItems,
}: Omit<BuildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSourceParams, 'authoritativeProtocolDraft'>): BOMWorkspaceParentChildrenProtocolDraft | undefined {
  if (activeSections.length === 0) {
    return undefined
  }

  const liveItems = watchedItems ?? []
  if (sourceBOM.items.length > 0 && (liveItems.length === 0 || fields.length !== liveItems.length)) {
    return undefined
  }

  const effectiveItems = liveItems
  const activeSectionCodeSet = new Set(activeSections.map((section) => section.code))

  return {
    rootChildren: activeSections.map((section) => resolveSectionBranchNodeId(section.code)),
    branchNodes: activeSections.flatMap((section) => {
      const sectionBranchNodeId = resolveSectionBranchNodeId(section.code)
      const collectionBranchNodeId = resolveCollectionBranchNodeId(section.code)

      return [
        {
          id: sectionBranchNodeId,
          parentId: 'root',
          children: [collectionBranchNodeId],
          nodeKind: 'branch' as const,
          branchRole: 'section' as const,
          label: section.name,
          sectionCode: section.code,
          sectionName: section.name,
        },
        {
          id: collectionBranchNodeId,
          parentId: sectionBranchNodeId,
          children: effectiveItems.flatMap((item, index) => {
            if (item.section !== section.code) {
              return []
            }

            const fieldId = resolveProtocolFieldId(fields, sourceBOM.id, index)
            return [resolveLeafNodeId(item.id, fieldId)]
          }),
          nodeKind: 'branch' as const,
          branchRole: 'collection' as const,
          label: `${section.name} 明细`,
          sectionCode: section.code,
          sectionName: section.name,
        },
      ]
    }),
    itemNodes: effectiveItems.flatMap((item, index) => {
      if (!activeSectionCodeSet.has(item.section)) {
        return []
      }

      const fieldId = resolveProtocolFieldId(fields, sourceBOM.id, index)
      const normalizedItemId = item.id?.trim()

      return [{
        id: resolveLeafNodeId(item.id, fieldId),
        parentId: resolveCollectionBranchNodeId(item.section),
        children: [],
        nodeKind: 'item' as const,
        sectionCode: item.section,
        itemId: normalizedItemId || undefined,
      }]
    }),
  }
}

export function buildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource({
  sourceBOM,
  activeSections,
  fields,
  watchedItems,
  authoritativeProtocolDraft,
}: BuildBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSourceParams): BOMWorkspaceParentChildrenProtocolDraft | undefined {
  const liveProtocolDraft = buildLiveBOMWorkspaceParentChildrenProtocolDraftFromBOMDetailSource({
    sourceBOM,
    activeSections,
    fields,
    watchedItems,
  })

  return mergeBOMWorkspaceParentChildrenProtocolDrafts({
    activeSections,
    liveProtocolDraft,
    authoritativeProtocolDraft,
  })
}
