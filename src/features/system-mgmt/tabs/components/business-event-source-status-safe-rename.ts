import {
  type BusinessEventSource,
  type BusinessStatus,
} from '../../workflow-core/data/business-event-source-schema'
import {
  type NotificationRule,
  type RuleSegment,
} from '../../workflow-core/data/notification-rule-schema'

export interface BusinessEventStatusRenameDraft {
  statusId?: string
  oldCode: string
  nextCode: string
}

export interface BusinessEventStatusRenameBlocker {
  type: 'custom_approval_action'
  ruleId: string
  ruleName: string
  segmentId: string
  segmentTitle: string
  configuredAction: string
}

export interface BusinessEventStatusRenamePlan {
  statusId?: string
  oldCode: string
  nextCode: string
  targetSegmentCount: number
  resolveSegmentCount: number
  derivedApprovalActionCount: number
  blockers: BusinessEventStatusRenameBlocker[]
  canSafelyRename: boolean
}

export interface BusinessEventStatusRenameMigrationResult {
  nextRules: NotificationRule[]
  changedRules: NotificationRule[]
}

export interface BusinessEventStatusRenameSwapPair {
  leftCode: string
  rightCode: string
}

export interface BusinessEventStatusRenameChainPath {
  codes: string[]
}

export interface BusinessEventStatusRenameSemanticShrinkImpact {
  ruleId: string
  ruleName: string
  segmentId: string
  segmentTitle: string
  field: 'targetStatuses' | 'resolveOnStatuses'
  beforeValues: string[]
  afterValues: string[]
}

export interface BusinessEventStatusRenameBatchBlocker {
  type: 'merge_rename' | 'rename_cycle'
  codes: string[]
  nextCode?: string
}

export interface BusinessEventStatusRenameBatchAnalysis {
  blockers: BusinessEventStatusRenameBatchBlocker[]
  swapPairs: BusinessEventStatusRenameSwapPair[]
  chainPaths: BusinessEventStatusRenameChainPath[]
  semanticShrinkImpacts: BusinessEventStatusRenameSemanticShrinkImpact[]
  hasBlockers: boolean
  hasWarnings: boolean
}

function dedupe(values: string[]) {
  return Array.from(new Set(values))
}

export function buildDerivedApprovalAction(
  sourceCode: string,
  statusCode: string
) {
  return `${sourceCode}_${statusCode}_APPROVAL`
}

function findCommittedStatusById(
  committedSource: BusinessEventSource,
  draftStatus: Pick<BusinessStatus, 'id' | 'code'>
) {
  if (draftStatus.id) {
    return committedSource.config.statuses.find((status) => status.id === draftStatus.id)
  }

  return committedSource.config.statuses.find((status) => status.code === draftStatus.code)
}

export function collectBusinessEventStatusRenameDrafts(
  committedSource: BusinessEventSource,
  draftSource: BusinessEventSource
) {
  return draftSource.config.statuses.flatMap((draftStatus) => {
    const committedStatus = findCommittedStatusById(committedSource, draftStatus)
    if (!committedStatus || committedStatus.code === draftStatus.code) {
      return []
    }

    return [
      {
        statusId: committedStatus.id,
        oldCode: committedStatus.code,
        nextCode: draftStatus.code,
      } satisfies BusinessEventStatusRenameDraft,
    ]
  })
}

export function analyzeBusinessEventStatusRenamePlans({
  sourceCode,
  rules,
  renameDrafts,
}: {
  sourceCode: string
  rules: NotificationRule[]
  renameDrafts: BusinessEventStatusRenameDraft[]
}) {
  const sourceRules = rules.filter((rule) => rule.sourceCode === sourceCode)

  return renameDrafts.map((renameDraft) => {
    let targetSegmentCount = 0
    let resolveSegmentCount = 0
    let derivedApprovalActionCount = 0
    const blockers: BusinessEventStatusRenameBlocker[] = []
    const derivedApprovalAction = buildDerivedApprovalAction(
      sourceCode,
      renameDraft.oldCode
    )

    sourceRules.forEach((rule) => {
      rule.segments.forEach((segment) => {
        const targetsOldCode = segment.targetStatuses.includes(renameDraft.oldCode)
        const resolvesOldCode = (segment.resolveOnStatuses ?? []).includes(
          renameDraft.oldCode
        )

        if (targetsOldCode) {
          targetSegmentCount += 1
          const configuredAction = segment.approval?.action?.trim()
          if (configuredAction) {
            if (configuredAction === derivedApprovalAction) {
              derivedApprovalActionCount += 1
            } else {
              blockers.push({
                type: 'custom_approval_action',
                ruleId: rule.id,
                ruleName: rule.name,
                segmentId: segment.id,
                segmentTitle: segment.title,
                configuredAction,
              })
            }
          }
        }

        if (resolvesOldCode) {
          resolveSegmentCount += 1
        }
      })
    })

    return {
      ...renameDraft,
      targetSegmentCount,
      resolveSegmentCount,
      derivedApprovalActionCount,
      blockers,
      canSafelyRename: blockers.length === 0,
    } satisfies BusinessEventStatusRenamePlan
  })
}

export function analyzeBusinessEventStatusRenameBatch({
  sourceCode,
  rules,
  renamePlans,
}: {
  sourceCode: string
  rules: NotificationRule[]
  renamePlans: BusinessEventStatusRenamePlan[]
}): BusinessEventStatusRenameBatchAnalysis {
  const effectivePlans = renamePlans.filter(
    (plan) => plan.oldCode !== plan.nextCode
  )
  const renames = new Map(
    effectivePlans.map((plan) => [plan.oldCode, plan.nextCode] as const)
  )
  const sourceCodes = new Set(renames.keys())
  const sourceRules = rules.filter((rule) => rule.sourceCode === sourceCode)
  const blockers: BusinessEventStatusRenameBatchBlocker[] = []
  const swapPairs: BusinessEventStatusRenameSwapPair[] = []
  const chainPaths: BusinessEventStatusRenameChainPath[] = []
  const semanticShrinkImpacts: BusinessEventStatusRenameSemanticShrinkImpact[] = []

  const nextCodeToOldCodes = new Map<string, string[]>()
  effectivePlans.forEach((plan) => {
    const current = nextCodeToOldCodes.get(plan.nextCode) ?? []
    current.push(plan.oldCode)
    nextCodeToOldCodes.set(plan.nextCode, current)
  })

  nextCodeToOldCodes.forEach((oldCodes, nextCode) => {
    if (oldCodes.length > 1) {
      blockers.push({
        type: 'merge_rename',
        codes: dedupe(oldCodes),
        nextCode,
      })
    }
  })

  const swapCoveredCodes = new Set<string>()
  renames.forEach((nextCode, oldCode) => {
    if (
      sourceCodes.has(nextCode) &&
      renames.get(nextCode) === oldCode &&
      oldCode < nextCode
    ) {
      swapPairs.push({
        leftCode: oldCode,
        rightCode: nextCode,
      })
      swapCoveredCodes.add(oldCode)
      swapCoveredCodes.add(nextCode)
    }
  })

  const predecessorCount = new Map<string, number>()
  renames.forEach((nextCode) => {
    if (!sourceCodes.has(nextCode)) {
      return
    }
    predecessorCount.set(nextCode, (predecessorCount.get(nextCode) ?? 0) + 1)
  })

  const chainCoveredCodes = new Set<string>()
  renames.forEach((_nextCode, oldCode) => {
    if (swapCoveredCodes.has(oldCode) || (predecessorCount.get(oldCode) ?? 0) > 0) {
      return
    }

    const path = [oldCode]
    let currentCode = oldCode

    while (true) {
      const nextCode = renames.get(currentCode)
      if (!nextCode || !sourceCodes.has(nextCode) || swapCoveredCodes.has(nextCode)) {
        break
      }

      path.push(nextCode)
      currentCode = nextCode
    }

    if (path.length > 1) {
      chainPaths.push({ codes: path })
      path.forEach((code) => chainCoveredCodes.add(code))
    }
  })

  renames.forEach((_nextCode, oldCode) => {
    if (swapCoveredCodes.has(oldCode) || chainCoveredCodes.has(oldCode)) {
      return
    }

    const path: string[] = []
    const seen = new Map<string, number>()
    let currentCode: string | undefined = oldCode

    while (currentCode && sourceCodes.has(currentCode)) {
      if (seen.has(currentCode)) {
        const cycleCodes = path.slice(seen.get(currentCode))
        if (cycleCodes.length > 0) {
          blockers.push({
            type: 'rename_cycle',
            codes: dedupe(cycleCodes),
          })
        }
        break
      }

      seen.set(currentCode, path.length)
      path.push(currentCode)
      currentCode = renames.get(currentCode)
    }
  })

  sourceRules.forEach((rule) => {
    rule.segments.forEach((segment) => {
      const nextTargetStatuses = replaceStatusCode(segment.targetStatuses, renames)
      if (nextTargetStatuses.length < segment.targetStatuses.length) {
        semanticShrinkImpacts.push({
          ruleId: rule.id,
          ruleName: rule.name,
          segmentId: segment.id,
          segmentTitle: segment.title,
          field: 'targetStatuses',
          beforeValues: segment.targetStatuses,
          afterValues: nextTargetStatuses,
        })
      }

      const currentResolveOnStatuses = segment.resolveOnStatuses ?? []
      const nextResolveOnStatuses = replaceStatusCode(
        currentResolveOnStatuses,
        renames
      )
      if (nextResolveOnStatuses.length < currentResolveOnStatuses.length) {
        semanticShrinkImpacts.push({
          ruleId: rule.id,
          ruleName: rule.name,
          segmentId: segment.id,
          segmentTitle: segment.title,
          field: 'resolveOnStatuses',
          beforeValues: currentResolveOnStatuses,
          afterValues: nextResolveOnStatuses,
        })
      }
    })
  })

  const uniqueBlockers = blockers.filter((blocker, index, collection) => {
    return (
      collection.findIndex(
        (item) =>
          item.type === blocker.type &&
          item.nextCode === blocker.nextCode &&
          JSON.stringify(item.codes) === JSON.stringify(blocker.codes)
      ) === index
    )
  })

  return {
    blockers: uniqueBlockers,
    swapPairs,
    chainPaths,
    semanticShrinkImpacts,
    hasBlockers: uniqueBlockers.length > 0,
    hasWarnings:
      swapPairs.length > 0 ||
      chainPaths.length > 0 ||
      semanticShrinkImpacts.length > 0,
  }
}

function replaceStatusCode(values: string[], renames: Map<string, string>) {
  return dedupe(values.map((value) => renames.get(value) ?? value))
}

function migrateSegmentApprovalAction({
  segment,
  sourceCode,
  renames,
}: {
  segment: RuleSegment
  sourceCode: string
  renames: Map<string, string>
}) {
  let nextApproval = segment.approval

  renames.forEach((nextCode, oldCode) => {
    const oldDerivedAction = buildDerivedApprovalAction(sourceCode, oldCode)
    const nextDerivedAction = buildDerivedApprovalAction(sourceCode, nextCode)
    if (
      segment.targetStatuses.includes(oldCode) &&
      segment.approval?.action === oldDerivedAction
    ) {
      nextApproval = {
        ...segment.approval,
        action: nextDerivedAction,
      }
    }
  })

  return nextApproval
}

export function applyBusinessEventStatusRenamesToRules({
  rules,
  sourceCode,
  renamePlans,
}: {
  rules: NotificationRule[]
  sourceCode: string
  renamePlans: BusinessEventStatusRenamePlan[]
}): BusinessEventStatusRenameMigrationResult {
  const renames = new Map(
    renamePlans.map((plan) => [plan.oldCode, plan.nextCode] as const)
  )
  const changedRules: NotificationRule[] = []

  const nextRules = rules.map((rule) => {
    if (rule.sourceCode !== sourceCode) {
      return rule
    }

    let changed = false
    const nextSegments = rule.segments.map((segment) => {
      const nextTargetStatuses = replaceStatusCode(segment.targetStatuses, renames)
      const nextResolveOnStatuses = replaceStatusCode(
        segment.resolveOnStatuses ?? [],
        renames
      )
      const nextApproval = migrateSegmentApprovalAction({
        segment,
        sourceCode,
        renames,
      })

      const segmentChanged =
        JSON.stringify(nextTargetStatuses) !== JSON.stringify(segment.targetStatuses) ||
        JSON.stringify(nextResolveOnStatuses) !==
          JSON.stringify(segment.resolveOnStatuses ?? []) ||
        JSON.stringify(nextApproval) !== JSON.stringify(segment.approval)

      if (!segmentChanged) {
        return segment
      }

      changed = true
      return {
        ...segment,
        targetStatuses: nextTargetStatuses,
        resolveOnStatuses: nextResolveOnStatuses,
        approval: nextApproval,
      }
    })

    if (!changed) {
      return rule
    }

    const nextRule = {
      ...rule,
      segments: nextSegments,
    }
    changedRules.push(nextRule)
    return nextRule
  })

  return {
    nextRules,
    changedRules,
  }
}
