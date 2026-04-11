import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import { type PaymentMethod } from '../data/schema'

export const PaymentMethodCoreService = {
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const res = await apiFetch<PaymentMethod[]>('/finance/payment-methods')
    return ensureArrayResponse<PaymentMethod>(res, 'PaymentMethodCoreService.getPaymentMethods')
  },
}
