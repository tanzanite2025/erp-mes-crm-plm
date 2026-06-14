import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getQuoteTabs } from './tabs'

export function Quotes() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getQuoteTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
