import { useQuery } from '@tanstack/react-query'
import { auditEngineQueryKeys } from '../query-keys'
import { fetchAuditEngineStats } from '../services/audit-engine-service'

export const useAuditEngineStats = () => {
  return useQuery({
    queryKey: auditEngineQueryKeys.stats(),
    queryFn: fetchAuditEngineStats,
    refetchInterval: 1000 * 30,
  })
}
