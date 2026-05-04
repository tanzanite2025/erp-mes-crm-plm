import { useQuery } from '@tanstack/react-query'
import { type Product, type ProductType } from '../data/schema'
import { PRODUCT_TYPES_QUERY_KEY, productManagementQueryKey } from '../query-keys'
import { ProductCoreService } from '../services/product-core-service'
import { ProductTypeService } from '../services/product-type-service'

const EMPTY_PRODUCTS: Product[] = []
const EMPTY_PRODUCT_TYPES: ProductType[] = []

export function useEngineeringBootstrap() {
  const productsQuery = useQuery({
    queryKey: productManagementQueryKey(),
    queryFn: () => ProductCoreService.getAuthoritativeProducts(),
  })

  const productTypesQuery = useQuery({
    queryKey: PRODUCT_TYPES_QUERY_KEY,
    queryFn: () => ProductTypeService.getProductTypes(),
  })

  if (productsQuery.isSuccess && !productsQuery.data) {
    throw new Error('[CRITICAL] Products Data missing')
  }

  if (productTypesQuery.isSuccess && !productTypesQuery.data) {
    throw new Error('[CRITICAL] Product Types Data missing')
  }

  return {
    products: productsQuery.data ?? EMPTY_PRODUCTS,
    types: productTypesQuery.data ?? EMPTY_PRODUCT_TYPES,
    isLoading: productsQuery.isLoading || productTypesQuery.isLoading,
    error: productsQuery.error ?? productTypesQuery.error,
  }
}
