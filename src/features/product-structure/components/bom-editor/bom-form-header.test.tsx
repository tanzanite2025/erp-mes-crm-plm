// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { selectDropdownMock } = vi.hoisted(() => ({
  selectDropdownMock: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'zh-CN',
  }),
}))

vi.mock('@/components/ui/form', () => ({
  FormControl: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FormField: ({ render, name }: { render: (params: { field: Record<string, unknown> }) => ReactNode; name: string }) =>
    render({ field: { value: '', onChange: vi.fn(), onBlur: vi.fn(), name, ref: vi.fn() } }),
  FormItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  FormLabel: ({ children }: { children: ReactNode }) => <label>{children}</label>,
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) => <input {...props} />,
}))

vi.mock('@/components/select-dropdown', () => ({
  SelectDropdown: (props: unknown) => {
    selectDropdownMock(props)
    return <div data-testid='select-dropdown' />
  },
}))

import { BOMFormHeader } from './bom-form-header'

describe('BOMFormHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the precomputed product display label map for product select items', () => {
    render(
      <BOMFormHeader
        form={{ control: {} } as never}
        products={[
          {
            id: 'product-1',
            name: 'Road Rim',
            sku: 'RR-01',
            modelCode: 'RR-01',
          } as never,
        ]}
        productDisplayLabelMap={new Map([['product-1', 'Road Rim (高刚性)']])}
        isEdit={false}
      />,
    )

    expect(selectDropdownMock.mock.calls).toEqual(
      expect.arrayContaining([
        [
          expect.objectContaining({
            items: [
              {
                label: 'Road Rim (高刚性)',
                value: 'product-1',
              },
            ],
          }),
        ],
      ]),
    )
  })

  it('does not rebuild legacy product labels locally when the authority label map has no entry', () => {
    render(
      <BOMFormHeader
        form={{ control: {} } as never}
        products={[
          {
            id: 'product-1',
            name: 'Road Rim',
            sku: 'RR-01',
            modelCode: 'RR-01',
          } as never,
        ]}
        productDisplayLabelMap={new Map()}
        isEdit={false}
      />,
    )

    expect(selectDropdownMock.mock.calls).toEqual(
      expect.arrayContaining([
        [
          expect.objectContaining({
            items: [
              {
                label: '',
                value: 'product-1',
              },
            ],
          }),
        ],
      ]),
    )
  })
})
