'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type Product } from '../data/schema'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

/**
 * ProductMaintenanceService - 产品档案维护与 SDRTS 协议服务
 * 职责: 负责产品档案的物理修正、批量同步及数据清洗。
 */
export const ProductMaintenanceService = {
    /**
     * 创建产品档案 (TDO: PRODUCT_REGISTRATION)
     */
    async createProduct(product: Partial<Product>): Promise<Product> {
        const res = await apiFetch<Product>('/engineering/products', {
            method: 'POST',
            body: JSON.stringify({
                ...product,
                metadata: { intent: 'PRODUCT_REGISTRATION' }
            })
        })
        return ensureObjectResponse<Product>(res, 'ProductMaintenanceService.createProduct')
    },

    /**
     * SDRTS: 增量更新产品档案 (TDO: PRODUCT_ARCHIVE_REPAIR)
     */
    async patchProduct(id: string, delta: DeltaSet, version: number): Promise<Product> {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { 
                id, 
                version,
                intent: 'PRODUCT_ARCHIVE_REPAIR'
            }
        }
        const res = await apiFetch<Product>(`/engineering/products/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        })
        return ensureObjectResponse<Product>(res, 'ProductMaintenanceService.patchProduct')
    },

    /**
     * 批量同步产品档案 (原子化分发)
     */
    async bulkSyncProducts(products: Product[]): Promise<{ status: string; count: number }> {
        return apiFetch<{ status: string; count: number }>('/engineering/products/bulk', {
            method: 'POST',
            body: JSON.stringify({
                products,
                metadata: { intent: 'BULK_PRODUCT_SYNC' }
            })
        })
    },

    /**
     * 删除产品档案 (逻辑或物理)
     */
    async deleteProduct(id: string): Promise<void> {
        return apiFetch(`/engineering/products/${id}`, {
            method: 'DELETE'
            // 移除 body 以提高后端兼容性
        })
    }
}
