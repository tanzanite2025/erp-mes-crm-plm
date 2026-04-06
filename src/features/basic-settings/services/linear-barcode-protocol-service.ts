import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import {
  createDefaultLinearBarcodeProtocolConfig,
  type LinearBarcodeProtocolConfig,
} from '../data/linear-barcode-protocol'

const logger = createLogger('LinearBarcodeProtocolService')

export const linearBarcodeProtocolService = {
  async getConfig(): Promise<LinearBarcodeProtocolConfig> {
    try {
      return await apiFetch<LinearBarcodeProtocolConfig>('/protocols/linear-barcode')
    } catch (error) {
      logger.error('Failed to load protocol config', error)
      return createDefaultLinearBarcodeProtocolConfig()
    }
  },

  async updateConfig(config: LinearBarcodeProtocolConfig): Promise<LinearBarcodeProtocolConfig> {
    return apiFetch<LinearBarcodeProtocolConfig>('/protocols/linear-barcode', {
      method: 'POST',
      body: JSON.stringify(config),
    })
  },
}
