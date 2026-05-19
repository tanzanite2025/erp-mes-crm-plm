import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
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
import { getSidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { SidebarBrand } from './sidebar-brand'
import { EnterpriseService } from '@/features/basic-settings/services/enterprise-service'
import { getNonBlockingNavGroups } from '@/features/authz/guards/navigation-access'
import { useAuthStore } from '@/stores/auth-store'
import type { NavLink } from './types'

function isSidebarLink(node: { url?: unknown }): node is NavLink {
  return typeof node.url !== 'undefined'
}

function isHomeCardActive(pathname: string, activeTarget?: string) {
  if (!activeTarget) {
    return false
  }

  return pathname === activeTarget || pathname.startsWith(`${activeTarget}/`)
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { t } = useLanguage()
  const pathname = useLocation({ select: (location) => location.pathname })
  const { setOpenMobile } = useSidebar()
  const user = useAuthStore((state) => state.user)
  const isIdentitySynced = useAuthStore((state) => state.isIdentitySynced)
  const localizedSidebarData = useMemo(() => getSidebarData(t), [t])
  const [brand, setBrand] = useState({
    name: localizedSidebarData.teams[0].name,
    plan: localizedSidebarData.teams[0].plan,
  })
  const visibleNavGroups = useMemo(
    () => getNonBlockingNavGroups(user, localizedSidebarData.navGroups, { isIdentitySynced }),
    [localizedSidebarData.navGroups, user, isIdentitySynced],
  )

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
    const resourceGroup = visibleNavGroups.find((group) => group.id === 'resource-management')
    const dashboardNode = resourceGroup?.children.find(
      (item) => item.id === 'dashboard' && isSidebarLink(item)
    )

    return dashboardNode ?? null
  }, [visibleNavGroups])

  const renderedNavGroups = useMemo(
    () => visibleNavGroups.filter((group) => group.id !== 'resource-management'),
    [visibleNavGroups]
  )

  const homeCardActive = isHomeCardActive(
    pathname,
    (homeEntry?.activeMatch as string | undefined) ?? (homeEntry?.url as string | undefined)
  )

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <SidebarBrand team={activeTeam} />
      </SidebarHeader>
      <SidebarContent className='no-scrollbar'>
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
                  <Link to={homeEntry.url} onClick={() => setOpenMobile(false)}>
                    {homeEntry.icon ? (
                      <homeEntry.icon className='pointer-events-none absolute -bottom-3 -right-2 size-12 rotate-12 text-white/8 transition-transform duration-500 group-hover/menu-item:scale-105 dark:text-white/6 group-data-[collapsible=icon]:hidden' />
                    ) : null}
                    <div className='flex w-full items-center gap-2.5'>
                      <div className='flex items-center gap-2.5'>
                        {homeEntry.icon ? (
                          <div className='flex size-6 shrink-0 items-center justify-center rounded-lg bg-white/8 text-white ring-1 ring-white/8 dark:bg-white/6 dark:ring-white/6 group-data-[collapsible=icon]:size-6 group-data-[collapsible=icon]:rounded-lg'>
                            <homeEntry.icon className='size-4 opacity-90 group-data-[collapsible=icon]:size-3.5' />
                          </div>
                        ) : null}
                        <span className='px-0.5 py-0 text-[13px] font-black italic tracking-tight text-white dark:text-slate-50'>
                          {homeEntry.title}
                        </span>
                      </div>
                      <div className='ms-auto h-5 w-px bg-white/10 dark:bg-white/8 group-data-[collapsible=icon]:hidden' />
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        ) : null}
        {renderedNavGroups.map((props) => (
          <NavGroup key={props.id} {...props} />
        ))}
      </SidebarContent>
      {collapsible === 'icon' ? <SidebarRail /> : null}
    </Sidebar>
  )
}
