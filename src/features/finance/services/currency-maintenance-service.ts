import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaSet, type DeltaPayload } from '@/lib/delta/types'
import { type Currency } from '../data/schema'

/**
 * CurrencyMaintenanceService: 币种维护服务
 * 职责：处理 POST/PATCH 以及外部汇率同步事务。
 */
export const CurrencyMaintenanceService = {
  /**
   * 保存/创建币种
   */
  async saveCurrency(data: Partial<Currency>): Promise<Currency> {
    const res = await apiFetch<Currency>('/finance/currencies', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return ensureObjectResponse<Currency & Record<string, unknown>>(res, 'CurrencyMaintenanceService.saveCurrency') as Currency
  },

  /**
   * 局部更新币种 (SDRTS 协议)
   */
  async patchCurrency(id: number, delta: DeltaSet, version: number): Promise<Currency> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id: String(id), version }
    };

    const res = await apiFetch<Currency>(`/finance/currencies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    
    return ensureObjectResponse<Currency & Record<string, unknown>>(res, 'CurrencyMaintenanceService.patchCurrency') as Currency
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
    const res = await apiFetch<{ message: string; count: number }>('/finance/currencies/sync', {
      method: 'POST',
    })
    return ensureObjectResponse<{ message: string; count: number } & Record<string, unknown>>(res, 'CurrencyMaintenanceService.syncCurrencies')
  },

  /**
   * 二次开发/系统初始化时使用的种子数据填充
   */
  async seedData(): Promise<void> {
    await apiFetch('/finance/seed', {
      method: 'POST',
    })
  }
}
