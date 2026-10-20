import type { DeltaSet } from '@/lib/delta/types'
import type { Standard } from '../data/schema'

export type QualityStandardWorkflowActionInput =
  | { type: 'submitForApproval' }
  | { type: 'publish' }
  | { type: 'archive'; archiveReason: string }

export type QualityStandardReviewDecisionInput =
  | { type: 'approve'; reviewComment?: string }
  | { type: 'reject'; rejectReason: string }

interface QualityStandardWorkflowChangeSet {
  nextStatus: Standard['status']
  nextFields: Partial<Standard>
}

export interface QualityStandardWorkflowMutation {
  data: Standard
  delta: DeltaSet
  nextStatus: Standard['status']
  nextFields: Partial<Standard>
}

export function buildQualityStandardDelta(
  current: Standard,
  nextFields: Partial<Standard>
): DeltaSet {
  const delta: DeltaSet = {}

  for (const [key, value] of Object.entries(nextFields) as Array<
    [keyof Standard, Standard[keyof Standard]]
  >) {
    const previous = current[key]

    if (previous !== value) {
      delta[key] = {
        o: previous ?? null,
        n: value ?? null,
      }
    }
  }

  return delta
}

export function buildQualityStandardWorkflowChangeSet(
  action: QualityStandardWorkflowActionInput
): QualityStandardWorkflowChangeSet {
  if (action.type === 'submitForApproval') {
    return {
      nextStatus: 'PENDING_APPROVAL',
      nextFields: {
        status: 'PENDING_APPROVAL',
      },
    }
  }

  if (action.type === 'publish') {
    return {
      nextStatus: 'PUBLISHED',
      nextFields: {
        status: 'PUBLISHED',
      },
    }
  }

  return {
    nextStatus: 'ARCHIVED',
    nextFields: {
      status: 'ARCHIVED',
      archiveReason: action.archiveReason.trim(),
    },
  }
}

export function buildQualityStandardWorkflowMutation(
  current: Standard,
  action: QualityStandardWorkflowActionInput
): QualityStandardWorkflowMutation {
  const { nextStatus, nextFields } =
    buildQualityStandardWorkflowChangeSet(action)

  return {
    data: {
      ...current,
      ...nextFields,
    },
    delta: buildQualityStandardDelta(current, nextFields),
    nextStatus,
    nextFields,
  }
}
