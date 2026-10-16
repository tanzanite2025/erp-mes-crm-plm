// @vitest-environment jsdom
import { useRef, useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarProvider } from '@/components/ui/sidebar'
import { NavGroup as SidebarNavigationGroup } from './nav-group'
import { SidebarCategoryScrubber } from './sidebar-category-scrubber'
import type { NavGroup } from './types'

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

vi.mock('@tanstack/react-router', () => ({
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => unknown
  }) => select({ pathname: '/aps/queue' }),
  Link: ({
    children,
    to,
    ...props
  }: React.ComponentProps<'a'> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: React.ComponentProps<'div'> & {
      initial?: unknown
      animate?: unknown
      exit?: unknown
      transition?: unknown
    }) => <div {...props}>{children}</div>,
    span: ({
      initial: _initial,
      animate: _animate,
      transition: _transition,
      ...props
    }: React.ComponentProps<'span'> & {
      initial?: unknown
      animate?: unknown
      transition?: unknown
    }) => <span {...props} />,
  },
  useReducedMotion: () => false,
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (
    selector: (state: { user: null; isIdentitySynced: boolean }) => unknown
  ) => selector({ user: null, isIdentitySynced: false }),
}))

vi.mock('./sidebar-tab-preview-registry', () => ({
  resolveSidebarNodeTabPreviews: () => [
    {
      key: 'queue',
      label: 'Queue',
      href: '/aps/queue',
    },
  ],
}))

const navGroups: NavGroup[] = [
  {
    id: 'production',
    title: 'Production',
    children: [
      {
        id: 'planning',
        title: 'Planning',
        children: [
          {
            id: 'aps',
            title: 'APS',
            url: '/aps',
          },
        ],
      },
    ],
  },
  {
    id: 'warehouse',
    title: 'Warehouse',
    children: [{ id: 'inbound', title: 'Inbound', url: '/warehouse/inbound' }],
  },
]

function SidebarCategoryHoverPreviewTestLayout() {
  const navViewportRef = useRef<HTMLDivElement>(null)
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)

  return (
    <SidebarProvider>
      <div ref={navViewportRef} data-testid='sidebar-navigation-viewport'>
        {navGroups.map((group) => (
          <SidebarNavigationGroup
            key={group.id}
            {...group}
            onDesktopCategoryActivate={setActiveCategoryId}
            selectedCategoryId={activeCategoryId}
          />
        ))}
      </div>
      <SidebarCategoryScrubber
        navGroups={navGroups}
        navViewportRef={navViewportRef}
        activeCategoryId={activeCategoryId}
        onActiveCategoryChange={setActiveCategoryId}
      />
    </SidebarProvider>
  )
}

function renderSidebarCategoryHoverPreview() {
  return render(<SidebarCategoryHoverPreviewTestLayout />)
}

describe('SidebarCategoryScrubber', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('opens on hover with a backdrop while category rows remain labels and tabs remain links', () => {
    renderSidebarCategoryHoverPreview()

    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Production' }))

    expect(
      screen.getByRole('dialog', { name: 'Production快捷导航' })
    ).not.toBeNull()
    expect(
      document.querySelector('[data-sidebar-category-backdrop]')
    ).not.toBeNull()
    expect(screen.queryByRole('link', { name: 'APS' })).toBeNull()
    expect(screen.getByText('APS')).not.toBeNull()
    expect(
      screen.getByRole('link', { name: 'Queue' }).getAttribute('href')
    ).toBe('/aps/queue')
  })

  it('closes the preview and backdrop only after the pointer has left for two seconds', () => {
    renderSidebarCategoryHoverPreview()
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Production' }))
    fireEvent.pointerLeave(screen.getByTestId('sidebar-navigation-viewport'))

    act(() => vi.advanceTimersByTime(1999))
    expect(screen.queryByRole('dialog')).not.toBeNull()

    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(
      document.querySelector('[data-sidebar-category-backdrop]')
    ).toBeNull()
  })

  it('keeps the preview open across the gap and while moving among its contents', () => {
    renderSidebarCategoryHoverPreview()
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Production' }))
    fireEvent.pointerLeave(screen.getByTestId('sidebar-navigation-viewport'))
    act(() => vi.advanceTimersByTime(1500))

    fireEvent.pointerEnter(screen.getByRole('dialog'))
    fireEvent.pointerEnter(screen.getByText('APS'))
    fireEvent.pointerEnter(screen.getByRole('link', { name: 'Queue' }))
    act(() => vi.advanceTimersByTime(5000))
    expect(screen.queryByRole('dialog')).not.toBeNull()

    fireEvent.pointerLeave(screen.getByRole('dialog'))
    act(() => vi.advanceTimersByTime(1999))
    expect(screen.queryByRole('dialog')).not.toBeNull()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('cancels closing when returning to menu whitespace and when hovering another category', () => {
    renderSidebarCategoryHoverPreview()
    const viewport = screen.getByTestId('sidebar-navigation-viewport')
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Production' }))
    fireEvent.pointerLeave(viewport)
    act(() => vi.advanceTimersByTime(1500))

    fireEvent.pointerEnter(viewport)
    act(() => vi.advanceTimersByTime(5000))
    expect(
      screen.queryByRole('dialog', { name: 'Production快捷导航' })
    ).not.toBeNull()

    fireEvent.pointerLeave(viewport)
    act(() => vi.advanceTimersByTime(1500))
    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Warehouse' }))
    act(() => vi.advanceTimersByTime(5000))
    expect(
      screen.queryByRole('dialog', { name: 'Warehouse快捷导航' })
    ).not.toBeNull()
    expect(
      screen.queryByRole('dialog', { name: 'Production快捷导航' })
    ).toBeNull()
  })

  it('keeps a hovered category open when clicked and closes immediately with Escape', () => {
    renderSidebarCategoryHoverPreview()
    const categoryButton = screen.getByRole('button', { name: 'Production' })
    fireEvent.pointerEnter(categoryButton)
    fireEvent.click(categoryButton)
    expect(screen.queryByRole('dialog')).not.toBeNull()
    expect(categoryButton.getAttribute('aria-expanded')).toBe('true')

    fireEvent.keyDown(categoryButton, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(categoryButton.getAttribute('aria-expanded')).toBe('false')
  })

  it('closes immediately when clicking the backdrop or the close button', () => {
    renderSidebarCategoryHoverPreview()
    const categoryButton = screen.getByRole('button', { name: 'Production' })
    fireEvent.pointerEnter(categoryButton)
    fireEvent.pointerDown(
      document.querySelector('[data-sidebar-category-backdrop]')!
    )
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(categoryButton)
    fireEvent.click(screen.getByRole('button', { name: '关闭快捷导航' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('positions the backdrop to the right of the sidebar, below the preview', () => {
    renderSidebarCategoryHoverPreview()
    vi.spyOn(
      screen.getByTestId('sidebar-navigation-viewport'),
      'getBoundingClientRect'
    ).mockReturnValue({ right: 240 } as DOMRect)

    fireEvent.pointerEnter(screen.getByRole('button', { name: 'Production' }))
    const backdrop = document.querySelector<HTMLElement>(
      '[data-sidebar-category-backdrop]'
    )!
    expect(backdrop.style.left).toBe('240px')
    expect(screen.getByRole('dialog').style.left).toBe('252px')
  })

  it('ignores touch hover and clears a pending close timer on unmount', () => {
    const { unmount } = renderSidebarCategoryHoverPreview()
    const categoryButton = screen.getByRole('button', { name: 'Production' })
    fireEvent.pointerEnter(categoryButton, { pointerType: 'touch' })
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.pointerEnter(categoryButton, { pointerType: 'mouse' })
    fireEvent.pointerLeave(screen.getByTestId('sidebar-navigation-viewport'))
    expect(vi.getTimerCount()).toBeGreaterThan(0)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
