import type { OrderEvidence } from '../../data/schema'
import type { SalesOrderApiDTO } from './sales-order-api-dto'

export type SalesReturnTransportMode = 'Courier' | 'Other'

export interface SalesReturnLineApiDTO {
  id: number
  salesOrderLineId: number
  lineNo: number
  productId: string
  productCode: string
  productModel: string
  specification: string
  description: string
  uom: string
  quantity: number
  price: number
  amount: number
  issueCategory?: string
  reason?: string
  evidences?: OrderEvidence[]
}

export interface SalesReturnApiDTO {
  id: string
  returnNo: string
  salesOrderId: string
  salesOrderNo: string
  customerId: string
  customerName: string
  status: string
  transportMode: SalesReturnTransportMode
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
  evidences?: OrderEvidence[]
  operator?: string
  totalQuantity: number
  totalAmount: number
  createdAt: string
  updatedAt: string
  lines: SalesReturnLineApiDTO[]
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
}

export interface CreateSalesReturnPayload {
  operator?: string
  transportMode?: SalesReturnTransportMode
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

export interface PatchSalesReturnLogisticsPayload {
  operator?: string
  transportMode?: SalesReturnTransportMode
  trackingNo?: string
  carrier?: string
  shippedAt?: string
  logisticsNote?: string
  status?: string
}

export interface CreateSalesReturnResponseApiDTO {
  salesReturn: SalesReturnApiDTO
  salesOrder: SalesOrderApiDTO
}
