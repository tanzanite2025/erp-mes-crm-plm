import { createFileRoute, redirect } from '@tanstack/react-router'
import { FinanceLayout } from '@/features/finance'

export const Route = createFileRoute('/_authenticated/finance-management')({
  beforeLoad: ({ location }) => {
    if (
      location.pathname === '/finance-management' ||
      location.pathname === '/finance-management/'
    ) {
      throw redirect({ to: '/finance-management/payment-methods' })
    }
  },
  component: () => <FinanceLayout />,
})
