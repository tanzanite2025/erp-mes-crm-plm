import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { buildDeltaUpsertPayload } from '@/lib/delta/build-delta-upsert-payload'
import { type DeltaSet } from '@/lib/delta/types'
import { type Currency } from '../data/schema'

export type CreateCurrencyPayload = Omit<Currency, 'id' | 'version'>

export interface ExchangeRateSyncProviderConfig {
  id: string
  provider: string
  enabled: boolean
  priority: number
  apiBaseUrl: string
  apiKey: string
  latestPathTemplate: string
}

export interface ExchangeRateSyncConfig {
  enabled: boolean
  fallbackEnabled: boolean
  providers: ExchangeRateSyncProviderConfig[]
}

/**
 * CurrencyMaintenanceService: 币种维护服务
 * 职责：处理 POST/PATCH 以及外部汇率同步事务。
 */
export const CurrencyMaintenanceService = {
  /**
   * 保存/创建币种
   */
  async saveCurrency(data: CreateCurrencyPayload): Promise<Currency> {
    const res = await apiFetch<Currency>('/finance/currencies', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return ensureObjectResponse<Currency & Record<string, unknown>>(
      res,
      'CurrencyMaintenanceService.saveCurrency'
    ) as Currency
  },

  /**
   * 局部更新币种 (SDRTS 协议)
   */
  async patchCurrency(
    id: number,
    delta: DeltaSet,
    version: number
  ): Promise<Currency> {
    void version

    const res = await apiFetch<Currency>('/finance/currencies', {
      method: 'POST',
      body: JSON.stringify(buildDeltaUpsertPayload(id, delta)),
    })

    return ensureObjectResponse<Currency & Record<string, unknown>>(
      res,
      'CurrencyMaintenanceService.patchCurrency'
    ) as Currency
  },

  /**
   * 设置为基准币种
   */
  async setBaseCurrency(id: number): Promise<void> {
    await apiFetch(`/finance/currencies/${id}/set-base`, {
      method: 'POST',
    })
  },

  /**
   * 同步外部汇率
   */
  async syncCurrencies(): Promise<{ message: string; count: number }> {
    const res = await apiFetch<{ message: string; count: number }>(
      '/finance/currencies/sync',
      {
        method: 'POST',
      }
    )
    return ensureObjectResponse<
      { message: string; count: number } & Record<string, unknown>
    >(res, 'CurrencyMaintenanceService.syncCurrencies')
  },

  async getSyncConfig(): Promise<ExchangeRateSyncConfig> {
    const res = await apiFetch<ExchangeRateSyncConfig>(
      '/finance/currencies/sync-config'
    )
    return ensureObjectResponse<
      ExchangeRateSyncConfig & Record<string, unknown>
    >(res, 'CurrencyMaintenanceService.getSyncConfig') as ExchangeRateSyncConfig
  },

  async saveSyncConfig(
    config: ExchangeRateSyncConfig
  ): Promise<ExchangeRateSyncConfig> {
    const res = await apiFetch<ExchangeRateSyncConfig>(
      '/finance/currencies/sync-config',
      {
        method: 'POST',
        body: JSON.stringify(config),
      }
    )
    return ensureObjectResponse<
      ExchangeRateSyncConfig & Record<string, unknown>
    >(
      res,
      'CurrencyMaintenanceService.saveSyncConfig'
    ) as ExchangeRateSyncConfig
  },

  /**
   * 二次开发/系统初始化时使用的种子数据填充
   */
  async seedData(): Promise<void> {
    await apiFetch('/finance/seed', {
      method: 'POST',
    })
  },
}
