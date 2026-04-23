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

export const supplierArraySchema = z.array(supplierSchema)

export type SalesOrderStatus =
  | 'Draft'
  | 'Pending'
  | 'InProgress'
  | 'Done'
  | 'Canceled'

export type SalesOrderType = string // 交易模块订单模式枚举

export type SalesOrderAvailableAction =
  | 'submitPending'
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

export interface SalesOrderLine {
  id?: number
  lineNo: number
  productId?: string // 引用 Engineering 模块的产品 ID
  productModel: string
  productCode: string
  specification: string // 冗余存储下订单时的规格快照
  modelCodeSnapshot?: string
  holePrefixSnapshot?: string
  appearanceId?: string // 引用产品外观主数据 ID
  appearanceNameSnapshot?: string // 外观名称快照
  appearanceBarcodeCodeSnapshot?: string // 外观条码位值快照
  appearanceDescriptionSnapshot?: string // 外观说明快照
  appearanceImageUrlSnapshot?: string // 外观图片快照
  description: string
  qty: number
  uom: string
  price: number
  amount: number
  deliveredQty: number // 已交付数量 (联动库存模块)
  customerPartNo: string
  jobNo: string
  note?: string
  drillingPlanId?: string // 订单关联：打孔方案 ID
  labelingPlanId?: string // 订单关联：贴标方案 ID
  holeCount?: number // 订单关联：孔数
  route?: string // 工序路线快照
  orderDate: string
  status: SalesOrderStatus
  claimedBy?: string // 认领人姓名
  claimedAt?: string // 认领时间
  returnedQuantity: number
  remainingReturnableQuantity: number
}

export const EMPTY_SALES_ORDER_LINE: Partial<SalesOrderLine> = {
  lineNo: 1,
  productModel: '',
  productCode: '',
  specification: '',
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

// Removed old manual SalesOrderApproval as it was superseded by Workflow Engine

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
  customerId?: string // 引用客户 ID
  type: SalesOrderType
  currency: string // 货币类别
  paymentMethod?: string
  paymentMethodName?: string
  paymentTerm?: string
  paymentTermName?: string
  classification: string // 交易模块订单分类枚举
  status: SalesOrderStatus
  statusNote?: string // 弃用：建议使用 evidences
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
  workflowInstanceId?: string // 统一工作流引擎桥接关键链
  version: number // SDRTS 乐观锁
}

export type SalesOrderDraft = Omit<
  SalesOrder,
  'id' | 'createdAt' | 'updatedAt' | 'isDeleted'
>
export type SalesOrderFormValues = SalesOrderDraft

export const createEmptySalesOrderLine = (): SalesOrderLine => ({
  lineNo: 1,
  productModel: '',
  productCode: '',
  specification: '',
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
): SalesOrderFormValues => ({
  orderNo,
  orderName: '',
  customerName: '',
  customerId: '',
  type: '',
  currency: 'CNY',
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
  orderDate: '',
  deliveryDate: '',
  purchaseOrderNo: '',
  barcode: orderNo,
  requirements: '',
  lines: [createEmptySalesOrderLine()],
  fulfillmentRate: 0,
  workflowInstanceId: '',
  version: 1,
})

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
  materialId: string // 引用 Materials 模块的物料 ID
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

export interface PurchaseOrder extends BaseEntity {
  orderNo: string
  supplierName: string
  supplierId: string // 引用供应商 ID
  status: PurchaseOrderStatus
  evidences?: OrderEvidence[]
  amount: number
  orderDate: string
  expectedDate: string
  purchaser: string // 采购员
  currency: string
  exchangeRate?: number
  paymentMethod?: string
  paymentMethodName?: string
  paymentTerm?: string
  paymentTermName?: string
  note?: string
  lines: PurchaseOrderLine[]
  workflowInstanceId?: string // 统一工作流引擎桥接关键链
  isDeleted: boolean
  version: number // SDRTS 乐观锁
}

export { purchaseOrderStatuses }
