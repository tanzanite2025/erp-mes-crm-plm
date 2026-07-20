import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useLanguage } from '@/context/language-provider'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import { EnterpriseService } from '@/features/basic-settings/services/enterprise-service'
import { getSidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { resolveActiveSidebarPath } from './sidebar-active-path'
import { SidebarBrand } from './sidebar-brand'
import { useSidebarActiveCenter } from './use-sidebar-active-center'
import { useSidebarNavGroupsWithBadges } from './use-sidebar-nav-badges'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { t } = useLanguage()
  const pathname = useLocation({ select: (location) => location.pathname })
  const { isMobile, openMobile, state } = useSidebar()
  const user = useAuthStore((state) => state.user)
  const isIdentitySynced = useAuthStore((state) => state.isIdentitySynced)
  const localizedSidebarData = useMemo(() => getSidebarData(t), [t])
  const [brand, setBrand] = useState({
    name: localizedSidebarData.teams[0].name,
    plan: localizedSidebarData.teams[0].plan,
  })
  const visibleNavGroups = useMemo(
    () =>
      getAccessibleNavGroups(user, localizedSidebarData.navGroups, {
        isIdentitySynced,
      }),
    [localizedSidebarData.navGroups, user, isIdentitySynced]
  )
  const navGroupsWithBadges = useSidebarNavGroupsWithBadges(visibleNavGroups)
  const navViewportRef = useRef<HTMLDivElement>(null)

  /**
   * 品牌信息加载：对接后端 EnterpriseService，移除 StorageService 依赖。
   */
  const defaultPlan = localizedSidebarData.teams[0].plan
  const defaultName = localizedSidebarData.teams[0].name
  const loadBrand = useCallback(async () => {
    const config = await EnterpriseService.getConfig().catch(() => null)

    // 如果 config 为空（请求失败），则不更新
    if (!config) {
      return
    }

    setTimeout(() => {
      setBrand({
        name: config.name ?? defaultName,
        plan: config.plan ?? defaultPlan,
      })
    }, 0)
  }, [defaultPlan, defaultName])

  useEffect(() => {
    void loadBrand()

    // 监听企业信息更新事件 (由 EnterpriseMgmt 触发)
    const handleSync = () => {
      void loadBrand()
    }

    window.addEventListener('xdfc_enterprise_config_updated', handleSync)
    return () => {
      window.removeEventListener('xdfc_enterprise_config_updated', handleSync)
    }
  }, [loadBrand])

  const activeTeam = {
    ...localizedSidebarData.teams[0],
    name: brand.name,
    plan: brand.plan,
  }

  const renderedNavGroups = useMemo(
    () =>
      navGroupsWithBadges.filter((group) => group.id !== 'resource-management'),
    [navGroupsWithBadges]
  )

  const activeSidebarPath = useMemo(
    () => resolveActiveSidebarPath(renderedNavGroups, pathname),
    [pathname, renderedNavGroups]
  )

  const sidebarIsVisible = isMobile
    ? openMobile
    : collapsible === 'none' || state === 'expanded'

  useSidebarActiveCenter({
    viewportRef: navViewportRef,
    activePathKey: activeSidebarPath?.key,
    enabled: sidebarIsVisible,
  })

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <SidebarBrand team={activeTeam} />
      </SidebarHeader>
      <SidebarContent className='no-scrollbar overflow-hidden'>
        <div
          ref={navViewportRef}
          data-sidebar-nav-viewport
          className='no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto [overflow-anchor:none]'
        >
          <div className='flex min-h-full w-full flex-col justify-center py-1'>
            {renderedNavGroups.map((props) => (
              <NavGroup key={props.id} {...props} />
            ))}
          </div>
        </div>
      </SidebarContent>
      {collapsible === 'icon' ? <SidebarRail /> : null}
    </Sidebar>
  )
}
