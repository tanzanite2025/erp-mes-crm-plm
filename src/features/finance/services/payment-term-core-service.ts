import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'
import { type PaymentTerm } from '../data/schema'

/**
 * PaymentTermCoreService: 只读结算方式服务
 */
export const PaymentTermCoreService = {
  /**
   * 获取所有结算方式列表
   */
  async getPaymentTerms(): Promise<PaymentTerm[]> {
    const res = await apiFetch<PaymentTerm[]>('/finance/payment-terms')
    return ensureArrayResponse<PaymentTerm>(res, 'PaymentTermCoreService.getPaymentTerms')
  },
}
