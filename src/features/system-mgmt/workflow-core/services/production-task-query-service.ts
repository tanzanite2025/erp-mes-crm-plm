import { z } from 'zod'
import { apiFetch } from '@/lib/api-client'
import { normalizeProductionPlanStatus } from '../data/production-plan-status'
import { normalizeProductionTaskStatus } from '../data/production-task-status'
import {
  type RetroactiveProductionPlanSnapshot,
  type RetroactiveProductionTaskSnapshot,
} from './rule-execution-event-builder'

const productionTaskApiSchema = z.object({
  id: z.string(),
  planId: z.string(),
  batchNo: z.string().optional().default(''),
  processName: z.string().optional().default(''),
  targetQty: z.number().optional().default(0),
  actualQty: z.number().optional().default(0),
  status: z.string(),
  operator: z.string().optional().default(''),
})

const productionPlanApiSchema = z.object({
  id: z.string(),
  orderNo: z.string().optional().default(''),
  productName: z.string().optional().default(''),
  quantity: z.number().optional().default(0),
  status: z.string(),
  startDate: z.string().nullable().optional().default(null),
  endDate: z.string().nullable().optional().default(null),
  tasks: z.array(productionTaskApiSchema).default([]),
})

const productionPlansPageApiSchema = z.object({
  items: z.array(productionPlanApiSchema).default([]),
})

export interface ProductionRuleSnapshots {
  productionPlans: RetroactiveProductionPlanSnapshot[]
  productionTasks: RetroactiveProductionTaskSnapshot[]
}

export async function getProductionRuleSnapshots(): Promise<ProductionRuleSnapshots> {
  const response = await apiFetch<unknown>('/production/plans?pageSize=1000')
  const page = productionPlansPageApiSchema.parse(response)

  return {
    productionPlans: page.items.map((plan) => ({
      id: plan.id,
      status: normalizeProductionPlanStatus(plan.status),
      orderNo: plan.orderNo,
      productName: plan.productName,
      quantity: plan.quantity,
      startDate: plan.startDate,
      endDate: plan.endDate,
    })),
    productionTasks: page.items.flatMap((plan) =>
      plan.tasks.map((task) => ({
        id: task.id,
        planId: task.planId || plan.id,
        status: normalizeProductionTaskStatus(task.status),
        batchNo: task.batchNo,
        processName: task.processName,
        operator: task.operator,
        orderNo: plan.orderNo,
        productName: plan.productName,
        targetQty: task.targetQty,
        actualQty: task.actualQty,
      }))
    ),
  }
}

export async function getProductionTaskRuleSnapshots(): Promise<
  RetroactiveProductionTaskSnapshot[]
> {
  const snapshots = await getProductionRuleSnapshots()
  return snapshots.productionTasks
}

export async function getProductionPlanRuleSnapshots(): Promise<
  RetroactiveProductionPlanSnapshot[]
> {
  const snapshots = await getProductionRuleSnapshots()
  return snapshots.productionPlans
}
