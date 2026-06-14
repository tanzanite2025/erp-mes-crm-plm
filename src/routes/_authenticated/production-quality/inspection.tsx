import { createFileRoute } from '@tanstack/react-router'
import { QualityInspection } from '@/features/production-quality/tabs/quality-inspection'

export const Route = createFileRoute(
  '/_authenticated/production-quality/inspection'
)({
  component: QualityInspection,
})
