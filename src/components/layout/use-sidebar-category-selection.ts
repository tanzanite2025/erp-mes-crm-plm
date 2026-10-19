import { useState } from 'react'
import { resolveActiveSidebarPath } from './sidebar-active-path'
import type { NavGroup } from './types'

/** Browsing a category does not navigate; an actual route change restores its directory. */
export function useSidebarCategorySelection(
  navGroups: NavGroup[],
  pathname: string
) {
  const [selection, setSelection] = useState<{
    pathname: string
    categoryId: string | null
  }>({ pathname, categoryId: null })

  if (selection.pathname !== pathname) {
    setSelection({ pathname, categoryId: null })
  }

  const activePath = resolveActiveSidebarPath(navGroups, pathname)
  const requestedCategoryId =
    selection.pathname === pathname ? selection.categoryId : null
  const selectedCategoryId =
    navGroups.find((group) => group.id === requestedCategoryId)?.id ??
    activePath?.groupId ??
    navGroups[0]?.id ??
    null

  function selectSidebarCategory(categoryId: string) {
    setSelection({ pathname, categoryId })
  }

  return { activePath, selectedCategoryId, selectSidebarCategory }
}
