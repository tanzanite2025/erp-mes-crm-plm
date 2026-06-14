import { type DeltaSet } from '@/lib/delta/types'
import { type PurchaseOrder } from '../data/schema'

export type PurchaseOrderSaveExecution =
  | {
      mode: 'create'
      submitValues: PurchaseOrder
    }
  | {
      mode: 'update'
      orderId: string
      expectedVersion: number
      delta: DeltaSet
      submitValues: PurchaseOrder
    }
  | {
      mode: 'noop'
      submitValues: PurchaseOrder
    }

export function buildPurchaseOrderSaveExecution(
  initialOrder: PurchaseOrder | null | undefined,
  submitValues: PurchaseOrder,
  delta: DeltaSet
): PurchaseOrderSaveExecution {
  if (!initialOrder) {
    return {
      mode: 'create',
      submitValues,
    }
  }

  if (Object.keys(delta).length === 0) {
    return {
      mode: 'noop',
      submitValues,
    }
  }

  if (initialOrder.version === undefined || initialOrder.version === null) {
    throw new Error(
      `[CRITICAL] Missing version for SDRTS Patch on PurchaseOrder ${initialOrder.id}`
    )
  }

  return {
    mode: 'update',
    orderId: initialOrder.id,
    expectedVersion: initialOrder.version,
    delta,
    submitValues,
  }
}
