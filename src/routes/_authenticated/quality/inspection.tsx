import { createFileRoute } from '@tanstack/react-router'
import { QualityInspection } from '@/features/quality/tabs/quality-inspection'

export const Route = createFileRoute('/_authenticated/quality/inspection')({
  component: QualityInspection,
})
