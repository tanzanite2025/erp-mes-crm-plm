import { apiFetch } from '@/lib/api-client'
import type { AuditModuleValue } from '../data/audit-modules'
import { parseAuditTimelineResponse } from '../schema'
import type { AuditLog } from '../types'

export const fetchAuditTimeline = async (module: AuditModuleValue, targetId: string): Promise<AuditLog[]> => {
  const response = await apiFetch<unknown>(`/audit/timeline?module=${module}&target_id=${targetId}`)
  return parseAuditTimelineResponse(response)
}
