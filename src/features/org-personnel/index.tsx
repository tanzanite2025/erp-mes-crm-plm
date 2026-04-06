import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getOrgPersonnelTabs } from './tabs'

export function OrgPersonnel() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout title={t('sidebar.items.personnelCenter')} tabs={getOrgPersonnelTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
