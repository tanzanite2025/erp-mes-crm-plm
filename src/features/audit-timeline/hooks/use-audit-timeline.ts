import { useQuery } from '@tanstack/react-query'
import type { AuditModuleValue } from '../data/audit-modules'
import { auditTimelineQueryKeys } from '../query-keys'
import { fetchAuditTimeline } from '../services/audit-timeline-service'

export const useAuditTimeline = (
  module: AuditModuleValue,
  targetId?: string,
  enabled = true
) => {
  return useQuery({
    queryKey: auditTimelineQueryKeys.detail(module, targetId),
    queryFn: () => fetchAuditTimeline(module, targetId),
    enabled: enabled && !!module,
  })
}
