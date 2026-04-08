import { apiFetch } from '@/lib/api-client'
import { type Team, type PieceworkRate } from '../data/schema'

/**
 * PieceworkMaintenanceService - 专门负责计件模块的维护与写入逻辑 (SDRTS 协议集成)情况情况总量。
 */
export const PieceworkMaintenanceService = {
    // --- 班组维护 (Team Maintenance) ---
    saveTeam: async (data: Partial<Team>): Promise<void> => {
        await apiFetch('/piecework/teams', { 
            method: 'POST', 
            body: JSON.stringify(data) 
        })
    },

    patchTeam: async (params: { id: string, delta: any, version: number }): Promise<void> => {
        const { id, delta, version } = params
        await apiFetch(`/piecework/teams/${id}`, { 
            method: 'PATCH', 
            body: JSON.stringify({ delta, version }) 
        })
    },

    deleteTeam: async (id: string): Promise<void> => {
        await apiFetch(`/piecework/teams/${id}`, { 
            method: 'DELETE' 
        })
    },

    // --- 工价维护 (Rate Maintenance) ---
    saveRate: async (data: Partial<PieceworkRate>): Promise<void> => {
        await apiFetch('/piecework/rates', { 
            method: 'POST', 
            body: JSON.stringify(data) 
        })
    },

    patchRate: async (params: { id: string, delta: any, version: number }): Promise<void> => {
        const { id, delta, version } = params
        await apiFetch(`/piecework/rates/${id}`, { 
            method: 'PATCH', 
            body: JSON.stringify({ delta, version }) 
        })
    },

    deleteRate: async (id: string): Promise<void> => {
        await apiFetch(`/piecework/rates/${id}`, { 
            method: 'DELETE' 
        })
    }
}
