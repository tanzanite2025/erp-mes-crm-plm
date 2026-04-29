import { createSalesOrder } from '@/features/trading/sales/services/sales-service'
import type { SalesOrderFormValues } from '@/features/trading/data/schema'

export type CreateQuotePayload = {
  customerId: string
  customerName: string
  amount: number
  requirements: string
}

export async function createQuoteAsSalesOrderDraft(payload: CreateQuotePayload) {
  const orderDate = new Date().toISOString().slice(0, 10)
  const quote: SalesOrderFormValues = {
    orderNo: '',
    orderName: `报价-${payload.customerName}`,
    customerName: payload.customerName,
    customerId: payload.customerId,
    type: 'retail',
    currency: 'CNY',
    exchangeRateSnapshot: 1,
    paymentMethod: '',
    paymentMethodName: '',
    paymentTerm: '',
    paymentTermName: '',
    classification: 'quote',
    status: 'Draft',
    statusNote: '',
    evidences: [],
    amount: payload.amount,
    quantity: 0,
    orderDate,
    deliveryDate: '',
    purchaseOrderNo: '',
    barcode: '',
    requirements: payload.requirements,
    lines: [],
    fulfillmentRate: 0,
    workflowInstanceId: '',
    version: 1,
  }

  const created = await createSalesOrder(quote)

  return {
    id: created.id,
  }
}

export const createQuote = createQuoteAsSalesOrderDraft
