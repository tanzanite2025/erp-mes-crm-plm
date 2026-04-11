import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  toShipmentRecordApiDTO,
  toShipmentRecordContract,
  type ShipmentRecord,
} from '../adapters/shipment-api-adapter'
import { type InventoryShipmentRecordApiDTO } from '../contracts/shipment-api-dto'

export type { ShipmentRecord, ShipmentStatus } from '../data/schema'

export const ShipmentTransactionService = {
  recordShipment: async (data: Omit<ShipmentRecord, 'id'>): Promise<ShipmentRecord> => {
    const res = await apiFetch<InventoryShipmentRecordApiDTO>('/inventory/shipment', {
      method: 'POST',
      body: JSON.stringify({
        ...toShipmentRecordApiDTO(data),
        metadata: { intent: 'SHIPMENT_DISPATCH' },
      }),
    })

    return toShipmentRecordContract(
      ensureObjectResponse<InventoryShipmentRecordApiDTO & Record<string, unknown>>(
        res,
        'ShipmentTransactionService.recordShipment'
      ) as InventoryShipmentRecordApiDTO
    )
  },

  commitShipment: async (id: string): Promise<ShipmentRecord> => {
    const res = await apiFetch<InventoryShipmentRecordApiDTO>(`/inventory/shipment/${id}/commit`, {
      method: 'POST',
      body: JSON.stringify({
        metadata: { intent: 'COMMITTED_SETTLEMENT' },
      }),
    })

    return toShipmentRecordContract(
      ensureObjectResponse<InventoryShipmentRecordApiDTO & Record<string, unknown>>(
        res,
        'ShipmentTransactionService.commitShipment'
      ) as InventoryShipmentRecordApiDTO
    )
  },
}
