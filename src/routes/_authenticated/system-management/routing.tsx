import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/_authenticated/system-management/routing'
)({
  beforeLoad: () => {
    throw redirect({
      to: '/approval/routing',
      replace: true,
    })
  },
})
