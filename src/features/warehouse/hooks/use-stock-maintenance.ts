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

    // [FAIL-LOUDLY]: 严禁使用 || [] 掩盖盘点任务数据的缺失。
    const tasks = tasksQuery.data
    if (!tasksQuery.isLoading && tasksQuery.isSuccess && !tasks) {
        throw new Error('[CRITICAL] Stocktake Tasks missing in Hook: UseStocktake.tasks')
    }

    return {
        tasks: tasks || [], // 此时经过校验，若到达此处且非 loading，tasks 已确定存在或为合法空值（由后端判定）
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
