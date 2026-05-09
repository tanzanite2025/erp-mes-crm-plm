import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getLabExperimentalTabs } from '../tabs'

export function LabExperimentalLayout() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getLabExperimentalTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

export { LabExperimentalLayout as LabExperimentalLayoutPage }
