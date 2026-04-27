import { useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { type DeltaSet } from '@/lib/delta/types'
import { createLogger } from '@/lib/logger'
import { type CompositeReadResource, resolveQueryFailure } from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import {
  WarehouseCategoryCoreService,
  type WarehouseCategory,
  type WarehouseCategoryOption,
} from '../services/warehouse-category-core-service'
import { WarehouseCategoryMaintenanceService } from '../services/warehouse-category-maintenance-service'
import { warehouseQueryKeys } from '../../query-keys'

const logger = createLogger('useWarehouseCategory')

export type WarehouseCategoryListResource = CompositeReadResource<{
  categories: WarehouseCategory[]
}>

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

  const readResource = useMemo<WarehouseCategoryListResource>(() => {
    const failure = resolveQueryFailure({
      data: categoriesQuery.data,
      error: categoriesQuery.error,
      isPending: categoriesQuery.isPending,
      scope: 'useWarehouseCategory.categories',
      missingMessage: '[CRITICAL] Warehouse category list missing after load',
      failureMessage: '[CRITICAL] Warehouse category list query failed',
    })
    if (failure) {
      return {
        status: 'error',
        error: failure.error,
        scope: failure.scope,
      }
    }

    if (categoriesQuery.isPending) {
      return { status: 'loading' }
    }

    const categories = categoriesQuery.data
    if (!categories) {
      return {
        status: 'error',
        error: new Error('[CRITICAL] Warehouse category list missing after load'),
        scope: 'useWarehouseCategory.categories',
      }
    }

    return {
      status: 'ready',
      categories,
    }
  }, [categoriesQuery.data, categoriesQuery.error, categoriesQuery.isPending])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    logger.error(`Failed to load warehouse category list: ${readResource.scope}`, readResource.error)
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  const categories = readResource.status === 'ready' ? readResource.categories : []

  return {
    readResource,
    categories,
    isLoading: readResource.status === 'loading',
    error: readResource.status === 'error' ? readResource.error : null,
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
