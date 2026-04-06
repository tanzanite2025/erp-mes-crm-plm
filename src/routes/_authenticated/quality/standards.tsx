import { createFileRoute } from '@tanstack/react-router'
import { QualityStandards } from '@/features/quality/tabs/quality-standards'

export const Route = createFileRoute('/_authenticated/quality/standards')({
  component: QualityStandards,
})
