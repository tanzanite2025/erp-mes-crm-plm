import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isNotFoundError } from '@/lib/error-status'
import { handleServerError } from '@/lib/handle-server-error'
import { useLanguage } from '@/context/language-provider'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import { receivableQueryKeys } from '@/features/trading/receivables/query-keys'
import { warehouseQueryKeys } from '@/features/warehouse/query-keys'
import type {
  ConfirmSalesReturnInboundPayload,
  CreateSalesReturnPayload,
  PatchSalesReturnActualAmountEntryPayload,
  PatchSalesReturnPayload,
  PatchSalesReturnLogisticsPayload,
} from '../contracts/sales-return-api-dto'
import {
  confirmSalesReturnInbound,
  createSalesReturn,
  deleteSalesReturn,
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
    retry: (_failureCount, error) => !isNotFoundError(error),
  })
}

export function useGetSalesReturnActualAmountRecords(id: string) {
  return useQuery<SalesReturnActualAmountRecord[], Error>({
    queryKey: tradingQueryKeys.salesReturnActualAmountRecords(id),
    queryFn: () => getSalesReturnActualAmountRecords(id),
    enabled: !!id,
    retry: (_failureCount, error) => !isNotFoundError(error),
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
      queryKey: ['sales-orders', 'after-sales-summary'],
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
      await invalidateSalesReturnViews(data.salesReturn.id, data.salesOrder.id)
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.salesOrdersRoot(),
      })
      await queryClient.invalidateQueries({
        queryKey: receivableQueryKeys.receivables(),
      })
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.customerSalesReturnSummary(),
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
        queryKey: tradingQueryKeys.salesReturnsSourceOrderDetail(
          data.salesOrderId
        ),
      })
      await queryClient.invalidateQueries({
        queryKey: ['sales-returns', 'source-orders'],
      })
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.salesOrdersRoot(),
      })
      await queryClient.invalidateQueries({
        queryKey: receivableQueryKeys.receivables(),
      })
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.customerSalesReturnSummary(),
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
      toast.success(
        t('trading.salesReturns.queryShell.actualAmountEntrySuccess')
      )
      await invalidateSalesReturnViews(data.id, data.salesOrderId)
    },
    onError: handleServerError,
  })

  const confirmInboundMutation = useMutation({
    mutationFn: ({
      salesReturnId,
      payload,
    }: {
      salesReturnId: string
      payload: ConfirmSalesReturnInboundPayload
    }) => confirmSalesReturnInbound(salesReturnId, payload),
    onSuccess: async (data) => {
      toast.success('退货入库已确认')
      await invalidateSalesReturnViews(
        data.salesReturn.id,
        data.salesReturn.salesOrderId
      )
      await queryClient.invalidateQueries({
        queryKey: warehouseQueryKeys.inboundHistory(),
      })
      await queryClient.invalidateQueries({
        queryKey: warehouseQueryKeys.inventoryList(),
      })
      await queryClient.invalidateQueries({
        queryKey: warehouseQueryKeys.inventoryValuation(),
      })
      await queryClient.invalidateQueries({
        queryKey: warehouseQueryKeys.inventoryAlertSummary(),
      })
    },
    onError: handleServerError,
  })

  const deleteMutation = useMutation({
    mutationFn: ({
      salesReturnId,
    }: {
      salesReturnId: string
      salesOrderId: string
    }) => deleteSalesReturn(salesReturnId),
    onSuccess: async (_data, variables) => {
      toast.success(t('trading.salesReturns.queryShell.deleteSuccess'))
      queryClient.removeQueries({
        queryKey: tradingQueryKeys.salesReturnDetail(variables.salesReturnId),
      })
      queryClient.removeQueries({
        queryKey: tradingQueryKeys.salesReturnActualAmountRecords(
          variables.salesReturnId
        ),
      })
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.salesReturnsRoot(),
      })
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.salesReturnsSourceOrderDetail(
          variables.salesOrderId
        ),
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

  return {
    createMutation,
    deleteMutation,
    patchBodyMutation,
    patchLogisticsMutation,
    patchActualAmountEntryMutation,
    confirmInboundMutation,
  }
}
