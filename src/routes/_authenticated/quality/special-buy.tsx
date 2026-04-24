import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/quality/special-buy')({
  beforeLoad: () => {
    throw redirect({ to: '/production-quality/special-buy' })
  },
})
