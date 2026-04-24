import { createFileRoute } from '@tanstack/react-router'
import { QualityAbnormalities } from '@/features/quality/tabs/quality-abnormalities'

export const Route = createFileRoute('/_authenticated/production-quality/abnormalities')({
  component: QualityAbnormalities,
})
