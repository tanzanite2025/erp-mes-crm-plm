// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { selectDropdownMock, useQueryMock } = vi.hoisted(() => ({
  selectDropdownMock: vi.fn(),
  useQueryMock: vi.fn(),
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'zh-CN',
  }),
}))

vi.mock('@/components/select-dropdown', () => ({
  SelectDropdown: (props: unknown) => {
    selectDropdownMock(props)
    return <div data-testid='select-dropdown' />
  },
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/features/engineering/hooks/use-products', () => ({
  useGetProducts: () => ({
    data: [
      {
        id: 'product-rim',
        sku: 'RR-01',
        name: 'Road Rim',
        modelCode: '01',
        typeId: 'type-rim',
        weight: 123,
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
    ],
    isLoading: false,
  }),
}))

vi.mock('@/features/production-shared/hooks/use-production-resources', () => ({
  useProductionLinesQuery: () => ({
    data: [],
    isLoading: false,
  }),
}))

vi.mock('@/features/production-shared/tabs/hierarchy-config/hooks/use-hierarchy-level-labels', () => ({
  useHierarchyLevelLabels: () => ({
    level1Name: '产线',
    level2Name: '工段',
    level3Name: '工序',
  }),
}))

import { ControlledProtocolDialog } from './controlled-protocol-dialog'

describe('ControlledProtocolDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
          isLoading: false,
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
          isLoading: false,
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
          isLoading: false,
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
          isLoading: false,
        }
      }

      return {
        data: undefined,
        isLoading: false,
      }
    })
  })

  it('uses product-display-v2 labels for product dropdown items while preserving weight suffix', () => {
    render(
      <ControlledProtocolDialog
        open
        onOpenChange={vi.fn()}
      />,
    )

    expect(selectDropdownMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        items: [
          {
            label: 'Road Rim (高刚性) | 123g',
            value: 'product-rim',
          },
        ],
      }),
    )
  })

  it('uses the v2 base projection instead of falling back to v1 when metadata is unavailable', () => {
    useQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
    })

    render(
      <ControlledProtocolDialog
        open
        onOpenChange={vi.fn()}
      />,
    )

    expect(selectDropdownMock.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        items: [
          {
            label: 'Road Rim | 123g',
            value: 'product-rim',
          },
        ],
      }),
    )
  })
})
