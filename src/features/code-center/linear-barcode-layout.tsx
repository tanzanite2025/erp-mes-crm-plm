import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getLinearBarcodeTabs } from './tabs'

export function LinearBarcodeLayout() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getLinearBarcodeTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}

