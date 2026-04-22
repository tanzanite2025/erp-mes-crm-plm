import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { type PurchaseOrder } from '../../data/schema'
import {
  TRADING_QUERY_PARAM_PAGE,
  TRADING_QUERY_PARAM_PAGE_SIZE,
  TRADING_QUERY_PARAM_STATUS,
  TRADING_QUERY_PARAM_WITH_LINES,
} from '../../query-params'
import {
  toPurchaseOrderApiDTO,
  toPurchaseOrderContract,
  toPurchaseOrderListPageContract,
  type PaginatedPurchaseOrders,
} from '../adapters/purchase-order-api-adapter'
import {
  deserializePurchaseOrderApiDTO,
  deserializePurchaseOrderListPageApiDTO,
  type PurchaseOrderApiDTO,
  type PurchaseOrderListPageApiDTO,
} from '../contracts/purchase-order-api-dto'

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface GetPurchaseOrdersOptions {
  page?: number
  pageSize?: number
  withLines?: boolean
  status?: string[]
}

export const getPurchaseOrders = async (
  options: GetPurchaseOrdersOptions = {}
): Promise<PaginatedPurchaseOrders> => {
  const { page = 1, pageSize = 50, withLines = false, status } = options
  const params = new URLSearchParams({
    [TRADING_QUERY_PARAM_PAGE]: String(page),
    [TRADING_QUERY_PARAM_PAGE_SIZE]: String(pageSize),
  })
  if (withLines) {
    params.set(TRADING_QUERY_PARAM_WITH_LINES, 'true')
  }
  if (status && status.length > 0) {
    params.set(TRADING_QUERY_PARAM_STATUS, status.join(','))
  }

  const res = await apiFetch<unknown>(`/purchase/orders?${params.toString()}`)
  const response = ensureObjectResponse<PurchaseOrderListPageApiDTO & Record<string, unknown>>(
    res,
    'PurchaseService.getPurchaseOrders'
  )
  return toPurchaseOrderListPageContract(
    deserializePurchaseOrderListPageApiDTO(response, { withLines })
  )
}

export const getDeletedPurchaseOrders = async (page = 1, pageSize = 50): Promise<PaginatedPurchaseOrders> => {
  const params = new URLSearchParams({
    [TRADING_QUERY_PARAM_PAGE]: String(page),
    [TRADING_QUERY_PARAM_PAGE_SIZE]: String(pageSize),
  })
  const res = await apiFetch<unknown>(`/purchase/deleted-orders?${params.toString()}`)
  const response = ensureObjectResponse<PurchaseOrderListPageApiDTO & Record<string, unknown>>(
    res,
    'PurchaseService.getDeletedPurchaseOrders'
  )
  return toPurchaseOrderListPageContract(
    deserializePurchaseOrderListPageApiDTO(response, { withLines: false })
  )
}

export const getPurchaseOrderById = async (id: string): Promise<PurchaseOrder> => {
  const res = await apiFetch<unknown>(`/purchase/orders/${id}`)
  const response = ensureObjectResponse<PurchaseOrderApiDTO & Record<string, unknown>>(
    res,
    'PurchaseService.getPurchaseOrderById'
  )
  return toPurchaseOrderContract(deserializePurchaseOrderApiDTO(response))
}

export const createPurchaseOrder = async (order: Omit<PurchaseOrder, 'id' | 'version'>): Promise<PurchaseOrder> => {
  const createdOrder: PurchaseOrder = {
    ...order,
    id: '',
    version: 1,
  }

  const res = await apiFetch<unknown>('/purchase/orders', {
    method: 'POST',
    body: JSON.stringify(toPurchaseOrderApiDTO(createdOrder)),
  })
  const response = ensureObjectResponse<PurchaseOrderApiDTO & Record<string, unknown>>(
    res,
    'PurchaseService.createPurchaseOrder'
  )
  return toPurchaseOrderContract(deserializePurchaseOrderApiDTO(response))
}

export const patchPurchaseOrder = async (id: string, delta: DeltaSet, version: number): Promise<PurchaseOrder> => {
  const payload: DeltaPayload = {
    op: 'PATCH',
    delta,
    metadata: { id, version },
  }

  const res = await apiFetch<unknown>(`/purchase/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  const response = ensureObjectResponse<PurchaseOrderApiDTO & Record<string, unknown>>(
    res,
    'PurchaseService.patchPurchaseOrder'
  )
  return toPurchaseOrderContract(deserializePurchaseOrderApiDTO(response))
}

export const deletePurchaseOrder = async (id: string): Promise<void> => {
  await apiFetch<void>(`/purchase/orders/${id}`, { method: 'DELETE' })
}
