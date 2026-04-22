import { createLogger } from '@/lib/logger'
import { type NotificationRule } from '../workflow-core/data/notification-rule-schema'
import { type StandardCommand } from '../workflow-core/data/schema'
import {
  executeRoutingRules,
  resolveTemplate,
  type RuleExecutionMetadata,
} from '../workflow-core/services/rule-execution-core'
import { buildLiveRuleExecutionEvent } from '../workflow-core/services/rule-execution-event-builder'
import { RoutingService } from '../workflow-core/services/routing-service'
import {
  type NotificationPriority,
  type NotificationType,
} from './types'

const logger = createLogger('NotificationService')

export { resolveTemplate }

interface DispatchInput {
  action?: string
  targetStatus?: string
  title?: string
  content?: string
  priority?: NotificationPriority
  targetRoles?: string[]
  targetUsers?: string[]
  actionUrl?: string
  sourceCode?: string
  metadata?: RuleExecutionMetadata
}

interface PurchaseOrderNotificationInput {
  id: string
  orderNo: string
  status: string
  supplierName?: string
  purchaser?: string
  materialName?: string
}

interface ProductionTaskNotificationInput {
  id: string
  planId: string
  status: string
  batchNo?: string
  processName?: string
  operator?: string
  orderNo?: string
  productName?: string
  targetQty?: number
  actualQty?: number
}

interface ProductionPlanNotificationInput {
  id: string
  status: string
  orderNo?: string
  productName?: string
  quantity?: number
  startDate?: string | null
  endDate?: string | null
}

function buildPurchaseOrderNotificationMetadata(
  order: PurchaseOrderNotificationInput
): RuleExecutionMetadata {
  return {
    id: order.id,
    purchaseOrderId: order.id,
    PurchaseOrderId: order.id,
    orderId: order.id,
    OrderId: order.id,
    purchaseOrderNo: order.orderNo,
    PurchaseOrderNo: order.orderNo,
    orderNo: order.orderNo,
    OrderNo: order.orderNo,
    status: order.status,
    supplierName: order.supplierName,
    SupplierName: order.supplierName,
    purchaser: order.purchaser,
    Purchaser: order.purchaser,
    MaterialName: order.materialName,
    sourceCode: 'PURCHASE_ORDER',
  }
}

function buildProductionTaskNotificationMetadata(
  task: ProductionTaskNotificationInput
): RuleExecutionMetadata {
  return {
    id: task.id,
    taskId: task.id,
    TaskId: task.id,
    planId: task.planId,
    PlanId: task.planId,
    status: task.status,
    batchNo: task.batchNo,
    BatchNo: task.batchNo,
    processName: task.processName,
    ProcessName: task.processName,
    operator: task.operator,
    Operator: task.operator,
    orderNo: task.orderNo,
    OrderNo: task.orderNo,
    productName: task.productName,
    ProductName: task.productName,
    targetQty: task.targetQty,
    TargetQty: task.targetQty,
    actualQty: task.actualQty,
    ActualQty: task.actualQty,
    sourceCode: 'PRODUCTION_TASK',
  }
}

function buildProductionPlanNotificationMetadata(
  plan: ProductionPlanNotificationInput
): RuleExecutionMetadata {
  return {
    id: plan.id,
    planId: plan.id,
    PlanId: plan.id,
    status: plan.status,
    orderNo: plan.orderNo,
    OrderNo: plan.orderNo,
    productName: plan.productName,
    ProductName: plan.productName,
    quantity: plan.quantity,
    Quantity: plan.quantity,
    startDate: plan.startDate,
    StartDate: plan.startDate,
    endDate: plan.endDate,
    EndDate: plan.endDate,
    sourceCode: 'PRODUCTION_PLAN',
  }
}

function getProductionPlanStatusAction(status: string) {
  if (status === 'CANCELED') return 'CANCELED'
  if (status === 'COMPLETED') return 'COMPLETED'
  return 'STATUS_CHANGED'
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

  notifyOrderStatus: (orderId: string, orderNo: string, status: string) => {
    void NotificationService.dispatch('ORDER_EVENT', {
      action: 'STATUS_CHANGED',
      sourceCode: 'SALES_ORDER',
      targetStatus: status,
      metadata: { orderId, orderNo, status, sourceCode: 'SALES_ORDER' },
    })
  },

  notifyOrderCreated: (orderNo: string, customer: string) => {
    void NotificationService.dispatch('ORDER_EVENT', {
      action: 'CREATED',
      sourceCode: 'SALES_ORDER',
      metadata: { orderNo, customer, sourceCode: 'SALES_ORDER' },
    })
  },

  notifyPurchaseOrderCreated: (order: PurchaseOrderNotificationInput) => {
    void NotificationService.dispatch('ORDER_EVENT', {
      action: 'CREATED',
      sourceCode: 'PURCHASE_ORDER',
      targetStatus: order.status,
      actionUrl: `/purchase/orders?search=${order.orderNo}&detailId=${order.id}`,
      metadata: buildPurchaseOrderNotificationMetadata(order),
    })
  },

  notifyPurchaseOrderStatus: (order: PurchaseOrderNotificationInput) => {
    void NotificationService.dispatch('ORDER_EVENT', {
      action: 'STATUS_CHANGED',
      sourceCode: 'PURCHASE_ORDER',
      targetStatus: order.status,
      actionUrl: `/purchase/orders?search=${order.orderNo}&detailId=${order.id}`,
      metadata: buildPurchaseOrderNotificationMetadata(order),
    })
  },

  notifyProductionTaskCreated: (task: ProductionTaskNotificationInput) => {
    void NotificationService.dispatch('TASK_ASSIGNED', {
      action: 'CREATED',
      sourceCode: 'PRODUCTION_TASK',
      targetStatus: task.status,
      actionUrl: `/dashboard/calendar?planId=${task.planId}`,
      metadata: buildProductionTaskNotificationMetadata(task),
    })
  },

  notifyProductionTaskStatus: (task: ProductionTaskNotificationInput) => {
    const action = task.status === 'HOLD' ? 'QUALITY_HOLD' : 'STATUS_CHANGED'
    void NotificationService.dispatch('TASK_ASSIGNED', {
      action,
      sourceCode: 'PRODUCTION_TASK',
      targetStatus: task.status,
      actionUrl: `/dashboard/calendar?planId=${task.planId}`,
      metadata: buildProductionTaskNotificationMetadata(task),
    })
  },

  notifyProductionPlanCreated: (plan: ProductionPlanNotificationInput) => {
    void NotificationService.dispatch('SYSTEM_NOTICE', {
      action: 'CREATED',
      sourceCode: 'PRODUCTION_PLAN',
      targetStatus: plan.status,
      actionUrl: `/dashboard/calendar?planId=${plan.id}`,
      metadata: buildProductionPlanNotificationMetadata(plan),
    })
  },

  notifyProductionPlanStatus: (plan: ProductionPlanNotificationInput) => {
    void NotificationService.dispatch('SYSTEM_NOTICE', {
      action: getProductionPlanStatusAction(plan.status),
      sourceCode: 'PRODUCTION_PLAN',
      targetStatus: plan.status,
      actionUrl: `/dashboard/calendar?planId=${plan.id}`,
      metadata: buildProductionPlanNotificationMetadata(plan),
    })
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
