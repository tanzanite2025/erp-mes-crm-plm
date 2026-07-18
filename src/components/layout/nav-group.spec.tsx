// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { NavGroup } from './nav-group'
import type { NavGroup as NavGroupData } from './types'

const routerState = vi.hoisted(() => ({
  isMobile: false,
  pathname: '/aps',
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => routerState.isMobile,
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    onClick,
    to,
    ...props
  }: React.ComponentProps<'a'> & { to: string }) => (
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
  }) => select({ pathname: routerState.pathname }),
}))

const productionGroup: NavGroupData = {
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
}

function MobileStateProbe() {
  const { openMobile, setOpenMobile } = useSidebar()

  return (
    <>
      <button type='button' onClick={() => setOpenMobile(true)}>
        Open mobile sidebar
      </button>
      <output data-testid='mobile-state'>{String(openMobile)}</output>
    </>
  )
}

function renderNavGroup({ includeMobileProbe = false } = {}) {
  return render(
    <SidebarProvider>
      {includeMobileProbe ? <MobileStateProbe /> : null}
      <NavGroup {...productionGroup} />
    </SidebarProvider>
  )
}

describe('NavGroup', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    routerState.isMobile = false
    routerState.pathname = '/aps'
  })

  it('reopens the active hierarchy after the route changes', () => {
    const view = renderNavGroup()
    const groupButton = screen.getByRole('button', { name: 'Production' })

    expect(groupButton.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('link', { name: 'APS' })).not.toBeNull()

    fireEvent.click(groupButton)

    expect(groupButton.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('link', { name: 'APS' })).toBeNull()

    routerState.pathname = '/aps/jobs/42'
    view.rerender(
      <SidebarProvider>
        <NavGroup {...productionGroup} />
      </SidebarProvider>
    )

    expect(groupButton.getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByRole('link', { name: 'APS' })).not.toBeNull()
  })

  it('closes the mobile sidebar after a destination is selected', () => {
    routerState.isMobile = true
    renderNavGroup({ includeMobileProbe: true })

    fireEvent.click(screen.getByRole('button', { name: 'Open mobile sidebar' }))
    expect(screen.getByTestId('mobile-state').textContent).toBe('true')

    fireEvent.click(screen.getByRole('link', { name: 'APS' }))
    expect(screen.getByTestId('mobile-state').textContent).toBe('false')
  })
})
