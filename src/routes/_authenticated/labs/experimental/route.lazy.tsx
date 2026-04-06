import { createLazyFileRoute } from '@tanstack/react-router'
import { LabExperimentalLayoutPage } from '@/features/labs/experimental/pages/layout'

export const Route = createLazyFileRoute('/_authenticated/labs/experimental')({
  component: LabExperimentalLayoutPage,
})
