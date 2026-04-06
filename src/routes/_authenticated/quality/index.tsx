import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/quality/')({
  beforeLoad: () => {
    throw redirect({ to: '/quality/standards' })
  },
})
