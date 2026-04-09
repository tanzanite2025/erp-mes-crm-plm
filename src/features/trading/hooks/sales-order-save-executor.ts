import { type DeltaSet } from '@/lib/delta/types'
import { type SalesOrder } from '../data/schema'
import { type SaveMutationPlan } from './sales-order-save-plan'

interface SaveExecutionContext {
  operator: string
  actorId?: string
}

interface SalesOrderSaveMutationExecutor {
  create: (order: Omit<SalesOrder, 'id' | 'version'>) => Promise<unknown>
  patch: (args: { id: string; delta: DeltaSet; version: number }) => Promise<unknown>
  customerChange: (args: {
    orderId: string
    customerId?: string
    customerName: string
    operator: string
    actorId?: string
    expectedVersion: number
  }) => Promise<unknown>
  deliveryDateChange: (args: {
    orderId: string
    deliveryDate: string
    operator: string
    actorId?: string
    expectedVersion: number
  }) => Promise<unknown>
  purchaseOrderNoChange: (args: {
    orderId: string
    purchaseOrderNo: string
    operator: string
    actorId?: string
    expectedVersion: number
  }) => Promise<unknown>
  requirementsChange: (args: {
    orderId: string
    requirements: string
    operator: string
    actorId?: string
    expectedVersion: number
  }) => Promise<unknown>
  classificationTypeChange: (args: {
    orderId: string
    classification?: string
    type?: string
    barcode?: string
    operator: string
    actorId?: string
    expectedVersion: number
  }) => Promise<unknown>
  linesChange: (args: {
    orderId: string
    lines: SalesOrder['lines']
    operator: string
    actorId?: string
    expectedVersion: number
  }) => Promise<unknown>
  lineContentChange: (args: {
    orderId: string
    lines: SalesOrder['lines']
    operator: string
    actorId?: string
    expectedVersion: number
  }) => Promise<unknown>
  lineAdd: (args: {
    orderId: string
    lines: SalesOrder['lines']
    operator: string
    actorId?: string
    expectedVersion: number
  }) => Promise<unknown>
  lineRemove: (args: {
    orderId: string
    lines: SalesOrder['lines']
    operator: string
    actorId?: string
    expectedVersion: number
  }) => Promise<unknown>
  statusTransition: (args: {
    orderId: string
    status: string
    statusNote: string
    operator: string
    actorId?: string
    expectedVersion: number
  }) => Promise<unknown>
  cancel: (args: {
    orderId: string
    reason: string
    operator: string
    actorId?: string
    expectedVersion: number
  }) => Promise<unknown>
}

interface ExecuteSalesOrderSavePlanParams {
  order: SalesOrder
  finalData: SalesOrder
  delta: DeltaSet
  plan: SaveMutationPlan
  context: SaveExecutionContext
  mutations: SalesOrderSaveMutationExecutor
}

export const executeSalesOrderSavePlan = async ({
  order,
  finalData,
  delta,
  plan,
  context,
  mutations,
}: ExecuteSalesOrderSavePlanParams) => {
  const executionBase = {
    operator: context.operator,
    actorId: context.actorId,
    expectedVersion: order.version,
  }

  switch (plan.kind) {
    case 'customer':
      await mutations.customerChange({
        orderId: order.id,
        customerId: finalData.customerId,
        customerName: finalData.customerName || '',
        ...executionBase,
      })
      return
    case 'lineContent':
      await mutations.lineContentChange({
        orderId: order.id,
        lines: finalData.lines || [],
        ...executionBase,
      })
      return
    case 'lineAdd':
      await mutations.lineAdd({
        orderId: order.id,
        lines: finalData.lines || [],
        ...executionBase,
      })
      return
    case 'lineRemove':
      await mutations.lineRemove({
        orderId: order.id,
        lines: finalData.lines || [],
        ...executionBase,
      })
      return
    case 'lines':
      await mutations.linesChange({
        orderId: order.id,
        lines: finalData.lines || [],
        ...executionBase,
      })
      return
    case 'classificationType':
      await mutations.classificationTypeChange({
        orderId: order.id,
        classification: finalData.classification,
        type: finalData.type,
        barcode: finalData.barcode,
        ...executionBase,
      })
      return
    case 'deliveryDate':
      await mutations.deliveryDateChange({
        orderId: order.id,
        deliveryDate: finalData.deliveryDate || '',
        ...executionBase,
      })
      return
    case 'cancel':
      await mutations.cancel({
        orderId: order.id,
        reason: finalData.statusNote || '',
        ...executionBase,
      })
      return
    case 'statusTransition':
      await mutations.statusTransition({
        orderId: order.id,
        status: finalData.status || order.status,
        statusNote: finalData.statusNote || '',
        ...executionBase,
      })
      return
    case 'purchaseOrderNo':
      await mutations.purchaseOrderNoChange({
        orderId: order.id,
        purchaseOrderNo: finalData.purchaseOrderNo || '',
        ...executionBase,
      })
      return
    case 'requirements':
      await mutations.requirementsChange({
        orderId: order.id,
        requirements: finalData.requirements || '',
        ...executionBase,
      })
      return
    case 'patch':
      await mutations.patch({
        id: order.id,
        delta,
        version: order.version,
      })
      return
  }
}
