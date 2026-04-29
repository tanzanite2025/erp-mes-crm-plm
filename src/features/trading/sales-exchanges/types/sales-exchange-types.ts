import type {
  OrderEvidence,
  SalesOrder,
  SalesOrderLine,
} from '@/features/trading/data/schema'

export type SalesExchangeLifecycleStatus =
  | 'Draft'
  | 'OldItemReceived'
  | 'ReplacementPrepared'
  | 'ReplacementShipped'
  | 'Closed'
  | 'Canceled'

export type SalesExchangeReplacementMode =
  | 'sameSalesOrderLineItem'
  | 'manualReplacementReview'

export interface SalesExchangeRecognizedLabelCode {
  rawLabelCode: string
  normalizedLabelCode: string
  recognizedAt: string
  recognitionSource: 'scannerInput' | 'manualInput'
}

export interface SalesExchangeUnmatchedLabelCode
  extends SalesExchangeRecognizedLabelCode {
  unmatchedReason: string
}

export interface SalesExchangeLineDraft {
  lineDraftId: string
  salesOrderLineId: number
  lineNo: number
  productId?: string
  productCode: string
  productModel: string
  specification: string
  description: string
  uom: string
  originalOrderQuantity: number
  deliveredQuantity: number
  exchangeQuantity: number
  replacementMode: SalesExchangeReplacementMode
  replacementProductCode: string
  replacementProductModel: string
  issueCategory: string
  issueDescription: string
  recognizedLabelCodes: SalesExchangeRecognizedLabelCode[]
}

export interface SalesExchangeDraftRecord {
  id: string
  exchangeNo: string
  sourceSalesOrderId: string
  sourceSalesOrderNo: string
  customerId?: string
  customerName: string
  status: SalesExchangeLifecycleStatus
  exchangeDate: string
  expectedReplacementDate: string
  receivedOldItemTrackingNo: string
  replacementTrackingNo: string
  exchangeReason: string
  exchangeRemarks: string
  evidences: OrderEvidence[]
  totalExchangeQuantity: number
  createdAt: string
  updatedAt: string
  lines: SalesExchangeLineDraft[]
  unmatchedLabelCodes: SalesExchangeUnmatchedLabelCode[]
}

export interface SalesExchangeSourceOrderCandidate {
  order: SalesOrder
  exchangeableLines: SalesOrderLine[]
  canCreateSalesExchangeDraft: boolean
}

