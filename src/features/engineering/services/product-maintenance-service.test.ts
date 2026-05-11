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

  it('patchProduct ignores templateKey-only drift because templateKey is derived state', async () => {
    const current = createProductDraft({
      id: 'product-1',
      sku: 'SKU-001',
      name: 'Product A',
      typeId: 'type-1',
      version: 3,
      templateKey: 'RIM',
    })

    const result = await ProductMaintenanceService.patchProduct(current, {
      ...current,
      templateKey: 'FORK',
      version: 3,
    })

    expect(apiFetchMock).not.toHaveBeenCalled()
    expect(result).toBe(current)
  })

  it('patchProduct sends structured product fields as top-level deltas only', async () => {
    const current = createProductDraft({
      id: 'product-1',
      sku: 'SKU-001',
      name: 'Product A',
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
    apiFetchMock.mockResolvedValue(createProductApiResponse({
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
        category: 'R',
        holes: 28,
        isDrainHole: true,
        wheelType: 'H',
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
      _v: 4,
    }))

    await ProductMaintenanceService.patchProduct(current, {
      ...current,
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
        category: 'R',
        holes: 28,
        isDrainHole: true,
        wheelType: 'H',
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
      version: 3,
    })

    const body = JSON.parse(apiFetchMock.mock.calls[0][1].body)

    expect(body).toMatchObject({
      op: 'PATCH',
      delta: {
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
      },
      metadata: {
        id: 'product-1',
        version: 3,
        intent: PRODUCT_PATCH_INTENT_SAVE,
      },
    })
    expect(Object.keys(body.delta)).not.toContain('restrictions.0')
    expect(Object.keys(body.delta)).not.toContain('attributeValues.0.categoryKey')
    expect(Object.keys(body.delta)).not.toContain('techSpecs.drilling.holes')
    expect(Object.keys(body.delta)).not.toContain('barcodeConfig.modelCode')
    expect(Object.keys(body.delta)).not.toContain('attachments.0.name')
  })
})
