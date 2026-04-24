import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import { receivableQueryKeys } from '@/features/trading/receivables/query-keys'
import type {
  CreateSalesReturnPayload,
  PatchSalesReturnActualAmountEntryPayload,
  PatchSalesReturnPayload,
  PatchSalesReturnLogisticsPayload,
} from '../contracts/sales-return-api-dto'
import {
  createSalesReturn,
  getSalesReturnActualAmountRecords,
  getSalesReturnById,
  getSalesReturns,
  patchSalesReturnActualAmountEntry,
  patchSalesReturn,
  patchSalesReturnLogistics,
  type GetSalesReturnsOptions,
  type PaginatedSalesReturns,
  type SalesReturnActualAmountRecord,
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

export function useGetSalesReturnActualAmountRecords(id: string) {
  return useQuery<SalesReturnActualAmountRecord[], Error>({
    queryKey: tradingQueryKeys.salesReturnActualAmountRecords(id),
    queryFn: () => getSalesReturnActualAmountRecords(id),
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
    await queryClient.invalidateQueries({
      queryKey: tradingQueryKeys.salesReturnActualAmountRecords(salesReturnId),
    })
    if (salesOrderId) {
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.salesOrderDetail(salesOrderId),
      })
    }
    await queryClient.invalidateQueries({
      queryKey: receivableQueryKeys.receivables(),
    })
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

  const patchBodyMutation = useMutation({
    mutationFn: ({
      salesReturnId,
      payload,
    }: {
      salesReturnId: string
      payload: PatchSalesReturnPayload
    }) => patchSalesReturn(salesReturnId, payload),
    onSuccess: async (data) => {
      toast.success(t('trading.salesReturns.queryShell.editSuccess'))
      await invalidateSalesReturnViews(data.id, data.salesOrderId)
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.salesReturnsSourceOrderDetail(data.salesOrderId),
      })
      await queryClient.invalidateQueries({
        queryKey: ['sales-returns', 'source-orders'],
      })
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.salesOrdersRoot(),
      })
    },
    onError: handleServerError,
  })

  const patchActualAmountEntryMutation = useMutation({
    mutationFn: ({
      salesReturnId,
      payload,
    }: {
      salesReturnId: string
      payload: PatchSalesReturnActualAmountEntryPayload
    }) => patchSalesReturnActualAmountEntry(salesReturnId, payload),
    onSuccess: async (data) => {
      toast.success(t('trading.salesReturns.queryShell.actualAmountEntrySuccess'))
      await invalidateSalesReturnViews(data.id, data.salesOrderId)
    },
    onError: handleServerError,
  })

  return {
    createMutation,
    patchBodyMutation,
    patchLogisticsMutation,
    patchActualAmountEntryMutation,
  }
}
