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
  options: Omit<GetSalesOrdersOptions, 'page' | 'pageSize'> &
    Record<string, unknown> = {}
) => {
  const {
    withLines,
    status,
    customerId,
    keyword,
    paymentMethod,
    paymentTerm,
    ...queryOptions
  } = options
  const normalizedWithLines = withLines ?? false
  const normalizedStatus = status ?? []
  const normalizedCustomerID =
    typeof customerId === 'string' ? customerId.trim() : ''
  const normalizedKeyword = typeof keyword === 'string' ? keyword.trim() : ''
  const normalizedPaymentMethod =
    typeof paymentMethod === 'string' ? paymentMethod.trim() : ''
  const normalizedPaymentTerm =
    typeof paymentTerm === 'string' ? paymentTerm.trim() : ''

  return useQuery({
    queryKey: tradingQueryKeys.salesOrders(
      page,
      pageSize,
      normalizedWithLines,
      normalizedStatus,
      normalizedCustomerID,
      normalizedKeyword,
      normalizedPaymentMethod,
      normalizedPaymentTerm
    ),
    queryFn: () =>
      getSalesOrders({
        page,
        pageSize,
        withLines: normalizedWithLines,
        status: normalizedStatus,
        customerId: normalizedCustomerID || undefined,
        keyword: normalizedKeyword || undefined,
        paymentMethod: normalizedPaymentMethod || undefined,
        paymentTerm: normalizedPaymentTerm || undefined,
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
