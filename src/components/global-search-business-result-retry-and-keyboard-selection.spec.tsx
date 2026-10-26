// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CommandMenuView } from './command-menu-view'
import type { SearchItem } from './layout/data/search-data'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))
vi.mock('./command-menu-knowledge-detail-drawer', () => ({
  CommandMenuKnowledgeDetailDrawer: () => null,
}))
vi.mock('./command-menu-knowledge-tab', () => ({
  CommandMenuKnowledgeTab: () => null,
}))

function renderGlobalSearchViewForResultInteractionTests(
  options: {
    results?: SearchItem[]
    failed?: boolean
    searching?: boolean
    candidateLimitReached?: boolean
  } = {}
) {
  const selectResult = vi.fn()
  const retrySearch = vi.fn()
  const view = render(
    <CommandMenuView
      open
      onOpenChange={vi.fn()}
      searchValue='MAT-1'
      onSearchChange={vi.fn()}
      isSearching={options.searching ?? false}
      searchError={options.failed ?? false}
      businessSearchCandidateLimitReached={
        options.candidateLimitReached ?? false
      }
      onRetryBusinessSearch={retrySearch}
      groupedItems={{}}
      asyncResults={options.results ?? []}
      knowledgeEntries={[]}
      canCreateKnowledgeEntry={false}
      selectedKnowledgeEntry={null}
      onKnowledgeCreate={vi.fn()}
      onKnowledgeSelect={vi.fn()}
      onItemSelect={selectResult}
    />
  )
  return { ...view, selectResult, retrySearch }
}

describe('global search business result interactions', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class GlobalSearchTestResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('opens the second matching record when labels and codes are identical', async () => {
    const records: SearchItem[] = ['inventory-lot-a', 'inventory-lot-b'].map(
      (id) => ({
        id,
        title: '碳布',
        href: '/warehouse?search=MAT-1',
        category: 'data',
        parentTitle: '库存 (MAT-1)',
        keywords: ['碳布', 'MAT-1'],
      })
    )
    const { selectResult } = renderGlobalSearchViewForResultInteractionTests({
      results: records,
    })
    const options = await screen.findAllByRole('option')
    await waitFor(() =>
      expect(options[0]).toHaveAttribute('aria-selected', 'true')
    )
    expect(options[1]).toHaveAttribute('aria-selected', 'false')
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
    await waitFor(() =>
      expect(options[1]).toHaveAttribute('aria-selected', 'true')
    )
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
    expect(selectResult).toHaveBeenCalledExactlyOnceWith(records[1])
  })

  it('provides a retry action after a query fails', () => {
    const { retrySearch } = renderGlobalSearchViewForResultInteractionTests({
      failed: true,
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'commandMenu.searchFailed'
    )
    expect(screen.queryByText('commandMenu.empty')).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', { name: 'commandMenu.retrySearch' })
    )
    expect(retrySearch).toHaveBeenCalledOnce()
  })

  it('prevents another retry while recovery is running', () => {
    renderGlobalSearchViewForResultInteractionTests({
      failed: true,
      searching: true,
    })
    expect(
      screen.getByRole('button', { name: 'commandMenu.retrySearch' })
    ).toBeDisabled()
  })

  it('asks for narrower keywords when the candidate window is exhausted instead of showing no matches', () => {
    renderGlobalSearchViewForResultInteractionTests({
      candidateLimitReached: true,
    })
    expect(screen.getByRole('status')).toHaveTextContent(
      'commandMenu.narrowBusinessSearch'
    )
    expect(screen.queryByText('commandMenu.empty')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'commandMenu.loadMore' })
    ).not.toBeInTheDocument()
  })
})
