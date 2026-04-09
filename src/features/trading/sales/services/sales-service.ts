import { NotificationGateway } from '@/features/system-mgmt/notifications/notification-gateway'
import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type SalesOrder } from '../../data/schema'

export const createSalesOrder = async (order: Omit<SalesOrder, 'id' | 'version'>): Promise<SalesOrder> => {
  const res = await apiFetch<SalesOrder>('/sales-orders', {
    method: 'POST',
    body: JSON.stringify(order),
  })
  return ensureObjectResponse<SalesOrder & Record<string, unknown>>(res, 'SalesService.createSalesOrder') as SalesOrder
}

export const deleteSalesOrder = async (id: string): Promise<void> => {
  await apiFetch<void>(`/sales-orders/${id}`, { method: 'DELETE' })
  NotificationGateway.archiveByOrderId(id)
}
