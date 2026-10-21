import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import { getProjectedTabsFromPermissionSnapshot } from '@/features/authz/guards/route-access'
import { getSidebarData } from './data/sidebar-data'
import {
  createSidebarCategoryPreviews,
  type SidebarCategoryPreview,
} from './sidebar-category-scrubber-utils'
import { resolveSidebarNodeTabPreviews } from './sidebar-tab-preview-registry'
import type { NavGroup, SidebarData } from './types'
import { useSidebarNavGroupsWithBadges } from './use-sidebar-nav-badges'

export type SidebarNavigationModel = {
  sidebarData: SidebarData
  visibleNavGroups: NavGroup[]
  renderedNavGroups: NavGroup[]
  categoryDirectories: SidebarCategoryPreview[]
}

/**
 * 侧边栏导航模型的唯一组装入口。
 *
 * 职责边界：
 * - 负责 i18n 菜单数据、权限过滤、动态徽标和最终渲染分组。
 * - 不负责 UI 渲染、滚动、目录选择状态或路由跳转。
 * - 移动端菜单和桌面端分类目录必须共用这里输出的 renderedNavGroups，
 *   避免长期出现两套菜单映射。
 */
export function useSidebarNavigationModel(): SidebarNavigationModel {
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const isIdentitySynced = useAuthStore((state) => state.isIdentitySynced)
  const sidebarData = useMemo(() => getSidebarData(t), [t])
  const visibleNavGroups = useMemo(
    () =>
      getAccessibleNavGroups(user, sidebarData.navGroups, {
        isIdentitySynced,
      }),
    [sidebarData.navGroups, user, isIdentitySynced]
  )
  const renderedNavGroups = useSidebarNavGroupsWithBadges(visibleNavGroups)
  const categoryDirectories = useMemo(
    () =>
      createSidebarCategoryPreviews(renderedNavGroups, (node) =>
        isIdentitySynced
          ? getProjectedTabsFromPermissionSnapshot(
              user,
              resolveSidebarNodeTabPreviews(node, t)
            )
          : []
      ),
    [renderedNavGroups, isIdentitySynced, user, t]
  )

  return {
    sidebarData,
    visibleNavGroups,
    renderedNavGroups,
    categoryDirectories,
  }
}
