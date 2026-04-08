import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type InboundRecord, type ShipmentRecord } from './inventory-transaction-service'

/**
 * 仓储核心查询服务 (Inventory Core Service)
 * 职责: 负责所有只读类数据聚合、跨模块物料/成品搜索及库存快照获取。
 */

export interface InventoryRecord {
    id: string;
    materialId: string;
    quantity: number;
    totalValue: number;
    averageUnitCost: number;
    categoryCode: string;
    lastUpdated: string;
    version: number;
}

export interface InventoryView extends InventoryRecord {
    materialName: string;
    materialCode: string;
    materialCategory: string;
    materialSpec: string;
    uom: string;
}

export interface MasterDataSearchResult {
    id: string;
    name: string;
    code: string;
    spec: string;
    uom: string;
    category: string;
    sourceModule: 'MATERIAL' | 'PRODUCT';
    stock: number;
}

interface InventoryListResponse {
    items: InventoryView[]
    total: number
    page: number
    pageSize: number
}

export const InventoryCoreService = {
    /**
     * 获取全量库存视图
     */
    getInventoryList: async (): Promise<InventoryView[]> => {
        const res = await apiFetch<InventoryListResponse>('/inventory?page=1&pageSize=1000')
        const response = ensureObjectResponse<InventoryListResponse & Record<string, unknown>>(res, 'InventoryCoreService.getInventoryList')
        return response.items
    },

    /**
     * 获取原始库存记录
     */
    getInventoryListRaw: async (): Promise<InventoryRecord[]> => {
        const res = await apiFetch<InventoryRecord[]>('/inventory');
        return ensureArrayResponse<InventoryRecord>(res, 'InventoryCoreService.getInventoryListRaw')
    },

    /**
     * 获取物料在不同分类下的库存分布
     * [REFACTORED]: 改为参数化后端查询。
     */
    getInventoryBreakdown: async (materialId: string): Promise<Record<string, number>> => {
        const res = await apiFetch<Record<string, number>>(`/inventory/breakdown?materialId=${encodeURIComponent(materialId)}`);
        return ensureObjectResponse<Record<string, number>>(res, 'InventoryCoreService.getInventoryBreakdown')
    },

    /**
     * 跨模块聚合搜索: 聚合检索物料档案与成品档案，并关联实时库存
     * [HEAVY-COMPUTATION]: 原始实现拉取了全量 Material + Product + Inventory 并在前端进行三表关联 (O(N) Join)。
     * 已重写为调用后端聚合搜索接口，遵循“后端权威”原则。
     */
    searchMasterData: async (query: string): Promise<MasterDataSearchResult[]> => {
        if (!query) return []
        
        // 调用后端专门的聚合搜索接口：/inventory/search
        // 由后端执行物料/成品表的关联以及库存汇总
        const res = await apiFetch<MasterDataSearchResult[]>(`/inventory/search?q=${encodeURIComponent(query)}`)
        return ensureArrayResponse<MasterDataSearchResult>(res, 'InventoryCoreService.searchMasterData')
    },

    /**
     * 获取历史发货记录
     */
    getShipmentHistory: async (): Promise<ShipmentRecord[]> => {
        const res = await apiFetch<ShipmentRecord[]>('/inventory/shipment');
        return ensureArrayResponse<ShipmentRecord>(res, 'InventoryCoreService.getShipmentHistory')
    },

    /**
     * 获取历史入库记录
     */
    getInboundHistory: async (): Promise<InboundRecord[]> => {
        const res = await apiFetch<InboundRecord[]>('/inventory/inbound');
        return ensureArrayResponse<InboundRecord>(res, 'InventoryCoreService.getInboundHistory')
    },

    /**
     * 获取特定物料在特定分类下的库存
     * [REFACTORED]: 改为精确的单条库存查询接口。
     */
    getCategoryStock: async (materialId: string, category: string): Promise<number> => {
        const res = await apiFetch<{ quantity: number }>(`/inventory/stock?materialId=${encodeURIComponent(materialId)}&category=${encodeURIComponent(category)}`);
        const response = ensureObjectResponse<{ quantity: number }>(res, 'InventoryCoreService.getCategoryStock')
        return response.quantity
    },

    /**
     * 获取全量库存资产估值
     * [BACKEND-AUTHORITY]: 聚合金额由后端财务模块权威计算。
     */
    getInventoryValuation: async (): Promise<number> => {
        const res = await apiFetch<{ totalValue: number }>('/inventory/valuation')
        const response = ensureObjectResponse<{ totalValue: number }>(res, 'InventoryCoreService.getInventoryValuation')
        return response.totalValue
    },

    /**
     * 获取库存预警摘要统计
     */
    getAlertSummary: async (): Promise<{ alertCount: number }> => {
        const res = await apiFetch<{ alertCount: number }>('/inventory/alerts/summary')
        return ensureObjectResponse<{ alertCount: number }>(res, 'InventoryCoreService.getAlertSummary')
    },

    /**
     * 统一刷新 UI 事件广播
     */
    broadcastUpdate: () => {
        window.dispatchEvent(new CustomEvent('xdfc_inventory_updated'))
    }
}
