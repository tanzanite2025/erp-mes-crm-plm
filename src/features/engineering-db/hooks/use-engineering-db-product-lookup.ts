import { useMemo } from 'react'
import { useGetProducts } from '@/features/engineering/hooks/use-products'

export function useEngineeringDbProductLookup() {
  const { data: products = [] } = useGetProducts()

  const productMap = useMemo(() => {
    const map = new Map<string, (typeof products)[0]>()
    products.forEach((product) => map.set(product.id, product))
    return map
  }, [products])

  return {
    products,
    productMap,
  }
}
