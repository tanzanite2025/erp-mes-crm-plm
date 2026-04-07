import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse, ensureArrayResponse } from '@/lib/api-response'
import { StockService } from './stock-service'

export interface InboundRecord {
    id: string;
    materialId: string;
    purchaseOrderId?: string;
    purchaseOrderLineId?: number;
    quantity: number;
    purchasePrice: number;    // Unit price at inbound (Accounting)
    batchNo: string;
    entryDate: string;
    operator: string;
    remarks: string;
    targetCategory: string; // Target warehouse category at inbound
}

/**
 * 入库事务服务 (Inbound Transaction Service)
 * 职责: 专注于处理原材料及成品的入库业务事务 (TDO 模式)。
 */
export const InboundService = {
    /**
     * 执行正式入库操作 (Connected to backend API)
     * 事务意图: INBOUND_RECEIPT
     */
    recordInbound: async (data: Omit<InboundRecord, 'id'>): Promise<InboundRecord> => {
        const res = await apiFetch<InboundRecord>('/inventory/inbound', {
            method: 'POST',
            body: JSON.stringify({
                ...data,
                metadata: { intent: 'INBOUND_RECEIPT' } // 注入语义化意图
            })
        });
        
        const record = ensureObjectResponse<InboundRecord & Record<string, unknown>>(res, 'InboundService.recordInbound') as InboundRecord;
        StockService.broadcastUpdate();
        return record;
    },

    /**
     * 获取历史入库记录
     */
    getInboundHistory: async (): Promise<InboundRecord[]> => {
        const res = await apiFetch<InboundRecord[]>('/inventory/inbound');
        return ensureArrayResponse<InboundRecord>(res, 'InboundService.getInboundHistory')
    }
}
