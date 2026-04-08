import { MaterialCoreService } from '@/features/material-archive/services/material-core-service'
import { type Material } from '@/features/material-archive/data/schema'
import { ProductCoreService } from '@/features/engineering/services/product-core-service'
import { type Product } from '@/features/engineering/data/schema'
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
     */
    getInventoryBreakdown: async (materialId: string): Promise<Record<string, number>> => {
        const res = await apiFetch<InventoryRecord[]>('/inventory');
        const records = ensureArrayResponse<InventoryRecord>(res, 'InventoryCoreService.getInventoryBreakdown')
        const breakdown: Record<string, number> = {}
        records
            .filter(r => r.materialId === materialId)
            .forEach(r => {
                breakdown[r.categoryCode] = r.quantity
            })
        return breakdown
    },

    /**
     * 跨模块聚合搜索: 同时检索物料档案与成品档案，并关联实时库存
     */
    searchMasterData: async (query: string): Promise<MasterDataSearchResult[]> => {
        const [materials, products, records] = await Promise.all([
            MaterialCoreService.getMaterialOptions(),
            ProductCoreService.getProducts(),
            apiFetch<InventoryRecord[]>('/inventory').then(res => ensureArrayResponse<InventoryRecord>(res, 'InventoryCoreService.searchMasterData'))
        ])

        const stockMap = new Map<string, number>()
        records.forEach((r) => {
            stockMap.set(r.materialId, (stockMap.get(r.materialId) || 0) + r.quantity)
        })

        const searchLower = query.toLowerCase()

        const materialResults: MasterDataSearchResult[] = materials
            .filter((m: Material) => m.name.toLowerCase().includes(searchLower) || m.code.toLowerCase().includes(searchLower))
            .map((m: Material) => ({
                id: m.id,
                name: m.name,
                code: m.code,
                spec: m.spec || '',
                uom: m.uom || 'pcs',
                category: m.category,
                sourceModule: 'MATERIAL',
                stock: stockMap.get(m.id) || 0
            }))

        const productResults: MasterDataSearchResult[] = products
            .filter((p: Product) => p.name.toLowerCase().includes(searchLower) || p.sku.toLowerCase().includes(searchLower))
            .map((p: Product) => ({
                id: p.id,
                name: p.name,
                code: p.sku,
                spec: p.tireType || p.description || '',
                uom: 'pcs',
                category: 'FINISHED',
                sourceModule: 'PRODUCT' as const,
                stock: stockMap.get(p.id) || 0
            }))

        return [...materialResults, ...productResults]
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
     */
    getCategoryStock: async (materialId: string, category: string): Promise<number> => {
        const res = await apiFetch<InventoryRecord[]>('/inventory');
        const records = ensureArrayResponse<InventoryRecord>(res, 'InventoryCoreService.getCategoryStock')
        const inv = records.find(r => r.materialId === materialId && r.categoryCode === category)
        return inv ? inv.quantity : 0
    },

    /**
     * 统一刷新 UI 事件广播
     */
    broadcastUpdate: () => {
        window.dispatchEvent(new CustomEvent('xdfc_inventory_updated'))
    }
}
