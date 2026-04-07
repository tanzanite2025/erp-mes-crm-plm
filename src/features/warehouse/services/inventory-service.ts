import { materialService, type Material } from '@/features/material-archive/services/material-service'
import { productService, type Product } from '@/features/engineering/services/product-service'
import { apiFetch } from '@/lib/api-client'
import { createLogger } from '@/lib/logger'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

const logger = createLogger('InventoryService')

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
    version: number;        // SDRTS Optimistic Lock
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

interface InventoryListResponse {
    items: InventoryView[]
    total: number
    page: number
    pageSize: number
}

export interface ReconcileResult {
    totalItems: number;
    fixedNegatives: number;
}

class InventoryService {
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
        const res = await apiFetch<InventoryListResponse>('/inventory?page=1&pageSize=1000')
        const response = ensureObjectResponse<InventoryListResponse & Record<string, unknown>>(res, 'InventoryService.getInventoryList')

        if (!Array.isArray(response.items)) {
            throw new Error('[INVALID_RESPONSE] InventoryService.getInventoryList expected "items" to be an array.')
        }

        return response.items
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

    /**
     * Patch Inventory (SDRTS Delta Protocol)
     */
    async patchInventory(id: string, delta: DeltaSet, version: number): Promise<InventoryRecord> {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { id, version }
        };

        const res = await apiFetch<InventoryRecord>(`/inventory/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        
        this.broadcastUpdate();
        return ensureObjectResponse<InventoryRecord & Record<string, unknown>>(res, 'InventoryService.patchInventory') as InventoryRecord;
    }

    /**
     * Patch Shipment (SDRTS Delta Protocol)
     */
    async patchShipment(id: string, delta: DeltaSet, version: number): Promise<ShipmentRecord> {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { id, version }
        };

        const res = await apiFetch<ShipmentRecord>(`/inventory/shipment/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        
        this.broadcastUpdate();
        return ensureObjectResponse<ShipmentRecord & Record<string, unknown>>(res, 'InventoryService.patchShipment') as ShipmentRecord;
    }
}

export const inventoryService = new InventoryService()
