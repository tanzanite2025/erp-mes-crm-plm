import { apiFetch } from '@/lib/api-client'
import { ensureArrayField } from '@/lib/api-response'
import { toProductionBOMBranchOperationContract } from '../adapters/production-resource-api-adapter'
import type { ProductionBOMBranchOperationApiDTO } from '../contracts/production-resource-api-dto'
import type { ProductionBOMBranchOperation } from '../data/production-line'

interface SaveProductionBOMBranchOperationSelectionRequest {
  productId: string
  bomOwnerType: 'INTERNAL' | 'CUSTOMER'
  bomOwnerCustomerId: string
  bomVersionLevel: string
  processLibraryIds: string[]
}

export const productionBOMBranchOperationSelectionService = {
  replace: async (
    request: SaveProductionBOMBranchOperationSelectionRequest
  ): Promise<ProductionBOMBranchOperation[]> => {
    const response = await apiFetch<{
      items: ProductionBOMBranchOperationApiDTO[]
    }>('/production/branch-operations/selection', {
      method: 'POST',
      body: JSON.stringify(request),
    })
    const items = ensureArrayField<ProductionBOMBranchOperationApiDTO>(
      response,
      'items',
      'productionBOMBranchOperationSelectionService.replace'
    )
    return items.map(toProductionBOMBranchOperationContract)
  },
}
