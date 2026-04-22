import {
  type NotificationPriority,
  type NotificationType,
} from '@/features/system-mgmt/notifications/types'
import type {
  RuleExecutionEvent,
  RuleExecutionMetadata,
} from './rule-execution-core'

export interface LiveRuleExecutionInput {
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

export interface RetroactiveOrderSnapshot {
  id: string
  orderNo: string
  status: string
  createdBy?: string
  lines?: Array<{
    productModel?: string
    claimedBy?: string
  }>
  [key: string]: unknown
}

export interface RetroactivePurchaseOrderSnapshot {
  id: string
  orderNo: string
  status: string
  supplierName?: string
  purchaser?: string
  lines?: Array<{
    materialName?: string
  }>
  [key: string]: unknown
}

export interface RetroactiveProductionTaskSnapshot {
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
  [key: string]: unknown
}

export interface RetroactiveProductionPlanSnapshot {
  id: string
  status: string
  orderNo?: string
  productName?: string
  quantity?: number
  startDate?: string | null
  endDate?: string | null
  [key: string]: unknown
}

export function buildLiveRuleExecutionEvent(
  type: NotificationType,
  input: LiveRuleExecutionInput
): RuleExecutionEvent {
  return {
    type,
    ...input,
  }
}

export function buildRetroactiveOrderRuleExecutionEvent(
  order: RetroactiveOrderSnapshot
): RuleExecutionEvent {
  return {
    type: 'ORDER_EVENT',
    action: 'STATUS_CHANGED',
    sourceCode: 'SALES_ORDER',
    targetStatus: order.status,
    actionUrl: `/trading/sales-orders?search=${order.orderNo}&detailId=${order.id}`,
    metadata: {
      ...order,
      id: order.id,
      orderId: order.id,
      OrderId: order.id,
      orderNo: order.orderNo,
      OrderNo: order.orderNo,
      status: order.status,
      ProductName: order.lines?.[0]?.productModel || 'Unknown Product',
      claimedBy: order.lines?.[0]?.claimedBy,
      createdBy: order.createdBy,
      sourceCode: 'SALES_ORDER',
    },
  }
}

export function buildRetroactiveProductionTaskRuleExecutionEvent(
  task: RetroactiveProductionTaskSnapshot
): RuleExecutionEvent {
  return {
    type: 'TASK_ASSIGNED',
    action: 'STATUS_CHANGED',
    sourceCode: 'PRODUCTION_TASK',
    targetStatus: task.status,
    actionUrl: `/dashboard/calendar?planId=${task.planId}`,
    metadata: {
      ...task,
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
    },
  }
}

export function buildRetroactiveProductionPlanRuleExecutionEvent(
  plan: RetroactiveProductionPlanSnapshot
): RuleExecutionEvent {
  return {
    type: 'SYSTEM_NOTICE',
    action: 'STATUS_CHANGED',
    sourceCode: 'PRODUCTION_PLAN',
    targetStatus: plan.status,
    actionUrl: `/dashboard/calendar?planId=${plan.id}`,
    metadata: {
      ...plan,
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
    },
  }
}

export function buildRetroactivePurchaseOrderRuleExecutionEvent(
  order: RetroactivePurchaseOrderSnapshot
): RuleExecutionEvent {
  return {
    type: 'ORDER_EVENT',
    action: 'STATUS_CHANGED',
    sourceCode: 'PURCHASE_ORDER',
    targetStatus: order.status,
    actionUrl: `/purchase/orders?search=${order.orderNo}&detailId=${order.id}`,
    metadata: {
      ...order,
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
      MaterialName: order.lines?.[0]?.materialName || 'Unknown Material',
      sourceCode: 'PURCHASE_ORDER',
    },
  }
}
