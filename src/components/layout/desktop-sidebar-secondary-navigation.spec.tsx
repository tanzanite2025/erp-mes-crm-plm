// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DesktopSidebarSecondaryNavigation } from './desktop-sidebar-secondary-navigation'
import type { SidebarCategoryPreview } from './sidebar-category-scrubber-utils'

vi.mock('@/context/language-provider', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    ...props
  }: React.ComponentProps<'a'> & { to: string }) => (
    <a href={to} {...props} onClick={(event) => event.preventDefault()}>
      {children}
    </a>
  ),
}))

const productionDirectory: SidebarCategoryPreview = {
  id: 'production',
  title: 'Production',
  linkCount: 3,
  directLinks: [],
  sections: [
    {
      id: 'planning',
      title: 'Planning',
      links: [
        {
          id: 'aps',
          title: 'Scheduling',
          url: '/aps',
          tabs: [
            { id: 'overview', title: 'Overview', url: '/aps' },
            { id: 'queue', title: 'Queue', url: '/aps/queue' },
          ],
        },
        { id: 'execution', title: 'Execution', url: '/execution', tabs: [] },
      ],
    },
  ],
}

describe('desktop expanded module directory', () => {
  afterEach(cleanup)

  it('starts with every module expanded on an active child route, without a search or directory header', () => {
    render(
      <DesktopSidebarSecondaryNavigation
        category={productionDirectory}
        pathname='/aps/queue/42'
      />
    )
    expect(screen.getByRole('button', { name: 'Scheduling' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(screen.getByRole('link', { name: 'Queue' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Execution' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Production' })).toBeNull()
  })

  it('keeps modules expanded after selecting a destination and supports manual collapse and expansion', () => {
    render(
      <DesktopSidebarSecondaryNavigation
        category={productionDirectory}
        pathname='/aps/queue/42'
      />
    )
    const moduleButton = screen.getByRole('button', { name: 'Scheduling' })
    expect(moduleButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Queue' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute(
      'aria-current'
    )
    fireEvent.click(screen.getByRole('link', { name: 'Queue' }))
    fireEvent.pointerLeave(screen.getByRole('navigation'))
    expect(screen.getByRole('link', { name: 'Queue' })).toBeVisible()
    fireEvent.click(moduleButton)
    expect(moduleButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Queue' })).toBeNull()
    fireEvent.click(moduleButton)
    expect(moduleButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Queue' })).toBeVisible()
  })

  it('expands every module across sections by default and toggles them independently', () => {
    const directory = {
      ...productionDirectory,
      sections: [
        ...productionDirectory.sections,
        {
          id: 'operations',
          title: 'Operations',
          links: [
            {
              id: 'reporting',
              title: 'Reporting',
              url: '/reports',
              tabs: [
                { id: 'daily', title: 'Daily report', url: '/reports/daily' },
              ],
            },
          ],
        },
      ],
    }
    render(
      <DesktopSidebarSecondaryNavigation category={directory} pathname='/aps' />
    )
    expect(screen.getByRole('link', { name: 'Queue' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Daily report' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Scheduling' }))
    expect(screen.getByRole('button', { name: 'Scheduling' })).toHaveAttribute(
      'aria-expanded',
      'false'
    )
    expect(screen.queryByRole('link', { name: 'Queue' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Daily report' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Scheduling' }))
    expect(screen.getByRole('link', { name: 'Queue' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Daily report' })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Reporting' }))
    expect(screen.getByRole('link', { name: 'Queue' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'Daily report' })).toBeNull()
  })

  it('starts expanded again when AppSidebar switches the keyed category', () => {
    const { rerender } = render(
      <DesktopSidebarSecondaryNavigation
        key='production'
        category={productionDirectory}
        pathname='/aps'
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Scheduling' }))
    expect(screen.queryByRole('link', { name: 'Queue' })).toBeNull()
    rerender(
      <DesktopSidebarSecondaryNavigation
        key='another-category'
        category={{ ...productionDirectory, id: 'another-category' }}
        pathname='/aps'
      />
    )
    expect(screen.getByRole('button', { name: 'Scheduling' })).toHaveAttribute(
      'aria-expanded',
      'true'
    )
    expect(screen.getByRole('link', { name: 'Queue' })).toBeVisible()
  })

  it('removes expanded destinations immediately when the permission-filtered model changes', () => {
    const { rerender } = render(
      <DesktopSidebarSecondaryNavigation
        category={productionDirectory}
        pathname='/aps'
      />
    )
    rerender(
      <DesktopSidebarSecondaryNavigation
        category={{ ...productionDirectory, sections: [], linkCount: 0 }}
        pathname='/aps'
      />
    )
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByRole('status')).toHaveTextContent(
      'sidebar.navigation.noAvailableEntries'
    )
  })
})
