import type { SalesOrder, SalesOrderLine } from '../../data/schema'
import type { SalesOrderApiDTO, SalesOrderLineApiDTO, SalesOrderListPageApiDTO } from '../contracts/sales-order-api-dto'

export interface PaginatedSalesOrders {
  items: SalesOrder[]
  total: number
  page: number
  pageSize: number
}

function toSalesOrderLineContract(dto: SalesOrderLineApiDTO): SalesOrderLine {
  return {
    id: dto.id,
    lineNo: dto.lineNo,
    productId: dto.productId,
    productModel: dto.productModel,
    productCode: dto.productCode,
    specification: dto.specification,
    description: dto.description,
    qty: dto.qty,
    uom: dto.uom,
    price: dto.price,
    amount: dto.amount,
    deliveredQty: dto.deliveredQty,
    customerPartNo: dto.customerPartNo,
    jobNo: dto.jobNo,
    note: dto.note,
    drillingPlanId: dto.drillingPlanId,
    labelingPlanId: dto.labelingPlanId,
    holeCount: dto.holeCount,
    route: dto.route,
    orderDate: dto.orderDate,
    status: dto.status as SalesOrderLine['status'],
    claimedBy: dto.claimedBy,
    claimedAt: dto.claimedAt,
  }
}

function toSalesOrderLineApiDTO(line: SalesOrderLine): SalesOrderLineApiDTO {
  return {
    id: line.id,
    lineNo: line.lineNo,
    productId: line.productId,
    productModel: line.productModel,
    productCode: line.productCode,
    specification: line.specification,
    description: line.description,
    qty: line.qty,
    uom: line.uom,
    price: line.price,
    amount: line.amount,
    deliveredQty: line.deliveredQty,
    customerPartNo: line.customerPartNo,
    jobNo: line.jobNo,
    note: line.note,
    drillingPlanId: line.drillingPlanId,
    labelingPlanId: line.labelingPlanId,
    holeCount: line.holeCount,
    route: line.route,
    orderDate: line.orderDate,
    status: line.status,
    claimedBy: line.claimedBy,
    claimedAt: line.claimedAt,
  }
}

export function toSalesOrderContract(dto: SalesOrderApiDTO): SalesOrder {
  return {
    id: dto.id,
    orderNo: dto.orderNo,
    orderName: dto.orderName,
    customerName: dto.customerName,
    customerId: dto.customerId,
    type: dto.type,
    currency: dto.currency,
    classification: dto.classification,
    status: dto.status as SalesOrder['status'],
    statusNote: dto.statusNote,
    amount: dto.amount,
    quantity: dto.quantity,
    orderDate: dto.orderDate,
    deliveryDate: dto.deliveryDate,
    paymentMethod: dto.paymentMethod,
    paymentMethodName: dto.paymentMethodName,
    paymentTerm: dto.paymentTerm,
    paymentTermName: dto.paymentTermName,
    purchaseOrderNo: dto.purchaseOrderNo,
    barcode: dto.barcode,
    requirements: dto.requirements,
    workflowInstanceId: dto.workflowInstanceId,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    updatedBy: dto.updatedBy,
    isDeleted: dto.isDeleted,
    version: dto._v ?? 1,
    lines: (dto.lines ?? []).map(toSalesOrderLineContract),
  }
}

export function toSalesOrderApiDTO(order: SalesOrder): SalesOrderApiDTO {
  return {
    id: order.id,
    orderNo: order.orderNo,
    orderName: order.orderName,
    customerName: order.customerName,
    customerId: order.customerId,
    type: order.type,
    currency: order.currency,
    classification: order.classification,
    status: order.status,
    statusNote: order.statusNote,
    amount: order.amount,
    quantity: order.quantity,
    orderDate: order.orderDate,
    deliveryDate: order.deliveryDate,
    paymentMethod: order.paymentMethod,
    paymentMethodName: order.paymentMethodName,
    paymentTerm: order.paymentTerm,
    paymentTermName: order.paymentTermName,
    purchaseOrderNo: order.purchaseOrderNo,
    barcode: order.barcode,
    requirements: order.requirements,
    workflowInstanceId: order.workflowInstanceId,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    updatedBy: order.updatedBy,
    isDeleted: order.isDeleted,
    _v: order.version,
    lines: (order.lines ?? []).map(toSalesOrderLineApiDTO),
  }
}

export function toSalesOrderContracts(items: SalesOrderApiDTO[]): SalesOrder[] {
  return items.map(toSalesOrderContract)
}

export function toSalesOrderListPageContract(dto: SalesOrderListPageApiDTO): PaginatedSalesOrders {
  return {
    items: toSalesOrderContracts(dto.items ?? []),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
  }
}
