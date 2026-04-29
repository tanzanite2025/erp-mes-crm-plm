// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BatchEnginePreviewDisplayState } from '../services/batch-engine-preview-display'
import { BatchEnginePreviewExplainabilityLinksCard } from './batch-engine-preview-explainability-links-card'

afterEach(() => {
  cleanup()
})

function buildDisplayState(mode: BatchEnginePreviewDisplayState['mode']): BatchEnginePreviewDisplayState {
  return {
    mode,
    selectedPlan: undefined,
    diffSummary: undefined,
  }
}

describe('BatchEnginePreviewExplainabilityLinksCard', () => {
  it('shows preview fallback text in local preview mode', () => {
    render(
      <BatchEnginePreviewExplainabilityLinksCard
        displayState={buildDisplayState('local-preview')}
        title='Break Slice 联动'
        emptyText='empty-text'
        previewText='preview-text'
        items={undefined}
        activeClassName='active-card'
        idleClassName='idle-card'
      />
    )

    expect(screen.getByText('preview-text')).not.toBeNull()
    expect(screen.queryByText('empty-text')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows empty state in solved plan mode when no items are available', () => {
    render(
      <BatchEnginePreviewExplainabilityLinksCard
        displayState={buildDisplayState('solved-plan')}
        title='Break Slice 联动'
        emptyText='empty-text'
        previewText='preview-text'
        items={[]}
        activeClassName='active-card'
        idleClassName='idle-card'
      />
    )

    expect(screen.getByText('empty-text')).not.toBeNull()
    expect(screen.queryByText('preview-text')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows solved items, applies active and idle classes, and triggers callbacks', async () => {
    const user = userEvent.setup()
    const onActiveClick = vi.fn()
    const onIdleClick = vi.fn()

    render(
      <BatchEnginePreviewExplainabilityLinksCard
        displayState={buildDisplayState('solved-plan')}
        title='Break Slice 联动'
        emptyText='empty-text'
        previewText='preview-text'
        items={[
          {
            key: 'slice-a',
            active: true,
            onClick: onActiveClick,
            content: <span>slice-a</span>,
          },
          {
            key: 'slice-b',
            active: false,
            onClick: onIdleClick,
            content: <span>slice-b</span>,
          },
        ]}
        activeClassName='active-card border-violet-300'
        idleClassName='idle-card border-slate-200'
      />
    )

    const activeButton = screen.getByRole('button', { name: 'slice-a' })
    const idleButton = screen.getByRole('button', { name: 'slice-b' })

    expect(activeButton.className).toContain('active-card')
    expect(idleButton.className).toContain('idle-card')
    expect(screen.queryByText('preview-text')).toBeNull()
    expect(screen.queryByText('empty-text')).toBeNull()

    await user.click(activeButton)
    await user.click(idleButton)

    expect(onActiveClick).toHaveBeenCalledTimes(1)
    expect(onIdleClick).toHaveBeenCalledTimes(1)
  })
})
