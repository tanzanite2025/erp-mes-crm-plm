import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { buildVersionedPatchMetadata } from '@/lib/version-guard'
import { type PurchaseOrder } from '../data/schema'
import {
  PURCHASE_QUERY_PARAM_PAGE,
  PURCHASE_QUERY_PARAM_PAGE_SIZE,
  PURCHASE_QUERY_PARAM_STATUS,
  PURCHASE_QUERY_PARAM_WITH_LINES,
} from '../query-params'
import {
  toPurchaseOrderApiDTO,
  toPurchaseOrderContract,
  toPurchaseOrderListPageContract,
  toPurchaseOrderListPageWithLinesContract,
  type PaginatedPurchaseOrderListItems,
  type PaginatedPurchaseOrders,
} from '../adapters/purchase-order-api-adapter'
import {
  deserializePurchaseOrderApiDTO,
  deserializePurchaseOrderListPageApiDTO,
  type PurchaseOrderListItemWithLinesApiDTO,
  type PurchaseOrderApiDTO,
  type PurchaseOrderListPageApiDTO,
} from '../contracts/purchase-order-api-dto'

export const PURCHASE_ORDER_PATCH_INTENT_SAVE = 'PURCHASE_ORDER_PATCH_SAVE'

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

export function getPurchaseOrders(
  options: GetPurchaseOrdersOptions & { withLines: true }
): Promise<PaginatedPurchaseOrders>
export function getPurchaseOrders(
  options?: GetPurchaseOrdersOptions & { withLines?: false }
): Promise<PaginatedPurchaseOrderListItems>
export async function getPurchaseOrders(
  options: GetPurchaseOrdersOptions = {}
): Promise<PaginatedPurchaseOrders | PaginatedPurchaseOrderListItems> {
  const { page = 1, pageSize = 50, withLines = false, status } = options
  const params = new URLSearchParams({
    [PURCHASE_QUERY_PARAM_PAGE]: String(page),
    [PURCHASE_QUERY_PARAM_PAGE_SIZE]: String(pageSize),
  })
  if (withLines) {
    params.set(PURCHASE_QUERY_PARAM_WITH_LINES, 'true')
  }
  if (status && status.length > 0) {
    params.set(PURCHASE_QUERY_PARAM_STATUS, status.join(','))
  }

  const res = await apiFetch<PurchaseOrderListPageApiDTO>(
    `/purchase/orders?${params.toString()}`
  )
  const response = ensureObjectResponse<
    PurchaseOrderListPageApiDTO & Record<string, unknown>
  >(res, 'PurchaseService.getPurchaseOrders')

  if (withLines) {
    return toPurchaseOrderListPageWithLinesContract(
      deserializePurchaseOrderListPageApiDTO(response, { withLines: true }) as {
        items: PurchaseOrderListItemWithLinesApiDTO[]
        total: number
        page: number
        pageSize: number
      }
    )
  }

  return toPurchaseOrderListPageContract(
    deserializePurchaseOrderListPageApiDTO(response, { withLines: false })
  )
}

export const getDeletedPurchaseOrders = async (
  page = 1,
  pageSize = 50
): Promise<PaginatedPurchaseOrderListItems> => {
  const params = new URLSearchParams({
    [PURCHASE_QUERY_PARAM_PAGE]: String(page),
    [PURCHASE_QUERY_PARAM_PAGE_SIZE]: String(pageSize),
  })
  const res = await apiFetch<PurchaseOrderListPageApiDTO>(
    `/purchase/deleted-orders?${params.toString()}`
  )
  const response = ensureObjectResponse<
    PurchaseOrderListPageApiDTO & Record<string, unknown>
  >(res, 'PurchaseService.getDeletedPurchaseOrders')
  return toPurchaseOrderListPageContract(
    deserializePurchaseOrderListPageApiDTO(response, { withLines: false })
  )
}

export const getPurchaseOrderById = async (
  id: string
): Promise<PurchaseOrder> => {
  const res = await apiFetch<PurchaseOrderApiDTO>(`/purchase/orders/${id}`)
  const response = ensureObjectResponse<
    PurchaseOrderApiDTO & Record<string, unknown>
  >(res, 'PurchaseService.getPurchaseOrderById')
  return toPurchaseOrderContract(deserializePurchaseOrderApiDTO(response))
}

export const createPurchaseOrder = async (
  order: Omit<PurchaseOrder, 'id' | 'version'>
): Promise<PurchaseOrder> => {
  const createdOrder: PurchaseOrder = {
    ...order,
    id: '',
    version: 1,
  }

  const res = await apiFetch<PurchaseOrderApiDTO>('/purchase/orders', {
    method: 'POST',
    body: JSON.stringify(toPurchaseOrderApiDTO(createdOrder)),
  })
  const response = ensureObjectResponse<
    PurchaseOrderApiDTO & Record<string, unknown>
  >(res, 'PurchaseService.createPurchaseOrder')
  return toPurchaseOrderContract(deserializePurchaseOrderApiDTO(response))
}

export const patchPurchaseOrder = async (
  id: string,
  delta: DeltaSet,
  version: number
): Promise<PurchaseOrder> => {
  const payload: DeltaPayload = {
    op: 'PATCH',
    delta,
    metadata: buildVersionedPatchMetadata(
      id,
      version,
      'PurchaseService.patchPurchaseOrder',
      {
        intent: PURCHASE_ORDER_PATCH_INTENT_SAVE,
      }
    ),
  }

  const res = await apiFetch<PurchaseOrderApiDTO>(`/purchase/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  const response = ensureObjectResponse<
    PurchaseOrderApiDTO & Record<string, unknown>
  >(res, 'PurchaseService.patchPurchaseOrder')
  return toPurchaseOrderContract(deserializePurchaseOrderApiDTO(response))
}

export const deletePurchaseOrder = async (id: string): Promise<void> => {
  await apiFetch<void>(`/purchase/orders/${id}`, { method: 'DELETE' })
}
