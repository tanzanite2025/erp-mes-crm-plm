// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEngineeringDbProductDisplayOptions } from './use-engineering-db-product-display-options'

const { useProductDisplayOptionsMock } = vi.hoisted(() => ({
  useProductDisplayOptionsMock: vi.fn(),
}))

vi.mock('@/features/engineering/hooks/use-product-display-options', () => ({
  useProductDisplayOptions: useProductDisplayOptionsMock,
}))

describe('useEngineeringDbProductDisplayOptions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates to the shared authority product display options hook', () => {
    const sharedResult = {
      productOptions: [
        {
          label: 'Road Rim (高刚性)',
          value: 'product-rim',
        },
      ],
      productDisplayLabelMap: new Map([['product-rim', 'Road Rim (高刚性)']]),
      products: [],
      isLoading: false,
    }
    useProductDisplayOptionsMock.mockReturnValue(sharedResult)

    const { result } = renderHook(() => useEngineeringDbProductDisplayOptions({ enabled: true }))

    expect(useProductDisplayOptionsMock).toHaveBeenCalledWith({ enabled: true })
    expect(result.current).toBe(sharedResult)
  })
})
