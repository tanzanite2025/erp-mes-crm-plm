import { createLogger } from '@/lib/logger'
import { type NotificationRule } from '../workflow-core/data/notification-rule-schema'
import { type StandardCommand } from '../workflow-core/data/schema'
import { RoutingService } from '../workflow-core/services/routing-service'
import {
  executeRoutingRules,
  resolveTemplate,
  type RuleExecutionMetadata,
} from '../workflow-core/services/rule-execution-core'
import { buildLiveRuleExecutionEvent } from '../workflow-core/services/rule-execution-event-builder'
import { type NotificationPriority, type NotificationType } from './types'

const logger = createLogger('NotificationService')

export { resolveTemplate }

interface DispatchInput {
  action?: string
  targetStatus?: string
  title?: string
  content?: string
  priority?: NotificationPriority
  targetGroups?: string[]
  targetUsers?: string[]
  actionUrl?: string
  sourceCode?: string
  metadata?: RuleExecutionMetadata
}

export const NotificationService = {
  dispatch: async (type: NotificationType, data: DispatchInput) => {
    const [rules, commands] = await Promise.all([
      RoutingService.getRules().catch(() => [] as NotificationRule[]),
      RoutingService.getCommands().catch(() => [] as StandardCommand[]),
    ])

    if (rules.length === 0) {
      logger.warn('No routing rules found on backend')
      return
    }

    const result = await executeRoutingRules({
      rules,
      commands,
      event: buildLiveRuleExecutionEvent(type, data),
      mode: 'live',
    })

    if (data.priority === 'critical') {
      logger.warn('Critical event dispatched', { data, result })
    }

    return result
  },

  notifyQualityIssue: (productCode: string, batchNo: string) => {
    void NotificationService.dispatch('QUALITY_ALERT', {
      action: 'QUALITY_ISSUE',
      metadata: { productCode, batchNo },
    })
  },

  broadcast: (title: string, content: string) => {
    void NotificationService.dispatch('SYSTEM_NOTICE', {
      action: 'CREATED',
      title,
      content,
      priority: 'info',
    })
  },
}
