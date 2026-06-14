import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getRawMaterialsTabs } from './tabs'

export function RawMaterialsModule() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getRawMaterialsTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
