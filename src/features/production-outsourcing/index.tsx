import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getProductionOutsourcingTabs } from './tabs'

export function ProductionOutsourcing() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getProductionOutsourcingTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
