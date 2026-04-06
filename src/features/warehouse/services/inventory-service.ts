import { materialService, type Material } from '@/features/material-archive/services/material-service'
import { productService, type Product } from '@/features/engineering/services/product-service'
import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type AppLocale, DEFAULT_LOCALE, translate } from '@/locales'

const logger = createLogger('InventoryService')

export interface InventoryRecord {
    id: string;               // Internal record ID
    materialId: string;       // Linked master ID (Material or Product)
    quantity: number;         // Current stock quantity
    totalValue: number;       // Financial total value (Accounting)
    averageUnitCost: number;  // Moving average cost (Accounting)
    categoryCode: string;     // Physical warehouse category (MATERIAL, FINISHED, etc.)
    lastUpdated: string;
}

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

export type ShipmentStatus = 'DRAFT' | 'COMMITTED' | 'VOID';

export interface ShipmentRecord {
    id: string;
    materialId: string;
    salesOrderId?: string;
    salesOrderLineId?: number;
    quantity: number;
    cogs: number;            // Cost of Goods Sold (Accounting)
    batchNo: string; // Batch number or production number at shipment
    shipmentDate: string;
    operator: string;
    orderNo: string; // Order number or customer number
    remarks: string;
    sourceCategory: string; // Source warehouse category
    status: ShipmentStatus; // Record status
}

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

export interface InventoryView extends InventoryRecord {
    materialName: string;
    materialCode: string;
    materialCategory: string; // Master data category
    materialSpec: string;
    uom: string;
}

export interface ReconcileResult {
    totalItems: number;
    fixedNegatives: number;
}

class InventoryService {
    private getLocale(): AppLocale {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('xdfc_locale') as AppLocale) || DEFAULT_LOCALE
        }
        return DEFAULT_LOCALE
    }

    /**
     * Initialization (Primarily ensures API environment readiness)
     */
    async init() {
        // Under backend storage mode, init logic is simplified and driven by API requests
    }

    /**
     * Cross-module aggregate search: Retrieve both Material and Product master data
     */
    async searchMasterData(query: string): Promise<MasterDataSearchResult[]> {
        const [materials, products, records] = await Promise.all([
            materialService.getMaterialOptions(),
            productService.getProducts(),
            this.getInventoryListRaw()
        ])

        // [Performance Optimization] Pre-process inventory stats using a Map to avoid O(N^2) loops
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
    }

    /**
     * Fetch full inventory view (Connected to backend API)
     */
    async getInventoryList(): Promise<InventoryView[]> {
        const [materials, products, records] = await Promise.all([
            materialService.getMaterialOptions(),
            productService.getProducts(),
            this.getInventoryListRaw()
        ])

        // [Performance Optimization] Cache master data in a Map to eliminate O(N^2) lookups
        const materialMap = new Map<string, Material>(materials.map((m: Material) => [m.id, m] as [string, Material]))
        const productMap = new Map<string, Product>(products.map((p: Product) => [p.id, p] as [string, Product]))
        
        return records.map((record: InventoryRecord) => {
            const material = materialMap.get(record.materialId)
            const product = productMap.get(record.materialId)
            
            if (!material && !product) {
                // [FAIL LOUDLY] Strict zero-tolerance for data integrity: 
                // Issue critical error if orphan stock is found (Material or Product master ID missing)
                const errorMsg = translate(this.getLocale(), 'warehouse.service.integrityError', {
                    id: record.id,
                    materialId: record.materialId
                })
                logger.error(`[DATA_INTEGRITY] ${errorMsg}`)
            }

            return {
                ...record,
                materialName: material?.name || product?.name || translate(this.getLocale(), 'warehouse.service.unknownItem'),
                materialCode: material?.code || product?.sku || 'N/A',
                materialCategory: material?.category || 'FINISHED',
                materialSpec: material?.spec || product?.tireType || '-',
                uom: material?.uom || 'pcs',
                totalValue: record.totalValue || 0,
                averageUnitCost: record.averageUnitCost || 0
            }
        })
    }

    private async getInventoryListRaw(): Promise<InventoryRecord[]> {
        const res = await apiFetch<InventoryRecord[]>('/inventory');
        return ensureArrayResponse<InventoryRecord>(res, 'InventoryService.getInventoryListRaw')
    }

    /**
     * Record inbound transaction and update inventory (Connected to backend API)
     */
    async recordInbound(data: Omit<InboundRecord, 'id'>): Promise<InboundRecord> {
        const res = await apiFetch<InboundRecord>('/inventory/inbound', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const checked = ensureObjectResponse<InboundRecord & Record<string, unknown>>(res, 'InventoryService.recordInbound')
        this.broadcastUpdate();
        return checked as InboundRecord;
    }

    async getInboundHistory(): Promise<InboundRecord[]> {
        const res = await apiFetch<InboundRecord[]>('/inventory/inbound');
        return ensureArrayResponse<InboundRecord>(res, 'InventoryService.getInboundHistory')
    }

    /**
     * Get real-time stock level for a specific category
     */
    async getCategoryStock(materialId: string, category: string): Promise<number> {
        const records = await this.getInventoryListRaw();
        const inv = records.find(r => r.materialId === materialId && r.categoryCode === category)
        return inv ? inv.quantity : 0
    }

    /**
     * Record shipment transaction (Connected to backend API)
     */
    async recordShipment(data: Omit<ShipmentRecord, 'id'>) {
        const res = await apiFetch<ShipmentRecord>('/inventory/shipment', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        const record = ensureObjectResponse<ShipmentRecord & Record<string, unknown>>(res, 'InventoryService.recordShipment') as ShipmentRecord;

        this.broadcastUpdate();
        return record;
    }

    /**
     * Commit a draft shipment formally (Connected to backend API)
     */
    async commitShipment(id: string) {
        const res = await apiFetch<ShipmentRecord>(`/inventory/shipment/${id}/commit`, {
            method: 'POST'
        });
        const record = ensureObjectResponse<ShipmentRecord & Record<string, unknown>>(res, 'InventoryService.commitShipment') as ShipmentRecord;
        
        this.broadcastUpdate();
        return record;
    }

    /**
     * Inter-warehouse transfer (Connected to backend API)
     */
    async transferInventory(materialId: string, quantity: number, fromCat: string, toCat: string) {
        await apiFetch<void>('/inventory/transfer', {
            method: 'POST',
            body: JSON.stringify({ materialId, quantity, fromCategory: fromCat, toCategory: toCat })
        });
        this.broadcastUpdate();
    }

    /**
     * [Maintenance] Full inventory reconciliation and balance rebuild (Connected to backend API)
     */
    async reconcileInventory(): Promise<ReconcileResult> {
        const res = await apiFetch<ReconcileResult>('/inventory/reconcile', { method: 'POST' });
        const result = ensureObjectResponse<ReconcileResult & Record<string, unknown>>(res, 'InventoryService.reconcileInventory') as ReconcileResult;
        this.broadcastUpdate();
        return result;
    }

    async getShipmentHistory(): Promise<ShipmentRecord[]> {
        const res = await apiFetch<ShipmentRecord[]>('/inventory/shipment');
        return ensureArrayResponse<ShipmentRecord>(res, 'InventoryService.getShipmentHistory')
    }

    /**
     * Void or delete a shipment record (Backend logic + Approval token supported)
     */
    async deleteShipmentRecord(id: string, approvalId?: string): Promise<ShipmentRecord> {
        const res = await apiFetch<ShipmentRecord>(`/inventory/shipment/${id}/void`, { 
            method: 'POST',
            body: JSON.stringify({ approvalId })
        });
        const record = ensureObjectResponse<ShipmentRecord & Record<string, unknown>>(res, 'InventoryService.deleteShipmentRecord') as ShipmentRecord;
        
        this.broadcastUpdate();
        return record;
    }

    private broadcastUpdate() {
        window.dispatchEvent(new CustomEvent('xdfc_inventory_updated'))
    }

    /**
     * Get stock distribution breakdown across categories for a specific material
     */
    async getInventoryBreakdown(materialId: string): Promise<Record<string, number>> {
        const records = await this.getInventoryListRaw();
        const breakdown: Record<string, number> = {}
        records
            .filter(r => r.materialId === materialId)
            .forEach(r => {
                breakdown[r.categoryCode] = r.quantity
            })
        return breakdown
    }

    /**
     * Legacy compatibility methods (Logic not yet synced to backend)
     */
    async setAlertThreshold(materialId: string, minQty: number) {
        logger.warn('setAlertThreshold is not yet synced to backend', { materialId, minQty })
    }

    async getAlertThresholds(): Promise<Record<string, number>> {
        logger.warn('[MOCK_SERVICE] getAlertThresholds is returning empty initial object. Backend sync pending.')
        return {};
    }

    async getLowStockAlerts() {
        logger.warn('[MOCK_SERVICE] getLowStockAlerts is returning empty list. Backend sync pending.')
        return [];
    }
}

export const inventoryService = new InventoryService()
