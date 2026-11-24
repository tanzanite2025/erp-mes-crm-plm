import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import {
  getQualityInspectionStageDefectTypeBindings,
  listQualityDefectTypes,
} from '../services/quality-defect-type-catalog-and-inspection-stage-bindings-service'

export const QUALITY_DEFECT_TYPES_QUERY_KEY = ['quality-defect-types'] as const
export const QUALITY_INSPECTION_STAGE_DEFECT_BINDINGS_QUERY_KEY = [
  'quality-inspection-stage-defect-bindings',
] as const

export type QualityDefectConfigurationInteractionState = {
  hasUnsavedChanges: boolean
  isSaving: boolean
}

export function useQualityDefectTypes() {
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  return useQuery({
    queryKey: [...QUALITY_DEFECT_TYPES_QUERY_KEY, actorId],
    queryFn: listQualityDefectTypes,
  })
}

export function useQualityInspectionStageDefectTypeBindings(
  inspectionStageId: string
) {
  const actorId = useAuthStore((state) => state.user?.id ?? '')
  return useQuery({
    queryKey: [
      ...QUALITY_INSPECTION_STAGE_DEFECT_BINDINGS_QUERY_KEY,
      actorId,
      inspectionStageId,
    ],
    queryFn: () =>
      getQualityInspectionStageDefectTypeBindings(inspectionStageId),
    enabled: Boolean(inspectionStageId),
  })
}
