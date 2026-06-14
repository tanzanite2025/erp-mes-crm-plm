import type { SalesOrder } from '@/features/trading/data/schema'
import type {
  SalesExchangeLifecycleStatus,
  SalesExchangeReplacementMode,
} from '../types/sales-exchange-types'

export interface SalesExchangeRecognizedLabelApiDTO {
  id?: number
  rawLabelCode: string
  normalizedLabelCode: string
  recognizedAt: string
  recognitionSource: 'scannerInput' | 'manualInput'
  unmatchedReason?: string
}

export interface SalesExchangeUnmatchedLabelApiDTO extends SalesExchangeRecognizedLabelApiDTO {
  unmatchedReason: string
}

export interface SalesExchangeLineApiDTO {
  id: number
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
  replacementMode: SalesExchangeReplacementMode
  replacementProductCode: string
  replacementProductModel: string
  issueCategory: string
  issueDescription: string
  recognizedLabelCodes: SalesExchangeRecognizedLabelApiDTO[]
}

export interface SalesExchangeApiDTO {
  id: string
  exchangeNo: string
  sourceSalesOrderId: string
  sourceSalesOrderNo: string
  customerId?: string
  customerName: string
  status: SalesExchangeLifecycleStatus
  exchangeDate: string
  expectedReplacementDate?: string | null
  receivedOldItemTrackingNo: string
  replacementTrackingNo: string
  exchangeReason: string
  exchangeRemarks: string
  operator?: string
  totalExchangeQuantity: number
  oldItemInboundConfirmedAt?: string | null
  oldItemInboundConfirmedBy?: string
  oldItemInboundTarget?: string
  oldItemInboundBatchNo?: string
  oldItemInboundRemarks?: string
  createdAt: string
  updatedAt: string
  lines: SalesExchangeLineApiDTO[]
  unmatchedLabelCodes: SalesExchangeUnmatchedLabelApiDTO[]
}

export interface SalesExchangeListPageApiDTO {
  items: SalesExchangeApiDTO[]
  total: number
  page: number
  pageSize: number
}

export interface CreateSalesExchangePayload {
  exchangeDate: string
  expectedReplacementDate: string
  receivedOldItemTrackingNo: string
  replacementTrackingNo: string
  exchangeReason: string
  exchangeRemarks: string
  lines: Array<{
    salesOrderLineId: number
    exchangeQuantity: number
    replacementMode: SalesExchangeReplacementMode
    replacementProductCode: string
    replacementProductModel: string
    issueCategory: string
    issueDescription: string
    recognizedLabelCodes: Array<{
      rawLabelCode: string
      normalizedLabelCode: string
      recognizedAt: string
      recognitionSource: 'scannerInput' | 'manualInput'
    }>
  }>
  unmatchedLabelCodes: Array<{
    rawLabelCode: string
    normalizedLabelCode: string
    recognizedAt: string
    recognitionSource: 'scannerInput' | 'manualInput'
    unmatchedReason: string
  }>
}

export interface CreateSalesExchangeResponseApiDTO {
  salesExchange: SalesExchangeApiDTO
  salesOrder: SalesOrder
}

export interface ConfirmSalesExchangeOldItemInboundPayload {
  targetCategory: string
  batchNo: string
  inboundDate: string
  remarks: string
}

export interface ConfirmSalesExchangeOldItemInboundResponseApiDTO {
  salesExchange: SalesExchangeApiDTO
  createdInboundRecords: unknown[]
}
