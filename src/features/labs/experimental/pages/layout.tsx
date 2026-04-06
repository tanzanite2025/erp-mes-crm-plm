import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getLabExperimentalTabs } from '../tabs'

export function LabExperimentalLayoutPage() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout title={t('labExperimental.tabs.centerTitle')} tabs={getLabExperimentalTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
