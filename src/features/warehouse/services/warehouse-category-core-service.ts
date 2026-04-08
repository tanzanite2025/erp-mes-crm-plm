import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse } from '@/lib/api-response'

export interface WarehouseCategory {
    id: string
    name: string
    code: string
    description?: string
    isSystem: boolean
    active: boolean
    sortOrder: number
    version: number // SDRTS 乐观锁
}

/**
 * WarehouseCategoryCoreService - 仓库分类核心查询服务情况情况总量针对。
 */
export const WarehouseCategoryCoreService = {
    /**
     * 获取全量仓库分类列表
     */
    getCategories: async (): Promise<WarehouseCategory[]> => {
        const res = await apiFetch<WarehouseCategory[]>('/warehouse/categories')
        return ensureArrayResponse<WarehouseCategory>(res, 'WarehouseCategoryCoreService.getCategories')
    }
}
