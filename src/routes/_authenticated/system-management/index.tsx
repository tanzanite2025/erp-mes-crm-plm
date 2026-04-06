import { createFileRoute } from '@tanstack/react-router'
import { SystemStatusPage } from '@/features/system-dashboard'

export const Route = createFileRoute('/_authenticated/system-management/')({
  component: SystemStatusPage,
})
