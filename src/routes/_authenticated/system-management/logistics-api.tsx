import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/system-management/logistics-api'
)({
  beforeLoad: () => {
    throw redirect({
      to: '/approval/routing',
      replace: true,
    })
  },
})
