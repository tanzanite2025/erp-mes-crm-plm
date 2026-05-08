'use client'

import { Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getToolingFurnacesTabs } from './tabs'

export function ToolingFurnaces() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout title={t('sidebar.items.furnaceAssets')} tabs={getToolingFurnacesTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
