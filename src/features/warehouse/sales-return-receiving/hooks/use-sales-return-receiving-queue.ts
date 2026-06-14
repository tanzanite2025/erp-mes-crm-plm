import { useEffect, useMemo } from 'react'
import { createLogger } from '@/lib/logger'
import {
  type CompositeReadResource,
  resolveQueryFailure,
} from '@/lib/read-resource'
import { failLoudly } from '@/lib/safe-catch'
import type { OrderEvidence } from '@/features/trading/data/schema'
import { useGetSalesReturns } from '@/features/trading/sales/hooks/use-sales-returns'
import type {
  SalesReturnLine,
  SalesReturnRecord,
} from '@/features/trading/sales/services/sales-return-service'
import { useWarehouseCategoryOptions } from '@/features/warehouse/category'
import { SALES_RETURN_VIRTUAL_WAREHOUSE_CODE } from '@/features/warehouse/utils/warehouse-category-config'

const TERMINAL_SALES_RETURN_STATUSES = new Set([
  'closed',
  'completed',
  'canceled',
  'cancelled',
])
const logger = createLogger('useSalesReturnReceivingQueue')

export type SalesReturnReceivingLine = Pick<
  SalesReturnLine,
  | 'id'
  | 'productCode'
  | 'productModel'
  | 'specification'
  | 'quantity'
  | 'uom'
  | 'evidences'
>

export type SalesReturnReceivingQueueItem = {
  id: string
  returnNo: string
  salesOrderNo: string
  customerName: string
  status: string
  trackingNo?: string
  carrier?: string
  logisticsNote?: string
  returnDate: string
  totalQuantity: number
  lineCount: number
  evidences: OrderEvidence[]
  lines: SalesReturnReceivingLine[]
}

export type SalesReturnReceivingQueueResource = CompositeReadResource<{
  items: SalesReturnReceivingQueueItem[]
  totalPendingQuantity: number
  salesReturnVirtualWarehouseName: string
}>

function isWarehousePendingReturn(record: SalesReturnRecord) {
  return !TERMINAL_SALES_RETURN_STATUSES.has(record.status.toLowerCase())
}

function toQueueItem(record: SalesReturnRecord): SalesReturnReceivingQueueItem {
  return {
    id: record.id,
    returnNo: record.returnNo,
    salesOrderNo: record.salesOrderNo,
    customerName: record.customerName,
    status: record.status,
    trackingNo: record.trackingNo,
    carrier: record.carrier,
    logisticsNote: record.logisticsNote,
    returnDate: record.returnDate,
    totalQuantity: record.totalQuantity,
    lineCount: record.lines.length,
    evidences: record.evidences ?? [],
    lines: record.lines.map((line) => ({
      id: line.id,
      productCode: line.productCode,
      productModel: line.productModel,
      specification: line.specification,
      quantity: line.quantity,
      uom: line.uom,
      evidences: line.evidences ?? [],
    })),
  }
}

export function useSalesReturnReceivingQueue() {
  const queueQuery = useGetSalesReturns({
    page: 1,
    pageSize: 20,
    status: 'all',
  })
  const categoryOptionsQuery = useWarehouseCategoryOptions()

  const readResource = useMemo<SalesReturnReceivingQueueResource>(() => {
    const queueFailure = resolveQueryFailure({
      data: queueQuery.data,
      error: queueQuery.error,
      isPending: queueQuery.isPending,
      scope: 'useSalesReturnReceivingQueue.queue',
      missingMessage:
        '[CRITICAL] Sales return receiving queue missing after load',
      failureMessage: '[CRITICAL] Sales return receiving queue query failed',
    })
    if (queueFailure) {
      return {
        status: 'error',
        error: queueFailure.error,
        scope: queueFailure.scope,
      }
    }

    const categoryOptionsFailure = resolveQueryFailure({
      data: categoryOptionsQuery.data,
      error: categoryOptionsQuery.error,
      isPending: categoryOptionsQuery.isPending,
      scope: 'useSalesReturnReceivingQueue.categoryOptions',
      missingMessage:
        '[CRITICAL] Warehouse category options missing after load',
      failureMessage: '[CRITICAL] Warehouse category options query failed',
    })
    if (categoryOptionsFailure) {
      return {
        status: 'error',
        error: categoryOptionsFailure.error,
        scope: categoryOptionsFailure.scope,
      }
    }

    if (queueQuery.isPending || categoryOptionsQuery.isPending) {
      return { status: 'loading' }
    }

    const queueData = queueQuery.data
    const categoryOptions = categoryOptionsQuery.data
    if (!queueData) {
      return {
        status: 'error',
        error: new Error(
          '[CRITICAL] Sales return receiving queue missing after load'
        ),
        scope: 'useSalesReturnReceivingQueue.queue',
      }
    }
    if (!categoryOptions) {
      return {
        status: 'error',
        error: new Error(
          '[CRITICAL] Warehouse category options missing after load'
        ),
        scope: 'useSalesReturnReceivingQueue.categoryOptions',
      }
    }

    const salesReturnVirtualWarehouse = categoryOptions.find(
      (category) => category.code === SALES_RETURN_VIRTUAL_WAREHOUSE_CODE
    )
    if (!salesReturnVirtualWarehouse) {
      return {
        status: 'error',
        error: new Error(
          `[CRITICAL] Missing required warehouse category ${SALES_RETURN_VIRTUAL_WAREHOUSE_CODE}`
        ),
        scope: 'useSalesReturnReceivingQueue.salesReturnVirtualWarehouse',
      }
    }

    const items = queueData.items
      .filter(isWarehousePendingReturn)
      .map(toQueueItem)

    return {
      status: 'ready',
      items,
      totalPendingQuantity: items.reduce(
        (sum, item) => sum + item.totalQuantity,
        0
      ),
      salesReturnVirtualWarehouseName:
        salesReturnVirtualWarehouse.label || salesReturnVirtualWarehouse.name,
    }
  }, [
    categoryOptionsQuery.data,
    categoryOptionsQuery.error,
    categoryOptionsQuery.isPending,
    queueQuery.data,
    queueQuery.error,
    queueQuery.isPending,
  ])

  useEffect(() => {
    if (readResource.status !== 'error') {
      return
    }

    logger.error(
      `Failed to load sales return receiving queue: ${readResource.scope}`,
      readResource.error
    )
    failLoudly(readResource.error, readResource.scope)
  }, [readResource])

  return {
    readResource,
    isRefreshing: queueQuery.isFetching || categoryOptionsQuery.isFetching,
    retry: async () => {
      await Promise.all([queueQuery.refetch(), categoryOptionsQuery.refetch()])
    },
  }
}
