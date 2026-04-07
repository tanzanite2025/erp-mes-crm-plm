import { useNotificationStore } from '@/features/system-mgmt/notifications/notification-store'
import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { createLogger } from '@/lib/logger'
import { type SalesOrder } from '../../data/schema'

const logger = createLogger('salesService')

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

type GetSalesOrdersOptions = {
  page?: number
  pageSize?: number
  withLines?: boolean
  status?: string[]
}

export const getSalesOrders = async (options: GetSalesOrdersOptions = {}): Promise<PaginatedResponse<SalesOrder>> => {
  const { page = 1, pageSize = 50, withLines = false, status } = options

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })

  if (withLines) {
    params.set('withLines', 'true')
  }
  if (status && status.length > 0) {
    params.set('status', status.join(','))
  }

  const res = await apiFetch<PaginatedResponse<SalesOrder>>(`/sales-orders?${params.toString()}`)
  return ensureObjectResponse<PaginatedResponse<SalesOrder> & Record<string, unknown>>(res, 'SalesService.getSalesOrders') as PaginatedResponse<SalesOrder>
}

export const getSalesOrderById = async (id: string): Promise<SalesOrder> => {
  const res = await apiFetch<SalesOrder>(`/sales-orders/${id}`)
  return ensureObjectResponse<SalesOrder & Record<string, unknown>>(res, 'SalesService.getSalesOrderById') as SalesOrder
}

export const getSalesOrderByNo = async (orderNo: string): Promise<SalesOrder> => {
  const res = await apiFetch<SalesOrder>(`/sales-orders/by-no/${orderNo}`)
  return ensureObjectResponse<SalesOrder & Record<string, unknown>>(res, 'SalesService.getSalesOrderByNo') as SalesOrder
}

export const createSalesOrder = async (order: Omit<SalesOrder, 'id' | 'version'>): Promise<SalesOrder> => {
  const res = await apiFetch<SalesOrder>('/sales-orders', {
    method: 'POST',
    body: JSON.stringify(order),
  })
  return ensureObjectResponse<SalesOrder & Record<string, unknown>>(res, 'SalesService.createSalesOrder') as SalesOrder
}

export const deleteSalesOrder = async (id: string): Promise<void> => {
  await apiFetch<void>(`/sales-orders/${id}`, { method: 'DELETE' })
  useNotificationStore.getState().archiveByOrderId(id)
}

export const patchSalesOrder = async (id: string, delta: DeltaSet, version: number): Promise<SalesOrder> => {
  const payload: DeltaPayload = {
    op: 'PATCH',
    delta,
    metadata: { id, version },
  }

  const res = await apiFetch<SalesOrder>(`/sales-orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return ensureObjectResponse<SalesOrder & Record<string, unknown>>(res, 'SalesService.patchSalesOrder') as SalesOrder
}

export const claimOrderLine = async (orderId: string, lineNos: number[], operator: string): Promise<SalesOrder> => {
  const order = await getSalesOrderById(orderId)

  const nextLines = order.lines.map((line) => {
    if (lineNos.includes(line.lineNo)) {
      return {
        ...line,
        claimedBy: operator,
        claimedAt: new Date().toISOString(),
      }
    }
    return line
  })

  return patchSalesOrder(orderId, {
    lines: { o: order.lines, n: nextLines },
  }, order.version)
}

export const updateOrderDelivery = async (orderNo: string, materialId: string, quantity: number): Promise<void> => {
  const order = await getSalesOrderByNo(orderNo)
  if (!order) {
    logger.error('Order not found for delivery update', { orderNo, materialId, quantity })
    return
  }
  if (order.isDeleted) return

  let changed = false
  const nextLines = order.lines.map((line) => {
    if (line.productId === materialId || line.productCode === materialId) {
      const delivered = Math.max(0, Number(line.deliveredQty || 0) + quantity)
      changed = true
      return {
        ...line,
        deliveredQty: delivered,
      }
    }
    return line
  })

  if (changed) {
    await patchSalesOrder(order.id, {
      lines: { o: order.lines, n: nextLines },
    }, order.version)
  }
}
