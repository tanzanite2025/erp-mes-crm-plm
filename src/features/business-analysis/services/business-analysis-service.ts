import { apiFetch } from '@/lib/api-client'

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
}
