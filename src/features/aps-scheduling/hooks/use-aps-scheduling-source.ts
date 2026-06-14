import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useProductionLinesQuery } from '@/features/production-shared/hooks/use-production-resources'
import {
  buildApsSchedulingSource,
  type ApsSchedulingSource,
} from '../adapters/aps-scheduling.adapter'
import { apsFallbackSource } from '../aps-source'
import { getApsScheduling } from '../services/aps-scheduling-service'

const APS_SCHEDULING_BOARD_QUERY_KEY = ['aps-scheduling', 'board'] as const

export function useApsSchedulingSource() {
  const linesQuery = useProductionLinesQuery({
    staleTime: 30_000,
    retry: 1,
  })
  const jobsQuery = useQuery({
    queryKey: APS_SCHEDULING_BOARD_QUERY_KEY,
    queryFn: () => getApsScheduling(),
    staleTime: 30_000,
    retry: 1,
  })

  const source: ApsSchedulingSource = useMemo(() => {
    return buildApsSchedulingSource({
      lines: linesQuery.data ?? [],
      jobs: jobsQuery.data?.jobs ?? [],
      lanes: jobsQuery.data?.lanes,
      stageCards: jobsQuery.data?.stageCards,
      timelineSlots: jobsQuery.data?.timelineSlots,
    })
  }, [jobsQuery.data, linesQuery.data])

  const hasResolvedSource =
    linesQuery.data !== undefined || jobsQuery.data !== undefined

  return {
    source: hasResolvedSource ? source : apsFallbackSource,
    isLoading:
      (linesQuery.isLoading || jobsQuery.isLoading) && !hasResolvedSource,
    error: linesQuery.error ?? jobsQuery.error,
    isFetching: linesQuery.isFetching || jobsQuery.isFetching,
    refetch: async () => {
      await Promise.all([linesQuery.refetch(), jobsQuery.refetch()])
    },
    isFallback: !hasResolvedSource,
  }
}
