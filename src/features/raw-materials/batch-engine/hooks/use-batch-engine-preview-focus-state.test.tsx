// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useBatchEnginePreviewFocusState } from './use-batch-engine-preview-focus-state'

describe('useBatchEnginePreviewFocusState', () => {
  it('opens from home target, supports in-preview switch, and clears focus after close', () => {
    const { result } = renderHook(() => useBatchEnginePreviewFocusState())

    act(() => {
      result.current.openExplainabilityTarget({ targetId: 'slice-1', targetKind: 'break-slice' })
    })

    expect(result.current.previewOpen).toBe(true)
    expect(result.current.selectedExplainabilityTargetId).toBe('slice-1')
    expect(result.current.selectedExplainabilityTargetKind).toBe('break-slice')
    expect(result.current.selectedExplainabilityTargetSource).toBe('home-entry')

    act(() => {
      result.current.selectExplainabilityTarget('cluster-a', 'zone-cluster')
    })

    expect(result.current.selectedExplainabilityTargetId).toBe('cluster-a')
    expect(result.current.selectedExplainabilityTargetKind).toBe('zone-cluster')
    expect(result.current.selectedExplainabilityTargetSource).toBe('preview-switch')

    act(() => {
      result.current.handlePreviewOpenChange(false)
    })

    expect(result.current.previewOpen).toBe(false)
    expect(result.current.selectedExplainabilityTargetId).toBe('')
    expect(result.current.selectedExplainabilityTargetKind).toBe('')
    expect(result.current.selectedExplainabilityTargetSource).toBe('')
  })

  it('opens preview without inheriting stale explainability focus', () => {
    const { result } = renderHook(() => useBatchEnginePreviewFocusState())

    act(() => {
      result.current.openExplainabilityTarget({ targetId: 'slice-1', targetKind: 'break-slice' })
    })

    act(() => {
      result.current.openPreview()
    })

    expect(result.current.previewOpen).toBe(true)
    expect(result.current.selectedExplainabilityTargetId).toBe('')
    expect(result.current.selectedExplainabilityTargetKind).toBe('')
    expect(result.current.selectedExplainabilityTargetSource).toBe('')
  })
})
