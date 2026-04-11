import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaSet } from '@/lib/delta/types'
import {
  toWarehouseCategoryApiDTO,
  toWarehouseCategoryContract,
  type WarehouseCategory,
} from '../adapters/warehouse-category-api-adapter'
import { type WarehouseCategoryApiDTO } from '../contracts/warehouse-category-api-dto'

export const WarehouseCategoryMaintenanceService = {
  async createCategory(
    category: Omit<WarehouseCategory, 'id' | 'version' | 'createdAt' | 'updatedAt'>
  ): Promise<WarehouseCategory> {
    const res = await apiFetch<WarehouseCategoryApiDTO>('/warehouse/categories', {
      method: 'POST',
      body: JSON.stringify(toWarehouseCategoryApiDTO(category)),
    })

    return toWarehouseCategoryContract(
      ensureObjectResponse<WarehouseCategoryApiDTO & Record<string, unknown>>(
        res,
        'WarehouseCategoryMaintenanceService.createCategory'
      ) as WarehouseCategoryApiDTO
    )
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
