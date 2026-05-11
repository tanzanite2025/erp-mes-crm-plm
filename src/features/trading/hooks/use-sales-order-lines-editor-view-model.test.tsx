// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createProductDraft } from '@/features/engineering/utils/default-builders'
import { useSalesOrderLinesEditorViewModel } from './use-sales-order-lines-editor-view-model'

vi.mock('@/features/code-center/hooks/use-hole-code-source', () => ({
  useActiveHoleCodeSource: () => ({
    activeCounts: [],
  }),
}))

describe('useSalesOrderLinesEditorViewModel', () => {
  it('uses authority productDisplayLabelMap for product option labels', () => {
    const product = createProductDraft({
      id: 'product-1',
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
    })

    const { result } = renderHook(() => useSalesOrderLinesEditorViewModel({
      appearances: [],
      products: [product],
      productDisplayLabelMap: new Map([['product-1', 'R50']]),
      productDisplayProjectionMap: new Map([[
        'product-1',
        {
          title: 'R50',
          code: 'R50-01',
          summaryItems: [],
          summaryText: '高刚性',
          fullLabel: 'R50 (高刚性)',
          strategyVersion: 'product-display-v2',
        },
      ]]),
      units: [
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
      currency: 'CNY',
      onLineChange: vi.fn(),
    }))

    expect(result.current.productOptions).toEqual([
      {
        id: 'product-1',
        label: 'R50',
      },
    ])
  })
})
