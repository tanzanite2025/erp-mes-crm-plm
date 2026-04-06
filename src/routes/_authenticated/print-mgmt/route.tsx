import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { useLanguage } from '@/context/language-provider'
import { getPrintMgmtTabs } from '@/features/print-mgmt/tabs'

export const Route = createFileRoute('/_authenticated/print-mgmt')({
  component: PrintMgmtLayout,
})

function PrintMgmtLayout() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout title={t('printMgmt.tabs.centerTitle')} tabs={getPrintMgmtTabs(t)}>
      <Outlet />
    </ModuleTabbedLayout>
  )
}
