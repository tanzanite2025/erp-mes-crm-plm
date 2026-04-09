import { NotificationGateway } from '@/features/system-mgmt/notifications/notification-gateway'
import { type SystemMessage } from '@/features/system-mgmt/notifications/types'
import { type WorkflowNode, type StandardCommand } from '../data/schema'
import { type NotificationRule } from '../data/notification-rule-schema'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { createLogger } from '@/lib/logger'
import { RoutingService } from '../services/routing-service'

const logger = createLogger('DispatchService')

type DispatchMetadata = Record<string, unknown>

interface DispatchContext {
  orderId: string
  orderNo: string
  productName?: string
  [key: string]: unknown
}

interface OrderSnapshot {
  id: string
  orderNo: string
  status: string
  createdBy?: string
  approval?: {
    manager?: string
  }
  lines?: Array<{
    productModel?: string
    claimedBy?: string
  }>
  [key: string]: unknown
}

function getMetadataRecord(metadata: SystemMessage['metadata'] | undefined): DispatchMetadata {
  return metadata && typeof metadata === 'object' ? metadata : {}
}

function getMetadataString(metadata: DispatchMetadata, key: string): string | undefined {
  const value = metadata[key]
  return typeof value === 'string' ? value : undefined
}

/**
 * 助手方法：解析模板中的变量 [Key] -> value
 */
function resolveTemplate(template: string, metadata: DispatchMetadata = {}) {
  if (!template) return ''
  return template.replace(/\[(\w+)\]/g, (match, key) => {
    return metadata[key] !== undefined ? String(metadata[key]) : match
  })
}

/**
 * 消息分发服务 (智能增强版)
 * 负责解析工作流节点的指令 ID，并结合指令库模板进行变量解析与分发。
 * 已对齐“后端裁决”原则：不再从本地读取指令库，而是从 RoutingService 获取实时数据。
 */
export const DispatchService = {
    /**
     * 执行节点指令列表 (智能解析版本)
     */
    dispatchCommands: async (node: WorkflowNode, context: DispatchContext) => {
        const addMessage = NotificationGateway.addMessage
        
        // --- 核心变更：对接后端事实源 ---
        const stdCommands = await RoutingService.getCommands().catch(() => [] as StandardCommand[])
        
        const metadata = {
            OrderId: context.orderId,
            OrderNo: context.orderNo,
            ProductName: context.productName || '未知产品',
            ...context
        }

        for (const cmdRef of node.commands) {
            const cmdTemplate = stdCommands?.find(c => c.id === cmdRef)
            
            if (cmdTemplate) {
                addMessage({
                    type: (node.type === 'PRODUCTION' ? 'TASK_ASSIGNED' : 'ORDER_EVENT'),
                    title: cmdTemplate.title,
                    content: resolveTemplate(cmdTemplate.content, metadata),
                    priority: 'info',
                    targetRoles: node.assigneeRoles,
                    actionUrl: cmdTemplate.targetLink ? resolveTemplate(cmdTemplate.targetLink, metadata) : `/trading/sales-orders?search=${context.orderNo}&detailId=${context.orderId}`
                })
            } else {
                addMessage({
                    type: 'ORDER_EVENT',
                    title: node.title,
                    content: cmdRef,
                    priority: 'info',
                    targetRoles: node.assigneeRoles,
                    actionUrl: `/trading/sales-orders?search=${context.orderNo}&detailId=${context.orderId}`
                })
            }
        }
    },
    
    /**
     * 追溯扫描：对现有存量数据进行流程匹配补偿
     */
    scanAndRetroactiveDispatch: async (
        nodes: WorkflowNode[], 
        orders: OrderSnapshot[]
    ) => {
        const addMessage = NotificationGateway.addMessage
        const stdCommands = await RoutingService.getCommands().catch(() => [] as StandardCommand[])
        
        const processedKey = 'xdfc_processed_dispatched_ids'
        const processedIds = await StorageService.getItem<string[]>(processedKey) || []
        let newCount = 0
        const now = Date.now()

        const startNodes = nodes.filter(n => n.type === 'START' && n.triggerConfig)

        for (const node of startNodes) {
           for (const order of orders) {
               const isMatch = node.triggerConfig?.entity === 'ORDER' && 
                             node.triggerConfig?.action === 'STATUS_CHANGED' &&
                             node.triggerConfig?.targetStatus === order.status

               if (isMatch) {
                   for (const cmdId of (node.commands || [])) {
                       const uniqueKey = `${order.id}_${cmdId}`
                       
                        const isAlreadyInList = NotificationGateway.hasMessage(
                            (m) => getMetadataString(getMetadataRecord(m.metadata), 'uniqueKey') === uniqueKey && !m.isRead && !m.isArchived
                        )
                       if (isAlreadyInList) continue

                        const lastDismissed = NotificationGateway.getDismissedAt(uniqueKey)
                       if (lastDismissed && (now - lastDismissed < 60000)) {
                           continue
                       }

                       const cmdTemplate = stdCommands.find(c => c.id === cmdId)
                       const metadata = {
                           OrderId: order.id,
                           OrderNo: order.orderNo,
                           ProductName: order.lines?.[0]?.productModel || '未知产品',
                           uniqueKey,
                           ...order
                       }

                       if (cmdTemplate) {
                           addMessage({
                               type: 'ORDER_EVENT',
                               title: processedIds.includes(uniqueKey) ? `[提醒] ${cmdTemplate.title}` : `[追溯] ${cmdTemplate.title}`,
                               content: resolveTemplate(cmdTemplate.content, metadata),
                               priority: 'info',
                               targetRoles: node.assigneeRoles,
                               actionUrl: cmdTemplate.targetLink ? resolveTemplate(cmdTemplate.targetLink, metadata) : `/trading/sales-orders?search=${order.orderNo}&detailId=${order.id}`,
                               metadata
                           })
                           
                           if (!processedIds.includes(uniqueKey)) {
                               processedIds.push(uniqueKey)
                           }
                           newCount++
                       }
                   }

                   if ((node.commands || []).length === 0) {
                       const fallbackKey = `${order.id}_${node.id}_fallback`
                        const isAlreadyInList = NotificationGateway.hasMessage(
                            (m) => getMetadataString(getMetadataRecord(m.metadata), 'uniqueKey') === fallbackKey && !m.isRead
                        )
                        const lastDismissed = NotificationGateway.getDismissedAt(fallbackKey)
                       if (!isAlreadyInList && !(lastDismissed && (now - lastDismissed < 60000))) {
                           addMessage({
                               type: 'ORDER_EVENT',
                               title: `[${node.title}] 待处理`,
                               content: `订单 ${order.orderNo} 的状态已变更为"${order.status}"，请相关负责人及时处理。`,
                               priority: 'info',
                               targetRoles: node.assigneeRoles,
                               actionUrl: `/trading/sales-orders?search=${order.orderNo}&detailId=${order.id}`,
                               metadata: { uniqueKey: fallbackKey, OrderId: order.id, OrderNo: order.orderNo, ...order }
                           })
                           newCount++
                       }
                   }
               }
           }
        }

        if (newCount > 0) {
            await StorageService.setItem(processedKey, processedIds)
        }
        return newCount
    },

    /**
     * 发送特定类型的通知
     */
    sendNotification: (title: string, content: string, roles?: string[], actionUrl?: string) => {
        const addMessage = NotificationGateway.addMessage
        addMessage({
            type: 'SYSTEM_NOTICE',
            title,
            content,
            priority: 'info',
            targetRoles: roles,
            actionUrl
        })
    },

    /**
     * [V2] 基于多分支规则列表的追溯扫描
     */
    scanByRules: async (
        rules: NotificationRule[],
        orders: OrderSnapshot[]
    ) => {
        const addMessage = NotificationGateway.addMessage
        const stdCommands = await RoutingService.getCommands().catch(() => [] as StandardCommand[])
        const processedKey = 'xdfc_processed_dispatched_ids'
        const processedIds = await StorageService.getItem<string[]>(processedKey) || []
        let newCount = 0
        const now = Date.now()

        const enabledRules = rules.filter(r => r.enabled)

        for (const rule of enabledRules) {
            for (const order of orders) {
                if (rule.entity !== 'ORDER') continue
                
                for (const segment of rule.segments) {
                    if (segment.resolveOnStatuses?.includes(order.status)) {
                        const hasRelatedUnread = NotificationGateway.hasMessage(
                            m => getMetadataString(getMetadataRecord(m.metadata), 'OrderId') === order.id &&
                                 getMetadataString(getMetadataRecord(m.metadata), 'SegmentId') === segment.id &&
                                 !m.isRead && !m.isArchived
                        )
                        if (hasRelatedUnread) {
                            NotificationGateway.archiveByOrderAndSegment(order.id, segment.id)
                            logger.info(`订单 ${order.orderNo} 进入 ${order.status}，分支「${segment.title}」相关通知已归档`)
                        }
                    }

                    const isStatusMatch = segment.targetStatuses.length === 0 || 
                                         segment.targetStatuses.includes(order.status)
                    
                    if (!isStatusMatch) continue

                    const metadata = {
                        OrderId: order.id,
                        OrderNo: order.orderNo,
                        SegmentId: segment.id,
                        SegmentTitle: segment.title,
                        ProductName: order.lines?.[0]?.productModel || '未知产品',
                        ...order
                    }

                    let dynamicRoles: string[] = []
                    if (segment.dynamicRoleField) {
                        const fieldMap: Record<string, () => string | undefined> = {
                            'claimedBy': () => order.lines?.[0]?.claimedBy,
                            'createdBy': () => order.createdBy,
                            'approval.manager': () => order.approval?.manager,
                        }
                        const resolved = fieldMap[segment.dynamicRoleField]?.()
                        if (resolved) dynamicRoles = [resolved]
                    }
                    const finalRoles = [...new Set([...segment.assigneeRoles, ...dynamicRoles])]

                    if (segment.commandIds.length > 0) {
                        for (const cmdId of segment.commandIds) {
                            const uniqueKey = `${order.id}_${segment.id}_${cmdId}`
                            const isAlreadyInList = NotificationGateway.hasMessage(
                                (m) => getMetadataString(getMetadataRecord(m.metadata), 'uniqueKey') === uniqueKey &&
                                    !m.isRead && !m.isArchived
                            )
                            if (isAlreadyInList) continue
                            const lastDismissed = NotificationGateway.getDismissedAt(uniqueKey)
                            if (lastDismissed && (now - lastDismissed < 60000)) continue

                            const cmdTemplate = stdCommands.find(c => c.id === cmdId)
                            if (cmdTemplate) {
                                addMessage({
                                    type: 'ORDER_EVENT',
                                    title: processedIds.includes(uniqueKey) ? `[提醒] ${cmdTemplate.title}` : cmdTemplate.title,
                                    content: resolveTemplate(cmdTemplate.content, { ...metadata, uniqueKey }),
                                    priority: 'info',
                                    targetRoles: finalRoles.length > 0 ? finalRoles : undefined,
                                    actionUrl: cmdTemplate.targetLink
                                        ? resolveTemplate(cmdTemplate.targetLink, metadata)
                                        : `/trading/sales-orders?search=${order.orderNo}&detailId=${order.id}`,
                                    metadata: { ...metadata, uniqueKey }
                                })
                                if (!processedIds.includes(uniqueKey)) processedIds.push(uniqueKey)
                                newCount++
                            }
                        }
                    } else {
                        const fallbackKey = `${order.id}_${segment.id}_fallback`
                        const isAlreadyInList = NotificationGateway.hasMessage(
                            (m) => getMetadataString(getMetadataRecord(m.metadata), 'uniqueKey') === fallbackKey &&
                                !m.isRead && !m.isArchived
                        )
                        const lastDismissed = NotificationGateway.getDismissedAt(fallbackKey)
                        if (!isAlreadyInList && !(lastDismissed && (now - lastDismissed < 60000))) {
                            addMessage({
                                type: 'ORDER_EVENT',
                                title: `[${rule.name}-${segment.title}] 待处理`,
                                content: `订单 ${order.orderNo} 状态已变更为「${order.status}」，请相关负责人及时处理。`,
                                priority: 'info',
                                targetRoles: finalRoles.length > 0 ? finalRoles : undefined,
                                actionUrl: `/trading/sales-orders?search=${order.orderNo}&detailId=${order.id}`,
                                metadata: { ...metadata, uniqueKey: fallbackKey }
                            })
                            newCount++
                        }
                    }
                }
            }
        }

        if (newCount > 0) {
            await StorageService.setItem(processedKey, processedIds)
        }
        return newCount
    }
}
