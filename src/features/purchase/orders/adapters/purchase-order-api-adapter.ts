import { ensureArrayField } from '@/lib/api-response'
import { normalizePurchaseOrderStatus } from '../data/purchase-status'
import type {
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseOrderListItem,
} from '../data/schema'
import type {
  ConfirmPurchaseReceiptResponseApiDTO,
  PurchaseOrderApiDTO,
  PurchaseOrderLineApiDTO,
  PurchaseOrderListItemWithLinesApiDTO,
  PurchaseOrderListPageApiDTO,
} from '../contracts/purchase-order-api-dto'

export interface PaginatedPurchaseOrders {
  items: PurchaseOrder[]
  total: number
  page: number
  pageSize: number
}

export interface PaginatedPurchaseOrderListItems {
  items: PurchaseOrderListItem[]
  total: number
  page: number
  pageSize: number
}

export interface ConfirmPurchaseReceiptContract {
  purchaseOrder: PurchaseOrder
  createdInboundRecords: Array<{ id: string }>
}

function normalizePurchaseOrderLineStatus(
  status: PurchaseOrderLineApiDTO['status']
): PurchaseOrderLine['status'] {
  return normalizePurchaseOrderStatus(status)
}

function toPurchaseOrderLineContract(
  dto: PurchaseOrderLineApiDTO
): PurchaseOrderLine {
  return {
    id: dto.id,
    version: dto.version,
    lineNo: dto.lineNo,
    materialId: dto.materialId,
    materialName: dto.materialName,
    materialCode: dto.materialCode,
    specification: dto.specification,
    qty: dto.qty,
    uom: dto.uom,
    price: dto.price,
    amount: dto.amount,
    expectedDate: dto.expectedDate,
    receivedQty: dto.receivedQty,
    returnedQty: dto.returnedQty ?? 0,
    status: normalizePurchaseOrderLineStatus(dto.status),
    note: dto.note,
  }
}

function toPurchaseOrderLineApiDTO(
  line: PurchaseOrderLine
): PurchaseOrderLineApiDTO {
  return {
    id: line.id,
    version: line.version,
    lineNo: line.lineNo,
    materialId: line.materialId,
    materialName: line.materialName,
    materialCode: line.materialCode,
    specification: line.specification,
    qty: line.qty,
    uom: line.uom,
    price: line.price,
    amount: line.amount,
    expectedDate: line.expectedDate,
    receivedQty: line.receivedQty,
    returnedQty: line.returnedQty,
    status: line.status,
    note: line.note,
  }
}

function toPurchaseOrderListItemContract(
  dto: PurchaseOrderApiDTO | PurchaseOrderListPageApiDTO['items'][number]
): PurchaseOrderListItem {
  return {
    id: dto.id,
    orderNo: dto.orderNo,
    supplierName: dto.supplierName,
    supplierId: dto.supplierId,
    status: normalizePurchaseOrderStatus(dto.status),
    amount: dto.amount,
    orderDate: dto.orderDate,
    expectedDate: dto.expectedDate,
    purchaser: dto.purchaser,
    currency: dto.currency,
    exchangeRate: dto.exchangeRate ?? 1,
    paymentMethod: dto.paymentMethod,
    paymentMethodName: dto.paymentMethodName,
    paymentTerm: dto.paymentTerm,
    paymentTermName: dto.paymentTermName,
    note: dto.note,
    isDeleted: dto.isDeleted ?? false,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    version: dto.version ?? 1,
    evidences: dto.evidences,
  }
}

export function toPurchaseOrderContract(
  dto: PurchaseOrderApiDTO
): PurchaseOrder {
  return {
    ...toPurchaseOrderListItemContract(dto),
    lines: ensureArrayField<PurchaseOrderLineApiDTO>(
      dto,
      'lines',
      'PurchaseOrderApiAdapter.toPurchaseOrderContract'
    ).map(toPurchaseOrderLineContract),
  }
}

export function toPurchaseOrderApiDTO(
  order: PurchaseOrder
): PurchaseOrderApiDTO {
  return {
    id: order.id,
    orderNo: order.orderNo,
    supplierName: order.supplierName,
    supplierId: order.supplierId,
    status: order.status,
    amount: order.amount,
    orderDate: order.orderDate,
    expectedDate: order.expectedDate,
    purchaser: order.purchaser,
    currency: order.currency,
    exchangeRate: order.exchangeRate,
    paymentMethod: order.paymentMethod,
    paymentMethodName: order.paymentMethodName,
    paymentTerm: order.paymentTerm,
    paymentTermName: order.paymentTermName,
    note: order.note,
    isDeleted: order.isDeleted,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    version: order.version,
    evidences: order.evidences,
    lines: order.lines.map(toPurchaseOrderLineApiDTO),
  }
}

export function toPurchaseOrderContracts(
  items: PurchaseOrderApiDTO[]
): PurchaseOrder[] {
  return items.map(toPurchaseOrderContract)
}

export function toPurchaseOrderListItems(
  items: PurchaseOrderListPageApiDTO['items']
): PurchaseOrderListItem[] {
  return items.map(toPurchaseOrderListItemContract)
}

export function toPurchaseOrderListPageContract(
  dto: PurchaseOrderListPageApiDTO
): PaginatedPurchaseOrderListItems {
  return {
    items: toPurchaseOrderListItems(dto.items),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
  }
}

export function toPurchaseOrderListPageWithLinesContract(dto: {
  items: PurchaseOrderListItemWithLinesApiDTO[]
  total: number
  page: number
  pageSize: number
}): PaginatedPurchaseOrders {
  return {
    items: dto.items.map((item) => toPurchaseOrderContract(item)),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
  }
}

export function toConfirmPurchaseReceiptContract(
  dto: ConfirmPurchaseReceiptResponseApiDTO
): ConfirmPurchaseReceiptContract {
  return {
    purchaseOrder: toPurchaseOrderContract(dto.purchaseOrder),
    createdInboundRecords: dto.createdInboundRecords,
  }
}
