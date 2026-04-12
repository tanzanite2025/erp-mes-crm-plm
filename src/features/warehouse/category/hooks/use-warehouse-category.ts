import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import {
  WarehouseCategoryCoreService,
  type WarehouseCategory,
  type WarehouseCategoryOption,
} from '../services/warehouse-category-core-service'
import { WarehouseCategoryMaintenanceService } from '../services/warehouse-category-maintenance-service'
import { warehouseQueryKeys } from '../../query-keys'

export function useWarehouseCategory() {
  const queryClient = useQueryClient()

  const categoriesQuery = useQuery({
    queryKey: warehouseQueryKeys.categoryList(),
    queryFn: () => WarehouseCategoryCoreService.getCategoryList()
  })

  const createMutation = useMutation({
    mutationFn: (data: Omit<WarehouseCategory, 'id' | 'version'>) =>
      WarehouseCategoryMaintenanceService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.categoryList() })
      queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.categoryOptions() })
      toast.success('Warehouse category created')
    }
  })

  const patchMutation = useMutation({
    mutationFn: (params: { id: string, delta: DeltaSet, version: number }) =>
      WarehouseCategoryMaintenanceService.patchCategory(params.id, params.delta, params.version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.categoryList() })
      queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.categoryOptions() })
      toast.success('Warehouse category updated')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => WarehouseCategoryMaintenanceService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.categoryList() })
      queryClient.invalidateQueries({ queryKey: warehouseQueryKeys.categoryOptions() })
      toast.success('Warehouse category deleted')
    }
  })

  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    error: categoriesQuery.error,
    refetch: categoriesQuery.refetch,
    createCategory: createMutation.mutateAsync,
    patchCategory: patchMutation.mutateAsync,
    deleteCategory: deleteMutation.mutateAsync,
    isActionLoading: createMutation.isPending || patchMutation.isPending || deleteMutation.isPending
  }
}

export function useWarehouseCategoryOptions() {
  return useQuery({
    queryKey: warehouseQueryKeys.categoryOptions(),
    queryFn: (): Promise<WarehouseCategoryOption[]> => WarehouseCategoryCoreService.getCategoryOptions()
  })
}
