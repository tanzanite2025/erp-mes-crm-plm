import { type Customer, type Supplier, type SalesOrder, type PurchaseOrder } from '../data/schema'
import { useNotificationStore } from '@/features/system-mgmt/notifications/notification-store'
import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

const logger = createLogger('tradingService');

type SupplierListMeta = {
    total?: number
    page?: number
    pageSize?: number
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
}

export const getCustomers = async (): Promise<Customer[]> => {
    const res = await apiFetch<Customer[]>('/customers?options=true');
    return ensureArrayResponse<Customer>(res, 'TradingService.getCustomers')
}

/** 仅用于新建客户 */
export const createCustomer = async (customer: Omit<Customer, 'id' | 'version'>): Promise<Customer> => {
    const res = await apiFetch<Customer>('/customers', {
        method: 'POST',
        body: JSON.stringify(customer),
    });
    return ensureObjectResponse<Customer & Record<string, unknown>>(res, 'TradingService.createCustomer') as Customer
}

export const deleteCustomer = async (id: string): Promise<void> => {
    await apiFetch<void>(`/customers/${id}`, { method: 'DELETE' });
}

/**
 * 局部更新客户 (SDRTS 协议)
 */
export const patchCustomer = async (id: string, delta: DeltaSet, version: number): Promise<Customer> => {
    const payload: DeltaPayload = {
        op: 'PATCH',
        delta,
        metadata: { id, version }
    };

    const res = await apiFetch<Customer>(`/customers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
    return ensureObjectResponse<Customer & Record<string, unknown>>(res, 'TradingService.patchCustomer') as Customer
}

// --- Supplier Service (已打通真实后端) ---
export const getSuppliers = async (): Promise<Supplier[]> => {
    const raw = await apiFetch<Supplier[]>('/suppliers');
    const checkedRaw = ensureArrayResponse<Supplier>(raw, 'TradingService.getSuppliers');
    const supplierListMeta = raw as Supplier[] & SupplierListMeta
    
    const result = checkedRaw.map(s => ({
        ...s,
        mainProducts: typeof s.mainProducts === 'string' ? JSON.parse(s.mainProducts) : (s.mainProducts || [])
    }));
    
    if (supplierListMeta.total !== undefined) {
        Object.assign(result, {
            total: supplierListMeta.total,
            page: supplierListMeta.page,
            pageSize: supplierListMeta.pageSize,
        })
    }
    
    return result;
}

/** 仅用于新建供应商 */
export const createSupplier = async (supplier: Omit<Supplier, 'id' | 'version'>): Promise<Supplier> => {
    const payload = {
        ...supplier,
        mainProducts: supplier.mainProducts ? JSON.stringify(supplier.mainProducts) : '[]'
    };

    const res = await apiFetch<Supplier>('/suppliers', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
    return ensureObjectResponse<Supplier & Record<string, unknown>>(res, 'TradingService.createSupplier') as Supplier
}

export const deleteSupplier = async (id: string): Promise<void> => {
    await apiFetch<void>(`/suppliers/${id}`, { method: 'DELETE' });
}

/**
 * 局部更新供应商 (SDRTS 协议)
 */
export const patchSupplier = async (id: string, delta: DeltaSet, version: number): Promise<Supplier> => {
    const payload: DeltaPayload = {
        op: 'PATCH',
        delta,
        metadata: { id, version }
    };

    const res = await apiFetch<Supplier>(`/suppliers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
    return ensureObjectResponse<Supplier & Record<string, unknown>>(res, 'TradingService.patchSupplier') as Supplier
}

// --- Sales Order Service (已支持分页与性能优化) ---

type GetSalesOrdersOptions = {
    page?: number
    pageSize?: number
    withLines?: boolean
    status?: string[]
}

export const getSalesOrders = async (options: GetSalesOrdersOptions = {}): Promise<PaginatedResponse<SalesOrder>> => {
    const {
        page = 1,
        pageSize = 50,
        withLines = false,
        status,
    } = options

    const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    })

    if (withLines) {
        params.set('withLines', 'true')
    }
    if (status && status.length > 0) {
        params.set('status', status.join(','))
    }

    const res = await apiFetch<PaginatedResponse<SalesOrder>>(`/sales-orders?${params.toString()}`);
    return ensureObjectResponse<PaginatedResponse<SalesOrder> & Record<string, unknown>>(res, 'TradingService.getSalesOrders') as PaginatedResponse<SalesOrder>
}

export const getSalesOrderById = async (id: string): Promise<SalesOrder> => {
    const res = await apiFetch<SalesOrder>(`/sales-orders/${id}`);
    return ensureObjectResponse<SalesOrder & Record<string, unknown>>(res, 'TradingService.getSalesOrderById') as SalesOrder
}

export const getSalesOrderByNo = async (orderNo: string): Promise<SalesOrder> => {
    const res = await apiFetch<SalesOrder>(`/sales-orders/by-no/${orderNo}`);
    return ensureObjectResponse<SalesOrder & Record<string, unknown>>(res, 'TradingService.getSalesOrderByNo') as SalesOrder
}

/** 仅用于新建销售订单 */
export const createSalesOrder = async (order: Omit<SalesOrder, 'id' | 'version'>): Promise<SalesOrder> => {
    const res = await apiFetch<SalesOrder>('/sales-orders', {
        method: 'POST',
        body: JSON.stringify(order),
    });
    return ensureObjectResponse<SalesOrder & Record<string, unknown>>(res, 'TradingService.createSalesOrder') as SalesOrder
}

export const deleteSalesOrder = async (id: string): Promise<void> => {
    await apiFetch<void>(`/sales-orders/${id}`, { method: 'DELETE' });
    useNotificationStore.getState().archiveByOrderId(id);
}

export const claimOrderLine = async (orderId: string, lineNos: number[], operator: string): Promise<SalesOrder> => {
    const order = await getSalesOrderById(orderId);

    const nextLines = order.lines.map(line => {
        if (lineNos.includes(line.lineNo)) {
            return {
                ...line,
                claimedBy: operator,
                claimedAt: new Date().toISOString()
            }
        }
        return line
    });

    return patchSalesOrder(orderId, {
        lines: { o: order.lines, n: nextLines }
    }, order.version)
}

/**
 * 局部更新销售订单 (SDRTS 协议)
 */
export const patchSalesOrder = async (id: string, delta: DeltaSet, version: number): Promise<SalesOrder> => {
    const payload: DeltaPayload = {
        op: 'PATCH',
        delta,
        metadata: { id, version }
    };

    const res = await apiFetch<SalesOrder>(`/sales-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
    return ensureObjectResponse<SalesOrder & Record<string, unknown>>(res, 'TradingService.patchSalesOrder') as SalesOrder
}

/**
 * 局部更新采购订单 (SDRTS 协议)
 */
export const patchPurchaseOrder = async (id: string, delta: DeltaSet, version: number): Promise<PurchaseOrder> => {
    const payload: DeltaPayload = {
        op: 'PATCH',
        delta,
        metadata: { id, version }
    };

    const res = await apiFetch<PurchaseOrder>(`/purchase/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
    return ensureObjectResponse<PurchaseOrder & Record<string, unknown>>(res, 'TradingService.patchPurchaseOrder') as PurchaseOrder
}

/**
 * 【加固】跨模块联动：更新订单交付进度 (基于 Delta 原子更新)
 */
export const updateOrderDelivery = async (orderNo: string, materialId: string, quantity: number): Promise<void> => {
    const order = await getSalesOrderByNo(orderNo);
    if (!order) {
        logger.error('Order not found for delivery update', { orderNo, materialId, quantity });
        return;
    }
    if (order.isDeleted) return;

    let changed = false;
    const nextLines = order.lines.map((line) => {
        if (line.productId === materialId || line.productCode === materialId) {
            const delivered = Math.max(0, Number(line.deliveredQty || 0) + quantity);
            changed = true;
            return {
                ...line,
                deliveredQty: delivered,
            }
        }
        return line
    });

    if (changed) {
        await patchSalesOrder(order.id, {
            lines: { o: order.lines, n: nextLines }
        }, order.version);
    }
}


/**
 * 保存采购订单 (全量)
 */
/** 仅用于新建采购订单 */
export const createPurchaseOrder = async (order: Omit<PurchaseOrder, 'id' | 'version'>): Promise<PurchaseOrder> => {
    const res = await apiFetch<PurchaseOrder>('/purchase/orders', {
        method: 'POST',
        body: JSON.stringify(order),
    });
    return ensureObjectResponse<PurchaseOrder & Record<string, unknown>>(res, 'TradingService.createPurchaseOrder') as PurchaseOrder
}

/**
 * 采购订单列表 (分页)
 */
export const getPurchaseOrders = async (page = 1, pageSize = 50): Promise<PaginatedResponse<PurchaseOrder>> => {
    const res = await apiFetch<PaginatedResponse<PurchaseOrder>>(`/purchase/orders?page=${page}&pageSize=${pageSize}`);
    return ensureObjectResponse<PaginatedResponse<PurchaseOrder> & Record<string, unknown>>(res, 'TradingService.getPurchaseOrders') as PaginatedResponse<PurchaseOrder>
}
