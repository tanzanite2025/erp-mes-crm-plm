import { createLazyFileRoute } from '@tanstack/react-router'
import { LabTestsPage } from '@/features/labs/experimental/pages/tests'

export const Route = createLazyFileRoute('/_authenticated/labs/experimental/tests')({
  component: LabTestsPage,
})
