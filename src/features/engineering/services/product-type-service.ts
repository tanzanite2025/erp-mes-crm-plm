'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload, type DeltaSet } from '@/lib/delta/types'
import { buildProductTypeDelta, toProductTypeApiDTO, toProductTypeArrayContract, toProductTypeContract, toProductTypeListContract } from '../adapters/product-type-api-adapter'
import { type ProductTypeApiDTO, type ProductTypeListPageApiDTO } from '../contracts/product-type-api-dto'
import { type ProductType } from '../data/schema'
import { type SaveProductTypeInput } from '../mutation-types'

export type { SaveProductTypeInput } from '../mutation-types'

/**
 * ProductTypeService - unified full-save service for product types.
 */
const PRODUCT_TYPE_PATCH_INTENT_SAVE = 'ENGINEERING_PRODUCT_TYPE_UPDATE'

export const ProductTypeService = {
  async getProductTypes(params?: {
    isOptions?: boolean
    page?: number
    pageSize?: number
  }): Promise<ProductType[]> {
    let qs = ''
    if (params?.isOptions) {
      qs = '?options=true'
    } else if (params?.page) {
      qs = `?page=${params.page}&pageSize=${params.pageSize || 50}`
    }

    if (params?.isOptions) {
      const res = await apiFetch<ProductTypeApiDTO[]>(`/engineering/product-types${qs}`)
      return toProductTypeArrayContract(
        ensureArrayResponse<ProductTypeApiDTO>(res, 'ProductTypeService.getProductTypes.options')
      )
    }

    const res = await apiFetch<ProductTypeListPageApiDTO>(`/engineering/product-types${qs}`)
    return toProductTypeListContract(
      ensureObjectResponse<ProductTypeListPageApiDTO & Record<string, unknown>>(
        res,
        'ProductTypeService.getProductTypes.page'
      ) as ProductTypeListPageApiDTO
    )
  },

  async createProductType(type: SaveProductTypeInput): Promise<ProductType> {
    const res = await apiFetch<ProductTypeApiDTO>('/engineering/product-types', {
      method: 'POST',
      body: JSON.stringify(toProductTypeApiDTO({ ...type, id: '', version: 1 })),
    })
    return toProductTypeContract(
      ensureObjectResponse<ProductTypeApiDTO & Record<string, unknown>>(res, 'ProductTypeService.createProductType') as ProductTypeApiDTO
    )
  },

  async patchProductType(id: string, delta: DeltaSet, version: number): Promise<ProductType> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id, version, intent: PRODUCT_TYPE_PATCH_INTENT_SAVE },
    }
    const res = await apiFetch<ProductTypeApiDTO>(`/engineering/product-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return toProductTypeContract(
      ensureObjectResponse<ProductTypeApiDTO & Record<string, unknown>>(res, 'ProductTypeService.patchProductType') as ProductTypeApiDTO
    )
  },

  async saveProductType(type: SaveProductTypeInput, current?: ProductType): Promise<ProductType> {
    if (current?.id) {
      const delta = buildProductTypeDelta(current, type)
      if (Object.keys(delta).length === 0) {
        return { ...current, ...type }
      }
      return this.patchProductType(current.id, delta, current.version)
    }
    return this.createProductType(type)
  },

  async deleteProductType(id: string): Promise<void> {
    return apiFetch(`/engineering/product-types/${id}`, {
      method: 'DELETE',
    })
  },
}
