import { createFileRoute } from '@tanstack/react-router'
import { ProductionExecution } from '@/features/production-execution'

export const Route = createFileRoute('/_authenticated/production-execution')({
  component: ProductionExecution,
})
