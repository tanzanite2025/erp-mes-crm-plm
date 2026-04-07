import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaSet, type DeltaPayload } from '@/lib/delta/types'

export interface Currency {
  id?: number
  code: string
  name: string
  symbol: string
  rate: number
  precision: number
  status: 'Active' | 'Inactive'
  isBase: boolean
  version: number // SDRTS 乐观锁
}

export interface PaymentTerm {
  id?: number
  code: string
  name: string
  description: string
  installments?: string // JSON string
  isDefault: boolean
  status: 'Active' | 'Inactive'
  version: number // SDRTS 乐观锁
}

export const financeService = {
  // 币种管理
  getCurrencies: async () => {
    const res = await apiFetch<Currency[]>('/finance/currencies')
    return ensureArrayResponse<Currency>(res, 'FinanceService.getCurrencies')
  },
  saveCurrency: async (data: Currency) => {
    const res = await apiFetch<Currency>('/finance/currencies', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return ensureObjectResponse<Currency & Record<string, unknown>>(res, 'FinanceService.saveCurrency') as Currency
  },
  /**
   * 局部更新币种 (SDRTS 协议)
   */
  patchCurrency: async (id: number, delta: DeltaSet, version: number): Promise<Currency> => {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id: String(id), version }
    };

    return apiFetch<Currency>(`/finance/currencies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
  setBaseCurrency: async (id: number) => {
    return apiFetch<{ message: string }>(`/finance/currencies/${id}/set-base`, {
      method: 'POST',
    })
  },

  // 结算方式管理
  getPaymentTerms: async () => {
    const res = await apiFetch<PaymentTerm[]>('/finance/payment-terms')
    return ensureArrayResponse<PaymentTerm>(res, 'FinanceService.getPaymentTerms')
  },
  savePaymentTerm: async (data: PaymentTerm) => {
    const res = await apiFetch<PaymentTerm>('/finance/payment-terms', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return ensureObjectResponse<PaymentTerm & Record<string, unknown>>(res, 'FinanceService.savePaymentTerm') as PaymentTerm
  },
  /**
   * 局部更新结算方式 (SDRTS 协议)
   */
  patchPaymentTerm: async (id: number, delta: DeltaSet, version: number): Promise<PaymentTerm> => {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id: String(id), version }
    };

    return apiFetch<PaymentTerm>(`/finance/payment-terms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  // 种子数据初始化
  seedData: async () => {
    return apiFetch<{ message: string }>('/finance/seed', {
      method: 'POST',
    })
  },

  // 外部汇率同步 (对接 ExchangeRate-API)
  syncCurrencies: async () => {
    return apiFetch<{ message: string; count: number }>('/finance/currencies/sync', {
      method: 'POST',
    })
  }
}
