import type { BaseEntity } from '@/types/base'
import type { OrderEvidence } from '@/features/sales-document/data/order-evidence'
import {
  type PurchaseOrderStatus,
  purchaseOrderStatuses,
} from './purchase-status'

export type { PurchaseOrderStatus }

export interface PurchaseOrderLine {
  id?: number
  version?: number
  lineNo: number
  materialId: string
  materialName: string
  materialCode: string
  specification: string
  qty: number
  uom: string
  price: number
  amount: number
  expectedDate: string
  receivedQty: number
  returnedQty: number
  status: PurchaseOrderStatus
  note?: string
}

export interface PurchaseOrderListItem extends BaseEntity {
  orderNo: string
  supplierName: string
  supplierId: string
  status: PurchaseOrderStatus
  evidences?: OrderEvidence[]
  amount: number
  orderDate: string
  expectedDate: string
  purchaser: string
  currency: string
  exchangeRate?: number
  paymentMethod?: string
  paymentMethodName?: string
  paymentTerm?: string
  paymentTermName?: string
  note?: string
  isDeleted: boolean
  version: number
}

export interface PurchaseOrder extends PurchaseOrderListItem {
  lines: PurchaseOrderLine[]
}

export { purchaseOrderStatuses }
