import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import {
  normalizeLinearBarcodeProtocolConfig,
  shouldNormalizeLinearBarcodeRules,
  type LinearBarcodeProtocolConfig,
} from '../data/linear-barcode-protocol'

export const linearBarcodeProtocolService = {
  async getConfig(): Promise<LinearBarcodeProtocolConfig> {
    const res = await apiFetch<LinearBarcodeProtocolConfig>(
      '/protocols/linear-barcode'
    )
    const config = ensureObjectResponse<
      LinearBarcodeProtocolConfig & Record<string, unknown>
    >(
      res,
      'LinearBarcodeProtocolService.getConfig'
    ) as LinearBarcodeProtocolConfig
    const normalized = normalizeLinearBarcodeProtocolConfig(config)

    if (shouldNormalizeLinearBarcodeRules(config.rules)) {
      return this.updateConfig(normalized)
    }

    return normalized
  },

  async updateConfig(
    config: LinearBarcodeProtocolConfig
  ): Promise<LinearBarcodeProtocolConfig> {
    const normalized = normalizeLinearBarcodeProtocolConfig(config)
    const res = await apiFetch<LinearBarcodeProtocolConfig>(
      '/protocols/linear-barcode',
      {
        method: 'POST',
        body: JSON.stringify(normalized),
      }
    )
    const saved = ensureObjectResponse<
      LinearBarcodeProtocolConfig & Record<string, unknown>
    >(
      res,
      'LinearBarcodeProtocolService.updateConfig'
    ) as LinearBarcodeProtocolConfig
    return normalizeLinearBarcodeProtocolConfig(saved)
  },
}
