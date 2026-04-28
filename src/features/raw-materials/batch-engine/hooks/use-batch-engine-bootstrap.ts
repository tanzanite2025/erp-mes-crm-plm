import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CuttingPlanService } from '@/features/engineering-db/services/cutting-plan-service'
import type { PrepregMaterialSpec, PrepregMaterialSpecListResponse } from '../../data/prepreg-material-spec-schema'
import { CutSizeLibraryService } from '../../cut-size-library/services/cut-size-library-service'
import { PrepregMaterialSpecService } from '../../services/prepreg-material-spec-service'

const CUT_SIZE_LIBRARY_OPTIONS_QUERY_KEY = ['raw-materials', 'cut-size-library', 'active-options'] as const
const PREPREG_OPTIONS_QUERY_KEY = ['raw-materials', 'prepreg-specs', 'active-options'] as const
const CUTTING_PLAN_OPTIONS_QUERY_KEY = ['engineering-db', 'cutting-plan', 'active-options'] as const

type PrepregOptionsQueryData = PrepregMaterialSpec[] | PrepregMaterialSpecListResponse | undefined

function normalizePrepregSpecs(data: PrepregOptionsQueryData): PrepregMaterialSpec[] {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.items)) {
    return data.items.filter((item) => item.status === 'Active')
  }
  return []
}

export function useBatchEngineBootstrap(selectedPrepregSpecId: string, selectedCuttingPlanId: string) {
  const { data: prepregSpecData, isLoading: prepregLoading } = useQuery<PrepregMaterialSpec[] | PrepregMaterialSpecListResponse>({
    queryKey: PREPREG_OPTIONS_QUERY_KEY,
    queryFn: async () => {
      const response = await PrepregMaterialSpecService.list('', 1, 200)
      return response.items.filter((item) => item.status === 'Active')
    },
    staleTime: 5 * 60 * 1000,
  })

  const prepregSpecs = useMemo(() => normalizePrepregSpecs(prepregSpecData), [prepregSpecData])

  const { data: cutSizeUnits = [], isLoading: cutSizeLoading } = useQuery({
    queryKey: CUT_SIZE_LIBRARY_OPTIONS_QUERY_KEY,
    queryFn: () => CutSizeLibraryService.listActive(),
    staleTime: 5 * 60 * 1000,
  })

  const { data: cuttingPlans = [], isLoading: cuttingPlanLoading } = useQuery({
    queryKey: CUTTING_PLAN_OPTIONS_QUERY_KEY,
    queryFn: async () => {
      const plans = await CuttingPlanService.list()
      return plans.filter((item) => item.status === 'Active')
    },
    staleTime: 5 * 60 * 1000,
  })

  const selectedPrepregSpec = useMemo(
    () => prepregSpecs.find((item) => item.id === selectedPrepregSpecId),
    [prepregSpecs, selectedPrepregSpecId]
  )

  const selectedCuttingPlan = useMemo(
    () => cuttingPlans.find((item) => item.id === selectedCuttingPlanId),
    [cuttingPlans, selectedCuttingPlanId]
  )

  return {
    prepregSpecs,
    prepregLoading,
    selectedPrepregSpec,
    cuttingPlans,
    cuttingPlanLoading,
    selectedCuttingPlan,
    cutSizeUnits,
    cutSizeLoading,
  }
}
