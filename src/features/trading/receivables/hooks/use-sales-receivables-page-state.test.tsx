// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useSalesReceivablesPageState } from './use-sales-receivables-page-state'

describe('useSalesReceivablesPageState', () => {
  it('auto opens the first receivable when route search requests autoOpen', () => {
    const { result } = renderHook(() =>
      useSalesReceivablesPageState({
        sourceType: 'sales_order',
        sourceRefId: 'so-1',
        autoOpen: true,
        items: [{ id: 'receivable-1' }, { id: 'receivable-2' }],
      })
    )

    expect(result.current.activeReceivableId).toBe('receivable-1')
  })

  it('lets manual selection override auto-opened receivable', () => {
    const { result } = renderHook(() =>
      useSalesReceivablesPageState({
        sourceType: 'sales_order',
        sourceRefId: 'so-1',
        autoOpen: true,
        items: [{ id: 'receivable-1' }, { id: 'receivable-2' }],
      })
    )

    act(() => {
      result.current.handleSelectReceivable('receivable-2')
    })

    expect(result.current.activeReceivableId).toBe('receivable-2')
  })

  it('dismisses the current autoOpenKey after close and allows a new key to auto open again', () => {
    const { result, rerender } = renderHook(
      (props: { sourceType?: string; sourceRefId?: string; autoOpen?: boolean; items: Array<{ id: string }> }) =>
        useSalesReceivablesPageState(props),
      {
        initialProps: {
          sourceType: 'sales_order',
          sourceRefId: 'so-1',
          autoOpen: true,
          items: [{ id: 'receivable-1' }, { id: 'receivable-2' }],
        },
      }
    )

    act(() => {
      result.current.handleDetailOpenChange(false)
    })

    expect(result.current.activeReceivableId).toBe(null)

    rerender({
      sourceType: 'sales_order',
      sourceRefId: 'so-1',
      autoOpen: true,
      items: [{ id: 'receivable-1' }, { id: 'receivable-2' }],
    })

    expect(result.current.activeReceivableId).toBe(null)

    rerender({
      sourceType: 'sales_order',
      sourceRefId: 'so-2',
      autoOpen: true,
      items: [{ id: 'receivable-3' }],
    })

    expect(result.current.activeReceivableId).toBe('receivable-3')
  })
})
