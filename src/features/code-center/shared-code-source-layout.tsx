import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getSharedCodeSourceTabs } from './tabs'

export function SharedCodeSourceLayout() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getSharedCodeSourceTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
