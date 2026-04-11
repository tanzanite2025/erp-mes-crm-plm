import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import {
  toInventoryAdjustmentContracts,
  toWarehouseCommandAckContract,
  type InventoryAdjustment,
  type WarehouseCommandAck,
} from '../../adapters/warehouse-api-adapter'
import {
  type InventoryAdjustmentApiDTO,
  type WarehouseCommandAckApiDTO,
} from '../../contracts/warehouse-api-dto'

export type { AdjustmentItem, InventoryAdjustment } from '../../adapters/warehouse-api-adapter'

export const AdjustmentService = {
  async getHistory(): Promise<InventoryAdjustment[]> {
    const res = await apiFetch<InventoryAdjustmentApiDTO[]>('/warehouse/adjustments')
    return toInventoryAdjustmentContracts(
      ensureArrayResponse<InventoryAdjustmentApiDTO>(res, 'AdjustmentService.getHistory')
    )
  },

  async execute(id: string): Promise<WarehouseCommandAck> {
    const res = await apiFetch<WarehouseCommandAckApiDTO>(`/warehouse/adjustments/${id}/execute`, {
      method: 'POST',
      body: JSON.stringify({ metadata: { intent: 'STOCK_ADJUSTMENT_EXECUTE' } }),
    })

    return toWarehouseCommandAckContract(
      ensureObjectResponse<WarehouseCommandAckApiDTO & Record<string, unknown>>(
        res,
        'AdjustmentService.execute'
      ) as WarehouseCommandAckApiDTO
    )
  },
}
