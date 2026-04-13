import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/quotes/wholesale')({
  beforeLoad: () => {
    throw redirect({ to: '/quotes/orders' })
  },
})
