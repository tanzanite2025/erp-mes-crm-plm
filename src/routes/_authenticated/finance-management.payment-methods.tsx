import { createFileRoute } from '@tanstack/react-router'
import { PaymentMethodsTab } from '@/features/finance/tabs/payment-methods-tab'

export const Route = createFileRoute('/_authenticated/finance-management/payment-methods')({
  component: () => <PaymentMethodsTab />,
})
