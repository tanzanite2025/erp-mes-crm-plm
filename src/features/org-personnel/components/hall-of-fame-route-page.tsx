import { lazy, Suspense } from 'react'
import { useLanguage } from '@/context/language-provider'
import { Skeleton } from '@/components/ui/skeleton'
import { ModuleTabbedLayout } from '@/components/layout/module-tabbed-layout'
import { FeatureSandbox } from '@/features/org-personnel/components/feature-sandbox'
import { getOrgPersonnelBranchTabs } from '@/features/org-personnel/tabs'

const PersonnelStatistics = lazy(
  () => import('@/features/org-personnel/tabs/personnel-statistics')
)

export function HallOfFameRoutePage() {
  const { t } = useLanguage()

  return (
    <ModuleTabbedLayout tabs={getOrgPersonnelBranchTabs(t)}>
      <FeatureSandbox fallbackName='PERSONNEL_STATISTICS'>
        <Suspense
          fallback={
            <div className='space-y-8 p-8'>
              <Skeleton className='h-40 w-full rounded-[32px]' />
              <Skeleton className='h-64 w-full' />
            </div>
          }
        >
          <PersonnelStatistics />
        </Suspense>
      </FeatureSandbox>
    </ModuleTabbedLayout>
  )
}
