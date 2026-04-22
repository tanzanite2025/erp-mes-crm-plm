import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/sales-analysis/')({
  beforeLoad: () => {
    throw redirect({ to: '/sales-analysis/orders-analysis' })
  },
})
