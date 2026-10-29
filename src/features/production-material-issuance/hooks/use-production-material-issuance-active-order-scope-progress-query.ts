import { useQuery } from '@tanstack/react-query'
import type { ProductionMaterialIssuanceActiveProgressQuery } from '../contracts/production-material-issuance-active-order-scope-progress-api-dto'
import { productionMaterialIssuanceCacheKeys } from '../data/production-material-issuance-query-and-explicit-command-cache-keys'
import { queryProductionMaterialIssuanceActiveOrderProgress } from '../services/production-material-issuance-active-order-scope-progress-query-service'

export function useProductionMaterialIssuanceActiveOrderProgress(
  actorId: string,
  query: ProductionMaterialIssuanceActiveProgressQuery
) {
  return useQuery({
    queryKey: [
      ...productionMaterialIssuanceCacheKeys.root,
      'active-order-progress',
      actorId,
      query,
    ],
    queryFn: ({ signal }) =>
      queryProductionMaterialIssuanceActiveOrderProgress(query, signal),
    enabled: Boolean(actorId),
    retry: false,
  })
}
