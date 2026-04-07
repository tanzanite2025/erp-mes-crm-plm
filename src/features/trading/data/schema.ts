import { type BaseEntity } from '@/types/base'
import { type PurchaseOrderStatus, purchaseOrderStatuses } from './purchase-status'

export type CustomerStatus = 'Active' | 'Inactive' | 'Pending'

export interface Customer extends BaseEntity {
    name: string
    code: string
    contactPerson: string
    contactPhone: string
    email: string
    address: string
    status: CustomerStatus
    creditLimit: number
    balance: number
    version: number // SDRTS 乐观锁
}

export type SupplierStatus = 'Active' | 'Inactive' | 'OnReview'

export interface Supplier extends BaseEntity {
    name: string
    code: string
    category: string
    mainProducts: string[]
    contactPerson: string
    contactPhone: string
    email: string
    address: string
    status: SupplierStatus
    rating: number
    version: number // SDRTS 乐观锁
}

export type SalesOrderStatus = 'Draft' | 'Pending' | 'InProgress' | 'Done' | 'Canceled'

export type SalesOrderType = string // 字典引用：订单模式 (TRADING/ORDER_TYPE)

export interface SalesOrderLine {
    id?: number
    lineNo: number
    productId?: string // 引用 Engineering 模块的产品 ID
    productModel: string
    productCode: string
    specification: string // 冗余存储下订单时的规格快照
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
    holeCount?: number      // 订单关联：孔数
    route?: string // 工序路线快照
    orderDate: string
    status: SalesOrderStatus
    claimedBy?: string // 认领人姓名
    claimedAt?: string // 认领时间
}

export const EMPTY_SALES_ORDER_LINE: Partial<SalesOrderLine> = {
  lineNo: 1,
  productModel: '',
  productCode: '',
  specification: '',
  qty: 0,
  price: 0,
  amount: 0,
  uom: 'PCS',
  status: 'Pending',
  orderDate: new Date().toISOString().split('T')[0],
}

// Removed old manual SalesOrderApproval as it was superseded by Workflow Engine

export interface SalesOrder extends BaseEntity {
    orderNo: string
    orderName: string
    customerName: string
    customerId?: string // 引用客户 ID
    type: SalesOrderType
    currency: string // 字典引用：货币类别
    classification: string // 字典引用：订单分类 (TRADING/ORDER_CLASSIFICATION)
    status: SalesOrderStatus
    statusNote?: string
    amount: number
    quantity: number
    orderDate: string
    deliveryDate: string
    purchaseOrderNo?: string
    barcode?: string
    requirements?: string
    lines: SalesOrderLine[]
    workflowInstanceId?: string // 统一工作流引擎桥接关键链
    version: number // SDRTS 乐观锁
}

export const salesOrderStatuses: { value: SalesOrderStatus; label: string; color: string }[] = [
    { value: 'Draft', label: '草稿', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' },
    { value: 'Pending', label: '待处理', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    { value: 'InProgress', label: '生产中', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    { value: 'Done', label: '已完成', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
    { value: 'Canceled', label: '已作废', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
]

// --- Purchase Order Types ---

export type { PurchaseOrderStatus }

export interface PurchaseOrderLine {
    id?: number
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
    status: PurchaseOrderStatus
    note?: string
}

export interface PurchaseOrder extends BaseEntity {
    orderNo: string
    supplierName: string
    supplierId: string // 引用供应商 ID
    status: PurchaseOrderStatus
    amount: number
    orderDate: string
    expectedDate: string
    purchaser: string // 采购员
    currency: string
    exchangeRate?: number
    paymentTerm?: string
    note?: string
    lines: PurchaseOrderLine[]
    workflowInstanceId?: string // 统一工作流引擎桥接关键链
    isDeleted: boolean
    version: number // SDRTS 乐观锁
}

export { purchaseOrderStatuses }
