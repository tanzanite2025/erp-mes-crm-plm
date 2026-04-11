import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  toInboundRecordApiDTO,
  toInboundRecordContract,
  toShipmentRecordApiDTO,
  toShipmentRecordContract,
  type InboundRecord,
  type ShipmentRecord,
} from '../adapters/warehouse-api-adapter'
import {
  type InventoryInboundRecordApiDTO,
  type InventoryShipmentRecordApiDTO,
} from '../contracts/warehouse-api-dto'
import { InventoryCoreService } from './inventory-core-service'

export type { InboundRecord, ShipmentRecord, ShipmentStatus } from '../adapters/warehouse-api-adapter'

export const InventoryTransactionService = {
  recordInbound: async (data: Omit<InboundRecord, 'id'>): Promise<InboundRecord> => {
    const res = await apiFetch<InventoryInboundRecordApiDTO>('/inventory/inbound', {
      method: 'POST',
      body: JSON.stringify({
        ...toInboundRecordApiDTO(data),
        metadata: { intent: 'INBOUND_RECEIPT' },
      }),
    })

    const checked = toInboundRecordContract(
      ensureObjectResponse<InventoryInboundRecordApiDTO & Record<string, unknown>>(
        res,
        'InventoryTransactionService.recordInbound'
      ) as InventoryInboundRecordApiDTO
    )
    InventoryCoreService.broadcastUpdate()
    return checked
  },

  recordShipment: async (data: Omit<ShipmentRecord, 'id'>): Promise<ShipmentRecord> => {
    const res = await apiFetch<InventoryShipmentRecordApiDTO>('/inventory/shipment', {
      method: 'POST',
      body: JSON.stringify({
        ...toShipmentRecordApiDTO(data),
        metadata: { intent: 'SHIPMENT_DISPATCH' },
      }),
    })

    const record = toShipmentRecordContract(
      ensureObjectResponse<InventoryShipmentRecordApiDTO & Record<string, unknown>>(
        res,
        'InventoryTransactionService.recordShipment'
      ) as InventoryShipmentRecordApiDTO
    )
    InventoryCoreService.broadcastUpdate()
    return record
  },

  commitShipment: async (id: string): Promise<ShipmentRecord> => {
    const res = await apiFetch<InventoryShipmentRecordApiDTO>(`/inventory/shipment/${id}/commit`, {
      method: 'POST',
      body: JSON.stringify({
        metadata: { intent: 'COMMITTED_SETTLEMENT' },
      }),
    })

    const record = toShipmentRecordContract(
      ensureObjectResponse<InventoryShipmentRecordApiDTO & Record<string, unknown>>(
        res,
        'InventoryTransactionService.commitShipment'
      ) as InventoryShipmentRecordApiDTO
    )
    InventoryCoreService.broadcastUpdate()
    return record
  },

  transferInventory: async (
    materialId: string,
    quantity: number,
    fromCat: string,
    toCat: string
  ): Promise<void> => {
    await apiFetch<void>('/inventory/transfer', {
      method: 'POST',
      body: JSON.stringify({
        materialId,
        quantity,
        fromCategory: fromCat,
        toCategory: toCat,
        metadata: { intent: 'INTER_WAREHOUSE_TRANSFER' },
      }),
    })
    InventoryCoreService.broadcastUpdate()
  },
}
