import { apiFetch } from '@/lib/api-client'
import { isApiClientError } from '@/lib/api-error'
import {
  ensureArrayResponse,
  ensureArrayField,
  ensureNumberField,
  ensureObjectResponse,
} from '@/lib/api-response'
import type { OrderEvidence, SalesOrder } from '../../data/schema'
import { toSalesOrderContract } from '../adapters/sales-order-api-adapter'
import {
  type CreateSalesReturnPayload,
  type CreateSalesReturnResponseApiDTO,
  type PatchSalesReturnActualAmountEntryPayload,
  type PatchSalesReturnPayload,
  type PatchSalesReturnLogisticsPayload,
  type SalesReturnActualAmountRecordApiDTO,
  type SalesReturnApiDTO,
  type SalesReturnLineApiDTO,
  type SalesReturnListPageApiDTO,
} from '../contracts/sales-return-api-dto'

export interface SalesReturnLine {
  id: number
  salesOrderLineId: number
  lineNo: number
  productId: string
  productCode: string
  productModel: string
  specification: string
  productDisplayTitleSnapshot?: string
  productDisplaySubtitleSnapshot?: string
  productDisplayCodeSnapshot?: string
  productDisplayFullLabelSnapshot?: string
  productDisplayStrategyVersionSnapshot?: string
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
  actualReturnAmount: number
  actualReturnAmountNote?: string
  actualReturnAmountEvidences?: OrderEvidence[]
  actualReturnAmountRecordedAt?: string
  actualReturnAmountRecordedBy?: string
  evidences?: OrderEvidence[]
  operator?: string
  totalQuantity: number
  totalAmount: number
  createdAt: string
  updatedAt: string
  lines: SalesReturnLine[]
}

export interface SalesReturnActualAmountRecord {
  id: string
  salesReturnId: string
  salesOrderId: string
  salesOrderNo: string
  returnNo: string
  customerId: string
  customerName: string
  amount: number
  note?: string
  evidences?: OrderEvidence[]
  estimatedReturnAmountSnapshot: number
  recordedAt: string
  recordedBy: string
  createdAt: string
  updatedAt: string
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
    productDisplayTitleSnapshot: dto.productDisplayTitleSnapshot,
    productDisplaySubtitleSnapshot: dto.productDisplaySubtitleSnapshot,
    productDisplayCodeSnapshot: dto.productDisplayCodeSnapshot,
    productDisplayFullLabelSnapshot: dto.productDisplayFullLabelSnapshot,
    productDisplayStrategyVersionSnapshot: dto.productDisplayStrategyVersionSnapshot,
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

function toSalesReturnActualAmountRecordContract(
  dto: SalesReturnActualAmountRecordApiDTO
): SalesReturnActualAmountRecord {
  return {
    id: dto.id,
    salesReturnId: dto.salesReturnId,
    salesOrderId: dto.salesOrderId,
    salesOrderNo: dto.salesOrderNo,
    returnNo: dto.returnNo,
    customerId: dto.customerId,
    customerName: dto.customerName,
    amount: dto.amount,
    note: dto.note,
    evidences: dto.evidences ?? [],
    estimatedReturnAmountSnapshot: dto.estimatedReturnAmountSnapshot,
    recordedAt: dto.recordedAt,
    recordedBy: dto.recordedBy,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
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
    actualReturnAmount: dto.actualReturnAmount,
    actualReturnAmountNote: dto.actualReturnAmountNote,
    actualReturnAmountEvidences: dto.actualReturnAmountEvidences ?? [],
    actualReturnAmountRecordedAt: dto.actualReturnAmountRecordedAt ?? undefined,
    actualReturnAmountRecordedBy: dto.actualReturnAmountRecordedBy,
    evidences: dto.evidences ?? [],
    operator: dto.operator,
    totalQuantity: dto.totalQuantity,
    totalAmount: dto.totalAmount,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    lines: ensureArrayField<SalesReturnLineApiDTO>(
      dto,
      'lines',
      'SalesReturnService.toSalesReturnContract'
    ).map(toSalesReturnLineContract),
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
    total: ensureNumberField(dto, 'total', 'SalesReturnService.getSalesReturns'),
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
  const res = await apiFetch<Record<string, unknown>>(`/sales-returns/${id}`, {
    suppressErrorStatuses: [404],
  })
  const dto = ensureObjectResponse<SalesReturnApiDTO & Record<string, unknown>>(
    res,
    'SalesReturnService.getSalesReturnById'
  )
  return toSalesReturnContract(dto)
}

export async function deleteSalesReturn(id: string): Promise<void> {
  await apiFetch<void>(`/sales-returns/${id}`, {
    method: 'DELETE',
  })
}

export async function getSalesReturnActualAmountRecords(
  id: string
): Promise<SalesReturnActualAmountRecord[]> {
  try {
    const res = await apiFetch<Record<string, unknown>>(
      `/sales-returns/${id}/actual-amount-records`,
      {
        suppressErrorStatuses: [404],
      }
    )
    return ensureArrayResponse<SalesReturnActualAmountRecordApiDTO>(
      res,
      'SalesReturnService.getSalesReturnActualAmountRecords'
    ).map(toSalesReturnActualAmountRecordContract)
  } catch (error) {
    if (isApiClientError(error) && error.status === 404) {
      return []
    }
    throw error
  }
}

export async function patchSalesReturnActualAmountEntry(
  id: string,
  payload: PatchSalesReturnActualAmountEntryPayload
): Promise<SalesReturnRecord> {
  const res = await apiFetch<Record<string, unknown>>(
    `/sales-returns/${id}/actual-amount`,
    {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }
  )
  const dto = ensureObjectResponse<SalesReturnApiDTO & Record<string, unknown>>(
    res,
    'SalesReturnService.patchSalesReturnActualAmountEntry'
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

export async function patchSalesReturn(
  id: string,
  payload: PatchSalesReturnPayload
): Promise<SalesReturnRecord> {
  const res = await apiFetch<Record<string, unknown>>(`/sales-returns/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  const dto = ensureObjectResponse<SalesReturnApiDTO & Record<string, unknown>>(
    res,
    'SalesReturnService.patchSalesReturn'
  )
  return toSalesReturnContract(dto)
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
