import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductApiDTO } from '../contracts/product-api-dto'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

import { ProductCoreService } from './product-core-service'

function buildLightweightProductDto(
  overrides: Partial<ProductApiDTO> = {}
): ProductApiDTO {
  return {
    id: 'product-1',
    sku: 'SKU-001',
    name: 'Product A',
    modelCode: 'MODEL-A',
    typeId: 'type-1',
    weight: 2.5,
    ...overrides,
  }
}

function buildFullProductDto(
  overrides: Partial<ProductApiDTO> = {}
): ProductApiDTO {
  return {
    id: 'product-full-1',
    sku: 'SKU-001',
    name: 'Product Full',
    modelCode: '01',
    typeId: 'type-1',
    restrictions: [],
    attributeValues: [],
    attachments: [],
    createdAt: '2026-05-04T00:00:00Z',
    _v: 1,
    ...overrides,
  }
}

describe('ProductCoreService.getProductPackagingOptions', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('maps lightweight product option DTOs without requiring full product fields', async () => {
    apiFetchMock.mockResolvedValue([
      buildLightweightProductDto(),
      buildLightweightProductDto({
        id: 'product-2',
        weight: undefined,
      }),
    ])

    const result = await ProductCoreService.getProductPackagingOptions()

    expect(apiFetchMock).toHaveBeenCalledWith('/engineering/products?options=true')
    expect(result).toEqual([
      { id: 'product-1', weight: 2.5 },
      { id: 'product-2', weight: undefined },
    ])
  })
})

describe('ProductCoreService.getAuthoritativeProducts', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('uses strict product contract for management reads', async () => {
    apiFetchMock.mockResolvedValue([
      buildFullProductDto({ id: 'product-1', name: 'Product A' }),
      buildFullProductDto({ id: 'product-2', sku: 'SKU-002', name: 'Product B' }),
    ])

    const result = await ProductCoreService.getAuthoritativeProducts()

    expect(apiFetchMock).toHaveBeenCalledWith('/engineering/products?options=true')
    expect(result).toHaveLength(2)
    expect(result[0]?.id).toBe('product-1')
    expect(result[1]?.id).toBe('product-2')
  })

  it('throws on invalid management product DTO instead of silently skipping it', async () => {
    apiFetchMock.mockResolvedValue([
      buildFullProductDto({ id: 'broken-product', restrictions: undefined }),
    ])

    await expect(ProductCoreService.getAuthoritativeProducts()).rejects.toThrow(
      'Missing restrictions array in Product DTO'
    )
  })
})
