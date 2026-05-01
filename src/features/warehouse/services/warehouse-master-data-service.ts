import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import { toMasterDataSearchResultContracts } from '../inventory/adapters/inventory-api-adapter'
import { type MasterDataSearchResultApiDTO } from '../inventory/contracts/inventory-api-dto'
import { type MasterDataSearchResult } from '../inventory/data/schema'

export type WarehouseMasterDataSearchScope = 'INBOUND' | 'SHIPMENT' | 'ALL'

type SearchSelectableItemsParams = {
  query?: string
  scope: WarehouseMasterDataSearchScope
}

export const WarehouseMasterDataService = {
  searchSelectableItems: async ({
    query = '',
    scope,
  }: SearchSelectableItemsParams): Promise<MasterDataSearchResult[]> => {
    const params = new URLSearchParams({ scope })
    const normalizedQuery = query.trim()
    if (normalizedQuery) {
      params.set('q', normalizedQuery)
    }

    const res = await apiFetch<MasterDataSearchResultApiDTO[]>(
      `/warehouse/master-data/search?${params.toString()}`
    )

    return toMasterDataSearchResultContracts(
      ensureArrayResponse<MasterDataSearchResultApiDTO>(
        res,
        'WarehouseMasterDataService.searchSelectableItems'
      )
    )
  },
}
