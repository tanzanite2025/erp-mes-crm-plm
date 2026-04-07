import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { InventoryCoreService, type InventoryRecord } from './inventory-core-service'
import { type ShipmentRecord } from './inventory-transaction-service'

/**
 * 仓储维护与完整性服务 (Inventory Maintenance Service)
 * 职责: 处理库房盘点自愈、发货单作废及底层 SDRTS 差量补齐等系统性操作。
 */

export interface ReconcileResult {
    totalItems: number;
    fixedNegatives: number;
}

export interface InventoryAdjustment {
  id: string
  taskId?: string
  adjustmentNo: string
  type: 'STOCKTAKE' | 'MANUAL'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED'
  reason: string
  createdBy: string
  approvedBy?: string
  totalItems: number
  createdAt: string
  items?: AdjustmentItem[]
}

export interface AdjustmentItem {
  id: string
  materialCode: string
  materialName: string
  batchNo: string
  categoryCode: string
  theoryQty: number
  actualQty: number
  diffQty: number
  uom: string
}

export const InventoryMaintenanceService = {
    /**
     * 全库自动对账与余额自愈 (TDO: STOCK_RECONCILIATION)
     */
    reconcileInventory: async (): Promise<ReconcileResult> => {
        const res = await apiFetch<ReconcileResult>('/inventory/reconcile', { 
            method: 'POST',
            body: JSON.stringify({ metadata: { intent: 'STOCK_RECONCILIATION' } })
        });
        const result = ensureObjectResponse<ReconcileResult & Record<string, unknown>>(res, 'InventoryMaintenanceService.reconcileInventory') as ReconcileResult;
        InventoryCoreService.broadcastUpdate();
        return result;
    },

    /**
     * 作废已发货记录 (TDO: SHIPMENT_VOID)
     */
    deleteShipmentRecord: async (id: string, approvalId?: string): Promise<ShipmentRecord> => {
        const res = await apiFetch<ShipmentRecord>(`/inventory/shipment/${id}/void`, { 
            method: 'POST',
            body: JSON.stringify({ 
                approvalId,
                metadata: { intent: 'SHIPMENT_VOID' } 
            })
        });
        const record = ensureObjectResponse<ShipmentRecord & Record<string, unknown>>(res, 'InventoryMaintenanceService.deleteShipmentRecord') as ShipmentRecord;
        InventoryCoreService.broadcastUpdate();
        return record;
    },

    /**
     * 提交盘点调整申请 (TDO: STOCK_ADJUSTMENT_SUBMIT)
     */
    submitAdjustmentForApproval: async (taskId: string) => {
        return apiFetch(`/stocktakes/${taskId}/post-adjustment`, {
            method: 'POST',
            body: JSON.stringify({ metadata: { intent: 'STOCK_ADJUSTMENT_SUBMIT' } })
        })
    },

    /**
     * 获取调整历史记录
     */
    getAdjustmentHistory: async (): Promise<InventoryAdjustment[]> => {
        return apiFetch<InventoryAdjustment[]>('/warehouse/adjustments')
    },

    /**
     * 执行调整单 (TDO: STOCK_ADJUSTMENT_EXECUTE)
     */
    executeAdjustment: async (id: string) => {
        const res = await apiFetch(`/warehouse/adjustments/${id}/execute`, {
            method: 'POST',
            body: JSON.stringify({ metadata: { intent: 'STOCK_ADJUSTMENT_EXECUTE' } })
        })
        InventoryCoreService.broadcastUpdate()
        return res
    },

    /**
     * 局部更正库存余额 (SDRTS Delta Protocol)
     */
    patchInventory: async (id: string, delta: DeltaSet, version: number): Promise<InventoryRecord> => {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { 
                id, 
                version,
                intent: 'PHYSICAL_STOCK_ADJUSTMENT' // 注入物理层修正意图
            }
        };

        const res = await apiFetch<InventoryRecord>(`/inventory/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        
        InventoryCoreService.broadcastUpdate();
        return ensureObjectResponse<InventoryRecord & Record<string, unknown>>(res, 'InventoryMaintenanceService.patchInventory') as InventoryRecord;
    },

    /**
     * 设置库存水位预警 (业务维护)
     */
    setAlertThreshold: async (materialId: string, minQty: number): Promise<void> => {
        // [TODO] 后端暂未实现正式阈值表，目前仅作为意图留存并广播 UI
        console.warn('[MAINTENANCE] setAlertThreshold is not yet synced to backend storage', { materialId, minQty })
        InventoryCoreService.broadcastUpdate();
    },

    /**
     * 获取所有库存预警配置
     */
    getAlertThresholds: async (): Promise<Record<string, number>> => {
        // 目前返回空对象，待后端功能对齐
        return {};
    }
}
