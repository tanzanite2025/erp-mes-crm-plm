import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/trading/')({
  beforeLoad: () => {
    throw redirect({ to: '/trading/customers' })
  },
})
