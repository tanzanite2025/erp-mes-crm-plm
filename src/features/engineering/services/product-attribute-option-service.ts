'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type ProductTemplateAttributeLevelTwoOption } from '../data/schema'
import { type SaveProductTemplateAttributeLevelTwoOptionInput } from '../mutation-types'
import { buildProductAttributeOptionSaveInput } from '../utils/product-attribute-machine-value'
import { buildProductAttributeVersionedEditPayload } from '../utils/product-attribute-versioned-edit-payload'

const PRODUCT_ATTRIBUTE_OPTION_EDITABLE_FIELDS = [
  'categoryKey',
  'value',
  'labelZh',
  'labelEn',
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

export const ProductAttributeOptionService = {
  async getProductAttributeOptions(params?: {
    categoryKey?: string
    activeOnly?: boolean
  }): Promise<ProductTemplateAttributeLevelTwoOption[]> {
    const search = new URLSearchParams()
    if (params?.categoryKey) search.set('categoryKey', params.categoryKey)
    if (params?.activeOnly) search.set('activeOnly', 'true')
    const qs = search.toString()
    const res = await apiFetch<ProductTemplateAttributeLevelTwoOption[]>(
      `/engineering/product-attribute-options${qs ? `?${qs}` : ''}`
    )
    return ensureArrayResponse<ProductTemplateAttributeLevelTwoOption>(
      res,
      'ProductAttributeOptionService.getProductAttributeOptions'
    )
  },

  async saveProductAttributeOption(
    option: SaveProductTemplateAttributeLevelTwoOptionInput,
    current?: ProductTemplateAttributeLevelTwoOption
  ): Promise<ProductTemplateAttributeLevelTwoOption> {
    const normalizedOption = buildProductAttributeOptionSaveInput(option)
    const payload = normalizedOption.id
      ? buildProductAttributeVersionedEditPayload(
          normalizedOption,
          current,
          PRODUCT_ATTRIBUTE_OPTION_EDITABLE_FIELDS,
          'PRODUCT_ATTRIBUTE_OPTION_UPSERT'
        )
      : {
          ...normalizedOption,
          metadata: { intent: 'PRODUCT_ATTRIBUTE_OPTION_UPSERT' },
        }
    if (
      current &&
      'delta' in payload &&
      Object.keys(payload.delta).length === 0
    )
      return current
    const res = await apiFetch<ProductTemplateAttributeLevelTwoOption>(
      '/engineering/product-attribute-options',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    )
    return ensureObjectResponse<ProductTemplateAttributeLevelTwoOption>(
      res,
      'ProductAttributeOptionService.saveProductAttributeOption'
    )
  },

  async deleteProductAttributeOption(id: string): Promise<void> {
    return apiFetch(`/engineering/product-attribute-options/${id}`, {
      method: 'DELETE',
    })
  },

  async reorderProductAttributeOptions(
    categoryKey: string,
    ids: string[]
  ): Promise<void> {
    await apiFetch('/engineering/product-attribute-options/reorder', {
      method: 'POST',
      body: JSON.stringify({ categoryKey, ids }),
    })
  },
}
