import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import {
  parseBOMVersionRecordDetail,
  parseBOMVersionRecordList,
  type BOMVersionRecordDetail,
  type BOMVersionRecordSummary,
} from '../contracts/bom-version-trace'

function buildQueryString(params: { bomId?: string; productId?: string }) {
  const searchParams = new URLSearchParams()
  if (params.bomId?.trim()) {
    searchParams.set('bomId', params.bomId.trim())
  }
  if (params.productId?.trim()) {
    searchParams.set('productId', params.productId.trim())
  }
  const encoded = searchParams.toString()
  return encoded ? `?${encoded}` : ''
}

export const bomVersionTraceService = {
  async getVersionHistory(params: {
    bomId?: string
    productId?: string
  }): Promise<BOMVersionRecordSummary[]> {
    const response = await apiFetch<unknown>(
      `/engineering/bom/version-history${buildQueryString(params)}`
    )
    return parseBOMVersionRecordList(
      ensureArrayResponse<unknown>(
        response,
        'bomVersionTraceService.getVersionHistory'
      )
    )
  },

  async getVersionRecord(id: string): Promise<BOMVersionRecordDetail> {
    const response = await apiFetch<unknown>(
      `/engineering/bom/version-history/${id}`
    )
    return parseBOMVersionRecordDetail(
      ensureObjectResponse<Record<string, unknown>>(
        response,
        'bomVersionTraceService.getVersionRecord'
      )
    )
  },
}
