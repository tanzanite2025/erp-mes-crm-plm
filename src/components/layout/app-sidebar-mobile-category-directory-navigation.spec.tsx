// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'

const mobileSidebarTestState = vi.hoisted(() => ({
  isMobile: true,
  isNarrowMobile: false,
  pathname: '/aps',
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: (breakpoint = 768) =>
    breakpoint === 375
      ? mobileSidebarTestState.isNarrowMobile
      : mobileSidebarTestState.isMobile,
}))

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))

vi.mock('@/context/layout-provider', () => ({
  useLayout: () => ({ collapsible: 'icon', variant: 'sidebar' }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    onClick,
    to,
    ...props
  }: React.ComponentProps<'a'> & {
    to: string
  }) => (
    <a
      href={to}
      {...props}
      onClick={(event) => {
        event.preventDefault()
        onClick?.(event)
      }}
    >
      {children}
    </a>
  ),
  useLocation: ({
    select,
  }: {
    select: (location: { pathname: string }) => string
  }) => select({ pathname: mobileSidebarTestState.pathname }),
  useNavigate: () => vi.fn(),
}))

vi.mock('@/features/basic-settings/services/enterprise-service', () => ({
  DEFAULT_ENTERPRISE_LOGO_URL: '',
  EnterpriseService: { getConfig: vi.fn().mockResolvedValue(null) },
}))

vi.mock('./sidebar-navigation-model', () => ({
  useSidebarNavigationModel: () => ({
    sidebarData: {
      teams: [{ name: 'Workspace', plan: 'Operations' }],
    },
    renderedNavGroups: [
      {
        id: 'production',
        title: 'Production',
        children: [{ id: 'aps', title: 'APS', url: '/aps' }],
      },
      {
        id: 'quality',
        title: 'Quality',
        children: [{ id: 'checks', title: 'Checks', url: '/quality' }],
      },
    ],
    categoryDirectories: [
      {
        id: 'production',
        title: 'Production',
        sections: [],
        directLinks: [
          { id: 'aps', title: 'APS schedule', url: '/aps', tabs: [] },
        ],
        linkCount: 1,
      },
      {
        id: 'quality',
        title: 'Quality',
        sections: [],
        directLinks: [
          { id: 'checks', title: 'Quality checks', url: '/quality', tabs: [] },
        ],
        linkCount: 1,
      },
    ],
  }),
}))

vi.mock('./use-sidebar-active-center', () => ({
  useSidebarActiveCenter: vi.fn(),
}))

function MobileSidebarOpenState() {
  const { openMobile } = useSidebar()
  return <output data-testid='mobile-sidebar-open'>{String(openMobile)}</output>
}

function renderMobileSidebar() {
  return render(
    <SidebarProvider>
      <SidebarTrigger />
      <MobileSidebarOpenState />
      <AppSidebar />
    </SidebarProvider>
  )
}

describe('mobile sidebar category and directory navigation', () => {
  afterEach(cleanup)

  beforeEach(() => {
    mobileSidebarTestState.isMobile = true
    mobileSidebarTestState.isNarrowMobile = false
    mobileSidebarTestState.pathname = '/aps'
  })

  it('shows the selected category directory beside the category list on wider phones', () => {
    renderMobileSidebar()
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))

    expect(
      screen.getByRole('navigation', { name: 'Production' })
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Quality' }))

    expect(
      screen.getByRole('navigation', { name: 'Quality' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Quality' })
    ).not.toBeInTheDocument()
  })

  it('drills into the directory on narrow phones and closes after destination selection', () => {
    mobileSidebarTestState.isNarrowMobile = true
    renderMobileSidebar()
    fireEvent.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))
    const navigationColumns = document.querySelector(
      '.sidebar-navigation-columns'
    )

    expect(navigationColumns).toHaveAttribute(
      'data-mobile-directory-open',
      'false'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Quality' }))

    expect(navigationColumns).toHaveAttribute(
      'data-mobile-directory-open',
      'true'
    )
    expect(screen.getByRole('heading', { name: 'Quality' })).toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', {
        name: 'sidebar.navigation.categories',
      })
    )
    expect(navigationColumns).toHaveAttribute(
      'data-mobile-directory-open',
      'false'
    )

    fireEvent.click(screen.getByRole('button', { name: 'Quality' }))
    fireEvent.click(screen.getByRole('link', { name: 'Quality checks' }))

    expect(screen.getByTestId('mobile-sidebar-open')).toHaveTextContent('false')
  })
})
