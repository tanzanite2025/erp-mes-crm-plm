import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProductDraft } from '../utils/default-builders'
import {
  executeProductTransaction,
  ProductMaintenanceService,
  PRODUCT_CREATE_INTENT_SAVE,
  PRODUCT_PATCH_INTENT_SAVE,
} from './product-maintenance-service'

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}))

vi.mock('@/lib/api-client', () => ({
  apiFetch: apiFetchMock,
}))

function createProductApiResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'product-1',
    sku: 'SKU-001',
    name: 'Product A',
    modelCode: '01',
    typeId: 'type-1',
    restrictions: [],
    attributeValues: [],
    attachments: [],
    status: 'Active',
    createdAt: '2026-01-01T00:00:00.000Z',
    _v: 1,
    ...overrides,
  }
}

describe('ProductMaintenanceService transaction contracts', () => {
  beforeEach(() => {
    apiFetchMock.mockReset()
  })

  it('createProduct sends engineering product create intent metadata', async () => {
    apiFetchMock.mockResolvedValue(createProductApiResponse())

    await ProductMaintenanceService.createProduct({
      sku: 'SKU-001',
      name: 'Product A',
      modelCode: '01',
      typeId: 'type-1',
      restrictions: [],
      attributeValues: [],
      attachments: [],
      status: 'Active',
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/engineering/products', {
      method: 'POST',
      body: expect.any(String),
    })
    expect(JSON.parse(apiFetchMock.mock.calls[0][1].body)).toEqual({
      id: '',
      sku: 'SKU-001',
      name: 'Product A',
      modelCode: '01',
      typeId: 'type-1',
      restrictions: [],
      engineeringSpecId: '',
      attributeValues: [],
      attachments: [],
      status: 'Active',
      templateKey: '',
      revisionNo: 'R1',
      effectiveFrom: null,
      effectiveTo: null,
      changeOrderNo: '',
      siteCode: '',
      _v: 1,
      metadata: {
        intent: PRODUCT_CREATE_INTENT_SAVE,
      },
    })
  })

  it('executeProductTransaction keeps actor metadata available for create commands', async () => {
    apiFetchMock.mockResolvedValue(createProductApiResponse())

    await executeProductTransaction({
      intent: PRODUCT_CREATE_INTENT_SAVE,
      actorId: 'operator-1',
      payload: {
        sku: 'SKU-002',
        name: 'Product B',
        modelCode: '01',
        typeId: 'type-1',
        restrictions: [],
        attributeValues: [],
        attachments: [],
        status: 'Active',
      },
    })

    expect(JSON.parse(apiFetchMock.mock.calls[0][1].body)).toMatchObject({
      sku: 'SKU-002',
      metadata: {
        intent: PRODUCT_CREATE_INTENT_SAVE,
        actorId: 'operator-1',
      },
    })
  })

  it('patchProduct keeps engineering product update intent metadata', async () => {
    const current = createProductDraft({
      id: 'product-1',
      sku: 'SKU-001',
      name: 'Product A',
      typeId: 'type-1',
      version: 3,
    })
    apiFetchMock.mockResolvedValue(createProductApiResponse({ name: 'Product A+', _v: 4 }))

    await ProductMaintenanceService.patchProduct(current, {
      ...current,
      name: 'Product A+',
      version: 3,
    })

    expect(apiFetchMock).toHaveBeenCalledWith('/engineering/products/product-1', {
      method: 'PATCH',
      body: JSON.stringify({
        op: 'PATCH',
        delta: {
          name: {
            o: 'Product A',
            n: 'Product A+',
          },
        },
        metadata: {
          id: 'product-1',
          version: 3,
          intent: PRODUCT_PATCH_INTENT_SAVE,
        },
      }),
    })
  })
})
