import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import {
  toInventoryAdjustmentContracts,
  toInventoryRecordContract,
  toShipmentRecordContract,
  toWarehouseCommandAckContract,
  type InventoryAdjustment,
  type InventoryRecord,
  type ShipmentRecord,
  type WarehouseCommandAck,
} from '../adapters/warehouse-api-adapter'
import {
  type InventoryAdjustmentApiDTO,
  type InventoryItemApiDTO,
  type InventoryShipmentRecordApiDTO,
  type WarehouseCommandAckApiDTO,
} from '../contracts/warehouse-api-dto'
import { InventoryCoreService } from './inventory-core-service'

export interface ReconcileResult {
  totalItems: number
  fixedNegatives: number
}

export type { AdjustmentItem, InventoryAdjustment } from '../adapters/warehouse-api-adapter'

export const InventoryMaintenanceService = {
  reconcileInventory: async (): Promise<ReconcileResult> => {
    const res = await apiFetch<ReconcileResult>('/inventory/reconcile', {
      method: 'POST',
      body: JSON.stringify({ metadata: { intent: 'STOCK_RECONCILIATION' } }),
    })
    const result = ensureObjectResponse<ReconcileResult & Record<string, unknown>>(
      res,
      'InventoryMaintenanceService.reconcileInventory'
    ) as ReconcileResult
    InventoryCoreService.broadcastUpdate()
    return result
  },

  deleteShipmentRecord: async (id: string, approvalId?: string): Promise<ShipmentRecord> => {
    const res = await apiFetch<InventoryShipmentRecordApiDTO>(`/inventory/shipment/${id}/void`, {
      method: 'POST',
      body: JSON.stringify({
        approvalId,
        metadata: { intent: 'SHIPMENT_VOID' },
      }),
    })
    const record = toShipmentRecordContract(
      ensureObjectResponse<InventoryShipmentRecordApiDTO & Record<string, unknown>>(
        res,
        'InventoryMaintenanceService.deleteShipmentRecord'
      ) as InventoryShipmentRecordApiDTO
    )
    InventoryCoreService.broadcastUpdate()
    return record
  },

  submitAdjustmentForApproval: async (taskId: string): Promise<WarehouseCommandAck> => {
    const res = await apiFetch<WarehouseCommandAckApiDTO>(`/stocktakes/${taskId}/post-adjustment`, {
      method: 'POST',
      body: JSON.stringify({ metadata: { intent: 'STOCK_ADJUSTMENT_SUBMIT' } }),
    })

    return toWarehouseCommandAckContract(
      ensureObjectResponse<WarehouseCommandAckApiDTO & Record<string, unknown>>(
        res,
        'InventoryMaintenanceService.submitAdjustmentForApproval'
      ) as WarehouseCommandAckApiDTO
    )
  },

  getAdjustmentHistory: async (): Promise<InventoryAdjustment[]> => {
    const res = await apiFetch<InventoryAdjustmentApiDTO[]>('/warehouse/adjustments')
    return toInventoryAdjustmentContracts(
      ensureArrayResponse<InventoryAdjustmentApiDTO>(
        res,
        'InventoryMaintenanceService.getAdjustmentHistory'
      )
    )
  },

  executeAdjustment: async (id: string): Promise<WarehouseCommandAck> => {
    const res = await apiFetch<WarehouseCommandAckApiDTO>(`/warehouse/adjustments/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ metadata: { intent: 'STOCK_ADJUSTMENT_EXECUTE' } }),
    })
    InventoryCoreService.broadcastUpdate()
    return toWarehouseCommandAckContract(
      ensureObjectResponse<WarehouseCommandAckApiDTO & Record<string, unknown>>(
        res,
        'InventoryMaintenanceService.executeAdjustment'
      ) as WarehouseCommandAckApiDTO
    )
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

    InventoryCoreService.broadcastUpdate()
    return toInventoryRecordContract(
      ensureObjectResponse<InventoryItemApiDTO & Record<string, unknown>>(
        res,
        'InventoryMaintenanceService.patchInventory'
      ) as InventoryItemApiDTO
    )
  },

  setAlertThreshold: async (materialId: string, minQty: number): Promise<void> => {
    console.warn('[MAINTENANCE] setAlertThreshold is not yet synced to backend storage', { materialId, minQty })
    InventoryCoreService.broadcastUpdate()
  },

  getAlertThresholds: async (): Promise<Record<string, number>> => {
    return {}
  },
}
