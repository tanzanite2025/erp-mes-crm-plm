import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import {
  toStocktakeItemContracts,
  toStocktakeTaskContracts,
  type StocktakeItem,
  type StocktakeTask,
} from '../adapters/warehouse-api-adapter'
import {
  type StocktakeItemApiDTO,
  type StocktakeTaskApiDTO,
} from '../contracts/warehouse-api-dto'

export type { StocktakeItem, StocktakeTask } from '../adapters/warehouse-api-adapter'

export const StocktakeCoreService = {
  async getTasks(): Promise<StocktakeTask[]> {
    const res = await apiFetch<StocktakeTaskApiDTO[]>('/stocktakes')
    return toStocktakeTaskContracts(
      ensureArrayResponse<StocktakeTaskApiDTO>(res, 'StocktakeCoreService.getTasks')
    )
  },

  async getItems(taskId: string): Promise<StocktakeItem[]> {
    const res = await apiFetch<StocktakeItemApiDTO[]>(`/stocktakes/${taskId}/items`)
    return toStocktakeItemContracts(
      ensureArrayResponse<StocktakeItemApiDTO>(res, 'StocktakeCoreService.getItems')
    )
  },
}
