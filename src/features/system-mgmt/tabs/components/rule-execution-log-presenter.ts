import {
  Activity,
  BellRing,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Workflow,
  XCircle,
} from 'lucide-react'
import {
  type RuleExecutionLog,
  type RuleExecutionStatus,
  type RuleExecutionType,
} from '../../workflow-core/data/rule-execution-log-schema'

export function getExecutionTypeIcon(type: RuleExecutionType) {
  switch (type) {
    case 'notify':
      return BellRing
    case 'approval':
      return ShieldCheck
    case 'workflow':
      return Workflow
    default:
      return Activity
  }
}

export function getExecutionTypeBadgeClass(type: RuleExecutionType) {
  switch (type) {
    case 'notify':
      return 'border-none bg-blue-100 text-blue-700'
    case 'approval':
      return 'border-none bg-violet-100 text-violet-700'
    case 'workflow':
      return 'border-none bg-cyan-100 text-cyan-700'
    default:
      return 'border-none bg-slate-200 text-slate-700'
  }
}

export function getExecutionStatusBadgeClass(
  status: RuleExecutionStatus,
  log?: Pick<RuleExecutionLog, 'executionType' | 'executionStatus' | 'errorMessage'>
) {
  switch (status) {
    case 'success':
      return 'border-none bg-emerald-100 text-emerald-700'
    case 'failed':
      return 'border-none bg-rose-100 text-rose-700'
    case 'skipped':
      return log && isConfigurationPendingLog(log)
        ? 'border-none bg-slate-200 text-slate-700'
        : 'border-none bg-amber-100 text-amber-700'
    default:
      return 'border-none bg-slate-200 text-slate-700'
  }
}

export function getExecutionTypeLabel(type: RuleExecutionType) {
  switch (type) {
    case 'notify':
      return '通知动作'
    case 'approval':
      return '审批动作'
    case 'workflow':
      return '流程动作'
    default:
      return '规则命中'
  }
}

export function isConfigurationPendingLog(
  log: Pick<RuleExecutionLog, 'executionType' | 'executionStatus' | 'errorMessage'>
) {
  if (log.executionType !== 'notify' || log.executionStatus !== 'skipped') {
    return false
  }

  const readableError = getReadableExecutionError(log.errorMessage)
  return (
    readableError === '当前规则未绑定通知内容模板，系统也没有可用的默认通知正文。' ||
    readableError.startsWith('当前规则绑定的通知内容模板不存在：')
  )
}

export function getExecutionStatusLabel(
  status: RuleExecutionStatus,
  log?: Pick<RuleExecutionLog, 'executionType' | 'executionStatus' | 'errorMessage'>
) {
  switch (status) {
    case 'success':
      return '成功'
    case 'failed':
      return '失败'
    case 'skipped':
      return log && isConfigurationPendingLog(log) ? '待配置' : '跳过'
    default:
      return '命中'
  }
}

export function getReadableExecutionError(errorMessage: string) {
  if (!errorMessage) return errorMessage
  if (errorMessage === 'No bound command and no fallback content available') {
    return '当前规则未绑定通知内容模板，系统也没有可用的默认通知正文。'
  }

  const missingTemplateMatch = errorMessage.match(
    /^Standard command (.+) not found$/
  )
  if (missingTemplateMatch) {
    return `当前规则绑定的通知内容模板不存在：${missingTemplateMatch[1]}`
  }

  return errorMessage
}

export function formatTargets(log: RuleExecutionLog) {
  return log.targets.length > 0 ? log.targets.join(' / ') : '未解析接收对象'
}

export function shouldHideExecutionLogByDefault(log: RuleExecutionLog) {
  return isConfigurationPendingLog(log)
}

export function getStatusIcon(status: RuleExecutionStatus) {
  switch (status) {
    case 'success':
      return CheckCircle2
    case 'failed':
      return XCircle
    case 'skipped':
      return Clock3
    default:
      return Activity
  }
}
