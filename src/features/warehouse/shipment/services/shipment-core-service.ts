import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { toShipmentRecordContracts } from '../adapters/shipment-api-adapter'
import { type InventoryShipmentRecordApiDTO } from '../contracts/shipment-api-dto'
import { type ShipmentRecord } from '../data/schema'

export type { ShipmentRecord, ShipmentStatus } from '../data/schema'

interface ShipmentHistoryApiDTO {
  items: InventoryShipmentRecordApiDTO[]
  total: number
  page: number
  pageSize: number
}

export const ShipmentCoreService = {
  getShipmentHistory: async (): Promise<ShipmentRecord[]> => {
    const res = await apiFetch<ShipmentHistoryApiDTO>('/inventory/shipment')
    const response = ensureObjectResponse<ShipmentHistoryApiDTO & Record<string, unknown>>(
      res,
      'ShipmentCoreService.getShipmentHistory'
    )
    return toShipmentRecordContracts(response.items ?? [])
  },
}
