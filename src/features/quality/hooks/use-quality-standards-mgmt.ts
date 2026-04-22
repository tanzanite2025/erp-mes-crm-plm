import type {
  QualityStandardsListStats,
  QualityStandardsListSearchState,
  QualityStandardsStatusFilter,
  QualityStandardsTypeFilter,
} from '../types/quality-standards-list'
import { useGetQualityStandards } from './use-quality'

const DEFAULT_STATUS_STATS: QualityStandardsListStats = {
  total: 0,
  published: 0,
  draft: 0,
  archived: 0,
}

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
  const typeFilter = search.type
  const statusFilter = search.status

  const { data, error, isLoading, isFetching } = useGetQualityStandards({
    page,
    pageSize,
    type: typeFilter,
    status: statusFilter,
    keyword: search.keyword,
  })

  const standards = data?.items || []
  const total = data?.total || 0
  const stats = data?.metadata?.stats ?? DEFAULT_STATUS_STATS

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

  const handleTypeFilterChange = (value: QualityStandardsTypeFilter) => {
    navigate({
      search: (prev) => ({
        ...prev,
        type: value,
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

  const hasActiveFilters =
    Boolean(search.keyword) || typeFilter !== 'ALL' || statusFilter !== 'ALL'

  return {
    standards,
    total,
    stats,
    isLoading,
    isFetching,
    error,
    page,
    pageSize,
    typeFilter,
    statusFilter,
    searchQuery: search.keyword,
    hasActiveFilters,
    setSearchQuery: handleSearchChange,
    setTypeFilter: handleTypeFilterChange,
    setStatusFilter: handleStatusFilterChange,
    setPage: handlePageChange,
    setPageSize: handlePageSizeChange,
  }
}
