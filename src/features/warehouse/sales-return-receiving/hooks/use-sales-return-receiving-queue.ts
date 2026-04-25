import { useMemo } from 'react'
import type { OrderEvidence } from '@/features/trading/data/schema'
import { useGetSalesReturns } from '@/features/trading/sales/hooks/use-sales-returns'
import type {
  SalesReturnLine,
  SalesReturnRecord,
} from '@/features/trading/sales/services/sales-return-service'

const TERMINAL_SALES_RETURN_STATUSES = new Set([
  'closed',
  'completed',
  'canceled',
  'cancelled',
])

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
  const query = useGetSalesReturns({
    page: 1,
    pageSize: 20,
    status: 'all',
  })

  const items = useMemo(() => {
    return (query.data?.items ?? [])
      .filter(isWarehousePendingReturn)
      .map(toQueueItem)
  }, [query.data?.items])

  const totalPendingQuantity = useMemo(() => {
    return items.reduce((sum, item) => sum + item.totalQuantity, 0)
  }, [items])

  return {
    items,
    totalPendingQuantity,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
  }
}
