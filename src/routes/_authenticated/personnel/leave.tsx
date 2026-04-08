import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { FeatureSandbox } from '@/features/org-personnel/components/feature-sandbox'
import { Skeleton } from '@/components/ui/skeleton'

// 异步导入，确保物理隔离与按需加载
const LeaveManagement = lazy(() => import('@/features/org-personnel/tabs/leave-management'))

export const Route = createFileRoute('/_authenticated/personnel/leave')({
  component: () => (
    <FeatureSandbox fallbackName="LEAVE_MANAGEMENT">
      <Suspense fallback={<div className="p-8"><Skeleton className="h-40 w-full rounded-[24px]" /></div>}>
        <LeaveManagement />
      </Suspense>
    </FeatureSandbox>
  ),
})
