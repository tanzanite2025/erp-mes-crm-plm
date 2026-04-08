import { useNotificationStore } from '@/features/system-mgmt/notifications/notification-store'
import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { createLogger } from '@/lib/logger'
import { type SalesOrder } from '../../data/schema'
import { getSalesOrderByNo } from './sales-query-service'

const logger = createLogger('salesService')

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
