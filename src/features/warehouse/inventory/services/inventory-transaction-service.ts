import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  toInboundRecordApiDTO,
  toInboundRecordContract,
} from '../adapters/inventory-api-adapter'
import { type InventoryInboundRecordApiDTO } from '../contracts/inventory-api-dto'
import { type InboundRecord } from '../data/schema'

export type { InboundRecord } from '../data/schema'

export const InventoryTransactionService = {
  recordInbound: async (data: Omit<InboundRecord, 'id'>): Promise<InboundRecord> => {
    const res = await apiFetch<InventoryInboundRecordApiDTO>('/inventory/inbound', {
      method: 'POST',
      body: JSON.stringify({
        ...toInboundRecordApiDTO(data),
        metadata: { intent: 'INBOUND_RECEIPT' },
      }),
    })

    return toInboundRecordContract(
      ensureObjectResponse<InventoryInboundRecordApiDTO & Record<string, unknown>>(
        res,
        'InventoryTransactionService.recordInbound'
      ) as InventoryInboundRecordApiDTO
    )
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
  },
}
