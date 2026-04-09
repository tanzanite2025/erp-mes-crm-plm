import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import { type AuditEngineStatsResponse } from '../types'

export const useAuditEngineStats = () => {
  return useQuery<AuditEngineStatsResponse>({
    queryKey: ['audit-engine-stats'],
    queryFn: () => apiFetch('/audit/engine/stats'),
    refetchInterval: 1000 * 30,
  })
}
