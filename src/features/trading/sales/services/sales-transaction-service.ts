import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type SalesOrder, type SalesOrderLine } from '../../data/schema'
import { toSalesOrderContract } from '../adapters/sales-order-api-adapter'
import { type SalesOrderApiDTO } from '../contracts/sales-order-api-dto'

export const SALES_TRANSACTION_INTENT_CLASSIFICATION_TYPE_CHANGE = 'ORDER_CLASSIFICATION_TYPE_CHANGE'
export const SALES_TRANSACTION_INTENT_CUSTOMER_CHANGE = 'ORDER_CUSTOMER_CHANGE'
export const SALES_TRANSACTION_INTENT_DELIVERY_DATE_CHANGE = 'ORDER_DELIVERY_DATE_CHANGE'
export const SALES_TRANSACTION_INTENT_NAME_CHANGE = 'ORDER_NAME_CHANGE'
export const SALES_TRANSACTION_INTENT_PURCHASE_ORDER_NO_CHANGE = 'ORDER_PURCHASE_ORDER_NO_CHANGE'
export const SALES_TRANSACTION_INTENT_REQUIREMENTS_CHANGE = 'ORDER_REQUIREMENTS_CHANGE'
export const SALES_TRANSACTION_INTENT_ORDER_LINE_ADD = 'ORDER_LINE_ADD'
export const SALES_TRANSACTION_INTENT_ORDER_LINE_REMOVE = 'ORDER_LINE_REMOVE'
export const SALES_TRANSACTION_INTENT_ORDER_LINE_CONTENT_CHANGE = 'ORDER_LINE_CONTENT_CHANGE'
export const SALES_TRANSACTION_INTENT_ORDER_LINES_CHANGE = 'ORDER_LINES_CHANGE'
export const SALES_TRANSACTION_INTENT_ORDER_LINE_CLAIM = 'ORDER_LINE_CLAIM'
export const SALES_TRANSACTION_INTENT_ORDER_CANCEL = 'ORDER_CANCEL'
export const SALES_TRANSACTION_INTENT_STATUS_TRANSITION = 'ORDER_STATUS_TRANSITION'

export interface SalesOrderTransactionRequest<TPayload> {
  intent: string
  actorId?: string
  expectedVersion: number
  payload: TPayload
}

export interface SalesOrderLineClaimPayload {
  lineNos: number[]
  operator: string
}

export interface SalesOrderCustomerChangePayload {
  customerId?: string
  customerName: string
  operator: string
}

export interface SalesOrderClassificationTypeChangePayload {
  classification?: string
  type?: string
  barcode?: string
  operator: string
}

export interface SalesOrderDeliveryDateChangePayload {
  deliveryDate: string
  operator: string
}

export interface SalesOrderNameChangePayload {
  orderName: string
  operator: string
}

export interface SalesOrderPurchaseOrderNoChangePayload {
  purchaseOrderNo: string
  operator: string
}

export interface SalesOrderRequirementsChangePayload {
  requirements: string
  operator: string
}

export interface SalesOrderLinesChangePayload {
  lines: SalesOrderLine[]
  operator: string
}

export interface SalesOrderLineContentChangePayload {
  lines: SalesOrderLine[]
  operator: string
}

export interface SalesOrderLineAddPayload {
  lines: SalesOrderLine[]
  operator: string
}

export interface SalesOrderLineRemovePayload {
  lines: SalesOrderLine[]
  operator: string
}

export interface SalesOrderStatusTransitionPayload {
  status: string
  statusNote?: string
  operator: string
}

export interface SalesOrderCancelPayload {
  operator: string
  reason?: string
}

export const executeSalesOrderTransaction = async <TPayload>(
  orderId: string,
  request: SalesOrderTransactionRequest<TPayload>
): Promise<SalesOrder> => {
  const res = await apiFetch<SalesOrderApiDTO>(`/sales-orders/${orderId}/transactions`, {
    method: 'POST',
    body: JSON.stringify(request),
  })
  return toSalesOrderContract(
    ensureObjectResponse<SalesOrderApiDTO & Record<string, unknown>>(
      res,
      'SalesTransactionService.executeSalesOrderTransaction'
    ) as SalesOrderApiDTO
  )
}

export const claimSalesOrderLines = async (
  orderId: string,
  params: {
    lineNos: number[]
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<SalesOrder> => {
  return executeSalesOrderTransaction<SalesOrderLineClaimPayload>(orderId, {
    intent: SALES_TRANSACTION_INTENT_ORDER_LINE_CLAIM,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      lineNos: params.lineNos,
      operator: params.operator,
    },
  })
}

export const changeSalesOrderCustomer = async (
  orderId: string,
  params: {
    customerId?: string
    customerName: string
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<SalesOrder> => {
  return executeSalesOrderTransaction<SalesOrderCustomerChangePayload>(orderId, {
    intent: SALES_TRANSACTION_INTENT_CUSTOMER_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      customerId: params.customerId,
      customerName: params.customerName,
      operator: params.operator,
    },
  })
}

export const changeSalesOrderClassificationType = async (
  orderId: string,
  params: {
    classification?: string
    type?: string
    barcode?: string
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<SalesOrder> => {
  return executeSalesOrderTransaction<SalesOrderClassificationTypeChangePayload>(orderId, {
    intent: SALES_TRANSACTION_INTENT_CLASSIFICATION_TYPE_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      classification: params.classification,
      type: params.type,
      barcode: params.barcode,
      operator: params.operator,
    },
  })
}

export const changeSalesOrderDeliveryDate = async (
  orderId: string,
  params: {
    deliveryDate: string
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<SalesOrder> => {
  return executeSalesOrderTransaction<SalesOrderDeliveryDateChangePayload>(orderId, {
    intent: SALES_TRANSACTION_INTENT_DELIVERY_DATE_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      deliveryDate: params.deliveryDate,
      operator: params.operator,
    },
  })
}

export const changeSalesOrderName = async (
  orderId: string,
  params: {
    orderName: string
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<SalesOrder> => {
  return executeSalesOrderTransaction<SalesOrderNameChangePayload>(orderId, {
    intent: SALES_TRANSACTION_INTENT_NAME_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      orderName: params.orderName,
      operator: params.operator,
    },
  })
}

export const changeSalesOrderPurchaseOrderNo = async (
  orderId: string,
  params: {
    purchaseOrderNo: string
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<SalesOrder> => {
  return executeSalesOrderTransaction<SalesOrderPurchaseOrderNoChangePayload>(orderId, {
    intent: SALES_TRANSACTION_INTENT_PURCHASE_ORDER_NO_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      purchaseOrderNo: params.purchaseOrderNo,
      operator: params.operator,
    },
  })
}

export const changeSalesOrderRequirements = async (
  orderId: string,
  params: {
    requirements: string
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<SalesOrder> => {
  return executeSalesOrderTransaction<SalesOrderRequirementsChangePayload>(orderId, {
    intent: SALES_TRANSACTION_INTENT_REQUIREMENTS_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      requirements: params.requirements,
      operator: params.operator,
    },
  })
}

export const changeSalesOrderLines = async (
  orderId: string,
  params: {
    lines: SalesOrderLine[]
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<SalesOrder> => {
  return executeSalesOrderTransaction<SalesOrderLinesChangePayload>(orderId, {
    intent: SALES_TRANSACTION_INTENT_ORDER_LINES_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      lines: params.lines,
      operator: params.operator,
    },
  })
}

export const changeSalesOrderLineContent = async (
  orderId: string,
  params: {
    lines: SalesOrderLine[]
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<SalesOrder> => {
  return executeSalesOrderTransaction<SalesOrderLineContentChangePayload>(orderId, {
    intent: SALES_TRANSACTION_INTENT_ORDER_LINE_CONTENT_CHANGE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      lines: params.lines,
      operator: params.operator,
    },
  })
}

export const addSalesOrderLine = async (
  orderId: string,
  params: {
    lines: SalesOrderLine[]
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<SalesOrder> => {
  return executeSalesOrderTransaction<SalesOrderLineAddPayload>(orderId, {
    intent: SALES_TRANSACTION_INTENT_ORDER_LINE_ADD,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      lines: params.lines,
      operator: params.operator,
    },
  })
}

export const removeSalesOrderLine = async (
  orderId: string,
  params: {
    lines: SalesOrderLine[]
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<SalesOrder> => {
  return executeSalesOrderTransaction<SalesOrderLineRemovePayload>(orderId, {
    intent: SALES_TRANSACTION_INTENT_ORDER_LINE_REMOVE,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      lines: params.lines,
      operator: params.operator,
    },
  })
}

export const cancelSalesOrder = async (
  orderId: string,
  params: {
    operator: string
    reason?: string
    actorId?: string
    expectedVersion: number
  }
): Promise<SalesOrder> => {
  return executeSalesOrderTransaction<SalesOrderCancelPayload>(orderId, {
    intent: SALES_TRANSACTION_INTENT_ORDER_CANCEL,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      operator: params.operator,
      reason: params.reason,
    },
  })
}

export const transitionSalesOrderStatus = async (
  orderId: string,
  params: {
    status: string
    statusNote?: string
    operator: string
    actorId?: string
    expectedVersion: number
  }
): Promise<SalesOrder> => {
  return executeSalesOrderTransaction<SalesOrderStatusTransitionPayload>(orderId, {
    intent: SALES_TRANSACTION_INTENT_STATUS_TRANSITION,
    actorId: params.actorId,
    expectedVersion: params.expectedVersion,
    payload: {
      status: params.status,
      statusNote: params.statusNote,
      operator: params.operator,
    },
  })
}
