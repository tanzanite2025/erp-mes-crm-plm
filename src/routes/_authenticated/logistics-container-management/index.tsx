import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/logistics-container-management/'
)({
  beforeLoad: () => {
    throw redirect({ to: '/logistics-container-management/specs' })
  },
})
