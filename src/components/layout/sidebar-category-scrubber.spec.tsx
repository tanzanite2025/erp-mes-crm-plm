// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarProvider } from '@/components/ui/sidebar'
import { SidebarCategoryScrubber } from './sidebar-category-scrubber'
import type { NavGroup } from './types'

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

vi.mock('@tanstack/react-router', () => ({
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
]

function renderScrubber() {
  const navViewportRef = {
    current: document.createElement('div'),
  }

  return render(
    <SidebarProvider>
      <SidebarCategoryScrubber
        navGroups={navGroups}
        navViewportRef={navViewportRef}
        pinnedCategoryId='production'
      />
    </SidebarProvider>
  )
}

describe('SidebarCategoryScrubber', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(0), 0)
    )
    vi.stubGlobal('cancelAnimationFrame', (handle: number) =>
      window.clearTimeout(handle)
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('opens the floating preview from a pinned sidebar category without making category rows links', async () => {
    renderScrubber()

    expect(
      await screen.findByRole('dialog', { name: 'Production快捷导航' })
    ).not.toBeNull()
    expect(screen.queryByRole('link', { name: 'APS' })).toBeNull()
    expect(screen.getByText('APS')).not.toBeNull()
    expect(
      screen.getByRole('link', { name: 'Queue' }).getAttribute('href')
    ).toBe('/aps/queue')
  })
})
