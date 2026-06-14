import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import { type Currency } from '../data/schema'

/**
 * CurrencyCoreService: 只读币种服务
 * 职责：获取币种列表、详情及状态查询。
 */
export const CurrencyCoreService = {
  /**
   * 获取所有币种列表
   */
  async getCurrencies(): Promise<Currency[]> {
    const res = await apiFetch<Currency[]>('/finance/currencies')
    return ensureArrayResponse<Currency>(
      res,
      'CurrencyCoreService.getCurrencies'
    )
  },

  /**
   * 获取基准币种 (Base Currency)
   */
  async getBaseCurrency(): Promise<Currency | undefined> {
    const currencies = await this.getCurrencies()
    return currencies.find((c) => c.isBase)
  },
}
