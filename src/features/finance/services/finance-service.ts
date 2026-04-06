import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'

export interface Currency {
  id?: number
  code: string
  name: string
  symbol: string
  rate: number
  precision: number
  status: 'Active' | 'Inactive'
  isBase: boolean
}

export interface PaymentTerm {
  id?: number
  code: string
  name: string
  description: string
  installments?: string // JSON string
  isDefault: boolean
  status: 'Active' | 'Inactive'
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
