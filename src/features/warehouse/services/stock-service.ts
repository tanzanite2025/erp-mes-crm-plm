import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse, ensureArrayResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

export interface InventoryRecord {
    id: string;               // Internal record ID
    materialId: string;       // Linked master ID (Material or Product)
    quantity: number;         // Current stock quantity
    totalValue: number;       // Financial total value (Accounting)
    averageUnitCost: number;  // Moving average cost (Accounting)
    categoryCode: string;     // Physical warehouse category (MATERIAL, FINISHED, etc.)
    lastUpdated: string;
    version: number;          // SDRTS Optimistic Lock
}

export interface InventoryView extends InventoryRecord {
    materialName: string;
    materialCode: string;
    materialCategory: string; // Master data category
    materialSpec: string;
    uom: string;
}

export interface InventoryListResponse {
    items: InventoryView[]
    total: number
    page: number
    pageSize: number
}

/**
 * 核心库存管理服务 (Stock Service)
 * 职责: 处理库存快照查询、分层统计与物理层 SDRTS 差量更新。
 */
export const StockService = {
    /**
     * 获取全量库存视图 (已连接后端 API)
     */
    getInventoryList: async (): Promise<InventoryView[]> => {
        const res = await apiFetch<InventoryListResponse>('/inventory?page=1&pageSize=1000')
        const response = ensureObjectResponse<InventoryListResponse & Record<string, unknown>>(res, 'StockService.getInventoryList')

        if (!Array.isArray(response.items)) {
            throw new Error('[CRITICAL_ERROR] StockService.getInventoryList expected "items" to be an array.')
        }

        return response.items
    },

    /**
     * 获取原始库存记录
     */
    getInventoryListRaw: async (): Promise<InventoryRecord[]> => {
        const res = await apiFetch<InventoryRecord[]>('/inventory');
        return ensureArrayResponse<InventoryRecord>(res, 'StockService.getInventoryListRaw')
    },

    /**
     * 获取特定物料在特定分类下的库存
     */
    getCategoryStock: async (materialId: string, category: string): Promise<number> => {
        const res = await apiFetch<InventoryRecord[]>('/inventory');
        const records = ensureArrayResponse<InventoryRecord>(res, 'StockService.getCategoryStock')
        const inv = records.find(r => r.materialId === materialId && r.categoryCode === category)
        return inv ? inv.quantity : 0
    },

    /**
     * 获取物料在不同分类下的库存分布
     */
    getInventoryBreakdown: async (materialId: string): Promise<Record<string, number>> => {
        const res = await apiFetch<InventoryRecord[]>('/inventory');
        const records = ensureArrayResponse<InventoryRecord>(res, 'StockService.getInventoryBreakdown')
        const breakdown: Record<string, number> = {}
        records
            .filter(r => r.materialId === materialId)
            .forEach(r => {
                breakdown[r.categoryCode] = r.quantity
            })
        return breakdown
    },

    /**
     * 局部更新库存记录 (SDRTS Delta Protocol)
     */
    patchInventory: async (id: string, delta: DeltaSet, version: number): Promise<InventoryRecord> => {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { 
                id, 
                version,
                intent: 'PHYSICAL_STOCK_ADJUSTMENT' // 明确注入物理层调整意图
            }
        };

        const res = await apiFetch<InventoryRecord>(`/inventory/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        
        window.dispatchEvent(new CustomEvent('xdfc_inventory_updated'))
        return ensureObjectResponse<InventoryRecord & Record<string, unknown>>(res, 'StockService.patchInventory') as InventoryRecord;
    },

    // 辅助广播方法 (过渡方案)
    broadcastUpdate: () => {
        window.dispatchEvent(new CustomEvent('xdfc_inventory_updated'))
    },

    /**
     * 遗留兼容方法 (尚未同步至后端)
     */
    async setAlertThreshold(materialId: string, minQty: number) {
        console.warn('setAlertThreshold is not yet synced to backend', { materialId, minQty })
    },

    async getAlertThresholds(): Promise<Record<string, number>> {
        console.warn('[MOCK_SERVICE] getAlertThresholds is returning empty initial object. Backend sync pending.')
        return {};
    },

    async getLowStockAlerts() {
        console.warn('[MOCK_SERVICE] getLowStockAlerts is returning empty list. Backend sync pending.')
        return [];
    }
}
