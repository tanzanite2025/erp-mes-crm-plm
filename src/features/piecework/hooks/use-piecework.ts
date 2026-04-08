import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Team, PieceworkRate } from '../data/schema'
import { PieceworkCoreService } from '../services/piecework-core-service'
import { PieceworkMaintenanceService } from '../services/piecework-maintenance-service'

// --- 生产班组 (Teams) ---

export function useGetTeams() {
    return useQuery({
        queryKey: ['piecework_teams'],
        queryFn: () => PieceworkCoreService.getTeams()
    })
}

export function usePieceworkMutations() {
    const queryClient = useQueryClient()

    const saveTeamMutation = useMutation({
        mutationFn: (data: Partial<Team>) => PieceworkMaintenanceService.saveTeam(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['piecework_teams'] })
            toast.success('班组数据已同步')
        },
        onError: (err: any) => {
            toast.error('保存班组失败: ' + err.message)
        }
    })

    const patchTeamMutation = useMutation({
        mutationFn: (params: { id: string, delta: any, version: number }) => 
            PieceworkMaintenanceService.patchTeam(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['piecework_teams'] })
            toast.success('班组差量更新已同步')
        },
        onError: (err: any) => {
            toast.error('同步班组差量失败: ' + err.message)
        }
    })

    const deleteTeamMutation = useMutation({
        mutationFn: (id: string) => PieceworkMaintenanceService.deleteTeam(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['piecework_teams'] })
            toast.success('班组已移除')
        }
    })

    return { saveTeamMutation, patchTeamMutation, deleteTeamMutation }
}

// --- 计件工价规则 (Piecework Rates/Rules) ---

export function useGetPieceworkRates() {
    return useQuery({
        queryKey: ['piecework_rates'],
        queryFn: () => PieceworkCoreService.getPieceworkRates()
    })
}

export function usePieceworkRateMutations() {
    const queryClient = useQueryClient()

    const saveRateMutation = useMutation({
        mutationFn: (data: Partial<PieceworkRate>) => PieceworkMaintenanceService.saveRate(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['piecework_rates'] })
            toast.success('计件工价已更新')
        },
        onError: (err: any) => {
            toast.error('保存工价失败: ' + err.message)
        }
    })

    const patchRateMutation = useMutation({
        mutationFn: (params: { id: string, delta: any, version: number }) => 
            PieceworkMaintenanceService.patchRate(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['piecework_rates'] })
            toast.success('工价差量同步成功')
        },
        onError: (err: any) => {
            toast.error('工价差量同步失败: ' + err.message)
        }
    })

    const deleteRateMutation = useMutation({
        mutationFn: (id: string) => PieceworkMaintenanceService.deleteRate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['piecework_rates'] })
            toast.success('工价项已移除')
        }
    })

    return { saveRateMutation, patchRateMutation, deleteRateMutation }
}
