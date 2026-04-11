import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import {
  toStocktakeItemContracts,
  toStocktakeTaskContracts,
} from '../adapters/stocktake-api-adapter'
import {
  type StocktakeItemApiDTO,
  type StocktakeTaskApiDTO,
} from '../contracts/stocktake-api-dto'
import type { StocktakeItem, StocktakeTask } from '../data/schema'

export type { StocktakeItem, StocktakeTask } from '../data/schema'

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
