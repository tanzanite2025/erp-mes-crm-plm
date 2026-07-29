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
  sentQuantity: z.number(),
  returnedQuantity: z.number(),
  acceptedQuantity: z.number(),
  rejectedQuantity: z.number(),
  reworkQuantity: z.number(),
  scrapQuantity: z.number(),
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

export type OutsourceInspectionResult = 'PASS' | 'FAIL' | 'CONDITIONAL'
export type OutsourceInspectionDisposition =
  | 'ACCEPT'
  | 'REWORK'
  | 'CONCESSION'
  | 'SCRAP'

export const outsourceDiagnosticsSeverities = [
  'INFO',
  'WARNING',
  'CRITICAL',
] as const

export const outsourceDiagnosticsSummarySchema = z.object({
  openOrders: z.number(),
  activeLines: z.number(),
  pendingReturnQuantity: z.number(),
  pendingInspectionQuantity: z.number(),
  transferFacts: z.number(),
  inspectionFacts: z.number(),
  notificationFailed: z.number(),
  reconciliationIssues: z.number(),
  criticalIssues: z.number(),
  warningIssues: z.number(),
  infoIssues: z.number(),
  totalIssues: z.number(),
  issuesTruncated: z.boolean(),
})

export const outsourceDiagnosticsIssueSchema = z.object({
  id: z.string(),
  severity: z.enum(outsourceDiagnosticsSeverities),
  type: z.string(),
  orderId: z.string(),
  orderNo: z.string(),
  lineId: z.string(),
  lineNo: z.number(),
  productBarcode: z.string(),
  message: z.string(),
  quantityDiff: z.number(),
  metadata: z.record(z.string(), z.string()),
})

export const outsourceDiagnosticsResponseSchema = z.object({
  generatedAt: z.string(),
  summary: outsourceDiagnosticsSummarySchema,
  issues: z.array(outsourceDiagnosticsIssueSchema),
})

export type OutsourceDiagnosticsSeverity =
  (typeof outsourceDiagnosticsSeverities)[number]
export type OutsourceDiagnosticsSummary = z.infer<
  typeof outsourceDiagnosticsSummarySchema
>
export type OutsourceDiagnosticsIssue = z.infer<
  typeof outsourceDiagnosticsIssueSchema
>
export type OutsourceDiagnosticsResponse = z.infer<
  typeof outsourceDiagnosticsResponseSchema
>

export interface OutsourceTransferFormValues {
  productBarcode: string
  quantity: number
  uom: string
  occurredAt: string
  sourceCategory: string
  targetCategory: string
  batchNo: string
  notes: string
}

export interface OutsourceInspectionFormValues {
  productBarcode: string
  result: OutsourceInspectionResult
  disposition: OutsourceInspectionDisposition
  inspectedQuantity: number
  uom: string
  inspectedAt: string
  notes: string
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
