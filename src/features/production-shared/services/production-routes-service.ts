import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  toProductionRouteContract,
  toProductionRouteContracts,
  toSaveProductionRouteApiDTO,
} from '../adapters/production-resource-api-adapter'
import type {
  ProductionMessageApiDTO,
  ProductionRouteApiDTO,
  ProductionRoutesResponseApiDTO,
} from '../contracts/production-resource-api-dto'
import type { ProductionRoute } from '../data/production-route'

export const productionRoutesService = {
  getRoutes: async (): Promise<ProductionRoute[]> => {
    const res =
      await apiFetch<ProductionRoutesResponseApiDTO>('/production/routes')
    const checked = ensureObjectResponse<
      ProductionRoutesResponseApiDTO & Record<string, unknown>
    >(res, 'productionRoutesService.getRoutes')
    return toProductionRouteContracts(checked)
  },

  saveRoute: async (route: ProductionRoute): Promise<ProductionRoute> => {
    const res = await apiFetch<ProductionRouteApiDTO>('/production/routes', {
      method: 'POST',
      body: JSON.stringify(toSaveProductionRouteApiDTO(route)),
    })

    return toProductionRouteContract(
      ensureObjectResponse<ProductionRouteApiDTO & Record<string, unknown>>(
        res,
        'productionRoutesService.saveRoute'
      ) as ProductionRouteApiDTO
    )
  },

  deleteRoute: async (id: string): Promise<void> => {
    const res = await apiFetch<ProductionMessageApiDTO>(
      `/production/routes/${id}`,
      {
        method: 'DELETE',
      }
    )

    ensureObjectResponse<ProductionMessageApiDTO & Record<string, unknown>>(
      res,
      'productionRoutesService.deleteRoute'
    )
  },
}
