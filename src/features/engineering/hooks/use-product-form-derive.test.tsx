// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProductDraft } from '../utils/default-builders'
import { useProductFormDerive } from './use-product-form-derive'
import { ProductCoreService } from '../services/product-core-service'
import type {
  Product,
  ProductAttributeCategory,
  ProductAttributeOption,
  ProductTemplate,
  ProductType,
} from '../data/schema'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: string) => key,
  }),
}))

vi.mock('../services/product-core-service', () => ({
  ProductCoreService: {
    getNextCode: vi.fn(async () => '01'),
  },
}))

const getNextCodeMock = vi.mocked(ProductCoreService.getNextCode)

function buildProductTypes(): ProductType[] {
  return [
    {
      id: 'type-rim',
      name: 'Rim',
      code: 'RIM',
      templateId: 'template-rim',
      active: true,
      sortOrder: 0,
      version: 1,
    },
  ]
}

function buildTemplate(): ProductTemplate {
  return {
    id: 'template-rim',
    name: '车圈规格',
    code: 'RIM_TEMPLATE',
    componentKey: 'RIM',
    description: '',
    active: true,
    attributeBindings: [
      {
        id: 'binding-series',
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
  }
}

function buildAttributeCategories(): ProductAttributeCategory[] {
  return [
    {
      id: 'category-series',
      key: 'techSeries',
      nameZh: '工艺系列',
      nameEn: 'Tech Series',
      active: true,
      sortOrder: 0,
      version: 1,
    },
  ]
}

function buildAttributeOptions(): ProductAttributeOption[] {
  return [
    {
      id: 'option-series-high-tg',
      categoryKey: 'techSeries',
      value: 'high-tg',
      labelZh: '高刚性',
      labelEn: 'High TG',
      active: true,
      sortOrder: 0,
      version: 1,
    },
  ]
}

describe('useProductFormDerive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the v2 base projection when no preview template is available', () => {
    const { result } = renderHook(() => {
      const form = useForm<Product>({
        defaultValues: createProductDraft({
          id: 'product-r50',
          typeId: 'type-rim',
          sku: 'R50-01',
          name: 'R50',
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
      })

      return useProductFormDerive({
        isEdit: true,
        open: true,
        form,
        previewTemplate: null,
        attributeCategories: [],
        attributeOptions: [],
        productTypes: buildProductTypes(),
      })
    })

    expect(getNextCodeMock).not.toHaveBeenCalled()
    expect(result.current.specPreviewTitle).toBe('R50')
    expect(result.current.specPreviewSummary).toBe('R50')
    expect(result.current.specPreviewV2?.fullLabel).toBe('R50')
    expect(result.current.specPreviewV2?.summaryItems).toEqual([])
  })

  it('uses the template-driven v2 projection when preview template metadata is available', () => {
    const template = buildTemplate()
    const attributeCategories = buildAttributeCategories()
    const attributeOptions = buildAttributeOptions()

    const { result } = renderHook(() => {
      const form = useForm<Product>({
        defaultValues: createProductDraft({
          id: 'product-rim',
          typeId: 'type-rim',
          sku: 'RR-01',
          name: 'Road Rim',
          attributeValues: [
            {
              categoryKey: 'techSeries',
              optionValue: 'high-tg',
              sortOrder: 0,
              version: 1,
            },
          ],
        }),
      })

      return useProductFormDerive({
        isEdit: true,
        open: true,
        form,
        previewTemplate: template,
        attributeCategories,
        attributeOptions,
        productTypes: buildProductTypes(),
      })
    })

    expect(result.current.specPreviewTitle).toBe('Road Rim')
    expect(result.current.specPreviewSummary).toBe('Road Rim (高刚性)')
    expect(result.current.specPreviewV2?.fullLabel).toBe('Road Rim (高刚性)')
    expect(result.current.specPreviewV2?.summaryItems).toEqual([
      {
        key: 'techseries',
        label: '工艺系列',
        value: '高刚性',
        empty: false,
      },
    ])
  })
})
