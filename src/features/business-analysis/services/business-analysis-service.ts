import { apiFetch } from '@/lib/api-client'
import { createApiClientError } from '@/lib/api-error'
import { useAuthStore } from '@/stores/auth-store'

export type BusinessAnalysisProductionCapacityQuery = {
  from: string
  to: string
  customerId?: string
  productId?: string
  status?: string
  includeCanceled?: boolean
}

export type BusinessAnalysisSummary = {
  plannedQuantity: number
  completedQuantity: number
  qualifiedQuantity: number | null
  scrapQuantity: number | null
  achievementRate: number | null
  yieldRate: number | null
  scrapRate: number | null
}

export type BusinessAnalysisProductBreakdown = {
  productId: string
  productName: string
  plannedQuantity: number
  completedQuantity: number
}

export type BusinessAnalysisCustomerBreakdown = {
  customerId: string
  customerName: string
  plannedQuantity: number
  completedQuantity: number
}

export type BusinessAnalysisDayBreakdown = {
  date: string
  plannedQuantity: number
  completedQuantity: number
}

export type BusinessAnalysisProductionCapacityResponse = {
  filters: BusinessAnalysisProductionCapacityQuery
  summary: BusinessAnalysisSummary
  breakdowns: {
    byProduct: BusinessAnalysisProductBreakdown[]
    byCustomer: BusinessAnalysisCustomerBreakdown[]
    byDay: BusinessAnalysisDayBreakdown[]
  }
  dataQuality: {
    qualityScrapRecordCount: number
    unlinkedQualityRecords: number
    missingQuantityRecords: number
    missingOccurrenceTimestampRecords: number
    missingCompletionTimestampRecords: number
    unlinkedProductionOrderRecords: number
    qualityQuantityAvailable: boolean
    qualityProductionLinkageAvailable: boolean
    isComplete: boolean
    notes: string[]
  }
}

export type BusinessAnalysisFilterOption = {
  id: string
  label: string
  code?: string
}

export type BusinessAnalysisProductionCapacityOptionsResponse = {
  customers: BusinessAnalysisFilterOption[]
  products: BusinessAnalysisFilterOption[]
}

export type BusinessAnalysisProductionCapacityDrilldownQuery =
  BusinessAnalysisProductionCapacityQuery & {
    dimension: 'product' | 'customer'
    value: string
  }

export type BusinessAnalysisProductionCapacityTaskDetail = {
  taskId: string
  batchNo: string
  processId: string
  processName: string
  status: string
  targetQuantity: number
  actualQuantity: number
  startedAt: string | null
  completedAt: string | null
}

export type BusinessAnalysisProductionCapacityPlanDetail = {
  planId: string
  orderNo: string
  productId: string
  productName: string
  customerId: string
  customerName: string
  plannedQuantity: number
  completedQuantity: number
  status: string
  planDate: string
  tasks: BusinessAnalysisProductionCapacityTaskDetail[]
}

export type BusinessAnalysisProductionCapacityDrilldownResponse = {
  filters: BusinessAnalysisProductionCapacityQuery
  dimension: 'product' | 'customer'
  value: string
  items: BusinessAnalysisProductionCapacityPlanDetail[]
}

type BusinessAnalysisDownloadFile = {
  blob: Blob
  fileName: string
}

function buildQueryString(query: BusinessAnalysisProductionCapacityQuery) {
  const params = new URLSearchParams()
  params.set('from', query.from)
  params.set('to', query.to)
  if (query.customerId) params.set('customerId', query.customerId)
  if (query.productId) params.set('productId', query.productId)
  if (query.status) params.set('status', query.status)
  if (query.includeCanceled) params.set('includeCanceled', 'true')
  return params.toString()
}

function buildDrilldownQueryString(
  query: BusinessAnalysisProductionCapacityDrilldownQuery
) {
  const params = new URLSearchParams(buildQueryString(query))
  params.set('dimension', query.dimension)
  params.set('value', query.value)
  return params.toString()
}

function businessAnalysisAPIBaseURL() {
  return import.meta.env.VITE_API_BASE_URL || ''
}

function fallbackProductionCapacityCSVFileName(
  query: BusinessAnalysisProductionCapacityQuery
) {
  return `business-analysis-production-capacity_${query.from}_${query.to}.csv`
}

function contentDispositionFileName(
  disposition: string | null,
  fallback: string
) {
  if (!disposition) return fallback

  const encodedFileName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (encodedFileName) {
    return decodeURIComponent(encodedFileName.trim())
  }

  const plainFileName = disposition.match(/filename="?([^";]+)"?/i)?.[1]
  return plainFileName?.trim() || fallback
}

async function businessAnalysisDownloadError(
  endpoint: string,
  response: Response
) {
  const errorData = await response.json().catch(() => ({}))
  const errorMessage =
    (errorData as { error?: string; message?: string }).error ||
    (errorData as { error?: string; message?: string }).message ||
    `[API_ERROR] ${response.status} ${response.statusText}`

  return createApiClientError({
    kind: 'http',
    message: errorMessage,
    endpoint,
    status: response.status,
    details: {
      statusText: response.statusText,
      errorData,
    },
  })
}

async function fetchBusinessAnalysisCSV(
  endpoint: string,
  fallbackFileName: string
): Promise<BusinessAnalysisDownloadFile> {
  const token = useAuthStore.getState().accessToken
  if (!token) {
    throw createApiClientError({
      kind: 'auth_required',
      message: `[AUTH_REQUIRED] Unauthenticated API request blocked: ${endpoint}`,
      endpoint,
    })
  }

  const response = await fetch(
    `${businessAnalysisAPIBaseURL()}/api/v1${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    }
  )

  if (!response.ok) {
    throw await businessAnalysisDownloadError(endpoint, response)
  }

  return {
    blob: await response.blob(),
    fileName: contentDispositionFileName(
      response.headers.get('Content-Disposition'),
      fallbackFileName
    ),
  }
}

function saveBusinessAnalysisBlobFile(file: BusinessAnalysisDownloadFile) {
  const objectURL = URL.createObjectURL(file.blob)
  const anchor = document.createElement('a')
  anchor.href = objectURL
  anchor.download = file.fileName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectURL), 0)
}

export const BusinessAnalysisService = {
  getProductionCapacity(
    query: BusinessAnalysisProductionCapacityQuery
  ): Promise<BusinessAnalysisProductionCapacityResponse> {
    return apiFetch<BusinessAnalysisProductionCapacityResponse>(
      `/business-analysis/production-capacity?${buildQueryString(query)}`
    )
  },

  getProductionCapacityOptions(): Promise<BusinessAnalysisProductionCapacityOptionsResponse> {
    return apiFetch<BusinessAnalysisProductionCapacityOptionsResponse>(
      '/business-analysis/production-capacity/options'
    )
  },

  getProductionCapacityDrilldown(
    query: BusinessAnalysisProductionCapacityDrilldownQuery
  ): Promise<BusinessAnalysisProductionCapacityDrilldownResponse> {
    return apiFetch<BusinessAnalysisProductionCapacityDrilldownResponse>(
      `/business-analysis/production-capacity/drilldown?${buildDrilldownQueryString(query)}`
    )
  },

  async downloadProductionCapacityCSV(
    query: BusinessAnalysisProductionCapacityQuery
  ): Promise<void> {
    const endpoint = `/business-analysis/production-capacity/export?${buildQueryString(query)}`
    const file = await fetchBusinessAnalysisCSV(
      endpoint,
      fallbackProductionCapacityCSVFileName(query)
    )
    saveBusinessAnalysisBlobFile(file)
  },
}
