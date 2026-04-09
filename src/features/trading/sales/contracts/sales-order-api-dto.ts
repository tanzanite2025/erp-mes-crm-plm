export interface SalesOrderLineApiDTO {
  id?: number
  lineNo: number
  productId?: string
  productModel: string
  productCode: string
  specification: string
  description: string
  qty: number
  uom: string
  price: number
  amount: number
  deliveredQty: number
  customerPartNo: string
  jobNo: string
  note?: string
  drillingPlanId?: string
  labelingPlanId?: string
  holeCount?: number
  route?: string
  orderDate: string
  status: string
  claimedBy?: string
  claimedAt?: string
}

export interface SalesOrderApiDTO {
  id: string
  orderNo: string
  orderName?: string
  customerName: string
  customerId?: string
  type: string
  currency: string
  classification: string
  status: string
  statusNote?: string
  amount: number
  quantity: number
  orderDate: string
  deliveryDate: string
  purchaseOrderNo?: string
  barcode?: string
  requirements?: string
  workflowInstanceId?: string
  createdAt: string
  updatedAt: string
  updatedBy?: string
  isDeleted?: boolean
  _v?: number
  lines: SalesOrderLineApiDTO[]
}

export interface SalesOrderListPageApiDTO {
  items: SalesOrderApiDTO[]
  total: number
  page: number
  pageSize: number
}
