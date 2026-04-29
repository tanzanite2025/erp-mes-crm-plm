import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  apiFetchMock,
  extractPrepregBindingTokenMock,
} = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  extractPrepregBindingTokenMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

vi.mock('@/features/raw-materials/prepreg-binding-qr/services/prepreg-binding-token-service', () => ({
  extractPrepregBindingToken: extractPrepregBindingTokenMock,
}))

import {
  normalizeProductBindingHistoryQuery,
  productBindingService,
} from './product-binding-service'

describe('productBindingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    extractPrepregBindingTokenMock.mockReturnValue('PREPREG-BIND-001')
  })

  it('normalizes history filters and derives binding token from prepregQrCode', () => {
    expect(
      normalizeProductBindingHistoryQuery({
        productBarcode: '  PROD-001  ',
        prepregQrCode: '  qr-raw  ',
      })
    ).toEqual({
      limit: undefined,
      productBarcode: 'PROD-001',
      prepregQrCode: 'qr-raw',
      prepregBindingToken: 'PREPREG-BIND-001',
    })
  })

  it('prefers explicit prepregBindingToken over derived token', () => {
    expect(
      normalizeProductBindingHistoryQuery({
        prepregQrCode: 'raw-qr',
        prepregBindingToken: '  PREPREG-BIND-EXPLICIT  ',
      })
    ).toEqual({
      limit: undefined,
      productBarcode: undefined,
      prepregQrCode: 'raw-qr',
      prepregBindingToken: 'PREPREG-BIND-EXPLICIT',
    })
    expect(extractPrepregBindingTokenMock).not.toHaveBeenCalled()
  })

  it('sends normalized query params through listBindings', async () => {
    apiFetchMock.mockResolvedValue({
      items: [],
      total: 3,
    })
    extractPrepregBindingTokenMock.mockReturnValue('PREPREG-BIND-XYZ')

    const result = await productBindingService.listBindings({
      limit: 12,
      productBarcode: '  PROD-XYZ  ',
      prepregQrCode: ' https://example.com/raw-materials/catalog?bindToken=PREPREG-BIND-XYZ ',
    })

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/production/product-barcode-bindings?limit=12&productBarcode=PROD-XYZ&prepregBindingToken=PREPREG-BIND-XYZ'
    )
    expect(result).toEqual({
      items: [],
      total: 3,
    })
  })

  it('counts bindings via dedicated count endpoint', async () => {
    apiFetchMock.mockResolvedValue({ count: 12 })

    const total = await productBindingService.countBindings({
      productBarcode: 'PROD-007',
      prepregQrCode: 'qr-007',
    })

    expect(total).toBe(12)
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/production/product-barcode-bindings/count?productBarcode=PROD-007&prepregBindingToken=PREPREG-BIND-001'
    )
  })

  it('counts bindings with no filters via dedicated count endpoint', async () => {
    apiFetchMock.mockResolvedValue({ count: 25 })

    const total = await productBindingService.countBindings()

    expect(total).toBe(25)
    expect(apiFetchMock).toHaveBeenCalledWith('/production/product-barcode-bindings/count')
  })
})
