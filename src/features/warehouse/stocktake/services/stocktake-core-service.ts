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
import {
  stocktakeItemArraySchema,
  stocktakeTaskArraySchema,
  type StocktakeItem,
  type StocktakeTask,
} from '../data/schema'

export type { StocktakeItem, StocktakeTask } from '../data/schema'

export const StocktakeCoreService = {
  async getTasks(): Promise<StocktakeTask[]> {
    const res = await apiFetch<StocktakeTaskApiDTO[]>('/stocktakes')
    return stocktakeTaskArraySchema.parse(
      toStocktakeTaskContracts(
        ensureArrayResponse<StocktakeTaskApiDTO>(
          res,
          'StocktakeCoreService.getTasks'
        )
      )
    )
  },

  async getItems(taskId: string): Promise<StocktakeItem[]> {
    const res = await apiFetch<StocktakeItemApiDTO[]>(
      `/stocktakes/${taskId}/items`
    )
    return stocktakeItemArraySchema.parse(
      toStocktakeItemContracts(
        ensureArrayResponse<StocktakeItemApiDTO>(
          res,
          'StocktakeCoreService.getItems'
        )
      )
    )
  },
}
