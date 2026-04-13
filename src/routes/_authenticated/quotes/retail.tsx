import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/quotes/retail')({
  beforeLoad: () => {
    throw redirect({ to: '/quotes/orders' })
  },
})
