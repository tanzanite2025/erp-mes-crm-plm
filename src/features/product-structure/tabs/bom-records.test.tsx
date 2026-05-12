// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BOMRecordsTab } from './bom-records'

const { bomVersionTraceContentMock, useBOMReadDataMock } = vi.hoisted(() => ({
  bomVersionTraceContentMock: vi.fn(),
  useBOMReadDataMock: vi.fn(),
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    locale: 'zh-CN',
    t: (key: string) => key,
  }),
}))

vi.mock('../hooks/use-bom-read-data', () => ({
  useBOMReadData: useBOMReadDataMock,
}))

vi.mock('../version-trace/components/bom-version-trace-content', () => ({
  BOMVersionTraceContent: (props: unknown) => {
    bomVersionTraceContentMock(props)
    return <div data-testid='bom-version-trace-content' />
  },
}))

describe('BOMRecordsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useBOMReadDataMock.mockReturnValue({
      status: 'ready',
      data: [
        {
          id: 'bom-1',
          bomNo: 'BOM-001',
          productId: 'product-1',
        },
      ],
      products: [
        {
          id: 'product-1',
          name: 'Trail',
          sku: 'TR-01',
        },
      ],
      productDisplayLabelMap: new Map([['product-1', 'Trail / TR-01']]),
      materials: [],
      sections: [],
    })
  })

  it('renders the aggregated trace workspace and keeps content in always-open mode', () => {
    render(<BOMRecordsTab />)

    expect(screen.getByText('engineering.bomRecords.header.title')).toBeTruthy()
    expect(screen.getByText('engineering.bomRecords.header.description')).toBeTruthy()
    expect(screen.getByText('最小筛选')).toBeTruthy()
    expect(screen.getByText('按产品')).toBeTruthy()
    expect(screen.getByText('按 BOM')).toBeTruthy()
    expect(screen.getAllByTestId('bom-trace-created-from').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('bom-trace-created-to').length).toBeGreaterThan(0)
    expect(screen.getByTestId('bom-version-trace-content')).toBeTruthy()
    expect(bomVersionTraceContentMock).toHaveBeenCalledWith(
      expect.objectContaining({
        open: true,
        className: 'h-full',
      })
    )
  })

  it('passes date filters to the shared trace workspace and supports reset', () => {
    render(<BOMRecordsTab />)

    const createdFromInput = screen.getAllByTestId('bom-trace-created-from')[0]
    const createdToInput = screen.getAllByTestId('bom-trace-created-to')[0]

    fireEvent.change(createdFromInput, {
      target: { value: '2026-05-12' },
    })
    fireEvent.change(createdToInput, {
      target: { value: '2026-05-13' },
    })

    expect(bomVersionTraceContentMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        createdFrom: '2026-05-12',
        createdTo: '2026-05-13',
      })
    )

    fireEvent.click(screen.getAllByText('清空筛选')[0])

    expect(bomVersionTraceContentMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        createdFrom: undefined,
        createdTo: undefined,
        productId: undefined,
        bomId: undefined,
      })
    )
  })
})
