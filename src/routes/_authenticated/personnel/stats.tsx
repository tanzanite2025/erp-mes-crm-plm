import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { FeatureSandbox } from '@/features/org-personnel/components/feature-sandbox'
import { Skeleton } from '@/components/ui/skeleton'

// 异步导入，确保物理隔离与按需加载
const PersonnelStatistics = lazy(() => import('@/features/org-personnel/tabs/personnel-statistics'))

export const Route = createFileRoute('/_authenticated/personnel/stats')({
  component: () => (
    <FeatureSandbox fallbackName="PERSONNEL_STATISTICS">
      <Suspense fallback={<div className="p-8 space-y-8"><Skeleton className="h-40 w-full rounded-[32px]" /><Skeleton className="h-64 w-full" /></div>}>
        <PersonnelStatistics />
      </Suspense>
    </FeatureSandbox>
  ),
})
