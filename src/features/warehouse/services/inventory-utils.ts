import { materialService, type Material } from '@/features/material-archive/services/material-service'
import { productService, type Product } from '@/features/engineering/services/product-service'
import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { StockService, type InventoryRecord } from './stock-service'

export interface MasterDataSearchResult {
    id: string;
    name: string;
    code: string;
    spec: string;
    uom: string;
    category: string;
    sourceModule: 'MATERIAL' | 'PRODUCT';
    stock: number; // Real-time stock level
}

export interface ReconcileResult {
    totalItems: number;
    fixedNegatives: number;
}

/**
 * 仓储工具与辅助服务 (Inventory Utils)
 * 职责: 处理复杂的聚合搜索、库存盘点、数据同步等非核心事务逻辑。
 */
export const InventoryUtils = {
    /**
     * 跨模块聚合搜索: 同时检索物料与成品主数据并关联实时库存
     */
    searchMasterData: async (query: string): Promise<MasterDataSearchResult[]> => {
        const [materials, products, records] = await Promise.all([
            materialService.getMaterialOptions(),
            productService.getProducts(),
            StockService.getInventoryListRaw()
        ])

        const stockMap = new Map<string, number>()
        records.forEach((r: InventoryRecord) => {
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
     * 库存调拨 (Transaction Intent: STOCK_TRANSFER)
     */
    transferInventory: async (materialId: string, quantity: number, fromCat: string, toCat: string) => {
        await apiFetch<void>('/inventory/transfer', {
            method: 'POST',
            body: JSON.stringify({ materialId, quantity, fromCategory: fromCat, toCategory: toCat, metadata: { intent: 'STOCK_TRANSFER' } })
        });
        StockService.broadcastUpdate();
    },

    /**
     * 全局库存对账与平账 (Transaction Intent: INVENTORY_RECONCILE)
     */
    reconcileInventory: async (): Promise<ReconcileResult> => {
        const res = await apiFetch<ReconcileResult>('/inventory/reconcile', { 
            method: 'POST',
            body: JSON.stringify({ metadata: { intent: 'INVENTORY_RECONCILE' } })
        });
        const result = ensureObjectResponse<ReconcileResult & Record<string, unknown>>(res, 'InventoryUtils.reconcileInventory') as ReconcileResult;
        StockService.broadcastUpdate();
        return result;
    }
}
