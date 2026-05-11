// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBOMReferenceResource } from './use-bom-reference-resource'

const {
  getProductsMock,
  getMaterialOptionsMock,
  getTemplatesMock,
  getProductTypesMock,
  getProductAttributeCategoriesMock,
  getProductAttributeOptionsMock,
  useBOMSectionOptionsMock,
  failLoudlyMock,
} = vi.hoisted(() => ({
  getProductsMock: vi.fn(),
  getMaterialOptionsMock: vi.fn(),
  getTemplatesMock: vi.fn(),
  getProductTypesMock: vi.fn(),
  getProductAttributeCategoriesMock: vi.fn(),
  getProductAttributeOptionsMock: vi.fn(),
  useBOMSectionOptionsMock: vi.fn(),
  failLoudlyMock: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: string) => key,
  }),
}))

vi.mock('@/lib/safe-catch', () => ({
  failLoudly: failLoudlyMock,
}))

vi.mock('@/features/engineering/services/product-core-service', () => ({
  ProductCoreService: {
    getProducts: getProductsMock,
  },
}))

vi.mock('../../material-archive/services/material-core-service', () => ({
  MaterialCoreService: {
    getMaterialOptions: getMaterialOptionsMock,
  },
}))

vi.mock('@/features/engineering/services/product-template-service', () => ({
  productTemplateService: {
    getTemplates: getTemplatesMock,
  },
}))

vi.mock('@/features/engineering/services/product-type-service', () => ({
  ProductTypeService: {
    getProductTypes: getProductTypesMock,
  },
}))

vi.mock('@/features/engineering/services/product-attribute-category-service', () => ({
  ProductAttributeCategoryService: {
    getProductAttributeCategories: getProductAttributeCategoriesMock,
  },
}))

vi.mock('@/features/engineering/services/product-attribute-option-service', () => ({
  ProductAttributeOptionService: {
    getProductAttributeOptions: getProductAttributeOptionsMock,
  },
}))

vi.mock('./use-bom-section-config', () => ({
  useBOMSectionOptions: useBOMSectionOptionsMock,
}))

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

function buildSectionQuery(overrides: Record<string, unknown> = {}) {
  return {
    data: [{ value: 'PREPARE', label: '备料', code: 'PREPARE', name: '备料', active: true, sortOrder: 1, isDefault: true, legacyNames: ['备料'] }],
    error: null,
    isPending: false,
    ...overrides,
  }
}

describe('useBOMReferenceResource', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useBOMSectionOptionsMock.mockReturnValue(buildSectionQuery())
    getTemplatesMock.mockResolvedValue([])
    getProductTypesMock.mockResolvedValue([])
    getProductAttributeCategoriesMock.mockResolvedValue([])
    getProductAttributeOptionsMock.mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns loading while any reference query is still pending', () => {
    getProductsMock.mockImplementation(() => new Promise(() => undefined))
    getMaterialOptionsMock.mockResolvedValue([])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useBOMReferenceResource({ enabled: true }), {
      wrapper: createWrapper(queryClient),
    })

    expect(result.current).toEqual({ status: 'loading' })
    expect(failLoudlyMock).not.toHaveBeenCalled()
  })

  it('returns ready with products, materials and sections when all queries succeed', async () => {
    getProductsMock.mockResolvedValue([
      {
        id: 'product-1',
        sku: 'RR-01',
        name: 'Road Rim',
        typeId: 'type-rim',
        resolvedTemplateId: 'template-rim',
        resolvedTemplateKey: 'RIM',
        templateKey: 'RIM',
        attributeValues: [
          {
            categoryKey: 'techSeries',
            optionValue: 'high-tg',
            sortOrder: 0,
            version: 1,
          },
        ],
        restrictions: [],
        attachments: [],
        status: 'Active',
        createdAt: '2026-05-11T00:00:00.000Z',
        version: 1,
      },
    ])
    getMaterialOptionsMock.mockResolvedValue([{ id: 'mat-1', code: 'MAT-001', name: 'Material A', category: 'RAW_MATERIAL', spec: '', uom: 'PCS', status: 'Active' }])
    getTemplatesMock.mockResolvedValue([
      {
        id: 'template-rim',
        name: '车圈规格',
        code: 'RIM_TEMPLATE',
        componentKey: 'RIM',
        description: '',
        active: true,
        attributeBindings: [
          {
            id: 'template-binding-series',
            templateId: 'template-rim',
            categoryKey: 'techSeries',
            required: true,
            active: true,
            sortOrder: 0,
            version: 1,
          },
        ],
        createdAt: '2026-05-11T00:00:00.000Z',
        version: 1,
      },
    ])
    getProductTypesMock.mockResolvedValue([
      {
        id: 'type-rim',
        name: 'Rim',
        code: 'RIM',
        templateId: 'template-rim',
        active: true,
        sortOrder: 0,
        version: 1,
      },
    ])
    getProductAttributeCategoriesMock.mockResolvedValue([
      {
        id: 'category-series',
        key: 'techSeries',
        nameZh: '工艺系列',
        nameEn: 'Series',
        sortOrder: 0,
        active: true,
        version: 1,
      },
    ])
    getProductAttributeOptionsMock.mockResolvedValue([
      {
        id: 'option-series',
        categoryKey: 'techSeries',
        value: 'high-tg',
        labelZh: '高刚性',
        labelEn: 'High TG',
        sortOrder: 0,
        active: true,
        version: 1,
      },
    ])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useBOMReferenceResource({ enabled: true }), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    expect(result.current.status).toBe('ready')
    if (result.current.status === 'ready') {
      expect(result.current.products).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'product-1', sku: 'RR-01' })])
      )
      expect(result.current.productTemplates).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'template-rim' })])
      )
      expect(result.current.productTypes).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'type-rim' })])
      )
      expect(result.current.productDisplayLabelMap.get('product-1')).toBe('Road Rim (高刚性)')
      expect(result.current.materials).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'mat-1' })])
      )
      expect(result.current.sections).toEqual(
        expect.arrayContaining([expect.objectContaining({ value: 'PREPARE' })])
      )
    }
    expect(failLoudlyMock).not.toHaveBeenCalled()
  })

  it('uses the v2 base projection for products without resolved template metadata', async () => {
    getProductsMock.mockResolvedValue([
      {
        id: 'product-2',
        sku: 'R50-01',
        name: 'R50',
        typeId: 'type-unknown',
        attributeValues: [
          {
            categoryKey: 'techSeries',
            optionValue: 'high-tg',
            sortOrder: 0,
            version: 1,
          },
          {
            categoryKey: 'brakeType',
            optionValue: 'disc',
            sortOrder: 1,
            version: 1,
          },
        ],
        restrictions: [],
        attachments: [],
        status: 'Active',
        createdAt: '2026-05-11T00:00:00.000Z',
        version: 1,
      },
    ])
    getMaterialOptionsMock.mockResolvedValue([{ id: 'mat-1', code: 'MAT-001', name: 'Material A', category: 'RAW_MATERIAL', spec: '', uom: 'PCS', status: 'Active' }])
    getTemplatesMock.mockResolvedValue([])
    getProductTypesMock.mockResolvedValue([])
    getProductAttributeCategoriesMock.mockResolvedValue([])
    getProductAttributeOptionsMock.mockResolvedValue([])

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useBOMReferenceResource({ enabled: true }), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    expect(result.current.status).toBe('ready')
    if (result.current.status === 'ready') {
      expect(result.current.productDisplayLabelMap.get('product-2')).toBe('R50')
    }
  })

  it('returns error and fails loudly when materials query rejects', async () => {
    const error = new Error('materials load failed')
    getProductsMock.mockResolvedValue([{ id: 'product-1', sku: 'SKU-001', name: 'Product A' }])
    getMaterialOptionsMock.mockRejectedValue(error)

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useBOMReferenceResource({ enabled: true }), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    expect(result.current).toEqual({
      status: 'error',
      error,
      scope: 'useBOMReferenceResource.materials',
    })
    expect(failLoudlyMock).toHaveBeenCalledWith(error, 'useBOMReferenceResource.materials')
  })

  it('returns error when sections query resolves to undefined', async () => {
    getProductsMock.mockResolvedValue([{ id: 'product-1', sku: 'SKU-001', name: 'Product A' }])
    getMaterialOptionsMock.mockResolvedValue([{ id: 'mat-1', code: 'MAT-001', name: 'Material A', category: 'RAW_MATERIAL', spec: '', uom: 'PCS', status: 'Active' }])
    useBOMSectionOptionsMock.mockReturnValue(buildSectionQuery({ data: undefined }))

    const queryClient = createQueryClient()
    const { result } = renderHook(() => useBOMReferenceResource({ enabled: true }), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    })

    expect(result.current.status).toBe('error')
    if (result.current.status === 'error') {
      expect(result.current.scope).toBe('useBOMReferenceResource.sections')
      expect(result.current.error.message).toContain('Missing BOM reference sections query data')
      expect(failLoudlyMock).toHaveBeenCalledWith(result.current.error, 'useBOMReferenceResource.sections')
    }
  })
})
