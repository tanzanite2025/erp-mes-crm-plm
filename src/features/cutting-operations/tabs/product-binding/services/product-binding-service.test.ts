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
  executeProductBinding,
  normalizeProductBindingHistoryQuery,
  PRODUCT_BINDING_INTENT_CREATE,
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

  it('wraps submitBinding in product-binding transaction metadata', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'binding-1',
      productBarcode: 'PROD-001',
      prepregRollInstanceId: 'roll-1',
      prepregQrCode: 'qr-1',
      prepregBindingToken: 'PREPREG-BIND-001',
      barcodeProtocol: 'linear',
      barcodeSummary: 'summary',
      boundAt: '2026-05-01T00:00:00Z',
      boundBy: 'tester',
      source: 'PRODUCT_BINDING_TAB',
      status: 'BOUND',
      message: 'created',
    })

    const result = await productBindingService.submitBinding({
      productBarcode: ' PROD-001 ',
      prepregQrCode: ' qr-1 ',
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/production/product-barcode-bindings', {
      method: 'POST',
      body: JSON.stringify({
        productBarcode: 'PROD-001',
        prepregQrCode: 'qr-1',
        metadata: {
          intent: PRODUCT_BINDING_INTENT_CREATE,
          actorId: undefined,
        },
      }),
    })
    expect(result.id).toBe('binding-1')
  })

  it('allows explicit product-binding transaction execution with actor metadata', async () => {
    apiFetchMock.mockResolvedValue({
      id: 'binding-2',
      productBarcode: 'PROD-002',
      prepregRollInstanceId: 'roll-2',
      prepregQrCode: 'qr-2',
      prepregBindingToken: 'PREPREG-BIND-002',
      barcodeProtocol: 'linear',
      barcodeSummary: 'summary',
      boundAt: '2026-05-01T00:00:00Z',
      boundBy: 'operator-a',
      source: 'PRODUCT_BINDING_TAB',
      status: 'BOUND',
    })

    await executeProductBinding({
      intent: PRODUCT_BINDING_INTENT_CREATE,
      actorId: 'operator-a',
      payload: {
        productBarcode: ' PROD-002 ',
        prepregQrCode: ' qr-2 ',
      },
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/production/product-barcode-bindings', {
      method: 'POST',
      body: JSON.stringify({
        productBarcode: 'PROD-002',
        prepregQrCode: 'qr-2',
        metadata: {
          intent: PRODUCT_BINDING_INTENT_CREATE,
          actorId: 'operator-a',
        },
      }),
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
