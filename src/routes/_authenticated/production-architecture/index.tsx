import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/production-architecture/')({
  beforeLoad: () => {
    throw redirect({ to: '/production-architecture/line' })
  },
})
