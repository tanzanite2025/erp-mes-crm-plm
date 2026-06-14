import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { type ReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import type { CreateReceiptRecordApiDTO } from '../contracts/receivable-api-dto'
import { receivableQueryKeys } from '../query-keys'
import {
  createReceiptRecord,
  getReceivableLedgerDetail,
} from '../services/receivable-ledger-detail-service'

const logger = createLogger('useReceivableLedgerDetail')

export type ReceivableLedgerDetailReadResource =
  | { status: 'idle' }
  | ReadResource<Awaited<ReturnType<typeof getReceivableLedgerDetail>>>

export function useReceivableLedgerDetail(id: string | null) {
  const query = useQuery({
    queryKey: receivableQueryKeys.receivableDetail(id ?? 'pending'),
    queryFn: () => getReceivableLedgerDetail(id as string),
    enabled: Boolean(id),
  })

  const readResource = useMemo<ReceivableLedgerDetailReadResource>(() => {
    if (!id) {
      return { status: 'idle' }
    }

    const failure = resolveQueryFailure({
      data: query.data,
      error: query.error,
      isPending: query.isPending,
      scope: 'useReceivableLedgerDetail.detail',
      missingMessage: '[CRITICAL] Receivable ledger detail missing after load',
      failureMessage: '[CRITICAL] Receivable ledger detail query failed',
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
      data: query.data as Awaited<ReturnType<typeof getReceivableLedgerDetail>>,
    }
  }, [id, query.data, query.error, query.isPending])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to load receivable ledger detail: ${readResource.scope}`,
      readResource.error
    )
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

export function useCreateReceiptRecord() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: CreateReceiptRecordApiDTO
    }) => createReceiptRecord(id, payload),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: receivableQueryKeys.receivables(),
        }),
        queryClient.invalidateQueries({
          queryKey: receivableQueryKeys.receivableDetail(variables.id),
        }),
      ])
    },
  })
}
