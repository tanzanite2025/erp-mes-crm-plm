// @vitest-environment jsdom
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApiClientError } from '@/lib/api-error'
import { useQuoteWorkspaceController } from '@/features/quotes/hooks/use-quote-workspace-controller'
import { useBusinessRecordSearchKeyword } from './use-business-record-search-keyword'
import { useCommandMenu } from './use-command-menu'

const searchTestState = vi.hoisted(() => ({
  open: true,
  routeSearch: {} as { search?: string },
  apiFetch: vi.fn(),
  navigate: vi.fn(),
  user: { id: 'search-user', permissions: ['menu_trading', 'menu_warehouse'] },
}))

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => searchTestState.navigate,
  useSearch: () => searchTestState.routeSearch,
}))
vi.mock('@/context/search-provider', () => ({
  useSearch: () => ({ open: searchTestState.open, setOpen: vi.fn() }),
}))
vi.mock('@/context/language-provider', () => {
  const translateSearchTestKey = (key: string) => key
  return { useLanguage: () => ({ t: translateSearchTestKey }) }
})
vi.mock('@/context/theme-provider', () => ({
  useTheme: () => ({ setTheme: vi.fn() }),
}))
vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    select: (state: { user: typeof searchTestState.user }) => unknown
  ) => select({ user: searchTestState.user }),
}))
vi.mock('@/lib/api-client', () => ({ apiFetch: searchTestState.apiFetch }))
vi.mock('./use-command-menu-knowledge', () => ({
  useCommandMenuKnowledge: () => ({
    knowledgeEntries: [],
    refreshKnowledgeEntries: vi.fn(),
    selectedKnowledgeEntry: null,
    setSelectedKnowledgeEntry: vi.fn(),
  }),
}))

function renderGlobalSearchControllerForRequestTests() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return renderHook(() => useCommandMenu(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  })
}

function createGlobalSearchResponseForRequestTests(id: string) {
  return {
    data: [
      {
        id,
        title: id,
        code: id,
        href: '/trading/sales-orders',
        parentTitle: 'Sales',
        category: 'sales-order',
      },
    ],
    hasMore: false,
    nextOffset: 1,
    generation: 'test-snapshot',
    candidateLimitReached: false,
  }
}

describe('global business search request lifecycle', () => {
  beforeEach(() => {
    searchTestState.open = true
    searchTestState.routeSearch = {}
    searchTestState.apiFetch.mockReset()
    searchTestState.apiFetch.mockResolvedValue({
      data: [],
      hasMore: false,
      nextOffset: 0,
      generation: 'test-snapshot',
      candidateLimitReached: false,
    })
  })
  afterEach(cleanup)

  it('exposes the candidate window notice without offering another page', async () => {
    searchTestState.apiFetch.mockResolvedValue({
      ...createGlobalSearchResponseForRequestTests('last-match'),
      candidateLimitReached: true,
      nextOffset: 100000,
    })
    const { result } = renderGlobalSearchControllerForRequestTests()
    act(() => result.current.setSearchValue('MAT'))
    await waitFor(() =>
      expect(result.current.businessSearchCandidateLimitReached).toBe(true)
    )
    expect(result.current.hasMoreBusinessResults).toBe(false)
  })

  it('encodes punctuation, supports a single Chinese character and pauses while closed', async () => {
    searchTestState.open = false
    const { result, rerender } = renderGlobalSearchControllerForRequestTests()
    act(() => result.current.setSearchValue(' A&B/#? '))
    await new Promise((resolve) => setTimeout(resolve, 350))
    expect(searchTestState.apiFetch).not.toHaveBeenCalled()
    searchTestState.open = true
    rerender()
    await waitFor(() =>
      expect(searchTestState.apiFetch).toHaveBeenCalledTimes(1)
    )
    expect(
      new URL(
        searchTestState.apiFetch.mock.calls[0][0],
        'https://search.test'
      ).searchParams.get('q')
    ).toBe('A&B/#?')
    act(() => result.current.setSearchValue('轮'))
    await waitFor(() =>
      expect(searchTestState.apiFetch).toHaveBeenCalledTimes(2)
    )
    expect(
      new URL(
        searchTestState.apiFetch.mock.calls[1][0],
        'https://search.test'
      ).searchParams.get('q')
    ).toBe('轮')
  })

  it('keeps the newest query results when an older request finishes later', async () => {
    let resolveOlderSearch: (value: unknown) => void = () => undefined
    searchTestState.apiFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOlderSearch = resolve
        })
    )
    const { result } = renderGlobalSearchControllerForRequestTests()
    act(() => result.current.setSearchValue('older-order'))
    await waitFor(() =>
      expect(searchTestState.apiFetch).toHaveBeenCalledTimes(1)
    )
    searchTestState.apiFetch.mockResolvedValueOnce(
      createGlobalSearchResponseForRequestTests('newer-order')
    )
    act(() => result.current.setSearchValue('newer-order'))
    expect(result.current.asyncResults).toEqual([])
    await waitFor(() =>
      expect(result.current.asyncResults[0]?.title).toBe('newer-order')
    )
    await act(async () =>
      resolveOlderSearch(
        createGlobalSearchResponseForRequestTests('older-order')
      )
    )
    expect(result.current.asyncResults[0]?.title).toBe('newer-order')
  })

  it('loads further result pages and reports request failures separately from no matches', async () => {
    searchTestState.apiFetch.mockResolvedValueOnce({
      ...createGlobalSearchResponseForRequestTests('first-page'),
      hasMore: true,
      nextOffset: 30,
      generation: 'first-snapshot',
    })
    const { result } = renderGlobalSearchControllerForRequestTests()
    act(() => result.current.setSearchValue('orders'))
    await waitFor(() =>
      expect(result.current.hasMoreBusinessResults).toBe(true)
    )
    searchTestState.apiFetch.mockResolvedValueOnce({
      ...createGlobalSearchResponseForRequestTests('second-page'),
      generation: 'first-snapshot',
    })
    await act(async () => {
      await result.current.loadMoreBusinessResults()
    })
    await waitFor(() =>
      expect(result.current.asyncResults.map((item) => item.title)).toEqual([
        'first-page',
        'second-page',
      ])
    )
    expect(searchTestState.apiFetch.mock.calls[1][0]).toContain('offset=30')
    expect(searchTestState.apiFetch.mock.calls[1][0]).toContain(
      'generation=first-snapshot'
    )
    searchTestState.apiFetch.mockRejectedValueOnce(
      new Error('business search unavailable')
    )
    act(() => result.current.setSearchValue('failed-search'))
    await waitFor(() => expect(result.current.searchError).toBe(true))
    expect(result.current.asyncResults).toEqual([])
  })

  it('restarts the complete result list when a later page belongs to an expired snapshot', async () => {
    searchTestState.apiFetch.mockResolvedValueOnce({
      ...createGlobalSearchResponseForRequestTests('old-page'),
      hasMore: true,
      nextOffset: 30,
      generation: 'old-snapshot',
    })
    const { result } = renderGlobalSearchControllerForRequestTests()
    act(() => result.current.setSearchValue('orders'))
    await waitFor(() =>
      expect(result.current.hasMoreBusinessResults).toBe(true)
    )
    searchTestState.apiFetch
      .mockRejectedValueOnce(
        createApiClientError({
          kind: 'http',
          status: 409,
          code: 'GLOBAL_SEARCH_SNAPSHOT_CHANGED',
          message: 'snapshot changed',
        })
      )
      .mockResolvedValueOnce(
        createGlobalSearchResponseForRequestTests('new-first-page')
      )
    await act(async () => {
      await result.current.loadMoreBusinessResults()
    })
    await waitFor(() =>
      expect(result.current.asyncResults.map((item) => item.title)).toEqual([
        'new-first-page',
      ])
    )
    expect(searchTestState.apiFetch.mock.calls[2][0]).toContain('offset=0')
    expect(searchTestState.apiFetch.mock.calls[2][0]).not.toContain(
      'generation='
    )
    expect(result.current.searchError).toBe(false)
  })

  it('cancels obsolete network requests when the keyword changes or the dialog closes', async () => {
    const capturedSignals: AbortSignal[] = []
    searchTestState.apiFetch.mockImplementation(
      (_endpoint: string, options: { signal: AbortSignal }) => {
        capturedSignals.push(options.signal)
        return new Promise((_resolve, reject) =>
          options.signal.addEventListener(
            'abort',
            () => reject(options.signal.reason),
            { once: true }
          )
        )
      }
    )
    const { result, rerender } = renderGlobalSearchControllerForRequestTests()
    act(() => result.current.setSearchValue('first-query'))
    await waitFor(() => expect(capturedSignals).toHaveLength(1))
    act(() => result.current.setSearchValue('second-query'))
    await waitFor(() => expect(capturedSignals[0].aborted).toBe(true))
    await waitFor(() => expect(capturedSignals).toHaveLength(2))
    searchTestState.open = false
    rerender()
    await waitFor(() => expect(capturedSignals[1].aborted).toBe(true))
    expect(result.current.searchError).toBe(false)
  })

  it('stops automatic snapshot restarts if the refreshed first page also conflicts', async () => {
    searchTestState.apiFetch.mockRejectedValue(
      createApiClientError({
        kind: 'http',
        status: 409,
        code: 'GLOBAL_SEARCH_SNAPSHOT_CHANGED',
        message: 'snapshot changes repeatedly',
      })
    )
    const { result } = renderGlobalSearchControllerForRequestTests()
    act(() => result.current.setSearchValue('busy-orders'))
    await waitFor(() =>
      expect(searchTestState.apiFetch).toHaveBeenCalledTimes(2)
    )
    await waitFor(() => expect(result.current.searchError).toBe(true))
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
    })
    expect(searchTestState.apiFetch).toHaveBeenCalledTimes(2)
  })

  it('retries a failed query without changing the keyword and clears old pages', async () => {
    searchTestState.apiFetch.mockRejectedValueOnce(
      new Error('search unavailable')
    )
    const { result } = renderGlobalSearchControllerForRequestTests()
    act(() => result.current.setSearchValue('orders'))
    await waitFor(() => expect(result.current.searchError).toBe(true))
    searchTestState.apiFetch.mockResolvedValueOnce(
      createGlobalSearchResponseForRequestTests('recovered-order')
    )
    await act(async () => {
      await result.current.retryBusinessSearch()
    })
    await waitFor(() =>
      expect(result.current.asyncResults[0]?.title).toBe('recovered-order')
    )
    expect(result.current.searchError).toBe(false)
    expect(searchTestState.apiFetch.mock.calls[1][0]).toContain('offset=0')
  })
})

describe('business record route keyword', () => {
  beforeEach(() => {
    searchTestState.navigate.mockReset()
    searchTestState.navigate.mockImplementation(({ search }) => {
      searchTestState.routeSearch = search(searchTestState.routeSearch)
      return Promise.resolve()
    })
  })
  afterEach(cleanup)
  it('applies destination keywords again when navigation targets an already open list', () => {
    searchTestState.routeSearch = { search: 'MAT-001' }
    const { result, rerender } = renderHook(() =>
      useBusinessRecordSearchKeyword()
    )
    expect(result.current[0]).toBe('MAT-001')
    act(() => result.current[1]('manual-filter'))
    rerender()
    expect(result.current[0]).toBe('manual-filter')
    expect(searchTestState.routeSearch.search).toBe('manual-filter')
    // Selecting the same original record now changes the URL again.
    searchTestState.routeSearch = { search: 'MAT-001' }
    rerender()
    expect(result.current[0]).toBe('MAT-001')
    searchTestState.routeSearch = { search: 'MAT-002' }
    rerender()
    expect(result.current[0]).toBe('MAT-002')
    searchTestState.routeSearch = { search: 'MAT-001' }
    rerender()
    expect(result.current[0]).toBe('MAT-001')
    act(() => result.current[1](''))
    rerender()
    expect(result.current[0]).toBe('')
    expect(searchTestState.routeSearch.search).toBeUndefined()
  })
})

describe('quote detail navigation from global search', () => {
  afterEach(cleanup)

  it('clears edits between records and closes or reopens details with route navigation', () => {
    const { result, rerender } = renderHook(
      ({ quoteId }: { quoteId?: string }) =>
        useQuoteWorkspaceController(quoteId),
      { initialProps: { quoteId: 'quote-a' } as { quoteId?: string } }
    )
    expect(result.current.selectedQuoteId).toBe('quote-a')
    expect(result.current.isDialogOpen).toBe(true)
    act(() => result.current.setEditedRequirements('draft for quote-a'))
    rerender({ quoteId: 'quote-b' })
    expect(result.current.selectedQuoteId).toBe('quote-b')
    expect(result.current.editedRequirements).toBe('')
    rerender({ quoteId: undefined })
    expect(result.current.isDialogOpen).toBe(false)
    rerender({ quoteId: 'quote-a' })
    expect(result.current.isDialogOpen).toBe(true)
    expect(result.current.selectedQuoteId).toBe('quote-a')
  })
})
