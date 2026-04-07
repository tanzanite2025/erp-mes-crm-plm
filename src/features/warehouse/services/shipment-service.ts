import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse, ensureArrayResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { StockService } from './stock-service'

export type ShipmentStatus = 'DRAFT' | 'COMMITTED' | 'VOID';

export interface ShipmentRecord {
    id: string;
    materialId: string;
    salesOrderId?: string;
    salesOrderLineId?: number;
    quantity: number;
    cogs: number;            // Cost of Goods Sold (Accounting)
    batchNo: string; 
    shipmentDate: string;
    operator: string;
    orderNo: string; 
    remarks: string;
    sourceCategory: string; // Source warehouse category
    status: ShipmentStatus; 
    version: number;        
}

/**
 * 发货与出库事务服务 (Shipment Service)
 * 职责: 处理与销售订单关联的出库流程及物理库存扣减操作。
 */
export const ShipmentService = {
    /**
     * 记录出库事务 (TDO 模式: SHIPMENT_DRAFT/SHIPMENT_RECORD)
     */
    recordShipment: async (data: Omit<ShipmentRecord, 'id'>): Promise<ShipmentRecord> => {
        const res = await apiFetch<ShipmentRecord>('/inventory/shipment', {
            method: 'POST',
            body: JSON.stringify({
                ...data,
                metadata: { intent: 'SHIPMENT_RECORD' }
            })
        });
        const record = ensureObjectResponse<ShipmentRecord & Record<string, unknown>>(res, 'ShipmentService.recordShipment') as ShipmentRecord;

        StockService.broadcastUpdate();
        return record;
    },

    /**
     * 正式提交发货事务 (TDO 模式: SHIPMENT_COMMIT)
     */
    commitShipment: async (id: string): Promise<ShipmentRecord> => {
        const res = await apiFetch<ShipmentRecord>(`/inventory/shipment/${id}/commit`, {
            method: 'POST',
            body: JSON.stringify({ metadata: { intent: 'SHIPMENT_COMMIT' } })
        });
        const record = ensureObjectResponse<ShipmentRecord & Record<string, unknown>>(res, 'ShipmentService.commitShipment') as ShipmentRecord;
        
        StockService.broadcastUpdate();
        return record;
    },

    /**
     * 获取历史发货记录
     */
    getShipmentHistory: async (): Promise<ShipmentRecord[]> => {
        const res = await apiFetch<ShipmentRecord[]>('/inventory/shipment');
        return ensureArrayResponse<ShipmentRecord>(res, 'ShipmentService.getShipmentHistory')
    },

    /**
     * 作废或删除发货事务 (TDO 模式: SHIPMENT_VOID)
     */
    deleteShipmentRecord: async (id: string, approvalId?: string): Promise<ShipmentRecord> => {
        const res = await apiFetch<ShipmentRecord>(`/inventory/shipment/${id}/void`, { 
            method: 'POST',
            body: JSON.stringify({ 
                approvalId,
                metadata: { intent: 'SHIPMENT_VOID' }
            })
        });
        const record = ensureObjectResponse<ShipmentRecord & Record<string, unknown>>(res, 'ShipmentService.deleteShipmentRecord') as ShipmentRecord;
        
        StockService.broadcastUpdate();
        return record;
    },

    /**
     * 局部修改发货记录 (SDRTS Delta Protocol)
     */
    patchShipment: async (id: string, delta: DeltaSet, version: number): Promise<ShipmentRecord> => {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { 
                id, 
                version,
                intent: 'SHIPMENT_MODIFICATION'
            }
        };

        const res = await apiFetch<ShipmentRecord>(`/inventory/shipment/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        
        StockService.broadcastUpdate();
        return ensureObjectResponse<ShipmentRecord & Record<string, unknown>>(res, 'ShipmentService.patchShipment') as ShipmentRecord;
    }
}
