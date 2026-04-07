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
}

class WarehouseCategoryService {
    async getCategories(): Promise<WarehouseCategory[]> {
        const res = await apiFetch<WarehouseCategory[]>('/warehouse/categories')
        return ensureArrayResponse<WarehouseCategory>(res, 'WarehouseCategoryService.getCategories')
    }

    async saveCategory(category: Partial<WarehouseCategory>): Promise<void> {
        return apiFetch('/warehouse/categories', {
            method: 'POST',
            body: JSON.stringify(category)
        })
    }

    async deleteCategory(id: string): Promise<void> {
        return apiFetch(`/warehouse/categories/${id}`, {
            method: 'DELETE'
        })
    }
}

export const warehouseCategoryService = new WarehouseCategoryService()
