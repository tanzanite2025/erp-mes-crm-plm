import { lazy, Suspense } from 'react'
import { useLanguage } from '@/context/language-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { FeatureSandbox } from '@/features/org-personnel/components/feature-sandbox'
import { getOrgPersonnelBranchTabs } from '@/features/org-personnel/tabs'

const AttendanceDevices = lazy(
  () => import('@/features/org-personnel/tabs/attendance-devices')
)

export function AttendanceDevicesRoutePage() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getOrgPersonnelBranchTabs(t)}>
      <FeatureSandbox fallbackName='ATTENDANCE_DEVICES'>
        <Suspense
          fallback={
            <div className='space-y-6 p-8'>
              <Skeleton className='h-32 w-full rounded-[28px]' />
              <Skeleton className='h-72 w-full rounded-[28px]' />
            </div>
          }
        >
          <AttendanceDevices />
        </Suspense>
      </FeatureSandbox>
    </ModuleTabbedLayout>
  )
}
