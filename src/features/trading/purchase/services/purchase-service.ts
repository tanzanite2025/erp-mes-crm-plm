import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { type PurchaseOrder } from '../../data/schema'
import {
  toConfirmPurchaseReceiptContract,
  toPurchaseOrderApiDTO,
  toPurchaseOrderContract,
  toPurchaseOrderListPageContract,
  type ConfirmPurchaseReceiptContract,
  type PaginatedPurchaseOrders,
} from '../adapters/purchase-order-api-adapter'
import {
  type ConfirmPurchaseReceiptResponseApiDTO,
  type PurchaseOrderApiDTO,
  type PurchaseOrderListPageApiDTO,
} from '../contracts/purchase-order-api-dto'

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface ConfirmPurchaseReceiptLinePayload {
  purchaseOrderLineId: number
  materialId: string
  quantity: number
  purchasePrice: number
  batchNo: string
  targetCategory: string
}

export interface ConfirmPurchaseReceiptPayload {
  operator?: string
  remarks?: string
  receiptDate?: string
  lines: ConfirmPurchaseReceiptLinePayload[]
}

export interface ConfirmPurchaseReceiptResponse {
  purchaseOrder: PurchaseOrder
  createdInboundRecords: Array<{ id: string }>
}

export const getPurchaseOrders = async (page = 1, pageSize = 50): Promise<PaginatedPurchaseOrders> => {
  const res = await apiFetch<PurchaseOrderListPageApiDTO>(`/purchase/orders?page=${page}&pageSize=${pageSize}`)
  return toPurchaseOrderListPageContract(
    ensureObjectResponse<PurchaseOrderListPageApiDTO & Record<string, unknown>>(res, 'PurchaseService.getPurchaseOrders') as PurchaseOrderListPageApiDTO
  )
}

export const getDeletedPurchaseOrders = async (page = 1, pageSize = 50): Promise<PaginatedPurchaseOrders> => {
  const res = await apiFetch<PurchaseOrderListPageApiDTO>(`/purchase/deleted-orders?page=${page}&pageSize=${pageSize}`)
  return toPurchaseOrderListPageContract(
    ensureObjectResponse<PurchaseOrderListPageApiDTO & Record<string, unknown>>(res, 'PurchaseService.getDeletedPurchaseOrders') as PurchaseOrderListPageApiDTO
  )
}

export const getPurchaseOrderById = async (id: string): Promise<PurchaseOrder> => {
  const res = await apiFetch<PurchaseOrderApiDTO>(`/purchase/orders/${id}`)
  return toPurchaseOrderContract(
    ensureObjectResponse<PurchaseOrderApiDTO & Record<string, unknown>>(res, 'PurchaseService.getPurchaseOrderById') as PurchaseOrderApiDTO
  )
}

export const createPurchaseOrder = async (order: Omit<PurchaseOrder, 'id' | 'version'>): Promise<PurchaseOrder> => {
  const res = await apiFetch<PurchaseOrderApiDTO>('/purchase/orders', {
    method: 'POST',
    body: JSON.stringify(toPurchaseOrderApiDTO({ ...order, id: '', version: 1 } as PurchaseOrder)),
  })
  return toPurchaseOrderContract(
    ensureObjectResponse<PurchaseOrderApiDTO & Record<string, unknown>>(res, 'PurchaseService.createPurchaseOrder') as PurchaseOrderApiDTO
  )
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
  return toPurchaseOrderContract(
    ensureObjectResponse<PurchaseOrderApiDTO & Record<string, unknown>>(res, 'PurchaseService.patchPurchaseOrder') as PurchaseOrderApiDTO
  )
}

export const confirmPurchaseReceipt = async (
  id: string,
  payload: ConfirmPurchaseReceiptPayload
): Promise<ConfirmPurchaseReceiptContract> => {
  const res = await apiFetch<ConfirmPurchaseReceiptResponseApiDTO>(`/purchase/orders/${id}/confirm-receipt`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return toConfirmPurchaseReceiptContract(
    ensureObjectResponse<ConfirmPurchaseReceiptResponseApiDTO & Record<string, unknown>>(res, 'PurchaseService.confirmPurchaseReceipt') as ConfirmPurchaseReceiptResponseApiDTO
  )
}

export const deletePurchaseOrder = async (id: string): Promise<void> => {
  await apiFetch<void>(`/purchase/orders/${id}`, { method: 'DELETE' })
}
