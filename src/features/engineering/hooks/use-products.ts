import { useQuery } from '@tanstack/react-query'
import { PRODUCTS_QUERY_KEY, productDetailQueryKey } from '../query-keys'
import { ProductCoreService } from '../services/product-core-service'

export const useGetProducts = (options = {}) => {
    return useQuery({
        queryKey: PRODUCTS_QUERY_KEY,
        queryFn: () => ProductCoreService.getProducts(),
        staleTime: 5 * 60 * 1000,
        ...options,
    })
}

export const useGetProductDetail = (id: string | undefined) => {
    return useQuery({
        queryKey: productDetailQueryKey(id || ''),
        queryFn: () => (id ? ProductCoreService.getProductById(id) : null),
        enabled: !!id,
    })
}
