import { useRef, useState } from 'react'
import {
  useMutation,
  useMutationState,
  useQueryClient,
} from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import type {
  ProductionMaterialIssuanceDispatchCommand,
  ProductionMaterialIssuanceWithdrawalCommand,
} from '../contracts/production-material-issuance-reviewed-dispatch-and-versioned-withdrawal-command-api-dto'
import type { ProductionMaterialIssuanceReviewedSourceBasis } from '../contracts/production-material-issuance-source-review-and-frozen-document-api-dto'
import { productionMaterialIssuanceCacheKeys } from '../data/production-material-issuance-query-and-explicit-command-cache-keys'
import {
  dispatchProductionMaterialIssuanceReviewedBasis,
  withdrawProductionMaterialIssuanceDocumentWithVersion,
} from '../services/production-material-issuance-reviewed-dispatch-and-versioned-withdrawal-command-service'

type ProductionMaterialIssuanceCommandResult = Awaited<
  ReturnType<typeof dispatchProductionMaterialIssuanceReviewedBasis>
>

/** Retains an unfinished request in this QueryClient session; never auto-replays it. */
function useProductionMaterialIssuanceExplicitCommandWithStableRetryRequest<
  TRequest extends { commandId: string },
>(
  intent: 'dispatch' | 'withdraw',
  scope: string,
  executeCommand: (
    request: TRequest
  ) => Promise<ProductionMaterialIssuanceCommandResult>
) {
  const queryClient = useQueryClient()
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  const mutationKey = productionMaterialIssuanceCacheKeys.explicitCommand(
    actorId,
    intent,
    scope
  )
  const [commandId, setCommandId] = useState<string | null>(() => {
    const entries = queryClient
      .getMutationCache()
      .findAll({ mutationKey, exact: true })
    const latest = entries[entries.length - 1]
    return latest && latest.state.status !== 'success'
      ? ((latest.state.variables as TRequest | undefined)?.commandId ?? null)
      : null
  })
  const entries = useMutationState({
    filters: { mutationKey, exact: true },
    select: (entry) => ({
      request: entry.state.variables as TRequest | undefined,
      status: entry.state.status,
      data: entry.state.data as
        | ProductionMaterialIssuanceCommandResult
        | undefined,
      error: entry.state.error,
    }),
  })
  const matchingEntries = entries.filter(
    (entry) => entry.request?.commandId === commandId
  )
  const current = matchingEntries[matchingEntries.length - 1]
  const preparedRequest = useRef<TRequest | undefined>(current?.request)
  const isSubmitting = useRef(false)
  const mutation = useMutation({
    mutationKey,
    mutationFn: executeCommand,
    retry: false,
    networkMode: 'always',
    // Preserve unfinished variables across component unmounts until the session is cleared.
    gcTime: Infinity,
    onSuccess: (result) => {
      queryClient.setQueryData(
        productionMaterialIssuanceCacheKeys.document(
          actorId,
          result.document.id
        ),
        result
      )
      void queryClient.invalidateQueries({
        queryKey: productionMaterialIssuanceCacheKeys.root,
      })
    },
    onSettled: () => {
      isSubmitting.current = false
    },
  })
  const submitProductionMaterialIssuanceExplicitCommand = (
    payload: Omit<TRequest, 'commandId'>
  ) => {
    if (
      !actorId ||
      isSubmitting.current ||
      current?.status === 'pending' ||
      current?.status === 'success'
    )
      return
    if (!preparedRequest.current) {
      preparedRequest.current = {
        ...payload,
        commandId: globalThis.crypto.randomUUID(),
      } as TRequest
      setCommandId(preparedRequest.current.commandId)
    }
    isSubmitting.current = true
    mutation.mutate(preparedRequest.current)
  }
  return {
    current,
    actorId,
    submitProductionMaterialIssuanceExplicitCommand,
  }
}

export function useProductionMaterialIssuanceReviewedBasisDispatch(
  sources: ProductionMaterialIssuanceReviewedSourceBasis[]
) {
  const expectations = sources
    .map((source) => ({
      salesOrderId: source.salesOrderId,
      salesOrderLineId: source.salesOrderLineId,
      bomId: source.bom.id,
      expectedOrderVersion: source.orderVersion,
      expectedBomVersion: source.bom.version,
      basisFingerprint: source.basisFingerprint,
    }))
    .sort((left, right) => left.salesOrderLineId - right.salesOrderLineId)
  const command =
    useProductionMaterialIssuanceExplicitCommandWithStableRetryRequest<ProductionMaterialIssuanceDispatchCommand>(
      'dispatch',
      JSON.stringify(expectations),
      dispatchProductionMaterialIssuanceReviewedBasis
    )
  return {
    ...command,
    dispatchReviewedProductionMaterialIssuanceBasis: () =>
      command.submitProductionMaterialIssuanceExplicitCommand({
        sources: expectations,
      }),
  }
}

export function useProductionMaterialIssuanceVersionedWithdrawal(
  documentId: string,
  expectedVersion: number
) {
  const command =
    useProductionMaterialIssuanceExplicitCommandWithStableRetryRequest<ProductionMaterialIssuanceWithdrawalCommand>(
      'withdraw',
      `${documentId}/${expectedVersion}`,
      withdrawProductionMaterialIssuanceDocumentWithVersion
    )
  return {
    ...command,
    withdrawProductionMaterialIssuanceDocument: (reason: string) =>
      command.submitProductionMaterialIssuanceExplicitCommand({
        documentId,
        expectedVersion,
        reason: reason.trim(),
      }),
  }
}
