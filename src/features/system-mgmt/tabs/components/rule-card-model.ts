import { type ApprovalUserOption } from '@/features/approval/services/approval-service'
import {
  type BusinessEventSource,
  type BusinessStatus,
} from '../../workflow-core/data/business-event-source-schema'
import { type RuleSegment } from '../../workflow-core/data/notification-rule-schema'
import { type StandardCommand } from '../../workflow-core/data/schema'

export type CompletenessTone = 'ready' | 'warning' | 'disabled'
export type ResolverOption =
  BusinessEventSource['config']['dynamicResolvers'][number]

export const defaultApproval: NonNullable<RuleSegment['approval']> = {
  enabled: false,
  module: 'Trading',
  action: 'ORDER_REVIEW',
  approver1Id: '',
  approver2Id: '',
  dynamicApproverField: null,
  reasonTemplate:
    '业务规则「[RuleName] / [SegmentTitle]」已命中，请审批单据 [OrderNo]。',
}

export function createSegmentId() {
  return crypto.randomUUID?.() ?? `seg-${Date.now()}`
}

export function getStatusActionCode(source: BusinessEventSource) {
  return (
    source.config.actions.find((action) => action.kind === 'status')?.code ??
    source.config.actions.find((action) => action.code === 'STATUS_CHANGED')
      ?.code ??
    source.config.actions[0]?.code ??
    'STATUS_CHANGED'
  )
}

export function getDefaultResolveStatuses(source: BusinessEventSource) {
  return source.config.statuses
    .filter((status) => status.defaultResolve)
    .map((status) => status.code)
}

export function getUserLabel(user: ApprovalUserOption) {
  const realName = [user.firstName, user.lastName].filter(Boolean).join('')
  return realName ? `${realName} / ${user.username}` : user.username
}

export function joinBusinessList(items: string[]) {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]
  return items.join('、')
}

export function getCompletenessToneClass(tone: CompletenessTone) {
  switch (tone) {
    case 'ready':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-700'
    case 'disabled':
      return 'border-muted/40 bg-muted/30 text-muted-foreground'
  }
}

function getStatusCompleteness({
  enabled,
  hasNotifyTarget,
  approvalEnabled,
  hasApprovalTarget,
  hasCommandTemplate,
}: {
  enabled: boolean
  hasNotifyTarget: boolean
  approvalEnabled: boolean
  hasApprovalTarget: boolean
  hasCommandTemplate: boolean
}): { label: string; tone: CompletenessTone } {
  if (!enabled) return { label: '未启用', tone: 'disabled' }

  const missing: string[] = []
  if (!hasNotifyTarget) missing.push('缺通知对象')
  if (approvalEnabled && !hasApprovalTarget) missing.push('缺审批人')
  if (!hasCommandTemplate) missing.push('缺模板')

  if (missing.length > 0) {
    return { label: missing.join(' / '), tone: 'warning' }
  }

  return { label: '可运行', tone: 'ready' }
}

function hasResolverTarget(
  resolverOptions: ResolverOption[],
  resolverCode?: string | null
) {
  return Boolean(
    resolverCode &&
      resolverOptions.some((resolver) => resolver.code === resolverCode)
  )
}

export function getSegmentCompleteness({
  segment,
  commands,
  resolverOptions,
}: {
  segment?: RuleSegment
  commands: StandardCommand[]
  resolverOptions: ResolverOption[]
}) {
  if (!segment) {
    return getStatusCompleteness({
      enabled: false,
      hasNotifyTarget: false,
      approvalEnabled: false,
      hasApprovalTarget: false,
      hasCommandTemplate: false,
    })
  }

  const approval = segment.approval ?? defaultApproval

  return getStatusCompleteness({
    enabled: true,
    hasNotifyTarget:
      (segment.assigneeUsernames ?? []).length > 0 ||
      hasResolverTarget(resolverOptions, segment.dynamicTargetField),
    approvalEnabled: Boolean(approval.enabled),
    hasApprovalTarget:
      Boolean(approval.approver1Id) ||
      hasResolverTarget(resolverOptions, approval.dynamicApproverField),
    hasCommandTemplate: segment.commandIds.some((commandId) =>
      commands.some((command) => command.id === commandId)
    ),
  })
}

export function buildStatusPreview({
  sourceName,
  statusLabel,
  enabled,
  notifyTargets,
  commandTitle,
  approvalTarget,
}: {
  sourceName: string
  statusLabel: string
  enabled: boolean
  notifyTargets: string[]
  commandTitle?: string
  approvalTarget?: string
}) {
  if (!enabled) {
    return `${sourceName}进入「${statusLabel}」时，当前不触发通知或审批。`
  }

  const notifyText =
    notifyTargets.length > 0
      ? `通知 ${joinBusinessList(notifyTargets)}`
      : '不指定通知账号'
  const commandText = commandTitle ? `，使用「${commandTitle}」模板` : ''
  const approvalText = approvalTarget
    ? `，并创建给 ${approvalTarget} 的审批`
    : '，不创建审批'

  return `${sourceName}进入「${statusLabel}」时，${notifyText}${commandText}${approvalText}。`
}

export function createStatusSegment(
  status: BusinessStatus,
  source: BusinessEventSource
): RuleSegment {
  return {
    id: createSegmentId(),
    title: status.label,
    targetStatuses: [status.code],
    commandIds: [],
    assigneeGroups: [],
    assigneeUsernames: [],
    resolveOnStatuses: getDefaultResolveStatuses(source),
    dynamicTargetField: null,
    approval: {
      ...defaultApproval,
      module: source.module,
      action: `${source.code}_${status.code}_APPROVAL`,
    },
  }
}

export function normalizeSegment(segment: RuleSegment): RuleSegment {
  return {
    ...segment,
    assigneeGroups: segment.assigneeGroups ?? [],
    assigneeUsernames: segment.assigneeUsernames ?? [],
    commandIds: segment.commandIds ?? [],
    resolveOnStatuses: segment.resolveOnStatuses ?? [],
    dynamicTargetField: segment.dynamicTargetField ?? null,
    approval: segment.approval
      ? { ...defaultApproval, ...segment.approval }
      : defaultApproval,
  }
}
