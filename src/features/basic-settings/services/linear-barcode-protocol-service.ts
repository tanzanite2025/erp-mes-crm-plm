import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { createLogger } from '@/lib/logger'
import {
  createDefaultLinearBarcodeProtocolConfig,
  type LinearBarcodeProtocolConfig,
} from '../data/linear-barcode-protocol'

const logger = createLogger('LinearBarcodeProtocolService')

export const linearBarcodeProtocolService = {
  async getConfig(): Promise<LinearBarcodeProtocolConfig> {
    try {
      const res = await apiFetch<LinearBarcodeProtocolConfig>('/protocols/linear-barcode')
      return ensureObjectResponse<LinearBarcodeProtocolConfig & Record<string, unknown>>(res, 'LinearBarcodeProtocolService.getConfig') as LinearBarcodeProtocolConfig
    } catch (error) {
      logger.error('Failed to load protocol config', error)
      return createDefaultLinearBarcodeProtocolConfig()
    }
  },

  async updateConfig(config: LinearBarcodeProtocolConfig): Promise<LinearBarcodeProtocolConfig> {
    const res = await apiFetch<LinearBarcodeProtocolConfig>('/protocols/linear-barcode', {
      method: 'POST',
      body: JSON.stringify(config),
    })
    return ensureObjectResponse<LinearBarcodeProtocolConfig & Record<string, unknown>>(res, 'LinearBarcodeProtocolService.updateConfig') as LinearBarcodeProtocolConfig
  },
}
