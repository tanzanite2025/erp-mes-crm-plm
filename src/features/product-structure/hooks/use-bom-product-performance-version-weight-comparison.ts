import { useQuery } from '@tanstack/react-query'
import { bomQueryKeys } from '../query-keys'
import { bomService } from '../services/bom-service'
import {
  buildBOMProductPerformanceVersionWeightComparison,
  type BOMProductPerformanceVersionWeightSource,
} from '../utils/bom-product-performance-version-weight-comparison'

export function useBOMProductPerformanceVersionWeightComparison(
  currentBOM: BOMProductPerformanceVersionWeightSource
) {
  const query = useQuery({
    queryKey: bomQueryKeys.associationOptions(currentBOM.productId),
    // The complete metadata endpoint avoids truncating models with > 50 BOMs.
    queryFn: () =>
      bomService.getBOMAssociationOptions({ productId: currentBOM.productId }),
    enabled: Boolean(currentBOM.productId),
  })
  return {
    versionWeights: buildBOMProductPerformanceVersionWeightComparison(
      currentBOM,
      query.data ?? []
    ),
    isLoading: Boolean(currentBOM.productId) && query.isPending,
    error: query.error,
    retry: query.refetch,
  }
}
