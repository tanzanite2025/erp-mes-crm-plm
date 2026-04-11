import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import {
  toWarehouseCategoryContracts,
  toWarehouseCategoryOptionContracts,
} from '../adapters/warehouse-category-api-adapter'
import {
  type WarehouseCategoryListPageApiDTO,
  type WarehouseCategoryOptionApiDTO,
} from '../contracts/warehouse-category-api-dto'
import {
  type WarehouseCategory,
  type WarehouseCategoryOption,
} from '../data/schema'

export type { WarehouseCategory, WarehouseCategoryOption } from '../data/schema'

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
