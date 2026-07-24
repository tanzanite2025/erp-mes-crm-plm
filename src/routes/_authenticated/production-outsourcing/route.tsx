import { createFileRoute } from '@tanstack/react-router'
import { ProductionOutsourcing } from '@/features/production-outsourcing'

export const Route = createFileRoute('/_authenticated/production-outsourcing')({
  component: ProductionOutsourcing,
})
