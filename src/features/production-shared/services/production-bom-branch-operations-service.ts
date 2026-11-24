import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  toProductionBOMBranchOperationContract,
  toSaveProductionBOMBranchOperationApiDTO,
} from '../adapters/production-resource-api-adapter'
import type { ProductionBOMBranchOperationApiDTO } from '../contracts/production-resource-api-dto'
import type { ProductionBOMBranchOperation } from '../data/production-line'

export const productionBOMBranchOperationsService = {
  save: async (
    operation: ProductionBOMBranchOperation
  ): Promise<ProductionBOMBranchOperation> => {
    const response = await apiFetch<ProductionBOMBranchOperationApiDTO>(
      '/production/branch-operations',
      {
        method: 'POST',
        body: JSON.stringify(
          toSaveProductionBOMBranchOperationApiDTO(operation)
        ),
      }
    )

    const checked = ensureObjectResponse<
      ProductionBOMBranchOperationApiDTO & Record<string, unknown>
    >(response, 'productionBOMBranchOperationsService.save')
    return toProductionBOMBranchOperationContract(checked)
  },
}
