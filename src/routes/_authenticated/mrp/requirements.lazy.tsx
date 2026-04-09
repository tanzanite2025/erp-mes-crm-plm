import { createLazyFileRoute } from '@tanstack/react-router'
import { PartRequirements } from '@/features/mrp/pages/part-requirements'

export const Route = createLazyFileRoute('/_authenticated/mrp/requirements')({
  component: PartRequirements,
})
