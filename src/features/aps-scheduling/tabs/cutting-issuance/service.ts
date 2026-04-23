import { CuttingPlanService } from '@/features/engineering-db/services/cutting-plan-service'
import { type SalesOrder } from '@/features/trading/data/schema'
import { getSalesOrders } from '@/features/trading/sales/services/sales-query-service'
import { apiFetch } from '@/lib/api-client'
import { ensureArrayField, ensureObjectResponse } from '@/lib/api-response'
import { buildCuttingIssuancePreview } from './planner'
import type {
  CuttingIssuanceExecutionFilters,
  CuttingIssuanceExecutionRecord,
  CuttingIssuanceOrder,
  CuttingIssuanceOrderLine,
  CuttingIssuanceTraceReport,
  CuttingIssuanceTemplate,
} from './types'

const SALES_ORDER_PAGE_SIZE = 100
const MAX_SALES_ORDER_PAGE = 200

type CuttingIssuanceExecutionApiDTO = {
  id?: string
  productionPlanId?: string
  orderNo?: string
  orderId?: string
  salesOrderLineNo?: number
  productModel?: string
  productCode?: string
  holeCount?: number
  templateId?: string
  templateName?: string
  templateVersion?: string
  quantity?: number
  totalLineQuantity?: number
  status?: string
  source?: string
  createdAt?: string
  updatedAt?: string
  batches?: Array<{
    batchNo?: number
    rimQuantity?: number
    lineQuantity?: number
  }>
}

type CuttingIssuanceExecutionListApiDTO = {
  items?: CuttingIssuanceExecutionApiDTO[]
  total?: number
  page?: number
  pageSize?: number
}

type CuttingIssuanceTraceReportApiDTO = {
  summary?: {
    executionCount?: number
    orderCount?: number
    batchCount?: number
    totalRimQuantity?: number
    totalLineQuantity?: number
    earliestCreatedAt?: string
    latestCreatedAt?: string
  }
  byStatus?: Array<{
    status?: string
    executionCount?: number
    totalRimQuantity?: number
    totalLineQuantity?: number
  }>
  byModel?: Array<{
    productModel?: string
    holeCount?: number
    executionCount?: number
    totalRimQuantity?: number
    totalLineQuantity?: number
  }>
}

type CreateCuttingIssuanceExecutionRequest = {
  orderNo: string
  orderId: string
  salesOrderLineNo: number
  productModel: string
  productCode: string
  productId: string
  holeCount: number
  templateId: string
  templateName: string
  templateVersion: string
  quantity: number
  totalLineQuantity: number
  status: string
  batches: Array<{
    batchNo: number
    rimQuantity: number
    lineQuantity: number
  }>
}

function parseHoleCount(raw: unknown): number {
  const asNumber = typeof raw === 'number' ? raw : Number.parseInt(String(raw ?? '').trim(), 10)
  return Number.isFinite(asNumber) ? Math.max(0, asNumber) : 0
}

function toOrderLine(line: SalesOrder['lines'][number]): CuttingIssuanceOrderLine | null {
  const qty = Number.isFinite(line.qty) ? line.qty : 0
  if (qty <= 0) {
    return null
  }

  return {
    lineNo: Number.isFinite(line.lineNo) ? line.lineNo : 0,
    productModel: (line.productModel || '').trim(),
    productCode: (line.productCode || '').trim(),
    productId: line.productId,
    holeCount: parseHoleCount(line.holeCount),
    quantity: qty,
  }
}

function toOrderOption(order: SalesOrder): CuttingIssuanceOrder | null {
  const lines = order.lines
    .map(toOrderLine)
    .filter((line): line is CuttingIssuanceOrderLine => Boolean(line && line.productModel))
    .sort((left, right) => left.lineNo - right.lineNo)

  if (lines.length === 0) {
    return null
  }

  return {
    id: order.id,
    orderNo: order.orderNo,
    customerName: order.customerName,
    deliveryDate: order.deliveryDate,
    status: order.status,
    lines,
  }
}

async function loadAllActiveSalesOrders(): Promise<SalesOrder[]> {
  const items: SalesOrder[] = []

  for (let page = 1; page <= MAX_SALES_ORDER_PAGE; page += 1) {
    const response = await getSalesOrders({
      page,
      pageSize: SALES_ORDER_PAGE_SIZE,
      withLines: true,
      status: ['Draft', 'Pending', 'InProgress'],
    })

    items.push(...response.items)
    const totalPages = Math.max(1, Math.ceil(response.total / SALES_ORDER_PAGE_SIZE))
    if (response.items.length === 0 || page >= totalPages || items.length >= response.total) {
      break
    }
  }

  return items
}

export async function getCuttingIssuanceOrders(): Promise<CuttingIssuanceOrder[]> {
  const orders = await loadAllActiveSalesOrders()

  return orders
    .map(toOrderOption)
    .filter((item): item is CuttingIssuanceOrder => Boolean(item))
}

export async function getCuttingIssuanceTemplates(): Promise<CuttingIssuanceTemplate[]> {
  const plans = await CuttingPlanService.list()

  return plans
    .filter((plan) => plan.status === 'Active')
    .map((plan) => ({
      id: plan.id,
      planName: plan.name,
      productModel: (plan.productName || plan.productCode || '').trim(),
      productCode: (plan.productCode || '').trim(),
      holeCount: parseHoleCount(plan.holeCount),
      version: plan.revisionNo || `v${plan.version || 1}`,
      lineCountPerRim: plan.lines.length,
      status: plan.status,
      updatedAt: plan.createdAt || '',
    }))
    .filter((item) => item.productModel && item.lineCountPerRim > 0)
}

function mapExecutionItem(item: CuttingIssuanceExecutionApiDTO): CuttingIssuanceExecutionRecord | null {
  if (!item.id) {
    return null
  }

  return {
    id: item.id,
    productionPlanId: item.productionPlanId || '',
    orderNo: item.orderNo || '',
    lineNo: Number(item.salesOrderLineNo || 0),
    productModel: item.productModel || '',
    holeCount: Number(item.holeCount || 0),
    templateName: item.templateName || '',
    quantity: Number(item.quantity || 0),
    totalLineQuantity: Number(item.totalLineQuantity || 0),
    batchCount: Array.isArray(item.batches) ? item.batches.length : 0,
    status: item.status || '',
    createdAt: item.createdAt || '',
  }
}

function buildCuttingIssuanceQueryString(filters?: CuttingIssuanceExecutionFilters): string {
  const query = new URLSearchParams()
  if (!filters) {
    return query.toString()
  }
  if (filters.orderNo) {
    query.set('orderNo', filters.orderNo.trim())
  }
  if (filters.status) {
    query.set('status', filters.status.trim())
  }
  if (filters.productModel) {
    query.set('productModel', filters.productModel.trim())
  }
  if (typeof filters.holeCount === 'number' && Number.isFinite(filters.holeCount)) {
    query.set('holeCount', String(Math.max(0, Math.trunc(filters.holeCount))))
  }
  if (filters.createdAtFrom) {
    query.set('createdAtFrom', filters.createdAtFrom.trim())
  }
  if (filters.createdAtTo) {
    query.set('createdAtTo', filters.createdAtTo.trim())
  }
  return query.toString()
}

function buildCuttingIssuanceListQueryString(filters?: CuttingIssuanceExecutionFilters): string {
  const query = new URLSearchParams()
  query.set('page', '1')
  query.set('pageSize', '500')
  const filterQuery = buildCuttingIssuanceQueryString(filters)
  if (filterQuery) {
    const params = new URLSearchParams(filterQuery)
    for (const [key, value] of params.entries()) {
      query.set(key, value)
    }
  }
  return query.toString()
}

function mapTraceReport(raw: CuttingIssuanceTraceReportApiDTO): CuttingIssuanceTraceReport {
  const summary = raw.summary || {}
  const byStatus = Array.isArray(raw.byStatus) ? raw.byStatus : []
  const byModel = Array.isArray(raw.byModel) ? raw.byModel : []

  return {
    summary: {
      executionCount: Number(summary.executionCount || 0),
      orderCount: Number(summary.orderCount || 0),
      batchCount: Number(summary.batchCount || 0),
      totalRimQuantity: Number(summary.totalRimQuantity || 0),
      totalLineQuantity: Number(summary.totalLineQuantity || 0),
      earliestCreatedAt: summary.earliestCreatedAt || '',
      latestCreatedAt: summary.latestCreatedAt || '',
    },
    byStatus: byStatus.map((item) => ({
      status: item.status || '',
      executionCount: Number(item.executionCount || 0),
      totalRimQuantity: Number(item.totalRimQuantity || 0),
      totalLineQuantity: Number(item.totalLineQuantity || 0),
    })),
    byModel: byModel.map((item) => ({
      productModel: item.productModel || '',
      holeCount: Number(item.holeCount || 0),
      executionCount: Number(item.executionCount || 0),
      totalRimQuantity: Number(item.totalRimQuantity || 0),
      totalLineQuantity: Number(item.totalLineQuantity || 0),
    })),
  }
}

export async function listCuttingIssuanceExecutions(
  filters?: CuttingIssuanceExecutionFilters,
): Promise<CuttingIssuanceExecutionRecord[]> {
  const query = buildCuttingIssuanceListQueryString(filters)
  const response = await apiFetch<unknown>(`/production/cutting-issuances?${query}`)
  const page = ensureObjectResponse<CuttingIssuanceExecutionListApiDTO & Record<string, unknown>>(
    response,
    'CuttingIssuanceService.listCuttingIssuanceExecutions',
  )
  const items = ensureArrayField<CuttingIssuanceExecutionApiDTO>(
    page,
    'items',
    'CuttingIssuanceService.listCuttingIssuanceExecutions',
  )

  return items
    .map(mapExecutionItem)
    .filter((item): item is CuttingIssuanceExecutionRecord => Boolean(item))
}

export async function getCuttingIssuanceTraceReport(
  filters?: CuttingIssuanceExecutionFilters,
): Promise<CuttingIssuanceTraceReport> {
  const query = buildCuttingIssuanceQueryString(filters)
  const endpoint = query
    ? `/production/cutting-issuances/trace-report?${query}`
    : '/production/cutting-issuances/trace-report'
  const response = await apiFetch<unknown>(endpoint)
  const report = ensureObjectResponse<CuttingIssuanceTraceReportApiDTO & Record<string, unknown>>(
    response,
    'CuttingIssuanceService.getCuttingIssuanceTraceReport',
  )
  return mapTraceReport(report)
}

export async function createCuttingIssuanceExecution(params: {
  order: CuttingIssuanceOrder
  line: CuttingIssuanceOrderLine
  template: CuttingIssuanceTemplate
  preferredBatchSize: number
}): Promise<CuttingIssuanceExecutionRecord> {
  const preview = buildCuttingIssuancePreview(
    params.order,
    params.line,
    params.template,
    params.preferredBatchSize,
  )

  if (!preview) {
    throw new Error('Unable to build cutting issuance preview')
  }

  const payload: CreateCuttingIssuanceExecutionRequest = {
    orderNo: preview.order.orderNo,
    orderId: preview.order.id,
    salesOrderLineNo: preview.line.lineNo,
    productModel: preview.line.productModel,
    productCode: preview.line.productCode || '',
    productId: preview.line.productId || '',
    holeCount: preview.line.holeCount,
    templateId: preview.template.id,
    templateName: preview.template.planName,
    templateVersion: preview.template.version,
    quantity: preview.totalRimQuantity,
    totalLineQuantity: preview.totalLineQuantity,
    status: 'SCHEDULED',
    batches: preview.batches.map((batch) => ({
      batchNo: batch.batchNo,
      rimQuantity: batch.rimQuantity,
      lineQuantity: batch.lineQuantity,
    })),
  }

  const response = await apiFetch<unknown>('/production/cutting-issuances', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  const item = ensureObjectResponse<CuttingIssuanceExecutionApiDTO & Record<string, unknown>>(
    response,
    'CuttingIssuanceService.createCuttingIssuanceExecution',
  )
  const mapped = mapExecutionItem(item)
  if (!mapped) {
    throw new Error('Cutting issuance response missing id')
  }
  return mapped
}
