import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'

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
  version: number // SDRTS 乐观锁
}

/**
 * StocktakeCoreService - 负责盘点模块的只读查询逻辑情况情况总量针对。
 */
export const StocktakeCoreService = {
  /**
   * 获取所有盘点任务列表
   */
  async getTasks(): Promise<StocktakeTask[]> {
    const res = await apiFetch<StocktakeTask[]>('/stocktakes')
    return ensureArrayResponse<StocktakeTask>(res, 'StocktakeCoreService.getTasks')
  },

  /**
   * 获取特定盘点任务的行项目明细
   */
  async getItems(taskId: string): Promise<StocktakeItem[]> {
    const res = await apiFetch<StocktakeItem[]>(`/stocktakes/${taskId}/items`)
    return ensureArrayResponse<StocktakeItem>(res, 'StocktakeCoreService.getItems')
  }
}
