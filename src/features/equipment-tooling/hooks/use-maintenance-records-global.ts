import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DeltaSet } from '@/lib/delta/types'
import type { SaveMaintenanceRecordApiDTO } from '../contracts/maintenance-record-api-dto'
import {
  MaintenanceRecordService,
  type MaintenanceRecordFilters,
  type MaintenanceRecordPagination,
} from '../services/maintenance-record-service'

/**
 * Query key factory for global maintenance records queries
 * Ensures cache isolation based on filters and pagination
 */
export const MAINTENANCE_RECORDS_GLOBAL_QUERY_KEY = (
  filters?: MaintenanceRecordFilters,
  pagination?: MaintenanceRecordPagination
) => ['maintenanceRecords', 'global', filters, pagination] as const

/**
 * Query key for maintenance record statistics
 */
export const MAINTENANCE_RECORDS_STATS_QUERY_KEY = [
  'maintenanceRecords',
  'stats',
] as const

interface UseMaintenanceRecordsGlobalOptions {
  filters?: MaintenanceRecordFilters
  pagination?: MaintenanceRecordPagination
}

/**
 * Hook for managing maintenance records globally (across all assets)
 * Provides data fetching, statistics, and mutation operations with cache invalidation
 * Used by the independent maintenance center pages
 */
export function useMaintenanceRecordsGlobal(
  options: UseMaintenanceRecordsGlobalOptions = {}
) {
  const { filters, pagination } = options
  const queryClient = useQueryClient()
  const queryKey = MAINTENANCE_RECORDS_GLOBAL_QUERY_KEY(filters, pagination)

  // Query for fetching all records with filters and pagination
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: () => MaintenanceRecordService.getAll(filters, pagination),
  })

  const records = data?.records || []
  const total = data?.total || 0

  // Query for fetching statistics
  const {
    data: stats,
    isLoading: isLoadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: MAINTENANCE_RECORDS_STATS_QUERY_KEY,
    queryFn: () => MaintenanceRecordService.getStats(),
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (record: SaveMaintenanceRecordApiDTO) =>
      MaintenanceRecordService.create(record),
    onSuccess: () => {
      // Invalidate all global queries and stats
      queryClient.invalidateQueries({
        queryKey: ['maintenanceRecords', 'global'],
      })
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_RECORDS_STATS_QUERY_KEY,
      })
    },
  })

  // Patch mutation
  const patchMutation = useMutation({
    mutationFn: ({
      id,
      delta,
      version,
    }: {
      id: string
      delta: DeltaSet
      version: number
    }) => MaintenanceRecordService.patch(id, delta, version),
    onSuccess: () => {
      // Invalidate all global queries and stats
      queryClient.invalidateQueries({
        queryKey: ['maintenanceRecords', 'global'],
      })
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_RECORDS_STATS_QUERY_KEY,
      })
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => MaintenanceRecordService.delete(id),
    onSuccess: () => {
      // Invalidate all global queries and stats
      queryClient.invalidateQueries({
        queryKey: ['maintenanceRecords', 'global'],
      })
      queryClient.invalidateQueries({
        queryKey: MAINTENANCE_RECORDS_STATS_QUERY_KEY,
      })
    },
  })

  return {
    records,
    total,
    stats,
    isLoading,
    isLoadingStats,
    error,
    statsError,
    create: createMutation.mutateAsync,
    patch: patchMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    reload: refetch,
    reloadStats: refetchStats,
    isCreating: createMutation.isPending,
    isPatching: patchMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
