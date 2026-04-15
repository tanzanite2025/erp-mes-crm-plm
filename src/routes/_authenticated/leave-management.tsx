import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { FeatureSandbox } from '@/features/org-personnel/components/feature-sandbox'

const LeaveManagement = lazy(() => import('@/features/org-personnel/tabs/leave-management'))

export const Route = createFileRoute('/_authenticated/leave-management')({
  component: () => (
    <FeatureSandbox fallbackName="LEAVE_MANAGEMENT">
      <Suspense fallback={<div className="p-8"><Skeleton className="h-40 w-full rounded-[24px]" /></div>}>
        <LeaveManagement />
      </Suspense>
    </FeatureSandbox>
  ),
})
