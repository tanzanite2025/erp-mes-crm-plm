import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { type PurchaseOrder } from '../../data/schema'
import {
  toPurchaseOrderApiDTO,
  toPurchaseOrderContract,
  toPurchaseOrderListPageContract,
  type PaginatedPurchaseOrders,
} from '../adapters/purchase-order-api-adapter'
import {
  type PurchaseOrderApiDTO,
  type PurchaseOrderListPageApiDTO,
} from '../contracts/purchase-order-api-dto'

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export const getPurchaseOrders = async (page = 1, pageSize = 50): Promise<PaginatedPurchaseOrders> => {
  const res = await apiFetch<PurchaseOrderListPageApiDTO>(`/purchase/orders?page=${page}&pageSize=${pageSize}`)
  const response = ensureObjectResponse<PurchaseOrderListPageApiDTO & Record<string, unknown>>(res, 'PurchaseService.getPurchaseOrders')
  return toPurchaseOrderListPageContract(response)
}

export const getDeletedPurchaseOrders = async (page = 1, pageSize = 50): Promise<PaginatedPurchaseOrders> => {
  const res = await apiFetch<PurchaseOrderListPageApiDTO>(`/purchase/deleted-orders?page=${page}&pageSize=${pageSize}`)
  const response = ensureObjectResponse<PurchaseOrderListPageApiDTO & Record<string, unknown>>(res, 'PurchaseService.getDeletedPurchaseOrders')
  return toPurchaseOrderListPageContract(response)
}

export const getPurchaseOrderById = async (id: string): Promise<PurchaseOrder> => {
  const res = await apiFetch<PurchaseOrderApiDTO>(`/purchase/orders/${id}`)
  const response = ensureObjectResponse<PurchaseOrderApiDTO & Record<string, unknown>>(res, 'PurchaseService.getPurchaseOrderById')
  return toPurchaseOrderContract(response)
}

export const createPurchaseOrder = async (order: Omit<PurchaseOrder, 'id' | 'version'>): Promise<PurchaseOrder> => {
  const createdOrder: PurchaseOrder = {
    ...order,
    id: '',
    version: 1,
  }

  const res = await apiFetch<PurchaseOrderApiDTO>('/purchase/orders', {
    method: 'POST',
    body: JSON.stringify(toPurchaseOrderApiDTO(createdOrder)),
  })
  const response = ensureObjectResponse<PurchaseOrderApiDTO & Record<string, unknown>>(res, 'PurchaseService.createPurchaseOrder')
  return toPurchaseOrderContract(response)
}

export const patchPurchaseOrder = async (id: string, delta: DeltaSet, version: number): Promise<PurchaseOrder> => {
  const payload: DeltaPayload = {
    op: 'PATCH',
    delta,
    metadata: { id, version },
  }

  const res = await apiFetch<PurchaseOrderApiDTO>(`/purchase/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  const response = ensureObjectResponse<PurchaseOrderApiDTO & Record<string, unknown>>(res, 'PurchaseService.patchPurchaseOrder')
  return toPurchaseOrderContract(response)
}

export const deletePurchaseOrder = async (id: string): Promise<void> => {
  await apiFetch<void>(`/purchase/orders/${id}`, { method: 'DELETE' })
}
