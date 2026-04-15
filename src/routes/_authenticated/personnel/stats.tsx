import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/personnel/stats')({
  beforeLoad: () => {
    throw redirect({ to: '/hall-of-fame', replace: true })
  },
})
