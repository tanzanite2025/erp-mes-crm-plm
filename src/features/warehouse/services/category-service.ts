import { apiFetch } from '@/lib/api-client'

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
        return apiFetch<WarehouseCategory[]>('/warehouse/categories')
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
