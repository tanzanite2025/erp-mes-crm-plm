import type {
  OutsourceOrderApiDTO,
  OutsourceOrderLineApiDTO,
} from '../contracts/outsource-order-api-dto'
import {
  createEmptyOutsourceOrderForm,
  type OutsourceOrder,
  type OutsourceOrderFormValues,
  type OutsourceOrderLine,
  type OutsourceOrderLineFormValues,
  type OutsourceOrderSourceType,
  type OutsourceOrderStatus,
} from '../data/outsource-order'

function normalizeSourceType(sourceType: unknown): OutsourceOrderSourceType {
  if (sourceType === 'PRODUCTION_PLAN' || sourceType === 'MANUAL') {
    return sourceType
  }
  return 'SALES_ORDER'
}

function normalizeStatus(status: unknown): OutsourceOrderStatus {
  if (
    status === 'RELEASED' ||
    status === 'SENT' ||
    status === 'IN_PROCESS' ||
    status === 'RETURNED' ||
    status === 'CLOSED' ||
    status === 'CANCELED'
  ) {
    return status
  }
  return 'DRAFT'
}

function toOutsourceOrderLineContract(
  dto: OutsourceOrderLineApiDTO
): OutsourceOrderLine {
  return {
    id: String(dto.id ?? ''),
    createdAt: String(dto.createdAt ?? ''),
    updatedAt: String(dto.updatedAt ?? ''),
    outsourceOrderId: String(dto.outsourceOrderId ?? ''),
    lineNo: Number(dto.lineNo ?? 1),
    sourceLineId: String(dto.sourceLineId ?? ''),
    productId: String(dto.productId ?? ''),
    productCode: String(dto.productCode ?? ''),
    productName: String(dto.productName ?? ''),
    specification: String(dto.specification ?? ''),
    quantity: Number(dto.quantity ?? 0),
    uom: String(dto.uom ?? 'PCS'),
    segmentId: String(dto.segmentId ?? ''),
    segmentName: String(dto.segmentName ?? ''),
    processStepId: String(dto.processStepId ?? ''),
    processCode: String(dto.processCode ?? ''),
    processName: String(dto.processName ?? ''),
    status: normalizeStatus(dto.status),
    notes: String(dto.notes ?? ''),
    version: Number(dto.version ?? 1),
  }
}

export function toOutsourceOrderContract(
  dto: OutsourceOrderApiDTO
): OutsourceOrder {
  return {
    id: String(dto.id ?? ''),
    createdAt: String(dto.createdAt ?? ''),
    updatedAt: String(dto.updatedAt ?? ''),
    orderNo: String(dto.orderNo ?? ''),
    sourceType: normalizeSourceType(dto.sourceType),
    sourceId: String(dto.sourceId ?? ''),
    sourceNo: String(dto.sourceNo ?? ''),
    customerId: String(dto.customerId ?? ''),
    customerName: String(dto.customerName ?? ''),
    partnerId: String(dto.partnerId ?? ''),
    partnerNameSnapshot: String(dto.partnerNameSnapshot ?? ''),
    status: normalizeStatus(dto.status),
    plannedSendDate: String(dto.plannedSendDate ?? ''),
    plannedReturnDate: String(dto.plannedReturnDate ?? ''),
    totalQuantity: Number(dto.totalQuantity ?? 0),
    uom: String(dto.uom ?? 'PCS'),
    notes: String(dto.notes ?? ''),
    operator: String(dto.operator ?? ''),
    version: Number(dto.version ?? 1),
    lines: Array.isArray(dto.lines)
      ? dto.lines.map(toOutsourceOrderLineContract)
      : [],
  }
}

export function toOutsourceOrderContracts(
  dtos: OutsourceOrderApiDTO[]
): OutsourceOrder[] {
  return dtos.map(toOutsourceOrderContract)
}

function toOutsourceOrderLineApiDTO(
  line: OutsourceOrderLineFormValues,
  index: number,
  orderStatus: OutsourceOrderStatus,
  currentLine?: OutsourceOrderLine
): OutsourceOrderLineApiDTO {
  return {
    id: line.id ?? currentLine?.id ?? '',
    outsourceOrderId: currentLine?.outsourceOrderId ?? '',
    lineNo: index + 1,
    sourceLineId: line.sourceLineId,
    productId: line.productId,
    productCode: line.productCode,
    productName: line.productName,
    specification: line.specification,
    quantity: line.quantity,
    uom: line.uom,
    segmentId: line.segmentId,
    segmentName: line.segmentName,
    processStepId: line.processStepId,
    processCode: line.processCode,
    processName: line.processName,
    status: line.status ?? currentLine?.status ?? orderStatus,
    notes: line.notes,
    version: currentLine?.version ?? 1,
  }
}

export function toOutsourceOrderApiDTO(
  values: OutsourceOrderFormValues,
  current?: OutsourceOrder
): OutsourceOrderApiDTO {
  const currentLineById = new Map(
    (current?.lines ?? []).map((line) => [line.id, line])
  )
  const lines = values.lines.map((line, index) =>
    toOutsourceOrderLineApiDTO(
      line,
      index,
      values.status,
      line.id ? currentLineById.get(line.id) : undefined
    )
  )

  return {
    id: current?.id ?? '',
    createdAt: current?.createdAt ?? '',
    updatedAt: current?.updatedAt ?? '',
    orderNo: values.orderNo,
    sourceType: values.sourceType,
    sourceId: values.sourceId,
    sourceNo: values.sourceNo,
    customerId: values.customerId,
    customerName: values.customerName,
    partnerId: values.partnerId,
    status: values.status,
    plannedSendDate: values.plannedSendDate,
    plannedReturnDate: values.plannedReturnDate,
    notes: values.notes,
    version: current?.version ?? 1,
    lines,
  }
}

export function toOutsourceOrderFormValues(
  order: OutsourceOrder | null
): OutsourceOrderFormValues {
  if (!order) {
    return createEmptyOutsourceOrderForm()
  }
  return {
    orderNo: order.orderNo,
    sourceType: order.sourceType,
    sourceId: order.sourceId,
    sourceNo: order.sourceNo,
    customerId: order.customerId,
    customerName: order.customerName,
    partnerId: order.partnerId,
    status: order.status,
    plannedSendDate: order.plannedSendDate,
    plannedReturnDate: order.plannedReturnDate,
    notes: order.notes,
    lines: order.lines.map((line) => ({
      id: line.id,
      sourceLineId: line.sourceLineId,
      productId: line.productId,
      productCode: line.productCode,
      productName: line.productName,
      specification: line.specification,
      quantity: line.quantity,
      uom: line.uom,
      segmentId: line.segmentId,
      segmentName: line.segmentName,
      processStepId: line.processStepId,
      processCode: line.processCode,
      processName: line.processName,
      status: line.status,
      notes: line.notes,
    })),
  }
}
