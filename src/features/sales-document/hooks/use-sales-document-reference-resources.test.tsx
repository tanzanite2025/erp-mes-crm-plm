// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createProductDraft } from '@/features/engineering/utils/default-builders'
import { useSalesDocumentReferenceResources } from './use-sales-document-reference-resources'

const {
  useGetCustomersMock,
  useGetProductsMock,
  useUnitsQueryMock,
  getProductAppearancesMock,
  getDrillingMock,
  getLabelingMock,
  getTemplatesMock,
  getProductTypesMock,
  getProductAttributeCategoriesMock,
  getProductAttributeOptionsMock,
  failLoudlyMock,
} = vi.hoisted(() => ({
  useGetCustomersMock: vi.fn(),
  useGetProductsMock: vi.fn(),
  useUnitsQueryMock: vi.fn(),
  getProductAppearancesMock: vi.fn(),
  getDrillingMock: vi.fn(),
  getLabelingMock: vi.fn(),
  getTemplatesMock: vi.fn(),
  getProductTypesMock: vi.fn(),
  getProductAttributeCategoriesMock: vi.fn(),
  getProductAttributeOptionsMock: vi.fn(),
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

vi.mock('@/features/trading/customer', () => ({
  useGetCustomers: useGetCustomersMock,
}))

vi.mock('@/features/engineering/hooks/use-products', () => ({
  useGetProducts: useGetProductsMock,
}))

vi.mock('@/features/basic-settings/hooks/use-units-query', () => ({
  useUnitsQuery: useUnitsQueryMock,
}))

vi.mock('@/features/engineering/services/product-appearance-service', () => ({
  productAppearanceService: {
    getProductAppearances: getProductAppearancesMock,
  },
}))

vi.mock('@/features/engineering-db/services/production-db-service', () => ({
  ProductionDBService: {
    getDrilling: getDrillingMock,
    getLabeling: getLabelingMock,
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

function buildHookQueryResult<T>(data: T, overrides: Record<string, unknown> = {}) {
  return {
    data,
    error: null,
    isPending: false,
    refetch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('useSalesDocumentReferenceResources', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useGetCustomersMock.mockReturnValue(buildHookQueryResult([
      {
        id: 'customer-1',
        name: 'Customer A',
      },
    ]))
    useUnitsQueryMock.mockReturnValue({
      readResource: {
        status: 'ready',
        data: [
          {
            id: 'unit-1',
            code: 'PCS',
            name: 'Piece',
            category: 'QUANTITY',
            precision: 0,
            status: 'active',
            isSystem: true,
          },
        ],
      },
      refetch: vi.fn().mockResolvedValue(undefined),
    })
    getProductAppearancesMock.mockResolvedValue([])
    getDrillingMock.mockResolvedValue([])
    getLabelingMock.mockResolvedValue([])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds productDisplayLabelMap from v2 authority projection without falling back to v1 labels', async () => {
    useGetProductsMock.mockReturnValue(buildHookQueryResult([
      createProductDraft({
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
      }),
      createProductDraft({
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
      }),
    ]))
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
      {
        id: 'category-brake',
        key: 'brakeType',
        nameZh: '制动类型',
        nameEn: 'Brake Type',
        sortOrder: 1,
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
      {
        id: 'option-brake',
        categoryKey: 'brakeType',
        value: 'disc',
        labelZh: '碟刹',
        labelEn: 'Disc',
        sortOrder: 1,
        active: true,
        version: 1,
      },
    ])

    const queryClient = createQueryClient()
    const { result } = renderHook(
      () => useSalesDocumentReferenceResources({ enabled: true, scope: 'SalesOrderActionDialog' }),
      {
        wrapper: createWrapper(queryClient),
      }
    )

    await waitFor(() => {
      expect(result.current.readResource.status).toBe('ready')
    })

    expect(result.current.resources.productDisplayLabelMap.get('product-1')).toBe('Road Rim (高刚性)')
    expect(result.current.resources.productDisplayLabelMap.get('product-2')).toBe('R50')
    expect(result.current.resources.productDisplayProjectionMap.get('product-1')).toMatchObject({
      title: 'Road Rim',
      summaryText: '高刚性',
      fullLabel: 'Road Rim (高刚性)',
      strategyVersion: 'product-display-v2',
    })
    expect(result.current.resources.productDisplayProjectionMap.get('product-2')).toMatchObject({
      title: 'R50',
      summaryText: '',
      fullLabel: 'R50',
      strategyVersion: 'product-display-v2',
    })
    expect(failLoudlyMock).not.toHaveBeenCalled()
  })
})
