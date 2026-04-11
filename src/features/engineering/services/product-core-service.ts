'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { toProductArrayContract, toProductContract, toProductListContract } from '../adapters/product-api-adapter'
import {
  type ProductApiDTO,
  type ProductListPageApiDTO,
  type ProductNextCodeApiDTO,
} from '../contracts/product-api-dto'
import { type Product } from '../data/schema'
import { getProductAttributeSummary } from '../utils/product-attribute-utils'

export const ProductCoreService = {
  async getProducts(params?: { isOptions?: boolean; page?: number; pageSize?: number }): Promise<Product[]> {
    const useOptions = params?.isOptions ?? !params?.page
    let qs = ''

    if (useOptions) {
      qs = '?options=true'
    } else if (params?.page) {
      qs = `?page=${params.page}&pageSize=${params.pageSize || 50}`
    }

    if (useOptions) {
      const res = await apiFetch<ProductApiDTO[]>(`/engineering/products${qs}`)
      return toProductArrayContract(
        ensureArrayResponse<ProductApiDTO>(res, 'ProductCoreService.getProducts.options')
      )
    }

    const res = await apiFetch<ProductListPageApiDTO>(`/engineering/products${qs}`)
    return toProductListContract(
      ensureObjectResponse<ProductListPageApiDTO & Record<string, unknown>>(
        res,
        'ProductCoreService.getProducts.page'
      ) as ProductListPageApiDTO
    )
  },

  async getProductById(id: string): Promise<Product> {
    const res = await apiFetch<ProductApiDTO>(`/engineering/products/${id}`)
    return toProductContract(
      ensureObjectResponse<ProductApiDTO & Record<string, unknown>>(
        res,
        'ProductCoreService.getProductById'
      ) as ProductApiDTO
    )
  },

  formatDisplay(product: Partial<Product> | null | undefined): string {
    if (!product) return 'NULL_PRODUCT'

    const { name, sku } = product
    const { series, brake, version } = getProductAttributeSummary(product as Product)
    const details = [series, brake, version].filter(Boolean).join('/')

    if (details) {
      return `${name} (${details})`
    }

    return name || sku || 'UNNAMED'
  },

  async getNextCode(typeId: string): Promise<string> {
    const res = await apiFetch<ProductNextCodeApiDTO>(
      `/engineering/products/next-code?typeId=${typeId}`
    )
    const data = ensureObjectResponse<ProductNextCodeApiDTO & Record<string, unknown>>(
      res,
      'ProductCoreService.getNextCode'
    ) as ProductNextCodeApiDTO
    return data.nextCode
  },
}
