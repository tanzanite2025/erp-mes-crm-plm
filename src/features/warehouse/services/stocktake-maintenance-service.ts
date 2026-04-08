import { apiFetch } from '@/lib/api-client'

export interface PDAScanPayload {
  taskId: string
  materialCode: string
  batchNo: string
  scannedQty: number
  scanTime?: string
  scannerId?: string
}

export interface PDABulkSyncFailure {
  index: number
  taskId: string
  materialCode: string
  batchNo: string
  scannedQty: number
  error: string
}

export interface PDABulkSyncResponse {
  count: number
  successCount: number
  failedCount: number
  failures: PDABulkSyncFailure[]
  message: string
}

/**
 * StocktakeMaintenanceService - 负责盘点任务的生命周期管理与 PDA 交互逻辑情况情况总量针对。
 */
export const StocktakeMaintenanceService = {
  /**
   * 发起新盘点 (生成库存快照)
   */
  async create(data: { title: string; warehouseCategoryCode: string; remarks?: string }) {
    return apiFetch('/stocktakes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * PDA 专属: 单条扫描数据透传同步情况情况总量针对。
   */
  async pdaSubmitScan(data: PDAScanPayload) {
    return apiFetch('/pda/scan', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * PDA 专属: 离线草稿差量更新 (SDRTS)
   */
  async pdaPatchItem(id: string, delta: any, version: number) {
    return apiFetch(`/pda/stocktakes/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ delta, version }),
    })
  },

  /**
   * PDA 专属: 批量同步离线扫描数据
   */
  async pdaBulkSync(scans: PDAScanPayload[]): Promise<PDABulkSyncResponse> {
    return apiFetch('/pda/sync', {
      method: 'POST',
      body: JSON.stringify(scans),
    })
  }
}
