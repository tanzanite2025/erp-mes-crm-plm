import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/context/language-provider'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { getSidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { SidebarBrand } from './sidebar-brand'
import { EnterpriseService } from '@/features/basic-settings/services/enterprise-service'
import { getNonBlockingNavGroups } from '@/features/authz/guards/navigation-access'
import { useAuthStore } from '@/stores/auth-store'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { t } = useLanguage()
  const user = useAuthStore((state) => state.user)
  const localizedSidebarData = useMemo(() => getSidebarData(t), [t])
  const [brand, setBrand] = useState({
    name: localizedSidebarData.teams[0].name,
    plan: localizedSidebarData.teams[0].plan,
  })
  const visibleNavGroups = useMemo(
    () => getNonBlockingNavGroups(user, localizedSidebarData.navGroups),
    [localizedSidebarData.navGroups, user],
  )

  /**
   * 品牌信息加载：对接后端 EnterpriseService，移除 StorageService 依赖。
   */
  const defaultPlan = localizedSidebarData.teams[0].plan
  const loadBrand = useCallback(async () => {
    const config = await EnterpriseService.getConfig().catch(() => null)
    if (!config?.name) {
      return
    }

    setTimeout(() => {
      setBrand({
        name: config.name,
        plan: config.plan || defaultPlan,
      })
    }, 0)
  }, [defaultPlan])

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

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <SidebarBrand team={activeTeam} />
      </SidebarHeader>
      <SidebarContent className='no-scrollbar'>
        {visibleNavGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
