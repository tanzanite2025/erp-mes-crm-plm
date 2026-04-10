import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  toPDABulkSyncResponseContract,
  toPDAScanPayloadApiDTO,
  toStocktakeCreateRequestApiDTO,
  toWarehouseCommandAckContract,
  type PDABulkSyncResponse,
  type PDAScanPayload,
  type StocktakeCreateInput,
  type WarehouseCommandAck,
} from '../adapters/warehouse-api-adapter'
import {
  type PDABulkSyncResponseApiDTO,
  type WarehouseCommandAckApiDTO,
} from '../contracts/warehouse-api-dto'

export type {
  PDABulkSyncFailure,
  PDABulkSyncResponse,
  PDAScanPayload,
  StocktakeCreateInput,
  WarehouseCommandAck,
} from '../adapters/warehouse-api-adapter'

export const StocktakeMaintenanceService = {
  async create(data: StocktakeCreateInput): Promise<WarehouseCommandAck> {
    const res = await apiFetch<WarehouseCommandAckApiDTO>('/stocktakes', {
      method: 'POST',
      body: JSON.stringify(toStocktakeCreateRequestApiDTO(data)),
    })

    return toWarehouseCommandAckContract(
      ensureObjectResponse<WarehouseCommandAckApiDTO & Record<string, unknown>>(
        res,
        'StocktakeMaintenanceService.create'
      ) as WarehouseCommandAckApiDTO
    )
  },

  async pdaSubmitScan(data: PDAScanPayload): Promise<WarehouseCommandAck> {
    const res = await apiFetch<WarehouseCommandAckApiDTO>('/pda/scan', {
      method: 'POST',
      body: JSON.stringify(toPDAScanPayloadApiDTO(data)),
    })

    return toWarehouseCommandAckContract(
      ensureObjectResponse<WarehouseCommandAckApiDTO & Record<string, unknown>>(
        res,
        'StocktakeMaintenanceService.pdaSubmitScan'
      ) as WarehouseCommandAckApiDTO
    )
  },

  async pdaBulkSync(scans: PDAScanPayload[]): Promise<PDABulkSyncResponse> {
    const res = await apiFetch<PDABulkSyncResponseApiDTO>('/pda/sync', {
      method: 'POST',
      body: JSON.stringify(scans.map(toPDAScanPayloadApiDTO)),
    })

    return toPDABulkSyncResponseContract(
      ensureObjectResponse<PDABulkSyncResponseApiDTO & Record<string, unknown>>(
        res,
        'StocktakeMaintenanceService.pdaBulkSync'
      ) as PDABulkSyncResponseApiDTO
    )
  },
}
