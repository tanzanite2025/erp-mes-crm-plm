'use client'

import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { getEquipmentToolingTabs } from './tabs'

export function EquipmentTooling() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getEquipmentToolingTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
