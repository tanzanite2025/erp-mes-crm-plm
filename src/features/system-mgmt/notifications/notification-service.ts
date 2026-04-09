import { NotificationGateway } from './notification-gateway'
import { createLogger } from '@/lib/logger'
import { type NotificationType, type NotificationPriority, type SystemMessage } from './types'
import { type StandardCommand } from '../workflow-core/data/schema'
import { type NotificationRule } from '../workflow-core/data/notification-rule-schema'
import { RoutingService } from '../workflow-core/services/routing-service'

const logger = createLogger('NotificationService')

type NotificationMetadata = Record<string, unknown>

function getMetadataRecord(metadata: SystemMessage['metadata'] | undefined): NotificationMetadata {
  return metadata && typeof metadata === 'object' ? metadata : {}
}

function getMetadataString(metadata: NotificationMetadata, key: string): string | undefined {
  const value = metadata[key]
  return typeof value === 'string' ? value : undefined
}

function getNestedManager(metadata: NotificationMetadata): string | undefined {
  const approval = metadata.approval
  if (!approval || typeof approval !== 'object') return undefined
  const manager = (approval as Record<string, unknown>).manager
  return typeof manager === 'string' ? manager : undefined
}

/**
 * 助手方法：解析模板中的变量 [Key] -> value
 */
export function resolveTemplate(template: string, metadata: Record<string, unknown> = {}) {
  if (!template) return ''
  return template.replace(/\[(\w+)\]/g, (match, key) => {
    return metadata[key] !== undefined ? String(metadata[key]) : match
  })
}

/**
 * 全局消息中心逻辑服务 (后端裁决版)
 * 负责人接收外部事件并根据后端配置的“路由规则”决定消息分发逻辑。
 * 已对齐“后端裁决”原则：不再从本地读取规则与指令库，而是实时请求 RoutingService。
 */
export const NotificationService = {
  /**
   * 分发系统消息 (核心入口)
   */
  dispatch: async (
    type: NotificationType,
    data: {
      action?: string
      targetStatus?: string
      title?: string
      content?: string
      priority?: NotificationPriority
      targetRoles?: string[]
      actionUrl?: string
      metadata?: NotificationMetadata
    }
  ) => {
    // ─── 核心变更：对接后端事实源 ───
    const [rules, stdCommands] = await Promise.all([
        RoutingService.getRules().catch(() => [] as NotificationRule[]),
        RoutingService.getCommands().catch(() => [] as StandardCommand[])
    ])

    if (!rules || rules.length === 0) {
        logger.warn('No routing rules found on backend')
        return
    }

    const entityTypeMap: Record<string, string> = {
        'ORDER_EVENT': 'ORDER',
        'QUALITY_ALERT': 'PRODUCT',
        'EQUIPMENT_STATUS': 'MOLD',
        'SYSTEM_NOTICE': 'SYSTEM'
    }
    const targetEntity = entityTypeMap[type] || 'ORDER'

    const activeRules = rules.filter(r => r.enabled && r.entity === targetEntity)

    for (const rule of activeRules) {
        for (const segment of rule.segments) {
            
            const metadata: NotificationMetadata = {
                ...data.metadata,
                RuleId: rule.id,
                SegmentId: segment.id,
                SegmentTitle: segment.title
            }

            if (targetEntity === 'ORDER') {
                const orderId = metadata.OrderId || metadata.orderId || metadata.id || data.metadata?.id
                if (orderId) {
                    metadata.OrderId = orderId 
                    metadata.orderId = orderId
                }
            }

            if (data.targetStatus && segment.resolveOnStatuses?.includes(data.targetStatus)) {
                const orderId = getMetadataString(metadata, 'orderId') || getMetadataString(metadata, 'OrderId') || getMetadataString(metadata, 'id')
                if (orderId) {
                    NotificationGateway.archiveWhere((m) => {
                        const messageMetadata = getMetadataRecord(m.metadata)
                        return getMetadataString(messageMetadata, 'OrderId') === orderId && 
                            getMetadataString(messageMetadata, 'SegmentId') === segment.id
                    })
                }
            }

            const isStatusMatch = segment.targetStatuses.length === 0 || 
                                 (data.targetStatus && segment.targetStatuses.includes(data.targetStatus))

            if (!isStatusMatch) continue

            let dynamicRoles: string[] = []
            if (segment.dynamicRoleField) {
                const fieldMap: Record<string, () => string | undefined> = {
                    'claimedBy': () => getMetadataString(data.metadata || {}, 'claimedBy'),
                    'createdBy': () => getMetadataString(data.metadata || {}, 'createdBy'),
                    'approval.manager': () => getNestedManager(data.metadata || {}),
                }
                const resolved = fieldMap[segment.dynamicRoleField]?.()
                if (resolved) dynamicRoles = [resolved]
            }
            const finalRoles = data.targetRoles || [...new Set([...segment.assigneeRoles, ...dynamicRoles])]

            if (segment.commandIds.length > 0) {
                for (const cmdId of segment.commandIds) {
                    const cmd = stdCommands?.find(c => c.id === cmdId)
                    const uniqueKey = `${metadata.orderId || metadata.OrderId || metadata.id || 'sys'}_${segment.id}_${cmdId}`

                    if (cmd) {
                        NotificationGateway.addMessage({
                            type,
                            title: cmd.title,
                            content: resolveTemplate(cmd.content, metadata),
                            priority: data.priority || 'info', 
                            targetRoles: finalRoles.length > 0 ? finalRoles : undefined,
                            actionUrl: cmd.targetLink ? resolveTemplate(cmd.targetLink, metadata) : data.actionUrl,
                            metadata: { ...metadata, uniqueKey, commandId: cmd.id },
                            ruleId: rule.id,
                            segmentId: segment.id,
                            commandId: cmdId
                        })
                    }
                }
            } else if (data.content) {
                const uniqueKey = `${metadata.orderId || metadata.OrderId || metadata.id || 'sys'}_${segment.id}_fallback`
                NotificationGateway.addMessage({
                    type,
                    title: data.title || segment.title,
                    content: data.content,
                    priority: data.priority || 'info',
                    targetRoles: finalRoles.length > 0 ? finalRoles : undefined,
                    actionUrl: data.actionUrl,
                    metadata: { ...metadata, uniqueKey },
                    ruleId: rule.id,
                    segmentId: segment.id,
                })
            }
        }
    }

    if (data.priority === 'critical') {
      logger.warn('Critical event dispatched', data)
    }
  },

  notifyOrderStatus: (orderId: string, orderNo: string, status: string) => {
    NotificationService.dispatch('ORDER_EVENT', {
      action: 'STATUS_CHANGED',
      targetStatus: status,
      metadata: { orderId, orderNo, status }
    })
  },

  notifyOrderCreated: (orderNo: string, customer: string) => {
    NotificationService.dispatch('ORDER_EVENT', {
      action: 'CREATED',
      metadata: { orderNo, customer }
    })
  },

  notifyQualityIssue: (productCode: string, batchNo: string) => {
    NotificationService.dispatch('QUALITY_ALERT', {
      action: 'QUALITY_ISSUE',
      metadata: { productCode, batchNo }
    })
  },

  broadcast: (title: string, content: string) => {
    NotificationService.dispatch('SYSTEM_NOTICE', {
      action: 'CREATED',
      title,
      content,
      priority: 'info'
    })
  }
}
