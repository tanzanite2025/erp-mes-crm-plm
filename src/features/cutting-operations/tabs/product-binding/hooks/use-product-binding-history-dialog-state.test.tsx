// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  useProductBindingHistoryQueryMock,
  useProductBindingHistoryCountQueryMock,
} = vi.hoisted(() => ({
  useProductBindingHistoryQueryMock: vi.fn(),
  useProductBindingHistoryCountQueryMock: vi.fn(),
}))

vi.mock('./use-product-binding-history-query', () => ({
  useProductBindingHistoryQuery: useProductBindingHistoryQueryMock,
  useProductBindingHistoryCountQuery: useProductBindingHistoryCountQueryMock,
}))

import { useProductBindingHistoryDialogState } from './use-product-binding-history-dialog-state'

describe('useProductBindingHistoryDialogState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useProductBindingHistoryQueryMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    })
    useProductBindingHistoryCountQueryMock.mockReturnValue({
      data: 5,
    })
  })

  it('prefetches count only while dialog is closed when renderTrigger exists', () => {
    const { result } = renderHook(() =>
      useProductBindingHistoryDialogState({
        defaultFilters: { productBarcode: 'PROD-1' },
        hasRenderTrigger: true,
      })
    )

    expect(useProductBindingHistoryQueryMock).toHaveBeenCalledWith(
      { productBarcode: 'PROD-1' },
      { enabled: false }
    )
    expect(useProductBindingHistoryCountQueryMock).toHaveBeenCalledWith(
      { productBarcode: 'PROD-1' },
      { enabled: true }
    )
    expect(result.current.recordCount).toBe(5)
    expect(result.current.open).toBe(false)
  })

  it('switches to list query and uses total after dialog opens', () => {
    useProductBindingHistoryQueryMock.mockReturnValue({
      data: { items: [], total: 9 },
      isLoading: false,
      error: null,
    })
    useProductBindingHistoryCountQueryMock.mockReturnValue({
      data: 2,
    })

    const { result, rerender } = renderHook(() =>
      useProductBindingHistoryDialogState({
        defaultFilters: { prepregQrCode: 'qr-1' },
        hasRenderTrigger: true,
      })
    )

    act(() => {
      result.current.setOpen(true)
    })
    rerender()

    expect(useProductBindingHistoryQueryMock).toHaveBeenLastCalledWith(
      { prepregQrCode: 'qr-1' },
      { enabled: true }
    )
    expect(useProductBindingHistoryCountQueryMock).toHaveBeenLastCalledWith(
      { prepregQrCode: 'qr-1' },
      { enabled: false }
    )
    expect(result.current.recordCount).toBe(9)
    expect(result.current.open).toBe(true)
  })

  it('respects prefetchRecordCount=false when no trigger prefetch is desired', () => {
    renderHook(() =>
      useProductBindingHistoryDialogState({
        defaultFilters: { productBarcode: 'PROD-2' },
        prefetchRecordCount: false,
        hasRenderTrigger: false,
      })
    )

    expect(useProductBindingHistoryCountQueryMock).toHaveBeenCalledWith(
      { productBarcode: 'PROD-2' },
      { enabled: false }
    )
  })
})
