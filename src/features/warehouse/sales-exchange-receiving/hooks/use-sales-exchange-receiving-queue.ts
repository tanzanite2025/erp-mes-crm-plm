import { useMemo } from 'react'
import { resolveQueryFailure } from '@/lib/read-resource'
import {
  useGetSalesExchanges,
  useSalesExchangeMutations,
} from '@/features/trading/sales-exchanges/hooks/use-sales-exchanges'
import type { SalesExchangeDraftRecord } from '@/features/trading/sales-exchanges/types/sales-exchange-types'
import { useWarehouseCategoryOptions } from '@/features/warehouse/category'
import {
  getDefaultWarehouseCategoryCode,
  SALES_EXCHANGE_VIRTUAL_WAREHOUSE_CODE,
} from '@/features/warehouse/utils/warehouse-category-config'

export type SalesExchangeReceivingQueueReadResource =
  | {
      status: 'ready'
      items: SalesExchangeDraftRecord[]
      totalPendingQuantity: number
      totalRecognizedLabelCodeCount: number
      defaultTargetCategoryCode: string
      defaultTargetCategoryName: string
    }
  | {
      status: 'loading'
    }
  | {
      status: 'error'
      error: Error
      scope: string
    }

function countSalesExchangeRecognizedLabelCodes(
  salesExchangeDraftRecord: SalesExchangeDraftRecord
) {
  return salesExchangeDraftRecord.lines.reduce(
    (sum, lineDraft) => sum + lineDraft.recognizedLabelCodes.length,
    0
  )
}

function createTodayDateInputValue() {
  return new Date().toISOString().slice(0, 10)
}

export function useSalesExchangeReceivingQueue() {
  const queueQuery = useGetSalesExchanges({
    page: 1,
    pageSize: 12,
    status: 'Draft',
  })
  const categoryOptionsQuery = useWarehouseCategoryOptions()
  const salesExchangeMutations = useSalesExchangeMutations()

  const readResource = useMemo<SalesExchangeReceivingQueueReadResource>(() => {
    const queueFailure = resolveQueryFailure({
      data: queueQuery.data,
      error: queueQuery.error,
      isPending: queueQuery.isPending,
      scope: 'useSalesExchangeReceivingQueue.queue',
      missingMessage:
        '[CRITICAL] Sales exchange receiving queue missing after load',
      failureMessage: '[CRITICAL] Sales exchange receiving queue query failed',
    })
    if (queueFailure) {
      return {
        status: 'error',
        error: queueFailure.error,
        scope: queueFailure.scope,
      }
    }

    const categoryFailure = resolveQueryFailure({
      data: categoryOptionsQuery.data,
      error: categoryOptionsQuery.error,
      isPending: categoryOptionsQuery.isPending,
      scope: 'useSalesExchangeReceivingQueue.categoryOptions',
      missingMessage:
        '[CRITICAL] Warehouse category options missing after load',
      failureMessage: '[CRITICAL] Warehouse category options query failed',
    })
    if (categoryFailure) {
      return {
        status: 'error',
        error: categoryFailure.error,
        scope: categoryFailure.scope,
      }
    }

    if (queueQuery.isPending || categoryOptionsQuery.isPending) {
      return { status: 'loading' }
    }

    const queueItems = queueQuery.data?.items ?? []
    const categoryOptions = categoryOptionsQuery.data ?? []
    const defaultTargetCategoryCode = getDefaultWarehouseCategoryCode(
      categoryOptions,
      'sales-exchange',
      SALES_EXCHANGE_VIRTUAL_WAREHOUSE_CODE
    )
    const defaultTargetCategoryName =
      categoryOptions.find(
        (category) => category.code === defaultTargetCategoryCode
      )?.name ||
      categoryOptions.find(
        (category) => category.value === defaultTargetCategoryCode
      )?.label ||
      defaultTargetCategoryCode
    if (!defaultTargetCategoryCode) {
      return {
        status: 'error',
        error: new Error(
          '[CRITICAL] Missing default warehouse category for sales exchange old item inbound'
        ),
        scope: 'useSalesExchangeReceivingQueue.defaultTargetCategory',
      }
    }

    return {
      status: 'ready',
      items: queueItems,
      totalPendingQuantity: queueItems.reduce(
        (sum, item) => sum + item.totalExchangeQuantity,
        0
      ),
      totalRecognizedLabelCodeCount: queueItems.reduce(
        (sum, item) => sum + countSalesExchangeRecognizedLabelCodes(item),
        0
      ),
      defaultTargetCategoryCode,
      defaultTargetCategoryName,
    }
  }, [
    categoryOptionsQuery.data,
    categoryOptionsQuery.error,
    categoryOptionsQuery.isPending,
    queueQuery.data,
    queueQuery.error,
    queueQuery.isPending,
  ])

  const confirmSalesExchangeOldItemInbound = async (
    salesExchangeDraftRecord: SalesExchangeDraftRecord
  ) => {
    if (readResource.status !== 'ready') return
    await salesExchangeMutations.confirmOldItemInboundMutation.mutateAsync({
      salesExchangeId: salesExchangeDraftRecord.id,
      payload: {
        targetCategory: readResource.defaultTargetCategoryCode,
        batchNo: salesExchangeDraftRecord.exchangeNo,
        inboundDate: createTodayDateInputValue(),
        remarks: `销售换货旧货入库：${salesExchangeDraftRecord.exchangeNo}`,
      },
    })
  }

  return {
    readResource,
    isRefreshing: queueQuery.isFetching || categoryOptionsQuery.isFetching,
    isConfirmingOldItemInbound:
      salesExchangeMutations.confirmOldItemInboundMutation.isPending,
    reloadSalesExchangeReceivingQueue: async () => {
      await Promise.all([queueQuery.refetch(), categoryOptionsQuery.refetch()])
    },
    confirmSalesExchangeOldItemInbound,
  }
}
