/** Issuance inventory status, separate from production execution or process status. */
export type IssuedProductCodeInventoryStatus =
  | 'AVAILABLE'
  | 'BOUND'
  | 'EXPIRED'
  | 'SCRAPPED'

/** One persisted identity shared by Code128, QR and later business references. */
export interface IssuedProductCodeRecord {
  id: string
  batchId: string
  batchNo: string
  productId: string
  salesOrderId: string
  salesOrderLineNo: number
  code: string
  serialNumber: string
  status: IssuedProductCodeInventoryStatus
  expiresAt: string
  boundAt?: string
  createdAt: string
  version: number
}

export interface IssueProductCodeBatchInput {
  salesOrderId: string
  salesOrderLineId?: number
  salesOrderLineNo: number
  quantity: number
}

export interface IssuedProductCodeOrderLineIssuanceSummary {
  salesOrderLineId: number
  salesOrderLineNo: number
  orderQuantity: number
  issuedQuantity: number
  remainingQuantity: number
}

export interface IssuedProductCodeInventoryList {
  items: IssuedProductCodeRecord[]
  total: number
  unattributedIssuedQuantity?: number
  orderLineIssuanceSummaries?: IssuedProductCodeOrderLineIssuanceSummary[]
}
