import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { listQualityInspectionStages } from '../services/quality-inspection-stage-catalog-service'

export const QUALITY_INSPECTION_STAGES_QUERY_KEY = [
  'quality-inspection-stages',
] as const

export function useQualityInspectionStages(enabled = true) {
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  return useQuery({
    queryKey: [...QUALITY_INSPECTION_STAGES_QUERY_KEY, actorId],
    queryFn: listQualityInspectionStages,
    enabled,
  })
}
