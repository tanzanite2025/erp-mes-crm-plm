import { apiFetch } from '@/lib/api-client'

export interface StocktakeTask {
  id: string
  title: string
  warehouseCategoryCode: string
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'ADJUSTED'
  createdBy: string
  startTime?: string
  endTime?: string
  remarks?: string
  createdAt: string
}

export interface StocktakeItem {
  id: string
  taskId: string
  materialId: string
  materialCode: string
  materialName: string
  batchNo: string
  theoryQty: number
  actualQty: number
  difference: number
  uom: string
  scannerId?: string
  scanTime?: string
}

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

export const StocktakeService = {
  /**
   * Fetch all stocktake tasks
   */
  async getTasks(): Promise<StocktakeTask[]> {
    return apiFetch('/stocktakes')
  },

  /**
   * Initiate a new stocktake (generates inventory snapshot)
   */
  async create(data: { title: string; warehouseCategoryCode: string; remarks?: string }) {
    return apiFetch('/stocktakes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * Fetch line items for a specific stocktake task
   */
  async getItems(taskId: string): Promise<StocktakeItem[]> {
    return apiFetch(`/stocktakes/${taskId}/items`)
  },

  /**
   * PDA Exclusive: Single item transaction sync
   */
  async pdaSubmitScan(data: PDAScanPayload) {
    return apiFetch('/pda/scan', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * PDA Exclusive: SDRTS Delta Item Patch
   */
  async pdaPatchItem(id: string, delta: any, version: number) {
    return apiFetch(`/pda/stocktakes/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ delta, version }),
    })
  },

  /**
   * PDA Exclusive: Bulk sync offline scan data
   */
  async pdaBulkSync(scans: PDAScanPayload[]): Promise<PDABulkSyncResponse> {
    return apiFetch('/pda/sync', {
      method: 'POST',
      body: JSON.stringify(scans),
    })
  }
}
