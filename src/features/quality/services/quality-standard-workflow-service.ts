import { auditUtils } from '@/lib/audit-utils'
import type { DeltaSet } from '@/lib/delta/types'
import type { Standard } from '../data/schema'
import type { QualityStandardRoutingSemanticAction } from './quality-standard-routing-event-factory'

export type QualityStandardWorkflowActionInput =
  | { type: 'submitForApproval' }
  | { type: 'approve'; reviewComment?: string }
  | { type: 'reject'; rejectReason: string }
  | { type: 'publish' }
  | { type: 'archive'; archiveReason: string }

interface QualityStandardWorkflowChangeSet {
  nextStatus: Standard['status']
  nextFields: Partial<Standard>
  semanticAction: QualityStandardRoutingSemanticAction
}

export interface QualityStandardWorkflowMutation {
  data: Standard
  delta: DeltaSet
  nextStatus: Standard['status']
  nextFields: Partial<Standard>
  semanticAction: QualityStandardRoutingSemanticAction
}

export function buildQualityStandardDelta(
  current: Standard,
  nextFields: Partial<Standard>
): DeltaSet {
  const delta: DeltaSet = {}

  for (const [key, value] of Object.entries(nextFields) as Array<[
    keyof Standard,
    Standard[keyof Standard],
  ]>) {
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
        auditor: '',
        auditTime: undefined,
        reviewComment: '',
        rejectReason: '',
      },
      semanticAction: 'SUBMITTED_FOR_APPROVAL',
    }
  }

  const operator = auditUtils.getOperatorInfo()
  const now = new Date().toISOString()

  if (action.type === 'approve') {
    return {
      nextStatus: 'APPROVED',
      nextFields: {
        status: 'APPROVED',
        auditor: operator.label,
        auditTime: now,
        reviewComment: action.reviewComment?.trim() || '',
        rejectReason: '',
      },
      semanticAction: 'APPROVED',
    }
  }

  if (action.type === 'reject') {
    return {
      nextStatus: 'REJECTED',
      nextFields: {
        status: 'REJECTED',
        auditor: operator.label,
        auditTime: now,
        reviewComment: '',
        rejectReason: action.rejectReason.trim(),
      },
      semanticAction: 'REJECTED',
    }
  }

  if (action.type === 'publish') {
    return {
      nextStatus: 'PUBLISHED',
      nextFields: {
        status: 'PUBLISHED',
        publishedBy: operator.label,
        publishedAt: now,
      },
      semanticAction: 'PUBLISHED',
    }
  }

  return {
    nextStatus: 'ARCHIVED',
    nextFields: {
      status: 'ARCHIVED',
      archiveReason: action.archiveReason.trim(),
      archivedBy: operator.label,
      archivedAt: now,
    },
    semanticAction: 'ARCHIVED',
  }
}

export function buildQualityStandardWorkflowMutation(
  current: Standard,
  action: QualityStandardWorkflowActionInput
): QualityStandardWorkflowMutation {
  const { nextStatus, nextFields, semanticAction } =
    buildQualityStandardWorkflowChangeSet(action)

  return {
    data: {
      ...current,
      ...nextFields,
    },
    delta: buildQualityStandardDelta(current, nextFields),
    nextStatus,
    nextFields,
    semanticAction,
  }
}
