import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/production-quality/')({
  beforeLoad: () => {
    throw redirect({ to: '/production-quality/abnormalities' })
  },
})
