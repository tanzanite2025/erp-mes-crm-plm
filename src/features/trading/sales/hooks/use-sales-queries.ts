import { useQuery } from '@tanstack/react-query'
import { tradingQueryKeys } from '@/features/trading/query-keys'
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
  const normalizedWithLines = withLines ?? false
  const normalizedStatus = status ?? []

  return useQuery({
    queryKey: tradingQueryKeys.salesOrders(page, pageSize, normalizedWithLines, normalizedStatus),
    queryFn: () =>
      getSalesOrders({
        page,
        pageSize,
        withLines: normalizedWithLines,
        status: normalizedStatus,
      }),
    ...queryOptions,
  })
}

export const useGetSalesOrderDetail = (id: string) => {
  return useQuery({
    queryKey: tradingQueryKeys.salesOrderDetail(id),
    queryFn: () => getSalesOrderById(id),
    enabled: !!id,
  })
}
