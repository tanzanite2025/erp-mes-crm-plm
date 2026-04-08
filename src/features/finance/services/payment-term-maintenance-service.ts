import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaSet, type DeltaPayload } from '@/lib/delta/types'
import { type PaymentTerm } from '../data/schema'

/**
 * PaymentTermMaintenanceService: 结算方式维护服务
 */
export const PaymentTermMaintenanceService = {
  /**
   * 保存/创建结算方式
   */
  async savePaymentTerm(data: Partial<PaymentTerm>): Promise<PaymentTerm> {
    const res = await apiFetch<PaymentTerm>('/finance/payment-terms', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return ensureObjectResponse<PaymentTerm & Record<string, unknown>>(res, 'PaymentTermMaintenanceService.savePaymentTerm') as PaymentTerm
  },

  /**
   * 局部更新结算方式 (SDRTS 协议)
   */
  async patchPaymentTerm(id: number, delta: DeltaSet, version: number): Promise<PaymentTerm> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id: String(id), version }
    };

    const res = await apiFetch<PaymentTerm>(`/finance/payment-terms/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });

    return ensureObjectResponse<PaymentTerm & Record<string, unknown>>(res, 'PaymentTermMaintenanceService.patchPaymentTerm') as PaymentTerm
  },
}
