import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MaintenanceRecordService } from '../services/maintenance-record-service';
import type { SaveMaintenanceRecordApiDTO } from '../contracts/maintenance-record-api-dto';
import type { DeltaSet } from '@/lib/delta/types';

/**
 * Query key factory for maintenance records by asset
 * Ensures cache isolation per (assetType, assetId) pair
 */
export const MAINTENANCE_RECORDS_QUERY_KEY = (
  assetType: string,
  assetId: string
) => ['maintenanceRecords', assetType, assetId] as const;

interface UseMaintenanceRecordsOptions {
  assetType: 'MOLD' | 'FURNACE';
  assetId: string;
}

/**
 * Hook for managing maintenance records for a specific asset
 * Provides data fetching and mutation operations with cache invalidation
 */
export function useMaintenanceRecords({
  assetType,
  assetId,
}: UseMaintenanceRecordsOptions) {
  const queryClient = useQueryClient();
  const queryKey = MAINTENANCE_RECORDS_QUERY_KEY(assetType, assetId);

  // Query for fetching records
  const {
    data: records = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => MaintenanceRecordService.getByAsset(assetType, assetId),
    enabled: !!assetId, // Only fetch when assetId is available
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (record: SaveMaintenanceRecordApiDTO) =>
      MaintenanceRecordService.create(record),
    onSuccess: () => {
      // Invalidate only this asset's cache
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Patch mutation
  const patchMutation = useMutation({
    mutationFn: ({
      id,
      delta,
      version,
    }: {
      id: string;
      delta: DeltaSet;
      version: number;
    }) => MaintenanceRecordService.patch(id, delta, version),
    onSuccess: () => {
      // Invalidate only this asset's cache
      queryClient.invalidateQueries({ queryKey });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => MaintenanceRecordService.delete(id),
    onSuccess: () => {
      // Invalidate only this asset's cache
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    records,
    isLoading,
    error,
    create: createMutation.mutateAsync,
    patch: patchMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    reload: refetch,
    isCreating: createMutation.isPending,
    isPatching: patchMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
