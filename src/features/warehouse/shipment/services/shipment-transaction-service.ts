import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import {
  type ShipmentRecordCreateInput,
  toShipmentRecordApiDTO,
  toShipmentRecordContract,
} from '../adapters/shipment-api-adapter'
import { type InventoryShipmentRecordApiDTO } from '../contracts/shipment-api-dto'
import { type ShipmentRecord } from '../data/schema'

export type { ShipmentRecord, ShipmentStatus } from '../data/schema'

export interface PrepareVirtualShipmentInput {
  salesOrderId: string
  salesOrderLineId: number
  quantity: number
  sourceCategory: string
  batchNo: string
  shipmentDate: string
  operator: string
  remarks: string
}

export const ShipmentTransactionService = {
  recordShipment: async (data: ShipmentRecordCreateInput): Promise<ShipmentRecord> => {
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

  prepareVirtualShipment: async (data: PrepareVirtualShipmentInput): Promise<ShipmentRecord> => {
    const res = await apiFetch<InventoryShipmentRecordApiDTO>('/inventory/shipment/virtual-lock', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        metadata: { intent: 'WAREHOUSE_VIRTUAL_SHIPMENT_LOCK' },
      }),
    })

    return toShipmentRecordContract(
      ensureObjectResponse<InventoryShipmentRecordApiDTO & Record<string, unknown>>(
        res,
        'ShipmentTransactionService.prepareVirtualShipment'
      ) as InventoryShipmentRecordApiDTO
    )
  },

  patchShipmentDraft: async (id: string, delta: DeltaSet, version: number): Promise<ShipmentRecord> => {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: {
        id,
        version,
        intent: 'SALES_PREASSEMBLY_SCAN_CONFIRM',
      },
    }

    const res = await apiFetch<InventoryShipmentRecordApiDTO>(`/inventory/shipment/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return toShipmentRecordContract(
      ensureObjectResponse<InventoryShipmentRecordApiDTO & Record<string, unknown>>(
        res,
        'ShipmentTransactionService.patchShipmentDraft'
      ) as InventoryShipmentRecordApiDTO
    )
  },
}
