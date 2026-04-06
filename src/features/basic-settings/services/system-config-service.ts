import { apiFetch } from '@/lib/api-client'

export interface SystemConfig {
    key: string
    value: string
    label: string
    description?: string
}

export const systemConfigService = {
    getConfigs: async (): Promise<SystemConfig[]> => {
        return apiFetch<SystemConfig[]>('/system/configs')
    },

    updateConfig: async (config: SystemConfig): Promise<SystemConfig> => {
        return apiFetch<SystemConfig>('/system/configs', {
            method: 'POST',
            body: JSON.stringify(config)
        })
    }
}
