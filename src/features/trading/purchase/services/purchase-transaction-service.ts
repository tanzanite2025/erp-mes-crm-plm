import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type PurchaseOrder } from '../../data/schema'

export const PURCHASE_TRANSACTION_INTENT_DELIVERY_DATE_CHANGE = 'ORDER_DELIVERY_DATE_CHANGE'

export interface PurchaseOrderTransactionRequest<TPayload> {
  intent: string
  actorId?: string
  expectedVersion: number
  payload: TPayload
}

export interface PurchaseOrderExpectedDateChangePayload {
  expectedDate: string
  operator: string
}

export const executePurchaseOrderTransaction = async <TPayload>(
  orderId: string,
  request: PurchaseOrderTransactionRequest<TPayload>
): Promise<PurchaseOrder> => {
  const res = await apiFetch<PurchaseOrder>(`/purchase/orders/${orderId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return ensureObjectResponse<PurchaseOrder & Record<string, unknown>>(
    res,
    'PurchaseTransactionService.executePurchaseOrderTransaction'
  ) as PurchaseOrder
}

export const changePurchaseOrderExpectedDate = async (
  orderId: string,
  params: {
    expectedDate: string
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<PurchaseOrder> => {
  return executePurchaseOrderTransaction<PurchaseOrderExpectedDateChangePayload>(orderId, {
    intent: PURCHASE_TRANSACTION_INTENT_DELIVERY_DATE_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      expectedDate: params.expectedDate,
      operator: params.operator,
    },
  })
}
