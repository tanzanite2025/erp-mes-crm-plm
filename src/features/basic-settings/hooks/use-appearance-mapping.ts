import { useQuery } from '@tanstack/react-query'
import { productAppearanceService } from '@/features/engineering/services/product-appearance-service'
import {
  APPEARANCE_MAPPING_QUERY_KEY,
  buildAppearanceMappingFromProductAppearances,
  type AppearanceMapping,
} from '../data/appearance-mapping'

export function useAppearanceMapping() {
  return useQuery<AppearanceMapping>({
    queryKey: APPEARANCE_MAPPING_QUERY_KEY,
    queryFn: async () => {
      const items = await productAppearanceService.getProductAppearances()
      return buildAppearanceMappingFromProductAppearances(items)
    },
  })
}
