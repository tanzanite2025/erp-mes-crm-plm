import { createLazyFileRoute } from '@tanstack/react-router'
import { Engineering } from '@/features/engineering'

export const Route = createLazyFileRoute(
  '/_authenticated/engineering/products'
)({
  component: Engineering,
})
