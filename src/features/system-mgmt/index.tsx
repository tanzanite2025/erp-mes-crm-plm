import { useMemo } from 'react'
import { Outlet } from '@tanstack/react-router'
import { useLanguage } from '@/context/language-provider'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { systemManagementTabs } from './tab-config'

export function SystemMgmt() {
  const { t } = useLanguage()

  const localizedTabs = useMemo(
    () => systemManagementTabs.map((tab) => {
      switch (tab.key) {
        case 'status':
          return { ...tab, label: t('systemManagement.layout.tabs.status') }
        case 'routing':
          return { ...tab, label: t('systemManagement.layout.tabs.routing') }
        case 'ai-capability':
          return { ...tab, label: t('systemManagement.layout.tabs.aiCapability') }
        case 'audit-engine':
          return { ...tab, label: t('systemManagement.layout.tabs.auditEngine') || '审计引擎' }
        default:
          return tab
      }
    }),
    [t]
  )

  return (
    <ModuleTabbedLayout title={t('systemManagement.layout.title')} tabs={localizedTabs}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
