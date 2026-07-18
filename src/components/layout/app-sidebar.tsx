import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/context/language-provider'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { getAccessibleNavGroups } from '@/features/authz/guards/navigation-access'
import { EnterpriseService } from '@/features/basic-settings/services/enterprise-service'
import { getSidebarData } from './data/sidebar-data'
import { NavGroup, SidebarMenuBranch } from './nav-group'
import { SidebarBrand } from './sidebar-brand'
import { checkIsActive, hasChildren } from './sidebar-nav-utils'
import type { NavBranch, NavGroup as SidebarNavGroup, NavLink } from './types'
import { useSidebarNavGroupsWithBadges } from './use-sidebar-nav-badges'

function isSidebarLink(node: { url?: unknown }): node is NavLink {
  return typeof node.url !== 'undefined'
}

function isHomeCardActive(pathname: string, activeTarget?: string) {
  if (!activeTarget) {
    return false
  }

  return pathname === activeTarget || pathname.startsWith(`${activeTarget}/`)
}

type CurrentSidebarContext = {
  groupTitle: string
  branch: NavBranch
}

function resolveCurrentSidebarContext(
  navGroups: SidebarNavGroup[],
  pathname: string
): CurrentSidebarContext | null {
  for (const group of navGroups) {
    for (const item of group.children) {
      if (hasChildren(item) && checkIsActive(pathname, item)) {
        return {
          groupTitle: group.title,
          branch: item,
        }
      }
    }
  }

  return null
}

function PinnedCurrentSidebarBranch({
  context,
  pathname,
}: {
  context: CurrentSidebarContext | null
  pathname: string
}) {
  if (!context) {
    return null
  }

  return (
    <SidebarGroup className='pt-0 pb-1 group-data-[collapsible=icon]:hidden'>
      <SidebarMenu className='gap-px'>
        <SidebarMenuBranch
          item={context.branch}
          pathname={pathname}
          isCollapsed={false}
        />
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { t } = useLanguage()
  const pathname = useLocation({ select: (location) => location.pathname })
  const { setOpenMobile, state } = useSidebar()
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
  const isCollapsed = state === 'collapsed'

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

  const homeEntry = useMemo(() => {
    const resourceGroup = navGroupsWithBadges.find(
      (group) => group.id === 'resource-management'
    )
    const dashboardNode = resourceGroup?.children.find(
      (item) => item.id === 'dashboard' && isSidebarLink(item)
    )

    return dashboardNode ?? null
  }, [navGroupsWithBadges])

  const renderedNavGroups = useMemo(
    () =>
      navGroupsWithBadges.filter((group) => group.id !== 'resource-management'),
    [navGroupsWithBadges]
  )

  const currentSidebarContext = useMemo(
    () => resolveCurrentSidebarContext(renderedNavGroups, pathname),
    [pathname, renderedNavGroups]
  )

  const homeCardActive = isHomeCardActive(
    pathname,
    (homeEntry?.activeMatch as string | undefined) ??
      (homeEntry?.url as string | undefined)
  )

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <SidebarBrand team={activeTeam} />
      </SidebarHeader>
      <SidebarContent className='no-scrollbar overflow-hidden'>
        <div className='shrink-0'>
          {homeEntry ? (
            <SidebarGroup className='pt-1 pb-1'>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={homeEntry.title}
                    isActive={homeCardActive}
                    variant='default'
                    size='lg'
                    className={cn(
                      'relative h-10 overflow-hidden rounded-[20px] border border-transparent bg-slate-800 text-white shadow-none',
                      'hover:bg-slate-700 hover:text-white dark:border dark:border-dashed dark:border-white/6 dark:bg-slate-800 dark:text-slate-50 dark:shadow-[0_8px_18px_rgba(2,6,23,0.34)] dark:hover:bg-slate-700',
                      'data-[active=true]:bg-slate-700 data-[active=true]:text-white dark:data-[active=true]:bg-slate-700 dark:data-[active=true]:text-slate-50',
                      'group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:rounded-[16px]! group-data-[collapsible=icon]:border-white/8 dark:group-data-[collapsible=icon]:border-white/6'
                    )}
                  >
                    <Link
                      to={homeEntry.url}
                      onClick={() => setOpenMobile(false)}
                    >
                      {homeEntry.icon ? (
                        <homeEntry.icon className='pointer-events-none absolute -right-2 -bottom-3 size-12 rotate-12 text-white/8 transition-transform duration-500 group-hover/menu-item:scale-105 group-data-[collapsible=icon]:hidden dark:text-white/6' />
                      ) : null}
                      <div className='flex w-full items-center gap-2.5'>
                        <div className='flex items-center gap-2.5'>
                          {homeEntry.icon ? (
                            <div className='flex size-6 shrink-0 items-center justify-center rounded-lg bg-white/8 text-white ring-1 ring-white/8 group-data-[collapsible=icon]:size-6 group-data-[collapsible=icon]:rounded-lg dark:bg-white/6 dark:ring-white/6'>
                              <homeEntry.icon className='size-4 opacity-90 group-data-[collapsible=icon]:size-3.5' />
                            </div>
                          ) : null}
                          <span className='px-0.5 py-0 text-[13px] font-black tracking-tight text-white italic dark:text-slate-50'>
                            {homeEntry.title}
                          </span>
                        </div>
                        <div className='ms-auto h-5 w-px bg-white/10 group-data-[collapsible=icon]:hidden dark:bg-white/8' />
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroup>
          ) : null}
          {!isCollapsed ? (
            <PinnedCurrentSidebarBranch
              context={currentSidebarContext}
              pathname={pathname}
            />
          ) : null}
        </div>
        <div className='no-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto'>
          {renderedNavGroups.map((props) => (
            <NavGroup
              key={props.id}
              {...props}
              excludeBranchId={
                !isCollapsed ? currentSidebarContext?.branch.id : undefined
              }
            />
          ))}
        </div>
      </SidebarContent>
      {collapsible === 'icon' ? <SidebarRail /> : null}
    </Sidebar>
  )
}
