import { useRef, useState } from 'react'
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { isApiClientError } from '@/lib/api-error'
import { warehouseQueryKeys } from '@/features/warehouse/query-keys'
import type {
  ProductionMaterialIssuanceWarehouseCommand,
  ProductionMaterialIssuanceWarehouseCommandResult,
  ProductionMaterialIssuanceMaterialBatchRequest,
} from '../contracts/production-material-issuance-warehouse-review-batch-availability-and-confirmed-movement-api-dto'
import { productionMaterialIssuanceCacheKeys } from '../data/production-material-issuance-query-and-explicit-command-cache-keys'
import {
  getProductionMaterialIssuanceWarehouseReview,
  getProductionMaterialIssuanceMaterialBatchAvailability,
  confirmProductionMaterialIssuanceWarehouseMovement,
} from '../services/production-material-issuance-warehouse-review-batches-suggestions-and-explicit-confirmation-service'

export function useProductionMaterialIssuanceWarehouseReview(
  documentId: string
) {
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  return useQuery({
    queryKey: [
      ...productionMaterialIssuanceCacheKeys.root,
      'warehouse-review',
      actorId,
      documentId,
    ],
    queryFn: ({ signal }) =>
      getProductionMaterialIssuanceWarehouseReview(documentId, signal),
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useProductionMaterialIssuanceMaterialBatchAvailability(
  request: ProductionMaterialIssuanceMaterialBatchRequest | null
) {
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  return useQuery({
    queryKey: [
      ...productionMaterialIssuanceCacheKeys.root,
      'material-batches',
      actorId,
      request,
    ],
    queryFn: ({ signal }) => {
      if (!request)
        throw new Error('[CRITICAL] Missing material batch query scope')
      return getProductionMaterialIssuanceMaterialBatchAvailability(
        request,
        signal
      )
    },
    enabled: request !== null,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function isProductionMaterialIssuanceWarehouseCommandExplicitlyRejected(
  error: Error | null | undefined
) {
  return Boolean(
    error &&
    isApiClientError(error) &&
    error.kind === 'http' &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500
  )
}

/** One unfinished command per actor/document survives closing or refreshing its
 * panel in this QueryClient session, including when the document version changes. */
export function useProductionMaterialIssuanceWarehouseExplicitConfirmation(
  documentId: string
) {
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  const queryClient = useQueryClient()
  const mutationKey = productionMaterialIssuanceCacheKeys.explicitCommand(
    actorId,
    'warehouse-movement',
    documentId
  )
  const [commandId, setCommandId] = useState<string | null>(() => {
    const entries = queryClient
      .getMutationCache()
      .findAll({ mutationKey, exact: true })
    const latest = entries[entries.length - 1]
    return latest && latest.state.status !== 'success'
      ? ((
          latest.state.variables as
            | ProductionMaterialIssuanceWarehouseCommand
            | undefined
        )?.commandId ?? null)
      : null
  })
  const entries = useMutationState({
    filters: { mutationKey, exact: true },
    select: (entry) => ({
      request: entry.state.variables as
        | ProductionMaterialIssuanceWarehouseCommand
        | undefined,
      status: entry.state.status,
      data: entry.state.data as
        | ProductionMaterialIssuanceWarehouseCommandResult
        | undefined,
      error: entry.state.error,
    }),
  })
  const matching = entries.filter(
    (entry) => entry.request?.commandId === commandId
  )
  const current = matching[matching.length - 1]
  const prepared = useRef<
    ProductionMaterialIssuanceWarehouseCommand | undefined
  >(current?.request)
  const submitting = useRef(false)
  const mutation = useMutation({
    mutationKey,
    mutationFn: (request: ProductionMaterialIssuanceWarehouseCommand) =>
      confirmProductionMaterialIssuanceWarehouseMovement(request, actorId),
    retry: false,
    networkMode: 'always',
    gcTime: Infinity,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: productionMaterialIssuanceCacheKeys.root,
      })
      for (const queryKey of [
        warehouseQueryKeys.all(),
        warehouseQueryKeys.inventoryList(),
        warehouseQueryKeys.inventoryValuation(),
        warehouseQueryKeys.inventoryAlertSummary(),
      ])
        void queryClient.invalidateQueries({ queryKey })
    },
    onSettled: () => {
      submitting.current = false
    },
  })
  const submitWarehouseConfirmation = (
    payload?: Omit<ProductionMaterialIssuanceWarehouseCommand, 'commandId'>
  ) => {
    if (
      !actorId ||
      submitting.current ||
      current?.status === 'pending' ||
      current?.status === 'success'
    )
      return
    if (!prepared.current) {
      if (!payload) return
      prepared.current = structuredClone({
        ...payload,
        commandId: globalThis.crypto.randomUUID(),
      })
      setCommandId(prepared.current.commandId)
    }
    submitting.current = true
    mutation.mutate(prepared.current)
  }
  const startAnotherExplicitWarehouseConfirmation = () => {
    if (
      submitting.current ||
      (current?.status !== 'success' &&
        !isProductionMaterialIssuanceWarehouseCommandExplicitlyRejected(
          current?.error
        ))
    )
      return
    // Explicitly acknowledging a settled request retires every retry attempt.
    // Otherwise its last rejected attempt would be restored on the next mount.
    const mutationCache = queryClient.getMutationCache()
    for (const entry of mutationCache.findAll({ mutationKey, exact: true })) {
      if (
        (
          entry.state.variables as
            | ProductionMaterialIssuanceWarehouseCommand
            | undefined
        )?.commandId === commandId
      )
        mutationCache.remove(entry)
    }
    mutation.reset()
    prepared.current = undefined
    setCommandId(null)
    void queryClient.invalidateQueries({
      queryKey: productionMaterialIssuanceCacheKeys.root,
    })
  }
  return {
    current,
    submitWarehouseConfirmation,
    startAnotherExplicitWarehouseConfirmation,
  }
}
