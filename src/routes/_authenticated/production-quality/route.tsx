import { createFileRoute } from '@tanstack/react-router'
import { ProductionQuality } from '@/features/production-quality'

export const Route = createFileRoute('/_authenticated/production-quality')({
  component: ProductionQuality,
})
