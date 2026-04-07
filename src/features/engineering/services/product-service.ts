import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type Product, type ProductType } from '../data/schema'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'

export { type Product, type ProductType }

export const productService = {
    getProducts: async (params?: { isOptions?: boolean; page?: number; pageSize?: number }): Promise<Product[]> => {
        let qs = ''
        if (params?.isOptions) {
            qs = '?options=true'
        } else if (params?.page) {
            qs = `?page=${params.page}&pageSize=${params.pageSize || 50}`
        } else {
            qs = '?options=true' // 向下兼容旧组件（如下拉、仿真）的无参调用
        }
        const res = await apiFetch<Product[]>(`/engineering/products${qs}`)
        return ensureArrayResponse<Product>(res, 'ProductService.getProducts')
    },

    getProductById: async (id: string): Promise<Product> => {
        return await apiFetch<Product>(`/engineering/products/${id}`)
    },

    saveProduct: async (product: Partial<Product>): Promise<Product> => {
        const res = await apiFetch<Product>('/engineering/products', {
            method: 'POST',
            body: JSON.stringify(product)
        })
        return ensureObjectResponse<Product>(res, 'ProductService.saveProduct')
    },
    
    /**
     * SDFTS: 增量更新产品
     */
    patchProduct: async (id: string, delta: DeltaSet, version: number): Promise<Product> => {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { id, version }
        }
        const res = await apiFetch<Product>(`/engineering/products/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        })
        return ensureObjectResponse<Product>(res, 'ProductService.patchProduct')
    },

    /**
     * 批量同步产品档案 (原子化分发)
     */
    bulkSyncProducts: async (products: Product[]): Promise<{ status: string; count: number }> => {
        return apiFetch<{ status: string; count: number }>('/engineering/products/bulk', {
            method: 'POST',
            body: JSON.stringify(products)
        })
    },

    deleteProduct: async (id: string): Promise<void> => {
        return apiFetch(`/engineering/products/${id}`, {
            method: 'DELETE'
        })
    },

    /**
     * 格式化产品展示名称 (全系统标准化实现)
     */
    formatDisplay: (product: any): string => {
        if (!product) return 'NULL_PRODUCT'
        
        // 优先尝试拼接语义化信息
        const { name, sku, techSeries, brakeType, versionLevel } = product
        const details = [techSeries, brakeType, versionLevel].filter(Boolean).join('/')
        
        if (details) {
            return `${name} (${details})`
        }
        
        return name || sku || 'UNNAMED'
    },

    getProductTypes: async (params?: { isOptions?: boolean; page?: number; pageSize?: number }): Promise<ProductType[]> => {
        let qs = ''
        if (params?.isOptions || !params) {
            qs = '?options=true'
        } else if (params?.page) {
            qs = `?page=${params.page}&pageSize=${params.pageSize || 50}`
        }
        const res = await apiFetch<ProductType[]>(`/engineering/product-types${qs}`)
        return ensureArrayResponse<ProductType>(res, 'ProductService.getProductTypes')
    },

    saveProductType: async (type: Partial<ProductType>): Promise<ProductType> => {
        const res = await apiFetch<ProductType>('/engineering/product-types', {
            method: 'POST',
            body: JSON.stringify(type)
        })
        return ensureObjectResponse<ProductType>(res, 'ProductService.saveProductType')
    },

    /**
     * SDRTS: 增量更新产品类型
     */
    patchProductType: async (id: string, delta: DeltaSet, version: number): Promise<ProductType> => {
        const payload: DeltaPayload = {
            op: 'PATCH',
            delta,
            metadata: { id, version }
        }
        const res = await apiFetch<ProductType>(`/engineering/product-types/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        })
        return ensureObjectResponse<ProductType>(res, 'ProductService.patchProductType')
    },

    deleteProductType: async (id: string): Promise<void> => {
        return apiFetch(`/engineering/product-types/${id}`, {
            method: 'DELETE'
        })
    }
}
