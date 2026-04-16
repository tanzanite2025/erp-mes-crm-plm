import { NotificationGateway } from '@/features/system-mgmt/notifications/notification-gateway'
import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { type SalesOrder, type SalesOrderFormValues } from '../../data/schema'
import { toSalesOrderApiDTO, toSalesOrderContract } from '../adapters/sales-order-api-adapter'
import { type SalesOrderApiDTO } from '../contracts/sales-order-api-dto'

export const createSalesOrder = async (order: SalesOrderFormValues): Promise<SalesOrder> => {
  const createdOrder: SalesOrder = {
    ...order,
    id: '',
    version: 1,
  }

  const res = await apiFetch<SalesOrderApiDTO>('/sales-orders', {
    method: 'POST',
    body: JSON.stringify(toSalesOrderApiDTO(createdOrder)),
  })
  const response = ensureObjectResponse<SalesOrderApiDTO & Record<string, unknown>>(res, 'SalesService.createSalesOrder')
  return toSalesOrderContract(response)
}

export const patchSalesOrder = async (id: string, delta: DeltaSet, version: number): Promise<SalesOrder> => {
  const payload: DeltaPayload = {
    op: 'PATCH',
    delta,
    metadata: { id, version },
  }

  const res = await apiFetch<SalesOrderApiDTO>(`/sales-orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  const response = ensureObjectResponse<SalesOrderApiDTO & Record<string, unknown>>(res, 'SalesService.patchSalesOrder')
  return toSalesOrderContract(response)
}

export const deleteSalesOrder = async (id: string): Promise<void> => {
  await apiFetch<void>(`/sales-orders/${id}`, { method: 'DELETE' })
  NotificationGateway.archiveByOrderId(id)
}
