import { createLazyFileRoute } from '@tanstack/react-router'
import { PartRequirements } from '@/features/trading/tabs/index'

export const Route = createLazyFileRoute('/_authenticated/trading/requirements')({
  component: PartRequirements,
})
