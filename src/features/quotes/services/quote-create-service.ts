import { createSalesOrder } from '@/features/trading/sales/services/sales-service'
import type { SalesOrder } from '@/features/trading/data/schema'

export type CreateQuotePayload = {
  customerId: string
  customerName: string
  amount: number
  requirements: string
}

export async function createQuote(payload: CreateQuotePayload) {
  const orderDate = new Date().toISOString().slice(0, 10)
  const quote = await createSalesOrder({
    createdAt: '',
    updatedAt: '',
    isDeleted: false,
    orderNo: '',
    orderName: `报价-${payload.customerName}`,
    customerName: payload.customerName,
    customerId: payload.customerId,
    type: 'retail',
    currency: 'CNY',
    classification: 'quote',
    status: 'Draft',
    amount: payload.amount,
    quantity: 0,
    orderDate,
    deliveryDate: '',
    requirements: payload.requirements,
    lines: [],
    evidences: [],
  } as Omit<SalesOrder, 'id' | 'version'>)

  return {
    id: quote.id,
  }
}
