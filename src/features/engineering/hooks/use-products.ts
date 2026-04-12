import { useQuery } from '@tanstack/react-query'
import { productDetailQueryKey, productListQueryKey, productOptionsQueryKey } from '../query-keys'
import { ProductCoreService } from '../services/product-core-service'

const PRODUCT_OPTIONS_STALE_TIME = 5 * 60 * 1000
const PRODUCT_PAGE_STALE_TIME = 60 * 1000

type UseGetProductsOptions = {
    mode?: 'options' | 'page'
    page?: number
    pageSize?: number
} & Record<string, unknown>

export const useGetProducts = ({ mode = 'options', page = 1, pageSize = 50, ...options }: UseGetProductsOptions = {}) => {
    const queryKey = mode === 'page' ? productListQueryKey(page, pageSize) : productOptionsQueryKey()
    const queryFn = () =>
        mode === 'page'
            ? ProductCoreService.getProducts({ page, pageSize, isOptions: false })
            : ProductCoreService.getProducts({ isOptions: true })
    const staleTime = mode === 'page' ? PRODUCT_PAGE_STALE_TIME : PRODUCT_OPTIONS_STALE_TIME

    return useQuery({
        queryKey,
        queryFn,
        staleTime,
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
