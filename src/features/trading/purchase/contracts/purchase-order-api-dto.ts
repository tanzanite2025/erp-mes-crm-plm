export interface PurchaseOrderLineApiDTO {
  id?: number
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
  status: string
  note?: string
}

export interface PurchaseOrderApiDTO {
  id: string
  orderNo: string
  supplierName: string
  supplierId: string
  status: string
  amount: number
  orderDate: string
  expectedDate: string
  purchaser: string
  currency: string
  exchangeRate?: number
  paymentTerm?: string
  note?: string
  workflowInstanceId?: string
  isDeleted?: boolean
  createdAt: string
  updatedAt: string
  _v?: number
  lines: PurchaseOrderLineApiDTO[]
}

export interface PurchaseOrderListPageApiDTO {
  items: PurchaseOrderApiDTO[]
  total: number
  page: number
  pageSize: number
}

export interface ConfirmPurchaseReceiptResponseApiDTO {
  purchaseOrder: PurchaseOrderApiDTO
  createdInboundRecords: Array<{ id: string }>
}
