import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getFinanceTabs } from './tabs'

export function FinanceLayout() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getFinanceTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
