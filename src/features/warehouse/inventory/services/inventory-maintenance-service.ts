import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { toInventoryRecordContract } from '../adapters/inventory-api-adapter'
import { type InventoryItemApiDTO } from '../contracts/inventory-api-dto'
import { type InventoryRecord } from '../data/schema'

export interface ReconcileResult {
  totalItems: number
  fixedNegatives: number
}

export const InventoryMaintenanceService = {
  reconcileInventory: async (): Promise<ReconcileResult> => {
    const res = await apiFetch<ReconcileResult>('/inventory/reconcile', {
      method: 'POST',
      body: JSON.stringify({ metadata: { intent: 'STOCK_RECONCILIATION' } }),
    })
    return ensureObjectResponse<ReconcileResult & Record<string, unknown>>(
      res,
      'InventoryMaintenanceService.reconcileInventory'
    ) as ReconcileResult
  },

  patchInventory: async (id: string, delta: DeltaSet, version: number): Promise<InventoryRecord> => {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: {
        id,
        version,
        intent: 'PHYSICAL_STOCK_ADJUSTMENT',
      },
    }

    const res = await apiFetch<InventoryItemApiDTO>(`/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return toInventoryRecordContract(
      ensureObjectResponse<InventoryItemApiDTO & Record<string, unknown>>(
        res,
        'InventoryMaintenanceService.patchInventory'
      ) as InventoryItemApiDTO
    )
  },

  setAlertThreshold: async (materialId: string, minQty: number): Promise<void> => {
    void materialId
    void minQty
  },

  getAlertThresholds: async (): Promise<Record<string, number>> => {
    return {}
  },
}
