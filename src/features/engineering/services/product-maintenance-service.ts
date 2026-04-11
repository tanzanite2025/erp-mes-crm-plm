'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload } from '@/lib/delta/types'
import {
  buildProductDelta,
  toBulkSyncProductsApiDTO,
  toProductApiDTO,
  toProductContract,
} from '../adapters/product-api-adapter'
import { type ProductApiDTO } from '../contracts/product-api-dto'
import { type Product } from '../data/schema'
import { type SaveProductInput } from '../mutation-types'

const PRODUCT_PATCH_INTENT_SAVE = 'ENGINEERING_PRODUCT_UPDATE'

export const ProductMaintenanceService = {
  async createProduct(product: SaveProductInput): Promise<Product> {
    const res = await apiFetch<ProductApiDTO>('/engineering/products', {
      method: 'POST',
      body: JSON.stringify(toProductApiDTO({ ...product, id: '', version: 1 })),
    })
    return toProductContract(
      ensureObjectResponse<ProductApiDTO & Record<string, unknown>>(
        res,
        'ProductMaintenanceService.createProduct'
      ) as ProductApiDTO
    )
  },

  async patchProduct(id: string, product: SaveProductInput): Promise<Product> {
    const payload: DeltaPayload = {
      op: 'PATCH',
      delta: buildProductDelta(product),
      metadata: {
        id,
        version: product.version ?? 0,
        intent: PRODUCT_PATCH_INTENT_SAVE,
      },
    }

    const res = await apiFetch<ProductApiDTO>(`/engineering/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
    return toProductContract(
      ensureObjectResponse<ProductApiDTO & Record<string, unknown>>(
        res,
        'ProductMaintenanceService.patchProduct'
      ) as ProductApiDTO
    )
  },

  async saveProduct(product: SaveProductInput): Promise<Product> {
    if (product.id) {
      return this.patchProduct(product.id, product)
    }
    return this.createProduct(product)
  },

  async bulkSyncProducts(products: SaveProductInput[]): Promise<{ status: string; count: number }> {
    return apiFetch<{ status: string; count: number }>('/engineering/products/sync', {
      method: 'POST',
      body: JSON.stringify(toBulkSyncProductsApiDTO(products)),
    })
  },

  async deleteProduct(id: string): Promise<void> {
    return apiFetch(`/engineering/products/${id}`, {
      method: 'DELETE',
    })
  },
}
