import { z } from 'zod'
import { type BaseEntity } from '@/types/base'
import {
  type PurchaseOrderStatus,
  purchaseOrderStatuses,
} from './purchase-status'

export type CustomerStatus = 'Active' | 'Inactive' | 'Pending'

const baseEntitySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  isDeleted: z.boolean(),
})

export const customerSchema = baseEntitySchema.extend({
  name: z.string(),
  code: z.string(),
  contactPerson: z.string(),
  contactPhone: z.string(),
  wechat: z.string(),
  whatsapp: z.string(),
  facebook: z.string(),
  instagram: z.string(),
  telegram: z.string(),
  email: z.string(),
  address: z.string(),
  status: z.enum(['Active', 'Inactive', 'Pending']),
  creditLimit: z.number(),
  balance: z.number(),
  version: z.number(),
})

export type Customer = z.infer<typeof customerSchema>
export type CustomerDraft = Omit<
  Customer,
  'id' | 'createdAt' | 'updatedAt' | 'isDeleted'
>
export type CustomerFormValues = CustomerDraft

export const customerArraySchema = z.array(customerSchema)

export type SupplierStatus = 'Active' | 'Inactive' | 'OnReview'

export const supplierSchema = baseEntitySchema.extend({
  name: z.string(),
  code: z.string(),
  category: z.string(),
  mainProducts: z.array(z.string()),
  contactPerson: z.string(),
  contactPhone: z.string(),
  wechat: z.string(),
  whatsapp: z.string(),
  facebook: z.string(),
  instagram: z.string(),
  telegram: z.string(),
  email: z.string(),
  address: z.string(),
  status: z.enum(['Active', 'Inactive', 'OnReview']),
  rating: z.number(),
  version: z.number(),
})

export type Supplier = z.infer<typeof supplierSchema>
export type SupplierFormValues = Omit<
  Supplier,
  'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'version'
>

export const supplierArraySchema = z.array(supplierSchema)

export type SalesOrderStatus =
  | 'Draft'
  | 'Pending'
  | 'Scheduling'
  | 'InProgress'
  | 'Done'
  | 'Canceled'

export type SalesOrderType = string

export type SalesOrderAvailableAction =
  | 'submitPending'
  | 'startScheduling'
  | 'startProduction'
  | 'markDone'
  | 'cancel'
  | 'createReturn'

export interface SalesOrderActionAvailability {
  action: SalesOrderAvailableAction
  allowed: boolean
  reasonCode?: string
  reason?: string
}

export type SalesOrderLinePackagingSelectionSource = 'auto' | 'manual'

export interface SalesOrderLinePackagingSelection {
  profileId: string
  profileCode: string
  profileName: string
  packagingType: string
  length: number
  width: number
  height: number
  dimensionUnitCode: string
  netWeight: number
  grossWeight: number
  weightUnitCode: string
  capacity: number
  capacityUnitCode: string
  source: SalesOrderLinePackagingSelectionSource
}

export interface SalesOrderLine {
  id?: number
  lineNo: number
  productId?: string
  productModel: string
  productCode: string
  specification: string
  productDisplayTitleSnapshot?: string
  productDisplaySubtitleSnapshot?: string
  productDisplayCodeSnapshot?: string
  productDisplayFullLabelSnapshot?: string
  productDisplayStrategyVersionSnapshot?: string
  modelCodeSnapshot?: string
  holePrefixSnapshot?: string
  appearanceId?: string
  appearanceNameSnapshot?: string
  appearanceBarcodeCodeSnapshot?: string
  appearanceDescriptionSnapshot?: string
  appearanceImageUrlSnapshot?: string
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
  status: SalesOrderStatus
  claimedBy?: string
  claimedAt?: string
  selectedPackaging?: SalesOrderLinePackagingSelection
  returnedQuantity: number
  remainingReturnableQuantity: number
}

export const EMPTY_SALES_ORDER_LINE: Partial<SalesOrderLine> = {
  lineNo: 1,
  productModel: '',
  productCode: '',
  specification: '',
  productDisplayTitleSnapshot: '',
  productDisplaySubtitleSnapshot: '',
  productDisplayCodeSnapshot: '',
  productDisplayFullLabelSnapshot: '',
  productDisplayStrategyVersionSnapshot: '',
  modelCodeSnapshot: '',
  holePrefixSnapshot: '',
  appearanceId: '',
  appearanceNameSnapshot: '',
  appearanceBarcodeCodeSnapshot: '',
  appearanceDescriptionSnapshot: '',
  appearanceImageUrlSnapshot: '',
  qty: 0,
  price: 0,
  amount: 0,
  uom: 'PCS',
  status: 'Pending',
  orderDate: '',
  returnedQuantity: 0,
  remainingReturnableQuantity: 0,
}


export interface OrderEvidence {
  id: string
  url: string
  name: string
  uploadedAt: string
  note?: string
  location?: string
  defectPart?: string
}

export interface SalesOrder extends BaseEntity {
  orderNo: string
  orderName?: string
  customerName: string
  customerId?: string
  type: SalesOrderType
  currency: string
  exchangeRateSnapshot: number
  paymentMethod?: string
  paymentMethodName?: string
  paymentTerm?: string
  paymentTermName?: string
  classification: string
  status: SalesOrderStatus
  statusNote?: string
  evidences?: OrderEvidence[]
  amount: number
  quantity: number
  orderDate: string
  deliveryDate: string
  purchaseOrderNo?: string
  barcode?: string
  requirements?: string
  lines: SalesOrderLine[]
  fulfillmentRate?: number
  availableActions?: SalesOrderActionAvailability[]
  version: number
}

export type SalesOrderDraft = Omit<
  SalesOrder,
  'id' | 'createdAt' | 'updatedAt' | 'isDeleted'
>
export type SalesOrderFormValues = SalesOrderDraft

export const getTodaySalesOrderDate = (date = new Date()): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const createEmptySalesOrderLine = (): SalesOrderLine => ({
  lineNo: 1,
  productModel: '',
  productCode: '',
  specification: '',
  productDisplayTitleSnapshot: '',
  productDisplaySubtitleSnapshot: '',
  productDisplayCodeSnapshot: '',
  productDisplayFullLabelSnapshot: '',
  productDisplayStrategyVersionSnapshot: '',
  modelCodeSnapshot: '',
  holePrefixSnapshot: '',
  appearanceId: '',
  appearanceNameSnapshot: '',
  appearanceBarcodeCodeSnapshot: '',
  appearanceDescriptionSnapshot: '',
  appearanceImageUrlSnapshot: '',
  description: '',
  qty: 0,
  uom: 'PCS',
  price: 0,
  amount: 0,
  deliveredQty: 0,
  customerPartNo: '',
  jobNo: '',
  route: '',
  orderDate: '',
  status: 'Pending',
  returnedQuantity: 0,
  remainingReturnableQuantity: 0,
})

export const createEmptySalesOrderDraft = (
  orderNo = ''
): SalesOrderFormValues => {
  const orderDate = getTodaySalesOrderDate()

  return {
    orderNo,
    orderName: '',
    customerName: '',
    customerId: '',
    type: '',
    currency: 'CNY',
    exchangeRateSnapshot: 1,
    paymentMethod: '',
    paymentMethodName: '',
    paymentTerm: '',
    paymentTermName: '',
    classification: '',
    status: 'Pending',
    statusNote: '',
    evidences: [],
    amount: 0,
    quantity: 0,
    orderDate,
    deliveryDate: '',
    purchaseOrderNo: '',
    barcode: orderNo,
    requirements: '',
    lines: [createEmptySalesOrderLine()],
    fulfillmentRate: 0,
    version: 1,
  }
}

export const salesOrderStatuses: {
  value: SalesOrderStatus
  label: string
  color: string
}[] = [
  {
    value: 'Draft',
    label: '草稿',
    color: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  },
  {
    value: 'Pending',
    label: '待处理',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  },
  {
    value: 'Scheduling',
    label: '排产中',
    color: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  },
  {
    value: 'InProgress',
    label: '生产中',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  {
    value: 'Done',
    label: '已完成',
    color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  },
  {
    value: 'Canceled',
    label: '已作废',
    color: 'bg-red-500/10 text-red-500 border-red-500/20',
  },
]

// --- Purchase Order Types ---

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
