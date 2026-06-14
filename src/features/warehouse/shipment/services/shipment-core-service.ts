import { apiFetch } from '@/lib/api-client'
import { isApiClientError } from '@/lib/api-error'
import { ensureArrayField, ensureObjectResponse } from '@/lib/api-response'
import {
  toShipmentDemandContracts,
  toShipmentRecordContracts,
} from '../adapters/shipment-api-adapter'
import {
  type InventoryShipmentRecordApiDTO,
  type ShipmentDemandApiDTO,
  type ShipmentDemandListApiDTO,
} from '../contracts/shipment-api-dto'
import { type ShipmentDemand, type ShipmentRecord } from '../data/schema'

export type {
  ShipmentDemand,
  ShipmentRecord,
  ShipmentStatus,
} from '../data/schema'

interface ShipmentHistoryApiDTO {
  items: InventoryShipmentRecordApiDTO[]
  total: number
  page: number
  pageSize: number
}

interface ShipmentHistoryQueryOptions {
  page?: number
  pageSize?: number
}

export const ShipmentCoreService = {
  getShipmentHistoryPage: async (
    options: ShipmentHistoryQueryOptions = {}
  ): Promise<ShipmentHistoryApiDTO> => {
    const page = options.page ?? 1
    const pageSize = options.pageSize ?? 50
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })

    const res = await apiFetch<ShipmentHistoryApiDTO>(
      `/inventory/shipment?${params.toString()}`
    )
    return ensureObjectResponse<
      ShipmentHistoryApiDTO & Record<string, unknown>
    >(
      res,
      'ShipmentCoreService.getShipmentHistoryPage'
    ) as ShipmentHistoryApiDTO
  },

  getShipmentHistory: async (
    options: ShipmentHistoryQueryOptions = {}
  ): Promise<ShipmentRecord[]> => {
    const response = await ShipmentCoreService.getShipmentHistoryPage(options)
    return toShipmentRecordContracts(
      ensureArrayField<InventoryShipmentRecordApiDTO>(
        response,
        'items',
        'ShipmentCoreService.getShipmentHistory'
      )
    )
  },

  getShipmentDemands: async (): Promise<ShipmentDemand[]> => {
    let res: ShipmentDemandListApiDTO
    try {
      res = await apiFetch<ShipmentDemandListApiDTO>(
        '/inventory/shipment-demands',
        {
          suppressErrorStatuses: [404],
        }
      )
    } catch (error) {
      if (isApiClientError(error) && error.status === 404) {
        return []
      }
      throw error
    }
    const response = ensureObjectResponse<
      ShipmentDemandListApiDTO & Record<string, unknown>
    >(res, 'ShipmentCoreService.getShipmentDemands')
    return toShipmentDemandContracts(
      ensureArrayField<ShipmentDemandApiDTO>(
        response,
        'items',
        'ShipmentCoreService.getShipmentDemands'
      )
    )
  },
}
