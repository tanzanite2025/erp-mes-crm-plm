import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { StocktakeCoreService } from '../services/stocktake-core-service'
import { StocktakeMaintenanceService, type PDAScanPayload } from '../services/stocktake-maintenance-service'
import { toast } from 'sonner'

/**
 * useStocktake - 封装盘点任务的管理与同步逻辑情况情况总量针对。
 */
export function useStocktake() {
    const queryClient = useQueryClient()

    // 盘点任务列表
    const tasksQuery = useQuery({
        queryKey: ['stocktake_tasks'],
        queryFn: () => StocktakeCoreService.getTasks()
    })

    // 发起新盘点
    const createMutation = useMutation({
        mutationFn: (data: { title: string, warehouseCategoryCode: string, remarks?: string }) => 
            StocktakeMaintenanceService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stocktake_tasks'] })
            toast.success('盘点任务已发起情况情况总量针对。')
        },
        onError: (error: any) => {
            toast.error('发起盘点失败: ' + error.message)
        }
    })

    // PDA 扫描同步
    const pdaSyncMutation = useMutation({
        mutationFn: (data: PDAScanPayload) => StocktakeMaintenanceService.pdaSubmitScan(data),
        onSuccess: () => {
            toast.success('扫描数据已同步情况情况总量针对。')
        }
    })

    return {
        tasks: tasksQuery.data || [],
        isLoading: tasksQuery.isLoading,
        isError: tasksQuery.isError,
        refetch: tasksQuery.refetch,
        createStocktake: createMutation.mutateAsync,
        submitPdaScan: pdaSyncMutation.mutateAsync,
        isCreating: createMutation.isPending
    }
}

/**
 * useStocktakeItems - 封装特定任务的行项目查询逻辑情况情况总量针对。
 */
export function useStocktakeItems(taskId: string | null) {
    return useQuery({
        queryKey: ['stocktake_items', taskId],
        queryFn: () => taskId ? StocktakeCoreService.getItems(taskId) : Promise.resolve([]),
        enabled: !!taskId
    })
}
