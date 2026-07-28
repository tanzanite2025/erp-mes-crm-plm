import type { SalesOrder } from '@/features/trading/data/schema'
import type {
  SalesExchangeLifecycleStatus,
  SalesExchangeReplacementMode,
} from '../types/sales-exchange-types'

type SalesExchangeRecognitionSource =
  | 'scannerInput'
  | 'manualInput'
  | 'warehouseScan'
  | 'shipmentScan'

export interface SalesExchangeRecognizedLabelApiDTO {
  id?: number
  rawLabelCode: string
  normalizedLabelCode: string
  recognizedAt: string
  recognitionSource: SalesExchangeRecognitionSource
  side?: 'OLD_ITEM' | 'REPLACEMENT_ITEM'
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
  oldItemReceivedQuantity: number
  replacementShippedQuantity: number
  status: SalesExchangeLifecycleStatus
  replacementMode: SalesExchangeReplacementMode
  replacementProductCode: string
  replacementProductModel: string
  issueCategory: string
  issueDescription: string
  recognizedLabelCodes: SalesExchangeRecognizedLabelApiDTO[]
}

export interface SalesExchangeInboundRecordApiDTO {
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

export interface SalesExchangeShipmentRecordApiDTO {
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
  trackingNo?: string
  status: string
  cogs: number
  shipmentDate: string
  operator: string
  remarks: string
  createdAt: string
  updatedAt: string
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
  replacementShippedAt?: string | null
  replacementShippedBy?: string
  replacementSourceCategory?: string
  replacementBatchNo?: string
  replacementShipmentRemarks?: string
  createdAt: string
  updatedAt: string
  lines: SalesExchangeLineApiDTO[]
  unmatchedLabelCodes: SalesExchangeUnmatchedLabelApiDTO[]
  inboundRecords?: SalesExchangeInboundRecordApiDTO[]
  shipmentRecords?: SalesExchangeShipmentRecordApiDTO[]
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
      recognitionSource: SalesExchangeRecognitionSource
      side?: 'OLD_ITEM' | 'REPLACEMENT_ITEM'
    }>
  }>
  unmatchedLabelCodes: Array<{
    rawLabelCode: string
    normalizedLabelCode: string
    recognizedAt: string
    recognitionSource: SalesExchangeRecognitionSource
    unmatchedReason: string
    side?: 'OLD_ITEM' | 'REPLACEMENT_ITEM'
  }>
}

export interface CreateSalesExchangeResponseApiDTO {
  salesExchange: SalesExchangeApiDTO
  salesOrder: SalesOrder
}

export interface ConfirmSalesExchangeOldItemInboundPayload {
  clientRequestId: string
  salesExchangeLineId: number
  quantity: number
  targetCategory: string
  batchNo: string
  inboundDate: string
  remarks: string
  barcodes?: SalesExchangeExecutionBarcodePayload[]
}

export interface SalesExchangeExecutionBarcodePayload {
  rawLabelCode: string
  normalizedLabelCode: string
  recognizedAt: string
  recognitionSource: SalesExchangeRecognitionSource
  side: 'OLD_ITEM' | 'REPLACEMENT_ITEM'
}

export interface ConfirmSalesExchangeOldItemInboundResponseApiDTO {
  salesExchange: SalesExchangeApiDTO
  createdInboundRecords: unknown[]
}

export interface PatchSalesExchangeOldItemLogisticsPayload {
  receivedOldItemTrackingNo?: string
}

export interface ConfirmSalesExchangeReplacementShipmentPayload {
  clientRequestId: string
  operator?: string
  sourceCategory: string
  batchNo: string
  shipmentDate: string
  replacementTrackingNo?: string
  remarks?: string
  lines: Array<{
    salesExchangeLineId: number
    quantity: number
    barcodes?: SalesExchangeExecutionBarcodePayload[]
  }>
}

export interface ConfirmSalesExchangeReplacementShipmentResponseApiDTO {
  salesExchange: SalesExchangeApiDTO
  createdShipmentRecords: unknown[]
}

export interface VoidSalesExchangeReplacementShipmentPayload {
  reason: string
}

export interface VoidSalesExchangeReplacementShipmentResponseApiDTO {
  salesExchange: SalesExchangeApiDTO
  shipment: SalesExchangeShipmentRecordApiDTO
}
