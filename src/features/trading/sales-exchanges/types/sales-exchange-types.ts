import type {
  OrderEvidence,
  SalesOrder,
  SalesOrderLine,
} from '@/features/trading/data/schema'

export type SalesExchangeLifecycleStatus =
  | 'Draft'
  | 'OldItemPartiallyReceived'
  | 'OldItemReceived'
  | 'ReplacementPrepared'
  | 'ReplacementPartiallyShipped'
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
  recognitionSource:
    | 'scannerInput'
    | 'manualInput'
    | 'warehouseScan'
    | 'shipmentScan'
  side?: 'OLD_ITEM' | 'REPLACEMENT_ITEM'
}

export interface SalesExchangeUnmatchedLabelCode extends SalesExchangeRecognizedLabelCode {
  unmatchedReason: string
}

export interface SalesExchangeInboundRecord {
  id: string
  materialId: string
  materialName: string
  materialCode: string
  sourceType: string
  sourceId: string
  sourceLineId: number
  quantity: number
  purchasePrice: number
  targetCategory: string
  batchNo: string
  inboundDate: string
  operator: string
  remarks: string
  createdAt: string
  updatedAt: string
}

export interface SalesExchangeShipmentRecord {
  id: string
  materialId: string
  materialName: string
  materialCode: string
  sourceType: string
  sourceId: string
  sourceLineId: number
  salesOrderId: string
  salesOrderLineId: number
  quantity: number
  sourceCategory: string
  batchNo: string
  orderNo: string
  trackingNo: string
  status: string
  cogs: number
  shipmentDate: string
  operator: string
  remarks: string
  createdAt: string
  updatedAt: string
}

export interface SalesExchangeLineDraft {
  id?: number
  lineDraftId: string
  salesOrderLineId: number
  lineNo: number
  productId?: string
  productCode: string
  productModel: string
  specification: string
  productDisplayTitleSnapshot?: string
  productDisplaySubtitleSnapshot?: string
  productDisplayCodeSnapshot?: string
  productDisplayFullLabelSnapshot?: string
  productDisplayStrategyVersionSnapshot?: string
  description: string
  uom: string
  originalOrderQuantity: number
  deliveredQuantity: number
  exchangeQuantity: number
  oldItemReceivedQuantity: number
  replacementShippedQuantity: number
  status: SalesExchangeLifecycleStatus
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
  oldItemInboundConfirmedAt?: string
  oldItemInboundConfirmedBy?: string
  oldItemInboundTarget?: string
  oldItemInboundBatchNo?: string
  oldItemInboundRemarks?: string
  replacementShippedAt?: string
  replacementShippedBy?: string
  replacementSourceCategory?: string
  replacementBatchNo?: string
  replacementShipmentRemarks?: string
  createdAt: string
  updatedAt: string
  lines: SalesExchangeLineDraft[]
  unmatchedLabelCodes: SalesExchangeUnmatchedLabelCode[]
  inboundRecords: SalesExchangeInboundRecord[]
  shipmentRecords: SalesExchangeShipmentRecord[]
}

export interface SalesExchangeSourceOrderCandidate {
  order: SalesOrder
  exchangeableLines: SalesOrderLine[]
  canCreateSalesExchangeDraft: boolean
}
