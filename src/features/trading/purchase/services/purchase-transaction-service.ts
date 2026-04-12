import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaSet } from '@/lib/delta/types'
import { type PurchaseOrder, type PurchaseOrderLine } from '../../data/schema'
import { toConfirmPurchaseReceiptContract, toPurchaseOrderContract, type ConfirmPurchaseReceiptContract } from '../adapters/purchase-order-api-adapter'
import { type ConfirmPurchaseReceiptResponseApiDTO, type PurchaseOrderApiDTO } from '../contracts/purchase-order-api-dto'

export const PURCHASE_TRANSACTION_INTENT_ORDER_SAVE = 'ORDER_SAVE'
export const PURCHASE_TRANSACTION_INTENT_DELIVERY_DATE_CHANGE = 'ORDER_DELIVERY_DATE_CHANGE'
export const PURCHASE_TRANSACTION_INTENT_SUPPLIER_CHANGE = 'ORDER_SUPPLIER_CHANGE'
export const PURCHASE_TRANSACTION_INTENT_ORDER_LINE_ADD = 'ORDER_LINE_ADD'
export const PURCHASE_TRANSACTION_INTENT_ORDER_LINE_REMOVE = 'ORDER_LINE_REMOVE'
export const PURCHASE_TRANSACTION_INTENT_ORDER_LINE_CONTENT_CHANGE = 'ORDER_LINE_CONTENT_CHANGE'
export const PURCHASE_TRANSACTION_INTENT_RECEIPT_CONFIRM = 'PURCHASE_CONFIRM'

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

export interface PurchaseOrderSupplierChangePayload {
  supplierId: string
  supplierName: string
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

export interface PurchaseOrderSavePayload {
  delta: DeltaSet
  finalData: PurchaseOrder
  operator: string
}

export interface ConfirmPurchaseReceiptLinePayload {
  purchaseOrderLineId: number
  orderLineVersion: number
  materialId: string
  quantity: number
  purchasePrice: number
  batchNo: string
  targetCategory: string
}

export interface ConfirmPurchaseReceiptPayload {
  operator?: string
  remarks?: string
  receiptDate?: string
  lines: ConfirmPurchaseReceiptLinePayload[]
}

export interface PurchaseOrderReceiptConfirmPayload {
  operator: string
  remarks?: string
  receiptDate?: string
  lines: ConfirmPurchaseReceiptLinePayload[]
}

export const executePurchaseOrderTransaction = async <TPayload>(
  orderId: string,
  request: PurchaseOrderTransactionRequest<TPayload>
): Promise<PurchaseOrder> => {
  const res = await apiFetch<PurchaseOrderApiDTO>(`/purchase/orders/${orderId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return toPurchaseOrderContract(
    ensureObjectResponse<PurchaseOrderApiDTO & Record<string, unknown>>(
      res,
      'PurchaseTransactionService.executePurchaseOrderTransaction'
    ) as PurchaseOrderApiDTO
  )
}

export const executePurchaseOrderReceiptConfirmation = async (
  orderId: string,
  params: {
    operator: string
    remarks?: string
    receiptDate?: string
    lines: ConfirmPurchaseReceiptLinePayload[]
    actorId?: string
    expectedVersion: number
  }
): Promise<ConfirmPurchaseReceiptContract> => {
  const res = await apiFetch<ConfirmPurchaseReceiptResponseApiDTO>(`/purchase/orders/${orderId}/transactions`, {
    method: 'POST',
    body: JSON.stringify({
      intent: PURCHASE_TRANSACTION_INTENT_RECEIPT_CONFIRM,
      actorId: params.actorId,
      expectedVersion: params.expectedVersion,
      payload: {
        operator: params.operator,
        remarks: params.remarks,
        receiptDate: params.receiptDate,
        lines: params.lines,
      },
    }),
  })

  return toConfirmPurchaseReceiptContract(
    ensureObjectResponse<ConfirmPurchaseReceiptResponseApiDTO & Record<string, unknown>>(
      res,
      'PurchaseTransactionService.executePurchaseOrderReceiptConfirmation'
    ) as ConfirmPurchaseReceiptResponseApiDTO
  )
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

export const savePurchaseOrder = async (
  orderId: string,
  params: {
    delta: DeltaSet
    finalData: PurchaseOrder
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<PurchaseOrder> => {
  return executePurchaseOrderTransaction<PurchaseOrderSavePayload>(orderId, {
    intent: PURCHASE_TRANSACTION_INTENT_ORDER_SAVE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      delta: params.delta,
      finalData: params.finalData,
      operator: params.operator,
    },
  })
}

export const changePurchaseOrderSupplier = async (
  orderId: string,
  params: {
    supplierId: string
    supplierName: string
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<PurchaseOrder> => {
  return executePurchaseOrderTransaction<PurchaseOrderSupplierChangePayload>(orderId, {
    intent: PURCHASE_TRANSACTION_INTENT_SUPPLIER_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      supplierId: params.supplierId,
      supplierName: params.supplierName,
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

export const purchaseOrderTransactionCore = {
  executePurchaseOrderTransaction,
}

export const purchaseOrderHeaderTransactions = {
  savePurchaseOrder,
  changePurchaseOrderExpectedDate,
  changePurchaseOrderSupplier,
}

export const purchaseOrderLineTransactions = {
  changePurchaseOrderLineAdd,
  changePurchaseOrderLineRemove,
  changePurchaseOrderLineContent,
}
