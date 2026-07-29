import { useQuery } from '@tanstack/react-query'
import { outsourceInventoryCategoryQueryKeys } from '../query-keys'
import { getOutsourceInventoryCategoryOptions } from '../services/outsource-inventory-category-service'

export function useOutsourceInventoryCategoryOptions() {
  return useQuery({
    queryKey: outsourceInventoryCategoryQueryKeys.options(),
    queryFn: getOutsourceInventoryCategoryOptions,
  })
}
