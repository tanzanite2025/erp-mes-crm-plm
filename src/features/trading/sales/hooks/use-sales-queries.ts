import { useQuery } from '@tanstack/react-query'
import {
  getSalesOrderById,
  getSalesOrders,
  type GetSalesOrdersOptions,
} from '../services/sales-query-service'

export const useGetSalesOrders = (
  page = 1,
  pageSize = 50,
  options: Omit<GetSalesOrdersOptions, 'page' | 'pageSize'> & Record<string, unknown> = {}
) => {
  const { withLines, status, ...queryOptions } = options

  return useQuery({
    queryKey: ['sales-orders', page, pageSize, withLines ?? false, status ?? []],
    queryFn: () => getSalesOrders({ page, pageSize, withLines, status }),
    ...queryOptions,
  })
}

export const useGetSalesOrderDetail = (id: string) => {
  return useQuery({
    queryKey: ['sales-orders', id],
    queryFn: () => getSalesOrderById(id),
    enabled: !!id,
  })
}
