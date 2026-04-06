import { apiFetch } from '@/lib/api-client'

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

export const AdjustmentService = {
  /**
   * Submit stocktake task for adjustment approval
   */
  async submitForApproval(taskId: string) {
    return apiFetch(`/stocktakes/${taskId}/post-adjustment`, {
      method: 'POST'
    })
  },

  /**
   * Fetch inventory adjustment history logs
   */
  async getHistory(): Promise<InventoryAdjustment[]> {
    return apiFetch('/warehouse/adjustments')
  },

  /**
   * Execute adjustment (Typically auto-triggered after approval; manual retry entry provided here)
   */
  async execute(id: string) {
    return apiFetch(`/warehouse/adjustments/${id}/execute`, {
      method: 'POST'
    })
  }
}
