import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { tradingQueryKeys } from '@/features/trading/query-keys'
import { warehouseQueryKeys } from '@/features/warehouse/query-keys'
import type {
  ConfirmSalesExchangeOldItemInboundPayload,
  CreateSalesExchangePayload,
} from '../contracts/sales-exchange-api-dto'
import {
  confirmSalesExchangeOldItemInbound,
  createSalesExchange,
  deleteSalesExchange,
  getSalesExchangeById,
  getSalesExchanges,
  type GetSalesExchangesOptions,
  type PaginatedSalesExchanges,
  type CreateSalesExchangeResponse,
} from '../services/sales-exchange-service'
import type { SalesExchangeDraftRecord } from '../types/sales-exchange-types'

export function useGetSalesExchanges(options: GetSalesExchangesOptions = {}) {
  const {
    page = 1,
    pageSize = 50,
    customerId = '',
    status = 'all',
    keyword = '',
  } = options

  return useQuery<PaginatedSalesExchanges, Error>({
    queryKey: tradingQueryKeys.salesExchanges(
      page,
      pageSize,
      customerId,
      status,
      keyword
    ),
    queryFn: () =>
      getSalesExchanges({
        page,
        pageSize,
        customerId: customerId || undefined,
        status,
        keyword,
      }),
  })
}

export function useGetSalesExchangeDetail(id: string) {
  return useQuery<SalesExchangeDraftRecord, Error>({
    queryKey: tradingQueryKeys.salesExchangeDetail(id),
    queryFn: () => getSalesExchangeById(id),
    enabled: !!id,
  })
}

export function useSalesExchangeMutations() {
  const queryClient = useQueryClient()

  const invalidateSalesExchangeViews = async (salesExchangeId?: string) => {
    await queryClient.invalidateQueries({
      queryKey: tradingQueryKeys.salesExchangesRoot(),
    })
    if (salesExchangeId) {
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.salesExchangeDetail(salesExchangeId),
      })
    }
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
  }

  const createMutation = useMutation({
    mutationFn: ({
      salesOrderId,
      payload,
    }: {
      salesOrderId: string
      payload: CreateSalesExchangePayload
    }): Promise<CreateSalesExchangeResponse> =>
      createSalesExchange(salesOrderId, payload),
    onSuccess: async (data) => {
      toast.success('销售换货单已创建')
      await invalidateSalesExchangeViews(data.salesExchange.id)
      await queryClient.invalidateQueries({
        queryKey: tradingQueryKeys.salesOrdersRoot(),
      })
    },
    onError: handleServerError,
  })

  const deleteMutation = useMutation({
    mutationFn: ({ salesExchangeId }: { salesExchangeId: string }) =>
      deleteSalesExchange(salesExchangeId),
    onSuccess: async (_data, variables) => {
      toast.success('销售换货单已删除')
      queryClient.removeQueries({
        queryKey: tradingQueryKeys.salesExchangeDetail(
          variables.salesExchangeId
        ),
      })
      await invalidateSalesExchangeViews()
    },
    onError: handleServerError,
  })

  const confirmOldItemInboundMutation = useMutation({
    mutationFn: ({
      salesExchangeId,
      payload,
    }: {
      salesExchangeId: string
      payload: ConfirmSalesExchangeOldItemInboundPayload
    }) => confirmSalesExchangeOldItemInbound(salesExchangeId, payload),
    onSuccess: async (data) => {
      toast.success('旧货入库已确认')
      await invalidateSalesExchangeViews(data.salesExchange.id)
    },
    onError: handleServerError,
  })

  return {
    createMutation,
    deleteMutation,
    confirmOldItemInboundMutation,
  }
}
