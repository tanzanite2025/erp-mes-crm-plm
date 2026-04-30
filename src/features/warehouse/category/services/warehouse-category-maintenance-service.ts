import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaSet } from '@/lib/delta/types'
import {
  toWarehouseCategoryApiDTO,
  toWarehouseCategoryContract,
} from '../adapters/warehouse-category-api-adapter'
import { type WarehouseCategoryApiDTO } from '../contracts/warehouse-category-api-dto'
import type { WarehouseCategory } from '../data/schema'

export const WAREHOUSE_CATEGORY_INTENT_CREATE = 'WAREHOUSE_CATEGORY_CREATE'

export interface WarehouseCategoryTransactionRequest<TPayload> {
  intent: string
  actorId?: string
  payload: TPayload
}

type WarehouseCategoryCreatePayload = Omit<WarehouseCategory, 'id' | 'version' | 'createdAt' | 'updatedAt'>

const buildWarehouseCategoryTransactionBody = (
  request: WarehouseCategoryTransactionRequest<WarehouseCategoryCreatePayload>
) => ({
  ...toWarehouseCategoryApiDTO(request.payload),
  metadata: {
    intent: request.intent,
    actorId: request.actorId,
  },
})

export async function executeWarehouseCategoryTransaction(
  request: WarehouseCategoryTransactionRequest<WarehouseCategoryCreatePayload>,
  context = 'WarehouseCategoryMaintenanceService.executeWarehouseCategoryTransaction'
): Promise<WarehouseCategory> {
  const res = await apiFetch<WarehouseCategoryApiDTO>('/warehouse/categories', {
    method: 'POST',
    body: JSON.stringify(buildWarehouseCategoryTransactionBody(request)),
  })

  return toWarehouseCategoryContract(
    ensureObjectResponse<WarehouseCategoryApiDTO & Record<string, unknown>>(
      res,
      context
    ) as WarehouseCategoryApiDTO
  )
}

export const WarehouseCategoryMaintenanceService = {
  async createCategory(
    category: WarehouseCategoryCreatePayload
  ): Promise<WarehouseCategory> {
    return executeWarehouseCategoryTransaction({
      intent: WAREHOUSE_CATEGORY_INTENT_CREATE,
      payload: category,
    }, 'WarehouseCategoryMaintenanceService.createCategory')
  },

  async patchCategory(id: string, delta: DeltaSet, version: number): Promise<WarehouseCategory> {
    const res = await apiFetch<WarehouseCategoryApiDTO>(`/warehouse/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ op: 'PATCH', delta, metadata: { id, version } }),
    })

    return toWarehouseCategoryContract(
      ensureObjectResponse<WarehouseCategoryApiDTO & Record<string, unknown>>(
        res,
        'WarehouseCategoryMaintenanceService.patchCategory'
      ) as WarehouseCategoryApiDTO
    )
  },

  async deleteCategory(id: string): Promise<void> {
    return apiFetch(`/warehouse/categories/${id}`, {
      method: 'DELETE',
    })
  },
}
