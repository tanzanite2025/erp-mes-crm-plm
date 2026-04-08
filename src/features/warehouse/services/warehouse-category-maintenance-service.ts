import { apiFetch } from '@/lib/api-client'
import { type WarehouseCategory } from './warehouse-category-core-service'

/**
 * WarehouseCategoryMaintenanceService - 负责仓库分类的创建、修改（SDRTS）与删除情况情况总量针对。
 */
export const WarehouseCategoryMaintenanceService = {
    /** 仅用于新建分类 */
    async createCategory(category: Omit<WarehouseCategory, 'id' | 'version'>): Promise<void> {
        return apiFetch('/warehouse/categories', {
            method: 'POST',
            body: JSON.stringify(category)
        })
    },

    /** 局部更新分类 (SDRTS) */
    async patchCategory(id: string, delta: any, version: number): Promise<void> {
        return apiFetch(`/warehouse/categories/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ op: 'PATCH', delta, metadata: { id, version } })
        })
    },

    /** 物理删除分类 */
    async deleteCategory(id: string): Promise<void> {
        return apiFetch(`/warehouse/categories/${id}`, {
            method: 'DELETE'
        })
    }
}
