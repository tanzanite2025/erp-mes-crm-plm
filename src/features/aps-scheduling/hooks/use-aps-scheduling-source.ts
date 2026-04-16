import { useMemo } from 'react'
import { useProductionLinesQuery } from '@/features/production-shared/hooks/use-production-resources'
import { buildApsSchedulingSource } from '../adapters/aps-scheduling.adapter'
import { apsFallbackSource } from '../aps-source'
import type { ApsSchedulingSource } from '../adapters/aps-scheduling.adapter'

export function useApsSchedulingSource() {
  const query = useProductionLinesQuery({
    staleTime: 30_000,
    retry: 1,
    placeholderData: [],
  })

  const source: ApsSchedulingSource = useMemo(() => {
    return buildApsSchedulingSource({
      lines: query.data ?? [],
    })
  }, [query.data])

  return {
    source: query.data ? source : apsFallbackSource,
    isLoading: query.isLoading && !query.data,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
  }
}
