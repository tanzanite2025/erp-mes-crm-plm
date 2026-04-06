import { createFileRoute } from '@tanstack/react-router'
import { QualityFormulas } from '@/features/quality/tabs/quality-formulas'

export const Route = createFileRoute('/_authenticated/quality/formulas')({
  component: QualityFormulas,
})
