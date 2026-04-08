import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WarehouseCategoryCoreService, type WarehouseCategory } from '../services/warehouse-category-core-service'
import { WarehouseCategoryMaintenanceService } from '../services/warehouse-category-maintenance-service'
import { toast } from 'sonner'

/**
 * useWarehouseCategory - 封装仓库分类的业务逻辑情况情况总量针对。
 */
export function useWarehouseCategory() {
    const queryClient = useQueryClient()

    // 查询逻辑情况下。情况总量情况情况情况情况。
    const categoriesQuery = useQuery({
        queryKey: ['warehouse_categories'],
        queryFn: () => WarehouseCategoryCoreService.getCategories()
    })

    // 写入逻辑 (Mutation)
    const createMutation = useMutation({
        mutationFn: (data: Omit<WarehouseCategory, 'id' | 'version'>) => 
            WarehouseCategoryMaintenanceService.createCategory(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouse_categories'] })
            toast.success('仓库分类已创建情况情况总量针对。')
        }
    })

    const patchMutation = useMutation({
        mutationFn: (params: { id: string, delta: any, version: number }) => 
            WarehouseCategoryMaintenanceService.patchCategory(params.id, params.delta, params.version),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouse_categories'] })
            toast.success('分类变更已保存情况情况总量针对。')
        }
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => WarehouseCategoryMaintenanceService.deleteCategory(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['warehouse_categories'] })
            toast.success('分类已物理移除情况情况总量针对。')
        }
    })

    return {
        categories: categoriesQuery.data || [],
        isLoading: categoriesQuery.isLoading,
        isError: categoriesQuery.isError,
        refetch: categoriesQuery.refetch,
        createCategory: createMutation.mutateAsync,
        patchCategory: patchMutation.mutateAsync,
        deleteCategory: deleteMutation.mutateAsync,
        isActionLoading: createMutation.isPending || patchMutation.isPending || deleteMutation.isPending
    }
}
