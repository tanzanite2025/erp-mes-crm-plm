import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import type {
  ProductionMaterialIssuanceDocumentListQuery,
  ProductionMaterialIssuanceSourceSelection,
} from '../contracts/production-material-issuance-source-review-and-frozen-document-api-dto'
import { productionMaterialIssuanceCacheKeys } from '../data/production-material-issuance-query-and-explicit-command-cache-keys'
import {
  getProductionMaterialIssuanceDocument,
  listProductionMaterialIssuanceDocuments,
  reviewProductionMaterialIssuanceSources,
} from '../services/production-material-issuance-source-review-and-document-query-service'

export function useProductionMaterialIssuanceSourceReview() {
  return useMutation({
    mutationKey: [...productionMaterialIssuanceCacheKeys.root, 'source-review'],
    mutationFn: (sources: ProductionMaterialIssuanceSourceSelection[]) =>
      reviewProductionMaterialIssuanceSources(sources),
    retry: false,
  })
}

export function useProductionMaterialIssuanceDocumentList(
  query: ProductionMaterialIssuanceDocumentListQuery
) {
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  return useQuery({
    queryKey: [
      ...productionMaterialIssuanceCacheKeys.root,
      'documents',
      actorId,
      query,
    ],
    queryFn: ({ signal }) =>
      listProductionMaterialIssuanceDocuments(query, signal),
    retry: false,
  })
}

export function useProductionMaterialIssuanceDocumentDetail(
  documentID: string | null
) {
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  return useQuery({
    queryKey: productionMaterialIssuanceCacheKeys.document(actorId, documentID),
    queryFn: ({ signal }) => {
      if (!documentID)
        throw new Error(
          '[CRITICAL] Missing production material document identity'
        )
      return getProductionMaterialIssuanceDocument(documentID, signal)
    },
    enabled: documentID !== null,
    retry: false,
  })
}
