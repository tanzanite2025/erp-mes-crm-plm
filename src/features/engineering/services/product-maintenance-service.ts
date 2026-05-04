'use client'

import { apiFetch } from '@/lib/api-client'
import { ensureObjectResponse } from '@/lib/api-response'
import { type DeltaPayload } from '@/lib/delta/types'
import { assertRequiredVersion, buildVersionedPatchMetadata } from '@/lib/version-guard'
import {
  buildProductDelta,
  toProductWriteApiDTO,
  toProductContract,
} from '../adapters/product-api-adapter'
import { type ProductApiDTO } from '../contracts/product-api-dto'
import { type Product } from '../data/schema'
import { type SaveProductInput } from '../mutation-types'
import { normalizeSaveProductInput } from '../utils/product-code-normalization'

export const PRODUCT_CREATE_INTENT_SAVE = 'ENGINEERING_PRODUCT_CREATE'
export const PRODUCT_PATCH_INTENT_SAVE = 'ENGINEERING_PRODUCT_UPDATE'

export interface ProductTransactionRequest<TPayload> {
  intent: string
  actorId?: string
  payload: TPayload
}

const buildProductTransactionBody = (request: ProductTransactionRequest<SaveProductInput>) => ({
  ...toProductWriteApiDTO(request.payload),
  metadata: {
    intent: request.intent,
    actorId: request.actorId,
  },
})

export const executeProductTransaction = async (
  request: ProductTransactionRequest<SaveProductInput>,
  context = 'ProductMaintenanceService.executeProductTransaction'
): Promise<Product> => {
  const res = await apiFetch<ProductApiDTO>('/engineering/products', {
    method: 'POST',
    body: JSON.stringify(buildProductTransactionBody(request)),
  })
  return toProductContract(
    ensureObjectResponse<ProductApiDTO & Record<string, unknown>>(
      res,
      context
    ) as ProductApiDTO
  )
}

export const ProductMaintenanceService = {
  async createProduct(product: SaveProductInput): Promise<Product> {
    const payload = normalizeSaveProductInput({ ...product, id: '', version: 1 })
    return executeProductTransaction({
      intent: PRODUCT_CREATE_INTENT_SAVE,
      payload,
    }, 'ProductMaintenanceService.createProduct')
  },

  async patchProduct(current: Product, product: SaveProductInput): Promise<Product> {
    const normalizedProduct = normalizeSaveProductInput(product)
    const delta = buildProductDelta(current, normalizedProduct)
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
    const normalizedProduct = normalizeSaveProductInput(product)

    if (normalizedProduct.id) {
      if (!current) {
        throw new Error(`[CRITICAL] Missing current product baseline for SDRTS patch on ${normalizedProduct.id}`)
      }
      return this.patchProduct(current, normalizedProduct)
    }
    return this.createProduct(normalizedProduct)
  },

  async deleteProduct(id: string): Promise<void> {
    return apiFetch(`/engineering/products/${id}`, {
      method: 'DELETE',
    })
  },
}
