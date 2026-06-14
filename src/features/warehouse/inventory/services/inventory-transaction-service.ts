import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { assertRequiredVersion } from '@/lib/version-guard'
import {
  toInboundTDOApiDTO,
  toInboundRecordContract,
} from '../adapters/inventory-api-adapter'
import {
  type CreateInventoryInboundApiDTO,
  type InventoryInboundRecordApiDTO,
} from '../contracts/inventory-api-dto'
import {
  inboundRecordSchema,
  inboundTDOSchema,
  type InboundRecord,
  type InboundTDO,
} from '../data/schema'

export type { InboundRecord, InboundTDO } from '../data/schema'

export const INVENTORY_TRANSACTION_INTENT_INBOUND_RECEIPT = 'INBOUND_RECEIPT'
export const INVENTORY_TRANSACTION_INTENT_INTER_WAREHOUSE_TRANSFER =
  'INTER_WAREHOUSE_TRANSFER'

export const InventoryTransactionService = {
  recordInbound: async (data: InboundTDO): Promise<InboundRecord> => {
    const command = inboundTDOSchema.parse(data)

    const res = await apiFetch<
      InventoryInboundRecordApiDTO | CreateInventoryInboundApiDTO
    >('/inventory/inbound', {
      method: 'POST',
      body: JSON.stringify({
        ...toInboundTDOApiDTO(command),
        metadata: { intent: INVENTORY_TRANSACTION_INTENT_INBOUND_RECEIPT },
      }),
    })

    const response = ensureObjectResponse<
      InventoryInboundRecordApiDTO & Record<string, unknown>
    >(res, 'InventoryTransactionService.recordInbound')
    const contract = toInboundRecordContract(response)
    return inboundRecordSchema.parse(contract)
  },

  transferInventory: async (
    materialId: string,
    quantity: number,
    fromCat: string,
    toCat: string,
    version: number
  ): Promise<void> => {
    const expectedVersion = assertRequiredVersion(
      version,
      'InventoryTransactionService.transferInventory',
      materialId
    )

    await apiFetch<void>('/inventory/transfer', {
      method: 'POST',
      body: JSON.stringify({
        materialId,
        quantity,
        fromCategory: fromCat,
        toCategory: toCat,
        version: expectedVersion,
        metadata: {
          intent: INVENTORY_TRANSACTION_INTENT_INTER_WAREHOUSE_TRANSFER,
        },
      }),
    })
  },
}
