import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getSharedCodeSourceTabs } from './tabs'

export function SharedCodeSourceLayout() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getSharedCodeSourceTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
