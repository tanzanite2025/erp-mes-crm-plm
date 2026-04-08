import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type PurchaseOrder, type PurchaseOrderLine } from '../../data/schema'

export const PURCHASE_TRANSACTION_INTENT_DELIVERY_DATE_CHANGE = 'ORDER_DELIVERY_DATE_CHANGE'
export const PURCHASE_TRANSACTION_INTENT_ORDER_LINE_ADD = 'ORDER_LINE_ADD'
export const PURCHASE_TRANSACTION_INTENT_ORDER_LINE_REMOVE = 'ORDER_LINE_REMOVE'
export const PURCHASE_TRANSACTION_INTENT_ORDER_LINE_CONTENT_CHANGE = 'ORDER_LINE_CONTENT_CHANGE'

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

export interface PurchaseOrderLineContentChangePayload {
  lines: PurchaseOrderLine[]
  operator: string
}

export interface PurchaseOrderLineAddPayload {
  lines: PurchaseOrderLine[]
  operator: string
}

export interface PurchaseOrderLineRemovePayload {
  lines: PurchaseOrderLine[]
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

export const changePurchaseOrderLineAdd = async (
  orderId: string,
  params: {
    lines: PurchaseOrderLine[]
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<PurchaseOrder> => {
  return executePurchaseOrderTransaction<PurchaseOrderLineAddPayload>(orderId, {
    intent: PURCHASE_TRANSACTION_INTENT_ORDER_LINE_ADD,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      lines: params.lines,
      operator: params.operator,
    },
  })
}

export const changePurchaseOrderLineRemove = async (
  orderId: string,
  params: {
    lines: PurchaseOrderLine[]
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<PurchaseOrder> => {
  return executePurchaseOrderTransaction<PurchaseOrderLineRemovePayload>(orderId, {
    intent: PURCHASE_TRANSACTION_INTENT_ORDER_LINE_REMOVE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      lines: params.lines,
      operator: params.operator,
    },
  })
}

export const changePurchaseOrderLineContent = async (
  orderId: string,
  params: {
    lines: PurchaseOrderLine[]
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<PurchaseOrder> => {
  return executePurchaseOrderTransaction<PurchaseOrderLineContentChangePayload>(orderId, {
    intent: PURCHASE_TRANSACTION_INTENT_ORDER_LINE_CONTENT_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      lines: params.lines,
      operator: params.operator,
    },
  })
}
