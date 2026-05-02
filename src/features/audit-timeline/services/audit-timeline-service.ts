import { apiFetch } from '@/lib/api-client'
import type { AuditModuleValue } from '../data/audit-modules'
import { parseAuditTimelineResponse } from '../schema'
import type { AuditLog } from '../types'

export const fetchAuditTimeline = async (module: AuditModuleValue, targetId?: string): Promise<AuditLog[]> => {
  const params = new URLSearchParams({ module })
  if (targetId?.trim()) {
    params.set('target_id', targetId)
  }
  const response = await apiFetch<unknown>(`/audit/timeline?${params.toString()}`)
  return parseAuditTimelineResponse(response)
}
