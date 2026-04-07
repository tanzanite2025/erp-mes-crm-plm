import { type Customer, type Supplier, type SalesOrder, type SalesOrderStatus, type PurchaseOrder } from '../data/schema'
import { auditUtils } from '@/lib/audit-utils'
import { useNotificationStore } from '@/features/system-mgmt/notifications/notification-store'
import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { trackDelta } from '@/lib/delta/proxy-tracker'

const logger = createLogger('tradingService');

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

export const saveCustomer = async (customer: Partial<Customer>): Promise<Customer> => {
    return apiFetch<Customer>('/customers', {
        method: 'POST',
        body: JSON.stringify(customer),
    });
}

export const deleteCustomer = async (id: string): Promise<void> => {
    await apiFetch<void>(`/customers/${id}`, { method: 'DELETE' });
}

// --- Supplier Service (已打通真实后端) ---
export const getSuppliers = async (): Promise<Supplier[]> => {
    const raw = await apiFetch<Supplier[]>('/suppliers');
    const checkedRaw = ensureArrayResponse<Supplier>(raw, 'TradingService.getSuppliers');
    
    const result = checkedRaw.map(s => ({
        ...s,
        mainProducts: typeof s.mainProducts === 'string' ? JSON.parse(s.mainProducts) : (s.mainProducts || [])
    }));
    
    if ((raw as any).total !== undefined) {
        (result as any).total = (raw as any).total;
        (result as any).page = (raw as any).page;
        (result as any).pageSize = (raw as any).pageSize;
    }
    
    return result;
}

export const saveSupplier = async (supplier: Partial<Supplier>): Promise<Supplier> => {
    const payload = {
        ...supplier,
        mainProducts: supplier.mainProducts ? JSON.stringify(supplier.mainProducts) : '[]'
    };

    return apiFetch<Supplier>('/suppliers', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

export const deleteSupplier = async (id: string): Promise<void> => {
    await apiFetch<void>(`/suppliers/${id}`, { method: 'DELETE' });
}

// --- Sales Order Service (已支持分页与性能优化) ---

export const getSalesOrders = async (page = 1, pageSize = 50): Promise<PaginatedResponse<SalesOrder>> => {
    const res = await apiFetch<PaginatedResponse<SalesOrder>>(`/sales-orders?page=${page}&pageSize=${pageSize}`);
    return ensureObjectResponse<PaginatedResponse<SalesOrder> & Record<string, unknown>>(res, 'TradingService.getSalesOrders') as PaginatedResponse<SalesOrder>
}

export const getSalesOrderById = async (id: string): Promise<SalesOrder> => {
    return apiFetch<SalesOrder>(`/sales-orders/${id}`);
}

export const getSalesOrderByNo = async (orderNo: string): Promise<SalesOrder> => {
    return apiFetch<SalesOrder>(`/sales-orders/by-no/${orderNo}`);
}

export const saveSalesOrder = async (order: Partial<SalesOrder>): Promise<SalesOrder> => {
    if (order.status && ['Canceled', 'Done'].includes(order.status) && order.lines) {
        const targetStatus = order.status;
        order.lines = order.lines.map(line => ({
            ...line,
            status: targetStatus
        }))
    }
    
    return apiFetch<SalesOrder>('/sales-orders', {
        method: 'POST',
        body: JSON.stringify(order),
    });
}

export const deleteSalesOrder = async (id: string): Promise<void> => {
    const order = await getSalesOrderById(id);

    if (order.status === 'Canceled') {
        await apiFetch<void>(`/sales-orders/${id}`, { method: 'DELETE' });
    } else {
        const canceledOrder = auditUtils.stamp({
            ...order,
            status: 'Canceled' as SalesOrderStatus,
            lines: order.lines.map(line => ({ ...line, status: 'Canceled' as SalesOrderStatus }))
        }, 'update');
        await saveSalesOrder(canceledOrder);
    }
    
    useNotificationStore.getState().archiveByOrderId(id);
}

export const claimOrderLine = async (orderId: string, lineNos: number[], operator: string): Promise<SalesOrder> => {
    const order = await getSalesOrderById(orderId);
    
    order.lines = order.lines.map(line => {
        if (lineNos.includes(line.lineNo)) {
            return {
                ...line,
                claimedBy: operator,
                claimedAt: new Date().toISOString()
            }
        }
        return line
    });

    const allClaimed = order.lines.every(l => !!l.claimedBy)
    if (allClaimed && order.status === 'Pending') {
        order.status = 'InProgress'
    }

    const stampedOrder = auditUtils.stamp(order, 'update');
    return saveSalesOrder(stampedOrder);
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

    return apiFetch<SalesOrder>(`/sales-orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
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

    return apiFetch<PurchaseOrder>(`/purchase/orders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    });
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

    // 使用 ProxyTracker 捕获交付变更
    const tracker = trackDelta(order);
    const draft = tracker.data as SalesOrder;

    let changed = false;
    draft.lines.forEach((line, index) => {
        if (line.productId === materialId || line.productCode === materialId) {
            const delivered = Math.max(0, Number(line.deliveredQty || 0) + quantity);
            draft.lines[index].deliveredQty = delivered;
            draft.lines[index].status = delivered >= line.qty ? 'Done' : (delivered > 0 ? 'InProgress' : 'Pending');
            changed = true;
        }
    });

    if (changed) {
        // 自动触发主表状态机流转
        const allDone = draft.lines.every(l => Number(l.deliveredQty || 0) >= l.qty);
        const anyStarted = draft.lines.some(l => Number(l.deliveredQty || 0) > 0);

        if (allDone) {
            draft.status = 'Done';
        } else if (anyStarted) {
            draft.status = 'InProgress';
        } else {
            draft.status = 'Pending';
        }
        
        const delta = tracker.commit();
        if (Object.keys(delta).length > 0) {
            await patchSalesOrder(order.id, delta, order.version);
        }
    }
}


/**
 * 保存采购订单 (全量)
 */
export const savePurchaseOrder = async (order: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
    return apiFetch<PurchaseOrder>('/purchase/orders', {
        method: 'POST',
        body: JSON.stringify(order),
    });
}

/**
 * 采购订单列表 (分页)
 */
export const getPurchaseOrders = async (page = 1, pageSize = 50): Promise<PaginatedResponse<PurchaseOrder>> => {
    const res = await apiFetch<PaginatedResponse<PurchaseOrder>>(`/purchase/orders?page=${page}&pageSize=${pageSize}`);
    return ensureObjectResponse<PaginatedResponse<PurchaseOrder> & Record<string, unknown>>(res, 'TradingService.getPurchaseOrders') as PaginatedResponse<PurchaseOrder>
}
