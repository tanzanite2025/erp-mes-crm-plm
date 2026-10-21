'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type ProductTemplateAttributeLevelOneCategory } from '../data/schema'
import { type SaveProductTemplateAttributeLevelOneCategoryInput } from '../mutation-types'
import { buildProductAttributeCategorySaveInput } from '../utils/product-attribute-machine-value'
import { buildProductAttributeVersionedEditPayload } from '../utils/product-attribute-versioned-edit-payload'

const PRODUCT_ATTRIBUTE_CATEGORY_EDITABLE_FIELDS = [
  'key',
  'nameZh',
  'nameEn',
  'description',
  'sortOrder',
  'active',
  'revisionNo',
  'effectiveFrom',
  'effectiveTo',
  'changeType',
  'changeOrderNo',
  'siteCode',
  'isDefaultSite',
] as const

export const ProductAttributeCategoryService = {
  async getProductAttributeCategories(params?: {
    activeOnly?: boolean
  }): Promise<ProductTemplateAttributeLevelOneCategory[]> {
    const search = new URLSearchParams()
    if (params?.activeOnly) search.set('activeOnly', 'true')
    const qs = search.toString()
    const res = await apiFetch<ProductTemplateAttributeLevelOneCategory[]>(
      `/engineering/product-attribute-categories${qs ? `?${qs}` : ''}`
    )
    return ensureArrayResponse<ProductTemplateAttributeLevelOneCategory>(
      res,
      'ProductAttributeCategoryService.getProductAttributeCategories'
    )
  },

  async saveProductAttributeCategory(
    category: SaveProductTemplateAttributeLevelOneCategoryInput,
    current?: ProductTemplateAttributeLevelOneCategory
  ): Promise<ProductTemplateAttributeLevelOneCategory> {
    const normalizedCategory = buildProductAttributeCategorySaveInput(category)
    const payload = normalizedCategory.id
      ? buildProductAttributeVersionedEditPayload(
          normalizedCategory,
          current,
          PRODUCT_ATTRIBUTE_CATEGORY_EDITABLE_FIELDS,
          'PRODUCT_ATTRIBUTE_CATEGORY_UPSERT'
        )
      : {
          ...normalizedCategory,
          metadata: { intent: 'PRODUCT_ATTRIBUTE_CATEGORY_UPSERT' },
        }
    if (
      current &&
      'delta' in payload &&
      Object.keys(payload.delta).length === 0
    )
      return current
    const res = await apiFetch<ProductTemplateAttributeLevelOneCategory>(
      '/engineering/product-attribute-categories',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
    return ensureObjectResponse<ProductTemplateAttributeLevelOneCategory>(
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
