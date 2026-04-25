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
