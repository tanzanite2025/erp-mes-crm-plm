'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type ProductAttributeOption } from '../data/schema'
import { type SaveProductAttributeOptionInput } from '../mutation-types'
import { buildProductAttributeOptionSaveInput } from '../utils/product-attribute-machine-value'

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
    option: SaveProductAttributeOptionInput
  ): Promise<ProductAttributeOption> {
    const normalizedOption = buildProductAttributeOptionSaveInput(option)
    const res = await apiFetch<ProductAttributeOption>('/engineering/product-attribute-options', {
      method: 'POST',
      body: JSON.stringify({
        ...normalizedOption,
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
