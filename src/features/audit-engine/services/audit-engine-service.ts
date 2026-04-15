import { apiFetch } from '@/lib/api-client'
import { parseAuditEngineStatsResponse } from '../schema'
import type { AuditEngineStatsResponse } from '../types'

export const fetchAuditEngineStats = async (): Promise<AuditEngineStatsResponse> => {
  const response = await apiFetch<unknown>('/audit/engine/stats')
  return parseAuditEngineStatsResponse(response)
}
