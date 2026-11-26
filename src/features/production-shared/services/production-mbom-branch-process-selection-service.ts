import { apiFetch } from '@/lib/api-client'
import { ensureArrayField } from '@/lib/api-response'
import { toProductionProcessContract } from '../adapters/production-resource-api-adapter'
import type { ProductionProcessStepApiDTO } from '../contracts/production-resource-api-dto'
import type { ProductionProcessStep } from '../data/production-process'

interface SaveProductionMBOMBranchProcessSelectionRequest {
  productId: string
  bomOwnerType: 'INTERNAL' | 'CUSTOMER'
  bomOwnerCustomerId: string
  bomVersionLevel: string
  processStepIds: string[]
}

export const productionMBOMBranchProcessSelectionService = {
  replace: async (
    request: SaveProductionMBOMBranchProcessSelectionRequest
  ): Promise<ProductionProcessStep[]> => {
    const response = await apiFetch<{ items: ProductionProcessStepApiDTO[] }>(
      '/production/mbom-branch-processes/selection',
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    )
    const items = ensureArrayField<ProductionProcessStepApiDTO>(
      response,
      'items',
      'productionMBOMBranchProcessSelectionService.replace'
    )
    return items.map(toProductionProcessContract)
  },
}
