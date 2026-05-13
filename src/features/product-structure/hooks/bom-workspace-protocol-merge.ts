import { type BOMSectionOption } from '../data/bom-section-schema'
import {
  type BOMWorkspaceParentChildrenProtocolBranchDraft,
  type BOMWorkspaceParentChildrenProtocolDraft,
  type BOMWorkspaceParentChildrenProtocolItemDraft,
} from './bom-workspace-branch-relation-builder'
import {
  resolveSectionBranchNodeId,
  resolveCollectionBranchNodeId,
} from '../utils/bom-node-id-resolver'

interface MergeBOMWorkspaceParentChildrenProtocolDraftsParams {
  activeSections: BOMSectionOption[]
  liveProtocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
  authoritativeProtocolDraft?: BOMWorkspaceParentChildrenProtocolDraft
}

function createFallbackSectionBranchDraft(section: BOMSectionOption): BOMWorkspaceParentChildrenProtocolBranchDraft {
  return {
    id: resolveSectionBranchNodeId(section.code),
    parentId: 'root',
    children: [],
    nodeKind: 'branch',
    branchRole: 'section',
    label: section.name,
    sectionCode: section.code,
    sectionName: section.name,
  }
}

function createFallbackCollectionBranchDraft(
  section: BOMSectionOption,
  parentId: string,
  branchId: string
): BOMWorkspaceParentChildrenProtocolBranchDraft {
  return {
    id: branchId,
    parentId,
    children: [],
    nodeKind: 'branch',
    branchRole: 'collection',
    label: `${section.name} 明细`,
    sectionCode: section.code,
    sectionName: section.name,
  }
}

function isSectionRootCandidate(
  branchDraft: BOMWorkspaceParentChildrenProtocolBranchDraft,
  rootChildIdSet: Set<string>
) {
  return branchDraft.branchRole === 'section'
    || rootChildIdSet.has(branchDraft.id)
    || branchDraft.parentId === 'root'
    || branchDraft.parentId === null
}

function cloneBranchDraft(branchDraft: BOMWorkspaceParentChildrenProtocolBranchDraft): BOMWorkspaceParentChildrenProtocolBranchDraft {
  return {
    ...branchDraft,
    children: [...branchDraft.children],
  }
}

function cloneItemDraft(itemDraft: BOMWorkspaceParentChildrenProtocolItemDraft): BOMWorkspaceParentChildrenProtocolItemDraft {
  return {
    ...itemDraft,
    children: [...itemDraft.children],
  }
}

function resolveLiveItemMatch(
  authoritativeItemDraft: BOMWorkspaceParentChildrenProtocolItemDraft,
  liveItemByItemId: Map<string, BOMWorkspaceParentChildrenProtocolItemDraft>,
  liveItemByNodeId: Map<string, BOMWorkspaceParentChildrenProtocolItemDraft>
) {
  const normalizedItemId = authoritativeItemDraft.itemId?.trim()
  if (normalizedItemId) {
    const matchedByItemId = liveItemByItemId.get(normalizedItemId)
    if (matchedByItemId) {
      return matchedByItemId
    }
  }

  return liveItemByNodeId.get(authoritativeItemDraft.id)
}

export function mergeBOMWorkspaceParentChildrenProtocolDrafts({
  activeSections,
  liveProtocolDraft,
  authoritativeProtocolDraft,
}: MergeBOMWorkspaceParentChildrenProtocolDraftsParams): BOMWorkspaceParentChildrenProtocolDraft | undefined {
  if (!liveProtocolDraft) {
    return undefined
  }

  if (!authoritativeProtocolDraft) {
    return liveProtocolDraft
  }

  const activeSectionsByCode = new Map(activeSections.map((section) => [section.code, section]))
  const activeSectionCodeSet = new Set(activeSections.map((section) => section.code))
  const authoritativeRootChildIdSet = new Set(authoritativeProtocolDraft.rootChildren)
  const liveRootChildIdSet = new Set(liveProtocolDraft.rootChildren)
  const liveBranchById = new Map(
    liveProtocolDraft.branchNodes
      .filter((branchDraft) => activeSectionCodeSet.has(branchDraft.sectionCode))
      .map((branchDraft) => [branchDraft.id, cloneBranchDraft(branchDraft)])
  )
  const liveItemByNodeId = new Map(
    liveProtocolDraft.itemNodes
      .filter((itemDraft) => activeSectionCodeSet.has(itemDraft.sectionCode))
      .map((itemDraft) => [itemDraft.id, cloneItemDraft(itemDraft)])
  )
  const liveItemByItemId = new Map(
    liveProtocolDraft.itemNodes.flatMap((itemDraft) => {
      const normalizedItemId = itemDraft.itemId?.trim()
      if (!normalizedItemId || !activeSectionCodeSet.has(itemDraft.sectionCode)) {
        return []
      }

      return [[normalizedItemId, cloneItemDraft(itemDraft)] as const]
    })
  )

  const authoritativeBranchDrafts = authoritativeProtocolDraft.branchNodes.filter((branchDraft) =>
    activeSectionCodeSet.has(branchDraft.sectionCode)
  )
  const authoritativeItemDrafts = authoritativeProtocolDraft.itemNodes.filter((itemDraft) =>
    activeSectionCodeSet.has(itemDraft.sectionCode)
  )

  const finalBranchById = new Map<string, BOMWorkspaceParentChildrenProtocolBranchDraft>()
  const branchOrder: string[] = []
  const sectionRootIdByCode = new Map<string, string>()

  const addBranchDraft = (branchDraft: BOMWorkspaceParentChildrenProtocolBranchDraft) => {
    if (finalBranchById.has(branchDraft.id)) {
      return
    }

    finalBranchById.set(branchDraft.id, {
      ...branchDraft,
      children: [],
    })
    branchOrder.push(branchDraft.id)
  }

  activeSections.forEach((section) => {
    const authoritativeSectionRoot = authoritativeBranchDrafts.find(
      (branchDraft) => branchDraft.sectionCode === section.code && isSectionRootCandidate(branchDraft, authoritativeRootChildIdSet)
    )
    const liveSectionRoot = liveProtocolDraft.branchNodes.find(
      (branchDraft) => branchDraft.sectionCode === section.code && isSectionRootCandidate(branchDraft, liveRootChildIdSet)
    )
    const selectedSectionRoot = cloneBranchDraft(
      authoritativeSectionRoot
      ?? liveSectionRoot
      ?? createFallbackSectionBranchDraft(section)
    )

    selectedSectionRoot.parentId = 'root'
    selectedSectionRoot.branchRole = 'section'
    selectedSectionRoot.label = selectedSectionRoot.label || section.name
    selectedSectionRoot.sectionName = selectedSectionRoot.sectionName || section.name

    addBranchDraft(selectedSectionRoot)
    sectionRootIdByCode.set(section.code, selectedSectionRoot.id)
  })

  authoritativeBranchDrafts.forEach((branchDraft) => {
    if (sectionRootIdByCode.get(branchDraft.sectionCode) === branchDraft.id) {
      return
    }

    addBranchDraft(cloneBranchDraft(branchDraft))
  })

  const resolveAppendCollectionBranchId = (sectionCode: string) => {
    const section = activeSectionsByCode.get(sectionCode)
    const sectionRootId = sectionRootIdByCode.get(sectionCode)
    if (!section || !sectionRootId) {
      return undefined
    }

    const preferredBranchId = resolveCollectionBranchNodeId(sectionCode)
    if (finalBranchById.has(preferredBranchId)) {
      return preferredBranchId
    }

    const retainedCollectionBranches = Array.from(finalBranchById.values()).filter(
      (branchDraft) => branchDraft.sectionCode === sectionCode && branchDraft.branchRole !== 'section'
    )
    if (retainedCollectionBranches.length === 1) {
      return retainedCollectionBranches[0].id
    }

    const liveFallbackCollectionBranch = liveBranchById.get(preferredBranchId)
    if (liveFallbackCollectionBranch) {
      addBranchDraft({
        ...liveFallbackCollectionBranch,
        parentId: sectionRootId,
        branchRole: 'collection',
        label: liveFallbackCollectionBranch.label || `${section.name} 明细`,
        sectionName: liveFallbackCollectionBranch.sectionName || section.name,
      })
      return preferredBranchId
    }

    const overlayBranchId = retainedCollectionBranches.length === 0
      ? preferredBranchId
      : `${preferredBranchId}:overlay`

    addBranchDraft(createFallbackCollectionBranchDraft(section, sectionRootId, overlayBranchId))
    return overlayBranchId
  }

  const matchedLiveNodeIds = new Set<string>()
  const finalItemDrafts: BOMWorkspaceParentChildrenProtocolItemDraft[] = []

  authoritativeItemDrafts.forEach((authoritativeItemDraft) => {
    const liveItemDraft = resolveLiveItemMatch(authoritativeItemDraft, liveItemByItemId, liveItemByNodeId)
    if (!liveItemDraft) {
      return
    }

    matchedLiveNodeIds.add(liveItemDraft.id)

    const retainedParentBranch = authoritativeItemDraft.parentId
      ? finalBranchById.get(authoritativeItemDraft.parentId)
      : undefined
    const nextParentId = retainedParentBranch && retainedParentBranch.sectionCode === liveItemDraft.sectionCode
      ? retainedParentBranch.id
      : resolveAppendCollectionBranchId(liveItemDraft.sectionCode)

    if (!nextParentId) {
      return
    }

    const resolvedSectionName = liveItemDraft.sectionName || activeSectionsByCode.get(liveItemDraft.sectionCode)?.name

    finalItemDrafts.push({
      ...cloneItemDraft(authoritativeItemDraft),
      parentId: nextParentId,
      children: [],
      sectionCode: liveItemDraft.sectionCode,
      sectionName: resolvedSectionName,
      itemId: liveItemDraft.itemId || authoritativeItemDraft.itemId,
    })
  })

  liveProtocolDraft.itemNodes.forEach((liveItemDraft) => {
    if (!activeSectionCodeSet.has(liveItemDraft.sectionCode) || matchedLiveNodeIds.has(liveItemDraft.id)) {
      return
    }

    const nextParentId = resolveAppendCollectionBranchId(liveItemDraft.sectionCode)
    if (!nextParentId) {
      return
    }

    const resolvedSectionName = liveItemDraft.sectionName || activeSectionsByCode.get(liveItemDraft.sectionCode)?.name

    finalItemDrafts.push({
      ...cloneItemDraft(liveItemDraft),
      parentId: nextParentId,
      children: [],
      sectionName: resolvedSectionName,
    })
  })

  const childNodeIdsByBranchId = new Map(branchOrder.map((branchId) => [branchId, [] as string[]]))

  branchOrder.forEach((branchId) => {
    const branchDraft = finalBranchById.get(branchId)
    if (!branchDraft?.parentId || branchDraft.parentId === 'root') {
      return
    }

    const parentChildren = childNodeIdsByBranchId.get(branchDraft.parentId)
    if (!parentChildren) {
      return
    }

    parentChildren.push(branchId)
  })

  finalItemDrafts.forEach((itemDraft) => {
    if (!itemDraft.parentId) {
      return
    }

    const parentChildren = childNodeIdsByBranchId.get(itemDraft.parentId)
    if (!parentChildren) {
      return
    }

    parentChildren.push(itemDraft.id)
  })

  const finalBranchDrafts = branchOrder.map((branchId) => {
    const branchDraft = finalBranchById.get(branchId)
    if (!branchDraft) {
      throw new Error(`[CRITICAL] Missing merged branch draft: ${branchId}`)
    }

    return {
      ...branchDraft,
      children: childNodeIdsByBranchId.get(branchId) ?? [],
    }
  })

  return {
    rootChildren: activeSections.flatMap((section) => {
      const sectionRootId = sectionRootIdByCode.get(section.code)
      return sectionRootId ? [sectionRootId] : []
    }),
    branchNodes: finalBranchDrafts,
    itemNodes: finalItemDrafts,
  }
}
