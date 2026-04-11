'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureArrayResponse, ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload } from '@/lib/delta/types'
import {
  buildProductTypeAttributeBindingDelta,
  toProductTypeAttributeBindingApiDTO,
  toProductTypeAttributeBindingContract,
} from '../adapters/product-type-attribute-binding-api-adapter'
import { type ProductTypeAttributeBindingApiDTO } from '../contracts/product-type-attribute-binding-api-dto'
import { type ProductTypeAttributeBinding } from '../data/schema'
import { type SaveProductTypeAttributeBindingInput } from '../mutation-types'

export const ProductTypeAttributeBindingService = {
  async getProductTypeAttributeBindings(params?: {
    productTypeId?: string
    activeOnly?: boolean
  }): Promise<ProductTypeAttributeBinding[]> {
    const search = new URLSearchParams()
    if (params?.productTypeId) search.set('productTypeId', params.productTypeId)
    if (params?.activeOnly) search.set('activeOnly', 'true')
    const qs = search.toString()
    const res = await apiFetch<ProductTypeAttributeBindingApiDTO[]>(
      `/engineering/product-type-attribute-bindings${qs ? `?${qs}` : ''}`
    )
    return ensureArrayResponse<ProductTypeAttributeBindingApiDTO>(
      res,
      'ProductTypeAttributeBindingService.getProductTypeAttributeBindings'
    ).map(toProductTypeAttributeBindingContract)
  },

  async createProductTypeAttributeBinding(
    binding: SaveProductTypeAttributeBindingInput
  ): Promise<ProductTypeAttributeBinding> {
    const res = await apiFetch<ProductTypeAttributeBindingApiDTO>('/engineering/product-type-attribute-bindings', {
      method: 'POST',
      body: JSON.stringify(toProductTypeAttributeBindingApiDTO({ ...binding, id: '', version: 1 })),
    })
    return toProductTypeAttributeBindingContract(
      ensureObjectResponse<ProductTypeAttributeBindingApiDTO & Record<string, unknown>>(
        res,
        'ProductTypeAttributeBindingService.createProductTypeAttributeBinding'
      ) as ProductTypeAttributeBindingApiDTO
    )
  },

  async patchProductTypeAttributeBinding(
    current: ProductTypeAttributeBinding,
    next: SaveProductTypeAttributeBindingInput
  ): Promise<ProductTypeAttributeBinding> {
    const delta = buildProductTypeAttributeBindingDelta(current, next)
    if (Object.keys(delta).length === 0) {
      return { ...current, ...next }
    }
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: { id: current.id, version: current.version, intent: 'ENGINEERING_PRODUCT_TYPE_ATTRIBUTE_BINDING_UPDATE' },
    }
    const res = await apiFetch<ProductTypeAttributeBindingApiDTO>(`/engineering/product-type-attribute-bindings/${current.id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return toProductTypeAttributeBindingContract(
      ensureObjectResponse<ProductTypeAttributeBindingApiDTO & Record<string, unknown>>(
        res,
        'ProductTypeAttributeBindingService.patchProductTypeAttributeBinding'
      ) as ProductTypeAttributeBindingApiDTO
    )
  },

  async saveProductTypeAttributeBinding(
    binding: SaveProductTypeAttributeBindingInput,
    current?: ProductTypeAttributeBinding
  ): Promise<ProductTypeAttributeBinding> {
    if (current?.id) {
      return this.patchProductTypeAttributeBinding(current, binding)
    }
    return this.createProductTypeAttributeBinding(binding)
  },

  async syncProductTypeAttributeBindings(
    productTypeId: string,
    bindings: SaveProductTypeAttributeBindingInput[]
  ): Promise<{ message: string; count: number }> {
    return apiFetch<{ message: string; count: number }>('/engineering/product-type-attribute-bindings/sync', {
      method: 'POST',
      body: JSON.stringify({
        productTypeId,
        bindings,
      }),
    })
  },

  async deleteProductTypeAttributeBinding(id: string): Promise<void> {
    return apiFetch(`/engineering/product-type-attribute-bindings/${id}`, {
      method: 'DELETE',
    })
  },
}
