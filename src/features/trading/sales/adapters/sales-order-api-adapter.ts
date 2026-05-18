import type { SalesOrder, SalesOrderLine } from '../../data/schema'
import type {
  SalesOrderApiDTO,
  SalesOrderLineApiDTO,
  SalesOrderListPageApiDTO,
} from '../contracts/sales-order-api-dto'
import { ensureArrayField } from '@/lib/api-response'

export interface PaginatedSalesOrders {
  items: SalesOrder[]
  total: number
  page: number
  pageSize: number
}

function normalizeApiStatus(status: string): string {
  return status.trim().toLowerCase().replace(/[\s_-]/g, '')
}

function normalizeSalesOrderLineStatus(
  status: SalesOrderLineApiDTO['status']
): SalesOrderLine['status'] {
  const normalizedStatus = normalizeApiStatus(status)

  if (normalizedStatus === 'inprogress') {
    return 'InProgress'
  }
  if (normalizedStatus === 'scheduling' || normalizedStatus === 'scheduled') {
    return 'Scheduling'
  }
  if (normalizedStatus === 'completed' || normalizedStatus === 'done') {
    return 'Done'
  }
  if (normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
    return 'Canceled'
  }
  return 'Pending'
}

function toSalesOrderLineContract(dto: SalesOrderLineApiDTO): SalesOrderLine {
  return {
    id: dto.id,
    lineNo: dto.lineNo,
    productId: dto.productId,
    productModel: dto.productModel,
    productCode: dto.productCode,
    specification: dto.specification,
    engineeringSpecNameSnapshot: dto.engineeringSpecNameSnapshot ?? '',
    productDisplayTitleSnapshot: dto.productDisplayTitleSnapshot ?? '',
    productDisplaySubtitleSnapshot: dto.productDisplaySubtitleSnapshot ?? '',
    productDisplayCodeSnapshot: dto.productDisplayCodeSnapshot ?? '',
    productDisplayFullLabelSnapshot: dto.productDisplayFullLabelSnapshot ?? '',
    productDisplayStrategyVersionSnapshot: dto.productDisplayStrategyVersionSnapshot ?? '',
    modelCodeSnapshot: dto.modelCodeSnapshot,
    holePrefixSnapshot: dto.holePrefixSnapshot,
    appearanceId: dto.appearanceId,
    appearanceNameSnapshot: dto.appearanceNameSnapshot,
    appearanceBarcodeCodeSnapshot: dto.appearanceBarcodeCodeSnapshot,
    appearanceDescriptionSnapshot: dto.appearanceDescriptionSnapshot,
    appearanceImageUrlSnapshot: dto.appearanceImageUrlSnapshot,
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
    drillingPlanNameSnapshot: dto.drillingPlanNameSnapshot,
    labelingPlanId: dto.labelingPlanId,
    labelingPlanNameSnapshot: dto.labelingPlanNameSnapshot,
    holeCount: dto.holeCount,
    route: dto.route,
    orderDate: dto.orderDate,
    status: normalizeSalesOrderLineStatus(dto.status),
    claimedBy: dto.claimedBy,
    claimedAt: dto.claimedAt,
    selectedPackaging: dto.selectedPackaging,
    returnedQuantity: dto.returnedQuantity,
    remainingReturnableQuantity: dto.remainingReturnableQuantity,
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
    engineeringSpecNameSnapshot: line.engineeringSpecNameSnapshot,
    productDisplayTitleSnapshot: line.productDisplayTitleSnapshot,
    productDisplaySubtitleSnapshot: line.productDisplaySubtitleSnapshot,
    productDisplayCodeSnapshot: line.productDisplayCodeSnapshot,
    productDisplayFullLabelSnapshot: line.productDisplayFullLabelSnapshot,
    productDisplayStrategyVersionSnapshot: line.productDisplayStrategyVersionSnapshot,
    modelCodeSnapshot: line.modelCodeSnapshot,
    holePrefixSnapshot: line.holePrefixSnapshot,
    appearanceId: line.appearanceId,
    appearanceNameSnapshot: line.appearanceNameSnapshot,
    appearanceBarcodeCodeSnapshot: line.appearanceBarcodeCodeSnapshot,
    appearanceDescriptionSnapshot: line.appearanceDescriptionSnapshot,
    appearanceImageUrlSnapshot: line.appearanceImageUrlSnapshot,
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
    drillingPlanNameSnapshot: line.drillingPlanNameSnapshot,
    labelingPlanId: line.labelingPlanId,
    labelingPlanNameSnapshot: line.labelingPlanNameSnapshot,
    holeCount: line.holeCount,
    route: line.route,
    orderDate: line.orderDate,
    status: line.status,
    claimedBy: line.claimedBy,
    claimedAt: line.claimedAt,
    selectedPackaging: line.selectedPackaging,
    returnedQuantity: line.returnedQuantity,
    remainingReturnableQuantity: line.remainingReturnableQuantity,
  }
}

function normalizeSalesOrderStatus(
  status: SalesOrderApiDTO['status']
): SalesOrder['status'] {
  const normalizedStatus = normalizeApiStatus(status)

  if (normalizedStatus === 'draft') {
    return 'Draft'
  }
  if (normalizedStatus === 'completed' || normalizedStatus === 'done') {
    return 'Done'
  }
  if (normalizedStatus === 'cancelled' || normalizedStatus === 'canceled') {
    return 'Canceled'
  }
  if (
    normalizedStatus === 'confirmed' ||
    normalizedStatus === 'shipped' ||
    normalizedStatus === 'inprogress'
  ) {
    return 'InProgress'
  }
  if (normalizedStatus === 'scheduling' || normalizedStatus === 'scheduled') {
    return 'Scheduling'
  }
  return 'Pending'
}

function requireSalesOrderArrayField<T>(
  value: unknown,
  fieldName: string,
  context: string,
): T[] {
  return ensureArrayField<T>(value, fieldName, context)
}

type SalesOrderBaseDTO = SalesOrderApiDTO | SalesOrderListPageApiDTO['items'][number]

function toSalesOrderBaseContract(
  dto: SalesOrderBaseDTO,
  context: string,
): Omit<SalesOrder, 'lines'> {
  return {
    id: dto.id,
    orderNo: dto.orderNo,
    orderName: dto.orderName,
    customerName: dto.customerName,
    customerId: dto.customerId,
    type: dto.type,
    currency: dto.currency,
    exchangeRateSnapshot: dto.exchangeRateSnapshot ?? 1,
    classification: dto.classification,
    status: normalizeSalesOrderStatus(dto.status),
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
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    updatedBy: dto.updatedBy,
    isDeleted: dto.isDeleted ?? false,
    version: dto.version ?? 1,
    evidences: requireSalesOrderArrayField(dto, 'evidences', context),
    fulfillmentRate: dto.fulfillmentRate,
    availableActions: requireSalesOrderArrayField(dto, 'availableActions', context),
  }
}

function toSalesOrderListItemContract(
  dto: SalesOrderListPageApiDTO['items'][number],
  options: { withLines: boolean },
): SalesOrder {
  const context = 'SalesOrderApiAdapter.toSalesOrderListItemContract'
  const base = toSalesOrderBaseContract(dto, context)

  if (options.withLines) {
    return {
      ...base,
      lines: requireSalesOrderArrayField<SalesOrderLineApiDTO>(dto, 'lines', context).map(
        toSalesOrderLineContract,
      ),
    }
  }

  return {
    ...base,
    lines: Array.isArray(dto.lines) ? dto.lines.map(toSalesOrderLineContract) : [],
  }
}

export function toSalesOrderContract(dto: SalesOrderApiDTO): SalesOrder {
  const context = 'SalesOrderApiAdapter.toSalesOrderContract'
  return {
    ...toSalesOrderBaseContract(dto, context),
    lines: requireSalesOrderArrayField<SalesOrderLineApiDTO>(dto, 'lines', context).map(
      toSalesOrderLineContract
    ),
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
    exchangeRateSnapshot: order.exchangeRateSnapshot ?? 1,
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
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    updatedBy: order.updatedBy,
    isDeleted: order.isDeleted,
    version: order.version,
    evidences: order.evidences,
    availableActions: order.availableActions,
    lines: requireSalesOrderArrayField<SalesOrderLine>(order, 'lines', 'SalesOrderApiAdapter.toSalesOrderApiDTO').map(
      toSalesOrderLineApiDTO
    ),
  }
}

export function toSalesOrderListPageContract(
  dto: SalesOrderListPageApiDTO,
  options: { withLines: boolean },
): PaginatedSalesOrders {
  return {
    items: dto.items.map((item) => toSalesOrderListItemContract(item, options)),
    total: dto.total,
    page: dto.page,
    pageSize: dto.pageSize,
  }
}
