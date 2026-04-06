import { apiFetch } from '@/lib/api-client'
import { type SalesOrder } from '../data/schema'

const getSalesOrderByNo = async (orderNo: string): Promise<SalesOrder> => {
  return apiFetch<SalesOrder>(`/sales-orders/by-no/${orderNo}`)
}

const saveSalesOrderDeliveryProgress = async (order: SalesOrder): Promise<SalesOrder> => {
  return apiFetch<SalesOrder>('/sales-orders', {
    method: 'POST',
    body: JSON.stringify(order),
  })
}

export const updateOrderDelivery = async (
  orderNo: string,
  materialId: string,
  quantity: number,
): Promise<void> => {
  const order = await getSalesOrderByNo(orderNo).catch(() => null)
  if (!order || order.isDeleted) return

  let changed = false
  order.lines = (order.lines || []).map((line) => {
    if (line.productId === materialId || line.productCode === materialId) {
      const delivered = Math.max(0, Number(line.deliveredQty || 0) + quantity)
      changed = true
      return {
        ...line,
        deliveredQty: delivered,
        status: delivered >= line.qty ? 'Done' : delivered > 0 ? 'InProgress' : 'Pending',
      }
    }
    return line
  })

  if (!changed) return

  const allDone = order.lines.every((line) => Number(line.deliveredQty || 0) >= line.qty)
  const anyStarted = order.lines.some((line) => Number(line.deliveredQty || 0) > 0)

  if (allDone) {
    order.status = 'Done'
  } else if (anyStarted) {
    order.status = 'InProgress'
  } else {
    order.status = 'Pending'
  }

  await saveSalesOrderDeliveryProgress(order)
}
