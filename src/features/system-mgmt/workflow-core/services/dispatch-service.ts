import { NotificationGateway } from '@/features/system-mgmt/notifications/notification-gateway'
import { type SystemMessage } from '@/features/system-mgmt/notifications/types'
import { StorageService } from '@/features/system-mgmt/services/storage-service'
import { createLogger } from '@/lib/logger'
import { type NotificationRule } from '../data/notification-rule-schema'
import { type StandardCommand, type WorkflowNode } from '../data/schema'
import { RoutingService } from './routing-service'
import { executeRoutingRules } from './rule-execution-core'
import {
  buildRetroactiveOrderRuleExecutionEvent,
  buildRetroactiveProductionPlanRuleExecutionEvent,
  buildRetroactiveProductionTaskRuleExecutionEvent,
  buildRetroactivePurchaseOrderRuleExecutionEvent,
  type RetroactiveOrderSnapshot,
  type RetroactiveProductionPlanSnapshot,
  type RetroactiveProductionTaskSnapshot,
  type RetroactivePurchaseOrderSnapshot,
} from './rule-execution-event-builder'

const logger = createLogger('DispatchService')

type DispatchMetadata = Record<string, unknown>

interface DispatchContext {
  orderId: string
  orderNo: string
  productName?: string
  [key: string]: unknown
}

interface OrderSnapshot extends RetroactiveOrderSnapshot {
  approval?: {
    manager?: string
  }
}

interface PurchaseOrderSnapshot extends RetroactivePurchaseOrderSnapshot {
  approval?: {
    manager?: string
  }
}

interface ProductionTaskSnapshot extends RetroactiveProductionTaskSnapshot {
  approval?: {
    manager?: string
  }
}

interface ProductionPlanSnapshot extends RetroactiveProductionPlanSnapshot {
  approval?: {
    manager?: string
  }
}

function getMetadataRecord(
  metadata: SystemMessage['metadata'] | undefined
): DispatchMetadata {
  return metadata && typeof metadata === 'object' ? metadata : {}
}

function getMetadataString(
  metadata: DispatchMetadata,
  key: string
): string | undefined {
  const value = metadata[key]
  return typeof value === 'string' ? value : undefined
}

function resolveTemplate(template: string, metadata: DispatchMetadata = {}) {
  if (!template) return ''
  return template.replace(/\[(\w+)\]/g, (match, key) => {
    return metadata[key] !== undefined ? String(metadata[key]) : match
  })
}

export const DispatchService = {
  dispatchCommands: async (node: WorkflowNode, context: DispatchContext) => {
    const addMessage = NotificationGateway.addMessage
    const stdCommands = await RoutingService.getCommands().catch(
      () => [] as StandardCommand[]
    )

    const metadata = {
      OrderId: context.orderId,
      OrderNo: context.orderNo,
      ProductName: context.productName || '未知产品',
      ...context,
    }

    for (const cmdRef of node.commands) {
      const cmdTemplate = stdCommands.find((command) => command.id === cmdRef)

      if (cmdTemplate) {
        addMessage({
          type: node.type === 'PRODUCTION' ? 'TASK_ASSIGNED' : 'ORDER_EVENT',
          title: cmdTemplate.title,
          content: resolveTemplate(cmdTemplate.content, metadata),
          priority: 'info',
          targetRoles: node.assigneeRoles,
          actionUrl: cmdTemplate.targetLink
            ? resolveTemplate(cmdTemplate.targetLink, metadata)
            : `/trading/sales-orders?search=${context.orderNo}&detailId=${context.orderId}`,
        })
        continue
      }

      addMessage({
        type: 'ORDER_EVENT',
        title: node.title,
        content: cmdRef,
        priority: 'info',
        targetRoles: node.assigneeRoles,
        actionUrl: `/trading/sales-orders?search=${context.orderNo}&detailId=${context.orderId}`,
      })
    }
  },

  scanAndRetroactiveDispatch: async (
    nodes: WorkflowNode[],
    orders: OrderSnapshot[]
  ) => {
    const addMessage = NotificationGateway.addMessage
    const stdCommands = await RoutingService.getCommands().catch(
      () => [] as StandardCommand[]
    )

    const processedKey = 'xdfc_processed_dispatched_ids'
    const processedIds =
      (await StorageService.getItem<string[]>(processedKey)) || []
    let newCount = 0
    const now = Date.now()

    const startNodes = nodes.filter(
      (node) => node.type === 'START' && node.triggerConfig
    )

    for (const node of startNodes) {
      for (const order of orders) {
        const isMatch =
          node.triggerConfig?.entity === 'ORDER' &&
          node.triggerConfig?.action === 'STATUS_CHANGED' &&
          node.triggerConfig?.targetStatus === order.status

        if (!isMatch) continue

        for (const cmdId of node.commands || []) {
          const uniqueKey = `${order.id}_${cmdId}`
          const isAlreadyInList = NotificationGateway.hasMessage((message) => {
            const metadata = getMetadataRecord(message.metadata)
            return (
              getMetadataString(metadata, 'uniqueKey') === uniqueKey &&
              !message.isRead &&
              !message.isArchived
            )
          })
          if (isAlreadyInList) continue

          const lastDismissed = NotificationGateway.getDismissedAt(uniqueKey)
          if (lastDismissed && now - lastDismissed < 60_000) {
            continue
          }

          const cmdTemplate = stdCommands.find((command) => command.id === cmdId)
          const metadata = {
            OrderId: order.id,
            OrderNo: order.orderNo,
            uniqueKey,
            ...order,
          }

          if (!cmdTemplate) continue

          addMessage({
            type: 'ORDER_EVENT',
            title: processedIds.includes(uniqueKey)
              ? `[提醒] ${cmdTemplate.title}`
              : `[追溯] ${cmdTemplate.title}`,
            content: resolveTemplate(cmdTemplate.content, metadata),
            priority: 'info',
            targetRoles: node.assigneeRoles,
            actionUrl: cmdTemplate.targetLink
              ? resolveTemplate(cmdTemplate.targetLink, metadata)
              : `/trading/sales-orders?search=${order.orderNo}&detailId=${order.id}`,
            metadata,
          })

          if (!processedIds.includes(uniqueKey)) {
            processedIds.push(uniqueKey)
          }
          newCount += 1
        }

        if ((node.commands || []).length > 0) continue

        const fallbackKey = `${order.id}_${node.id}_fallback`
        const isAlreadyInList = NotificationGateway.hasMessage((message) => {
          const metadata = getMetadataRecord(message.metadata)
          return (
            getMetadataString(metadata, 'uniqueKey') === fallbackKey &&
            !message.isRead
          )
        })
        const lastDismissed = NotificationGateway.getDismissedAt(fallbackKey)
        if (isAlreadyInList || (lastDismissed && now - lastDismissed < 60_000)) {
          continue
        }

        addMessage({
          type: 'ORDER_EVENT',
          title: `[${node.title}] 待处理`,
          content: `订单 ${order.orderNo} 的状态已变更为 ${order.status}，请相关负责人及时处理。`,
          priority: 'info',
          targetRoles: node.assigneeRoles,
          actionUrl: `/trading/sales-orders?search=${order.orderNo}&detailId=${order.id}`,
          metadata: {
            uniqueKey: fallbackKey,
            OrderId: order.id,
            OrderNo: order.orderNo,
            ...order,
          },
        })
        newCount += 1
      }
    }

    if (newCount > 0) {
      await StorageService.setItem(processedKey, processedIds)
    }
    return newCount
  },

  sendNotification: (
    title: string,
    content: string,
    roles?: string[],
    actionUrl?: string
  ) => {
    NotificationGateway.addMessage({
      type: 'SYSTEM_NOTICE',
      title,
      content,
      priority: 'info',
      targetRoles: roles,
      actionUrl,
    })
  },

  scanByRules: async (
    rules: NotificationRule[],
    snapshots: {
      salesOrders?: OrderSnapshot[]
      purchaseOrders?: PurchaseOrderSnapshot[]
      productionPlans?: ProductionPlanSnapshot[]
      productionTasks?: ProductionTaskSnapshot[]
    }
  ) => {
    const stdCommands = await RoutingService.getCommands().catch(
      () => [] as StandardCommand[]
    )
    const processedApprovalKey = 'xdfc_processed_rule_approval_ids'
    const processedApprovalIds = new Set(
      (await StorageService.getItem<string[]>(processedApprovalKey)) || []
    )
    let newCount = 0
    let approvalCount = 0

    for (const order of snapshots.salesOrders ?? []) {
      const execution = await executeRoutingRules({
        rules,
        commands: stdCommands,
        mode: 'retroactive',
        processedApprovalKeys: processedApprovalIds,
        event: buildRetroactiveOrderRuleExecutionEvent(order),
      })

      newCount += execution.notifiedCount
      approvalCount += execution.approvalCreatedCount
      for (const key of execution.processedApprovalKeys) {
        processedApprovalIds.add(key)
      }
    }

    for (const order of snapshots.purchaseOrders ?? []) {
      const execution = await executeRoutingRules({
        rules,
        commands: stdCommands,
        mode: 'retroactive',
        processedApprovalKeys: processedApprovalIds,
        event: buildRetroactivePurchaseOrderRuleExecutionEvent(order),
      })

      newCount += execution.notifiedCount
      approvalCount += execution.approvalCreatedCount
      for (const key of execution.processedApprovalKeys) {
        processedApprovalIds.add(key)
      }
    }

    for (const task of snapshots.productionTasks ?? []) {
      const execution = await executeRoutingRules({
        rules,
        commands: stdCommands,
        mode: 'retroactive',
        processedApprovalKeys: processedApprovalIds,
        event: buildRetroactiveProductionTaskRuleExecutionEvent(task),
      })

      newCount += execution.notifiedCount
      approvalCount += execution.approvalCreatedCount
      for (const key of execution.processedApprovalKeys) {
        processedApprovalIds.add(key)
      }
    }

    for (const plan of snapshots.productionPlans ?? []) {
      const execution = await executeRoutingRules({
        rules,
        commands: stdCommands,
        mode: 'retroactive',
        processedApprovalKeys: processedApprovalIds,
        event: buildRetroactiveProductionPlanRuleExecutionEvent(plan),
      })

      newCount += execution.notifiedCount
      approvalCount += execution.approvalCreatedCount
      for (const key of execution.processedApprovalKeys) {
        processedApprovalIds.add(key)
      }
    }

    if (approvalCount > 0) {
      await StorageService.setItem(
        processedApprovalKey,
        Array.from(processedApprovalIds)
      )
      logger.info(`追溯扫描已创建 ${approvalCount} 条审批申请`)
    }

    return newCount
  },
}
