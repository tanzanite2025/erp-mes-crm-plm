import { ApprovalService } from '@/features/approval/services/approval-service'
import {
  type NotificationRule,
  type RuleSegment,
} from '../data/notification-rule-schema'
import {
  type RuleExecutionEvent,
  type RuleExecutionMetadata,
  type RuleExecutionMode,
} from './rule-execution-core'
import { recordExecutionLog } from './execution-log-writer'
import {
  buildApprovalProcessKey,
  resolveApprovalChain,
  resolveApprovalTargetId,
  resolveDynamicAssignee,
  resolveTemplate,
} from './target-resolver'

export interface ApprovalExecutionInput {
  rule: NotificationRule
  segment: RuleSegment
  event: RuleExecutionEvent
  eventKey: string
  executionId: string
  targetEntity: string
  targetSourceCode: string
  metadata: RuleExecutionMetadata
  finalTargets: string[]
  mode: RuleExecutionMode
  processedApprovalKeys: Set<string>
}

export interface ApprovalExecutionResult {
  createdCount: number
  skippedCount: number
  processedApprovalKeys: string[]
}

export async function executeApprovalAction({
  rule,
  segment,
  event,
  eventKey,
  executionId,
  targetEntity,
  targetSourceCode,
  metadata,
  finalTargets,
  mode,
  processedApprovalKeys,
}: ApprovalExecutionInput): Promise<ApprovalExecutionResult> {
  const result: ApprovalExecutionResult = {
    createdCount: 0,
    skippedCount: 0,
    processedApprovalKeys: [],
  }
  const approval = segment.approval
  if (!approval?.enabled) return result

  const approvalTargetId = resolveApprovalTargetId(metadata)
  const resolvedDynamicApprover = resolveDynamicAssignee(
    metadata,
    approval.dynamicApproverField
  )
  const { effectiveApprover1Id, effectiveApprover2Id } = resolveApprovalChain(
    approval.approver1Id,
    approval.approver2Id,
    resolvedDynamicApprover
  )
  const approvalReason = resolveTemplate(approval.reasonTemplate, metadata)
  const approvalProcessKey = buildApprovalProcessKey(rule, segment.id, metadata)

  if (mode === 'retroactive' && processedApprovalKeys.has(approvalProcessKey)) {
    result.skippedCount += 1
    recordExecutionLog({
      eventKey,
      entity: targetEntity,
      sourceCode: targetSourceCode,
      actionCode: event.action || 'STATUS_CHANGED',
      statusCode: event.targetStatus,
      ruleId: rule.id,
      ruleName: rule.name,
      segmentId: segment.id,
      segmentTitle: segment.title,
      executionType: 'approval',
      executionStatus: 'skipped',
      content: approvalReason,
      targets: finalTargets,
      metadata,
      result: { approvalProcessKey, mode, reason: 'already processed', executionId },
    })
    return result
  }

  if (!approvalTargetId) {
    recordExecutionLog({
      eventKey,
      entity: targetEntity,
      sourceCode: targetSourceCode,
      actionCode: event.action || 'STATUS_CHANGED',
      statusCode: event.targetStatus,
      ruleId: rule.id,
      ruleName: rule.name,
      segmentId: segment.id,
      segmentTitle: segment.title,
      executionType: 'approval',
      executionStatus: 'failed',
      targets: finalTargets,
      metadata,
      errorMessage: 'Approval targetId could not be resolved from event metadata',
      result: {
        approvalProcessKey,
        configuredModule: approval.module,
        configuredAction: approval.action,
        configuredApprover1Id: approval.approver1Id,
        configuredApprover2Id: approval.approver2Id,
        configuredDynamicApproverField: approval.dynamicApproverField,
        resolvedDynamicApprover,
        effectiveApprover1Id,
        effectiveApprover2Id,
        executionId,
      },
    })
    return result
  }

  try {
    const request = await ApprovalService.requestApproval({
      module: approval.module,
      action: approval.action,
      targetId: approvalTargetId,
      reason: approvalReason,
      approver1Id: effectiveApprover1Id || undefined,
      approver2Id: effectiveApprover2Id || undefined,
    })

    result.createdCount += 1
    if (mode === 'retroactive') {
      result.processedApprovalKeys.push(approvalProcessKey)
      processedApprovalKeys.add(approvalProcessKey)
    }
    recordExecutionLog({
      eventKey,
      entity: targetEntity,
      sourceCode: targetSourceCode,
      actionCode: event.action || 'STATUS_CHANGED',
      statusCode: event.targetStatus,
      ruleId: rule.id,
      ruleName: rule.name,
      segmentId: segment.id,
      segmentTitle: segment.title,
      executionType: 'approval',
      executionStatus: 'success',
      title: `审批已创建：${approval.module} / ${approval.action}`,
      content: approvalReason,
      targets: finalTargets,
      metadata: {
        ...metadata,
        approvalRequestId: request.id,
      },
      result: {
        approvalProcessKey,
        requestId: request.id,
        requestStatus: request.status,
        requestModule: request.module,
        requestAction: request.action,
        currentLevel: request.currentLevel,
        requestApprover1Id: request.approver1Id,
        requestApprover2Id: request.approver2Id,
        configuredApprover1Id: approval.approver1Id,
        configuredApprover2Id: approval.approver2Id,
        configuredDynamicApproverField: approval.dynamicApproverField,
        resolvedDynamicApprover,
        effectiveApprover1Id,
        effectiveApprover2Id,
        executionId,
      },
    })
  } catch (error) {
    recordExecutionLog({
      eventKey,
      entity: targetEntity,
      sourceCode: targetSourceCode,
      actionCode: event.action || 'STATUS_CHANGED',
      statusCode: event.targetStatus,
      ruleId: rule.id,
      ruleName: rule.name,
      segmentId: segment.id,
      segmentTitle: segment.title,
      executionType: 'approval',
      executionStatus: 'failed',
      content: approvalReason,
      targets: finalTargets,
      metadata,
      errorMessage: error instanceof Error ? error.message : String(error),
      result: {
        approvalProcessKey,
        targetId: approvalTargetId,
        configuredModule: approval.module,
        configuredAction: approval.action,
        configuredApprover1Id: approval.approver1Id,
        configuredApprover2Id: approval.approver2Id,
        configuredDynamicApproverField: approval.dynamicApproverField,
        resolvedDynamicApprover,
        effectiveApprover1Id,
        effectiveApprover2Id,
        executionId,
      },
    })
  }

  return result
}
