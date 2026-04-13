import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/quotes/')({
  beforeLoad: () => {
    throw redirect({ to: '/quotes/orders' })
  },
})
