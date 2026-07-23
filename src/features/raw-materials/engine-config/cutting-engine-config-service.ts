import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { normalizeCuttingEngineConfig, type CuttingEngineConfig } from './types'

export const cuttingEngineConfigService = {
  async getConfig(): Promise<CuttingEngineConfig> {
    const res = await apiFetch<CuttingEngineConfig>(
      '/raw-materials-engine/config'
    )
    const config = ensureObjectResponse<
      CuttingEngineConfig & Record<string, unknown>
    >(res, 'CuttingEngineConfigService.getConfig') as CuttingEngineConfig
    return normalizeCuttingEngineConfig(config)
  },

  async updateConfig(
    config: CuttingEngineConfig
  ): Promise<CuttingEngineConfig> {
    const normalized = normalizeCuttingEngineConfig(config)
    const res = await apiFetch<CuttingEngineConfig>(
      '/raw-materials-engine/config',
      {
        method: 'POST',
        body: JSON.stringify(normalized),
      }
    )
    const saved = ensureObjectResponse<
      CuttingEngineConfig & Record<string, unknown>
    >(res, 'CuttingEngineConfigService.updateConfig') as CuttingEngineConfig
    return normalizeCuttingEngineConfig(saved)
  },
}
