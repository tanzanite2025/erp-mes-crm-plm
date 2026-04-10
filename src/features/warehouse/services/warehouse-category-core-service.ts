import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import {
  toWarehouseCategoryContracts,
  toWarehouseCategoryOptionContracts,
  type WarehouseCategory,
  type WarehouseCategoryOption,
} from '../adapters/warehouse-api-adapter'
import {
  type WarehouseCategoryListPageApiDTO,
  type WarehouseCategoryOptionApiDTO,
} from '../contracts/warehouse-api-dto'

export type { WarehouseCategory, WarehouseCategoryOption } from '../adapters/warehouse-api-adapter'

export const WarehouseCategoryCoreService = {
  getCategoryList: async (): Promise<WarehouseCategory[]> => {
    const res = await apiFetch<WarehouseCategoryListPageApiDTO>('/warehouse/categories')
    const response = ensureObjectResponse<WarehouseCategoryListPageApiDTO & Record<string, unknown>>(
      res,
      'WarehouseCategoryCoreService.getCategoryList'
    )
    return toWarehouseCategoryContracts(response.items ?? [])
  },

  getCategoryOptions: async (): Promise<WarehouseCategoryOption[]> => {
    const res = await apiFetch<WarehouseCategoryOptionApiDTO[]>('/warehouse/categories/options')
    return toWarehouseCategoryOptionContracts(
      ensureArrayResponse<WarehouseCategoryOptionApiDTO>(
        res,
        'WarehouseCategoryCoreService.getCategoryOptions'
      )
    )
  },
}
