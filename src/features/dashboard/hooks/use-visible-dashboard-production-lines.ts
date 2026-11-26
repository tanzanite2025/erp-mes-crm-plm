import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { StorageService } from '@/features/system-mgmt/services/storage-service'

const VISIBLE_PRODUCTION_LINES_KEY = 'xdfc_dashboard_visible_production_lines'
const VISIBLE_PRODUCTION_LINES_QUERY_KEY = [
  'dashboard',
  'visible-production-lines',
] as const
const EMPTY_VISIBLE_PRODUCTION_LINE_IDS: string[] = []

export function useVisibleDashboardProductionLines(
  productionLineIds: string[]
) {
  const queryClient = useQueryClient()
  const query = useQuery<string[] | null>({
    queryKey: VISIBLE_PRODUCTION_LINES_QUERY_KEY,
    queryFn: () =>
      StorageService.getItem<string[]>(VISIBLE_PRODUCTION_LINES_KEY),
    initialData: null,
  })

  useEffect(() => {
    if (query.data !== null || productionLineIds.length === 0) {
      return
    }

    const defaults = productionLineIds.slice(0, 5)
    void StorageService.setItem(VISIBLE_PRODUCTION_LINES_KEY, defaults).then(
      () =>
        queryClient.setQueryData(VISIBLE_PRODUCTION_LINES_QUERY_KEY, defaults)
    )
  }, [productionLineIds, query.data, queryClient])

  const visibleLineIds = query.data ?? EMPTY_VISIBLE_PRODUCTION_LINE_IDS

  const saveVisibleLineIds = async (ids: string[]) => {
    await StorageService.setItem(VISIBLE_PRODUCTION_LINES_KEY, ids)
    queryClient.setQueryData(VISIBLE_PRODUCTION_LINES_QUERY_KEY, ids)
  }

  return {
    visibleLineIds,
    saveVisibleLineIds,
    isLoadingVisibleLineIds: query.isLoading,
  }
}
