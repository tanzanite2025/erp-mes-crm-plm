// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { WeavingMode } from '../data/weaving-mode-schema'
import { useWeavingModeFilterState } from './use-weaving-mode-filter-state'

function buildWeavingMode(overrides: Partial<WeavingMode> = {}): WeavingMode {
  return {
    id: 'wm-1',
    code: 'ENGINEERING_MASTER_WEAVING_MODE_1_1',
    label: '1:1',
    ratioNumerator: 1,
    ratioDenominator: 1,
    normalizedRatioKey: '1:1',
    description: '',
    active: true,
    isSystemPreset: true,
    sortOrder: 1,
    version: 1,
    createdAt: '2026-04-22T00:00:00.000Z',
    ...overrides,
  }
}

describe('useWeavingModeFilterState', () => {
  it('returns original data when search term is empty', () => {
    const data = [buildWeavingMode(), buildWeavingMode({ id: 'wm-2', label: '2:1', normalizedRatioKey: '2:1' })]

    const { result } = renderHook(() => useWeavingModeFilterState(data))

    expect(result.current.searchTerm).toBe('')
    expect(result.current.filteredData).toEqual(data)
  })

  it('filters by label, normalized ratio key, description and source keywords', () => {
    const data = [
      buildWeavingMode({ id: 'wm-1', label: '1:1', normalizedRatioKey: '1:1', description: 'standard preset', isSystemPreset: true }),
      buildWeavingMode({ id: 'wm-2', label: '3:2', normalizedRatioKey: '3:2', description: 'custom sample', isSystemPreset: false, code: 'ENGINEERING_MASTER_WEAVING_MODE_3_2' }),
    ]

    const { result } = renderHook(() => useWeavingModeFilterState(data))

    act(() => {
      result.current.setSearchTerm('3:2')
    })
    expect(result.current.filteredData.map((item) => item.id)).toEqual(['wm-2'])

    act(() => {
      result.current.setSearchTerm('system preset')
    })
    expect(result.current.filteredData.map((item) => item.id)).toEqual(['wm-1'])

    act(() => {
      result.current.setSearchTerm('custom')
    })
    expect(result.current.filteredData.map((item) => item.id)).toEqual(['wm-2'])

    act(() => {
      result.current.setSearchTerm('sample')
    })
    expect(result.current.filteredData.map((item) => item.id)).toEqual(['wm-2'])
  })

  it('normalizes search term with trim and lowercase before filtering', () => {
    const data = [
      buildWeavingMode({ id: 'wm-1', label: 'Alpha', normalizedRatioKey: '1:1', description: 'Preset' }),
      buildWeavingMode({ id: 'wm-2', label: 'Beta', normalizedRatioKey: '2:1', description: 'Custom', isSystemPreset: false }),
    ]

    const { result } = renderHook(() => useWeavingModeFilterState(data))

    act(() => {
      result.current.setSearchTerm('  alpha  ')
    })
    expect(result.current.filteredData.map((item) => item.id)).toEqual(['wm-1'])

    act(() => {
      result.current.setSearchTerm('  PRESET ')
    })
    expect(result.current.filteredData.map((item) => item.id)).toEqual(['wm-1'])
  })
})
