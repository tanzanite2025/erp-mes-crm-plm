import { z } from 'zod'

export const outsourceOrderSourceTypes = [
  'SALES_ORDER',
  'PRODUCTION_PLAN',
] as const

export const outsourceOrderStatuses = [
  'DRAFT',
  'RELEASED',
  'SENT',
  'IN_PROCESS',
  'RETURNED',
  'CLOSED',
  'CANCELED',
] as const

export type OutsourceOrderSourceType =
  (typeof outsourceOrderSourceTypes)[number]
export type OutsourceOrderStatus = (typeof outsourceOrderStatuses)[number]

export const outsourceOrderLineSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  outsourceOrderId: z.string(),
  lineNo: z.number(),
  sourceLineId: z.string(),
  productId: z.string(),
  productCode: z.string(),
  productName: z.string(),
  specification: z.string(),
  quantity: z.number(),
  uom: z.string(),
  segmentId: z.string(),
  segmentName: z.string(),
  processStepId: z.string(),
  processCode: z.string(),
  processName: z.string(),
  status: z.enum(outsourceOrderStatuses),
  notes: z.string(),
  version: z.number(),
})

export const outsourceOrderSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  orderNo: z.string(),
  sourceType: z.enum(outsourceOrderSourceTypes),
  sourceId: z.string(),
  sourceNo: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  partnerId: z.string(),
  partnerNameSnapshot: z.string(),
  status: z.enum(outsourceOrderStatuses),
  plannedSendDate: z.string(),
  plannedReturnDate: z.string(),
  totalQuantity: z.number(),
  uom: z.string(),
  notes: z.string(),
  operator: z.string(),
  version: z.number(),
  lines: z.array(outsourceOrderLineSchema),
})

export const outsourceOrderArraySchema = z.array(outsourceOrderSchema)

export type OutsourceOrderLine = z.infer<typeof outsourceOrderLineSchema>
export type OutsourceOrder = z.infer<typeof outsourceOrderSchema>

export interface OutsourceOrderLineFormValues {
  id?: string
  sourceLineId: string
  productId: string
  productCode: string
  productName: string
  specification: string
  quantity: number
  uom: string
  segmentId: string
  segmentName: string
  processStepId: string
  processCode: string
  processName: string
  status?: OutsourceOrderStatus
  notes: string
}

export interface OutsourceOrderFormValues {
  orderNo: string
  sourceType: OutsourceOrderSourceType
  sourceId: string
  sourceNo: string
  customerId: string
  customerName: string
  partnerId: string
  status: OutsourceOrderStatus
  plannedSendDate: string
  plannedReturnDate: string
  notes: string
  lines: OutsourceOrderLineFormValues[]
}

export interface OutsourceOrderListStats {
  total: number
  draft: number
  released: number
  active: number
  returned: number
  closed: number
  canceled: number
  salesOrder: number
  production: number
}

export interface OutsourceOrderListResponse {
  items: OutsourceOrder[]
  metadata: OutsourceOrderListStats
}

export function createEmptyOutsourceOrderLine(): OutsourceOrderLineFormValues {
  return {
    sourceLineId: '',
    productId: '',
    productCode: '',
    productName: '',
    specification: '',
    quantity: 0,
    uom: '',
    segmentId: '',
    segmentName: '',
    processStepId: '',
    processCode: '',
    processName: '',
    status: undefined,
    notes: '',
  }
}

export function createEmptyOutsourceOrderForm(): OutsourceOrderFormValues {
  return {
    orderNo: '',
    sourceType: 'SALES_ORDER',
    sourceId: '',
    sourceNo: '',
    customerId: '',
    customerName: '',
    partnerId: '',
    status: 'DRAFT',
    plannedSendDate: '',
    plannedReturnDate: '',
    notes: '',
    lines: [createEmptyOutsourceOrderLine()],
  }
}
