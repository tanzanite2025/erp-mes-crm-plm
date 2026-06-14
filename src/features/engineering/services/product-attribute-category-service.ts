'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type ProductAttributeCategory } from '../data/schema'
import { type SaveProductAttributeCategoryInput } from '../mutation-types'
import { buildProductAttributeCategorySaveInput } from '../utils/product-attribute-machine-value'

export const ProductAttributeCategoryService = {
  async getProductAttributeCategories(params?: {
    activeOnly?: boolean
  }): Promise<ProductAttributeCategory[]> {
    const search = new URLSearchParams()
    if (params?.activeOnly) search.set('activeOnly', 'true')
    const qs = search.toString()
    const res = await apiFetch<ProductAttributeCategory[]>(
      `/engineering/product-attribute-categories${qs ? `?${qs}` : ''}`
    )
    return ensureArrayResponse<ProductAttributeCategory>(
      res,
      'ProductAttributeCategoryService.getProductAttributeCategories'
    )
  },

  async saveProductAttributeCategory(
    category: SaveProductAttributeCategoryInput
  ): Promise<ProductAttributeCategory> {
    const normalizedCategory = buildProductAttributeCategorySaveInput(category)
    const res = await apiFetch<ProductAttributeCategory>(
      '/engineering/product-attribute-categories',
      {
        method: 'POST',
        body: JSON.stringify({
          ...normalizedCategory,
          metadata: { intent: 'PRODUCT_ATTRIBUTE_CATEGORY_UPSERT' },
        }),
      }
    )
    return ensureObjectResponse<ProductAttributeCategory>(
      res,
      'ProductAttributeCategoryService.saveProductAttributeCategory'
    )
  },

  async deleteProductAttributeCategory(id: string): Promise<void> {
    return apiFetch(`/engineering/product-attribute-categories/${id}`, {
      method: 'DELETE',
    })
  },

  async reorderProductAttributeCategories(ids: string[]): Promise<void> {
    await apiFetch('/engineering/product-attribute-categories/reorder', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    })
  },
}
