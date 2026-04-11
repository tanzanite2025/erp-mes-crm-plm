import { type PurchaseOrder, type PurchaseOrderLine } from '../data/schema'

export const EMPTY_PURCHASE_ORDER_LINE: Partial<PurchaseOrderLine> = {
  lineNo: 1,
  materialName: '',
  materialCode: '',
  specification: '',
  qty: 0,
  price: 0,
  amount: 0,
  uom: 'PCS',
  receivedQty: 0,
  returnedQty: 0,
  status: 'Draft',
  expectedDate: new Date().toISOString().split('T')[0],
}

export const DEFAULT_PURCHASE_ORDER: Partial<PurchaseOrder> = {
  orderNo: '',
  supplierName: '',
  supplierId: '',
  currency: 'CNY',
  exchangeRate: 1.0,
  orderDate: new Date().toISOString().split('T')[0],
  expectedDate: '',
  status: 'Draft',
  lines: [],
  amount: 0,
  purchaser: '',
  paymentMethod: '',
  paymentMethodName: '',
  paymentTerm: '',
  paymentTermName: '',
  note: '',
  evidences: [],
  version: 1,
}
