import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { InventoryThresholdService } from '../../material-thresholds/services/inventory-threshold-service'
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
    const rules = await InventoryThresholdService.listRules()
    const existingRule = rules.find(
      (rule) => rule.targetType === 'MATERIAL' && rule.materialId === materialId
    )

    if (minQty <= 0) {
      if (existingRule) {
        await InventoryThresholdService.deleteRule(existingRule.id)
      }
      return
    }

    const payload = {
      targetType: 'MATERIAL' as const,
      materialId,
      thresholdQty: minQty,
      enabled: true,
      notes: existingRule?.notes ?? '',
    }

    if (existingRule) {
      await InventoryThresholdService.updateRule(existingRule.id, payload)
      return
    }

    await InventoryThresholdService.createRule(payload)
  },

  getAlertThresholds: async (): Promise<Record<string, number>> => {
    const rules = await InventoryThresholdService.listRules()
    return rules.reduce<Record<string, number>>((acc, rule) => {
      if (rule.targetType !== 'MATERIAL' || !rule.enabled || !rule.materialId) {
        return acc
      }
      acc[rule.materialId] = rule.thresholdQty
      return acc
    }, {})
  },
}
