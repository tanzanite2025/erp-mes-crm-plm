import { apiFetch } from '@/lib/api-client'
import { ensureArrayField, ensureObjectResponse } from '@/lib/api-response'
import { CuttingPlanService } from '@/features/engineering-db/services/cutting-plan-service'
import { type SalesOrder } from '@/features/trading/data/schema'
import { getSalesOrders } from '@/features/trading/sales/services/sales-query-service'
import type {
  CuttingIssuanceExecutionRecord,
  CuttingIssuanceOrder,
  CuttingIssuanceOrderLine,
  CuttingIssuanceTemplate,
  CuttingIssuanceTraceReport,
} from './types'

const SALES_ORDER_PAGE_SIZE = 100
const MAX_SALES_ORDER_PAGE = 200
const EXECUTION_LIST_PAGE_SIZE = 500
const CUTTING_ISSUANCE_EXECUTIONS_ENDPOINT = '/production/cutting-issuances'
const CUTTING_ISSUANCE_TRACE_REPORT_ENDPOINT =
  '/production/cutting-issuances/trace-report'

type CuttingIssuanceExecutionApiDTO = {
  id?: string
  orderNo?: string
  salesOrderLineNo?: number
  productModel?: string
  holeCount?: number
  templateName?: string
  totalLineQuantity?: number
  status?: string
  createdAt?: string
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
    totalLineQuantity?: number
    earliestCreatedAt?: string
    latestCreatedAt?: string
  }
  byStatus?: Array<{
    status?: string
    executionCount?: number
    totalLineQuantity?: number
  }>
  byModel?: Array<{
    productModel?: string
    holeCount?: number
    executionCount?: number
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

type CreateCuttingIssuanceExecutionParams = {
  order: CuttingIssuanceOrder
  line: CuttingIssuanceOrderLine
  template: CuttingIssuanceTemplate
}

function parseHoleCount(raw: unknown): number {
  const asNumber =
    typeof raw === 'number'
      ? raw
      : Number.parseInt(String(raw ?? '').trim(), 10)
  return Number.isFinite(asNumber) ? Math.max(0, asNumber) : 0
}

function toOrderLine(
  line: SalesOrder['lines'][number]
): CuttingIssuanceOrderLine | null {
  const requestedQuantity = Number.isFinite(line.qty) ? line.qty : 0
  if (requestedQuantity <= 0) {
    return null
  }

  return {
    lineNo: Number.isFinite(line.lineNo) ? line.lineNo : 0,
    productModel: (line.productModel || '').trim(),
    productCode: (line.productCode || '').trim(),
    productId: line.productId,
    holeCount: parseHoleCount(line.holeCount),
    requestedQuantity,
  }
}

function toOrderOption(order: SalesOrder): CuttingIssuanceOrder | null {
  const lines = order.lines
    .map(toOrderLine)
    .filter((line): line is CuttingIssuanceOrderLine =>
      Boolean(line && line.productModel)
    )
    .sort((left, right) => left.lineNo - right.lineNo)

  if (lines.length === 0) {
    return null
  }

  return {
    id: order.id,
    orderNo: order.orderNo,
    customerName: order.customerName,
    deliveryDate: order.deliveryDate,
    lines,
  }
}

async function loadAllSchedulableSalesOrders(): Promise<SalesOrder[]> {
  const items: SalesOrder[] = []

  for (let page = 1; page <= MAX_SALES_ORDER_PAGE; page += 1) {
    const response = await getSalesOrders({
      page,
      pageSize: SALES_ORDER_PAGE_SIZE,
      withLines: true,
      status: ['Draft', 'Pending', 'InProgress'],
    })

    items.push(...response.items)
    const totalPages = Math.max(
      1,
      Math.ceil(response.total / SALES_ORDER_PAGE_SIZE)
    )
    if (
      response.items.length === 0 ||
      page >= totalPages ||
      items.length >= response.total
    ) {
      break
    }
  }

  return items
}

function mapExecutionItem(
  item: CuttingIssuanceExecutionApiDTO
): CuttingIssuanceExecutionRecord | null {
  if (!item.id) {
    return null
  }

  return {
    id: item.id,
    orderNo: item.orderNo || '',
    lineNo: Number(item.salesOrderLineNo || 0),
    productModel: item.productModel || '',
    holeCount: Number(item.holeCount || 0),
    templateName: item.templateName || '',
    totalLineQuantity: Number(item.totalLineQuantity || 0),
    status: item.status || '',
    createdAt: item.createdAt || '',
  }
}

function buildExecutionCreatePayload(
  params: CreateCuttingIssuanceExecutionParams
): CreateCuttingIssuanceExecutionRequest {
  return {
    orderNo: params.order.orderNo,
    orderId: params.order.id,
    salesOrderLineNo: params.line.lineNo,
    productModel: params.line.productModel,
    productCode: params.line.productCode || '',
    productId: params.line.productId || '',
    holeCount: params.line.holeCount,
    templateId: params.template.id,
    templateName: params.template.planName,
    templateVersion: params.template.version,
    quantity: params.line.requestedQuantity,
    totalLineQuantity:
      params.line.requestedQuantity * params.template.templateLineCount,
    status: 'SCHEDULED',
    batches: [],
  }
}

function mapTraceReport(
  raw: CuttingIssuanceTraceReportApiDTO
): CuttingIssuanceTraceReport {
  const summary = raw.summary || {}
  const byStatus = Array.isArray(raw.byStatus) ? raw.byStatus : []
  const byModel = Array.isArray(raw.byModel) ? raw.byModel : []

  return {
    summary: {
      executionCount: Number(summary.executionCount || 0),
      orderCount: Number(summary.orderCount || 0),
      batchCount: Number(summary.batchCount || 0),
      totalLineQuantity: Number(summary.totalLineQuantity || 0),
      earliestCreatedAt: summary.earliestCreatedAt || '',
      latestCreatedAt: summary.latestCreatedAt || '',
    },
    byStatus: byStatus.map((item) => ({
      status: item.status || '',
      executionCount: Number(item.executionCount || 0),
      totalLineQuantity: Number(item.totalLineQuantity || 0),
    })),
    byModel: byModel.map((item) => ({
      productModel: item.productModel || '',
      holeCount: Number(item.holeCount || 0),
      executionCount: Number(item.executionCount || 0),
      totalLineQuantity: Number(item.totalLineQuantity || 0),
    })),
  }
}

export async function getCuttingIssuanceOrders(): Promise<
  CuttingIssuanceOrder[]
> {
  const orders = await loadAllSchedulableSalesOrders()

  return orders
    .map(toOrderOption)
    .filter((item): item is CuttingIssuanceOrder => Boolean(item))
}

export async function getCuttingIssuanceTemplates(): Promise<
  CuttingIssuanceTemplate[]
> {
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
      templateLineCount: plan.lines.length,
      updatedAt: plan.createdAt || '',
    }))
    .filter((item) => item.productModel && item.templateLineCount > 0)
}

export async function listCuttingIssuanceExecutions(): Promise<
  CuttingIssuanceExecutionRecord[]
> {
  const response = await apiFetch<unknown>(
    `${CUTTING_ISSUANCE_EXECUTIONS_ENDPOINT}?page=1&pageSize=${EXECUTION_LIST_PAGE_SIZE}`
  )
  const page = ensureObjectResponse<
    CuttingIssuanceExecutionListApiDTO & Record<string, unknown>
  >(response, 'CuttingIssuanceService.listCuttingIssuanceExecutions')
  const items = ensureArrayField<CuttingIssuanceExecutionApiDTO>(
    page,
    'items',
    'CuttingIssuanceService.listCuttingIssuanceExecutions'
  )

  return items
    .map(mapExecutionItem)
    .filter((item): item is CuttingIssuanceExecutionRecord => Boolean(item))
}

export async function getCuttingIssuanceTraceReport(): Promise<CuttingIssuanceTraceReport> {
  const response = await apiFetch<unknown>(
    CUTTING_ISSUANCE_TRACE_REPORT_ENDPOINT
  )
  const report = ensureObjectResponse<
    CuttingIssuanceTraceReportApiDTO & Record<string, unknown>
  >(response, 'CuttingIssuanceService.getCuttingIssuanceTraceReport')
  return mapTraceReport(report)
}

export async function createCuttingIssuanceExecution(
  params: CreateCuttingIssuanceExecutionParams
): Promise<CuttingIssuanceExecutionRecord> {
  const response = await apiFetch<unknown>(
    CUTTING_ISSUANCE_EXECUTIONS_ENDPOINT,
    {
      method: 'POST',
      body: JSON.stringify(buildExecutionCreatePayload(params)),
    }
  )

  const item = ensureObjectResponse<
    CuttingIssuanceExecutionApiDTO & Record<string, unknown>
  >(response, 'CuttingIssuanceService.createCuttingIssuanceExecution')
  const mapped = mapExecutionItem(item)
  if (!mapped) {
    throw new Error('CUTTING_ISSUANCE_RESPONSE_MISSING_ID')
  }
  return mapped
}
