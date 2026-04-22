import { apiFetch } from '@/lib/api-client'
import { NotificationService } from '@/features/system-mgmt/notifications/notification-service'
import {
  normalizeProductionPlanStatus,
  type ProductionPlanStatus,
} from '@/features/system-mgmt/workflow-core/data/production-plan-status'
import { normalizeProductionTaskStatus } from '@/features/system-mgmt/workflow-core/data/production-task-status'

export interface ProductionTaskCommand {
  id?: string
  planId?: string
  batchNo?: string
  processName?: string
  targetQty?: number
  actualQty?: number
  status: string
  operator?: string
}

export interface ProductionPlanCommand {
  id?: string
  orderNo?: string
  orderId?: string
  productId?: string
  productName?: string
  quantity?: number
  status?: ProductionPlanStatus | string
  startDate?: string | null
  endDate?: string | null
  notes?: string
  tasks?: ProductionTaskCommand[]
}

export interface ProductionPlanEventSnapshot {
  id: string
  status: ProductionPlanStatus
  orderNo?: string
  productName?: string
  quantity?: number
  startDate?: string | null
  endDate?: string | null
}

export interface ProductionTaskEventSnapshot {
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

function toProductionPlanEventSnapshot(
  plan: ProductionPlanCommand
): ProductionPlanEventSnapshot | null {
  const planId = plan.id?.trim()
  if (!planId || plan.status === undefined) return null

  return {
    id: planId,
    status: normalizeProductionPlanStatus(plan.status),
    orderNo: plan.orderNo,
    productName: plan.productName,
    quantity: plan.quantity,
    startDate: plan.startDate,
    endDate: plan.endDate,
  }
}

function toProductionPlanPayload(
  plan: ProductionPlanCommand
): ProductionPlanCommand {
  return {
    ...plan,
    status:
      plan.status === undefined
        ? undefined
        : normalizeProductionPlanStatus(plan.status),
    tasks: plan.tasks?.map((task) => ({
      ...task,
      status: normalizeProductionTaskStatus(task.status),
    })),
  }
}

function toProductionTaskEventSnapshot(
  plan: ProductionPlanCommand,
  task: ProductionTaskCommand
): ProductionTaskEventSnapshot | null {
  const taskId = task.id?.trim()
  const planId = task.planId?.trim() || plan.id?.trim()
  if (!taskId || !planId) return null

  return {
    id: taskId,
    planId,
    status: normalizeProductionTaskStatus(task.status),
    batchNo: task.batchNo,
    processName: task.processName,
    operator: task.operator,
    orderNo: plan.orderNo,
    productName: plan.productName,
    targetQty: task.targetQty,
    actualQty: task.actualQty,
  }
}

export function dispatchProductionPlanEvents(
  savedPlan: ProductionPlanCommand,
  previousPlan?: ProductionPlanCommand
) {
  const snapshot = toProductionPlanEventSnapshot(savedPlan)
  if (!snapshot) return

  if (!previousPlan?.id) {
    NotificationService.notifyProductionPlanCreated(snapshot)
    return
  }

  if (previousPlan.status === undefined) return
  const previousStatus = normalizeProductionPlanStatus(previousPlan.status)
  if (previousStatus !== snapshot.status) {
    NotificationService.notifyProductionPlanStatus(snapshot)
  }
}

function buildPreviousTaskStatusMap(previousPlan?: ProductionPlanCommand) {
  return new Map(
    (previousPlan?.tasks ?? [])
      .filter((task) => task.id)
      .map((task) => [
        task.id as string,
        normalizeProductionTaskStatus(task.status),
      ])
  )
}

export function dispatchProductionTaskEvents(
  savedPlan: ProductionPlanCommand,
  previousPlan?: ProductionPlanCommand
) {
  const previousStatusByTaskId = buildPreviousTaskStatusMap(previousPlan)

  for (const task of savedPlan.tasks ?? []) {
    const snapshot = toProductionTaskEventSnapshot(savedPlan, task)
    if (!snapshot) continue

    const previousStatus = previousStatusByTaskId.get(snapshot.id)
    if (!previousStatus) {
      NotificationService.notifyProductionTaskCreated(snapshot)
      continue
    }

    if (previousStatus !== snapshot.status) {
      NotificationService.notifyProductionTaskStatus(snapshot)
    }
  }
}

export const ProductionPlanCommandService = {
  async saveProductionPlan(
    plan: ProductionPlanCommand,
    options: {
      previousPlan?: ProductionPlanCommand
      dispatchEvents?: boolean
    } = {}
  ): Promise<ProductionPlanCommand> {
    const payload = toProductionPlanPayload(plan)

    const savedPlan = await apiFetch<ProductionPlanCommand>('/production/plans', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    if (savedPlan.status !== undefined) {
      normalizeProductionPlanStatus(savedPlan.status)
    }

    if (options.dispatchEvents !== false) {
      dispatchProductionPlanEvents(savedPlan, options.previousPlan)
      dispatchProductionTaskEvents(savedPlan, options.previousPlan)
    }

    return savedPlan
  },
}
