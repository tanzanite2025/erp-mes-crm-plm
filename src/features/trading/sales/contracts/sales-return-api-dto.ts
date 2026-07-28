import type { OrderEvidence } from '../../data/schema'
import type { SalesOrderApiDTO } from './sales-order-api-dto'

export interface SalesReturnLineApiDTO {
  id: number
  salesOrderLineId: number
  lineNo: number
  productId: string
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
  quantity: number
  receivedQuantity: number
  status: string
  price: number
  amount: number
  issueCategory?: string
  reason?: string
  evidences?: OrderEvidence[]
  barcodes?: SalesReturnLineBarcodeApiDTO[]
}

export interface SalesReturnLineBarcodeApiDTO {
  id: number
  salesReturnId: string
  salesReturnLineId: number
  salesOrderLineId: number
  rawCode: string
  normalizedCode: string
  productCodeSnapshot: string
  bindSource: string
  verificationStatus: string
  boundAt: string
  boundBy: string
}

export interface SalesReturnInboundRecordApiDTO {
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

export interface SalesReturnApiDTO {
  id: string
  returnNo: string
  salesOrderId: string
  salesOrderNo: string
  customerId: string
  customerName: string
  status: string
  trackingNo?: string
  carrier?: string
  shippedAt?: string | null
  trackingFilledAt?: string | null
  trackingFilledBy?: string
  logisticsNote?: string
  pendingTrackingFill: boolean
  returnDate: string
  issueCategory?: string
  reason?: string
  remarks?: string
  actualReturnAmount: number
  actualReturnAmountNote?: string
  actualReturnAmountEvidences?: OrderEvidence[]
  actualReturnAmountRecordedAt?: string | null
  actualReturnAmountRecordedBy?: string
  evidences?: OrderEvidence[]
  operator?: string
  totalQuantity: number
  totalReceivedQuantity: number
  totalAmount: number
  createdAt: string
  updatedAt: string
  lines: SalesReturnLineApiDTO[]
  inboundRecords?: SalesReturnInboundRecordApiDTO[]
}

export interface SalesReturnActualAmountRecordApiDTO {
  id: string
  salesReturnId: string
  salesOrderId: string
  salesOrderNo: string
  returnNo: string
  customerId: string
  customerName: string
  amount: number
  note?: string
  evidences?: OrderEvidence[]
  estimatedReturnAmountSnapshot: number
  recordedAt: string
  recordedBy: string
  createdAt: string
  updatedAt: string
}

export interface SalesReturnListPageApiDTO {
  items: SalesReturnApiDTO[]
  total: number
  page: number
  pageSize: number
}

export interface CreateSalesReturnLinePayload {
  salesOrderLineId: number
  quantity: number
  price: number
  issueCategory?: string
  reason?: string
  evidences?: OrderEvidence[]
  barcodes?: string[]
}

export interface CreateSalesReturnPayload {
  operator?: string
  trackingNo?: string
  carrier?: string
  shippedAt?: string
  logisticsNote?: string
  issueCategory?: string
  reason?: string
  remarks?: string
  evidences?: OrderEvidence[]
  returnDate?: string
  lines: CreateSalesReturnLinePayload[]
}

export interface PatchSalesReturnPayload {
  operator?: string
  issueCategory?: string
  reason?: string
  remarks?: string
  evidences?: OrderEvidence[]
  returnDate?: string
  lines: CreateSalesReturnLinePayload[]
}

export interface PatchSalesReturnLogisticsPayload {
  operator?: string
  trackingNo?: string
  carrier?: string
  shippedAt?: string
  logisticsNote?: string
  status?: string
}

export interface PatchSalesReturnActualAmountEntryPayload {
  operator?: string
  actualReturnAmount: number
  actualReturnAmountNote?: string
  actualReturnAmountEvidences?: OrderEvidence[]
}

export interface SalesReturnLineBarcodePayload {
  salesReturnLineId: number
  rawCode: string
  normalizedCode: string
  bindSource?: string
  verificationStatus?: string
}

export interface ConfirmSalesReturnInboundPayload {
  clientRequestId: string
  operator?: string
  targetCategory: string
  batchNo: string
  inboundDate: string
  remarks?: string
  lines: Array<{
    salesReturnLineId: number
    quantity: number
    barcodes?: SalesReturnLineBarcodePayload[]
  }>
}

export interface CreateSalesReturnResponseApiDTO {
  salesReturn: SalesReturnApiDTO
  salesOrder: SalesOrderApiDTO
}

export interface ConfirmSalesReturnInboundResponseApiDTO {
  salesReturn: SalesReturnApiDTO
  createdInboundRecords: unknown[]
}
