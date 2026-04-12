import { useQuery } from '@tanstack/react-query'
import { useUnitsQuery } from '@/features/basic-settings/hooks/use-units-query'
import { type MaterialOption } from '@/features/material-archive/data/schema'
import { MATERIAL_OPTIONS_QUERY_KEY } from '@/features/material-archive/query-keys'
import { MaterialCoreService } from '@/features/material-archive/services/material-core-service'

export function usePurchaseOrderDialogResources(open: boolean) {
  const { units, isLoading: isUnitsLoading } = useUnitsQuery({ enabled: open })
  const materialsQuery = useQuery({
    queryKey: MATERIAL_OPTIONS_QUERY_KEY,
    queryFn: (): Promise<MaterialOption[]> => MaterialCoreService.getMaterialOptions(),
    enabled: open,
  })

  return {
    units,
    materials: materialsQuery.data ?? [],
    isMetaLoading: isUnitsLoading || materialsQuery.isLoading,
  }
}
