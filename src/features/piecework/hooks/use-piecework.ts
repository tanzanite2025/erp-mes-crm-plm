import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import { toast } from 'sonner'
import { Team } from '../data/schema'

// --- 生产班组 (Teams) ---

export function useGetTeams() {
    return useQuery({
        queryKey: ['piecework_teams'],
        queryFn: () => apiFetch<Team[]>('/piecework/teams')
    })
}

export function usePieceworkMutations() {
    const queryClient = useQueryClient()

    const saveTeamMutation = useMutation({
        mutationFn: (data: Partial<Team>) => apiFetch('/piecework/teams', { 
            method: 'POST', 
            body: JSON.stringify(data) 
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['piecework_teams'] })
            toast.success('班组数据已同步')
        },
        onError: (err: any) => {
            toast.error('保存班组失败: ' + err.message)
        }
    })

    const patchTeamMutation = useMutation({
        mutationFn: ({ id, delta, version }: { id: string, delta: any, version: number }) => 
            apiFetch(`/piecework/teams/${id}`, { 
                method: 'PATCH', 
                body: JSON.stringify({ delta, version }) 
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['piecework_teams'] })
            toast.success('班组差量更新已同步')
        },
        onError: (err: any) => {
            toast.error('同步班组差量失败: ' + err.message)
        }
    })

    const deleteTeamMutation = useMutation({
        mutationFn: (id: string) => apiFetch(`/piecework/teams/${id}`, { 
            method: 'DELETE' 
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['piecework_teams'] })
            toast.success('班组已移除')
        }
    })

    return { saveTeamMutation, patchTeamMutation, deleteTeamMutation }
}

// --- 工价标准 (Rates) ---

export function useGetPieceworkRates() {
    return useQuery({
        queryKey: ['piecework_rates'],
        queryFn: () => apiFetch<any[]>('/piecework/rates')
    })
}
