import { apiFetch } from '@/lib/api-client'
import { type Product, type ProductType } from '../data/schema'

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
        const res = await apiFetch<any>(`/engineering/products${qs}`)
        
        // 底层 apiFetch 已处理解包（Hybrid Array），此处直接返回
        return res as Product[]
    },

    getProductById: async (id: string): Promise<Product> => {
        return await apiFetch<Product>(`/engineering/products/${id}`)
    },

    saveProduct: async (product: Partial<Product>): Promise<Product> => {
        return apiFetch<Product>('/engineering/products', {
            method: 'POST',
            body: JSON.stringify(product)
        })
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
        const res = await apiFetch<any>(`/engineering/product-types${qs}`)
        return res as ProductType[]
    },

    saveProductType: async (type: Partial<ProductType>): Promise<ProductType> => {
        return apiFetch<ProductType>('/engineering/product-types', {
            method: 'POST',
            body: JSON.stringify(type)
        })
    },

    deleteProductType: async (id: string): Promise<void> => {
        return apiFetch(`/engineering/product-types/${id}`, {
            method: 'DELETE'
        })
    }
}
