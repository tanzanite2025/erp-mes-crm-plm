import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/logistics-packaging-management/'
)({
  beforeLoad: () => {
    throw redirect({ to: '/logistics-packaging-management/packaging-rules' })
  },
})
