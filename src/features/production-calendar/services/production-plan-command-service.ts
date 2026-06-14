import { apiFetch } from '@/lib/api-client'
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

export const ProductionPlanCommandService = {
  async saveProductionPlan(
    plan: ProductionPlanCommand,
    _options: {
      previousPlan?: ProductionPlanCommand
      dispatchEvents?: boolean
    } = {}
  ): Promise<ProductionPlanCommand> {
    const payload = toProductionPlanPayload(plan)

    const savedPlan = await apiFetch<ProductionPlanCommand>(
      '/production/plans',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )

    if (savedPlan.status !== undefined) {
      normalizeProductionPlanStatus(savedPlan.status)
    }

    return savedPlan
  },
}
