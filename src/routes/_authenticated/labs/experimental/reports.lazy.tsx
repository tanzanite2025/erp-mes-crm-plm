import { createLazyFileRoute } from '@tanstack/react-router'
import { LabReportsPage } from '@/features/labs/experimental/pages/reports'

export const Route = createLazyFileRoute('/_authenticated/labs/experimental/reports')({
  component: LabReportsPage,
})
