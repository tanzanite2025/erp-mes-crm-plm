import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import type {
  CreateSalesReturnPayload,
  PatchSalesReturnLogisticsPayload,
} from '../contracts/sales-return-api-dto'
import {
  createSalesReturn,
  getSalesReturnById,
  getSalesReturns,
  patchSalesReturnLogistics,
  type GetSalesReturnsOptions,
  type PaginatedSalesReturns,
  type SalesReturnRecord,
} from '../services/sales-return-service'

export function useGetSalesReturns(options: GetSalesReturnsOptions = {}) {
  const {
    page = 1,
    pageSize = 50,
    customerId = '',
    status = 'all',
    keyword = '',
  } = options

  return useQuery<PaginatedSalesReturns, Error>({
    queryKey: tradingQueryKeys.salesReturns(
      page,
      pageSize,
      customerId,
      status,
      keyword
    ),
    queryFn: () =>
      getSalesReturns({
        page,
        pageSize,
        customerId: customerId || undefined,
        status,
        keyword,
      }),
  })
}

export function useGetSalesReturnDetail(id: string) {
  return useQuery<SalesReturnRecord, Error>({
    queryKey: tradingQueryKeys.salesReturnDetail(id),
    queryFn: () => getSalesReturnById(id),
    enabled: !!id,
  })
}

export function useSalesReturnMutations() {
  const { t } = useLanguage()
  const queryClient = useQueryClient()

  const invalidateSalesReturnViews = async (
    salesReturnId: string,
    salesOrderId?: string
  ) => {
    await queryClient.invalidateQueries({
      queryKey: tradingQueryKeys.salesReturnsRoot(),
    })
    await queryClient.invalidateQueries({
      queryKey: tradingQueryKeys.salesReturnDetail(salesReturnId),
    })
    if (salesOrderId) {
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.salesOrderDetail(salesOrderId),
      })
    }
    await queryClient.invalidateQueries({
      queryKey: tradingQueryKeys.customerSalesReturnSummary(),
    })
  }

  const createMutation = useMutation({
    mutationFn: ({
      salesOrderId,
      payload,
    }: {
      salesOrderId: string
      payload: CreateSalesReturnPayload
    }) => createSalesReturn(salesOrderId, payload),
    onSuccess: async (data) => {
      toast.success(t('trading.salesReturns.queryShell.createSuccess'))
      await invalidateSalesReturnViews(
        data.salesReturn.id,
        data.salesOrder.id
      )
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.salesOrdersRoot(),
      })
    },
    onError: handleServerError,
  })

  const patchLogisticsMutation = useMutation({
    mutationFn: ({
      salesReturnId,
      payload,
    }: {
      salesReturnId: string
      payload: PatchSalesReturnLogisticsPayload
    }) => patchSalesReturnLogistics(salesReturnId, payload),
    onSuccess: async (data) => {
      toast.success(t('trading.salesReturns.queryShell.logisticsUpdateSuccess'))
      await invalidateSalesReturnViews(data.id, data.salesOrderId)
    },
    onError: handleServerError,
  })

  return { createMutation, patchLogisticsMutation }
}
