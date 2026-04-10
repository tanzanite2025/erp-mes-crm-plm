'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type ProductAttributeOption } from '../data/schema'

export const ProductAttributeOptionService = {
  async getProductAttributeOptions(params?: {
    categoryKey?: string
    activeOnly?: boolean
  }): Promise<ProductAttributeOption[]> {
    const search = new URLSearchParams()
    if (params?.categoryKey) search.set('categoryKey', params.categoryKey)
    if (params?.activeOnly) search.set('activeOnly', 'true')
    const qs = search.toString()
    const res = await apiFetch<ProductAttributeOption[]>(
      `/engineering/product-attribute-options${qs ? `?${qs}` : ''}`
    )
    return ensureArrayResponse<ProductAttributeOption>(res, 'ProductAttributeOptionService.getProductAttributeOptions')
  },

  async saveProductAttributeOption(
    option: Partial<ProductAttributeOption>
  ): Promise<ProductAttributeOption> {
    const res = await apiFetch<ProductAttributeOption>('/engineering/product-attribute-options', {
      method: 'POST',
      body: JSON.stringify({
        ...option,
        metadata: { intent: 'PRODUCT_ATTRIBUTE_OPTION_UPSERT' },
      }),
    })
    return ensureObjectResponse<ProductAttributeOption>(
      res,
      'ProductAttributeOptionService.saveProductAttributeOption'
    )
  },

  async deleteProductAttributeOption(id: string): Promise<void> {
    return apiFetch(`/engineering/product-attribute-options/${id}`, {
      method: 'DELETE',
    })
  },
}
