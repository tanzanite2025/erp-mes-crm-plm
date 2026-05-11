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
  buildProductDelta,
  toProductArrayContract,
  toProductOptionsArrayContract,
} from './product-api-adapter'
import { type ProductApiDTO } from '../contracts/product-api-dto'
import { createProductDraft } from '../utils/default-builders'

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

  it('builds top-level deltas for structured PATCH fields while preserving scalar field diffs', () => {
    const current = createProductDraft({
      id: 'product-1',
      sku: 'SKU-001',
      name: 'Road Fork',
      typeId: 'type-1',
      version: 3,
      restrictions: ['CN'],
      attributeValues: [
        {
          categoryKey: 'techSeries',
          optionValue: 'standard',
          sortOrder: 0,
          version: 1,
        },
      ],
      techSpecs: {
        drilling: {
          holes: 24,
        },
      },
      barcodeConfig: {
        modelCode: '01',
        appearanceCode: '1',
        category: 'R',
        holes: 24,
        isDrainHole: false,
        wheelType: 'H',
        scopeCode: '',
        suffix: '',
        serialNumber: '00001',
      },
      attachments: [
        {
          id: 'attachment-1',
          name: 'drawing-a.pdf',
          url: '/files/drawing-a.pdf',
          type: 'application/pdf',
          size: 128,
          createdAt: '2026-05-11T00:00:00.000Z',
        },
      ],
    })

    const next = {
      ...current,
      name: 'Road Fork V2',
      restrictions: ['CN', 'EU'],
      attributeValues: [
        {
          categoryKey: 'techSeries',
          optionValue: 'performance',
          sortOrder: 0,
          version: 1,
        },
      ],
      techSpecs: {
        drilling: {
          holes: 28,
        },
      },
      barcodeConfig: {
        modelCode: '02',
        appearanceCode: '2',
        category: 'R' as const,
        holes: 28,
        isDrainHole: true,
        wheelType: 'H' as const,
        scopeCode: 'A',
        suffix: 'Z',
        serialNumber: '00002',
      },
      attachments: [
        {
          id: 'attachment-2',
          name: 'drawing-b.pdf',
          url: '/files/drawing-b.pdf',
          type: 'application/pdf',
          size: 256,
          createdAt: '2026-05-12T00:00:00.000Z',
        },
      ],
    }

    const delta = buildProductDelta(current, next)

    expect(delta).toMatchObject({
      name: {
        o: 'Road Fork',
        n: 'Road Fork V2',
      },
      restrictions: {
        o: ['CN'],
        n: ['CN', 'EU'],
      },
      attributeValues: {
        o: [
          {
            categoryKey: 'techSeries',
            optionValue: 'standard',
            sortOrder: 0,
            version: 1,
          },
        ],
        n: [
          {
            categoryKey: 'techSeries',
            optionValue: 'performance',
            sortOrder: 0,
            version: 1,
          },
        ],
      },
      techSpecs: {
        o: {
          drilling: {
            holes: 24,
          },
        },
        n: {
          drilling: {
            holes: 28,
          },
        },
      },
      barcodeConfig: {
        o: {
          modelCode: '01',
          appearanceCode: '1',
          category: 'R',
          holes: 24,
          isDrainHole: false,
          wheelType: 'H',
          scopeCode: '',
          suffix: '',
          serialNumber: '00001',
        },
        n: {
          modelCode: '02',
          appearanceCode: '2',
          category: 'R',
          holes: 28,
          isDrainHole: true,
          wheelType: 'H',
          scopeCode: 'A',
          suffix: 'Z',
          serialNumber: '00002',
        },
      },
      attachments: {
        o: [
          {
            id: 'attachment-1',
            name: 'drawing-a.pdf',
            url: '/files/drawing-a.pdf',
            type: 'application/pdf',
            size: 128,
            createdAt: '2026-05-11T00:00:00.000Z',
          },
        ],
        n: [
          {
            id: 'attachment-2',
            name: 'drawing-b.pdf',
            url: '/files/drawing-b.pdf',
            type: 'application/pdf',
            size: 256,
            createdAt: '2026-05-12T00:00:00.000Z',
          },
        ],
      },
    })
    expect(Object.keys(delta)).not.toContain('restrictions.0')
    expect(Object.keys(delta)).not.toContain('attributeValues.0.categoryKey')
    expect(Object.keys(delta)).not.toContain('techSpecs.drilling.holes')
    expect(Object.keys(delta)).not.toContain('barcodeConfig.modelCode')
    expect(Object.keys(delta)).not.toContain('attachments.0.name')
  })
})
