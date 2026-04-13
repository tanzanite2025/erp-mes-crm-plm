import { apiFetch } from '@/lib/api-client'
import type { DeltaPayload, DeltaSet } from '@/lib/delta/types'

export type PatchQuotePayload = {
  id: string
  amount: number
  requirements: string
  previousAmount: number
  previousRequirements: string
}

export async function patchQuote(payload: PatchQuotePayload) {
  const delta: DeltaSet = {
    amount: { o: payload.previousAmount, n: payload.amount },
    requirements: { o: payload.previousRequirements, n: payload.requirements },
  }

  const body: DeltaPayload = {
    op: 'PATCH',
    delta,
    metadata: {
      id: payload.id,
    },
  }

  return apiFetch(`/sales-orders/${payload.id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
