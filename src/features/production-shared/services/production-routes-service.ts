import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  toProductionRouteContract,
  toProductionRouteContracts,
  toProductionRouteBOMBranchContracts,
  toSaveProductionRouteApiDTO,
} from '../adapters/production-resource-api-adapter'
import type {
  ProductionMessageApiDTO,
  ProductionRouteApiDTO,
  ProductionRouteBOMBranchesResponseApiDTO,
  ProductionRouteSalesOrderLineCandidatesResponseApiDTO,
  ProductionRoutesResponseApiDTO,
} from '../contracts/production-resource-api-dto'
import type {
  ProductionRoute,
  ProductionRouteBOMBranch,
  ProductionRouteSalesOrderLineCandidate,
} from '../data/production-route'

export const productionRoutesService = {
  getSalesOrderLineCandidates: async (
    productId = ''
  ): Promise<ProductionRouteSalesOrderLineCandidate[]> => {
    const query = productId ? `?productId=${encodeURIComponent(productId)}` : ''
    const response =
      await apiFetch<ProductionRouteSalesOrderLineCandidatesResponseApiDTO>(
        `/production/routes/sales-order-line-candidates${query}`
      )
    const checked = ensureObjectResponse<
      ProductionRouteSalesOrderLineCandidatesResponseApiDTO &
        Record<string, unknown>
    >(response, 'productionRoutesService.getSalesOrderLineCandidates')
    return checked.items || []
  },

  resetSalesOrderLineRouteToBranchDefault: async (
    salesOrderLineID: number
  ): Promise<void> => {
    const response = await apiFetch<ProductionMessageApiDTO>(
      `/production/routes/sales-order-lines/${salesOrderLineID}/default`,
      { method: 'PATCH' }
    )
    ensureObjectResponse<ProductionMessageApiDTO & Record<string, unknown>>(
      response,
      'productionRoutesService.resetSalesOrderLineRouteToBranchDefault'
    )
  },

  getBOMBranches: async (): Promise<ProductionRouteBOMBranch[]> => {
    const response = await apiFetch<ProductionRouteBOMBranchesResponseApiDTO>(
      '/production/routes/bom-branches'
    )
    const checked = ensureObjectResponse<
      ProductionRouteBOMBranchesResponseApiDTO & Record<string, unknown>
    >(response, 'productionRoutesService.getBOMBranches')
    return toProductionRouteBOMBranchContracts(checked.items || [])
  },

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

  publishRoute: async (
    routeId: string,
    version: number
  ): Promise<ProductionRoute> => {
    const response = await apiFetch<ProductionRouteApiDTO>(
      `/production/routes/${encodeURIComponent(routeId)}/publish`,
      {
        method: 'POST',
        body: JSON.stringify({ version }),
      }
    )

    return toProductionRouteContract(
      ensureObjectResponse<ProductionRouteApiDTO & Record<string, unknown>>(
        response,
        'productionRoutesService.publishRoute'
      ) as ProductionRouteApiDTO
    )
  },

  createRevision: async (routeId: string): Promise<ProductionRoute> => {
    const response = await apiFetch<ProductionRouteApiDTO>(
      `/production/routes/${encodeURIComponent(routeId)}/revisions`,
      { method: 'POST' }
    )

    return toProductionRouteContract(
      ensureObjectResponse<ProductionRouteApiDTO & Record<string, unknown>>(
        response,
        'productionRoutesService.createRevision'
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
