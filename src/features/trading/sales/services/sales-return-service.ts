import { apiFetch } from '@/lib/api-client'
import {
  ensureArrayField,
  ensureNumberField,
  ensureObjectResponse,
} from '@/lib/api-response'
import type { OrderEvidence, SalesOrder } from '../../data/schema'
import { toSalesOrderContract } from '../adapters/sales-order-api-adapter'
import {
  type CreateSalesReturnPayload,
  type CreateSalesReturnResponseApiDTO,
  type PatchSalesReturnLogisticsPayload,
  type SalesReturnApiDTO,
  type SalesReturnLineApiDTO,
  type SalesReturnListPageApiDTO,
  type SalesReturnTransportMode,
} from '../contracts/sales-return-api-dto'

export interface SalesReturnLine {
  id: number
  salesOrderLineId: number
  lineNo: number
  productId: string
  productCode: string
  productModel: string
  specification: string
  description: string
  uom: string
  quantity: number
  price: number
  amount: number
  issueCategory?: string
  reason?: string
  evidences?: OrderEvidence[]
}

export interface SalesReturnRecord {
  id: string
  returnNo: string
  salesOrderId: string
  salesOrderNo: string
  customerId: string
  customerName: string
  status: string
  transportMode: SalesReturnTransportMode
  trackingNo?: string
  carrier?: string
  shippedAt?: string
  trackingFilledAt?: string
  trackingFilledBy?: string
  logisticsNote?: string
  pendingTrackingFill: boolean
  returnDate: string
  issueCategory?: string
  reason?: string
  remarks?: string
  evidences?: OrderEvidence[]
  operator?: string
  totalQuantity: number
  totalAmount: number
  createdAt: string
  updatedAt: string
  lines: SalesReturnLine[]
}

export interface PaginatedSalesReturns {
  items: SalesReturnRecord[]
  total: number
  page: number
  pageSize: number
}

export interface GetSalesReturnsOptions {
  page?: number
  pageSize?: number
  customerId?: string
  status?: string
  keyword?: string
}

export interface CreateSalesReturnResponse {
  salesReturn: SalesReturnRecord
  salesOrder: SalesOrder
}

function toSalesReturnLineContract(
  dto: SalesReturnLineApiDTO
): SalesReturnLine {
  return {
    id: dto.id,
    salesOrderLineId: dto.salesOrderLineId,
    lineNo: dto.lineNo,
    productId: dto.productId,
    productCode: dto.productCode,
    productModel: dto.productModel,
    specification: dto.specification,
    description: dto.description,
    uom: dto.uom,
    quantity: dto.quantity,
    price: dto.price,
    amount: dto.amount,
    issueCategory: dto.issueCategory,
    reason: dto.reason,
    evidences: dto.evidences ?? [],
  }
}

function toSalesReturnContract(dto: SalesReturnApiDTO): SalesReturnRecord {
  return {
    id: dto.id,
    returnNo: dto.returnNo,
    salesOrderId: dto.salesOrderId,
    salesOrderNo: dto.salesOrderNo,
    customerId: dto.customerId,
    customerName: dto.customerName,
    status: dto.status,
    transportMode: dto.transportMode,
    trackingNo: dto.trackingNo,
    carrier: dto.carrier,
    shippedAt: dto.shippedAt ?? undefined,
    trackingFilledAt: dto.trackingFilledAt ?? undefined,
    trackingFilledBy: dto.trackingFilledBy,
    logisticsNote: dto.logisticsNote,
    pendingTrackingFill: dto.pendingTrackingFill,
    returnDate: dto.returnDate,
    issueCategory: dto.issueCategory,
    reason: dto.reason,
    remarks: dto.remarks,
    evidences: dto.evidences ?? [],
    operator: dto.operator,
    totalQuantity: dto.totalQuantity,
    totalAmount: dto.totalAmount,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    lines: (dto.lines ?? []).map(toSalesReturnLineContract),
  }
}

export async function getSalesReturns(
  options: GetSalesReturnsOptions = {}
): Promise<PaginatedSalesReturns> {
  const { page = 1, pageSize = 50, customerId, status, keyword } = options
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })

  if (customerId) {
    params.set('customerId', customerId)
  }
  if (status && status !== 'all') {
    params.set('status', status)
  }
  if (keyword && keyword.trim().length > 0) {
    params.set('keyword', keyword.trim())
  }

  const res = await apiFetch<Record<string, unknown>>(
    `/sales-returns?${params.toString()}`
  )
  const dto = ensureObjectResponse<
    SalesReturnListPageApiDTO & Record<string, unknown>
  >(res, 'SalesReturnService.getSalesReturns')

  return {
    items: ensureArrayField<SalesReturnApiDTO>(
      dto,
      'items',
      'SalesReturnService.getSalesReturns'
    ).map(toSalesReturnContract),
    total: ensureNumberField(
      dto,
      'total',
      'SalesReturnService.getSalesReturns'
    ),
    page: ensureNumberField(dto, 'page', 'SalesReturnService.getSalesReturns'),
    pageSize: ensureNumberField(
      dto,
      'pageSize',
      'SalesReturnService.getSalesReturns'
    ),
  }
}

export async function getSalesReturnById(
  id: string
): Promise<SalesReturnRecord> {
  const res = await apiFetch<Record<string, unknown>>(`/sales-returns/${id}`)
  const dto = ensureObjectResponse<SalesReturnApiDTO & Record<string, unknown>>(
    res,
    'SalesReturnService.getSalesReturnById'
  )
  return toSalesReturnContract(dto)
}

export async function createSalesReturn(
  salesOrderId: string,
  payload: CreateSalesReturnPayload
): Promise<CreateSalesReturnResponse> {
  const res = await apiFetch<CreateSalesReturnResponseApiDTO>(
    `/sales-orders/${salesOrderId}/returns`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
  const dto = ensureObjectResponse<
    CreateSalesReturnResponseApiDTO & Record<string, unknown>
  >(res, 'SalesReturnService.createSalesReturn')

  return {
    salesReturn: toSalesReturnContract(dto.salesReturn),
    salesOrder: toSalesOrderContract(dto.salesOrder),
  }
}

export async function patchSalesReturnLogistics(
  id: string,
  payload: PatchSalesReturnLogisticsPayload
): Promise<SalesReturnRecord> {
  const res = await apiFetch<Record<string, unknown>>(
    `/sales-returns/${id}/logistics`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  )
  const dto = ensureObjectResponse<SalesReturnApiDTO & Record<string, unknown>>(
    res,
    'SalesReturnService.patchSalesReturnLogistics'
  )
  return toSalesReturnContract(dto)
}
