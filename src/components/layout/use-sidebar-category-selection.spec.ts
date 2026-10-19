// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { NavGroup } from './types'
import { useSidebarCategorySelection } from './use-sidebar-category-selection'

const visibleCategories: NavGroup[] = [
  {
    id: 'production',
    title: 'Production',
    children: [{ id: 'planning', title: 'Planning', url: '/planning' }],
  },
  {
    id: 'warehouse',
    title: 'Warehouse',
    children: [{ id: 'stock', title: 'Stock', url: '/stock' }],
  },
]

describe('sidebar category browsing and route restoration', () => {
  it('restores the route category after navigation and back, without changing routes while browsing', () => {
    const { result, rerender } = renderHook(
      ({ pathname }) =>
        useSidebarCategorySelection(visibleCategories, pathname),
      { initialProps: { pathname: '/planning/jobs/1' } }
    )
    expect(result.current.selectedCategoryId).toBe('production')
    act(() => result.current.selectSidebarCategory('warehouse'))
    expect(result.current.selectedCategoryId).toBe('warehouse')
    expect(result.current.activePath?.groupId).toBe('production')
    rerender({ pathname: '/planning/jobs/2' })
    expect(result.current.selectedCategoryId).toBe('production')
    rerender({ pathname: '/planning/jobs/1' })
    expect(result.current.selectedCategoryId).toBe('production')
  })

  it('falls back to an accessible category when permissions remove the browsed category', () => {
    const { result, rerender } = renderHook(
      ({ groups }) => useSidebarCategorySelection(groups, '/'),
      { initialProps: { groups: visibleCategories } }
    )
    act(() => result.current.selectSidebarCategory('warehouse'))
    rerender({ groups: [visibleCategories[0]] })
    expect(result.current.selectedCategoryId).toBe('production')
    rerender({ groups: [] })
    expect(result.current.selectedCategoryId).toBeNull()
  })
})
