import { createFileRoute } from '@tanstack/react-router'
import { ProductionRouteMgmt } from '@/features/production-shared/tabs/production-route'

export const Route = createFileRoute(
  '/_authenticated/production-architecture/routes'
)({
  component: () => <ProductionRouteMgmt />,
})
