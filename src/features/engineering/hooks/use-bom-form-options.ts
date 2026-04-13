import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createLogger } from '@/lib/logger'
import { failLoudly } from '@/lib/safe-catch'
import { MATERIAL_OPTIONS_QUERY_KEY } from '../../material-archive/query-keys'
import { type MaterialOption } from '../../material-archive/data/schema'
import { MaterialCoreService } from '../../material-archive/services/material-core-service'
import { type ChangeOrder, type Product } from '../data/schema'
import { CHANGE_ORDERS_QUERY_KEY, productOptionsQueryKey } from '../query-keys'
import { changeOrderService } from '../services/change-order-service'
import { ProductCoreService } from '../services/product-core-service'

const logger = createLogger('useBOMFormOptions')

interface UseBOMFormOptionsParams {
  open: boolean
  selectedProductId?: string
}

export function useBOMFormOptions({ open, selectedProductId }: UseBOMFormOptionsParams) {
  const productsQuery = useQuery({
    queryKey: productOptionsQueryKey(),
    queryFn: () => ProductCoreService.getProducts({ isOptions: true }),
    enabled: open,
  })
  const changeOrdersQuery = useQuery({
    queryKey: [...CHANGE_ORDERS_QUERY_KEY, selectedProductId || 'all', 'options'],
    queryFn: () =>
      changeOrderService.getChangeOrders({
        isOptions: true,
        productId: selectedProductId || undefined,
      }),
    enabled: open,
  })
  const materialsQuery = useQuery({
    queryKey: MATERIAL_OPTIONS_QUERY_KEY,
    queryFn: () => MaterialCoreService.getMaterialOptions(),
    enabled: open,
  })

  const products = useMemo(() => {
    if (productsQuery.data) return productsQuery.data
    if (productsQuery.isPending) return [] as Product[]
    const error = productsQuery.error instanceof Error
      ? productsQuery.error
      : new Error('[CRITICAL] Missing BOM form products query data')
    failLoudly(error, 'useBOMFormOptions.products')
    return [] as Product[]
  }, [productsQuery.data, productsQuery.error, productsQuery.isPending])

  const changeOrders = useMemo(() => {
    if (changeOrdersQuery.data) return changeOrdersQuery.data as ChangeOrder[]
    if (changeOrdersQuery.isPending) return [] as ChangeOrder[]
    const error = changeOrdersQuery.error instanceof Error
      ? changeOrdersQuery.error
      : new Error('[CRITICAL] Missing BOM form change orders query data')
    failLoudly(error, 'useBOMFormOptions.changeOrders')
    return [] as ChangeOrder[]
  }, [changeOrdersQuery.data, changeOrdersQuery.error, changeOrdersQuery.isPending])

  const materials = useMemo(() => {
    if (materialsQuery.data) return materialsQuery.data as MaterialOption[]
    if (materialsQuery.isPending) return [] as MaterialOption[]
    const error = materialsQuery.error instanceof Error
      ? materialsQuery.error
      : new Error('[CRITICAL] Missing BOM form materials query data')
    failLoudly(error, 'useBOMFormOptions.materials')
    return [] as MaterialOption[]
  }, [materialsQuery.data, materialsQuery.error, materialsQuery.isPending])

  useEffect(() => {
    if (changeOrdersQuery.error) {
      logger.error('BOM form load change orders failed', changeOrdersQuery.error)
    }
  }, [changeOrdersQuery.error])

  useEffect(() => {
    if (materialsQuery.error) {
      logger.error('BOM form load materials failed', materialsQuery.error)
    }
  }, [materialsQuery.error])

  return {
    products,
    materials,
    changeOrders,
  }
}
