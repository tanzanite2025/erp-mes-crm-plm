// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProductDraft } from '@/features/engineering/utils/default-builders'
import { useProductDisplayOptions } from './use-product-display-options'

const { useGetProductsMock, useQueryMock } = vi.hoisted(() => ({
  useGetProductsMock: vi.fn(),
  useQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: string) => key,
  }),
}))

vi.mock('./use-products', () => ({
  useGetProducts: useGetProductsMock,
}))

describe('useProductDisplayOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds authority v2 fullLabel options when metadata is available', () => {
    useGetProductsMock.mockReturnValue({
      data: [
        createProductDraft({
          id: 'product-rim',
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
      ],
      isPending: false,
    })
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: readonly unknown[] }) => {
      const key = queryKey[1]

      if (key === 'productTemplates') {
        return {
          data: [
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
          ],
          isPending: false,
        }
      }

      if (key === 'productTypes') {
        return {
          data: [
            {
              id: 'type-rim',
              name: 'Rim',
              code: 'RIM',
              templateId: 'template-rim',
              active: true,
              sortOrder: 0,
              version: 1,
            },
          ],
          isPending: false,
        }
      }

      if (key === 'productAttributeCategories') {
        return {
          data: [
            {
              id: 'category-series',
              key: 'techSeries',
              nameZh: '工艺系列',
              nameEn: 'Series',
              sortOrder: 0,
              active: true,
              version: 1,
            },
          ],
          isPending: false,
        }
      }

      if (key === 'productAttributeOptions') {
        return {
          data: [
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
          ],
          isPending: false,
        }
      }

      return {
        data: undefined,
        isPending: false,
      }
    })

    const { result } = renderHook(() => useProductDisplayOptions({ enabled: true }))

    expect(result.current.productOptions).toEqual([
      {
        label: 'Road Rim (高刚性)',
        value: 'product-rim',
      },
    ])
    expect(result.current.productDisplayLabelMap.get('product-rim')).toBe('Road Rim (高刚性)')
    expect(result.current.isLoading).toBe(false)
  })

  it('falls back to stable v2 title when metadata is unavailable', () => {
    useGetProductsMock.mockReturnValue({
      data: [
        createProductDraft({
          id: 'product-r50',
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
      ],
      isPending: false,
    })
    useQueryMock.mockReturnValue({
      data: undefined,
      isPending: false,
    })

    const { result } = renderHook(() => useProductDisplayOptions({ enabled: true }))

    expect(result.current.productOptions).toEqual([
      {
        label: 'R50',
        value: 'product-r50',
      },
    ])
    expect(result.current.productDisplayLabelMap.get('product-r50')).toBe('R50')
  })
})
