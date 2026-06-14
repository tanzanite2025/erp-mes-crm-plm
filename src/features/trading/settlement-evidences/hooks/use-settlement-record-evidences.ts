import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { type ReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import type { CreateSettlementRecordEvidenceApiDTO } from '../contracts/settlement-evidence-api-dto'
import {
  createSettlementRecordEvidence,
  deleteSettlementRecordEvidence,
  getSettlementRecordEvidences,
  type SettlementRecordEvidenceType,
} from '../services/settlement-evidence-service'

const logger = createLogger('useSettlementRecordEvidences')

export type SettlementRecordEvidencesReadResource =
  | { status: 'idle' }
  | ReadResource<Awaited<ReturnType<typeof getSettlementRecordEvidences>>>

export function useSettlementRecordEvidences(
  type: SettlementRecordEvidenceType,
  recordId: string | null
) {
  const query = useQuery({
    queryKey: tradingQueryKeys.settlementRecordEvidences(
      type,
      recordId ?? 'pending'
    ),
    queryFn: () => getSettlementRecordEvidences(type, recordId as string),
    enabled: Boolean(recordId),
  })

  const readResource = useMemo<SettlementRecordEvidencesReadResource>(() => {
    if (!recordId) {
      return { status: 'idle' }
    }

    const failure = resolveQueryFailure({
      data: query.data,
      error: query.error,
      isPending: query.isPending,
      scope: 'useSettlementRecordEvidences.evidences',
      missingMessage:
        '[CRITICAL] Settlement record evidences missing after load',
      failureMessage: '[CRITICAL] Settlement record evidences query failed',
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
      data: query.data as Awaited<
        ReturnType<typeof getSettlementRecordEvidences>
      >,
    }
  }, [query.data, query.error, query.isPending, recordId])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to load settlement record evidences: ${readResource.scope}`,
      readResource.error
    )
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  return {
    data: query.data,
    error: query.error,
    isLoading: query.isLoading,
    isError: query.isError,
    isPending: query.isPending,
    refetch: query.refetch,
    readResource,
    retryRead: query.refetch,
  }
}

export function useCreateSettlementRecordEvidence(
  type: SettlementRecordEvidenceType
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      recordId,
      payload,
    }: {
      recordId: string
      payload: CreateSettlementRecordEvidenceApiDTO
    }) => createSettlementRecordEvidence(type, recordId, payload),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.settlementRecordEvidences(
          type,
          variables.recordId
        ),
      })
    },
  })
}

export function useDeleteSettlementRecordEvidence(
  type: SettlementRecordEvidenceType
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      recordId,
      evidenceId,
    }: {
      recordId: string
      evidenceId: string
    }) => deleteSettlementRecordEvidence(type, recordId, evidenceId),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.settlementRecordEvidences(
          type,
          variables.recordId
        ),
      })
    },
  })
}
