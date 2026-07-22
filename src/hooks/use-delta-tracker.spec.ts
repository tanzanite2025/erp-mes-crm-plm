// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDeltaTracker } from './use-delta-tracker'

type Draft = {
  id: string
  name: string
}

describe('useDeltaTracker', () => {
  it('keeps reset stable across mutation-driven rerenders', () => {
    const initialData: Draft = { id: 'draft-1', name: '初始' }
    const { result } = renderHook(() => useDeltaTracker(initialData, true))
    const firstReset = result.current.reset

    act(() => {
      result.current.deltaProxy.name = '更新'
    })

    expect(result.current.reset).toBe(firstReset)
  })
})
