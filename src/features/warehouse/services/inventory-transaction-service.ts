import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { InventoryCoreService } from './inventory-core-service'

/**
 * 仓储业务事务服务 (Inventory Transaction Service)
 * 职责: 处理所有具备业务意图的库存变更动作（TDO 模式），并注入语义化 intent 供后端审计。
 */

export interface InboundRecord {
    id: string;
    materialId: string;
    purchaseOrderId?: string;
    purchaseOrderLineId?: number;
    quantity: number;
    purchasePrice: number;
    batchNo: string;
    entryDate: string;
    operator: string;
    remarks: string;
    targetCategory: string;
}

export type ShipmentStatus = 'DRAFT' | 'COMMITTED' | 'VOID';

export interface ShipmentRecord {
    id: string;
    materialId: string;
    salesOrderId?: string;
    salesOrderLineId?: number;
    quantity: number;
    cogs: number;
    batchNo: string;
    shipmentDate: string;
    operator: string;
    orderNo: string;
    remarks: string;
    sourceCategory: string;
    status: ShipmentStatus;
    version: number;
}

export const InventoryTransactionService = {
    /**
     * 执行正式入库 (TDO: INBOUND_RECEIPT)
     */
    recordInbound: async (data: Omit<InboundRecord, 'id'>): Promise<InboundRecord> => {
        const res = await apiFetch<InboundRecord>('/inventory/inbound', {
            method: 'POST',
            body: JSON.stringify({
                ...data,
                metadata: { intent: 'INBOUND_RECEIPT' }
            })
        });
        const checked = ensureObjectResponse<InboundRecord & Record<string, unknown>>(res, 'InventoryTransactionService.recordInbound') as InboundRecord;
        InventoryCoreService.broadcastUpdate();
        return checked;
    },

    /**
     * 执行发货申请/出库 (TDO: SHIPMENT_DISPATCH)
     */
    recordShipment: async (data: Omit<ShipmentRecord, 'id'>): Promise<ShipmentRecord> => {
        const res = await apiFetch<ShipmentRecord>('/inventory/shipment', {
            method: 'POST',
            body: JSON.stringify({
                ...data,
                metadata: { intent: 'SHIPMENT_DISPATCH' }
            })
        });
        const record = ensureObjectResponse<ShipmentRecord & Record<string, unknown>>(res, 'InventoryTransactionService.recordShipment') as ShipmentRecord;
        InventoryCoreService.broadcastUpdate();
        return record;
    },

    /**
     * 确认并结算出库单 (TDO: COMMITTED_SETTLEMENT)
     */
    commitShipment: async (id: string): Promise<ShipmentRecord> => {
        const res = await apiFetch<ShipmentRecord>(`/inventory/shipment/${id}/commit`, {
            method: 'POST',
            body: JSON.stringify({
                metadata: { intent: 'COMMITTED_SETTLEMENT' }
            })
        });
        const record = ensureObjectResponse<ShipmentRecord & Record<string, unknown>>(res, 'InventoryTransactionService.commitShipment') as ShipmentRecord;
        InventoryCoreService.broadcastUpdate();
        return record;
    },

    /**
     * 库间调拨 (TDO: INTER_WAREHOUSE_TRANSFER)
     */
    transferInventory: async (materialId: string, quantity: number, fromCat: string, toCat: string): Promise<void> => {
        await apiFetch<void>('/inventory/transfer', {
            method: 'POST',
            body: JSON.stringify({
                materialId,
                quantity,
                fromCategory: fromCat,
                toCategory: toCat,
                metadata: { intent: 'INTER_WAREHOUSE_TRANSFER' }
            })
        });
        InventoryCoreService.broadcastUpdate();
    }
}
