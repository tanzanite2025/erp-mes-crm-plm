import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { buildVersionedPatchMetadata } from '@/lib/version-guard'
import { type PaymentMethod } from '../data/schema'

const PAYMENT_METHOD_PATCH_INTENT_SAVE = 'PAYMENT_METHOD_PATCH_SAVE'

export const PaymentMethodMaintenanceService = {
  async savePaymentMethod(
    data: Partial<PaymentMethod>
  ): Promise<PaymentMethod> {
    const res = await apiFetch<PaymentMethod>('/finance/payment-methods', {
      method: 'POST',
      body: JSON.stringify(data),
    })

    return ensureObjectResponse<PaymentMethod & Record<string, unknown>>(
      res,
      'PaymentMethodMaintenanceService.savePaymentMethod'
    ) as PaymentMethod
  },

  async patchPaymentMethod(
    id: number,
    delta: DeltaSet,
    version: number
  ): Promise<PaymentMethod> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: buildVersionedPatchMetadata(
        String(id),
        version,
        'PaymentMethodMaintenanceService.patchPaymentMethod',
        {
          intent: PAYMENT_METHOD_PATCH_INTENT_SAVE,
        }
      ),
    }

    const res = await apiFetch<PaymentMethod>(
      `/finance/payment-methods/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    )

    return ensureObjectResponse<PaymentMethod & Record<string, unknown>>(
      res,
      'PaymentMethodMaintenanceService.patchPaymentMethod'
    ) as PaymentMethod
  },
}
