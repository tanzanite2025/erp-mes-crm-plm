import { lazy, Suspense } from 'react'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { Skeleton } from '@/components/ui/skeleton'
import { useLanguage } from '@/context/language-provider'
import { FeatureSandbox } from '@/features/org-personnel/components/feature-sandbox'
import { getOrgPersonnelBranchTabs } from '@/features/org-personnel/tabs'

const LeaveManagement = lazy(() => import('@/features/org-personnel/tabs/leave-management'))

export function LeaveManagementRoutePage() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout
      title={t('sidebar.items.personnelCenter')}
      tabs={getOrgPersonnelBranchTabs(t)}
    >
      <FeatureSandbox fallbackName="LEAVE_MANAGEMENT">
        <Suspense fallback={<div className="p-8"><Skeleton className="h-40 w-full rounded-[24px]" /></div>}>
          <LeaveManagement />
        </Suspense>
      </FeatureSandbox>
    </ModuleTabbedLayout>
  )
}
