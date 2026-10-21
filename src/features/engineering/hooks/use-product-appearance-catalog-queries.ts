import { useQuery } from '@tanstack/react-query'
import { PRODUCT_APPEARANCES_QUERY_KEY } from '../query-keys'
import { productAppearanceService } from '../services/product-appearance-service'

export function useProductAppearanceCatalogQueries() {
  return useQuery({
    queryKey: PRODUCT_APPEARANCES_QUERY_KEY,
    queryFn: () => productAppearanceService.getProductAppearances(),
  })
}
