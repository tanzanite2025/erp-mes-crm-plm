import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  buildApsSchedulingSource,
  type ApsSchedulingSource,
} from '../adapters/aps-scheduling.adapter'
import { apsFallbackSource } from '../aps-source'
import { getApsScheduling } from '../services/aps-scheduling-service'

const APS_SCHEDULING_BOARD_QUERY_KEY = ['aps-scheduling', 'board'] as const

export function useApsSchedulingSource() {
  const jobsQuery = useQuery({
    queryKey: APS_SCHEDULING_BOARD_QUERY_KEY,
    queryFn: () => getApsScheduling(),
    staleTime: 30_000,
    retry: 1,
  })

  const source: ApsSchedulingSource = useMemo(() => {
    return buildApsSchedulingSource({
      jobs: jobsQuery.data?.jobs ?? [],
      lanes: jobsQuery.data?.lanes,
      stageCards: jobsQuery.data?.stageCards,
      timelineSlots: jobsQuery.data?.timelineSlots,
    })
  }, [jobsQuery.data])

  const hasResolvedSource = jobsQuery.data !== undefined

  return {
    source: hasResolvedSource ? source : apsFallbackSource,
    isLoading: jobsQuery.isLoading && !hasResolvedSource,
    error: jobsQuery.error,
    isFetching: jobsQuery.isFetching,
    refetch: async () => {
      await jobsQuery.refetch()
    },
    isFallback: !hasResolvedSource,
  }
}
