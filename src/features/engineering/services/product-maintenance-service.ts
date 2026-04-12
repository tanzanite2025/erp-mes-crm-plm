'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload } from '@/lib/delta/types'
import { assertRequiredVersion, buildVersionedPatchMetadata } from '@/lib/version-guard'
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
    const payload: SaveProductInput = { ...product, id: '', version: 1 }
    const res = await apiFetch<ProductApiDTO>('/engineering/products', {
      method: 'POST',
      body: JSON.stringify(toProductApiDTO(payload)),
    })
    return toProductContract(
      ensureObjectResponse<ProductApiDTO & Record<string, unknown>>(
        res,
        'ProductMaintenanceService.createProduct'
      ) as ProductApiDTO
    )
  },

  async patchProduct(current: Product, product: SaveProductInput): Promise<Product> {
    const delta = buildProductDelta(current, product)
    if (Object.keys(delta).length === 0) {
      return current
    }

    const version = assertRequiredVersion(
      product.version ?? current.version,
      'ProductMaintenanceService.patchProduct',
      current.id
    )

    const payload: DeltaPayload = {
      op: 'PATCH',
      delta,
      metadata: buildVersionedPatchMetadata(current.id, version, 'ProductMaintenanceService.patchProduct', {
        intent: PRODUCT_PATCH_INTENT_SAVE,
      }),
    }

    const res = await apiFetch<ProductApiDTO>(`/engineering/products/${current.id}`, {
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

  async saveProduct(product: SaveProductInput, current?: Product): Promise<Product> {
    if (product.id) {
      if (!current) {
        throw new Error(`[CRITICAL] Missing current product baseline for SDRTS patch on ${product.id}`)
      }
      return this.patchProduct(current, product)
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
