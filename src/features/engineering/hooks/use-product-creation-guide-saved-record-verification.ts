import { useQuery } from '@tanstack/react-query'
import { isNotFoundError } from '@/lib/error-status'
import { bomQueryKeys } from '@/features/product-structure/query-keys'
import { bomService } from '@/features/product-structure/services/bom-service'
import type { ProductCreationGuideStepResult } from '../data/product-creation-operation-guide-progress'
import { productDetailQueryKey } from '../query-keys'
import { ProductCoreService } from '../services/product-core-service'

type SavedRecordVerificationStatus =
  | 'idle'
  | 'checking'
  | 'verified'
  | 'missing'
  | 'error'
  | 'unavailable'

export function useProductCreationGuideSavedRecordVerification({
  savedProduct,
  savedBom,
  canViewProduct,
  canViewBom,
}: {
  savedProduct: ProductCreationGuideStepResult | undefined
  savedBom: ProductCreationGuideStepResult | undefined
  canViewProduct: boolean
  canViewBom: boolean
}) {
  const productId = savedProduct?.id ?? ''
  const productQuery = useQuery({
    queryKey: productDetailQueryKey(productId),
    queryFn: () => ProductCoreService.getProductById(productId),
    enabled: Boolean(productId) && canViewProduct,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    retry: false,
  })
  const linkedBomsQuery = useQuery({
    queryKey: [...bomQueryKeys.list(), { productId }] as const,
    queryFn: () => bomService.getBOMs({ productId }),
    enabled: Boolean(productId) && canViewBom,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    refetchOnReconnect: 'always',
    retry: false,
  })

  let productStatus: SavedRecordVerificationStatus = 'idle'
  if (productId) {
    if (!canViewProduct) productStatus = 'unavailable'
    else if (productQuery.isFetching || !productQuery.isFetchedAfterMount)
      productStatus = 'checking'
    else if (productQuery.isError)
      productStatus = isNotFoundError(productQuery.error) ? 'missing' : 'error'
    else if (productQuery.isSuccess) productStatus = 'verified'
  }

  let bomStatus: SavedRecordVerificationStatus = 'idle'
  if (productId) {
    if (productStatus === 'missing') bomStatus = 'missing'
    else if (!canViewBom) bomStatus = 'unavailable'
    else if (linkedBomsQuery.isFetching || !linkedBomsQuery.isFetchedAfterMount)
      bomStatus = 'checking'
    else if (linkedBomsQuery.isError) bomStatus = 'error'
    else if (linkedBomsQuery.isSuccess) bomStatus = 'verified'
  }

  // This only verifies the current association; it does not choose a production BOM
  // or add review/release requirements to the guide's existing saved-BOM status.
  const linkedBoms = (linkedBomsQuery.data ?? []).filter(
    (bom) => bom.productId === productId
  )
  const linkedBom =
    linkedBoms.find((bom) => bom.id === savedBom?.id) ?? linkedBoms[0]
  const verifiedProduct: ProductCreationGuideStepResult | undefined =
    productStatus === 'verified' && productQuery.data
      ? {
          ...savedProduct,
          id: productQuery.data.id,
          label: productQuery.data.name,
          code: productQuery.data.sku,
        }
      : undefined
  const verifiedBom: ProductCreationGuideStepResult | undefined =
    bomStatus === 'verified' && linkedBom
      ? {
          id: linkedBom.id,
          label:
            [linkedBom.bomNo, linkedBom.bomVersion]
              .filter(Boolean)
              .join(' / ') || linkedBom.id,
        }
      : undefined

  function retrySavedProductAndBomVerification() {
    if (productId && canViewProduct) void productQuery.refetch()
    if (productId && canViewBom) void linkedBomsQuery.refetch()
  }

  return {
    productStatus,
    bomStatus,
    verifiedProduct,
    verifiedBom,
    retrySavedProductAndBomVerification,
  }
}
