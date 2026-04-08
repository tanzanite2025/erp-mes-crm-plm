import { useQuery } from '@tanstack/react-query'
import { ProductCoreService } from '../services/product-core-service'

/**
 * 获取产品 SKUs 的 Hook
 */
export const useGetProducts = (options = {}) => {
    return useQuery({
        queryKey: ['engineering', 'products'],
        queryFn: () => ProductCoreService.getProducts(),
        staleTime: 5 * 60 * 1000, // 5分钟缓存
        ...options
    })
}

/**
 * 根据 ID 获取特定产品的 Hook
 */
export const useGetProductDetail = (id: string | undefined) => {
    return useQuery({
        queryKey: ['engineering', 'products', id],
        queryFn: () => id ? ProductCoreService.getProductById(id) : null,
        enabled: !!id,
    })
}
