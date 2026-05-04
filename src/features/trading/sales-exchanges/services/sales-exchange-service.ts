import { apiFetch } from '@/lib/api-client'
import {
  ensureArrayField,
  ensureNumberField,
  ensureObjectResponse,
} from '@/lib/api-response'
import type { SalesOrder } from '@/features/trading/data/schema'
import type {
  SalesExchangeDraftRecord,
  SalesExchangeLineDraft,
  SalesExchangeRecognizedLabelCode,
  SalesExchangeUnmatchedLabelCode,
} from '../types/sales-exchange-types'
import type {
  ConfirmSalesExchangeOldItemInboundPayload,
  ConfirmSalesExchangeOldItemInboundResponseApiDTO,
  CreateSalesExchangePayload,
  CreateSalesExchangeResponseApiDTO,
  SalesExchangeApiDTO,
  SalesExchangeLineApiDTO,
  SalesExchangeListPageApiDTO,
  SalesExchangeRecognizedLabelApiDTO,
  SalesExchangeUnmatchedLabelApiDTO,
} from '../contracts/sales-exchange-api-dto'

export interface PaginatedSalesExchanges {
  items: SalesExchangeDraftRecord[]
  total: number
  page: number
  pageSize: number
}

export interface GetSalesExchangesOptions {
  page?: number
  pageSize?: number
  customerId?: string
  status?: string
  keyword?: string
}

export interface CreateSalesExchangeResponse {
  salesExchange: SalesExchangeDraftRecord
  salesOrder: SalesOrder
}

export interface ConfirmSalesExchangeOldItemInboundResponse {
  salesExchange: SalesExchangeDraftRecord
  createdInboundRecords: unknown[]
}

function encodeSalesExchangePathSegment(value: string) {
  return encodeURIComponent(value.trim())
}

function toSalesExchangeDateInputValue(value?: string | null) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString().slice(0, 10)
}

function toRecognizedLabelContract(
  dto: SalesExchangeRecognizedLabelApiDTO
): SalesExchangeRecognizedLabelCode {
  return {
    rawLabelCode: dto.rawLabelCode,
    normalizedLabelCode: dto.normalizedLabelCode,
    recognizedAt: dto.recognizedAt,
    recognitionSource: dto.recognitionSource,
  }
}

function toUnmatchedLabelContract(
  dto: SalesExchangeUnmatchedLabelApiDTO
): SalesExchangeUnmatchedLabelCode {
  return {
    ...toRecognizedLabelContract(dto),
    unmatchedReason: dto.unmatchedReason,
  }
}

function toSalesExchangeLineContract(
  dto: SalesExchangeLineApiDTO
): SalesExchangeLineDraft {
  return {
    lineDraftId: dto.lineDraftId,
    salesOrderLineId: dto.salesOrderLineId,
    lineNo: dto.lineNo,
    productId: dto.productId,
    productCode: dto.productCode,
    productModel: dto.productModel,
    specification: dto.specification,
    description: dto.description,
    uom: dto.uom,
    originalOrderQuantity: dto.originalOrderQuantity,
    deliveredQuantity: dto.deliveredQuantity,
    exchangeQuantity: dto.exchangeQuantity,
    replacementMode: dto.replacementMode,
    replacementProductCode: dto.replacementProductCode,
    replacementProductModel: dto.replacementProductModel,
    issueCategory: dto.issueCategory,
    issueDescription: dto.issueDescription,
    recognizedLabelCodes: ensureArrayField<SalesExchangeRecognizedLabelApiDTO>(
      dto,
      'recognizedLabelCodes',
      'SalesExchangeService.toSalesExchangeLineContract'
    ).map(toRecognizedLabelContract),
  }
}

function toSalesExchangeContract(
  dto: SalesExchangeApiDTO
): SalesExchangeDraftRecord {
  return {
    id: dto.id,
    exchangeNo: dto.exchangeNo,
    sourceSalesOrderId: dto.sourceSalesOrderId,
    sourceSalesOrderNo: dto.sourceSalesOrderNo,
    customerId: dto.customerId,
    customerName: dto.customerName,
    status: dto.status,
    exchangeDate: toSalesExchangeDateInputValue(dto.exchangeDate),
    expectedReplacementDate: toSalesExchangeDateInputValue(
      dto.expectedReplacementDate
    ),
    receivedOldItemTrackingNo: dto.receivedOldItemTrackingNo,
    replacementTrackingNo: dto.replacementTrackingNo,
    exchangeReason: dto.exchangeReason,
    exchangeRemarks: dto.exchangeRemarks,
    evidences: [],
    totalExchangeQuantity: dto.totalExchangeQuantity,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    lines: ensureArrayField<SalesExchangeLineApiDTO>(
      dto,
      'lines',
      'SalesExchangeService.toSalesExchangeContract'
    ).map(toSalesExchangeLineContract),
    unmatchedLabelCodes: ensureArrayField<SalesExchangeUnmatchedLabelApiDTO>(
      dto,
      'unmatchedLabelCodes',
      'SalesExchangeService.toSalesExchangeContract'
    ).map(toUnmatchedLabelContract),
  }
}

export function toCreateSalesExchangePayload(input: {
  lineDrafts: SalesExchangeLineDraft[]
  unmatchedLabelCodes: SalesExchangeUnmatchedLabelCode[]
  exchangeDate: string
  expectedReplacementDate: string
  receivedOldItemTrackingNo: string
  replacementTrackingNo: string
  exchangeReason: string
  exchangeRemarks: string
}): CreateSalesExchangePayload {
  return {
    exchangeDate: input.exchangeDate,
    expectedReplacementDate: input.expectedReplacementDate,
    receivedOldItemTrackingNo: input.receivedOldItemTrackingNo,
    replacementTrackingNo: input.replacementTrackingNo,
    exchangeReason: input.exchangeReason,
    exchangeRemarks: input.exchangeRemarks,
    lines: input.lineDrafts.map((lineDraft) => ({
      salesOrderLineId: lineDraft.salesOrderLineId,
      exchangeQuantity: lineDraft.exchangeQuantity,
      replacementMode: lineDraft.replacementMode,
      replacementProductCode: lineDraft.replacementProductCode,
      replacementProductModel: lineDraft.replacementProductModel,
      issueCategory: lineDraft.issueCategory,
      issueDescription: lineDraft.issueDescription,
      recognizedLabelCodes: lineDraft.recognizedLabelCodes,
    })),
    unmatchedLabelCodes: input.unmatchedLabelCodes,
  }
}

export async function getSalesExchanges(
  options: GetSalesExchangesOptions = {}
): Promise<PaginatedSalesExchanges> {
  const { page = 1, pageSize = 50, customerId, status, keyword } = options
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })
  if (customerId) params.set('customerId', customerId)
  if (status && status !== 'all') params.set('status', status)
  if (keyword && keyword.trim().length > 0) params.set('keyword', keyword.trim())

  const response = ensureObjectResponse<
    SalesExchangeListPageApiDTO & Record<string, unknown>
  >(
    await apiFetch<Record<string, unknown>>(
      `/sales-exchanges?${params.toString()}`
    ),
    'SalesExchangeService.getSalesExchanges'
  )

  return {
    items: ensureArrayField<SalesExchangeApiDTO>(
      response,
      'items',
      'SalesExchangeService.getSalesExchanges'
    ).map(toSalesExchangeContract),
    total: ensureNumberField(
      response,
      'total',
      'SalesExchangeService.getSalesExchanges'
    ),
    page: ensureNumberField(
      response,
      'page',
      'SalesExchangeService.getSalesExchanges'
    ),
    pageSize: ensureNumberField(
      response,
      'pageSize',
      'SalesExchangeService.getSalesExchanges'
    ),
  }
}

export async function getSalesExchangeById(
  id: string
): Promise<SalesExchangeDraftRecord> {
  const response = ensureObjectResponse<
    SalesExchangeApiDTO & Record<string, unknown>
  >(
    await apiFetch<Record<string, unknown>>(
      `/sales-exchanges/${encodeSalesExchangePathSegment(id)}`
    ),
    'SalesExchangeService.getSalesExchangeById'
  )
  return toSalesExchangeContract(response)
}

export async function createSalesExchange(
  salesOrderId: string,
  payload: CreateSalesExchangePayload
): Promise<CreateSalesExchangeResponse> {
  const response = ensureObjectResponse<
    CreateSalesExchangeResponseApiDTO & Record<string, unknown>
  >(
    await apiFetch<CreateSalesExchangeResponseApiDTO>(
      `/sales-orders/${encodeSalesExchangePathSegment(salesOrderId)}/exchanges`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
    'SalesExchangeService.createSalesExchange'
  )

  return {
    salesExchange: toSalesExchangeContract(response.salesExchange),
    salesOrder: response.salesOrder,
  }
}

export async function deleteSalesExchange(id: string): Promise<void> {
  await apiFetch<void>(
    `/sales-exchanges/${encodeSalesExchangePathSegment(id)}`,
    { method: 'DELETE' }
  )
}

export async function confirmSalesExchangeOldItemInbound(
  id: string,
  payload: ConfirmSalesExchangeOldItemInboundPayload
): Promise<ConfirmSalesExchangeOldItemInboundResponse> {
  const response = ensureObjectResponse<
    ConfirmSalesExchangeOldItemInboundResponseApiDTO & Record<string, unknown>
  >(
    await apiFetch<ConfirmSalesExchangeOldItemInboundResponseApiDTO>(
      `/sales-exchanges/${encodeSalesExchangePathSegment(id)}/old-item-inbound`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
    'SalesExchangeService.confirmSalesExchangeOldItemInbound'
  )

  return {
    salesExchange: toSalesExchangeContract(response.salesExchange),
    createdInboundRecords: ensureArrayField<unknown>(
      response,
      'createdInboundRecords',
      'SalesExchangeService.confirmSalesExchangeOldItemInbound'
    ),
  }
}
