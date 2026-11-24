import type {
  QualityStandardsListSearchState,
  QualityStandardsStatusFilter,
} from '../types/quality-standards-list'
import { useGetQualityStandards } from './use-quality'

type SearchStateUpdater = (
  prev: QualityStandardsListSearchState
) => Partial<QualityStandardsListSearchState>

interface UseQualityStandardsMgmtParams {
  search: QualityStandardsListSearchState
  navigate: (options: { search: SearchStateUpdater; replace?: boolean }) => void
}

export function useQualityStandardsMgmt({
  search,
  navigate,
}: UseQualityStandardsMgmtParams) {
  const page = search.page
  const pageSize = search.pageSize
  const statusFilter = search.status

  const { data, error, isLoading, isFetching, refetch } =
    useGetQualityStandards({
      page,
      pageSize,
      status: statusFilter,
      keyword: search.keyword,
    })

  const standards = data?.items || []
  const total = data?.total || 0
  const stats = data?.metadata?.stats

  const handleSearchChange = (value: string) => {
    navigate({
      replace: true,
      search: (prev) => ({
        ...prev,
        keyword: value.trim(),
        page: 1,
      }),
    })
  }

  const handleStatusFilterChange = (value: QualityStandardsStatusFilter) => {
    navigate({
      search: (prev) => ({
        ...prev,
        status: value,
        page: 1,
      }),
    })
  }

  const handlePageChange = (value: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        page: value,
      }),
    })
  }

  const handlePageSizeChange = (value: number) => {
    navigate({
      search: (prev) => ({
        ...prev,
        pageSize: value,
        page: 1,
      }),
    })
  }

  const hasActiveFilters = Boolean(search.keyword) || statusFilter !== 'ALL'

  return {
    standards,
    total,
    stats,
    isLoading,
    isFetching,
    refetch,
    hasLoadedStandards: Boolean(data),
    error,
    page,
    pageSize,
    statusFilter,
    searchQuery: search.keyword,
    hasActiveFilters,
    setSearchQuery: handleSearchChange,
    setStatusFilter: handleStatusFilterChange,
    setPage: handlePageChange,
    setPageSize: handlePageSizeChange,
  }
}
