'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type Product } from '../data/schema'

/**
 * ProductCoreService - 产品档案核心查询服务
 * 职责: 负责产品列表、详情检索及 UI 显示格式化。
 */
export const ProductCoreService = {
    /**
     * 分页/选项 获取产品列表
     */
    async getProducts(params?: { isOptions?: boolean; page?: number; pageSize?: number }): Promise<Product[]> {
        let qs = ''
        if (params?.isOptions) {
            qs = '?options=true'
        } else if (params?.page) {
            qs = `?page=${params.page}&pageSize=${params.pageSize || 50}`
        }
        // 移除导致 500 的强制默认选项
        const res = await apiFetch<Product[]>('/engineering/products' + qs)
        return ensureArrayResponse<Product>(res, 'ProductCoreService.getProducts')
    },

    /**
     * 获取单个产品详情
     */
    async getProductById(id: string): Promise<Product> {
        const res = await apiFetch<Product>(`/engineering/products/${id}`)
        return ensureObjectResponse<Product & Record<string, unknown>>(res, 'ProductCoreService.getProductById') as Product
    },

    /**
     * 格式化产品展示名称 (系统标准实现)
     */
    formatDisplay(product: any): string {
        if (!product) return 'NULL_PRODUCT'
        
        const { name, sku, techSeries, brakeType, versionLevel } = product
        const details = [techSeries, brakeType, versionLevel].filter(Boolean).join('/')
        
        if (details) {
            return `${name} (${details})`
        }
        
        return name || sku || 'UNNAMED'
    }
}
