import type { PurchaseOrder, PurchaseOrderLine } from '../../data/schema'
import { normalizePurchaseOrderStatus } from '../../data/purchase-status'
import type { ConfirmPurchaseReceiptResponseApiDTO, PurchaseOrderApiDTO, PurchaseOrderLineApiDTO, PurchaseOrderListPageApiDTO } from '../contracts/purchase-order-api-dto'

export interface PaginatedPurchaseOrders {
  items: PurchaseOrder[]
  total: number
  page: number
  pageSize: number
}

export interface ConfirmPurchaseReceiptContract {
  purchaseOrder: PurchaseOrder
  createdInboundRecords: Array<{ id: string }>
}

function normalizePurchaseOrderLineStatus(status: PurchaseOrderLineApiDTO['status']): PurchaseOrderLine['status'] {
  return normalizePurchaseOrderStatus(status)
}

function toPurchaseOrderLineContract(dto: PurchaseOrderLineApiDTO): PurchaseOrderLine {
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

function toPurchaseOrderLineApiDTO(line: PurchaseOrderLine): PurchaseOrderLineApiDTO {
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

export function toPurchaseOrderContract(dto: PurchaseOrderApiDTO): PurchaseOrder {
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
    exchangeRate: dto.exchangeRate,
    paymentMethod: dto.paymentMethod,
    paymentMethodName: dto.paymentMethodName,
    paymentTerm: dto.paymentTerm,
    paymentTermName: dto.paymentTermName,
    note: dto.note,
    workflowInstanceId: dto.workflowInstanceId,
    isDeleted: dto.isDeleted,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    version: dto.version,
    evidences: dto.evidences,
    lines: (dto.lines ?? []).map(toPurchaseOrderLineContract),
  }
}

export function toPurchaseOrderApiDTO(order: PurchaseOrder): PurchaseOrderApiDTO {
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
    workflowInstanceId: order.workflowInstanceId,
    isDeleted: order.isDeleted,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    version: order.version,
    evidences: order.evidences,
    lines: order.lines.map(toPurchaseOrderLineApiDTO),
  }
}

export function toPurchaseOrderContracts(items: PurchaseOrderApiDTO[]): PurchaseOrder[] {
  return items.map(toPurchaseOrderContract)
}

export function toPurchaseOrderListPageContract(dto: PurchaseOrderListPageApiDTO): PaginatedPurchaseOrders {
  return {
    items: toPurchaseOrderContracts(dto.items),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
  }
}

export function toConfirmPurchaseReceiptContract(dto: ConfirmPurchaseReceiptResponseApiDTO): ConfirmPurchaseReceiptContract {
  return {
    purchaseOrder: toPurchaseOrderContract(dto.purchaseOrder),
    createdInboundRecords: dto.createdInboundRecords,
  }
}
