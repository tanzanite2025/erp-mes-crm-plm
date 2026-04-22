import { useQuery } from '@tanstack/react-query'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import {
  getSalesReturnSourceOrderDetail,
  getSalesReturnSourceOrders,
  type GetSalesReturnSourceOrdersOptions,
} from '../services/sales-return-query-service'

export function useGetSalesReturnSourceOrders(
  options: GetSalesReturnSourceOrdersOptions = {}
) {
  const {
    page = 1,
    pageSize = 50,
    status = 'all',
    customerId = '',
    keyword = '',
  } = options

  return useQuery({
    queryKey: tradingQueryKeys.salesReturnsSourceOrders(
      page,
      pageSize,
      status,
      customerId,
      keyword
    ),
    queryFn: () =>
      getSalesReturnSourceOrders({
        page,
        pageSize,
        status,
        customerId: customerId || undefined,
        keyword,
      }),
  })
}

export function useGetSalesReturnSourceOrderDetail(id: string) {
  return useQuery({
    queryKey: tradingQueryKeys.salesReturnsSourceOrderDetail(id),
    queryFn: () => getSalesReturnSourceOrderDetail(id),
    enabled: !!id,
  })
}
