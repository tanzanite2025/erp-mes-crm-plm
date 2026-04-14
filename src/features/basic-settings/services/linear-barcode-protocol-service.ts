import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type LinearBarcodeProtocolConfig } from '../data/linear-barcode-protocol'

export const linearBarcodeProtocolService = {
  async getConfig(): Promise<LinearBarcodeProtocolConfig> {
    const res = await apiFetch<LinearBarcodeProtocolConfig>('/protocols/linear-barcode')
    return ensureObjectResponse<LinearBarcodeProtocolConfig & Record<string, unknown>>(res, 'LinearBarcodeProtocolService.getConfig') as LinearBarcodeProtocolConfig
  },

  async updateConfig(config: LinearBarcodeProtocolConfig): Promise<LinearBarcodeProtocolConfig> {
    const res = await apiFetch<LinearBarcodeProtocolConfig>('/protocols/linear-barcode', {
      method: 'POST',
      body: JSON.stringify(config),
    })
    return ensureObjectResponse<LinearBarcodeProtocolConfig & Record<string, unknown>>(res, 'LinearBarcodeProtocolService.updateConfig') as LinearBarcodeProtocolConfig
  },
}
