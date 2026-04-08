'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type ProductType } from '../data/schema'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

/**
 * ProductTypeService - 产品类型管理服务
 * 职责: 负责产品分类(ProductType)的定义、维护与增量更新。
 */
export const ProductTypeService = {
    /**
     * 获取产品类型列表
     */
    async getProductTypes(params?: { isOptions?: boolean; page?: number; pageSize?: number }): Promise<ProductType[]> {
        let qs = ''
        if (params?.isOptions) {
            qs = '?options=true'
        } else if (params?.page) {
            qs = `?page=${params.page}&pageSize=${params.pageSize || 50}`
        }
        // 移除导致 500 的默认强制选项
        const res = await apiFetch<ProductType[]>(`/engineering/product-types${qs}`)
        return ensureArrayResponse<ProductType>(res, 'ProductTypeService.getProductTypes')
    },

    /**
     * 保存/创建产品类型 (TDO: TYPE_REGISTRATION)
     */
    async saveProductType(type: Partial<ProductType>): Promise<ProductType> {
        const res = await apiFetch<ProductType>('/engineering/product-types', {
            method: 'POST',
            body: JSON.stringify({
                ...type,
                metadata: { intent: 'TYPE_REGISTRATION' }
            })
        })
        return ensureObjectResponse<ProductType>(res, 'ProductTypeService.saveProductType')
    },

    /**
     * SDRTS: 增量更新产品类型 (TDO: TYPE_DEFINITION_UPDATE)
     */
    async patchProductType(id: string, delta: DeltaSet, version: number): Promise<ProductType> {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { 
                id, 
                version,
                intent: 'TYPE_DEFINITION_UPDATE'
            }
        }
        const res = await apiFetch<ProductType>(`/engineering/product-types/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        })
        return ensureObjectResponse<ProductType>(res, 'ProductTypeService.patchProductType')
    },

    /**
     * 删除产品类型
     */
    async deleteProductType(id: string): Promise<void> {
        return apiFetch(`/engineering/product-types/${id}`, {
            method: 'DELETE'
        })
    }
}
