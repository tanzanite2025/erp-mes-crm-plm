import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { type PurchaseOrder } from '../../data/schema'

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

export const getPurchaseOrders = async (page = 1, pageSize = 50): Promise<PaginatedResponse<PurchaseOrder>> => {
  const res = await apiFetch<PaginatedResponse<PurchaseOrder>>(`/purchase/orders?page=${page}&pageSize=${pageSize}`)
  return ensureObjectResponse<PaginatedResponse<PurchaseOrder> & Record<string, unknown>>(res, 'PurchaseService.getPurchaseOrders') as PaginatedResponse<PurchaseOrder>
}

export const getDeletedPurchaseOrders = async (page = 1, pageSize = 50): Promise<PaginatedResponse<PurchaseOrder>> => {
  const res = await apiFetch<PaginatedResponse<PurchaseOrder>>(`/purchase/deleted-orders?page=${page}&pageSize=${pageSize}`)
  return ensureObjectResponse<PaginatedResponse<PurchaseOrder> & Record<string, unknown>>(res, 'PurchaseService.getDeletedPurchaseOrders') as PaginatedResponse<PurchaseOrder>
}

export const getPurchaseOrderById = async (id: string): Promise<PurchaseOrder> => {
  const res = await apiFetch<PurchaseOrder>(`/purchase/orders/${id}`)
  return ensureObjectResponse<PurchaseOrder & Record<string, unknown>>(res, 'PurchaseService.getPurchaseOrderById') as PurchaseOrder
}

export const createPurchaseOrder = async (order: Omit<PurchaseOrder, 'id' | 'version'>): Promise<PurchaseOrder> => {
  const res = await apiFetch<PurchaseOrder>('/purchase/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  })
  return ensureObjectResponse<PurchaseOrder & Record<string, unknown>>(res, 'PurchaseService.createPurchaseOrder') as PurchaseOrder
}

export const patchPurchaseOrder = async (id: string, delta: DeltaSet, version: number): Promise<PurchaseOrder> => {
  const payload: DeltaPayload = {
    op: 'PATCH',
    delta,
    metadata: { id, version },
  }

  const res = await apiFetch<PurchaseOrder>(`/purchase/orders/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return ensureObjectResponse<PurchaseOrder & Record<string, unknown>>(res, 'PurchaseService.patchPurchaseOrder') as PurchaseOrder
}

export const confirmPurchaseReceipt = async (
  id: string,
  payload: ConfirmPurchaseReceiptPayload
): Promise<ConfirmPurchaseReceiptResponse> => {
  const res = await apiFetch<ConfirmPurchaseReceiptResponse>(`/purchase/orders/${id}/confirm-receipt`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return ensureObjectResponse<ConfirmPurchaseReceiptResponse & Record<string, unknown>>(res, 'PurchaseService.confirmPurchaseReceipt') as ConfirmPurchaseReceiptResponse
}

export const deletePurchaseOrder = async (id: string): Promise<void> => {
  await apiFetch<void>(`/purchase/orders/${id}`, { method: 'DELETE' })
}
