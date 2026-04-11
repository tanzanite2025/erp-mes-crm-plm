import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { InventoryMaintenanceService as InventoryDomainMaintenanceService } from '../inventory'
import {
  toInventoryAdjustmentContracts,
  toShipmentRecordContract,
  toWarehouseCommandAckContract,
  type InventoryAdjustment,
  type ShipmentRecord,
  type WarehouseCommandAck,
} from '../adapters/warehouse-api-adapter'
import {
  type InventoryAdjustmentApiDTO,
  type InventoryShipmentRecordApiDTO,
  type WarehouseCommandAckApiDTO,
} from '../contracts/warehouse-api-dto'

export interface ReconcileResult {
  totalItems: number
  fixedNegatives: number
}

export type { AdjustmentItem, InventoryAdjustment } from '../adapters/warehouse-api-adapter'
export type { InventoryRecord } from '../inventory'

export const InventoryMaintenanceService = {
  reconcileInventory: InventoryDomainMaintenanceService.reconcileInventory,

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
    return toWarehouseCommandAckContract(
      ensureObjectResponse<WarehouseCommandAckApiDTO & Record<string, unknown>>(
        res,
        'InventoryMaintenanceService.executeAdjustment'
      ) as WarehouseCommandAckApiDTO
    )
  },

  patchInventory: InventoryDomainMaintenanceService.patchInventory,

  setAlertThreshold: InventoryDomainMaintenanceService.setAlertThreshold,

  getAlertThresholds: InventoryDomainMaintenanceService.getAlertThresholds,
}
