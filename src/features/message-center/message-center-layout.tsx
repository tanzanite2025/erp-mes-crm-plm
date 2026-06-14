import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getMessageCenterTabs } from './tabs'

export function MessageCenterLayout() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getMessageCenterTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
