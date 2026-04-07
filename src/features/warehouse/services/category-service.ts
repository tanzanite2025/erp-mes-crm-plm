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

class WarehouseCategoryService {
    async getCategories(): Promise<WarehouseCategory[]> {
        const res = await apiFetch<WarehouseCategory[]>('/warehouse/categories')
        return ensureArrayResponse<WarehouseCategory>(res, 'WarehouseCategoryService.getCategories')
    }

    /** 仅用于新建分类 */
    async createCategory(category: Omit<WarehouseCategory, 'id' | 'version'>): Promise<void> {
        return apiFetch('/warehouse/categories', {
            method: 'POST',
            body: JSON.stringify(category)
        })
    }

    /** 局部更新分类 (SDRTS) */
    async patchCategory(id: string, delta: any, version: number): Promise<void> {
        return apiFetch(`/warehouse/categories/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ op: 'PATCH', delta, metadata: { id, version } })
        })
    }

    async deleteCategory(id: string): Promise<void> {
        return apiFetch(`/warehouse/categories/${id}`, {
            method: 'DELETE'
        })
    }
}

export const warehouseCategoryService = new WarehouseCategoryService()
