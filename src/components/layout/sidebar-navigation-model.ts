import { useMemo } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import { getSidebarData } from './data/sidebar-data'
import type { NavGroup, SidebarData } from './types'
import { useSidebarNavGroupsWithBadges } from './use-sidebar-nav-badges'

export type SidebarNavigationModel = {
  sidebarData: SidebarData
  visibleNavGroups: NavGroup[]
  renderedNavGroups: NavGroup[]
}

/**
 * 侧边栏导航模型的唯一组装入口。
 *
 * 职责边界：
 * - 负责 i18n 菜单数据、权限过滤、动态徽标和最终渲染分组。
 * - 不负责 UI 渲染、滚动、hover 浮层或路由跳转。
 * - 侧边栏本体和顶级分类索引必须共用这里输出的 renderedNavGroups，
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
  const navGroupsWithBadges = useSidebarNavGroupsWithBadges(visibleNavGroups)
  const renderedNavGroups = useMemo(
    () =>
      navGroupsWithBadges.filter((group) => group.id !== 'resource-management'),
    [navGroupsWithBadges]
  )

  return {
    sidebarData,
    visibleNavGroups,
    renderedNavGroups,
  }
}
