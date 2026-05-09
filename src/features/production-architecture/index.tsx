import { Outlet, useLocation } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getProductionArchitectureTabs } from './tab-config'

export function ProductionArchitecture() {
  const { t } = useLanguage()
  const { pathname } = useLocation()
  const isMindmapRoute = pathname === '/production-architecture/mindmap' || pathname.startsWith('/production-architecture/mindmap/')

  return (
    <ModuleTabbedLayout
      tabs={getProductionArchitectureTabs(t)}
      contentClassName={isMindmapRoute ? '-mt-4 md:-mt-5' : undefined}
    >
      <Outlet />
    </ModuleTabbedLayout>
  )
}
