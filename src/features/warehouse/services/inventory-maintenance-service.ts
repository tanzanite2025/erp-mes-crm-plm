import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { AdjustmentService } from '../adjustment'
import { InventoryMaintenanceService as InventoryDomainMaintenanceService } from '../inventory'
import { StocktakeMaintenanceService } from '../stocktake'
import {
  toShipmentRecordContract,
  type ShipmentRecord,
} from '../adapters/warehouse-api-adapter'
import {
  type InventoryShipmentRecordApiDTO,
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

  submitAdjustmentForApproval: StocktakeMaintenanceService.submitAdjustmentForApproval,

  getAdjustmentHistory: AdjustmentService.getHistory,

  executeAdjustment: AdjustmentService.execute,

  patchInventory: InventoryDomainMaintenanceService.patchInventory,

  setAlertThreshold: InventoryDomainMaintenanceService.setAlertThreshold,

  getAlertThresholds: InventoryDomainMaintenanceService.getAlertThresholds,
}
