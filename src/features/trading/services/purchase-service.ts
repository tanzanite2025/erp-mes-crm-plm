import { type PurchaseOrder } from '../data/schema'
import { apiFetch } from '@/lib/api-client'

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}

export const getPurchaseOrders = async (page = 1, pageSize = 50): Promise<PaginatedResponse<PurchaseOrder>> => {
    return apiFetch<PaginatedResponse<PurchaseOrder>>(`/purchase/orders?page=${page}&pageSize=${pageSize}`);
}

export const getDeletedPurchaseOrders = async (page = 1, pageSize = 50): Promise<PaginatedResponse<PurchaseOrder>> => {
    return apiFetch<PaginatedResponse<PurchaseOrder>>(`/purchase/deleted-orders?page=${page}&pageSize=${pageSize}`)
}

export const getPurchaseOrderById = async (id: string): Promise<PurchaseOrder> => {
    return apiFetch<PurchaseOrder>(`/purchase/orders/${id}`);
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

export const confirmPurchaseReceipt = async (
    id: string,
    payload: ConfirmPurchaseReceiptPayload
): Promise<ConfirmPurchaseReceiptResponse> => {
    return apiFetch<ConfirmPurchaseReceiptResponse>(`/purchase/orders/${id}/confirm-receipt`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export const savePurchaseOrder = async (order: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
    return apiFetch<PurchaseOrder>('/purchase/orders', {
        method: 'POST',
        body: JSON.stringify(order),
    });
}

export const deletePurchaseOrder = async (id: string): Promise<void> => {
    // 执行逻辑删除 (状态流转或物理隐藏由后端处理)
    await apiFetch<void>(`/purchase/orders/${id}`, { method: 'DELETE' });
}
