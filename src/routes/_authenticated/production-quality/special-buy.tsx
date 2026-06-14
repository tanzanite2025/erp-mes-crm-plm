import { createFileRoute } from '@tanstack/react-router'
import { QualitySpecialBuy } from '@/features/production-quality/tabs/quality-special-buy'

export const Route = createFileRoute(
  '/_authenticated/production-quality/special-buy'
)({
  component: QualitySpecialBuy,
})
