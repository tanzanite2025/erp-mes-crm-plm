import type { OrderEvidence } from '@/features/sales-document/data/order-evidence'
import type { PurchaseOrderApiDTO } from './purchase-order-api-dto'

export interface PurchaseReturnLineApiDTO {
  id: number
  purchaseOrderLineId: number
  lineNo: number
  materialId: string
  materialCode: string
  materialName: string
  specification: string
  uom: string
  quantity: number
  price: number
  amount: number
  issueCategory?: string
  reason?: string
  evidences?: OrderEvidence[]
}

export interface PurchaseReturnApiDTO {
  id: string
  returnNo: string
  purchaseOrderId: string
  purchaseOrderNo: string
  supplierId: string
  supplierName: string
  status: string
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
  lines: PurchaseReturnLineApiDTO[]
}

export interface PurchaseReturnListPageApiDTO {
  items: PurchaseReturnApiDTO[]
  total: number
  page: number
  pageSize: number
}

export interface CreatePurchaseReturnResponseApiDTO {
  purchaseReturn: PurchaseReturnApiDTO
  purchaseOrder: PurchaseOrderApiDTO
}
