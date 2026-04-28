import { describe, expect, it, vi } from 'vitest'

const { warnMock } = vi.hoisted(() => ({
  warnMock: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  createLogger: vi.fn(() => ({
    warn: warnMock,
  })),
}))

import {
  toProductArrayContract,
  toProductOptionsArrayContract,
} from './product-api-adapter'
import { type ProductApiDTO } from '../contracts/product-api-dto'

function buildProductDto(overrides: Partial<ProductApiDTO> = {}): ProductApiDTO {
  return {
    id: 'product-1',
    sku: 'SKU-001',
    name: 'Road Fork',
    modelCode: '01',
    typeId: 'type-1',
    restrictions: [],
    attributeValues: [],
    status: 'Active',
    createdAt: '2026-04-14T00:00:00.000Z',
    _v: 1,
    ...overrides,
  }
}

describe('product-api-adapter', () => {
  it('keeps strict array conversion behavior for invalid products', () => {
    expect(() =>
      toProductArrayContract([
        buildProductDto({ sku: '   ' }),
      ])
    ).toThrow('SKU is required')
  })

  it('skips invalid products for options conversion and logs enough context to locate them', () => {
    const products = toProductOptionsArrayContract([
      buildProductDto({ id: 'bad-product', name: 'Broken Product', sku: '   ' }),
      buildProductDto({ id: 'good-product', name: 'Valid Product', sku: 'sku-002' }),
    ])

    expect(products).toHaveLength(1)
    expect(products[0]?.id).toBe('good-product')
    expect(products[0]?.sku).toBe('SKU-002')
    expect(warnMock).toHaveBeenCalledWith(
      'Skipped invalid product option during contract mapping',
      expect.objectContaining({
        id: 'bad-product',
        name: 'Broken Product',
        rawSku: '   ',
        normalizedSku: '',
      })
    )
    expect(warnMock).toHaveBeenCalledWith(
      'Product options contract mapping completed with skipped entries',
      expect.objectContaining({
        received: 2,
        returned: 1,
        skipped: 1,
      })
    )
  })

  it('normalizes missing option collection fields instead of throwing for product options conversion', () => {
    const products = toProductOptionsArrayContract([
      buildProductDto({
        id: 'legacy-product',
        name: 'Legacy Product',
        sku: 'sku-legacy',
        restrictions: undefined,
        attributeValues: undefined,
      }),
    ])

    expect(products).toHaveLength(1)
    expect(products[0]).toMatchObject({
      id: 'legacy-product',
      sku: 'SKU-LEGACY',
      restrictions: [],
      attributeValues: [],
    })
    expect(warnMock).toHaveBeenCalledWith(
      'Normalized missing product option collections during contract mapping',
      expect.objectContaining({
        id: 'legacy-product',
        name: 'Legacy Product',
        missingCollections: ['restrictions', 'attributeValues'],
      })
    )
  })
})
