import { NotificationGateway } from '@/features/system-mgmt/notifications/notification-gateway'
import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type SalesOrder } from '../../data/schema'
import { toSalesOrderApiDTO, toSalesOrderContract } from '../adapters/sales-order-api-adapter'
import { type SalesOrderApiDTO } from '../contracts/sales-order-api-dto'

export const createSalesOrder = async (order: Omit<SalesOrder, 'id' | 'version'>): Promise<SalesOrder> => {
  const res = await apiFetch<SalesOrderApiDTO>('/sales-orders', {
    method: 'POST',
    body: JSON.stringify(toSalesOrderApiDTO({ ...order, id: '', version: 1 } as SalesOrder)),
  })
  return toSalesOrderContract(
    ensureObjectResponse<SalesOrderApiDTO & Record<string, unknown>>(res, 'SalesService.createSalesOrder') as SalesOrderApiDTO
  )
}

export const deleteSalesOrder = async (id: string): Promise<void> => {
  await apiFetch<void>(`/sales-orders/${id}`, { method: 'DELETE' })
  NotificationGateway.archiveByOrderId(id)
}
