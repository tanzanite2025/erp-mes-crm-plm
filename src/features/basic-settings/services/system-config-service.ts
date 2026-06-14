import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'

export interface SystemConfig {
  key: string
  value: string
  label: string
  description?: string
}

export const systemConfigService = {
  getConfigs: async (): Promise<SystemConfig[]> => {
    const res = await apiFetch<SystemConfig[]>('/system/configs')
    return ensureArrayResponse<SystemConfig>(
      res,
      'SystemConfigService.getConfigs'
    )
  },

  updateConfig: async (config: SystemConfig): Promise<SystemConfig> => {
    const res = await apiFetch<SystemConfig>('/system/configs', {
      method: 'POST',
      body: JSON.stringify(config),
    })
    return ensureObjectResponse<SystemConfig & Record<string, unknown>>(
      res,
      'SystemConfigService.updateConfig'
    ) as SystemConfig
  },
}
