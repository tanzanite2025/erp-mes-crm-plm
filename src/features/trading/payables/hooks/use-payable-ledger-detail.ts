import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import { createLogger } from '@/lib/logger'
import { type ReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import type { CreatePaymentRecordApiDTO } from '../contracts/payable-api-dto'
import { createPaymentRecord, getPayableLedgerDetail } from '../services/payable-ledger-detail-service'

const logger = createLogger('usePayableLedgerDetail')

export type PayableLedgerDetailReadResource =
  | { status: 'idle' }
  | ReadResource<Awaited<ReturnType<typeof getPayableLedgerDetail>>>

export function usePayableLedgerDetail(id: string | null) {
  const query = useQuery({
    queryKey: tradingQueryKeys.payableDetail(id ?? 'pending'),
    queryFn: () => getPayableLedgerDetail(id as string),
    enabled: Boolean(id),
  })

  const readResource = useMemo<PayableLedgerDetailReadResource>(() => {
    if (!id) {
      return { status: 'idle' }
    }

    const failure = resolveQueryFailure({
      data: query.data,
      error: query.error,
      isPending: query.isPending,
      scope: 'usePayableLedgerDetail.detail',
      missingMessage: '[CRITICAL] Payable ledger detail missing after load',
      failureMessage: '[CRITICAL] Payable ledger detail query failed',
    })
    if (failure) {
      return {
        status: 'error',
        error: failure.error,
        scope: failure.scope,
      }
    }

    if (query.isPending) {
      return { status: 'loading' }
    }

    return {
      status: 'ready',
      data: query.data as Awaited<ReturnType<typeof getPayableLedgerDetail>>,
    }
  }, [id, query.data, query.error, query.isPending])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    logger.error(`Failed to load payable ledger detail: ${readResource.scope}`, readResource.error)
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isPending: query.isPending,
    refetch: query.refetch,
    readResource,
    retryRead: query.refetch,
  }
}

export function useCreatePaymentRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CreatePaymentRecordApiDTO }) =>
      createPaymentRecord(id, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: tradingQueryKeys.payables() }),
        queryClient.invalidateQueries({ queryKey: tradingQueryKeys.payableDetail(variables.id) }),
      ])
    },
  })
}
