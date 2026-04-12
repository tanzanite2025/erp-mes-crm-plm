import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { StorageService } from '@/features/system-mgmt/services/storage-service'

const VISIBLE_SEGMENTS_KEY = 'xdfc_dashboard_visible_segments'
const VISIBLE_SEGMENTS_QUERY_KEY = ['dashboard', 'visible-segments'] as const

export function useVisibleDashboardSegments(segmentIds: string[]) {
  const queryClient = useQueryClient()
  const query = useQuery<string[] | null>({
    queryKey: VISIBLE_SEGMENTS_QUERY_KEY,
    queryFn: () => StorageService.getItem<string[]>(VISIBLE_SEGMENTS_KEY),
    initialData: null,
  })

  useEffect(() => {
    if (query.data !== null || segmentIds.length === 0) {
      return
    }

    const defaults = segmentIds.slice(0, 5)
    void StorageService.setItem(VISIBLE_SEGMENTS_KEY, defaults).then(() => {
      queryClient.setQueryData(VISIBLE_SEGMENTS_QUERY_KEY, defaults)
    })
  }, [query.data, queryClient, segmentIds])

  const visibleSegmentIds = query.data ?? []

  const saveVisibleSegmentIds = async (ids: string[]) => {
    await StorageService.setItem(VISIBLE_SEGMENTS_KEY, ids)
    queryClient.setQueryData(VISIBLE_SEGMENTS_QUERY_KEY, ids)
  }

  return {
    visibleSegmentIds,
    saveVisibleSegmentIds,
    isLoadingVisibleSegmentIds: query.isLoading,
  }
}
