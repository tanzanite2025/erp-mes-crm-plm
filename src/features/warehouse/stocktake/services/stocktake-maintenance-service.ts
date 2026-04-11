import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import {
  toPDABulkSyncResponseContract,
  toPDAScanPayloadApiDTO,
  toStocktakeCreateRequestApiDTO,
  toWarehouseCommandAckContract,
} from '../adapters/stocktake-api-adapter'
import {
  type PDABulkSyncResponseApiDTO,
  type WarehouseCommandAckApiDTO,
} from '../contracts/stocktake-api-dto'
import type {
  PDABulkSyncResponse,
  PDAScanPayload,
  StocktakeCreateInput,
  WarehouseCommandAck,
} from '../data/schema'

export type {
  PDABulkSyncFailure,
  PDABulkSyncResponse,
  PDAScanPayload,
  StocktakeCreateInput,
  WarehouseCommandAck,
} from '../data/schema'

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

  async submitAdjustmentForApproval(taskId: string): Promise<WarehouseCommandAck> {
    const res = await apiFetch<WarehouseCommandAckApiDTO>(`/stocktakes/${taskId}/post-adjustment`, {
      method: 'POST',
      body: JSON.stringify({ metadata: { intent: 'STOCK_ADJUSTMENT_SUBMIT' } }),
    })

    return toWarehouseCommandAckContract(
      ensureObjectResponse<WarehouseCommandAckApiDTO & Record<string, unknown>>(
        res,
        'StocktakeMaintenanceService.submitAdjustmentForApproval'
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

  async pdaPatchItem(id: string, delta: DeltaSet, version: number): Promise<WarehouseCommandAck> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: {
        id,
        version,
        intent: 'PDA_STOCKTAKE_PATCH',
      },
    }

    const res = await apiFetch<WarehouseCommandAckApiDTO>(`/stocktakes/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })

    return toWarehouseCommandAckContract(
      ensureObjectResponse<WarehouseCommandAckApiDTO & Record<string, unknown>>(
        res,
        'StocktakeMaintenanceService.pdaPatchItem'
      ) as WarehouseCommandAckApiDTO
    )
  },
}
